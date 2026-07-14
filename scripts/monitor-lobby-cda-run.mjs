/**
 * Telecom / job agendado: busca categorias do cassino CDA e chama monitor-lobby-cda.
 * Mesmo padrão de scripts/monitor-lobby-blaze-run.mjs (fetch fora da Edge + ingest no body).
 *
 * URL: https://casadeapostas.bet.br/api/content/casino-categories?languageId=21
 *
 * Uso:
 *   node scripts/monitor-lobby-cda-run.mjs --dry-run
 *   node scripts/monitor-lobby-cda-run.mjs
 *
 * Env obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CDA_LOBBY_COOKIE
 * Env opcionais: MONITOR_LOBBY_CDA_INGEST_SECRET, CDA_LOBBY_CATEGORIES_URL
 *
 * Doc Telecom: docs/TELECOM-MONITOR-LOBBY-CDA.md
 */

const OPERADORA = "casa_apostas";
const CDA_CATEGORIES_URL_DEFAULT =
  "https://casadeapostas.bet.br/api/content/casino-categories?languageId=21";
const CDA_CASINO_PAGE = "https://www.casadeapostas.bet.br/br/casino";

const dryRun = process.argv.includes("--dry-run");

function logBr() {
  const s = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${s} Brasília]`);
}

function cdaBrowserHeaders(cookie) {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: CDA_CASINO_PAGE,
    Origin: "https://www.casadeapostas.bet.br",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    Cookie: cookie,
  };
}

function parseCategoriesPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.categories)) return data.categories;
  throw new Error("Resposta CDA inválida: esperado array de categorias");
}

async function fetchCdaCategories(cookie) {
  const url = process.env.CDA_LOBBY_CATEGORIES_URL?.trim() || CDA_CATEGORIES_URL_DEFAULT;
  const res = await fetch(url, { headers: cdaBrowserHeaders(cookie), redirect: "follow" });
  if (res.status === 401) {
    throw new Error(
      "CDA HTTP 401 — renovar CDA_LOBBY_COOKIE (sessão casadeapostas.bet.br expirada). Ver docs/TELECOM-MONITOR-LOBBY-CDA.md",
    );
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`CDA HTTP ${res.status}: ${body}`);
  }
  return parseCategoriesPayload(await res.json());
}

function ingestHeaders(serviceKey) {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  const secret = process.env.MONITOR_LOBBY_CDA_INGEST_SECRET?.trim();
  if (secret) headers["x-monitor-lobby-cda-secret"] = secret;
  return headers;
}

async function main() {
  logBr();
  console.log(dryRun ? "Modo: dry-run (não grava)" : "Modo: produção");

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const cookie = process.env.CDA_LOBBY_COOKIE?.trim();

  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!cookie) {
    console.error(
      "Defina CDA_LOBBY_COOKIE (header Cookie do request casino-categories, usuário logado).",
    );
    process.exit(1);
  }

  // Pré-checagem: IDs CDA na junction (Gestão de Estúdios) ∪ legado operadora_slug.
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
      `${supabaseUrl}/rest/v1/mesas_spin_cadastro?operadora_slug=eq.${OPERADORA}&select=nome_mesa,mesa_identificacao_operadora`,
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
      "Nenhuma mesa com ID CDA (Gestão de Estúdios → ID CDA ou legado casa_apostas). Spin: cadastrar IDs ou scripts/manual-supabase-mesas-spin-cda-lobby-ids.sql",
    );
    process.exit(1);
  }

  const urlUsada =
    process.env.CDA_LOBBY_CATEGORIES_URL?.trim() || CDA_CATEGORIES_URL_DEFAULT;
  console.log(`CDA GET ${urlUsada}`);
  console.log(`Mesas com ID CDA (pré-checagem): ${idsUnicos.length}`);

  const categories = await fetchCdaCategories(cookie);
  const totalJogos = categories.reduce(
    (s, c) => s + (c.competitions?.length ?? 0),
    0,
  );
  console.log(`Categorias: ${categories.length}, jogos: ${totalJogos}`);

  const fnUrl = `${supabaseUrl}/functions/v1/monitor-lobby-cda`;
  const ingestRes = await fetch(fnUrl, {
    method: "POST",
    headers: ingestHeaders(serviceKey),
    body: JSON.stringify({
      dry_run: dryRun,
      cda_categories: categories,
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
