/**
 * Varredura — grade «Todos os jogos» via /api/games/category/{slug}?offset=&limit=
 * (Donald Bet / BetPontoBet e whitelabels com a mesma API).
 *
 * Continua até achar TODOS os IDs cadastrados ou esgotar o catálogo (hasMore/total).
 */

export const GAMES_CATEGORY_OFFSET_LIMIT_DEFAULT = 48;
export const GAMES_CATEGORY_OFFSET_MAX_PAGES = 200;
export const MONITOR_LOBBY_GAMES_CATEGORY_SCAN_VERSION =
  "v1-games-category-offset-all-ids-or-exhaust";

/**
 * @param {object} opts
 * @param {Set<string>} opts.idsEsperados
 * @param {(offset: number, limit: number) => Promise<{
 *   data?: unknown[];
 *   total?: number;
 *   hasMore?: boolean;
 *   lastPage?: number;
 *   perPage?: number;
 *   limit?: number;
 * }>} opts.fetchPagina
 * @param {number} [opts.limit]
 * @param {string} [opts.logPrefix]
 * @param {(record: any, posicao: number) => { game_id: string; posicao: number; [k: string]: unknown }} opts.mapRecord
 */
export async function escanearLobbyGamesCategoryOffsetAteAcharTodos(opts) {
  const {
    idsEsperados,
    fetchPagina,
    limit = GAMES_CATEGORY_OFFSET_LIMIT_DEFAULT,
    logPrefix = "",
    mapRecord,
  } = opts;

  const lobby = [];
  const posicoes = new Map();
  let offset = 0;
  let paginasLidas = 0;
  let total = null;
  let page = 0;

  console.log(`${logPrefix}scan=${MONITOR_LOBBY_GAMES_CATEGORY_SCAN_VERSION}`);

  while (page < GAMES_CATEGORY_OFFSET_MAX_PAGES) {
    const data = await fetchPagina(offset, limit);
    const records = data.data ?? [];
    page += 1;

    if (page === 1) {
      total = data.total ?? null;
      console.log(
        `${logPrefix}meta:` +
          (total != null ? ` total=${total}` : "") +
          ` limit=${data.perPage ?? data.limit ?? limit}` +
          (data.lastPage != null ? ` lastPage=${data.lastPage}` : ""),
      );
    }

    if (records.length === 0) {
      console.log(`${logPrefix}offset=${offset} vazio — fim do catálogo.`);
      break;
    }

    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const posicao = offset + i + 1;
      const item = mapRecord(records[i], posicao);
      lobby.push(item);
      const idStr = String(item.game_id);
      if (idsEsperados.has(idStr)) {
        posicoes.set(idStr, posicao);
      }
    }

    if (posicoes.size >= idsEsperados.size) {
      console.log(
        `${logPrefix}Todas as ${idsEsperados.size} mesas cadastradas encontradas (até offset ${offset}).`,
      );
      break;
    }

    offset += records.length;

    if (data.hasMore === false) break;
    if (total != null && offset >= total) break;
    if (records.length < limit) break;
  }

  const faltam = [...idsEsperados].filter((id) => !posicoes.has(id));
  console.log(
    `${logPrefix}IDs encontrados: ${posicoes.size}/${idsEsperados.size}` +
      (faltam.length ? ` (faltam: ${faltam.join(", ")})` : ""),
  );

  return { lobby, paginasLidas, posicoes };
}
