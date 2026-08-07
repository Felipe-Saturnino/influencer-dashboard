import { labelPrestadorIncidente, labelTipoJogoIncidente } from "./estudioIncidentesHelpers";
import type { SmSinalRow } from "./smSinaisTypes";

/** Relógio de parede America/Sao_Paulo (`*_at_brt` — timestamp sem fuso). */
export function formatTimestampBrtWall(ts: string | null | undefined): string {
  if (!ts) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/.exec(ts.trim());
  if (!m) return "—";
  const sec = m[6] ?? "00";
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${sec}`;
}

/** Instantes UTC (`*_at` timestamptz) para o modal Ver. */
export function formatTimestampUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const s = d.toLocaleString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${s} UTC`;
}

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

export function labelSmSinal(row: SmSinalRow): string {
  return (row.signal_type ?? "").trim() || "—";
}

export function labelJogoSinal(row: SmSinalRow): string {
  const fromMesa = row.mesa?.tipo_jogo?.trim();
  const raw = fromMesa || (row.game_type ?? "").trim();
  if (!raw) return "—";
  return labelTipoJogoIncidente(raw);
}

export function labelEstudioSinal(row: SmSinalRow): string {
  const nome = (row.estudio?.nome ?? "").trim();
  if (nome) return nome;
  return (row.estudio_slug ?? "").trim() || "—";
}

export function labelMesaSinal(row: SmSinalRow): string {
  const numero = (row.mesa?.numero_mesa ?? "").trim();
  const nome = (row.mesa?.nome_mesa ?? "").trim();
  if (numero || nome) {
    const n = numero ? numero.padStart(2, "0") : "—";
    return `${n} — ${nome || "—"}`;
  }
  return (row.table_id ?? "").trim() || "—";
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

/** Valor numérico para MoM no KpiCard (segundos; 0 se sem amostra). */
export function kpiMsParaComparativo(ms: number | null): number {
  if (ms == null || !Number.isFinite(ms)) return 0;
  return ms / 1000;
}
