/**
 * Restrição de login no staging público (Cloudflare Pages `*.pages.dev`).
 * Não afeta produção, localhost nem rotas `/api/*` (Pages Functions / webhooks).
 *
 * Cloudflare Pages (Preview): `VITE_STAGING_LOGIN_ALLOWLIST=email1@x.com,email2@y.com`
 * Também aceita sufixo de domínio: `@spingaming.com.br`
 */

export const STAGING_LOGIN_BLOQUEADO_MSG =
  "Você não tem acesso a este ambiente de staging. Se precisar entrar, entre em contato com o administrador.";

/** Hostname do site (browser). Em SSR/testes sem `window`, não trata como staging. */
export function isStagingPagesHostname(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : ""))
    .trim()
    .toLowerCase();
  if (!host) return false;
  return host.endsWith(".pages.dev") || host.endsWith(".cloudflareapp.com");
}

export function parseStagingLoginAllowlist(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Entradas: e-mail completo (`a@b.com`) ou domínio (`@b.com` / `b.com`).
 */
export function emailNaStagingAllowlist(email: string, allowlist: string[]): boolean {
  const e = email.trim().toLowerCase();
  if (!e || allowlist.length === 0) return false;
  const dominio = e.includes("@") ? e.slice(e.lastIndexOf("@") + 1) : "";
  for (const entry of allowlist) {
    if (entry.startsWith("@")) {
      if (dominio && dominio === entry.slice(1)) return true;
      continue;
    }
    if (entry.includes("@")) {
      if (e === entry) return true;
      continue;
    }
    if (dominio && dominio === entry) return true;
  }
  return false;
}

export function stagingLoginAllowlistFromEnv(
  envRaw: string | undefined = import.meta.env.VITE_STAGING_LOGIN_ALLOWLIST as string | undefined,
): string[] {
  return parseStagingLoginAllowlist(envRaw);
}

/**
 * `true` = pode seguir com login/sessão neste host.
 * Fora de staging Pages: sempre `true`.
 * Em staging: só se o e-mail estiver na allowlist (lista vazia = ninguém entra).
 */
export function podeAcessarStagingLogin(
  email: string | null | undefined,
  opts?: { hostname?: string; allowlistRaw?: string },
): boolean {
  if (!isStagingPagesHostname(opts?.hostname)) return true;
  const list =
    opts?.allowlistRaw !== undefined
      ? parseStagingLoginAllowlist(opts.allowlistRaw)
      : stagingLoginAllowlistFromEnv();
  return emailNaStagingAllowlist(email ?? "", list);
}
