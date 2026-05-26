import type { CSSProperties } from "react";

/** Teste visual — espaçamento entre blocos de primeiro nível na Overview Spin. */
export const OVERVIEW_SPIN_BOX_GAP = 14;

type OverviewSpinBoxBrand = {
  useBrand: boolean;
  blockBg: string;
  primaryTransparentBg: string;
  primaryTransparentBorder: string;
};

type OverviewSpinBoxTheme = {
  isDark: boolean;
  cardBorder: string;
};

export function getOverviewSpinBoxShadow(isDark: boolean): string {
  return isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
}

/** Dark: r18 (card atual). Light: r14 (filtro atual) — unificado por modo. */
export function getOverviewSpinBoxRadius(isDark: boolean): number {
  return isDark ? 18 : 14;
}

/** Shell de caixa (borda, raio, sombra, fundo) — sem padding/margin de bloco de página. */
export function getOverviewSpinBoxShellStyle(
  brand: OverviewSpinBoxBrand,
  t: OverviewSpinBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  const isDark = t.isDark;
  const background = isDark
    ? brand.blockBg
    : brand.useBrand
      ? brand.blockBg
      : "#ffffff";

  return {
    background,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: getOverviewSpinBoxRadius(isDark),
    boxShadow: getOverviewSpinBoxShadow(isDark),
    ...overrides,
  };
}

/** Blocos de conteúdo (KPIs, tabelas, comparativos, posicionamento). */
export function getOverviewSpinContentBoxStyle(
  brand: OverviewSpinBoxBrand,
  t: OverviewSpinBoxTheme,
  overrides?: CSSProperties,
): CSSProperties {
  return {
    ...getOverviewSpinBoxShellStyle(brand, t),
    padding: 20,
    marginBottom: OVERVIEW_SPIN_BOX_GAP,
    ...overrides,
  };
}

/** Strip de filtros + abas. Operadora: mantém tokens de marca; Spin light: caixa branca alinhada ao conteúdo. */
export function getOverviewSpinFilterBoxStyle(
  brand: OverviewSpinBoxBrand,
  t: OverviewSpinBoxTheme,
): CSSProperties {
  const isDark = t.isDark;
  const radius = getOverviewSpinBoxRadius(isDark);
  const shadow = getOverviewSpinBoxShadow(isDark);

  if (brand.useBrand) {
    return {
      borderRadius: radius,
      border: brand.primaryTransparentBorder,
      background: brand.primaryTransparentBg,
      padding: "12px 20px",
      boxShadow: shadow,
      marginBottom: OVERVIEW_SPIN_BOX_GAP,
    };
  }

  if (isDark) {
    return {
      borderRadius: radius,
      border: brand.primaryTransparentBorder,
      background: brand.primaryTransparentBg,
      padding: "12px 20px",
      boxShadow: shadow,
      marginBottom: OVERVIEW_SPIN_BOX_GAP,
    };
  }

  return {
    borderRadius: radius,
    border: `1px solid ${t.cardBorder}`,
    background: "#ffffff",
    padding: "12px 20px",
    boxShadow: shadow,
    marginBottom: OVERVIEW_SPIN_BOX_GAP,
  };
}
