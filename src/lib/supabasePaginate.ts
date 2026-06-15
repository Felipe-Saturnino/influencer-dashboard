/**
 * PostgREST (Supabase) limita respostas a 1000 linhas por requisição por padrão.
 * Use estes helpers para consultas que podem exceder esse limite.
 */
export const SUPABASE_PAGE_SIZE = 1000;

/** Tamanho seguro de lote para `.in("live_id", ...)` em live_resultados. */
export const LIVE_RESULTADOS_IN_CHUNK = 150;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllPages<T>(runPage: (from: number, to: number) => Promise<PageResult<T>>): Promise<T[]> {
  const acc: T[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await runPage(from, to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    acc.push(...rows);
    if (rows.length < SUPABASE_PAGE_SIZE) break;
  }
  return acc;
}

/** Tamanho seguro de lote para `.in("execucao_id", ...)` em lobby_monitor_posicao. */
export const LOBBY_MONITOR_EXECUCAO_IN_CHUNK = 80;

export async function fetchInBatched<T>(
  ids: string[],
  chunkSize: number,
  runChunk: (slice: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (!ids.length) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const rows = await runChunk(slice);
    if (rows.length) out.push(...rows);
  }
  return out;
}

export async function fetchLiveResultadosBatched<T>(
  liveIds: string[],
  runChunk: (ids: string[]) => Promise<PageResult<T>>
): Promise<T[]> {
  if (!liveIds.length) return [];
  return fetchInBatched(liveIds, LIVE_RESULTADOS_IN_CHUNK, async (slice) => {
    const { data, error } = await runChunk(slice);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}
