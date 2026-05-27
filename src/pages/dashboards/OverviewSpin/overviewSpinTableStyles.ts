import type { CSSProperties } from "react";
import { getThStyle, getTdStyle, type TableThemePick } from "../../../lib/tableStyles";

/** Raio das tabelas Overview Spin (alinha a Gestão de Mesas / Financeiro — não `getPageContentBoxRadius`). */
export const OVERVIEW_SPIN_TABLE_RADIUS = 14;

export type OverviewSpinTableBrand = {
  useBrand: boolean;
  blockBg: string;
};

export type OverviewSpinTableTheme = TableThemePick & {
  cardBg: string;
  isDark: boolean;
};

/** Wrapper de scroll — raio aqui; **não** `overflow: hidden` na `<table>` (quebra coluna sticky). */
export function getOverviewSpinTableWrapStyle(extra?: CSSProperties): CSSProperties {
  return {
    borderRadius: OVERVIEW_SPIN_TABLE_RADIUS,
    ...extra,
  };
}

export function getOverviewSpinTableStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    ...extra,
  };
}

export function createOverviewSpinStickyCol(
  t: OverviewSpinTableTheme,
  brand: OverviewSpinTableBrand,
  tdPadding = "9px 12px",
) {
  const colBg = brand.blockBg ?? t.cardBg;
  const shadow = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";
  const thBase = getThStyle(t, { verticalAlign: "middle" });
  const tdBase = getTdStyle(t, { padding: tdPadding });

  const opaqueZebra = (
    i: number,
    accent: "secondary" | "contrast" | "action" = brand.useBrand ? "contrast" : "secondary",
  ) => {
    if (i % 2 === 0) return colBg;
    const token =
      accent === "contrast"
        ? "var(--brand-contrast, #1e36f8)"
        : accent === "action"
          ? "var(--brand-action, #7c3aed)"
          : "var(--brand-secondary, #4a2082)";
    return `color-mix(in srgb, ${colBg} 92%, ${token} 8%)`;
  };

  const totalRowBg = `color-mix(in srgb, ${colBg} 88%, var(--brand-${brand.useBrand ? "contrast" : "secondary"}, ${brand.useBrand ? "#1e36f8" : "#4a2082"}) 12%)`;

  const thSticky = (minWidth = 100): CSSProperties => ({
    ...thBase,
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 4,
    minWidth,
    background: colBg,
    boxShadow: shadow,
  });

  const tdSticky = (opts?: {
    rowIndex?: number;
    fontWeight?: number;
    background?: string;
    paddingLeft?: number;
    stripeAccent?: "secondary" | "contrast" | "action";
    minWidth?: number;
  }): CSSProperties => {
    const bg =
      opts?.background ??
      (opts?.rowIndex != null
        ? opaqueZebra(opts.rowIndex, opts?.stripeAccent ?? (brand.useBrand ? "contrast" : "secondary"))
        : colBg);
    return {
      ...tdBase,
      position: "sticky",
      left: 0,
      zIndex: 2,
      minWidth: opts?.minWidth ?? 100,
      fontWeight: opts?.fontWeight ?? 600,
      background: bg,
      boxShadow: shadow,
      ...(opts?.paddingLeft != null ? { paddingLeft: opts.paddingLeft } : {}),
    };
  };

  return {
    thBase,
    colBg,
    shadow,
    opaqueZebra,
    totalRowBg,
    thSticky,
    tdSticky,
  };
}
