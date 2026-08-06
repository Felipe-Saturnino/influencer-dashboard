/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string;
  /** Preview/staging (*.pages.dev): e-mails ou @dominio autorizados a logar. */
  readonly VITE_STAGING_LOGIN_ALLOWLIST?: string;
}
