/**
 * Regras de turno (Manhã / Tarde / Noite) conforme a escala cadastrada na Gestão de Prestadores.
 * Usado na Escala do mês (grade) e na Gestão de Staff (`staff_turno`).
 */

export function normalizarEscalaCadastro(escalaRaw: string): string {
  return escalaRaw.trim().toLowerCase().replace(/\s+/g, "");
}

const TURNOS_M_T_N: readonly string[] = ["Manhã", "Tarde", "Noite"];
const TURNOS_M_N: readonly string[] = ["Manhã", "Noite"];

/**
 * Apenas escalas 4x2, 5x1 e 3x3 têm turnos operacionais (Staff / regras de grade).
 * Demais formatos ou escala vazia: lista vazia (sem Manhã/Tarde/Noite).
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
 * é 3x3 / 4x2 / 5x1; para outras escalas cadastradas (ex. 5x2) usa Manhã / Tarde / Noite.
 */
export function opcoesTurnoPorEscalaRh(escalaRaw: string): readonly string[] {
  const t = turnosPermitidosPorEscalaPrestador(escalaRaw);
  return t.length > 0 ? t : TURNOS_M_T_N;
}

/** Valor seguro para selects de turno alinhado a `opcoesTurnoPorEscalaRh` (Prestadores + Staff). */
export function turnoRhCoerenteComEscala(
  escalaRaw: string | null | undefined,
  staffTurnoRaw: string | null | undefined,
): string {
  const v = (staffTurnoRaw ?? "").trim();
  const allow = opcoesTurnoPorEscalaRh(escalaRaw ?? "");
  return allow.includes(v) ? v : "";
}

/** Valor seguro para `<select>` de `staff_turno` (vazio se o valor gravado não é permitido para a escala). */
export function staffTurnoCoerenteComEscala(
  escalaRaw: string | null | undefined,
  staffTurnoRaw: string | null | undefined,
): string {
  const v = (staffTurnoRaw ?? "").trim();
  if (!v) return "";
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
