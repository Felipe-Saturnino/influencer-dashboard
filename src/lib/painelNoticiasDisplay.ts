import {
  itemElegivelPainelNoticia,
  prepararTextoPainelNoticia,
  sanitizePainelNoticiaHtml,
} from "./painelNoticiasSanitize";

export {
  formatTituloPainelNoticia,
  filtrarLinhasPainelNoticia,
  itemElegivelPainelNoticia,
  linhaIrrelevantePainelNoticia,
  normalizarResumoRssBruto,
  prepararTextoPainelNoticia,
  removePainelNoticiaBoilerplate,
  sanitizePainelNoticiaHtml,
  resumoUtilPainel,
  substituirTituloTruncadoPorResumo,
  tituloPareceTruncadoRss,
} from "./painelNoticiasSanitize";

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

function truncarDetalhePainelNoticia(corpo: string): string {
  if (corpo.length <= PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES) return corpo;
  const cut = corpo.slice(0, PAINEL_NOTICIAS_DETALHE_MAX_CARACTERES);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 400 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
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
  const elegiveis = ordenarPainelNoticias(rows).filter((r) =>
    itemElegivelPainelNoticia(r.titulo, r.resumo),
  );
  const frescas = elegiveis.filter((r) => parseMs(r.visivel_ate) > nowMs);
  if (frescas.length >= PAINEL_NOTICIAS_MIN_EXIBICAO) return frescas;
  const vencidas = elegiveis.filter((r) => parseMs(r.visivel_ate) <= nowMs);
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
  return sanitizePainelNoticiaHtml(s);
}

/** Texto do detalhe na TV — sem HTML, boilerplate nem repetição do título. */
export function formatDetalhePainelNoticia(
  resumoRaw: string | null | undefined,
  tituloRaw?: string | null,
): string {
  const { corpo } = prepararTextoPainelNoticia(tituloRaw ?? null, resumoRaw);
  if (!corpo) return "";
  return truncarDetalhePainelNoticia(corpo);
}

/** Título + detalhe prontos para exibição na TV. */
export function prepararExibicaoPainelNoticia(row: PainelNoticiaRow): {
  titulo: string;
  detalhe: string;
} {
  const { titulo, corpo } = prepararTextoPainelNoticia(row.titulo, row.resumo);
  return {
    titulo,
    detalhe: corpo ? truncarDetalhePainelNoticia(corpo) : "",
  };
}
