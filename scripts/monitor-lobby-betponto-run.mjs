/**
 * Telecom / job agendado: busca a grade «Todos os jogos» da BetPontoBet
 * e chama monitor-lobby-betponto (betponto_lobby no body).
 *
 * Fonte (F12 → Rede → games/category):
 *   GET https://betpontobet.bet.br/api/games/category/todos-os-jogos?offset=0&limit=48
 *   Página: https://betpontobet.bet.br/cassino/categoria/todos-os-jogos
 *
 * Match: data[].id ↔ Gestão de Estúdios (betponto_bet)
 * Mesas Spin = Good Game Labs (ex. good-game-v2:live-roulette).
 *
 * Paginação: offset/limit até achar TODOS os IDs cadastrados ou esgotar o catálogo.
 *
 * Nota (validação 2026-09): as mesas GG Labs já existem no catálogo do provedor
 * (`/api/games/provider/goodgame`), mas ainda podem não aparecer na grade
 * Todos os jogos — nesse caso o job grava parcial / 0 encontradas até a
 * operadora incluir os títulos nessa categoria.
 *
 * Uso:
 *   node scripts/monitor-lobby-betponto-run.mjs --dry-run
 *   node scripts/monitor-lobby-betponto-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_BETPONTO_INGEST_SECRET,
 *           BETPONTO_LOBBY_CATEGORY_URL,
 *           BETPONTO_LOBBY_CATEGORY,
 *           BETPONTO_LOBBY_LIMIT,
 *           HTTPS_PROXY / HTTP_PROXY
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-BETPONTO.md
 */

import {
  escanearLobbyGamesCategoryOffsetAteAcharTodos,
  GAMES_CATEGORY_OFFSET_LIMIT_DEFAULT,
} from "./lib/monitorLobbyGamesCategoryOffsetScan.mjs";

const OPERADORA = "betponto_bet";
const CATEGORY_URL_DEFAULT =
  "https://betpontobet.bet.br/api/games/category/todos-os-jogos";
const CATEGORY_DEFAULT = "todos-os-jogos";
const PAGE_ORIGIN = "https://betpontobet.bet.br";
const PAGE_REFERER = `${PAGE_ORIGIN}/cassino/categoria/todos-os-jogos`;

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

async function betpontoFetch(url, init = {}) {
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

function categoryBaseUrl() {
  const raw =
    process.env.BETPONTO_LOBBY_CATEGORY_URL?.trim() || CATEGORY_URL_DEFAULT;
  const cat = process.env.BETPONTO_LOBBY_CATEGORY?.trim() || CATEGORY_DEFAULT;
  if (process.env.BETPONTO_LOBBY_CATEGORY_URL?.trim()) return raw.replace(/\/$/, "");
  return `${PAGE_ORIGIN}/api/games/category/${cat}`;
}

function perLimit() {
  const n = Number(process.env.BETPONTO_LOBBY_LIMIT);
  return Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : GAMES_CATEGORY_OFFSET_LIMIT_DEFAULT;
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

async function fetchPagina(offset, limit) {
  const url = `${categoryBaseUrl()}?offset=${offset}&limit=${limit}`;
  const res = await betpontoFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(
      `BetPontoBet games/category HTTP ${res.status} (offset=${offset}): ${body}`,
    );
  }
  return res.json();
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_BETPONTO_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-betponto-secret"] = secret;
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
      "Nenhuma mesa com ID BetPontoBet (Gestão de Estúdios → ID BetPontoBet).",
    );
    process.exit(1);
  }

  const limit = perLimit();
  console.log(`Buscando lobby BetPontoBet (${ids.size} mesas no cadastro)...`);
  console.log(`IDs: ${[...ids].sort().join(", ")}`);
  console.log(`GET ${categoryBaseUrl()} offset/limit=${limit}`);

  const { lobby, paginasLidas } = await escanearLobbyGamesCategoryOffsetAteAcharTodos({
    idsEsperados: ids,
    fetchPagina,
    limit,
    logPrefix: "BetPontoBet ",
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

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-betponto`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      betponto_lobby: lobby,
      betponto_paginas_lidas: paginasLidas,
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
