/** Mínimo de notícias no ciclo do painel TV quando há histórico suficiente. */
export const PAINEL_NOTICIAS_MIN_EXIBICAO = 5;

export type PainelNoticiaRow = {
  id: string;
  titulo: string;
  resumo: string | null;
  visivel_desde: string;
  visivel_ate: string;
};

function parseMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Lista ordenada por visivel_desde DESC (mais recente primeiro). */
export function ordenarPainelNoticias<T extends { visivel_desde: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => parseMs(b.visivel_desde) - parseMs(a.visivel_desde));
}

/**
 * Conjunto exibido no painel:
 * - Todas com visivel_ate > now(), ou
 * - Se < 5 frescas, completar com vencidas (mais recentes primeiro) até 5.
 */
export function calcularPainelNoticiasExibicao(
  rows: PainelNoticiaRow[],
  now: Date = new Date(),
): PainelNoticiaRow[] {
  const nowMs = now.getTime();
  const ordenadas = ordenarPainelNoticias(rows);
  const frescas = ordenadas.filter((r) => parseMs(r.visivel_ate) > nowMs);
  if (frescas.length >= PAINEL_NOTICIAS_MIN_EXIBICAO) return frescas;
  const vencidas = ordenadas.filter((r) => parseMs(r.visivel_ate) <= nowMs);
  const faltam = PAINEL_NOTICIAS_MIN_EXIBICAO - frescas.length;
  return [...frescas, ...vencidas.slice(0, faltam)];
}

/** IDs de vencidas que podem ser apagadas (fora do conjunto de exibição). */
export function idsPainelNoticiasParaPurga(
  rows: PainelNoticiaRow[],
  now: Date = new Date(),
): string[] {
  const nowMs = now.getTime();
  const exibir = new Set(calcularPainelNoticiasExibicao(rows, now).map((r) => r.id));
  return rows
    .filter((r) => parseMs(r.visivel_ate) <= nowMs && !exibir.has(r.id))
    .map((r) => r.id);
}

export function stripHtmlPainelNoticia(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
