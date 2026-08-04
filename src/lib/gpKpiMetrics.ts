/** Agregação de KPIs de mesa (gp_kpi_diario) para Overview Prestador. */

import {
  GAME_IDENTITY_LABEL,
  type GameIdentityKey,
} from "./gameIdentityColors";

/** Ordem de produto na aba KPIs de Mesa (drilldown e Por Jogo). */
export const GP_KPI_JOGOS_ORDEM: GameIdentityKey[] = [
  "blackjack",
  "baccarat",
  "futebol_brasileiro",
  "roleta",
];

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

/** Normaliza `mesas_spin_cadastro.tipo_jogo` → identidade canónica (ou null se fora do escopo). */
export function normalizarTipoJogoGpKpi(tipo: string | null | undefined): GameIdentityKey | null {
  const t = String(tipo ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!t) return null;
  if (t.includes("blackjack") || t === "bj") return "blackjack";
  if (t.includes("baccarat")) return "baccarat";
  if (t.includes("futebol") || t.includes("football") || t.includes("soccer")) return "futebol_brasileiro";
  if (t.includes("roleta") || t.includes("roulette")) return "roleta";
  return null;
}

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

export type GpKpiJogoLinha = {
  jogoKey: GameIdentityKey;
  jogoLabel: string;
  rodadas: number;
  dealingSeg: number | null;
  reactionSeg: number | null;
  coopVelPct: number | null;
  coopRodaPct: number | null;
};

function linhaMetricasDeAgg(agg: GpKpiAgregado) {
  return {
    rodadas: agg.rodadas,
    dealingSeg: mediaSegundos(agg.dealingMsSoma, agg.dealingAmostras),
    reactionSeg: mediaSegundos(agg.reactionMsSoma, agg.reactionAmostras),
    coopVelPct: pctCoop(agg.coopVelocidade, agg.rodadas),
    coopRodaPct: pctCoop(agg.coopRoda, agg.rodadas),
  };
}

/** Agrega todas as mesas do período por tipo de jogo (Blackjack, Baccarat, FB, Roleta). */
export function agruparGpKpiPorJogo(rows: GpKpiDiarioRow[]): GpKpiJogoLinha[] {
  const map = new Map<GameIdentityKey, GpKpiDiarioRow[]>();
  for (const r of rows) {
    const key = normalizarTipoJogoGpKpi(r.tipo_jogo);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return GP_KPI_JOGOS_ORDEM.filter((k) => map.has(k)).map((key) => {
    const list = map.get(key)!;
    const agg = agregarGpKpiRows(list);
    return {
      jogoKey: key,
      jogoLabel: GAME_IDENTITY_LABEL[key],
      ...linhaMetricasDeAgg(agg),
    };
  });
}

export type GpKpiDiaLinha = {
  dia_brt: string;
  rodadas: number;
  dealingSeg: number | null;
  reactionSeg: number | null;
  coopVelPct: number | null;
  coopRodaPct: number | null;
  /** Breakdown por jogo no dia (mesmas métricas; sem separar mesa). */
  porJogo: GpKpiJogoLinha[];
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
        ...linhaMetricasDeAgg(agg),
        porJogo: agruparGpKpiPorJogo(list),
      };
    });
}
