import type { CSSProperties } from "react";
import type { Theme } from "../constants/theme";
import { FONT } from "../constants/theme";
import { FONT_TITLE } from "./dashboardConstants";

/** Badge do ícone no cabeçalho de página (Global + Brand §4). */
export const PAGE_HEADER_ICON_BOX = 32;
export const PAGE_HEADER_ICON_RADIUS = 9;
export const PAGE_HEADER_ICON_INNER = 16;
export const PAGE_HEADER_ICON_TITLE_GAP = 8;

/** Tipografia canónica do cabeçalho de página. */
export const PAGE_HEADER_TITLE_FONT_SIZE = 18;
export const PAGE_HEADER_SUBTITLE_FONT_SIZE = 13;

/** Espaço entre o bloco título+subtítulo e o próximo bloco (referência: Afiliados). */
export const PAGE_HEADER_MARGIN_BOTTOM = 18;

/** Alinha subtítulo com o início do h1 (32 + gap 8). */
export const PAGE_HEADER_SUBTITLE_PADDING_LEFT =
  PAGE_HEADER_ICON_BOX + PAGE_HEADER_ICON_TITLE_GAP;

export const PAGE_HEADER_ICON_PROPS = {
  size: PAGE_HEADER_ICON_INNER,
  "aria-hidden": true as const,
};

export type PageHeaderBrand = {
  primary: string;
  primaryIconBg: string;
  primaryIconBorder: string;
  primaryIconColor: string;
};

export function getPageHeaderIconBoxStyle(brand: PageHeaderBrand): CSSProperties {
  return {
    width: PAGE_HEADER_ICON_BOX,
    height: PAGE_HEADER_ICON_BOX,
    borderRadius: PAGE_HEADER_ICON_RADIUS,
    background: brand.primaryIconBg,
    border: brand.primaryIconBorder,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: brand.primaryIconColor,
  };
}

export function getPageHeaderTitleStyle(brand: PageHeaderBrand): CSSProperties {
  return {
    fontSize: PAGE_HEADER_TITLE_FONT_SIZE,
    fontWeight: 800,
    color: brand.primary,
    fontFamily: FONT_TITLE,
    margin: 0,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };
}

export function getPageHeaderSubtitleStyle(t: Pick<Theme, "textMuted">): CSSProperties {
  return {
    color: t.textMuted,
    fontFamily: FONT.body,
    fontSize: PAGE_HEADER_SUBTITLE_FONT_SIZE,
    margin: "5px 0 0",
    paddingLeft: PAGE_HEADER_SUBTITLE_PADDING_LEFT,
    lineHeight: 1.45,
  };
}

export function getPageHeaderOuterStyle(hasRight?: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: hasRight ? "space-between" : undefined,
    gap: 14,
    marginBottom: PAGE_HEADER_MARGIN_BOTTOM,
    flexWrap: "wrap",
    ...(hasRight ? { rowGap: 12 } : {}),
  };
}

export function getPageHeaderTitleRowStyle(hasRight?: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: PAGE_HEADER_ICON_TITLE_GAP,
    minWidth: 0,
    flex: hasRight ? "1 1 240px" : undefined,
  };
}
