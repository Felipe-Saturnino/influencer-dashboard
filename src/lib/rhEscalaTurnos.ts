/**
 * Regras de turno conforme a escala cadastrada na Gestão de Prestadores.
 * Escalas 4x2 / 5x1 / 3x3: Manhã / Tarde (ou Manhã / Noite em 3x3). Escala 5x2: apenas Comercial.
 * Usado na Escala do mês (grade) e na Gestão de Staff (`staff_turno`).
 */

export function normalizarEscalaCadastro(escalaRaw: string): string {
  return escalaRaw.trim().toLowerCase().replace(/\s+/g, "");
}

const TURNOS_M_T_N: readonly string[] = ["Manhã", "Tarde", "Noite"];
const TURNOS_M_N: readonly string[] = ["Manhã", "Noite"];

/** Valor legado em `rh_funcionarios.staff_turno` antes da renomeação para «Comercial». */
export const TURNO_ESCALA_5x2_LEGADO = "Horário Comercial";

/** Único valor de turno permitido para escala 5x2 (cadastro Prestadores / Staff). */
export const TURNO_ESCALA_5x2 = "Comercial";

/** Indica turno de horário comercial (5x2), incluindo valor gravado antes da renomeação. */
export function turnoStaffEhComercial5x2(turnoStaffNome: string | null | undefined): boolean {
  const t = (turnoStaffNome ?? "").trim();
  return t === TURNO_ESCALA_5x2 || t === TURNO_ESCALA_5x2_LEGADO;
}

/**
 * Apenas escalas 4x2, 5x1 e 3x3 têm turnos operacionais (Staff / regras de grade MRN/AFT/NGT).
 * Escala 5x2 e demais: lista vazia aqui (turno comercial tratado em `opcoesTurnoPorEscalaRh`).
 */
export function turnosPermitidosPorEscalaPrestador(escalaRaw: string): readonly string[] {
  const k = normalizarEscalaCadastro(escalaRaw);
  if (k === "3x3") return TURNOS_M_N;
  if (k === "4x2" || k === "5x1") return TURNOS_M_T_N;
  return [];
}

export function escalaPrestadorTemTurnosOperacionais(escalaRaw: string | null | undefined): boolean {
  return turnosPermitidosPorEscalaPrestador(escalaRaw ?? "").length > 0;
}

/**
 * Opções de `staff_turno` compartilhadas entre Gestão de Prestadores (contratação estúdio)
 * e Gestão de Staff: mesma lista que `turnosPermitidosPorEscalaPrestador` quando a escala
 * é 3x3 / 4x2 / 5x1; escala **5x2** apenas «Comercial»; demais escalas não previstas usam Manhã / Tarde / Noite.
 */
export function opcoesTurnoPorEscalaRh(escalaRaw: string): readonly string[] {
  const k = normalizarEscalaCadastro(escalaRaw);
  if (k === "5x2") return [TURNO_ESCALA_5x2];
  const t = turnosPermitidosPorEscalaPrestador(escalaRaw);
  return t.length > 0 ? t : TURNOS_M_T_N;
}

/** Valor seguro para selects de turno alinhado a `opcoesTurnoPorEscalaRh` (Prestadores + Staff). */
export function turnoRhCoerenteComEscala(
  escalaRaw: string | null | undefined,
  staffTurnoRaw: string | null | undefined,
): string {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  const v = (staffTurnoRaw ?? "").trim();
  if (k === "5x2") {
    if (!v) return "";
    return turnoStaffEhComercial5x2(v) ? TURNO_ESCALA_5x2 : "";
  }
  const allow = opcoesTurnoPorEscalaRh(escalaRaw ?? "");
  return allow.includes(v) ? v : "";
}

/** Valor seguro para `<select>` de `staff_turno` (vazio se o valor gravado não é permitido para a escala). */
export function staffTurnoCoerenteComEscala(
  escalaRaw: string | null | undefined,
  staffTurnoRaw: string | null | undefined,
): string {
  const k = normalizarEscalaCadastro(escalaRaw ?? "");
  const v = (staffTurnoRaw ?? "").trim();
  if (!v) return "";
  if (k === "5x2") return turnoStaffEhComercial5x2(v) ? TURNO_ESCALA_5x2 : "";
  const allow = turnosPermitidosPorEscalaPrestador(escalaRaw ?? "");
  return allow.includes(v) ? v : "";
}

/** Siglas na grade da Escala do mês (conforme turno na Gestão de Staff). */
export function turnoOperacionalParaSiglaGrade(turnoRaw: string): "MRN" | "AFT" | "NGT" | "" {
  const t = turnoRaw.trim();
  if (t === "Manhã") return "MRN";
  if (t === "Tarde") return "AFT";
  if (t === "Noite") return "NGT";
  return "";
}

export function siglaGradeParaNomeTurno(sigla: string): string {
  const s = sigla.trim();
  if (s === "MRN") return "Manhã";
  if (s === "AFT") return "Tarde";
  if (s === "NGT") return "Noite";
  return "";
}
