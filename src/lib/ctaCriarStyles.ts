import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

/**
 * Raio das abas Overview Spin (`mesas_spin` — tablist Overview / Posicionamento).
 * Não usar 999 (pill dos filtros); mantém padding 10×20 sem aumentar o botão.
 */
export const CTA_CRIAR_BORDER_RADIUS = 10;

/** Dimensões — referência Nova Live (Agenda). */
export const CTA_CRIAR_PADDING = "10px 20px" as const;
export const CTA_CRIAR_FONT_SIZE = 13;
export const CTA_CRIAR_FONT_WEIGHT = 700;
export const CTA_CRIAR_GAP = 6;
export const CTA_CRIAR_ICON_SIZE = 14;

export type CtaCriarBrand = { useBrand: boolean };

/**
 * Gradiente CTA de criação na toolbar/página.
 * Spin (todos os perfis sem whitelabel): Scout — primary → secondary.
 * Operadora (whitelabel): action → contrast do brandguide.
 */
export function getCtaCriarGradient(
  brand: CtaCriarBrand,
  options?: { disabled?: boolean; disabledBackground?: string },
): string {
  if (options?.disabled && options.disabledBackground) {
    return options.disabledBackground;
  }
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-action), var(--brand-contrast))"
    : "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))";
}

/** Estilo base do botão (sem estado disabled/loading). */
export function getCtaCriarButtonStyle(
  brand: CtaCriarBrand,
  overrides?: CSSProperties,
  gradientOptions?: { disabled?: boolean; disabledBackground?: string },
): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: CTA_CRIAR_GAP,
    padding: CTA_CRIAR_PADDING,
    borderRadius: CTA_CRIAR_BORDER_RADIUS,
    border: "none",
    cursor: "pointer",
    background: getCtaCriarGradient(brand, gradientOptions),
    color: "#fff",
    fontSize: CTA_CRIAR_FONT_SIZE,
    fontWeight: CTA_CRIAR_FONT_WEIGHT,
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "opacity 0.15s",
    ...overrides,
  };
}
