/**
 * Telecom / job agendado: busca o lobby Esportiva Bet (BS2Bet / GG Labs)
 * e chama monitor-lobby-esportiva (esportiva_lobby no body).
 *
 * API: https://api-esportiva-betbr.bs2bet.com/v2/casino-games/filter
 * Match: data[].id ↔ Gestão de Estúdios (esportiva_bet)
 *
 * Uso:
 *   node scripts/monitor-lobby-esportiva-run.mjs --dry-run
 *   node scripts/monitor-lobby-esportiva-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET, ESPORTIVA_LOBBY_FILTER_URL
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-ESPORTIVA.md
 */

const OPERADORA = "esportiva_bet";
const FILTER_BASE_DEFAULT =
  "https://api-esportiva-betbr.bs2bet.com/v2/casino-games/filter";
const FILTER_QUERY_DEFAULT = "category=cassino-ao-vivo";
const PAGE_REFERER =
  "https://esportiva.bet.br/games/category/cassino-ao-vivo/popular";
const PAGE_ORIGIN = "https://esportiva.bet.br";

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
    "sec-fetch-site": "cross-site",
    ...extra,
  };
}

async function esportivaFetch(url, init = {}) {
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

function filterBase() {
  return (
    process.env.ESPORTIVA_LOBBY_FILTER_URL?.trim()?.replace(/\?.*$/, "") ||
    FILTER_BASE_DEFAULT
  );
}

function filterQuery() {
  return process.env.ESPORTIVA_LOBBY_FILTER_QUERY?.trim() || FILTER_QUERY_DEFAULT;
}

async function fetchPagina(page) {
  const url = `${filterBase()}?page=${page}&${filterQuery()}`;
  const res = await esportivaFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Esportiva filter HTTP ${res.status} (page=${page}): ${body}`);
  }
  return res.json();
}

function recordsToLobby(records) {
  const sorted = [...records].sort((a, b) => {
    const oa = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
    const ob = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted.map((r, i) => ({
    posicao: i + 1,
    game_id: String(r.id),
    name: r.name ?? "",
    slug: r.slug ?? "",
    provider_name: r.provider?.name ?? "Good Game Labs",
    provider_slug: r.provider?.slug ?? "goodgame",
    order: typeof r.order === "number" ? r.order : undefined,
  }));
}

async function escanearLobby() {
  const all = [];
  let page = 1;
  let lastPage = 1;
  while (page <= lastPage) {
    const data = await fetchPagina(page);
    if (page === 1) {
      lastPage = Math.max(1, data.last_page ?? 1);
      console.log(
        `API: last_page=${lastPage} total=${data.total ?? "?"} (query=${filterQuery()})`,
      );
    }
    all.push(...(data.data ?? []));
    page++;
  }
  return { lobby: recordsToLobby(all), paginasLidas: lastPage };
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-esportiva-secret"] = secret;
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
  const ids = [
    ...junc.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
    ...legado.map((m) => m.mesa_identificacao_operadora?.trim()).filter(Boolean),
  ];
  const idsUnicos = [...new Set(ids)];
  if (idsUnicos.length === 0) {
    console.error(
      "Nenhuma mesa com ID Esportiva (Gestão de Estúdios → ID Esportiva Bet).",
    );
    process.exit(1);
  }

  console.log(`GET ${filterBase()}?${filterQuery()}`);
  console.log(`Mesas com ID Esportiva (pré-checagem): ${idsUnicos.length}`);

  const { lobby, paginasLidas } = await escanearLobby();
  console.log(`Lobby: ${lobby.length} jogos, ${paginasLidas} página(s).`);

  const spinNoLobby = lobby.filter((g) => idsUnicos.includes(g.game_id)).length;
  console.log(`Mesas Spin no lobby escaneado: ${spinNoLobby}/${idsUnicos.length}`);

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-esportiva`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      esportiva_lobby: lobby,
      esportiva_paginas_lidas: paginasLidas,
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
