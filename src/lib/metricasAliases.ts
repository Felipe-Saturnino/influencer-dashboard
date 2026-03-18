/**
 * Métricas de utm_aliases como fallback quando influencer_metricas está vazio.
 * Permite que influencers com links mapeados na Gestão de Links apareçam nos
 * dashboards imediatamente, mesmo antes do sync-metricas-cda rodar.
 */
import { supabase } from "./supabase";

export interface MetricaAliasSynthetic {
  influencer_id: string;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  visit_count: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  ggr: number;
  data: string;
}

interface AliasRow {
  influencer_id: string;
  total_visits: number;
  total_registrations: number;
  total_ftds: number;
  total_deposit: number;
  total_withdrawal: number;
  primeiro_visto: string | null;
  ultimo_visto: string | null;
}

/**
 * Busca totais agregados de utm_aliases por influencer (status=mapeado).
 * Útil para exibir números de influencers que só têm tráfego via Gestão de Links.
 *
 * - operadora_slug: filtra por operadora (undefined = todas)
 * - dataInicio/dataFim: só inclui aliases cuja atividade sobrepõe o período
 *   (primeiro_visto <= fim E ultimo_visto >= inicio). Respeita o filtro de período.
 *   Obs: utm_aliases tem totais acumulados; quando sobrepõe, mostramos o total disponível.
 *   IMPORTANTE: Usar APENAS no modo Histórico (all-time). Em vista mensal, NÃO use este
 *   fallback — os totais seriam repetidos em todos os meses. Para dados por mês, o sync
 *   deve preencher influencer_metricas.
 */
export async function buscarMetricasDeAliases(opts?: {
  operadora_slug?: string;
  influencerIds?: string[];
  dataInicio?: string;
  dataFim?: string;
}): Promise<MetricaAliasSynthetic[]> {
  let q = supabase
    .from("utm_aliases")
    .select("influencer_id, total_visits, total_registrations, total_ftds, total_deposit, total_withdrawal, primeiro_visto, ultimo_visto")
    .eq("status", "mapeado")
    .not("influencer_id", "is", null);

  if (opts?.operadora_slug) {
    q = q.or(`operadora_slug.eq.${opts.operadora_slug},operadora_slug.is.null`);
  }
  if (opts?.influencerIds?.length) {
    q = q.in("influencer_id", opts.influencerIds);
  }
  if (opts?.dataInicio && opts?.dataFim) {
    q = q.lte("primeiro_visto", opts.dataFim).or(`ultimo_visto.gte.${opts.dataInicio},ultimo_visto.is.null`);
  }

  const { data } = await q;
  const rows = (data ?? []) as AliasRow[];

  const byInf = new Map<string, { visits: number; regs: number; ftds: number; ftdTotal: number; deposit: number; withdrawal: number; ultimo: string }>();
  for (const r of rows) {
    const cur = byInf.get(r.influencer_id) ?? { visits: 0, regs: 0, ftds: 0, ftdTotal: 0, deposit: 0, withdrawal: 0, ultimo: "" };
    cur.visits += r.total_visits ?? 0;
    cur.regs += r.total_registrations ?? 0;
    cur.ftds += r.total_ftds ?? 0;
    cur.ftdTotal += (r.total_ftds ?? 0) * 0; // utm_aliases não tem ftd_total por alias; usa 0 e deixa sync preencher
    cur.deposit += r.total_deposit ?? 0;
    cur.withdrawal += r.total_withdrawal ?? 0;
    if (r.ultimo_visto && (!cur.ultimo || r.ultimo_visto > cur.ultimo)) cur.ultimo = r.ultimo_visto;
    byInf.set(r.influencer_id, cur);
  }

  const hoje = new Date().toISOString().split("T")[0];
  return Array.from(byInf.entries()).map(([id, agg]) => ({
    influencer_id: id,
    visit_count: agg.visits,
    registration_count: agg.regs,
    ftd_count: agg.ftds,
    ftd_total: agg.ftds > 0 ? agg.deposit : 0, // utm_aliases não tem ftd_total; usa total_deposit como estimativa
    deposit_count: agg.ftds,
    deposit_total: agg.deposit,
    withdrawal_count: 0,
    withdrawal_total: agg.withdrawal,
    ggr: agg.deposit - agg.withdrawal,
    data: agg.ultimo?.split("T")[0] ?? hoje,
  }));
}

/** Tipo mínimo aceito como métrica (influencer_metricas ou sintética) */
export type MetricaLike = { influencer_id: string } & Partial<MetricaAliasSynthetic>;

/**
 * Combina métricas de influencer_metricas com fallback de utm_aliases.
 * Para influencers que têm rows em metricas, usa apenas metricas.
 * Para influencers que têm aliases mapeados mas nenhuma linha em metricas, adiciona linha sintética.
 */
export function mesclarMetricasComAliases<T extends MetricaLike>(
  metricas: T[],
  aliasesSinteticas: MetricaAliasSynthetic[],
  dataFim: string,
  podeVerInfluencer?: (id: string) => boolean
): T[] {
  const idsComMetricas = new Set(metricas.map((m) => m.influencer_id));
  const sinteticas = aliasesSinteticas.filter((a) => {
    if (idsComMetricas.has(a.influencer_id)) return false;
    return !podeVerInfluencer || podeVerInfluencer(a.influencer_id);
  });
  const sinteticasComData = sinteticas.map((s) => ({ ...s, data: dataFim }));
  return [...metricas, ...sinteticasComData] as T[];
}
