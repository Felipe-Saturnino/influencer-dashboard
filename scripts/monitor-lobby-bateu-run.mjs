/**
 * Telecom / job agendado: busca a grade «Todos os jogos» da Bateu.bet
 * e chama monitor-lobby-bateu (bateu_lobby no body).
 *
 * Fonte (F12 → Rede → casino-games/list):
 *   GET https://bateu.bet.br/api/casino-games/list/
 *     ?categories[]=todos-os-jogos&page=1&per_page=24
 *   Página: https://bateu.bet.br/games/category/todos-os-jogos
 *
 * Match: data[].id ↔ Gestão de Estúdios (bateu_bet)
 * Mesas Spin = Good Game Labs (ex. good-game-v2:live-roulette).
 *
 * Paginação: continua até achar TODOS os IDs cadastrados ou esgotar páginas
 * (Blackjack Network pode estar ~P1000+ nesta grade).
 *
 * Uso:
 *   node scripts/monitor-lobby-bateu-run.mjs --dry-run
 *   node scripts/monitor-lobby-bateu-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_BATEU_INGEST_SECRET,
 *           BATEU_LOBBY_LIST_URL,
 *           BATEU_LOBBY_CATEGORY,
 *           BATEU_LOBBY_PER_PAGE,
 *           HTTPS_PROXY / HTTP_PROXY
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-BATEU.md
 */

const OPERADORA = "bateu_bet";
const LIST_URL_DEFAULT = "https://bateu.bet.br/api/casino-games/list/";
const CATEGORY_DEFAULT = "todos-os-jogos";
const PER_PAGE_DEFAULT = 24;
/** Teto de segurança (~4800 jogos). Catálogo atual ≈ 126 páginas. */
const MAX_PAGES = 200;
const PAGE_ORIGIN = "https://bateu.bet.br";
const PAGE_REFERER = `${PAGE_ORIGIN}/games/category/todos-os-jogos`;
const MONITOR_LOBBY_SCAN_VERSION = "v1-todos-os-jogos-all-ids-or-exhaust";

const dryRun = process.argv.includes("--dry-run");

function logBr() {
  const s = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${s} Brasília]`);
}

function browserHeaders(extra = {}) {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: PAGE_REFERER,
    Origin: PAGE_ORIGIN,
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

async function bateuFetch(url, init = {}) {
  const headers = browserHeaders(init.headers ?? {});
  const opts = { ...init, headers, redirect: "follow" };
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

function listBaseUrl() {
  const raw =
    process.env.BATEU_LOBBY_LIST_URL?.trim() || LIST_URL_DEFAULT;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function categorySlug() {
  return process.env.BATEU_LOBBY_CATEGORY?.trim() || CATEGORY_DEFAULT;
}

function perPage() {
  const n = Number(process.env.BATEU_LOBBY_PER_PAGE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : PER_PAGE_DEFAULT;
}

function providerSlugFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("good game")) return "goodgame";
  if (n.includes("evolution")) return "evolution";
  if (n.includes("pragmatic")) return "pragmaticplay";
  if (n.includes("playtech")) return "playtech";
  if (n.includes("pg soft") || n.includes("pgsoft")) return "pgsoft";
  return n.replace(/\s+/g, "") || "unknown";
}

async function fetchPagina(page, limit) {
  const params = new URLSearchParams();
  params.append("categories[]", categorySlug());
  params.set("page", String(page));
  params.set("per_page", String(limit));
  const url = `${listBaseUrl()}?${params.toString()}`;
  const res = await bateuFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Bateu casino-games/list HTTP ${res.status} (page=${page}): ${body}`);
  }
  return res.json();
}

/**
 * Grade «Todos os jogos» — posição = (page-1)*per_page + índice (1-based).
 * Para quando achar todos os IDs cadastrados ou esgotar o catálogo.
 */
async function escanearLobbyTodosOsJogos(idsEsperados) {
  const limit = perPage();
  const lobby = [];
  const posicoes = new Map();
  let page = 1;
  let paginasLidas = 0;
  let lastPage = MAX_PAGES;

  console.log(`scan=${MONITOR_LOBBY_SCAN_VERSION}`);
  console.log(
    `GET ${listBaseUrl()} categories[]=${categorySlug()} per_page=${limit}`,
  );

  while (page <= lastPage && page <= MAX_PAGES) {
    const data = await fetchPagina(page, limit);
    const records = data.data ?? [];

    if (page === 1) {
      lastPage = Math.max(1, Number(data.last_page) || MAX_PAGES);
      const total = data.total;
      console.log(
        `Bateu meta: last_page=${lastPage}` +
          (total != null ? ` total=${total}` : "") +
          ` per_page=${data.per_page ?? limit}`,
      );
    }

    if (records.length === 0) {
      console.log(`Página ${page} vazia — fim do catálogo.`);
      break;
    }

    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const posicao = (page - 1) * limit + i + 1;
      const providerName = r.provider?.name ?? "";
      const item = {
        posicao,
        game_id: String(r.id),
        name: r.name ?? "",
        slug: r.slug ?? "",
        provider_name: providerName,
        provider_slug: providerSlugFromName(providerName),
      };
      lobby.push(item);
      if (idsEsperados.has(item.game_id)) {
        posicoes.set(item.game_id, posicao);
      }
    }

    if (posicoes.size >= idsEsperados.size) {
      console.log(
        `Todas as ${idsEsperados.size} mesas cadastradas encontradas (até página ${page}).`,
      );
      break;
    }

    page++;
  }

  const faltam = [...idsEsperados].filter((id) => !posicoes.has(id));
  console.log(
    `IDs encontrados: ${posicoes.size}/${idsEsperados.size}` +
      (faltam.length ? ` (faltam: ${faltam.join(", ")})` : ""),
  );

  return { lobby, paginasLidas: paginasLidas || Math.max(0, page - 1) };
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_BATEU_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-bateu-secret"] = secret;
  return headers;
}

async function main() {
  logBr();
  console.log(dryRun ? "Modo: dry-run (não grava)" : "Modo: produção");

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
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
      "Erro mesas_spin_cadastro:",
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
      "Nenhuma mesa com ID Bateu (Gestão de Estúdios → ID Bateu Bet).",
    );
    process.exit(1);
  }

  console.log(`Buscando lobby Bateu (${ids.size} mesas no cadastro)...`);
  console.log(`IDs: ${[...ids].sort().join(", ")}`);

  const { lobby, paginasLidas } = await escanearLobbyTodosOsJogos(ids);
  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);
  if (lobby.length <= 24 && ids.size > 1) {
    console.warn(
      "Aviso: lobby com ≤24 jogos e >1 ID esperado — possível script antigo ou API truncada.",
    );
  }

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-bateu`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      bateu_lobby: lobby,
      bateu_paginas_lidas: paginasLidas,
    }),
  });

  const text = await ingestRes.text();
  console.log("Edge HTTP", ingestRes.status);
  console.log(text.slice(0, 5000));

  if (!ingestRes.ok) process.exit(1);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    process.exit(1);
  }

  if (parsed.mesas_encontradas != null) {
    console.log(
      `Resumo: status=${parsed.status ?? "—"} mesas=${parsed.mesas_encontradas}/${parsed.mesas_esperadas ?? "?"}`,
    );
  }

  const ok =
    parsed.dry_run === true ||
    parsed.ok === true ||
    parsed.status === "ok" ||
    parsed.status === "parcial";
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
