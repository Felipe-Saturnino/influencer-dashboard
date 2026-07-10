import type { CSSProperties, KeyboardEvent } from "react";
import { handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { FONT } from "../../../constants/theme";

export const BRAND_FOCUS_BORDER = "var(--brand-primary, #7c3aed)";

export function onInputFocusBrand(e: { currentTarget: HTMLInputElement | HTMLSelectElement }) {
  e.currentTarget.style.borderColor = BRAND_FOCUS_BORDER;
}

export function onInputBlurBrand(
  e: { currentTarget: HTMLInputElement | HTMLSelectElement },
  defaultBorder: string,
) {
  e.currentTarget.style.borderColor = defaultBorder;
}

export function handleGestaoTabsArrowKeyDown<T extends string>(
  e: KeyboardEvent<HTMLButtonElement>,
  orderedTabs: readonly T[],
  currentKey: T,
  onSelect: (key: T) => void,
  tabIdPrefix: string,
) {
  handleFiltroBarTabsArrowKeyDown(e, orderedTabs, currentKey, onSelect, tabIdPrefix);
}

export function ctaGradientSalvar(
  brand: { useBrand: boolean },
  salvando: boolean,
  cinza: string,
): string {
  if (salvando) return cinza;
  return brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

export function tabAtivaPrincipalStyle(ativa: boolean, cardBorder: string, inputBg?: string): {
  background: string;
  border: string;
  color: string;
  fontWeight: number;
} {
  if (!ativa) {
    return {
      background: inputBg ?? "transparent",
      border: `1px solid ${cardBorder}`,
      color: "inherit",
      fontWeight: 400,
    };
  }
  return {
    background: "color-mix(in srgb, var(--brand-primary, #7c3aed) 15%, transparent)",
    border: "1px solid var(--brand-primary, #7c3aed)",
    color: "var(--brand-primary, #7c3aed)",
    fontWeight: 700,
  };
}

export function brandTintBg(level: "12" | "8" | "7", cssVar = "var(--brand-primary, #4a2082)"): string {
  const pct = level === "12" ? "12%" : level === "8" ? "8%" : "7%";
  return `color-mix(in srgb, ${cssVar} ${pct}, transparent)`;
}

/** Cabeçalho de seção na grade Escopos — altura uniforme (2 linhas) + título centralizado. */
export function getEscopoSecaoHeaderStyle(
  background: string,
  cardBorder: string,
  textMuted: string,
): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    boxSizing: "border-box",
    padding: "10px 12px",
    background,
    borderBottom: `2px solid ${cardBorder}`,
    fontFamily: FONT.body,
    fontWeight: 700,
    fontSize: 11,
    color: textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    textAlign: "center",
    lineHeight: 1.25,
  };
}
