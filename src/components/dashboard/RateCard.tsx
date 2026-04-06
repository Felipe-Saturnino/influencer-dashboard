import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import { FONT } from "../../constants/theme";
import { BRAND } from "../../lib/dashboardConstants";

export function RateCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean | "purple";
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const highlightColor = highlight
    ? brand.useBrand
      ? "var(--brand-accent)"
      : highlight === "purple"
        ? BRAND.roxoVivo
        : BRAND.azul
    : null;

  const border = highlightColor
    ? brand.useBrand
      ? "1px solid color-mix(in srgb, var(--brand-accent) 28%, transparent)"
      : `1px solid ${highlightColor}44`
    : `1px solid ${t.cardBorder}`;
  const bg = highlightColor
    ? brand.useBrand
      ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)"
      : `${highlightColor}12`
    : "transparent";

  return (
    <div
      role="region"
      aria-label={label}
      style={{ padding: "10px 14px", borderRadius: 10, border, background: bg }}
    >
      <div
        style={{
          fontSize: 10,
          color: t.textMuted,
          fontFamily: FONT.body,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: highlightColor ?? t.text,
          margin: "5px 0 0",
          fontFamily: FONT.body,
        }}
      >
        {value}
      </div>
    </div>
  );
}
