import type { PageKey } from "../types";
import { buildAppPath } from "./appRoutes";

/** Caminho canónico interno (`/OverviewSpin`, `/GestaoDeLinks/Pendentes`, …). */
export function getAppPageHref(pageKey: PageKey, tabSlug?: string | null): string {
  return buildAppPath(pageKey, tabSlug);
}

/** URL absoluta para exibir ou copiar (ex.: Ajuda, tooltips). */
export function getAppPageAbsoluteUrl(pageKey: PageKey, tabSlug?: string | null): string {
  const path = getAppPageHref(pageKey, tabSlug);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
