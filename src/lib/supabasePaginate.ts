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

export async function fetchLiveResultadosBatched<T>(
  liveIds: string[],
  runChunk: (ids: string[]) => Promise<PageResult<T>>
): Promise<T[]> {
  if (!liveIds.length) return [];
  const out: T[] = [];
  for (let i = 0; i < liveIds.length; i += LIVE_RESULTADOS_IN_CHUNK) {
    const slice = liveIds.slice(i, i + LIVE_RESULTADOS_IN_CHUNK);
    const { data, error } = await runChunk(slice);
    if (error) throw new Error(error.message);
    if (data?.length) out.push(...data);
  }
  return out;
}
