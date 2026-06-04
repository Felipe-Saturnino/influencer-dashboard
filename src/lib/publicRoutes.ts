/** Rotas públicas sem autenticação (respeitam Vite base). */
import { isCanalDenunciasPublicPath } from "./canalDenunciasSpin";
import { isPainelNoticiasPublicPath } from "./painelNoticias";

export type PublicUnauthenticatedRoute = "canal-denuncias" | "painel-noticias";

export function detectPublicUnauthenticatedRoute(): PublicUnauthenticatedRoute | null {
  if (isCanalDenunciasPublicPath()) return "canal-denuncias";
  if (isPainelNoticiasPublicPath()) return "painel-noticias";
  return null;
}

export function isPublicUnauthenticatedPath(): boolean {
  return detectPublicUnauthenticatedRoute() !== null;
}
