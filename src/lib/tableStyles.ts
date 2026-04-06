import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";

/** Campos mínimos do tema para estilos de tabela compartilhados. */
export type TableThemePick = { cardBorder: string; textMuted: string; text: string };

export function getThStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    textAlign: "left",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: t.textMuted,
    fontWeight: 600,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.10)",
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function getTdStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid color-mix(in srgb, ${t.cardBorder} 45%, transparent)`,
    color: t.text,
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function getTdNumStyle(t: TableThemePick, extra?: CSSProperties): CSSProperties {
  return {
    ...getTdStyle(t, extra),
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  };
}

export const zebraStripe = (i: number): string =>
  i % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent";

export const TOTAL_ROW_BG = "rgba(74,32,130,0.12)";
