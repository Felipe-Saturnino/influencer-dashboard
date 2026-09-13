import type { CSSProperties } from "react";

/** Nome da plataforma nas telas de autenticação (login / troca de senha). */
export const AUTH_PLATFORM_TAGLINE = "DATA INTELLIGENCE";

/** Estilo tipográfico único para a tagline acima do card de auth. */
export const AUTH_TAGLINE_STYLE: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "2.5px",
  textTransform: "uppercase",
};

/** Tokens do visual escuro fixo das telas de auth (modais inclusos). */
export const AUTH_DARK = {
  text: "#e5dce1",
  textMuted: "rgba(229,220,225,0.65)",
  cardBg: "rgba(15,15,26,0.95)",
  cardBorder: "#1a1a2e",
  inputBg: "rgba(255,255,255,0.07)",
  inputBorder: "rgba(229,220,225,0.15)",
  heading: "#ffffff",
} as const;
