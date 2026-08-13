import { labelPrestadorIncidente } from "./estudioIncidentesHelpers";
import type { SmSinalResumoRow, SmSinalRow } from "./smSinaisTypes";

export function msEntre(inicioIso: string | null | undefined, fimIso: string | null | undefined): number | null {
  if (!inicioIso || !fimIso) return null;
  const a = new Date(inicioIso).getTime();
  const b = new Date(fimIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return b - a;
}

/** Duração em ms → `HH:MM:SS` (ou `MM:SS` se menor que 1 h). */
export function fmtDuracaoMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function tmaAtendimentoMs(row: SmSinalRow): number | null {
  return msEntre(row.issued_at, row.taken_at);
}

export function tmaResolucaoMs(row: SmSinalRow): number | null {
  return msEntre(row.taken_at, row.timer_stopped_at);
}

export function tmaTotalMs(row: SmSinalRow): number | null {
  return msEntre(row.issued_at, row.timer_stopped_at);
}

export function mediaMs(valores: Array<number | null>): number | null {
  let sum = 0;
  let n = 0;
  for (const v of valores) {
    if (v == null || !Number.isFinite(v) || v < 0) continue;
    sum += v;
    n += 1;
  }
  if (n === 0) return null;
  return sum / n;
}

/** SM que atendeu (resolver). */
export function labelSmAtendente(row: SmSinalRow): string {
  const emb = row.resolver;
  if (emb?.nome?.trim()) {
    return labelPrestadorIncidente(emb.nome, emb.staff_nickname);
  }
  const screen = (row.resolver_screen_name ?? "").trim();
  if (screen) return screen;
  return (row.resolver_id ?? "").trim() || "—";
}

/** GP / criador do sinal (relator). */
export function labelRelatorSinal(row: SmSinalRow): string {
  const emb = row.creator;
  if (emb?.nome?.trim()) {
    return labelPrestadorIncidente(emb.nome, emb.staff_nickname);
  }
  const screen = (row.creator_screen_name ?? "").trim();
  if (screen) return screen;
  const cid = (row.creator_id ?? "").trim();
  return cid || "—";
}

export type SmSinalKpis = {
  total: number;
  /** Média em ms; null se sem amostra. */
  tmaTotalMs: number | null;
  tmaAtendimentoMs: number | null;
  tmaResolucaoMs: number | null;
};

export function calcularKpisSinais(rows: SmSinalRow[]): SmSinalKpis {
  return {
    total: rows.length,
    tmaTotalMs: mediaMs(rows.map(tmaTotalMs)),
    tmaAtendimentoMs: mediaMs(rows.map(tmaAtendimentoMs)),
    tmaResolucaoMs: mediaMs(rows.map(tmaResolucaoMs)),
  };
}

/** Agregação diária (`dia_brt`) para o bloco Detalhamento Diário. */
export type SmSinalDiaAgg = {
  diaBrt: string;
  sinais: number;
  tmaTotalMs: number | null;
  tmaAtendimentoMs: number | null;
  tmaResolucaoMs: number | null;
};

export function agregarSinaisPorDia(rows: SmSinalRow[]): SmSinalDiaAgg[] {
  const byDia = new Map<string, SmSinalRow[]>();
  for (const r of rows) {
    const dia = (r.dia_brt ?? "").slice(0, 10);
    if (!dia) continue;
    const list = byDia.get(dia);
    if (list) list.push(r);
    else byDia.set(dia, [r]);
  }
  const out: SmSinalDiaAgg[] = [];
  for (const [diaBrt, list] of byDia) {
    out.push({
      diaBrt,
      sinais: list.length,
      tmaTotalMs: mediaMs(list.map(tmaTotalMs)),
      tmaAtendimentoMs: mediaMs(list.map(tmaAtendimentoMs)),
      tmaResolucaoMs: mediaMs(list.map(tmaResolucaoMs)),
    });
  }
  return out;
}

/** Valor numérico para MoM no KpiCard (segundos; 0 se sem amostra). */
export function kpiMsParaComparativo(ms: number | null): number {
  if (ms == null || !Number.isFinite(ms)) return 0;
  return ms / 1000;
}

export function mediaPonderadaMs(sumMs: number, n: number): number | null {
  if (!Number.isFinite(sumMs) || !Number.isFinite(n) || n <= 0) return null;
  return sumMs / n;
}

/** KPIs a partir do resumo diário (médias ponderadas pelas amostras). */
export function calcularKpisResumo(rows: SmSinalResumoRow[]): SmSinalKpis {
  let total = 0;
  let sumTotal = 0;
  let nTotal = 0;
  let sumAtend = 0;
  let nAtend = 0;
  let sumRes = 0;
  let nRes = 0;
  for (const r of rows) {
    total += r.sinais_qtd;
    sumTotal += r.tma_total_sum_ms;
    nTotal += r.tma_total_n;
    sumAtend += r.tma_atend_sum_ms;
    nAtend += r.tma_atend_n;
    sumRes += r.tma_res_sum_ms;
    nRes += r.tma_res_n;
  }
  return {
    total,
    tmaTotalMs: mediaPonderadaMs(sumTotal, nTotal),
    tmaAtendimentoMs: mediaPonderadaMs(sumAtend, nAtend),
    tmaResolucaoMs: mediaPonderadaMs(sumRes, nRes),
  };
}

export function agregarResumoPorDia(rows: SmSinalResumoRow[]): SmSinalDiaAgg[] {
  const byDia = new Map<string, SmSinalResumoRow[]>();
  for (const r of rows) {
    const dia = (r.dia_brt ?? "").slice(0, 10);
    if (!dia) continue;
    const list = byDia.get(dia);
    if (list) list.push(r);
    else byDia.set(dia, [r]);
  }
  const out: SmSinalDiaAgg[] = [];
  for (const [diaBrt, list] of byDia) {
    const k = calcularKpisResumo(list);
    out.push({
      diaBrt,
      sinais: k.total,
      tmaTotalMs: k.tmaTotalMs,
      tmaAtendimentoMs: k.tmaAtendimentoMs,
      tmaResolucaoMs: k.tmaResolucaoMs,
    });
  }
  return out;
}

export function chaveRelatorResumo(row: SmSinalResumoRow): string {
  const fid = (row.creator_funcionario_id ?? "").trim();
  if (fid) return fid;
  const nome = (row.creator_screen_name ?? "").trim();
  return nome ? `nome:${nome}` : "";
}

export function labelRelatorResumo(row: SmSinalResumoRow): string {
  const screen = (row.creator_screen_name ?? "").trim();
  if (screen) return screen;
  const cid = (row.creator_id ?? "").trim();
  return cid || "—";
}
