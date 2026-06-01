import type { Role } from "../types";
import { ROLES } from "../pages/plataforma/GestaoUsuarios/constants";

export const INFORMATIVO_PERFIL_OPCOES: { value: Role; label: string }[] = ROLES.map((r) => ({
  value: r.value,
  label: r.label,
}));

export function labelPerfisInformativo(perfis: string[]): string {
  if (!perfis.length) return "—";
  const map = new Map(INFORMATIVO_PERFIL_OPCOES.map((o) => [o.value, o.label]));
  return perfis.map((p) => map.get(p as Role) ?? p).join(", ");
}
