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

/** Limite de caracteres do detalhe na TV (~6–8 linhas a 3 m). */
export const PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES = 1500;

export function stripHtmlPainelNoticia(s: string): string {
  return formatDetalhePainelNoticia(s);
}

/** HTML ou texto do RSS → detalhe legível com quebras de linha para o painel. */
export function formatDetalhePainelNoticia(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const t = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (t.length <= PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES) return t;
  const cut = t.slice(0, PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 400 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}
