import { supabase } from "../../../lib/supabase";
import { fetchLiveResultadosBatched } from "../../../lib/supabasePaginate";
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
    resultados = (await fetchLiveResultadosBatched(liveIds, async (chunk) =>
      supabase
        .from("live_resultados")
        .select("live_id, duracao_horas, duracao_min")
        .in("live_id", chunk),
    )) as ResultadoRow[];
  }

  const resByLive = new Map(resultados.map((r) => [String(r.live_id), r]));
  const horasPorPar: Record<string, number> = {};
  const key = (inf: string, op: string) => `${inf}::${op}`;
  for (const live of livesOk) {
    const res = resByLive.get(String(live.id));
    if (!res) continue;
    const opSlug = live.operadora_slug?.trim() || OPERADORA_PADRAO;
    const k = key(live.influencer_id, opSlug);
    const horas = (res.duracao_horas ?? 0) + (res.duracao_min ?? 0) / 60;
    horasPorPar[k] = (horasPorPar[k] ?? 0) + horas;
  }

  const pares = Object.entries(horasPorPar);
  if (pares.length === 0) return;

  const influencerIds = [...new Set(pares.map(([parKey]) => parKey.split("::")[0]!))];
  const { data: perfis } = await supabase
    .from("influencer_perfil")
    .select("id, cache_hora")
    .in("id", influencerIds);
  const cachePorId = new Map(
    (perfis ?? []).map((p) => [
      (p as { id: string }).id,
      Number((p as { cache_hora?: number | null }).cache_hora) || 0,
    ]),
  );

  const upserts = pares.map(([parKey, horas]) => {
    const [influencer_id, operadora_slug] = parKey.split("::");
    const cache_hora = cachePorId.get(influencer_id!) ?? 0;
    const total = Math.round(horas * cache_hora * 100) / 100;
    return {
      ciclo_id: c.id,
      influencer_id: influencer_id!,
      operadora_slug: operadora_slug!,
      horas_realizadas: Math.round(horas * 100) / 100,
      cache_hora,
      total,
      status: "em_analise" as const,
    };
  });

  const { error } = await supabase
    .from("pagamentos")
    .upsert(upserts, { onConflict: "ciclo_id,influencer_id,operadora_slug" });
  if (error) {
    console.error("[financeiroFecharCiclo] upsert pagamentos:", error);
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
  const pendentes = ciclos
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => cicloExpiradoNaoFechado(c));
  if (pendentes.length === 0) return ciclos;

  const fechadoEm = new Date().toISOString();
  const atualizados = [...ciclos];
  let alterou = false;

  // Poucos ciclos expirados por boot — paralelo controlado (máx. 3).
  const CONCORRENCIA = 3;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA) {
    const grupo = pendentes.slice(i, i + CONCORRENCIA);
    const resultados = await Promise.all(
      grupo.map(({ c }) => fecharCicloExpiradoSeNecessario(c)),
    );
    resultados.forEach((ok, j) => {
      if (!ok) return;
      alterou = true;
      const idx = grupo[j]!.i;
      atualizados[idx] = { ...atualizados[idx]!, fechado_em: fechadoEm };
    });
  }

  return alterou
    ? atualizados.sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""))
    : ciclos;
}
