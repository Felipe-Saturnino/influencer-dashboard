import { buildLoginPath } from "./appRoutes";

/**
 * URL de login com e-mail pré-preenchido.
 * Após o login a plataforma abre sempre a Home (revisão cadastral pendente aparece lá).
 * O e-mail Spin deve ser o mesmo do login em `profiles` / Supabase Auth para casar com `rh_funcionarios.email_spin`.
 */
export function buildLoginUrlComPrefillDadosCadastro(emailSpin: string): string {
  const e = emailSpin.trim().toLowerCase();
  if (!e) return "#";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const q = new URLSearchParams({
    login_email: e,
  });
  return `${origin}${buildLoginPath()}?${q.toString()}`;
}

/** E-mail na query `login_email` (tela de login). */
export function lerEmailLoginDaUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("login_email")?.trim() ?? "";
}
