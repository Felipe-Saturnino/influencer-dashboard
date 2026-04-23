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
