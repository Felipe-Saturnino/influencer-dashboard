import {
  getDatasDoMes,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { supabase } from "../../../lib/supabase";

export type PerfilInfluencerMin = { id: string; nome_artistico: string | null };

export function periodoStreamersFiltro(
  historico: boolean,
  mesSelecionado: { ano: number; mes: number } | undefined,
): { inicio: string; fim: string } | null {
  if (historico) return getPeriodoHistoricoCompetencias();
  if (!mesSelecionado) return null;
  return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
}

export async function fetchInfluencerIdsComDadosNoPeriodo(params: {
  inicio: string;
  fim: string;
  filtroOperadora: string;
  operadoraSlugsForcado: string[] | null;
  podeVerInfluencer: (id: string) => boolean;
}): Promise<string[]> {
  const { inicio, fim, filtroOperadora, operadoraSlugsForcado, podeVerInfluencer } = params;

  const metricas = await fetchAllPages<{ influencer_id: string }>(async (from, to) => {
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
  });

  const lives = await fetchAllPages<{ influencer_id: string }>(async (from, to) => {
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
  });

  const ids = new Set<string>();
  for (const m of metricas) {
    if (podeVerInfluencer(m.influencer_id)) ids.add(m.influencer_id);
  }
  for (const l of lives) {
    if (podeVerInfluencer(l.influencer_id)) ids.add(l.influencer_id);
  }

  const aliases = await fetchAllPages<{ influencer_id: string }>(async (from, to) =>
    supabase
      .from("utm_aliases")
      .select("influencer_id")
      .eq("status", "mapeado")
      .not("influencer_id", "is", null)
      .order("influencer_id", { ascending: true })
      .range(from, to),
  );
  for (const a of aliases) {
    if (podeVerInfluencer(a.influencer_id)) ids.add(a.influencer_id);
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
