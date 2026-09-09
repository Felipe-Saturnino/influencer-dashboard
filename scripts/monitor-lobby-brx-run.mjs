/**
 * Telecom / job agendado: busca a grade «Todos os jogos» (/games/category/all)
 * da BrxBet e chama monitor-lobby-brx (brx_lobby no body).
 *
 * Fonte (F12 → Rede → casino-games/filter):
 *   GET https://brx.bet.br/api/casino-games/filter?sort=&per_page=24&page=1&term=
 *   Página: https://brx.bet.br/games/category/all
 *
 * Match: data[].id ↔ Gestão de Estúdios (brx_bet)
 * Mesas Spin = Good Game Labs (mesmos IDs da Bateu/Rico).
 *
 * Uso:
 *   node scripts/monitor-lobby-brx-run.mjs --dry-run
 *   node scripts/monitor-lobby-brx-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_BRX_INGEST_SECRET, BRX_LOBBY_FILTER_URL,
 *           BRX_LOBBY_PER_PAGE, HTTPS_PROXY / HTTP_PROXY
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-BRX.md
 */

import {
  escanearLobbySoftGamingsFilterAteAcharTodos,
  MONITOR_LOBBY_FILTER_SCAN_VERSION,
  SOFTGAMINGS_FILTER_PER_PAGE,
  providerSlugFromName,
} from "./lib/monitorLobbySoftGamingsFilterScan.mjs";

const OPERADORA = "brx_bet";
const FILTER_URL_DEFAULT = "https://brx.bet.br/api/casino-games/filter";
const PAGE_ORIGIN = "https://brx.bet.br";
const PAGE_REFERER = `${PAGE_ORIGIN}/games/category/all`;
const EDGE_SLUG = "monitor-lobby-brx";
const BODY_LOBBY_KEY = "brx_lobby";
const BODY_PAGES_KEY = "brx_paginas_lidas";
const INGEST_HEADER = "x-monitor-lobby-brx-secret";
const INGEST_SECRET_ENV = "MONITOR_LOBBY_BRX_INGEST_SECRET";

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

async function siteFetch(url, init = {}) {
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

function filterBaseUrl() {
  return (
    process.env.BRX_LOBBY_FILTER_URL?.trim() || FILTER_URL_DEFAULT
  ).replace(/\?$/, "");
}

function perPage() {
  const n = Number(process.env.BRX_LOBBY_PER_PAGE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : SOFTGAMINGS_FILTER_PER_PAGE;
}

async function fetchPagina(page, limit) {
  const params = new URLSearchParams();
  params.set("sort", "");
  params.set("per_page", String(limit));
  params.set("page", String(page));
  params.set("term", "");
  const url = `${filterBaseUrl()}?${params.toString()}`;
  const res = await siteFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`BRX casino-games/filter HTTP ${res.status} (page=${page}): ${body}`);
  }
  return res.json();
}

async function escanearLobby(idsEsperados) {
  const limit = perPage();
  console.log(`GET ${filterBaseUrl()} sort= per_page=${limit} term= (category/all)`);
  return escanearLobbySoftGamingsFilterAteAcharTodos({
    idsEsperados,
    perPage: limit,
    logPrefix: "BRX ",
    fetchPagina,
    mapRecord: (r, posicao) => {
      const providerName = r.provider?.name ?? "";
      return {
        posicao,
        game_id: String(r.id),
        name: r.name ?? "",
        slug: r.slug ?? "",
        provider_name: providerName,
        provider_slug: providerSlugFromName(providerName),
      };
    },
  });
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env[INGEST_SECRET_ENV]?.trim();
  if (secret) headers[INGEST_HEADER] = secret;
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
    console.error("Erro mesas_spin_cadastro:", legadoRes.status, await legadoRes.text());
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
      "Nenhuma mesa com ID BRX (Gestão de Estúdios → ID BRX Bet).",
    );
    process.exit(1);
  }

  console.log(`Buscando lobby BRX (${ids.size} mesas no cadastro)...`);
  console.log(`scan=${MONITOR_LOBBY_FILTER_SCAN_VERSION}`);
  console.log(`IDs: ${[...ids].sort().join(", ")}`);

  const { lobby, paginasLidas } = await escanearLobby(ids);
  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);
  if (lobby.length <= 24 && ids.size > 1) {
    console.warn(
      "Aviso: lobby com ≤24 jogos e >1 ID esperado — possível script antigo ou API truncada.",
    );
  }

  const fnUrl = `${supabaseUrl}/functions/v1/${EDGE_SLUG}`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      [BODY_LOBBY_KEY]: lobby,
      [BODY_PAGES_KEY]: paginasLidas,
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
