/**
 * Padrão canónico de tabelas de dados em bloco (nível 3).
 * Referência visual e de código: Overview Spin → Detalhamento Diário.
 *
 * Exceções por página devem ser documentadas no MDC da secção.
 */
import type { CSSProperties } from "react";
import { getThStyle, getThStyleBrandAction, getTdStyle, type TableThemePick } from "./tableStyles";

/** Raio do wrapper de scroll — não usar `getPageContentBoxRadius` na `<table>`. */
export const DATA_TABLE_RADIUS = 14;

/** Padding de células (cabeçalho e corpo). */
export const DATA_TABLE_CELL_PADDING = "9px 12px";

export type DataTableBrand = {
  useBrand: boolean;
  blockBg: string;
};

export type DataTableTheme = TableThemePick & {
  cardBg: string;
  isDark: boolean;
};

/** Raio no wrapper; scroll horizontal em `app-table-wrap--sticky-col`. */
export function getDataTableWrapStyle(extra?: CSSProperties): CSSProperties {
  return {
    borderRadius: DATA_TABLE_RADIUS,
    ...extra,
  };
}

/** `<table>` — sem `overflow: hidden` (quebra `position: sticky` na 1ª coluna). */
export function getDataTableStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    ...extra,
  };
}

function headerBgOpaque(t: DataTableTheme, brand: DataTableBrand, colBg: string): string {
  if (brand.useBrand) {
    return `color-mix(in srgb, ${colBg} 86%, var(--brand-action, #7c3aed) 14%)`;
  }
  return t.isDark
    ? `color-mix(in srgb, ${colBg} 82%, var(--brand-action, #7c3aed) 18%)`
    : `color-mix(in srgb, ${colBg} 86%, var(--brand-action, #7c3aed) 14%)`;
}

function zebraRowBg(
  t: DataTableTheme,
  brand: DataTableBrand,
  colBg: string,
  i: number,
  accent: "secondary" | "contrast" | "action" = brand.useBrand ? "contrast" : "secondary",
): string {
  const token =
    accent === "contrast"
      ? "var(--brand-contrast, #1e36f8)"
      : accent === "action"
        ? "var(--brand-action, #7c3aed)"
        : "var(--brand-secondary, #4a2082)";

  if (brand.useBrand) {
    return i % 2 === 0
      ? `color-mix(in srgb, ${colBg} 94%, ${token} 6%)`
      : `color-mix(in srgb, ${colBg} 88%, ${token} 12%)`;
  }
  if (t.isDark) {
    return i % 2 === 0
      ? `color-mix(in srgb, ${colBg} 90%, ${token} 10%)`
      : `color-mix(in srgb, ${colBg} 82%, ${token} 18%)`;
  }
  return i % 2 === 0 ? colBg : `color-mix(in srgb, ${colBg} 92%, ${token} 8%)`;
}

/**
 * Estilos do bloco de tabela padrão (cabeçalho, corpo centralizado, zebra opaca).
 * `useDashboardBrand()` + `useApp().theme` como argumentos.
 */
export function createDataTableBlockStyles(t: DataTableTheme, brand: DataTableBrand) {
  const colBg = brand.blockBg ?? t.cardBg;
  const shadow = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";
  const headerBg = headerBgOpaque(t, brand, colBg);

  const thHeader: CSSProperties = {
    ...(brand.useBrand ? getThStyleBrandAction : getThStyle)(t, { verticalAlign: "middle" }),
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    background: headerBg,
  };

  const thHeaderSticky: CSSProperties = {
    ...thHeader,
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 4,
    minWidth: 100,
    boxShadow: shadow,
  };

  /** Segunda linha de cabeçalho (ex.: subcolunas Total / jogo) — mesmo fundo; rótulos sem uppercase. */
  const thHeaderSub: CSSProperties = {
    ...thHeader,
    textTransform: "none",
    letterSpacing: "0.04em",
  };

  const thHeaderSubSticky: CSSProperties = {
    ...thHeaderSticky,
    textTransform: "none",
    letterSpacing: "0.04em",
  };

  const tdCenter: CSSProperties = {
    ...getTdStyle(t, { padding: DATA_TABLE_CELL_PADDING, textAlign: "center" }),
    fontVariantNumeric: "tabular-nums",
  };

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
        ? zebraRowBg(t, brand, colBg, opts.rowIndex, opts.stripeAccent ?? (brand.useBrand ? "contrast" : "secondary"))
        : colBg);
    return {
      ...tdCenter,
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

  const zebraRow = (i: number, accent?: "secondary" | "contrast" | "action") =>
    zebraRowBg(t, brand, colBg, i, accent ?? (brand.useBrand ? "contrast" : "secondary"));

  const totalRowBg = `color-mix(in srgb, ${colBg} 88%, var(--brand-${brand.useBrand ? "contrast" : "secondary"}, ${brand.useBrand ? "#1e36f8" : "#4a2082"}) 12%)`;

  /** Linha Total — tom mais forte que zebra; corpo em negrito. */
  const totalRowBgStrong = brand.useBrand
    ? `color-mix(in srgb, ${colBg} 82%, var(--brand-contrast, #1e36f8) 18%)`
    : t.isDark
      ? `color-mix(in srgb, ${colBg} 76%, var(--brand-action, #7c3aed) 24%)`
      : `color-mix(in srgb, ${colBg} 82%, var(--brand-secondary, #4a2082) 18%)`;

  const tdTotal: CSSProperties = {
    ...tdCenter,
    fontWeight: 700,
    background: totalRowBgStrong,
  };

  const tdTotalSticky = (opts?: { minWidth?: number }): CSSProperties => ({
    ...tdSticky({ background: totalRowBgStrong, fontWeight: 700, minWidth: opts?.minWidth }),
  });

  return {
    thHeader,
    thHeaderSticky,
    thHeaderSub,
    thHeaderSubSticky,
    tdCenter,
    tdSticky,
    tdTotal,
    tdTotalSticky,
    zebraRow,
    totalRowBg,
    totalRowBgStrong,
    shadow,
    colBg,
  };
}

/** 1ª coluna fixa no scroll horizontal (mesas, comparativos largos). */
export function createDataTableStickyCol(
  t: DataTableTheme,
  brand: DataTableBrand,
  tdPadding = DATA_TABLE_CELL_PADDING,
) {
  const colBg = brand.blockBg ?? t.cardBg;
  const shadow = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";
  const thBase = getThStyle(t, { verticalAlign: "middle" });
  const tdBase = getTdStyle(t, { padding: tdPadding });

  const opaqueZebra = (
    i: number,
    accent: "secondary" | "contrast" | "action" = brand.useBrand ? "contrast" : "secondary",
  ) => zebraRowBg(t, brand, colBg, i, accent);

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

  const tdStickyLegacy = (opts?: {
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
    totalRowBg: `color-mix(in srgb, ${colBg} 88%, var(--brand-${brand.useBrand ? "contrast" : "secondary"}, ${brand.useBrand ? "#1e36f8" : "#4a2082"}) 12%)`,
    thSticky,
    tdSticky: tdStickyLegacy,
  };
}
