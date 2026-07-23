/**
 * Helpers partilhados entre Calendário RH e Overview Prestador (escala / presença).
 */
import { fmtHorasTotal } from "./dashboardHelpers";
import { ehFeriadoSaoPauloCapital } from "./feriadosSaoPauloCapital";
import {
  normalizarEscalaCadastro,
  siglaGradeParaNomeTurno,
  turnoStaffEhComercial5x2,
} from "./rhEscalaTurnos";
import {
  adicionarMinutosAoRelogioHHMM,
  escalaComHorarioTurnoEditavelNaStaff,
  escalaComHorarioTurnoSomenteOperadora,
  formatarHoraInicioOperadora,
  staffHorarioResolvidoParaTurnoDoDia,
} from "./rhStaffHorarioTurno";
import type { RhFuncionario } from "../types/rhFuncionario";
import type { TurnosDealersPick } from "./turnosDealers";

/** `area_key` das células sintéticas de horário comercial (Estúdio 5×2 / Comercial). */
export const AREA_KEY_HORARIO_COMERCIAL_SINTETICO = "horario_comercial";

type PrestadorHorarioComercialPick = Pick<RhFuncionario, "id" | "area_atuacao" | "staff_turno" | "escala">;

export type RpcGradeCalendarioRow = {
  funcionario_id: string;
  dia_iso: string;
  valor: string;
  area_key: string;
};

export type RpcPontoMesRow = {
  dia_sp: string;
  check_in_at: string | null;
  check_out_at: string | null;
};

export type OpTurnosHorarioPick = TurnosDealersPick;

export function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function refMesPrimeiroDiaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function diaIsoChaveGrade(row: RpcGradeCalendarioRow): string {
  const raw = row.dia_iso as string | Date | undefined;
  if (raw == null) return "";
  if (typeof raw === "string") return raw.slice(0, 10);
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw).slice(0, 10);
  }
}

export function turnoExibicaoDeValorCelulaEscala(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  const vl = v.toLowerCase();
  if (v === "Folga" || vl === "folga" || v === "F" || vl === "f") return null;
  if (v === "Comercial") return "Comercial";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  const nome = siglaGradeParaNomeTurno(v);
  return nome || null;
}

export function situacaoGestaoEscalaParaDia(valorCelulaRaw: string | null | undefined): string {
  const v = (valorCelulaRaw ?? "").trim();
  if (!v) return "—";
  const vl = v.toLowerCase();
  if (v === "Folga" || vl === "folga" || v === "F" || vl === "f") return "Folga";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  return "Escalado";
}

export function turnoCalendarioEhCompraVendaTroca(turnoNome: string): boolean {
  return turnoNome === "Compra" || turnoNome === "Venda" || turnoNome === "Troca";
}

/**
 * Escritório **ou** Estúdio com turno/escala Comercial (5×2).
 * Mesma regra de Situação no Calendário (sintético no cliente).
 */
export function prestadorUsaHorarioComercialSintetico(
  p: Pick<RhFuncionario, "area_atuacao" | "staff_turno" | "escala"> | null | undefined,
): boolean {
  if (!p) return false;
  if (p.area_atuacao === "escritorio") return true;
  if (turnoStaffEhComercial5x2(p.staff_turno)) return true;
  return normalizarEscalaCadastro(p.escala ?? "") === "5x2";
}

/**
 * Escala sintética de horário comercial (Escritório e Estúdio Comercial/5×2):
 * seg–sex = Comercial; sáb/dom + feriados nacionais e de SP capital = Folga.
 * Fonte de verdade no cliente — a RPC não deve gerar N×31 linhas (limite PostgREST ~1000).
 */
export function valorCelulaHorarioComercialSintetico(diaIso: string): "Comercial" | "Folga" {
  const iso = diaIso.slice(0, 10);
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return "Folga";
  if (ehFeriadoSaoPauloCapital(iso)) return "Folga";
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=dom … 6=sáb
  return dow === 0 || dow === 6 ? "Folga" : "Comercial";
}

/** @deprecated Use `valorCelulaHorarioComercialSintetico` (inclui feriados). */
export function valorCelulaEscritorioSintetico(diaIso: string): "Comercial" | "Folga" {
  return valorCelulaHorarioComercialSintetico(diaIso);
}

function areaKeySinteticaHorarioComercial(
  p: Pick<RhFuncionario, "area_atuacao">,
): string {
  return p.area_atuacao === "escritorio" ? "escritorio" : AREA_KEY_HORARIO_COMERCIAL_SINTETICO;
}

/**
 * Remove linhas sintéticas/legado `escritorio` da RPC e regenera mês completo no cliente
 * para Escritório + Estúdio Comercial (5×2). Preserva Compra/Venda/Troca da grade aprovada.
 */
