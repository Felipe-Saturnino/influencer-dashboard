import type { Role } from "../../../../types";
import type { TutorialVisibilidadeMap } from "../../../../lib/ajudaTutorialVisibilidade";
import { tutorialVisivelParaRole } from "../../../../lib/ajudaTutorialVisibilidade";
import { TUTORIAL_IDS } from "./ids";

/** Checagem leve (só IDs) — não importa o catálogo completo de tutoriais. */
export function temAlgumTutorialVisivel(
  role: Role | null | undefined,
  visibility: TutorialVisibilidadeMap,
  isAdmin: boolean,
): boolean {
  return TUTORIAL_IDS.some((id) => tutorialVisivelParaRole(id, role, visibility, isAdmin));
}
