/** Agregação de KPIs de mesa (gp_kpi_diario) para Overview Prestador. */

export type GpKpiDiarioRow = {
  dia_brt: string;
  table_id: string;
  game_presenter_id: string;
  mesa_id: string | null;
  estudio_slug: string | null;
  rodadas: number;
  dealing_ms_soma: number;
  dealing_amostras: number;
  reaction_ms_soma: number;
  reaction_amostras: number;
  coop_velocidade: number;
  coop_roda: number;
  nome_mesa?: string | null;
  tipo_jogo?: string | null;
};

export type GpKpiAgregado = {
  rodadas: number;
  dealingMsSoma: number;
  dealingAmostras: number;
  reactionMsSoma: number;
  reactionAmostras: number;
  coopVelocidade: number;
  coopRoda: number;
};

export const GP_KPI_AGREGADO_ZERO: GpKpiAgregado = {
  rodadas: 0,
  dealingMsSoma: 0,
  dealingAmostras: 0,
  reactionMsSoma: 0,
  reactionAmostras: 0,
  coopVelocidade: 0,
  coopRoda: 0,
};

export function agregarGpKpiRows(rows: GpKpiDiarioRow[]): GpKpiAgregado {
  const out: GpKpiAgregado = { ...GP_KPI_AGREGADO_ZERO };
  for (const r of rows) {
    out.rodadas += Number(r.rodadas) || 0;
    out.dealingMsSoma += Number(r.dealing_ms_soma) || 0;
    out.dealingAmostras += Number(r.dealing_amostras) || 0;
    out.reactionMsSoma += Number(r.reaction_ms_soma) || 0;
    out.reactionAmostras += Number(r.reaction_amostras) || 0;
    out.coopVelocidade += Number(r.coop_velocidade) || 0;
    out.coopRoda += Number(r.coop_roda) || 0;
  }
  return out;
}

/** Média em segundos; null quando não há amostras (exibir "—"). */
export function mediaSegundos(somaMs: number, amostras: number): number | null {
  if (amostras <= 0) return null;
  return somaMs / amostras / 1000;
}

export function fmtMediaSegundos(seg: number | null): string {
  if (seg == null || !Number.isFinite(seg)) return "—";
  return `${seg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}

/** Percentual de cooperação; null se sem rodadas. */
export function pctCoop(ok: number, rodadas: number): number | null {
  if (rodadas <= 0) return null;
  return (ok / rodadas) * 100;
}

export function fmtPctCoop(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export type GpKpiDiaLinha = {
  dia_brt: string;
  rodadas: number;
  dealingSeg: number | null;
  reactionSeg: number | null;
  coopVelPct: number | null;
  coopRodaPct: number | null;
};

export function agruparGpKpiPorDia(rows: GpKpiDiarioRow[]): GpKpiDiaLinha[] {
  const map = new Map<string, GpKpiDiarioRow[]>();
  for (const r of rows) {
    const d = String(r.dia_brt ?? "").slice(0, 10);
    if (!d) continue;
    const list = map.get(d) ?? [];
    list.push(r);
    map.set(d, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dia, list]) => {
      const agg = agregarGpKpiRows(list);
      return {
        dia_brt: dia,
        rodadas: agg.rodadas,
        dealingSeg: mediaSegundos(agg.dealingMsSoma, agg.dealingAmostras),
        reactionSeg: mediaSegundos(agg.reactionMsSoma, agg.reactionAmostras),
        coopVelPct: pctCoop(agg.coopVelocidade, agg.rodadas),
        coopRodaPct: pctCoop(agg.coopRoda, agg.rodadas),
      };
    });
}

export type GpKpiMesaLinha = {
  table_id: string;
  nome_mesa: string;
  tipo_jogo: string;
  estudio_slug: string | null;
  rodadas: number;
  dealingSeg: number | null;
  reactionSeg: number | null;
  coopVelPct: number | null;
  coopRodaPct: number | null;
};

export function agruparGpKpiPorMesa(rows: GpKpiDiarioRow[]): GpKpiMesaLinha[] {
  const map = new Map<string, GpKpiDiarioRow[]>();
  for (const r of rows) {
    const id = String(r.table_id ?? "").trim();
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(r);
    map.set(id, list);
  }
  return [...map.entries()]
    .map(([tableId, list]) => {
      const agg = agregarGpKpiRows(list);
      const sample = list[0]!;
      return {
        table_id: tableId,
        nome_mesa: (sample.nome_mesa ?? "").trim() || tableId,
        tipo_jogo: (sample.tipo_jogo ?? "").trim() || "—",
        estudio_slug: sample.estudio_slug,
        rodadas: agg.rodadas,
        dealingSeg: mediaSegundos(agg.dealingMsSoma, agg.dealingAmostras),
        reactionSeg: mediaSegundos(agg.reactionMsSoma, agg.reactionAmostras),
        coopVelPct: pctCoop(agg.coopVelocidade, agg.rodadas),
        coopRodaPct: pctCoop(agg.coopRoda, agg.rodadas),
      };
    })
    .sort((a, b) => b.rodadas - a.rodadas || a.nome_mesa.localeCompare(b.nome_mesa, "pt-BR"));
}
