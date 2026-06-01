import type { CSSProperties } from "react";
import { FONT_TITLE } from "../../../../lib/dashboardConstants";
import { FONT } from "../../../../constants/theme";

export const HOME_INVESTIDOR_SECTION_TITLE: CSSProperties = {
  margin: "0 0 14px 0",
  fontSize: 13,
  fontWeight: 800,
  color: "inherit",
  fontFamily: FONT_TITLE,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export function homeInvestidorSectionTitleStyle(sectionColor: string): CSSProperties {
  return { ...HOME_INVESTIDOR_SECTION_TITLE, color: sectionColor };
}

export const HOME_INVESTIDOR_BODY_MUTED: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  fontFamily: FONT.body,
};

export const HOME_INVESTIDOR_OPERADORA_LIST: CSSProperties = {
  listStyle: "none",
  margin: "12px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const HOME_INVESTIDOR_OPERADORA_ROW: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 10,
  fontSize: 12,
  fontFamily: FONT.body,
};

export const HOME_INVESTIDOR_LINK_BUTTON: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  fontWeight: 700,
  color: "var(--brand-primary, #7c3aed)",
  textDecoration: "underline",
  cursor: "pointer",
};

export const HOME_INVESTIDOR_FOOTER_HINT: CSSProperties = {
  margin: "16px 0 0",
  fontSize: 13,
  color: "inherit",
  fontFamily: FONT.body,
  lineHeight: 1.5,
};
