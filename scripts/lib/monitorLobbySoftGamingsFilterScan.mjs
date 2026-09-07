/**
 * Varredura SoftGamings — grade «Todos os jogos» via casino-games/filter
 * (Rico / BRX: /games/category/all).
 *
 * Continua até achar TODOS os IDs cadastrados ou esgotar o catálogo.
 */

export const SOFTGAMINGS_FILTER_PER_PAGE = 24;
export const SOFTGAMINGS_FILTER_MAX_PAGES = 300;
export const MONITOR_LOBBY_FILTER_SCAN_VERSION =
  "v1-category-all-filter-all-ids-or-exhaust";

/**
 * @param {object} opts
 * @param {Set<string>} opts.idsEsperados
 * @param {(page: number, perPage: number) => Promise<{ data?: unknown[]; last_page?: number; total?: number; per_page?: number }>} opts.fetchPagina
 * @param {number} [opts.perPage]
 * @param {string} [opts.logPrefix]
 * @param {(record: any, posicao: number) => object} opts.mapRecord
 */
export async function escanearLobbySoftGamingsFilterAteAcharTodos(opts) {
  const {
    idsEsperados,
    fetchPagina,
    perPage = SOFTGAMINGS_FILTER_PER_PAGE,
    logPrefix = "",
    mapRecord,
  } = opts;

  const lobby = [];
  const posicoes = new Map();
  let page = 1;
  let paginasLidas = 0;
  let lastPage = SOFTGAMINGS_FILTER_MAX_PAGES;

  console.log(`${logPrefix}scan=${MONITOR_LOBBY_FILTER_SCAN_VERSION}`);

  while (page <= lastPage && page <= SOFTGAMINGS_FILTER_MAX_PAGES) {
    const data = await fetchPagina(page, perPage);
    const records = data.data ?? [];

    if (page === 1) {
      lastPage = Math.max(1, Number(data.last_page) || SOFTGAMINGS_FILTER_MAX_PAGES);
      const total = data.total;
      console.log(
        `${logPrefix}meta: last_page=${lastPage}` +
          (total != null ? ` total=${total}` : "") +
          ` per_page=${data.per_page ?? perPage}`,
      );
    }

    if (records.length === 0) {
      console.log(`${logPrefix}Página ${page} vazia — fim do catálogo.`);
      break;
    }

    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const posicao = (page - 1) * perPage + i + 1;
      const item = mapRecord(records[i], posicao);
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

  return { lobby, posicoes, paginasLidas: paginasLidas || Math.max(0, page - 1) };
}

export function providerSlugFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("good game")) return "goodgame";
  if (n.includes("evolution")) return "evolution";
  if (n.includes("pragmatic")) return "pragmaticplay";
  if (n.includes("playtech")) return "playtech";
  if (n.includes("pg soft") || n.includes("pgsoft")) return "pgsoft";
  return n.replace(/\s+/g, "") || "unknown";
}
