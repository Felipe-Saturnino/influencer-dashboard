import type { CSSProperties, ReactNode } from "react";
import { FONT } from "../../constants/theme";
import { FONT_TITLE } from "../../lib/dashboardConstants";

/** Campos de `useDashboardBrand()` usados no cabeçalho. */
export type DashboardPageHeaderBrand = {
  primary: string;
  primaryIconBg: string;
  primaryIconBorder: string;
  primaryIconColor: string;
};

export type DashboardPageHeaderTheme = {
  textMuted: string;
};

export interface DashboardPageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  brand: DashboardPageHeaderBrand;
  t: DashboardPageHeaderTheme;
  /** Ações à direita (ex.: Nova Live, + Adicionar). Layout alinhado aos dashboards com CTA. */
  right?: ReactNode;
}

/**
 * Cabeçalho de página (ícone + título + subtítulo), mesmo padrão visual das páginas da seção Dashboards.
 */
export function DashboardPageHeader({ icon, title, subtitle, brand, t, right }: DashboardPageHeaderProps) {
  const iconBox: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: brand.primaryIconBg,
    border: brand.primaryIconBorder,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: brand.primaryIconColor,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 18,
        flexWrap: "wrap",
        ...(right ? { justifyContent: "space-between", rowGap: 12 } : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          minWidth: 0,
          ...(right ? { flex: "1 1 240px" } : {}),
        }}
      >
        <div style={iconBox}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: brand.primary,
              fontFamily: FONT_TITLE,
              margin: 0,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {title}
          </h1>
          <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>{subtitle}</p>
        </div>
      </div>
      {right != null ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}
