import type { Role } from "../types";
import { supabase } from "./supabase";
import {
  FILTROS_PERFIL_LINHAS,
  ROLES,
} from "../pages/plataforma/GestaoUsuarios/constants";

/** Admin sempre vê todos os tutoriais; não entra como destino configurável. */
export const TUTORIAL_PERFIS_EXCLUIDOS_DESTINO: readonly Role[] = ["admin"];

/** Linhas do multi-select — todos os perfis exceto Administrador. */
export const TUTORIAL_FILTROS_PERFIL_LINHAS: { titulo: string; roles: Role[] }[] =
  FILTROS_PERFIL_LINHAS.map(({ titulo, roles }) => ({
    titulo,
    roles: roles.filter((r) => !TUTORIAL_PERFIS_EXCLUIDOS_DESTINO.includes(r)),
  })).filter((linha) => linha.roles.length > 0);

export type TutorialVisibilidadeMap = Record<string, Role[]>;

export async function carregarTutorialVisibilidade(): Promise<TutorialVisibilidadeMap> {
  const { data, error } = await supabase
    .from("ajuda_tutorial_visibilidade")
    .select("tutorial_id, roles");
  if (error) {
    console.error("[ajuda_tutorial_visibilidade] load", error);
    return {};
  }
  const map: TutorialVisibilidadeMap = {};
  for (const row of data ?? []) {
    const id = String(row.tutorial_id ?? "");
    if (!id) continue;
    const roles = Array.isArray(row.roles)
      ? (row.roles.filter((r): r is Role => typeof r === "string" && ROLES.some((o) => o.value === r)) as Role[])
      : [];
    map[id] = roles;
  }
  return map;
}

export async function salvarTutorialVisibilidade(
  tutorialId: string,
  roles: Role[],
  updatedBy: string | null,
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await supabase.from("ajuda_tutorial_visibilidade").upsert(
    {
      tutorial_id: tutorialId,
      roles,
      updated_by: updatedBy,
    },
    { onConflict: "tutorial_id" },
  );
  if (error) {
    console.error("[ajuda_tutorial_visibilidade] save", error);
    return { ok: false };
  }
  return { ok: true };
}

/** Admin vê tudo; demais só se o role estiver na lista do tutorial. Sem linha = oculto. */
export function tutorialVisivelParaRole(
  tutorialId: string,
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (!role) return false;
  const roles = visibility[tutorialId];
  if (!roles || roles.length === 0) return false;
  return roles.includes(role);
}
