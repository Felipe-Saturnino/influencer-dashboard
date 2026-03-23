import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { BRAND, FONT_TITLE } from "../../lib/dashboardConstants";

interface Props {
  icon: React.ReactNode;
  children: React.ReactNode;
  sub?: React.ReactNode;
  useBrand?: boolean;
}

export default function SectionTitle({ icon, children, sub, useBrand }: Props) {
  const { theme: t, operadoraBrand } = useApp();
  const titleColor = useBrand ? "var(--brand-primary)" : t.text;
  const iconBg = useBrand
    ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)"
    : "rgba(74,32,130,0.18)";
  const iconBorder = useBrand
    ? "1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)"
    : "1px solid rgba(74,32,130,0.30)";
  const iconColor = useBrand ? "var(--brand-primary)" : BRAND.ciano;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: iconBg,
          border: iconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: titleColor,
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
      {useBrand && operadoraBrand && (operadoraBrand.logo_url || operadoraBrand.nome) && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px 3px 6px",
            borderRadius: 999,
            border: "1px solid color-mix(in srgb, var(--brand-primary) 28%, transparent)",
            background: "color-mix(in srgb, var(--brand-primary) 8%, transparent)",
          }}
        >
          {operadoraBrand.logo_url && (
            <img
              src={operadoraBrand.logo_url}
              alt={operadoraBrand.nome ?? ""}
              style={{
                width: 16,
                height: 16,
                objectFit: "contain",
                borderRadius: 3,
                flexShrink: 0,
              }}
            />
          )}
          {operadoraBrand.nome && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--brand-primary)",
                fontFamily: FONT.body,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                whiteSpace: "nowrap" as const,
              }}
            >
              {operadoraBrand.nome}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
