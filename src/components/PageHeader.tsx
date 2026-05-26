import { useApp } from "../context/AppContext";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import {
  getPageHeaderIconBoxStyle,
  getPageHeaderOuterStyle,
  getPageHeaderSubtitleStyle,
  getPageHeaderTitleRowStyle,
  getPageHeaderTitleStyle,
} from "../lib/pageHeaderStyles";

export interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Cabeçalho canónico de páginas logadas — ícone 32×32 + título 18px + subtítulo 13px. */
export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={getPageHeaderOuterStyle(!!actions)}>
      <div style={{ minWidth: 0, flex: actions ? "1 1 240px" : undefined }}>
        <div style={getPageHeaderTitleRowStyle(!!actions)}>
          <div style={getPageHeaderIconBoxStyle(brand)}>{icon}</div>
          <h1 style={getPageHeaderTitleStyle(brand)}>{title}</h1>
        </div>
        {subtitle ? <p style={getPageHeaderSubtitleStyle(t)}>{subtitle}</p> : null}
      </div>
      {actions ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>
      ) : null}
    </div>
  );
}
