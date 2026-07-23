/**
 * Regra das 8h na «Vender folga»: início do turno ofertado na folga deve ser
 * ≥ fim do último turno trabalhado (em dias anteriores, incl. noite que termina na manhã do dia da folga) + 8h.
 */
import type { Operadora } from "../types";
import { normalizarEscalaCadastro, turnoStaffEhComercial5x2 } from "./rhEscalaTurnos";
import {
  escalaComHorarioTurnoEditavelNaStaff,
  escalaComHorarioTurnoSomenteOperadora,
  formatarHoraInicioOperadora,
  staffHorarioResolvidoParaTurnoDoDia,
} from "./rhStaffHorarioTurno";
import { turnoExibicaoValorGrade, valorCelulaEhFolga, turnosBaseOfertaNaFolga } from "./rhCalendarioAcaoHelpers";

export type OperadoraTurnosPick = Pick<Operadora, "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio">;

/** Subconjunto de `RhFuncionario` usado no cálculo de horários (chaves opcionais alinhadas ao tipo). */
export type PrestadorHorarioCtx = {
  escala: string | null | undefined;
  staff_turno?: string | null | undefined;
  staff_horario_turno?: string | null | undefined;
};

const MS_8H = 8 * 60 * 60 * 1000;

function horaLocalNoIso(iso: string, hh: number, mm: number): Date {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, mo - 1, d, hh, mm, 0, 0);
}

function subtractDaysFromIso(iso: string, dias: number): string {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() - dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function duracaoTurnoOperadoraMs(escalaRaw: string): number {
  return normalizarEscalaCadastro(escalaRaw) === "5x1" ? 6.5 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
}

function instanteInicioOperadoraNoDia(
  diaIso: string,
  turnoNome: "Manhã" | "Tarde" | "Noite",
  op: OperadoraTurnosPick,
): Date | null {
  let iniDb: string | null = null;
  if (turnoNome === "Manhã") iniDb = op.turno_manha_inicio ?? null;
  else if (turnoNome === "Tarde") iniDb = op.turno_tarde_inicio ?? null;
  else iniDb = op.turno_noite_inicio ?? null;
  const hi = formatarHoraInicioOperadora(iniDb ?? undefined);
  if (hi === "—") return null;
  const [hhs, mms] = hi.split(":").map((x) => parseInt(x, 10));
  return horaLocalNoIso(diaIso, hhs, mms);
}

/** Fim absoluto do turno (início + jornada) para escalas 4x2/5x1 via operadora. */
function instanteFimOperadoraNoDia(
  diaIso: string,
  turnoNome: "Manhã" | "Tarde" | "Noite",
  escalaRaw: string,
  op: OperadoraTurnosPick,
): Date | null {
  const ini = instanteInicioOperadoraNoDia(diaIso, turnoNome, op);
  if (!ini) return null;
  return new Date(ini.getTime() + duracaoTurnoOperadoraMs(escalaRaw));
}

function parseIntervaloStaffValor(iso: string, valorKey: string): { start: Date; end: Date } | null {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(valorKey.trim());
  if (!m) return null;
  const a = parseInt(m[1]!, 10);
  const b = parseInt(m[2]!, 10);
  const start = horaLocalNoIso(iso, a, 0);
  let end = horaLocalNoIso(iso, b, 0);
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

/** Início do turno no dia (folga) para o nome de turno ofertado. */
export function instanteInicioTurnoOfertadoNaFolga(
  diaFolgaIso: string,
  turnoNomeOferta: string,
  ctx: PrestadorHorarioCtx,
  op: OperadoraTurnosPick | null | undefined,
): Date | null {
  const escala = ctx.escala ?? "";
  if (turnoNomeOferta === "Comercial" && turnoStaffEhComercial5x2(ctx.staff_turno)) {
    const key = staffHorarioResolvidoParaTurnoDoDia(escala, "Comercial", ctx.staff_horario_turno);
    if (!key) return null;
    const iv = parseIntervaloStaffValor(diaFolgaIso, key);
    return iv?.start ?? null;
  }
  if (escalaComHorarioTurnoSomenteOperadora(escala) && op) {
    if (turnoNomeOferta !== "Manhã" && turnoNomeOferta !== "Tarde" && turnoNomeOferta !== "Noite") return null;
    return instanteInicioOperadoraNoDia(diaFolgaIso, turnoNomeOferta, op);
  }
  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const key = staffHorarioResolvidoParaTurnoDoDia(escala, turnoNomeOferta, ctx.staff_horario_turno);
    if (!key) return null;
    const iv = parseIntervaloStaffValor(diaFolgaIso, key);
    return iv?.start ?? null;
  }
  if (op && (turnoNomeOferta === "Manhã" || turnoNomeOferta === "Tarde" || turnoNomeOferta === "Noite")) {
    return instanteInicioOperadoraNoDia(diaFolgaIso, turnoNomeOferta, op);
  }
  return null;
}

/** Fim do turno trabalhado num dia em que a célula da grade é trabalho (não folga). */
export function instanteFimTurnoTrabalhadoNoDia(
  diaIso: string,
  valorGrade: string,
  ctx: PrestadorHorarioCtx,
  op: OperadoraTurnosPick | null | undefined,
): Date | null {
  const turnoDoDia = turnoExibicaoValorGrade(valorGrade);
  if (!turnoDoDia || turnoDoDia === "Compra" || turnoDoDia === "Venda" || turnoDoDia === "Troca") return null;
  const escala = ctx.escala ?? "";

  if (turnoDoDia === "Comercial" && turnoStaffEhComercial5x2(ctx.staff_turno)) {
    const key = staffHorarioResolvidoParaTurnoDoDia(escala, "Comercial", ctx.staff_horario_turno);
    if (!key) return null;
    const iv = parseIntervaloStaffValor(diaIso, key);
    return iv?.end ?? null;
  }
  if (escalaComHorarioTurnoSomenteOperadora(escala) && op) {
    if (turnoDoDia !== "Manhã" && turnoDoDia !== "Tarde" && turnoDoDia !== "Noite") return null;
    return instanteFimOperadoraNoDia(diaIso, turnoDoDia, escala, op);
  }
  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const key = staffHorarioResolvidoParaTurnoDoDia(escala, turnoDoDia, ctx.staff_horario_turno);
    if (!key) return null;
    const iv = parseIntervaloStaffValor(diaIso, key);
    return iv?.end ?? null;
  }
  if (op && (turnoDoDia === "Manhã" || turnoDoDia === "Tarde" || turnoDoDia === "Noite")) {
    return instanteFimOperadoraNoDia(diaIso, turnoDoDia, escala, op);
  }
  return null;
}

