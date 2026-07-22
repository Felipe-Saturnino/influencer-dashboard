/**
 * Helpers partilhados entre Calendário RH e Overview Prestador (escala / presença).
 */
import { fmtHorasTotal } from "./dashboardHelpers";
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
} from "./rhStaffHorarioTurno";
import type { RhFuncionario } from "../types/rhFuncionario";
import type { TurnosDealersPick } from "./turnosDealers";

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
 * Escala sintética de Escritório (seg–sex Comercial, sáb/dom Folga).
 * Fonte de verdade no cliente — a RPC não deve gerar N×31 linhas (limite PostgREST ~1000).
 */
export function valorCelulaEscritorioSintetico(diaIso: string): "Comercial" | "Folga" {
  const [ys, ms, ds] = diaIso.slice(0, 10).split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!y || !m || !d) return "Folga";
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=dom … 6=sáb
  return dow === 0 || dow === 6 ? "Folga" : "Comercial";
}

/** Remove linhas `escritorio` da RPC (podem vir truncadas) e regenera o mês completo no cliente. */
export function mesclarGradeComEscritorioSintetico(
  rows: RpcGradeCalendarioRow[],
  prestadores: Pick<RhFuncionario, "id" | "area_atuacao">[],
  refsMesIso: string[],
): RpcGradeCalendarioRow[] {
  const semEscritorioRpc = rows.filter((r) => (r.area_key ?? "").trim().toLowerCase() !== "escritorio");
  const escritorioIds = prestadores.filter((p) => p.area_atuacao === "escritorio").map((p) => p.id);
  if (escritorioIds.length === 0) return semEscritorioRpc;

  const extra: RpcGradeCalendarioRow[] = [];
  for (const ref of refsMesIso) {
    const [ys, ms] = ref.slice(0, 10).split("-");
    const y = Number(ys);
    const m = Number(ms);
    if (!y || !m) continue;
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");
    for (const fid of escritorioIds) {
      for (let day = 1; day <= last; day++) {
        const iso = `${y}-${mm}-${String(day).padStart(2, "0")}`;
        extra.push({
          funcionario_id: fid,
          dia_iso: iso,
          valor: valorCelulaEscritorioSintetico(iso),
          area_key: "escritorio",
        });
      }
    }
  }
  return [...semEscritorioRpc, ...extra];
}

/**
 * Valor da grade do dia; para Escritório usa sempre a regra sintética (mês completo).
 */
export function primeiroValorGradeDiaParaPrestador(
  rows: RpcGradeCalendarioRow[],
  funcionarioId: string,
  iso: string,
  p?: Pick<RhFuncionario, "area_atuacao"> | null,
): string | null {
  if (p?.area_atuacao === "escritorio") return valorCelulaEscritorioSintetico(iso);
  return primeiroValorGradeDia(rows, funcionarioId, iso);
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

/** Referência visual da grade sintética de Escritório (seg–sex Comercial). */
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

function ehCadastroOuGradeEscritorio(
  p: RhFuncionario | undefined,
  areaKey?: string | null,
): boolean {
  if (p?.area_atuacao === "escritorio") return true;
  return (areaKey ?? "").trim().toLowerCase() === "escritorio";
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
 * Escritório (cadastro ou `area_key` da grade sintética) + Comercial → 09:00–18:00.
 * Estúdio Comercial 5x2 → `staff_horario_turno`. Demais turnos → escala/operadora.
 */
export function obterEntradaSaidaEscaladasPrestadorDia(
  p: RhFuncionario | undefined,
  valorCelula: string | null | undefined,
  op: OpTurnosHorarioPick | null | undefined,
  areaKey?: string | null,
): { entrada: string; saida: string } | null {
  const turnoNome = turnoExibicaoDeValorCelulaEscala(valorCelula ?? "");
  if (!turnoNome) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNome)) return { entrada: "—", saida: "—" };

  if (turnoNome === "Comercial") {
    if (ehCadastroOuGradeEscritorio(p, areaKey)) {
      return { ...HORARIO_ESCRITORIO_COMERCIAL };
    }
    if (p && turnoStaffEhComercial5x2(p.staff_turno)) {
      const parsed = parseHorarioStaffValorParaHHMM(p.staff_horario_turno);
      return parsed ?? { entrada: "—", saida: "—" };
    }
    // Grade sintética / cadastro incompleto: Comercial sem 5x2 → referência Escritório.
    return { ...HORARIO_ESCRITORIO_COMERCIAL };
  }

  if (!p) return null;

  const escala = p.escala ?? "";

  if (turnoNome !== "Manhã" && turnoNome !== "Tarde" && turnoNome !== "Noite") {
    return { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const parsed = parseHorarioStaffValorParaHHMM(p.staff_horario_turno);
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
