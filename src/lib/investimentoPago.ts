import { supabase } from "./supabase";

/**
 * Busca o investimento apenas de pagamentos com status "pago",
 * alinhado ao que é exibido no Financeiro (valores revisados e efetivamente pagos).
 * Usa RPC no servidor para incluir corretamente pagamentos_agentes.
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
  const operadoraSlug = filtros?.operadora_slug && filtros.operadora_slug !== "todas"
    ? filtros.operadora_slug
    : null;

  const { data, error } = await supabase.rpc("get_investimento_pago", {
    p_inicio: inicio,
    p_fim: fim,
    p_operadora_slug: operadoraSlug,
    p_influencer_ids: influencerIds?.length ? influencerIds : null,
  });

  if (!error && data && typeof data === "object") {
    const total = Number((data as { total?: number }).total) || 0;
    const pi = (data as { por_influencer?: Record<string, number> }).por_influencer;
    const porInfluencer: Record<string, number> = {};
    if (pi && typeof pi === "object") {
      for (const [k, v] of Object.entries(pi)) {
        porInfluencer[k] = Number(v) || 0;
      }
    }
    return { total, porInfluencer };
  }

  if (error) console.warn("[investimentoPago] RPC get_investimento_pago:", error.message);

  // Fallback: consulta client-side (pode ter divergência com agentes se RPC não estiver aplicado)
  const { data: ciclos, error: errCiclos } = await supabase
    .from("ciclos_pagamento")
    .select("id")
    .gte("data_fim", inicio)
    .lte("data_fim", fim);

  if (errCiclos || !ciclos?.length) {
    return { total: 0, porInfluencer: {} };
  }

  const cicloIds = ciclos.map((c: { id: string }) => c.id);

  let qPag = supabase
    .from("pagamentos")
    .select("influencer_id, total")
    .eq("status", "pago")
    .in("ciclo_id", cicloIds);
  if (influencerIds?.length) qPag = qPag.in("influencer_id", influencerIds);
  if (operadoraSlug) qPag = qPag.eq("operadora_slug", operadoraSlug);

  const { data: pags, error: errPags } = await qPag;
  if (errPags) return { total: 0, porInfluencer: {} };

  let qAg = supabase
    .from("pagamentos_agentes")
    .select("total")
    .eq("status", "pago")
    .in("ciclo_id", cicloIds);
  if (operadoraSlug) qAg = qAg.eq("operadora_slug", operadoraSlug);

  const { data: ags } = await qAg;

  const porInfluencer: Record<string, number> = {};
  let totalInf = 0;
  for (const p of pags || []) {
    const t = Number(p.total) || 0;
    const id = p.influencer_id as string;
    porInfluencer[id] = (porInfluencer[id] ?? 0) + t;
    totalInf += t;
  }
  const totalAg = (ags || []).reduce((s, a) => s + (Number(a.total) || 0), 0);
  return { total: totalInf + totalAg, porInfluencer };
}
