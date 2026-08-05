/**
 * Busca o lobby Jonbet e chama monitor-lobby-jonbet (com jonbet_lobby no body).
 *
 * Mesmo padrão SoftSwiss da Blaze (`/api/games/search`). Rede BR recomendada (risco HTTP 451).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/monitor-lobby-jonbet-run.mjs
 *   ... --dry-run
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-JONBET.md
 */

const LIMIT = 30;
const SEARCH_QUERY =
  "limit=30&search=&game_category_slugs=live-casino&xp_enabled=false&game_provider_slugs=&bonus_betting_enabled=false";
const JONBET_ORIGIN = "https://jonbet.bet.br";
const JONBET_SEARCH_URL = `${JONBET_ORIGIN}/api/games/search`;
const JONBET_PAGE_URL = `${JONBET_ORIGIN}/pt/games/category/live-casino`;
const OPERADORA = "jonbet";

const dryRun = process.argv.includes("--dry-run");

/** @type {string | undefined} */
let jonbetCookieJar;

function jonbetBrowserHeaders(extra = {}) {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: JONBET_PAGE_URL,
    Origin: JONBET_ORIGIN,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    ...extra,
  };
}

function collectCookies(res) {
  const parts = [];
  if (typeof res.headers.getSetCookie === "function") {
    for (const c of res.headers.getSetCookie()) {
      parts.push(c.split(";")[0]);
    }
  } else {
    const raw = res.headers.get("set-cookie");
    if (raw) {
      for (const c of raw.split(/,(?=\s*\w+=)/)) {
        parts.push(c.split(";")[0].trim());
      }
    }
  }
  if (parts.length === 0) return;
  const merged = [...(jonbetCookieJar ? jonbetCookieJar.split("; ") : []), ...parts];
  const map = new Map();
  for (const p of merged) {
    const eq = p.indexOf("=");
    if (eq > 0) map.set(p.slice(0, eq), p);
  }
  jonbetCookieJar = [...map.values()].join("; ");
}

async function jonbetFetch(url, init = {}) {
  const headers = jonbetBrowserHeaders(init.headers ?? {});
  if (jonbetCookieJar) {
    headers.Cookie = jonbetCookieJar;
  }
  const opts = {
    ...init,
    headers,
    redirect: "follow",
  };
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy) {
    try {
      const { ProxyAgent, fetch: proxyFetch } = await import("undici");
      const agent = new ProxyAgent(proxy);
      return proxyFetch(url, { ...opts, dispatcher: agent });
    } catch {
      console.warn("undici ProxyAgent indisponível; fetch direto.");
    }
  }
  return fetch(url, opts);
}

async function iniciarSessaoJonbet() {
  const res = await jonbetFetch(JONBET_PAGE_URL, {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
    },
  });
  collectCookies(res);
  if (!res.ok) {
    console.warn(`Aviso: página Jonbet HTTP ${res.status} (cookies podem faltar).`);
  }
}

function erro451Jonbet(page) {
  return new Error(
    `Jonbet search HTTP 451 (page=${page}). A Jonbet bloqueia IPs de datacenter ` +
      `(GitHub Actions / Supabase Edge). Soluções: (1) rodar este script no seu PC ` +
      `com Agendador de Tarefas; (2) GitHub Actions self-hosted no Windows; ` +
      `(3) secret HTTPS_PROXY com proxy residencial BR. Ver docs/SETUP-monitor-lobby-jonbet.md`,
  );
}

async function fetchPagina(page) {
  const url = `${JONBET_SEARCH_URL}?page=${page}&${SEARCH_QUERY}`;
  const res = await jonbetFetch(url);
  collectCookies(res);
  if (res.status === 451) {
    throw erro451Jonbet(page);
  }
  if (!res.ok) {
    throw new Error(`Jonbet search HTTP ${res.status} (page=${page})`);
  }
  return res.json();
}

async function escanearLobby(idsEsperados) {
  await iniciarSessaoJonbet();

  const lobby = [];
  const posicoes = new Map();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await fetchPagina(page);
    if (page === 1) {
      totalPages = Math.max(1, data.meta?.total_pages ?? 1);
    }
    const records = data.records ?? [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const posicao = (page - 1) * LIMIT + i + 1;
      const item = {
        posicao,
        game_id: r.id,
        name: r.name,
        slug: r.slug,
        provider_name: r.provider?.name ?? "",
        provider_slug: r.provider?.slug ?? "",
      };
      lobby.push(item);
      const idStr = String(r.id);
      if (idsEsperados.has(idStr)) {
        posicoes.set(idStr, posicao);
      }
    }
    if (posicoes.size >= idsEsperados.size) break;
    page++;
  }

  return { lobby, paginasLidas: page };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY).",
    );
    process.exit(1);
  }

  const [juncRes, legadoRes] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/mesas_spin_operadora_identificacao?operadora_slug=eq.${OPERADORA}&mesa_identificacao_operadora=not.is.null&select=mesa_identificacao_operadora`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    ),
    fetch(
      `${supabaseUrl}/rest/v1/mesas_spin_cadastro?operadora_slug=eq.${OPERADORA}&select=mesa_identificacao_operadora`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    ),
  ]);
  if (!juncRes.ok) {
    console.error(
      "Erro mesas_spin_operadora_identificacao:",
      juncRes.status,
      await juncRes.text(),
    );
    process.exit(1);
  }
  if (!legadoRes.ok) {
    console.error(
      "Erro ao ler mesas_spin_cadastro:",
      legadoRes.status,
      await legadoRes.text(),
    );
    process.exit(1);
  }
  const junc = await juncRes.json();
  const legado = await legadoRes.json();
  const idsList = [
    ...junc.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
    ...legado.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
  ];
  const ids = new Set(idsList);
  if (ids.size === 0) {
    console.error(
      "Nenhuma mesa com ID Jonbet (Gestão de Estúdios → ID Jonbet).",
    );
    process.exit(1);
  }

  console.log(`Buscando lobby Jonbet (${ids.size} mesas no cadastro)...`);
  const { lobby, paginasLidas } = await escanearLobby(ids);
  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-jonbet`;
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_JONBET_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-jonbet-secret"] = secret;

  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dry_run: dryRun,
      jonbet_lobby: lobby,
      jonbet_paginas_lidas: paginasLidas,
    }),
  });

  const text = await ingestRes.text();
  console.log("Edge HTTP", ingestRes.status);
  console.log(text.slice(0, 4000));

  if (!ingestRes.ok) {
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    process.exit(1);
  }
  if (!parsed.ok && parsed.status !== "parcial") {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
