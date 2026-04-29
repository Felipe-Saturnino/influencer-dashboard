import type { PageKey } from "../types";

const AFTER_LOGIN_DADOS_CADASTRO = "rh_dados_cadastro" as const satisfies PageKey;

/**
 * URL da própria app com query para o fluxo: Login com e-mail pré-preenchido → após sucesso abrir Dados de Cadastro.
 * O e-mail Spin deve ser o mesmo do login em `profiles` / Supabase Auth para casar com `rh_funcionarios.email_spin`.
 */
export function buildLoginUrlComPrefillDadosCadastro(emailSpin: string): string {
  const e = emailSpin.trim().toLowerCase();
  if (!e) return "#";
  const base =
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname || "/"}` : "";
  const q = new URLSearchParams({
    login_email: e,
    after_login: AFTER_LOGIN_DADOS_CADASTRO,
  });
  return `${base}?${q.toString()}`;
}

/** E-mail na query `login_email` (tela de login). */
export function lerEmailLoginDaUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("login_email")?.trim() ?? "";
}

/**
 * Após login explícito: com `after_login=rh_dados_cadastro` na URL abre essa página e limpa a query;
 * sem deep link, envia para Home.
 */
export function aplicarRedirecionamentoPosLoginOuHome(setActivePage: (key: PageKey) => void): void {
  if (typeof window === "undefined") {
    setActivePage("home");
    return;
  }
  const after = new URLSearchParams(window.location.search).get("after_login")?.trim();
  if (after === AFTER_LOGIN_DADOS_CADASTRO) {
    setActivePage(AFTER_LOGIN_DADOS_CADASTRO);
    const path = window.location.pathname || "/";
    window.history.replaceState({}, "", path);
    return;
  }
  setActivePage("home");
}

/**
 * Restauração de sessão (refresh): não altera a página padrão; só aplica se a URL ainda tiver `after_login`
 * (ex.: utilizador abriu o link com sessão já ativa).
 */
export function aplicarDeepLinkAposRestaurarSessao(setActivePage: (key: PageKey) => void): void {
  if (typeof window === "undefined") return;
  const after = new URLSearchParams(window.location.search).get("after_login")?.trim();
  if (after !== AFTER_LOGIN_DADOS_CADASTRO) return;
  setActivePage(AFTER_LOGIN_DADOS_CADASTRO);
  window.history.replaceState({}, "", window.location.pathname || "/");
}
