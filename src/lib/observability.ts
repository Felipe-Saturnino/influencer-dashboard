import * as Sentry from "@sentry/react";

/**
 * Inicializa Sentry apenas quando `VITE_SENTRY_DSN` está definido (ex.: Cloudflare Pages).
 * Sem DSN, não há overhead nem pedidos de rede.
 */
export function initObservability(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
  });
}
