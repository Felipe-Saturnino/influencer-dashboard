import { supabase } from "./supabase";

/**
 * Busca o investimento apenas de pagamentos com status "pago",
 * alinhado ao que é exibido no Financeiro (valores revisados e efetivamente pagos).
 *
 * @param periodo - { inicio, fim } no formato ISO YYYY-MM-DD
 * @param filtros - influencerIds e/ou operadora_slug opcionais
 * @returns total e mapa por influencer_id (para ranking)
 */
export async function buscarInvestimentoPago(
  periodo: { inicio: string; fim: string },
  filtros?: { influencerIds?: string[]; operadora_slug?: string }
): Promise<{
  total: number;
  porInfluencer: Record<string, number>;
}> {
  const { inicio, fim } = periodo;
  const influencerIds = filtros?.influencerIds;
  const operadoraSlug = filtros?.operadora_slug;

  // Ciclos cujo último dia (data_fim) cai no período — igual ao KPI do Financeiro.
  // Ex: ciclo 26/02–04/03 → data_fim 04/03 → entra em Março.
  const { data: ciclos, error: errCiclos } = await supabase
    .from("ciclos_pagamento")
    .select("id")
    .gte("data_fim", inicio)
    .lte("data_fim", fim);

  if (errCiclos || !ciclos?.length) {
    return { total: 0, porInfluencer: {} };
  }

  const cicloIds = ciclos.map((c: { id: string }) => c.id);

  // Pagamentos de influencers (status = pago)
  let qPag = supabase
    .from("pagamentos")
    .select("influencer_id, total")
    .eq("status", "pago")
    .in("ciclo_id", cicloIds);

  if (influencerIds?.length) qPag = qPag.in("influencer_id", influencerIds);
  if (operadoraSlug && operadoraSlug !== "todas")
    qPag = qPag.eq("operadora_slug", operadoraSlug);

  const { data: pags, error: errPags } = await qPag;

  if (errPags) return { total: 0, porInfluencer: {} };

  // Pagamentos de agentes (status = pago) — inclui no total para bater com o Financeiro
  let qAg = supabase
    .from("pagamentos_agentes")
    .select("total")
    .eq("status", "pago")
    .in("ciclo_id", cicloIds);

  if (operadoraSlug && operadoraSlug !== "todas")
    qAg = qAg.eq("operadora_slug", operadoraSlug);

  const { data: ags, error: errAgs } = await qAg;
  if (errAgs) console.warn("[investimentoPago] pagamentos_agentes:", errAgs.message);

  const porInfluencer: Record<string, number> = {};
  let totalInf = 0;

  for (const p of pags || []) {
    const t = Number(p.total) || 0;
    const id = p.influencer_id as string;
    porInfluencer[id] = (porInfluencer[id] ?? 0) + t;
    totalInf += t;
  }

  const totalAg = (ags || []).reduce((s, a) => s + (Number(a.total) || 0), 0);
  const total = totalInf + totalAg;

  // Agentes não têm influencer_id; o total geral inclui, mas porInfluencer não
  return { total, porInfluencer };
}
