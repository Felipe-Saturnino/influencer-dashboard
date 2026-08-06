/**
 * Busca o lobby Blaze e chama monitor-lobby-blaze (com blaze_lobby no body).
 *
 * A Blaze retorna HTTP 451 em IPs de datacenter (Supabase Edge, GitHub-hosted).
 * Rode este script em rede residencial/escritório (Brasil) ou use runner self-hosted.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/monitor-lobby-blaze-run.mjs
 *   ... --dry-run
 *
 * Opcional: HTTPS_PROXY=http://user:pass@host:port (proxy residencial BR)
 */

const LIMIT = 30;
const SEARCH_QUERY =
  "limit=30&search=&game_category_slugs=live-casino&xp_enabled=false&game_provider_slugs=&bonus_betting_enabled=false";
const BLAZE_ORIGIN = "https://blaze.bet.br";
const BLAZE_SEARCH_URL = `${BLAZE_ORIGIN}/api/games/search`;
const BLAZE_PAGE_URL = `${BLAZE_ORIGIN}/pt/games/category/live-casino`;
const OPERADORA = "blaze";

const dryRun = process.argv.includes("--dry-run");

/** @type {string | undefined} */
let blazeCookieJar;

function blazeBrowserHeaders(extra = {}) {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: BLAZE_PAGE_URL,
    Origin: BLAZE_ORIGIN,
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
  const merged = [...(blazeCookieJar ? blazeCookieJar.split("; ") : []), ...parts];
  const map = new Map();
  for (const p of merged) {
    const eq = p.indexOf("=");
    if (eq > 0) map.set(p.slice(0, eq), p);
  }
  blazeCookieJar = [...map.values()].join("; ");
}

async function blazeFetch(url, init = {}) {
  const headers = blazeBrowserHeaders(init.headers ?? {});
  if (blazeCookieJar) {
    headers.Cookie = blazeCookieJar;
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

async function iniciarSessaoBlaze() {
  const res = await blazeFetch(BLAZE_PAGE_URL, {
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
    console.warn(`Aviso: página Blaze HTTP ${res.status} (cookies podem faltar).`);
  }
}

function erro451(page) {
  return new Error(
    `Blaze search HTTP 451 (page=${page}). A Blaze bloqueia IPs de datacenter ` +
      `(GitHub Actions / Supabase Edge). Soluções: (1) rodar este script no seu PC ` +
      `com Agendador de Tarefas; (2) GitHub Actions self-hosted no Windows; ` +
      `(3) secret HTTPS_PROXY com proxy residencial BR. Ver docs/SETUP-MONITOR-LOBBY-BLAZE.md`,
  );
}

async function fetchPagina(page) {
  const url = `${BLAZE_SEARCH_URL}?page=${page}&${SEARCH_QUERY}`;
  const res = await blazeFetch(url);
  collectCookies(res);
  if (res.status === 451) {
    throw erro451(page);
  }
  if (!res.ok) {
    throw new Error(`Blaze search HTTP ${res.status} (page=${page})`);
  }
  return res.json();
}

async function escanearLobby(idsEsperados) {
  await iniciarSessaoBlaze();

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

  // União: Gestão de Estúdios (junction) + legado cadastro blaze.
  // Network (Sports Club) costuma ter só ID Blaze na junction.
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
  const ids = new Set([
    ...junc.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
    ...legado.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
  ]);
  if (ids.size === 0) {
    console.error(
      "Nenhuma mesa com ID Blaze (Gestão de Estúdios → ID Blaze).",
    );
    process.exit(1);
  }

  console.log(`Buscando lobby Blaze (${ids.size} mesas no cadastro)...`);
  const { lobby, paginasLidas } = await escanearLobby(ids);
  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-blaze`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dry_run: dryRun,
      blaze_lobby: lobby,
      blaze_paginas_lidas: paginasLidas,
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
