/**
 * Busca o lobby Blaze (fora da Edge Supabase — evita HTTP 451) e chama monitor-lobby-blaze.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/monitor-lobby-blaze-run.mjs
 *   ... node scripts/monitor-lobby-blaze-run.mjs --dry-run
 */

const LIMIT = 30;
const SEARCH_QUERY =
  "limit=30&search=&game_category_slugs=live-casino&xp_enabled=false&game_provider_slugs=&bonus_betting_enabled=false";
const BLAZE_SEARCH_URL = "https://blaze.bet.br/api/games/search";
const OPERADORA = "blaze";

const dryRun = process.argv.includes("--dry-run");

function blazeHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    Referer: "https://blaze.bet.br/pt/games/category/live-casino",
    Origin: "https://blaze.bet.br",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

async function fetchPagina(page) {
  const url = `${BLAZE_SEARCH_URL}?page=${page}&${SEARCH_QUERY}`;
  const res = await fetch(url, { headers: blazeHeaders() });
  if (!res.ok) {
    throw new Error(`Blaze search HTTP ${res.status} (page=${page})`);
  }
  return res.json();
}

async function escanearLobby(idsEsperados) {
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

  const mesasRes = await fetch(
    `${supabaseUrl}/rest/v1/mesas_spin_cadastro?operadora_slug=eq.${OPERADORA}&select=mesa_identificacao_operadora`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!mesasRes.ok) {
    console.error("Erro ao ler mesas_spin_cadastro:", mesasRes.status, await mesasRes.text());
    process.exit(1);
  }
  const mesas = await mesasRes.json();
  const ids = new Set(
    mesas
      .map((m) => m.mesa_identificacao_operadora?.trim())
      .filter(Boolean),
  );
  if (ids.size === 0) {
    console.error("Nenhuma mesa com mesa_identificacao_operadora para blaze.");
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
