import {
  getDatasDoMes,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../lib/influencerAnalyticsQuery";

export type PerfilInfluencerMin = { id: string; nome_artistico: string | null };

/** Subconjunto de escopo para o filtro de influencer nas abas Streamers. */
export type EscopoInfluencerQuery = {
  vêTodosInfluencers?: boolean;
  semRestricaoEscopo?: boolean;
  influencersVisiveis: string[];
};

/**
 * `null` = sem filtro SQL (admin / gestor / operador).
 * `[]` = escopo sem nenhum influencer (agência vazia) — a query deve devolver vazio.
 * Tratar `semRestricaoEscopo` e `vêTodosInfluencers` como visão global (não só o segundo).
 */
export function streamersInfluencerIdsQuery(
  filtroInfluencer: string,
  escopo: EscopoInfluencerQuery,
): string[] | null {
  if (filtroInfluencer !== "todos") return [filtroInfluencer];
  if (escopo.vêTodosInfluencers === true || escopo.semRestricaoEscopo === true) return null;
  return escopo.influencersVisiveis;
}

/** Erro canónico de carga das abas Streamers (não confundir com vazio). */
export const MSG_ERRO_STREAMERS =
  "Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.";

export function periodoStreamersFiltro(
  historico: boolean,
  mesSelecionado: { ano: number; mes: number } | undefined,
): { inicio: string; fim: string } | null {
  if (historico) return getPeriodoHistoricoCompetencias();
  if (!mesSelecionado) return null;
  return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
}

/**
 * IDs com métrica ou live realizada no período.
 * Reutiliza `fetchInfluencerAnalyticsPeriodoCached` (mesma queryKey das abas) —
 * evita segundo fetchAllPages só-IDs em paralelo com o analytics completo.
 */
export async function fetchInfluencerIdsComDadosNoPeriodo(params: {
  inicio: string;
  fim: string;
  filtroOperadora: string;
  operadoraSlugsForcado: string[] | null;
  podeVerInfluencer: (id: string) => boolean;
}): Promise<string[]> {
  const { inicio, fim, filtroOperadora, operadoraSlugsForcado, podeVerInfluencer } = params;

  const operadoraSlugs = operadoraSlugsForcado?.length
    ? operadoraSlugsForcado
    : filtroOperadora !== "todas"
      ? [filtroOperadora]
      : null;

  const analytics = await fetchInfluencerAnalyticsPeriodoCached({
    inicio,
    fim,
    operadoraSlugs,
    influencerIds: null,
  });

  const ids = new Set<string>();
  for (const m of analytics.metricas) {
    if (podeVerInfluencer(m.influencer_id)) ids.add(m.influencer_id);
  }
  for (const l of analytics.lives) {
    if (podeVerInfluencer(l.influencer_id)) ids.add(l.influencer_id);
  }

  return [...ids];
}

export function buildInfluencerFilterOptions(
  perfis: PerfilInfluencerMin[],
  idsComDados: string[],
  podeVerInfluencer: (id: string) => boolean,
): { id: string; nome: string }[] {
  const idSet = new Set(idsComDados);
  return perfis
    .filter((p) => idSet.has(p.id) && podeVerInfluencer(p.id))
    .map((p) => ({ id: p.id, nome: (p.nome_artistico ?? "").trim() || "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
