import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

/** Campos mínimos do tema para estilos de tabela compartilhados. */
export type TableThemePick = { cardBorder: string; textMuted: string; text: string };

export function getThStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    textAlign: "left",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: t.textMuted,
    fontWeight: 600,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "color-mix(in srgb, var(--brand-secondary, #4a2082) 10%, transparent)",
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
    ...extra,
  };
}

/** Cabeçalho com destaque na cor de ação (visão Operador / whitelabel). */
export function getThStyleBrandAction(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    ...getThStyle(t),
    background: "color-mix(in srgb, var(--brand-action, #7c3aed) 12%, transparent)",
    borderBottom: `1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 28%, transparent)`,
    color: "var(--brand-action, #7c3aed)",
    ...extra,
  };
}

export function getTdStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 45%, transparent)`,
    color: t.text,
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function getTdNumStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    ...getTdStyle(t, extra),
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };
}

export const zebraStripe = (i: number): string =>
  i % 2 === 1 ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 6%, transparent)" : "transparent";

/** Linhas alternadas com cor de contraste (visão Operador). */
export const zebraStripeBrandContrast = (i: number): string =>
  i % 2 === 1 ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 8%, transparent)" : "transparent";

export const TOTAL_ROW_BG =
  "color-mix(in srgb, var(--brand-secondary, #4a2082) 12%, transparent)";

export const TOTAL_ROW_BG_BRAND_CONTRAST =
  "color-mix(in srgb, var(--brand-contrast, #1e36f8) 12%, transparent)";
