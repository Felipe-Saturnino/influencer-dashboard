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

export type EscopoOperadoraQuery = {
  semRestricaoEscopo?: boolean;
  operadorasVisiveis: string[];
};

function visaoGlobalInfluencers(escopo: EscopoInfluencerQuery): boolean {
  return escopo.vêTodosInfluencers === true || escopo.semRestricaoEscopo === true;
}

/**
 * Agregador **Todos Influencers** = universo do **catálogo** (`role = influencer`) ∩ escopo.
 * Nunca `null` (plataforma / afiliados na mesma `influencer_metricas`).
 * `[]` = escopo ou catálogo vazio — a query deve devolver vazio.
 * ID fora do escopo ou do catálogo → `[]`.
 */
export function streamersInfluencerIdsQuery(
  filtroInfluencer: string,
  escopo: EscopoInfluencerQuery,
  catalogInfluencerIds: readonly string[],
): string[] {
  const catalog = new Set(catalogInfluencerIds);
  const global = visaoGlobalInfluencers(escopo);
  if (filtroInfluencer !== "todos") {
    const noEscopo = global || escopo.influencersVisiveis.includes(filtroInfluencer);
    if (!noEscopo || !catalog.has(filtroInfluencer)) return [];
    return [filtroInfluencer];
  }
  if (global) return [...catalog];
  return escopo.influencersVisiveis.filter((id) => catalog.has(id));
}

/**
 * Agregador **Todas Operadoras** = casas do escopo, nunca todas as parceiras da plataforma.
 * `null` = visão global (admin / gestor). Operador usa `operadoraSlugsForcado`.
 * Slug fora do escopo → `[]`.
 */
export function streamersOperadoraSlugsQuery(
  filtroOperadora: string,
  escopo: EscopoOperadoraQuery,
  operadoraSlugsForcado: string[] | null,
): string[] | null {
  if (operadoraSlugsForcado?.length) {
    if (filtroOperadora !== "todas" && operadoraSlugsForcado.includes(filtroOperadora)) {
      return [filtroOperadora];
    }
    return [...operadoraSlugsForcado];
  }
  if (filtroOperadora !== "todas") {
    if (escopo.semRestricaoEscopo === true || escopo.operadorasVisiveis.includes(filtroOperadora)) {
      return [filtroOperadora];
    }
    return [];
  }
  if (escopo.semRestricaoEscopo === true) return null;
  return escopo.operadorasVisiveis;
}

/**
 * Ver **próprios**: nunca ampliar para `null` (plataforma). Lista vazia continua vazia.
 * Influencer sem casas no `user_scopes` e com IDs próprios: não filtra operadora no SQL
 * (o recorte de influencer já isola o cadastro).
 */
export function travarRecortePropriosStreamers(
  recorte: { influencerIds: string[] | null; operadoraSlugs: string[] | null },
  escopo: EscopoInfluencerQuery & EscopoOperadoraQuery,
): { influencerIds: string[]; operadoraSlugs: string[] | null } {
  const infPermitidos = new Set(escopo.influencersVisiveis);
  const influencerIds = recorte.influencerIds
    ? recorte.influencerIds.filter((id) => infPermitidos.has(id))
    : [...escopo.influencersVisiveis];

  const opPermitidos = new Set(escopo.operadorasVisiveis);
  let operadoraSlugs = recorte.operadoraSlugs;
  if (!operadoraSlugs) {
    operadoraSlugs = escopo.operadorasVisiveis.length > 0 ? escopo.operadorasVisiveis : influencerIds.length > 0 ? null : [];
  } else if (escopo.operadorasVisiveis.length > 0) {
    operadoraSlugs = operadoraSlugs.filter((slug) => opPermitidos.has(slug));
  }

  return { influencerIds, operadoraSlugs };
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
  influencerIds: string[];
}): Promise<string[]> {
  const { inicio, fim, filtroOperadora, operadoraSlugsForcado, podeVerInfluencer, influencerIds } = params;

  const operadoraSlugs = operadoraSlugsForcado?.length
    ? operadoraSlugsForcado
    : filtroOperadora !== "todas"
      ? [filtroOperadora]
      : null;

  const analytics = await fetchInfluencerAnalyticsPeriodoCached({
    inicio,
    fim,
    operadoraSlugs,
    influencerIds,
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
