import type { CSSProperties } from "react";
import type { Theme } from "../constants/theme";

/** Padding do wrapper da barra de filtros (referência: Overview Influencer). */
export const FILTER_BAR_PADDING = "12px 20px" as const;

/** Espaçamento entre carrossel, Histórico, Influencer, Operadora, etc. */
export const FILTER_BAR_ROW_GAP = 10;

/** Linha centralizada de controlos na barra de filtros. */
export function getFilterBarRowStyle(overrides?: CSSProperties): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: FILTER_BAR_ROW_GAP,
    flexWrap: "wrap",
    ...overrides,
  };
}

/** Wrapper transparente da barra (Brand §5). */
export function getFilterBarWrapperStyle(brand: {
  primaryTransparentBorder: string;
  primaryTransparentBg: string;
}): CSSProperties {
  return {
    borderRadius: 14,
    border: brand.primaryTransparentBorder,
    background: brand.primaryTransparentBg,
    padding: FILTER_BAR_PADDING,
  };
}

export type FiltroBarBrand = {
  useBrand: boolean;
  accent: string;
};

/** Padding/gap partilhados por pill na barra (Histórico, Hoje, Influencer trigger, …). */
export const FILTRO_BAR_PILL_PADDING = "6px 14px" as const;
export const FILTRO_BAR_PILL_GAP = 6;

/** Estado inativo de pill na barra — Operadora, Influencer, Histórico, Hoje (Overview Influencer). */
export function getFiltroCampoInativoStyle(t: Theme): Pick<
  CSSProperties,
  "border" | "background" | "color" | "fontWeight"
> {
  return {
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontWeight: 400,
  };
}

/** Estado ativo de pill na barra (Histórico ligado, influencer/operadora filtrados, Hoje pressionado). */
export function getFiltroCampoAtivoStyle(brand: FiltroBarBrand): Pick<
  CSSProperties,
  "border" | "background" | "color" | "fontWeight"
> {
  const accent = brand.useBrand ? "var(--brand-action, #7c3aed)" : brand.accent;
  return {
    border: `1px solid ${accent}`,
    background: brand.useBrand
      ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
      : "color-mix(in srgb, var(--brand-primary, #7c3aed) 15%, transparent)",
    color: accent,
    fontWeight: 700,
  };
}

/** Inativo ou ativo — único ponto para toggles da barra. */
export function getFiltroBarPillStateStyle(
  t: Theme,
  brand: FiltroBarBrand,
  active: boolean
): Pick<CSSProperties, "border" | "background" | "color" | "fontWeight"> {
  return active ? getFiltroCampoAtivoStyle(brand) : getFiltroCampoInativoStyle(t);
}
