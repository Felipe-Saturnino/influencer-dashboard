/**
 * Varredura paginada SoftSwiss (Blaze / Jonbet).
 * Continua até achar TODOS os IDs cadastrados ou esgotar o catálogo.
 */

export const SOFTSWISS_PAGE_LIMIT = 30;
/** Teto de segurança (~1500 jogos live-casino). */
export const SOFTSWISS_MAX_PAGES = 50;

export const MONITOR_LOBBY_SCAN_VERSION = "v2-all-ids-or-exhaust";

/**
 * @param {object} opts
 * @param {Set<string>} opts.idsEsperados
 * @param {number} [opts.limit=30]
 * @param {(page: number) => Promise<{ records?: unknown[]; meta?: { total_pages?: number; total_records?: number } }>} opts.fetchPagina
 * @param {string} [opts.logPrefix]
 * @param {(record: unknown, posicao: number) => object} opts.mapRecord
 */
export async function escanearLobbySoftSwissAteAcharTodos(opts) {
  const {
    idsEsperados,
    limit = SOFTSWISS_PAGE_LIMIT,
    fetchPagina,
    logPrefix = "",
    mapRecord,
  } = opts;

  const lobby = [];
  const posicoes = new Map();
  let page = 1;
  let paginasLidas = 0;

  console.log(`${logPrefix}scan=${MONITOR_LOBBY_SCAN_VERSION}`);

  while (page <= SOFTSWISS_MAX_PAGES) {
    const data = await fetchPagina(page);
    const records = data.records ?? [];

    if (page === 1) {
      const tp = data.meta?.total_pages;
      const tr = data.meta?.total_records;
      console.log(
        `${logPrefix}meta: total_pages=${tp ?? "?"} total_records=${tr ?? "?"}`,
      );
    }

    if (records.length === 0) {
      console.log(`${logPrefix}Página ${page} vazia — fim do catálogo.`);
      break;
    }

    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const posicao = (page - 1) * limit + i + 1;
      const item = mapRecord(r, posicao);
      lobby.push(item);
      const idStr = String(item.game_id);
      if (idsEsperados.has(idStr)) {
        posicoes.set(idStr, posicao);
      }
    }

    if (posicoes.size >= idsEsperados.size) {
      console.log(
        `${logPrefix}Todas as ${idsEsperados.size} mesas cadastradas encontradas (até página ${page}).`,
      );
      break;
    }

    page++;
  }

  const faltam = [...idsEsperados].filter((id) => !posicoes.has(id));
  console.log(
    `${logPrefix}IDs encontrados: ${posicoes.size}/${idsEsperados.size}` +
      (faltam.length ? ` (faltam: ${faltam.join(", ")})` : ""),
  );

  return { lobby, posicoes, paginasLidas: paginasLidas || page - 1 };
}
