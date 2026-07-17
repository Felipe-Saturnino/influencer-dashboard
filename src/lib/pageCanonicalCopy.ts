import type { PageKey } from "../types";

/**
 * Subtítulos canónicos de página (Brand §4 / MDC da secção).
 * Fonte única para PageHeader e atalhos da Home Investidor.
 */
export const PAGE_CANONICAL_SUBTITLE: Partial<Record<PageKey, string>> = {
  agenda: "Visualize, agende e acompanhe as lives dos influencers.",
  mesas_spin: "Resultados financeiros e operacionais das mesas ao vivo por operadora.",
  streamers: "Acompanhe performance, conversão e financeiro do canal de influencers.",
  dash_overview_prestador:
    "Acompanhe escala, presença, absenteísmo e movimentações de turno dos prestadores.",
  ajuda: "Conheça as funcionalidades da plataforma, o glossário de métricas e soluções para problemas comuns.",
  rh_organograma:
    "Conheça a empresa, saiba mais sobre os times e pessoas que fazem a operação acontecer.",
  rh_figurinos: "Controle o inventário de peças com retiradas, devoluções e manutenções.",
  tech_ops_estoque:
    "Controle o estoque de itens, equipamentos e insumos de jogo e o cadastro de fornecedores.",
  galeria_fotos:
    "Faça o Upload das fotos de eventos, publique materiais gerais e vincule imagens individuais aos colaboradores.",
};

export function getPageCanonicalSubtitle(pageKey: PageKey): string {
  return PAGE_CANONICAL_SUBTITLE[pageKey] ?? "";
}
