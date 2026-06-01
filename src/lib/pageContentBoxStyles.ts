import type { CSSProperties } from "react";

/** Espaçamento vertical entre blocos de primeiro nível na página (caixa → caixa). */
export const PAGE_CONTENT_BOX_GAP = 14;

export type PageContentBoxBrand = {
  useBrand: boolean;
  blockBg: string;
  primaryTransparentBg: string;
  primaryTransparentBorder: string;
};

export type PageContentBoxTheme = {
  isDark: boolean;
  cardBorder: string;
};

export function getPageContentBoxShadow(isDark: boolean): string {
  return isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
}

/** Light: 14px · Dark: 18px (referência dashboards). */
export function getPageContentBoxRadius(isDark: boolean): number {
  return isDark ? 18 : 14;
}

function getPageContentBoxBackground(brand: PageContentBoxBrand, isDark: boolean): string {
  if (isDark) return brand.blockBg;
  if (brand.useBrand) return brand.blockBg;
  return "#ffffff";
}

/** Moldura da caixa (borda, raio, sombra, fundo) — sem padding nem margin de bloco. */
export function getPageContentBoxShellStyle(
  brand: PageContentBoxBrand,
  t: PageContentBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  const isDark = t.isDark;
  return {
    background: getPageContentBoxBackground(brand, isDark),
    border: `1px solid ${t.cardBorder}`,
    borderRadius: getPageContentBoxRadius(isDark),
    boxShadow: getPageContentBoxShadow(isDark),
    ...overrides,
  };
}

/** Bloco de conteúdo de página (secção KPI consolidado, tabela, gráfico, etc.). */
export function getPageContentBoxStyle(
  brand: PageContentBoxBrand,
  t: PageContentBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  return {
    ...getPageContentBoxShellStyle(brand, t),
    padding: 20,
    marginBottom: PAGE_CONTENT_BOX_GAP,
    ...overrides,
  };
}

/** Barra de filtros / abas no topo. Operadora: tokens de marca; Spin light: caixa branca. */
export function getPageFilterBoxStyle(
  brand: PageContentBoxBrand,
  t: PageContentBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  const isDark = t.isDark;
  const radius = getPageContentBoxRadius(isDark);
  const shadow = getPageContentBoxShadow(isDark);

  if (brand.useBrand) {
    return {
      borderRadius: radius,
      border: brand.primaryTransparentBorder,
      background: brand.primaryTransparentBg,
      padding: "12px 20px",
      boxShadow: shadow,
      marginBottom: PAGE_CONTENT_BOX_GAP,
      ...overrides,
    };
  }

  if (isDark) {
    return {
      borderRadius: radius,
      border: brand.primaryTransparentBorder,
      background: brand.primaryTransparentBg,
      padding: "12px 20px",
      boxShadow: shadow,
      marginBottom: PAGE_CONTENT_BOX_GAP,
      ...overrides,
    };
  }

  return {
    borderRadius: radius,
    border: `1px solid ${t.cardBorder}`,
    background: "#ffffff",
    padding: "12px 20px",
    boxShadow: shadow,
    marginBottom: PAGE_CONTENT_BOX_GAP,
    ...overrides,
  };
}

/**
 * Opção A — grelha de KPIs no topo sem caixa pai: só o gap de 14px até o próximo bloco.
 * Quando a secção virar “KPIs Consolidados” (caixa única), usar `getPageContentBoxStyle` no wrapper.
 */
export function getPageKpiSectionGapStyle(overrides?: CSSProperties): CSSProperties {
  return { marginBottom: PAGE_CONTENT_BOX_GAP, ...overrides };
}
