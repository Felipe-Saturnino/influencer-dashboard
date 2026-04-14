import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { FONT } from "../constants/theme";
import { FONT_TITLE } from "../lib/dashboardConstants";

export interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Cabeçalho padrão de páginas operacionais (28×28 + h1 22px), alinhado a Campanhas / Gestão de Dealers.
 */
export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
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
          }}
        >
          {icon}
        </div>
        <div>
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
          {subtitle ? (
            <p
              style={{
                color: t.textMuted,
                marginTop: 5,
                fontFamily: FONT.body,
                fontSize: 13,
                margin: "5px 0 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>
      ) : null}
    </div>
  );
}
