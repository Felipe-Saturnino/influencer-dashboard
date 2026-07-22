import type { PermissaoValor, Role } from "../types";

export type LinksMateriaisCanal = "influencer" | "afiliado";

export const TRACKING_BASE_INFLUENCER =
  "https://go.aff.casadeapostas.bet.br/lkp84bia?utm_source=";

export const TRACKING_BASE_AFILIADO =
  "https://go.aff.casadeapostas.bet.br/3me6klr4?utm_source=";

export function trackingBasePorCanal(canal: LinksMateriaisCanal): string {
  return canal === "afiliado" ? TRACKING_BASE_AFILIADO : TRACKING_BASE_INFLUENCER;
}

/**
 * Abas visíveis conforme Ver:
 * — Sim → Influencers e Afiliados
 * — Próprios → só a aba do canal do perfil (Influencer/Agência → Influencers; Afiliado → Afiliados)
 */
export function linksMateriaisAbasVisiveis(
  role: Role | undefined | null,
  canView: PermissaoValor,
): LinksMateriaisCanal[] {
  if (canView === "proprios") {
    if (role === "afiliado") return ["afiliado"];
    if (role === "influencer" || role === "agencia") return ["influencer"];
  }
  return ["influencer", "afiliado"];
}

/**
 * Modo “só o próprio link” (sem select): Ver = Próprios + perfil Influencer ou Afiliado.
 * Agência com Próprios mantém select filtrado pelo escopo (não é self).
 */
export function linksMateriaisIsSelfMode(
  role: Role | undefined | null,
  canView: PermissaoValor,
): boolean {
  if (canView !== "proprios") return false;
  return role === "influencer" || role === "afiliado";
}

/** @deprecated Preferir linksMateriaisIsSelfMode(role, canView). */
export function linksMateriaisIsSelfCanal(
  canal: LinksMateriaisCanal,
  role: Role | undefined | null,
): boolean {
  if (canal === "influencer") return role === "influencer";
  return role === "afiliado";
}

/** Nome de exibição: afiliado = nome (completo/profiles); influencer = nome artístico. */
export function nomeExibicaoLinksEntidade(opts: {
  role?: string | null;
  nome_artistico?: string | null;
  nome_completo?: string | null;
  name?: string | null;
}): string {
  const isAfiliado = opts.role === "afiliado";
  if (isAfiliado) {
    return (
      (opts.nome_completo ?? "").trim() ||
      (opts.name ?? "").trim() ||
      (opts.nome_artistico ?? "").trim() ||
      "—"
    );
  }
  return (opts.nome_artistico ?? "").trim() || (opts.name ?? "").trim() || "—";
}
