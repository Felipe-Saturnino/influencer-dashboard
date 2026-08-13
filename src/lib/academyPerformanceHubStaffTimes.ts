import {
  timeOrganogramaIndicaGamePresenter,
  timeOrganogramaIndicaShuffler,
} from "./rhPrestadorUsuarioSync";
import type { PerformanceHubTimeSlug } from "./academyPerformanceHubTypes";

export type PerformanceHubOrgTimeRow = {
  id: string;
  nome: string;
};

/** Time do Organograma → slug do Performance Hub (aceita singular/plural e acentos). */
export function slugTimePerformanceHubDeNome(nome: string | null | undefined): PerformanceHubTimeSlug | null {
  if (timeOrganogramaIndicaGamePresenter(nome)) return "game_presenter";
  if (timeOrganogramaIndicaShuffler(nome)) return "shuffler";
  return null;
}

/**
 * Agrupa todos os times GP/Shuffler — não só o primeiro nome exacto.
 * Dois times «Game Presenter» (ou «Game Presenters») entram no mesmo slug.
 */
export function agruparTimeIdsPorSlugPerformanceHub(
  times: PerformanceHubOrgTimeRow[],
): Record<PerformanceHubTimeSlug, string[]> {
  const out: Record<PerformanceHubTimeSlug, string[]> = {
    game_presenter: [],
    shuffler: [],
  };
  const visto = new Set<string>();
  for (const time of times) {
    const id = time.id?.trim();
    if (!id || visto.has(id)) continue;
    const slug = slugTimePerformanceHubDeNome(time.nome);
    if (!slug) continue;
    visto.add(id);
    out[slug].push(id);
  }
  return out;
}

export function slugTimePerformanceHubDeId(
  orgTimeId: string | null | undefined,
  idsPorSlug: Record<PerformanceHubTimeSlug, string[]>,
): PerformanceHubTimeSlug | null {
  const id = orgTimeId?.trim();
  if (!id) return null;
  if (idsPorSlug.game_presenter.includes(id)) return "game_presenter";
  if (idsPorSlug.shuffler.includes(id)) return "shuffler";
  return null;
}
