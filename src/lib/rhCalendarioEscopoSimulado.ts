import type { PermissaoValor } from "../types";
import type { RhFuncionario } from "../types/rhFuncionario";
import type { StaffTimeRow } from "./rhCalendarioStaffFiltroHelpers";

/**
 * Recorta times/staff do Calendário para o usuário escolhido no Simulador de Login.
 * As RPCs usam auth.uid() da conta real (ex.: admin) — sem este recorte, Ver=Próprios
 * ainda lista Time/Staff e a grade vazia pede filtro de gestão.
 */
export function aplicarEscopoCalendarioSimulado(input: {
  canView: PermissaoValor;
  staff: RhFuncionario[];
  times: StaffTimeRow[];
  meuIdSimulado: string | null;
  funcionarioSimulado?: RhFuncionario | null;
}): { staff: RhFuncionario[]; times: StaffTimeRow[]; meuId: string | null } {
  if (input.canView !== "proprios") {
    return { staff: input.staff, times: input.times, meuId: input.meuIdSimulado };
  }
  const meuId = input.meuIdSimulado;
  if (!meuId) {
    return { staff: [], times: [], meuId: null };
  }
  let staff = input.staff.filter((p) => p.id === meuId);
  if (staff.length === 0 && input.funcionarioSimulado?.id === meuId) {
    staff = [input.funcionarioSimulado];
  }
  const timeIds = new Set(staff.map((p) => p.org_time_id).filter((id): id is string => Boolean(id)));
  const times = input.times.filter((t) => timeIds.has(t.id));
  return { staff, times, meuId };
}
