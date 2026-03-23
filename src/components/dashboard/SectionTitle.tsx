import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { FONT_TITLE } from "../../lib/dashboardConstants";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

interface Props {
  icon: React.ReactNode;
  children: React.ReactNode;
  sub?: React.ReactNode;
}

export default function SectionTitle({ icon, children, sub }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.primaryIconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
        }}
      >
        {children}
      </span>
      {sub && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: t.textMuted,
            fontFamily: FONT.body,
            marginLeft: 4,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
