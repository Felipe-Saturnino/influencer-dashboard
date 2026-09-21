/**
 * Telecom / job agendado: busca o lobby Live da Goldebet
 * e chama monitor-lobby-goldebet (goldebet_lobby no body).
 *
 * Fonte (F12 → Rede → v2/casino-games):
 *   GET https://goldebet.bet.br/v2/casino-games
 *     ?page=1&casino_game_category_ids[]=2&order=clicks
 *   Página: https://goldebet.bet.br/casino/live
 *   Categoria 2 = Cassino Ao Vivo (Live)
 *
 * Match: data[].id (numérico) ↔ Gestão de Estúdios (goldebet)
 * Mesas Spin = GGLabs (IDs platform: 12776 Roleta, 12778 BJ, 12775 Baccarat, 12777 Futebol).
 *
 * Paginação: meta.last_page / per_page=20 até achar TODOS os IDs ou esgotar o catálogo.
 *
 * Uso:
 *   node scripts/monitor-lobby-goldebet-run.mjs --dry-run
 *   node scripts/monitor-lobby-goldebet-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_GOLDEBET_INGEST_SECRET,
 *           GOLDEBET_LOBBY_GAMES_URL,
 *           GOLDEBET_LOBBY_CATEGORY_ID (default 2),
 *           GOLDEBET_LOBBY_ORDER (default clicks),
 *           HTTPS_PROXY / HTTP_PROXY
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-GOLDEBET.md
 */

import {
  escanearLobbySoftGamingsFilterAteAcharTodos,
  SOFTGAMINGS_FILTER_PER_PAGE,
} from "./lib/monitorLobbySoftGamingsFilterScan.mjs";

const OPERADORA = "goldebet";
const GAMES_URL_DEFAULT = "https://goldebet.bet.br/v2/casino-games";
const CATEGORY_ID_DEFAULT = "2";
const ORDER_DEFAULT = "clicks";
const PAGE_ORIGIN = "https://goldebet.bet.br";
const PAGE_REFERER = `${PAGE_ORIGIN}/casino/live`;
/** SoftGamings lib usa per_page 24; Goldebet devolve 20 — normalizamos via meta. */
const PER_PAGE_FALLBACK = 20;

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

async function goldebetFetch(url, init = {}) {
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

function gamesBaseUrl() {
  return (
    process.env.GOLDEBET_LOBBY_GAMES_URL?.trim() || GAMES_URL_DEFAULT
  ).replace(/\/$/, "");
}

function categoryId() {
  return process.env.GOLDEBET_LOBBY_CATEGORY_ID?.trim() || CATEGORY_ID_DEFAULT;
}

function orderParam() {
  return process.env.GOLDEBET_LOBBY_ORDER?.trim() || ORDER_DEFAULT;
}

function providerSlugFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("gg") || n.includes("good game")) return "gglabs";
  if (n.includes("evolution")) return "evolution";
  if (n.includes("pragmatic")) return "pragmaticplay";
  if (n.includes("playtech")) return "playtech";
  return n.replace(/\s+/g, "") || "unknown";
}

async function fetchPagina(page) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.append("casino_game_category_ids[]", categoryId());
  params.set("order", orderParam());
  const url = `${gamesBaseUrl()}?${params.toString()}`;
  const res = await goldebetFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Goldebet v2/casino-games HTTP ${res.status} (page=${page}): ${body}`);
  }
  const j = await res.json();
  const meta = j.meta ?? {};
  return {
    data: j.data ?? [],
    last_page: meta.last_page,
    total: meta.total,
    per_page: meta.per_page ?? PER_PAGE_FALLBACK,
  };
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_GOLDEBET_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-goldebet-secret"] = secret;
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
    ...junc.map((m) => String(m.mesa_identificacao_operadora ?? "").trim()).filter(Boolean),
    ...legado.map((m) => String(m.mesa_identificacao_operadora ?? "").trim()).filter(Boolean),
  ]);
  if (ids.size === 0) {
    console.error(
      "Nenhuma mesa com ID Goldebet (Gestão de Estúdios → ID Goldebet).",
    );
    process.exit(1);
  }

  console.log(`Buscando lobby Goldebet Live (${ids.size} mesas no cadastro)...`);
  console.log(`IDs: ${[...ids].sort().join(", ")}`);
  console.log(
    `GET ${gamesBaseUrl()} category=${categoryId()} order=${orderParam()}`,
  );

  const { lobby, paginasLidas } = await escanearLobbySoftGamingsFilterAteAcharTodos({
    idsEsperados: ids,
    fetchPagina: (page) => fetchPagina(page),
    perPage: SOFTGAMINGS_FILTER_PER_PAGE,
    logPrefix: "Goldebet ",
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

  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-goldebet`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      goldebet_lobby: lobby,
      goldebet_paginas_lidas: paginasLidas,
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
