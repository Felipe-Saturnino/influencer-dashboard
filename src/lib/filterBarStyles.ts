import type { CSSProperties, KeyboardEvent } from "react";
import type { Theme } from "../constants/theme";
import { getPageFilterBoxStyle, type PageContentBoxBrand, type PageContentBoxTheme } from "./pageContentBoxStyles";

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

/** Wrapper da barra de filtros — moldura de página + gap 14px (Global § Blocos de página). */
export function getFilterBarWrapperStyle(
  brand: PageContentBoxBrand,
  t: PageContentBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  return getPageFilterBoxStyle(brand, t, overrides);
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

/** Botões de aba (`role="tab"`) — referência: Organograma (`OrgFiltroBarDiretorias`). */
export const FILTRO_BAR_TAB_BUTTON = {
  padding: "10px 18px",
  minHeight: 44,
  borderRadius: 10,
  fontSize: 13,
  gap: 8,
} as const;

export const FILTRO_BAR_TAB_ICON_SIZE = 16;

/** Props Lucide canónicas para ícones de aba (16px, strokeWidth 2). */
export const FILTRO_BAR_TAB_ICON_PROPS = {
  size: FILTRO_BAR_TAB_ICON_SIZE,
  strokeWidth: 2,
  "aria-hidden": "true" as const,
};

/** Estilo base do botão de aba (página, modal ou barra de filtros). */
export function getFiltroBarTabButtonStyle(
  t: Theme,
  brand: FiltroBarBrand & { accent: string },
  active: boolean,
  activeColor?: string,
): CSSProperties {
  const accent = activeColor ?? brand.accent;
  return {
    padding: FILTRO_BAR_TAB_BUTTON.padding,
    minHeight: FILTRO_BAR_TAB_BUTTON.minHeight,
    borderRadius: FILTRO_BAR_TAB_BUTTON.borderRadius,
    border: `1px solid ${active ? accent : t.cardBorder}`,
    background: active
      ? activeColor
        ? `color-mix(in srgb, ${activeColor} 15%, transparent)`
        : brand.useBrand
          ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
          : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
      : (t.inputBg ?? t.cardBg ?? "transparent"),
    color: active ? accent : t.textMuted,
    fontWeight: active ? 700 : 500,
    fontSize: FILTRO_BAR_TAB_BUTTON.fontSize,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: FILTRO_BAR_TAB_BUTTON.gap,
    whiteSpace: "nowrap",
  };
}

/** Navegação por setas entre abas (`role="tab"`). */
export function handleFiltroBarTabsArrowKeyDown<T extends string>(
  e: KeyboardEvent,
  orderedTabs: readonly T[],
  currentKey: T,
  onSelect: (key: T) => void,
  tabIdPrefix: string,
) {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const idx = orderedTabs.indexOf(currentKey);
  if (idx < 0) return;
  const nextIdx =
    e.key === "ArrowRight"
      ? (idx + 1) % orderedTabs.length
      : (idx - 1 + orderedTabs.length) % orderedTabs.length;
  const next = orderedTabs[nextIdx]!;
  onSelect(next);
  requestAnimationFrame(() => {
    document.getElementById(`${tabIdPrefix}${next}`)?.focus();
  });
}

/** Navegação por setas no `tablist` (foco no botão ativo). */
export function onFiltroBarTabsKeyDown<T extends string>(
  e: KeyboardEvent,
  orderedTabs: readonly T[],
  onSelect: (key: T) => void,
  tabIdBuilder: (key: T) => string,
) {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  const currentKey = orderedTabs.find((k) => el.id === tabIdBuilder(k));
  if (!currentKey) return;
  e.preventDefault();
  const idx = orderedTabs.indexOf(currentKey);
  const nextIdx =
    e.key === "ArrowRight"
      ? (idx + 1) % orderedTabs.length
      : (idx - 1 + orderedTabs.length) % orderedTabs.length;
  const next = orderedTabs[nextIdx]!;
  onSelect(next);
  requestAnimationFrame(() => {
    document.getElementById(tabIdBuilder(next))?.focus();
  });
}

/** Dimensões alinhadas às abas Overview Spin (secção tablist). */
export const FILTRO_STATUS_SEMANTICO_PILL = {
  padding: "10px 18px",
  minHeight: 44,
  borderRadius: 10,
  fontSize: 13,
  gap: 6,
  dotSize: 8,
} as const;

/**
 * Pill de filtro por status com cor semântica (bolinha) — ativo usa a cor do domínio, não brand.accent.
 * Inativo: mesmo contraste das abas Overview Spin (`t.cardBorder`, `t.inputBg`, peso 500).
 */
export function getFiltroStatusSemanticoPillStyle(
  t: Theme,
  active: boolean,
  semanticColor: string
): Pick<CSSProperties, "border" | "background" | "color" | "fontWeight"> {
  if (active) {
    return {
      border: `1px solid ${semanticColor}`,
      background: `color-mix(in srgb, ${semanticColor} 15%, transparent)`,
      color: semanticColor,
      fontWeight: 700,
    };
  }
  return {
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.textMuted,
    fontWeight: 500,
  };
}
