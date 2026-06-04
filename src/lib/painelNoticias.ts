/** Rota pública do painel TV (respeita Vite base). */
export function painelNoticiasPublicPath(): string {
  const b = import.meta.env.BASE_URL || "/";
  return b.endsWith("/") ? `${b}painel-noticias` : `${b}/painel-noticias`;
}

export function isPainelNoticiasPublicPath(): boolean {
  const path = (typeof window !== "undefined" ? window.location.pathname : "/").replace(/\/+$/, "") || "/";
  const want = painelNoticiasPublicPath().replace(/\/+$/, "") || "/";
  return path === want;
}

/** Intervalo do carrossel (ms). */
export const PAINEL_NOTICIAS_SLIDE_MS = 10_000;

/** Polling de dados (ms). */
export const PAINEL_NOTICIAS_POLL_MS = 60_000;

/** Reload completo opcional para deploy / memória (ms). */
export const PAINEL_NOTICIAS_RELOAD_MS = 6 * 60 * 60 * 1000;

export const PAINEL_NOTICIAS_BG = "#0a0a0f";
