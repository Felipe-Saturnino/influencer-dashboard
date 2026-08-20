/** Varredura paginada SoftSwiss (Blaze / Jonbet). */

export const SOFTSWISS_PAGE_LIMIT = 30;
export const SOFTSWISS_MAX_PAGES = 50;
export const MONITOR_LOBBY_SCAN_VERSION = "v2-all-ids-or-exhaust";

interface SearchRecord {
  id: number | string;
  name: string;
  slug: string;
  provider?: { name?: string; slug?: string };
}

interface SearchResponse {
  records?: SearchRecord[];
  meta?: { total_pages?: number; total_records?: number };
}

export interface SoftSwissLobbyGame {
  posicao: number;
  game_id: number | string;
  name: string;
  slug: string;
  provider_name: string;
  provider_slug: string;
}

function mapRecord(r: SearchRecord, posicao: number): SoftSwissLobbyGame {
  return {
    posicao,
    game_id: r.id,
    name: r.name,
    slug: r.slug,
    provider_name: r.provider?.name ?? "",
    provider_slug: r.provider?.slug ?? "",
  };
}

/**
 * Varre páginas até achar TODOS os IDs cadastrados ou esgotar o catálogo.
 * Não confia só em meta.total_pages (pode vir 1 sem sessão/cookie).
 */
export async function escanearLobbySoftSwiss(opts: {
  idsEsperados: Set<string>;
  fetchPagina: (page: number) => Promise<SearchResponse>;
  limit?: number;
  log?: (msg: string) => void;
}): Promise<{
  lobby: SoftSwissLobbyGame[];
  posicoes: Map<string, number>;
  paginasLidas: number;
}> {
  const { idsEsperados, fetchPagina, limit = SOFTSWISS_PAGE_LIMIT, log = console.log } =
    opts;

  const lobby: SoftSwissLobbyGame[] = [];
  const posicoes = new Map<string, number>();
  let page = 1;
  let paginasLidas = 0;

  log(`scan=${MONITOR_LOBBY_SCAN_VERSION}`);

  while (page <= SOFTSWISS_MAX_PAGES) {
    const data = await fetchPagina(page);
    const records = data.records ?? [];

    if (page === 1) {
      const tp = data.meta?.total_pages;
      const tr = data.meta?.total_records;
      log(`meta: total_pages=${tp ?? "?"} total_records=${tr ?? "?"}`);
    }

    if (records.length === 0) {
      log(`Página ${page} vazia — fim do catálogo.`);
      break;
    }

    paginasLidas = page;

    for (let i = 0; i < records.length; i++) {
      const item = mapRecord(records[i], (page - 1) * limit + i + 1);
      lobby.push(item);
      const idStr = String(item.game_id);
      if (idsEsperados.has(idStr)) {
        posicoes.set(idStr, item.posicao);
      }
    }

    if (posicoes.size >= idsEsperados.size) {
      log(
        `Todas as ${idsEsperados.size} mesas cadastradas encontradas (até página ${page}).`,
      );
      break;
    }

    page++;
  }

  const faltam = [...idsEsperados].filter((id) => !posicoes.has(id));
  log(
    `IDs encontrados: ${posicoes.size}/${idsEsperados.size}` +
      (faltam.length ? ` (faltam: ${faltam.join(", ")})` : ""),
  );

  return { lobby, posicoes, paginasLidas: paginasLidas || Math.max(0, page - 1) };
}
