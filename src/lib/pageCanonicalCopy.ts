import type { PageKey } from "../types";

/**
 * Subtítulos canónicos de página (Brand §4 / MDC da secção).
 * Fonte única para PageHeader e atalhos da Home Investidor.
 */
export const PAGE_CANONICAL_SUBTITLE: Partial<Record<PageKey, string>> = {
  agenda: "Visualize, agende e acompanhe as lives dos influencers.",
  mesas_spin: "Resultados financeiros e operacionais das mesas ao vivo por operadora.",
  streamers: "Acompanhe performance, conversão e financeiro do canal de influencers.",
  ajuda: "Conheça as funcionalidades da plataforma, o glossário de métricas e soluções para problemas comuns.",
};

export function getPageCanonicalSubtitle(pageKey: PageKey): string {
  return PAGE_CANONICAL_SUBTITLE[pageKey] ?? "";
}
