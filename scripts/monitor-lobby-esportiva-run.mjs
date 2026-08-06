/**
 * Telecom / job agendado: busca a prateleira «Cassino Ao Vivo» da home Esportiva
 * e chama monitor-lobby-esportiva (esportiva_lobby no body).
 *
 * Fonte (F12 → Rede → home-sections):
 *   GET https://painel.esportivabet.cloud/api/home-sections/public
 *   seção title = «Cassino Ao Vivo» (type games-fixed)
 *
 * Match: child[].id ↔ Gestão de Estúdios (esportiva_bet)
 * Blackjack na home pode vir como id «5685» (slug goodgame/blackjack).
 *
 * Uso:
 *   node scripts/monitor-lobby-esportiva-run.mjs --dry-run
 *   node scripts/monitor-lobby-esportiva-run.mjs
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: MONITOR_LOBBY_ESPORTIVA_INGEST_SECRET,
 *           ESPORTIVA_LOBBY_HOME_SECTIONS_URL,
 *           ESPORTIVA_LOBBY_HOME_SECTION_TITLE
 *
 * Doc: docs/TELECOM-MONITOR-LOBBY-ESPORTIVA.md
 */

const OPERADORA = "esportiva_bet";
const HOME_SECTIONS_URL_DEFAULT =
  "https://painel.esportivabet.cloud/api/home-sections/public";
const HOME_SECTION_TITLE_DEFAULT = "Cassino Ao Vivo";
const PAGE_REFERER = "https://esportiva.bet.br/";
const PAGE_ORIGIN = "https://esportiva.bet.br";

/** IDs equivalentes na home vs catálogo BS2Bet (mesmo jogo). */
const GAME_ID_ALIASES = {
  "5685": ["good-game-v2:live-blackjack"],
  "good-game-v2:live-blackjack": ["5685"],
};

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

function homeSectionsUrl() {
  return (
    process.env.ESPORTIVA_LOBBY_HOME_SECTIONS_URL?.trim() ||
    HOME_SECTIONS_URL_DEFAULT
  );
}

function homeSectionTitle() {
  return (
    process.env.ESPORTIVA_LOBBY_HOME_SECTION_TITLE?.trim() ||
    HOME_SECTION_TITLE_DEFAULT
  );
}

function providerSlugFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("good game")) return "goodgame";
  if (n.includes("evolution")) return "evolution";
  if (n.includes("pragmatic")) return "pragmaticplay";
  if (n.includes("playtech")) return "playtech";
  return n.replace(/\s+/g, "") || "unknown";
}

function expandGameIds(id) {
  const base = String(id);
  const aliases = GAME_ID_ALIASES[base] ?? [];
  return [base, ...aliases];
}

/**
 * Prateleira curada da home (não o catálogo /casino-games/filter).
 * Posição = índice em child[] (1-based).
 */
function sectionChildrenToLobby(children) {
  return (children ?? []).map((r, i) => {
    const providerName = r.provider?.name ?? "";
    return {
      posicao: i + 1,
      game_id: String(r.id),
      name: r.name ?? "",
      slug: r.slug ?? "",
      provider_name: providerName || "Good Game Labs",
      provider_slug: providerSlugFromName(providerName) || "goodgame",
    };
  });
}

async function escanearLobbyHome() {
  const url = homeSectionsUrl();
  const title = homeSectionTitle();
  const res = await esportivaFetch(url);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Esportiva home-sections HTTP ${res.status}: ${body}`);
  }
  const sections = await res.json();
  if (!Array.isArray(sections)) {
    throw new Error("Esportiva home-sections: resposta não é array.");
  }
  const section = sections.find(
    (s) => String(s?.title || "").trim() === title && s?.active !== false,
  );
  if (!section) {
    throw new Error(
      `Seção «${title}» não encontrada em home-sections/public.`,
    );
  }
  const children = Array.isArray(section.child) ? section.child : [];
  if (children.length === 0) {
    throw new Error(`Seção «${title}» sem jogos (child vazio).`);
  }
  return {
    lobby: sectionChildrenToLobby(children),
    paginasLidas: 1,
    sectionTitle: title,
    sectionType: section.type ?? null,
    maxItems: section.maxItems ?? null,
  };
}

function countSpinNoLobby(lobby, idsUnicos) {
  const idSet = new Set(idsUnicos);
  let n = 0;
  for (const g of lobby) {
    if (expandGameIds(g.game_id).some((id) => idSet.has(id))) n++;
  }
  return n;
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

  console.log(`GET ${homeSectionsUrl()} (seção «${homeSectionTitle()}»)`);
  console.log(`Mesas com ID Esportiva (pré-checagem): ${idsUnicos.length}`);

  const { lobby, paginasLidas, sectionType, maxItems } = await escanearLobbyHome();
  console.log(
    `Lobby home: ${lobby.length} jogos (type=${sectionType ?? "—"}, maxItems=${maxItems ?? "—"}).`,
  );

  const spinNoLobby = countSpinNoLobby(lobby, idsUnicos);
  console.log(`Mesas Spin na prateleira: ${spinNoLobby}/${idsUnicos.length}`);

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