export function mesclarGradeComHorarioComercialSintetico(
  rows: RpcGradeCalendarioRow[],
  prestadores: PrestadorHorarioComercialPick[],
  refsMesIso: string[],
): RpcGradeCalendarioRow[] {
  const sinteticoPorId = new Map<string, PrestadorHorarioComercialPick>();
  for (const p of prestadores) {
    if (prestadorUsaHorarioComercialSintetico(p)) sinteticoPorId.set(p.id, p);
  }

  const movimentosPorChave = new Map<string, string>();
  const baseSemSintetico: RpcGradeCalendarioRow[] = [];
  for (const r of rows) {
    const ak = (r.area_key ?? "").trim().toLowerCase();
    if (ak === "escritorio" || ak === AREA_KEY_HORARIO_COMERCIAL_SINTETICO) continue;
    if (sinteticoPorId.has(r.funcionario_id)) {
      const v = (r.valor ?? "").trim();
      if (v === "Compra" || v === "Venda" || v === "Troca") {
        movimentosPorChave.set(`${r.funcionario_id}|${diaIsoChaveGrade(r)}`, v);
      }
      continue;
    }
    baseSemSintetico.push(r);
  }

  if (sinteticoPorId.size === 0) return baseSemSintetico;

  const extra: RpcGradeCalendarioRow[] = [];
  for (const ref of refsMesIso) {
    const [ys, ms] = ref.slice(0, 10).split("-");
    const y = Number(ys);
    const m = Number(ms);
    if (!y || !m) continue;
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    for (const p of sinteticoPorId.values()) {
      const areaKey = areaKeySinteticaHorarioComercial(p);
      for (let day = 1; day <= last; day++) {
        const iso = `${y}-${mm}-${String(day).padStart(2, "0")}`;
        const movimento = movimentosPorChave.get(`${p.id}|${iso}`);
        extra.push({
          funcionario_id: p.id,
          dia_iso: iso,
          valor: movimento ?? valorCelulaHorarioComercialSintetico(iso),
          area_key: areaKey,
        });
      }
    }
  }
  return [...baseSemSintetico, ...extra];
}

/** Alias — mesmo comportamento de `mesclarGradeComHorarioComercialSintetico`. */
export function mesclarGradeComEscritorioSintetico(
  rows: RpcGradeCalendarioRow[],
  prestadores: PrestadorHorarioComercialPick[],
  refsMesIso: string[],
): RpcGradeCalendarioRow[] {
  return mesclarGradeComHorarioComercialSintetico(rows, prestadores, refsMesIso);
}

/**
 * Valor da grade do dia; Escritório / Estúdio Comercial usam a regra sintética (mês completo).
 * Compra/Venda/Troca da grade aprovada prevalecem sobre o sintético.
 */
export function primeiroValorGradeDiaParaPrestador(
  rows: RpcGradeCalendarioRow[],
  funcionarioId: string,
  iso: string,
  p?: Pick<RhFuncionario, "area_atuacao" | "staff_turno" | "escala"> | null,
): string | null {
  if (!prestadorUsaHorarioComercialSintetico(p)) {
    return primeiroValorGradeDia(rows, funcionarioId, iso);
  }
  const fromRows = primeiroValorGradeDia(rows, funcionarioId, iso);
  if (fromRows === "Compra" || fromRows === "Venda" || fromRows === "Troca") return fromRows;
  return valorCelulaHorarioComercialSintetico(iso);
}

export function primeiroValorGradeDia(
  rows: RpcGradeCalendarioRow[],
  funcionarioId: string,
  iso: string,
): string | null {
  const hits = rows.filter((r) => r.funcionario_id === funcionarioId && diaIsoChaveGrade(r) === iso);
  if (hits.length === 0) return null;
  for (const h of hits) {
    const t = turnoExibicaoDeValorCelulaEscala((h.valor ?? "").trim());
    if (t) return (h.valor ?? "").trim() || null;
  }
  const v0 = (hits[0]?.valor ?? "").trim();
  return v0 || null;
}

/** Referência visual da grade sintética de horário comercial (seg–sex 09:00–18:00). */
export const HORARIO_ESCRITORIO_COMERCIAL = { entrada: "09:00", saida: "18:00" } as const;

function parseHorarioStaffValorParaHHMM(valor: string | null | undefined): { entrada: string; saida: string } | null {
  const raw = (valor ?? "").trim();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (!m) return null;
  const h1 = parseInt(m[1]!, 10);
  const h2 = parseInt(m[2]!, 10);
  return {
    entrada: `${String(h1).padStart(2, "0")}:00`,
    saida: `${String(h2).padStart(2, "0")}:00`,
  };
}

/** `area_key` da célula da grade usada em `primeiroValorGradeDia` (mesmo dia / funcionário). */
export function areaKeyGradeDia(
  rows: RpcGradeCalendarioRow[],
  funcionarioId: string,
  iso: string,
): string | null {
  const hits = rows.filter((r) => r.funcionario_id === funcionarioId && diaIsoChaveGrade(r) === iso);
  if (hits.length === 0) return null;
  for (const h of hits) {
    const t = turnoExibicaoDeValorCelulaEscala((h.valor ?? "").trim());
    if (t) return (h.area_key ?? "").trim() || null;
  }
  return (hits[0]?.area_key ?? "").trim() || null;
}

