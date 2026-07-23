import type { PermissaoValor } from "../../../../types";
import { TUTORIAL_CONTROLE_PRESENCA } from "./controlePresenca";
import type { TutorialDef, TutorialSecaoNav } from "./types";

/** Catálogo de tutoriais — ordem das secções alinhada ao menu quando possível. */
export const TUTORIAIS_CATALOG: TutorialDef[] = [TUTORIAL_CONTROLE_PRESENCA];

function podeVerTutorial(
  t: TutorialDef,
  permissions: Partial<Record<string, PermissaoValor | null | undefined>>,
): boolean {
  if (!t.relatedPageKey) return true;
  const v = permissions[t.relatedPageKey];
  return v === "sim" || v === "proprios";
}

/** Agrupa tutoriais visíveis por secção (menu lateral da aba Tutoriais). */
export function buildTutoriaisNav(
  permissions: Partial<Record<string, PermissaoValor | null | undefined>>,
): TutorialSecaoNav[] {
  const bySection = new Map<string, TutorialDef[]>();
  for (const t of TUTORIAIS_CATALOG) {
    if (!podeVerTutorial(t, permissions)) continue;
    const list = bySection.get(t.section) ?? [];
    list.push(t);
    bySection.set(t.section, list);
  }
  return [...bySection.entries()].map(([section, items]) => ({ section, items }));
}
