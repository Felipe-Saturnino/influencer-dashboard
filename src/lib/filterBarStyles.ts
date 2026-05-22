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

/** Estado inativo de campo pill na barra — alinhado a `FiltroOperadoraSelect` / Overview Influencer. */
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