/** Maior instante de fim de turno trabalhado antes do dia da folga (até `maxDiasRetroceder` dias). */
export function ultimoFimTurnoTrabalhadoAntesDaFolga(
  diaFolgaIso: string,
  valorPorIso: Map<string, string>,
  ctx: PrestadorHorarioCtx,
  op: OperadoraTurnosPick | null | undefined,
  maxDiasRetroceder = 60,
): Date | null {
  let best: Date | null = null;
  for (let i = 1; i <= maxDiasRetroceder; i++) {
    const iso = subtractDaysFromIso(diaFolgaIso, i);
    const raw = valorPorIso.get(iso);
    if (raw == null || valorCelulaEhFolga(raw)) continue;
    const fim = instanteFimTurnoTrabalhadoNoDia(iso, raw, ctx, op);
    if (!fim) continue;
    if (!best || fim.getTime() > best.getTime()) best = fim;
  }
  return best;
}

/** Turnos que pode ofertar na folga, respeitando ≥8h após o fim do último turno trabalhado. */
export function turnosPermitidosVendaFolgaComRegra8h(
  diaFolgaIso: string,
  valorPorIso: Map<string, string>,
  ctx: PrestadorHorarioCtx,
  op: OperadoraTurnosPick | null | undefined,
): string[] {
  const base = turnosBaseOfertaNaFolga(ctx.escala);
  const ultimoFim = ultimoFimTurnoTrabalhadoAntesDaFolga(diaFolgaIso, valorPorIso, ctx, op);
  if (!ultimoFim) return base;
  const limite = ultimoFim.getTime() + MS_8H;
  return base.filter((turnoNome) => {
    const ini = instanteInicioTurnoOfertadoNaFolga(diaFolgaIso, turnoNome, ctx, op);
    if (!ini) return false;
    return ini.getTime() >= limite;
  });
}
