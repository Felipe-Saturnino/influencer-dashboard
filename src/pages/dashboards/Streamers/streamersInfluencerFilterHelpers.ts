import {
  getDatasDoMes,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { supabase } from "../../../lib/supabase";

export type PerfilInfluencerMin = { id: string; nome_artistico: string | null };

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
 * IDs com métrica ou live realizada no período (colunas mínimas).
 * Não inclui utm_aliases all-time — evita opção vazia no filtro do mês.
 */
export async function fetchInfluencerIdsComDadosNoPeriodo(params: {
  inicio: string;
  fim: string;
  filtroOperadora: string;
  operadoraSlugsForcado: string[] | null;
  podeVerInfluencer: (id: string) => boolean;
}): Promise<string[]> {
  const { inicio, fim, filtroOperadora, operadoraSlugsForcado, podeVerInfluencer } = params;

  const [metricas, lives] = await Promise.all([
    fetchAllPages<{ influencer_id: string }>(async (from, to) => {
      let q = supabase
        .from("influencer_metricas")
        .select("influencer_id")
        .gte("data", inicio)
        .lte("data", fim)
        .order("influencer_id", { ascending: true })
        .range(from, to);
      if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
      else if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
      return q;
    }),
    fetchAllPages<{ influencer_id: string }>(async (from, to) => {
      let q = supabase
        .from("lives")
        .select("influencer_id")
        .eq("status", "realizada")
        .gte("data", inicio)
        .lte("data", fim)
        .order("influencer_id", { ascending: true })
        .range(from, to);
      if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
      else if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
      return q;
    }),
  ]);

  const ids = new Set<string>();
  for (const m of metricas) {
    if (podeVerInfluencer(m.influencer_id)) ids.add(m.influencer_id);
  }
  for (const l of lives) {
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
