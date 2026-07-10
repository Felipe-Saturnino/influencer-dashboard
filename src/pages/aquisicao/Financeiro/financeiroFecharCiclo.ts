import { supabase } from "../../../lib/supabase";
import type { CicloPagamento } from "../../../types";
import { cicloAberto } from "./financeiroCiclos";

const OPERADORA_PADRAO = "casa_apostas";

type LiveRow = { id: string; influencer_id: string; operadora_slug: string | null };
type ResultadoRow = { live_id: string; duracao_horas: number | null; duracao_min: number | null };

/** Ciclo passou da data_fim mas ainda não recebeu `fechado_em`. */
export function cicloExpiradoNaoFechado(ciclo: CicloPagamento): boolean {
  return !ciclo.fechado_em && !cicloAberto(ciclo);
}

/** Gera pagamentos de todo o ciclo (sem filtro de escopo — operação global ao encerrar). */
export async function gerarPagamentosDoCicloCompleto(c: CicloPagamento): Promise<void> {
  const { data: lives } = await supabase
    .from("lives")
    .select("id, influencer_id, operadora_slug")
    .eq("status", "realizada")
    .gte("data", c.data_inicio)
    .lte("data", c.data_fim);

  const livesOk = (lives ?? []) as LiveRow[];
  const liveIds = livesOk.map((l) => l.id);
  let resultados: ResultadoRow[] = [];
  if (liveIds.length > 0) {
    const { data: resData } = await supabase
      .from("live_resultados")
      .select("live_id, duracao_horas, duracao_min")
      .in("live_id", liveIds);
    resultados = (resData ?? []) as ResultadoRow[];
  }

  const horasPorPar: Record<string, number> = {};
  const key = (inf: string, op: string) => `${inf}::${op}`;
  for (const live of livesOk) {
    const res = resultados.find((r) => String(r.live_id) === String(live.id));
    if (!res) continue;
    const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
    const k = key(live.influencer_id, opSlug);
    const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
    horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
  }

  for (const [parKey, horas] of Object.entries(horasPorPar)) {
    const [influencer_id, operadora_slug] = parKey.split("::");
    const { data: perfil } = await supabase
      .from("influencer_perfil")
      .select("cache_hora")
      .eq("id", influencer_id)
      .single();
    const cache_hora = perfil?.cache_hora ?? 0;
    const total = Math.round(horas * cache_hora * 100) / 100;
    await supabase.from("pagamentos").upsert(
      {
        ciclo_id: c.id,
        influencer_id,
        operadora_slug,
        horas_realizadas: Math.round(horas * 100) / 100,
        cache_hora,
        total,
        status: "em_analise",
      },
      { onConflict: "ciclo_id,influencer_id,operadora_slug" },
    );
  }
}

/** Encerra ciclo expirado: gera pagamentos globais e grava `fechado_em`. */
export async function fecharCicloExpiradoSeNecessario(c: CicloPagamento): Promise<boolean> {
  if (!cicloExpiradoNaoFechado(c)) return false;
  await gerarPagamentosDoCicloCompleto(c);
  const { error } = await supabase
    .from("ciclos_pagamento")
    .update({ fechado_em: new Date().toISOString() })
    .eq("id", c.id);
  if (error) {
    console.error("Erro ao fechar ciclo expirado:", error);
    return false;
  }
  return true;
}

/** Fecha todos os ciclos expirados pendentes (qualquer usuário com acesso ao Financeiro). */
export async function fecharCiclosExpiradosPendentes(ciclos: CicloPagamento[]): Promise<CicloPagamento[]> {
  const fechadoEm = new Date().toISOString();
  let alterou = false;
  const atualizados = [...ciclos];

  for (let i = 0; i < ciclos.length; i++) {
    const c = ciclos[i];
    if (!cicloExpiradoNaoFechado(c)) continue;
    const ok = await fecharCicloExpiradoSeNecessario(c);
    if (ok) {
      alterou = true;
      atualizados[i] = { ...c, fechado_em: fechadoEm };
    }
  }

  return alterou ? atualizados.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || "")) : ciclos;
}
