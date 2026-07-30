import type { Role } from "../../../../types";
import type { TutorialVisibilidadeMap } from "../../../../lib/ajudaTutorialVisibilidade";
import { tutorialVisivelParaRole } from "../../../../lib/ajudaTutorialVisibilidade";
import { TUTORIAL_ALTERAR_ESCALA } from "./alterarEscala";
import { TUTORIAL_CALENDARIO_PRESTADOR } from "./calendarioPrestador";
import { TUTORIAL_CIENCIA_MANUAIS_ACADEMY } from "./cienciaManuaisAcademy";
import { TUTORIAL_CONTROLE_PRESENCA } from "./controlePresenca";
import { TUTORIAL_MARKETPLACE_OFERTAS } from "./marketplaceOfertas";
import { TUTORIAL_POSTAGEM_ACADEMY_APROVACAO } from "./postagemAcademyAprovacao";
import type { TutorialDef, TutorialSecaoNav } from "./types";

/** Catálogo de tutoriais — ordem das secções alinhada ao menu quando possível. */
export const TUTORIAIS_CATALOG: TutorialDef[] = [
  TUTORIAL_CALENDARIO_PRESTADOR,
  TUTORIAL_CONTROLE_PRESENCA,
  TUTORIAL_ALTERAR_ESCALA,
  TUTORIAL_MARKETPLACE_OFERTAS,
  TUTORIAL_CIENCIA_MANUAIS_ACADEMY,
  TUTORIAL_POSTAGEM_ACADEMY_APROVACAO,
];

/** Agrupa tutoriais visíveis por secção (menu lateral da aba Tutoriais). */
export function buildTutoriaisNav(
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): TutorialSecaoNav[] {
  const bySection = new Map<string, TutorialDef[]>();
  for (const t of TUTORIAIS_CATALOG) {
    if (!tutorialVisivelParaRole(t.id, role, visibility, isAdmin)) continue;
    const list = bySection.get(t.section) ?? [];
    list.push(t);
    bySection.set(t.section, list);
  }
  return [...bySection.entries()].map(([section, items]) => ({ section, items }));
}

export function temAlgumTutorialVisivel(
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): boolean {
  return TUTORIAIS_CATALOG.some((t) => tutorialVisivelParaRole(t.id, role, visibility, isAdmin));
}
