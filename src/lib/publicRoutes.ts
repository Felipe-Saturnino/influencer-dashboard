/** Rotas públicas sem autenticação (respeitam Vite base). */
import { isCanalDenunciasPublicPath } from "./canalDenunciasSpin";
import { isPainelNoticiasPublicPath } from "./painelNoticias";
import { isTorneioCdaPublicPath } from "./torneioCdaLive";

export type PublicUnauthenticatedRoute = "canal-denuncias" | "painel-noticias" | "torneio-cda";

export function detectPublicUnauthenticatedRoute(): PublicUnauthenticatedRoute | null {
  if (isCanalDenunciasPublicPath()) return "canal-denuncias";
  if (isPainelNoticiasPublicPath()) return "painel-noticias";
  if (isTorneioCdaPublicPath()) return "torneio-cda";
  return null;
}

export function isPublicUnauthenticatedPath(): boolean {
  return detectPublicUnauthenticatedRoute() !== null;
}
