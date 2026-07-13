import type { Role } from "../types";
import {
  FILTROS_PERFIL_LINHAS,
  ROLES,
  roleLabel,
} from "../pages/plataforma/GestaoUsuarios/constants";

/** Perfis que não entram como destino de informativo (aprovam / gerem, não recebem na Home). */
export const INFORMATIVO_PERFIS_EXCLUIDOS_DESTINO: readonly Role[] = ["admin", "executivo"];

export const INFORMATIVO_PERFIL_OPCOES: { value: Role; label: string }[] = ROLES.filter(
  (r) => !INFORMATIVO_PERFIS_EXCLUIDOS_DESTINO.includes(r.value),
).map((r) => ({
  value: r.value,
  label: r.label,
}));

/** Linhas do multi-select no modal — sem Administrador nem Executivo. */
export const INFORMATIVO_FILTROS_PERFIL_LINHAS: { titulo: string; roles: Role[] }[] =
  FILTROS_PERFIL_LINHAS.map(({ titulo, roles }) => ({
    titulo,
    roles: roles.filter((r) => !INFORMATIVO_PERFIS_EXCLUIDOS_DESTINO.includes(r)),
  })).filter((linha) => linha.roles.length > 0);

export function labelPerfisInformativo(perfis: string[]): string {
  if (!perfis.length) return "—";
  const map = new Map(ROLES.map((o) => [o.value, o.label]));
  return perfis.map((p) => map.get(p as Role) ?? roleLabel(p as Role)).join(", ");
}