/**
 * Entrada / saída programadas (HH:mm).
 * Horário comercial (Escritório ou Estúdio Comercial/5×2) → sempre 09:00–18:00.
 * Demais turnos → escala/operadora / `staff_horario_turno`.
 */
export function obterEntradaSaidaEscaladasPrestadorDia(
  p: RhFuncionario | undefined,
  valorCelula: string | null | undefined,
  op: OpTurnosHorarioPick | null | undefined,
  _areaKey?: string | null,
): { entrada: string; saida: string } | null {
  const turnoNome = turnoExibicaoDeValorCelulaEscala(valorCelula ?? "");
  if (!turnoNome) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNome)) return { entrada: "—", saida: "—" };

  if (turnoNome === "Comercial") {
    return { ...HORARIO_ESCRITORIO_COMERCIAL };
  }

  if (!p) return null;

  const escala = p.escala ?? "";

  if (turnoNome !== "Manhã" && turnoNome !== "Tarde" && turnoNome !== "Noite") {
    return { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const hor = staffHorarioResolvidoParaTurnoDoDia(escala, turnoNome, p.staff_horario_turno);
    const parsed = parseHorarioStaffValorParaHHMM(hor);
    return parsed ?? { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoSomenteOperadora(escala) && op) {
    const k = normalizarEscalaCadastro(escala);
    const durMin = k === "5x1" ? 6 * 60 + 30 : 8 * 60;
    let iniDb: string | null = null;
    if (turnoNome === "Manhã") iniDb = op.turno_manha_inicio ?? null;
    else if (turnoNome === "Tarde") iniDb = op.turno_tarde_inicio ?? null;
    else iniDb = op.turno_noite_inicio ?? null;
    const hi = formatarHoraInicioOperadora(iniDb ?? undefined);
    if (hi === "—") return { entrada: "—", saida: "—" };
    const hf = adicionarMinutosAoRelogioHHMM(hi, durMin);
    return { entrada: hi, saida: hf };
  }

  return { entrada: "—", saida: "—" };
}

export function duracaoMinutosRelogioHHMM(entrada: string, saida: string): number | null {
  if (entrada === "—" || saida === "—") return null;
  const m1 = /^(\d{1,2}):(\d{2})$/.exec(entrada.trim());
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(saida.trim());
  if (!m1 || !m2) return null;
  const a = parseInt(m1[1]!, 10) * 60 + parseInt(m1[2]!, 10);
  const b = parseInt(m2[1]!, 10) * 60 + parseInt(m2[2]!, 10);
  let d = b - a;
  if (d <= 0) d += 24 * 60;
  return d;
}

export function horaRegistoSP(isoTs: string | null | undefined): string {
  if (!isoTs) return "—";
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function duracaoMinutosEntreTimestampsIso(
  isoIn: string | null | undefined,
  isoOut: string | null | undefined,
): number | null {
  if (!isoIn || !isoOut) return null;
  const t0 = new Date(isoIn).getTime();
  const t1 = new Date(isoOut).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1) || t1 <= t0) return null;
  return Math.round((t1 - t0) / 60000);
}

function minutosRelogioHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function diffMinutosRelogioMesmoDia(esc: string, real: string): number | null {
  if (esc === "—" || real === "—") return null;
  const a = minutosRelogioHHmm(esc);
  const b = minutosRelogioHHmm(real);
  if (a == null || b == null) return null;
  return b - a;
}

/** Entrada atrasada: realizado > escalado em mais de 5 minutos. */
export function entradaAtrasadaMais5Min(entEsc: string, entReal: string): boolean {
  const d = diffMinutosRelogioMesmoDia(entEsc, entReal);
  return d != null && d > 5;
}

/** Saída antecipada: realizado < escalado em mais de 5 minutos. */
export function saidaAntecipadaMais5Min(saiEsc: string, saiReal: string): boolean {
  const d = diffMinutosRelogioMesmoDia(saiEsc, saiReal);
  return d != null && d < -5;
}

export function formatarMinutosAtraso(minutos: number): string {
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

export function statusPresencaNoDia(
  escaladas: { entrada: string; saida: string } | null,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): string {
  if (!escaladas) return "Folga";
  const semHorarioProgramado = escaladas.entrada === "—" && escaladas.saida === "—";
  const temHorarioProgramado =
    !semHorarioProgramado && (escaladas.entrada !== "—" || escaladas.saida !== "—");
  if (!temHorarioProgramado) return "Sem horário";
  if (!checkIn && !checkOut) return "Pendente";
  if (checkIn && !checkOut) return "Em aberto";
  if (checkIn && checkOut) return "Registrado";
  return "—";
}

export function horasLabelFromMinutos(min: number): string {
  return fmtHorasTotal(min / 60);
}

export function diasDoMesRef(ano: number, mes0: number): Date[] {
  const last = new Date(ano, mes0 + 1, 0).getDate();
  const out: Date[] = [];
  for (let d = 1; d <= last; d++) out.push(new Date(ano, mes0, d));
  return out;
}

export function isoEstaNoPeriodo(iso: string, inicio: string, fim: string): boolean {
  return iso >= inicio && iso <= fim;
}
