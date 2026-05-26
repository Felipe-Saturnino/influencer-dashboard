import type { ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { resolveWhitelabelAccentCss } from "../../../../lib/whitelabelAccent";
import { HOME_KPI_BREAKDOWN_LIST, HOME_KPI_BREAKDOWN_ROW } from "./homeSharedUi";

export type HomeKpiBreakdownItem = {
  label: string;
  value: string;
};

export type HomeKpiComparativoMensal = {
  anteriorFmt: string;
  pctLabel: string;
  up: boolean;
};

export function HomeKpiCard({
  label,
  value,
  icon,
  accentVar = "--brand-primary",
  breakdown,
  comparativoMensal,
}: {
  label: string;
  value?: string;
  icon: ReactNode;
  accentVar?: string;
  breakdown?: HomeKpiBreakdownItem[];
  comparativoMensal?: HomeKpiComparativoMensal | null;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const token = brand.useBrand ? resolveWhitelabelAccentCss(accentVar) : `var(${accentVar}, #7c3aed)`;

  const corPositivo = "var(--brand-success, #22c55e)";
  const corNegativo = "var(--brand-danger, #e84025)";

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `color-mix(in srgb, ${token} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${token} 22%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: token,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span
            style={{
              color: t.textMuted,
              fontSize: 10,
              fontFamily: FONT.body,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        {value != null && value !== "" ? (
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT.body, lineHeight: 1.1 }}>
            {value}
          </div>
        ) : null}
        {comparativoMensal ? (
          <div
            style={{
              marginTop: value != null && value !== "" ? 12 : 4,
              paddingTop: 10,
              borderTop: `1px solid ${t.cardBorder}`,
              fontFamily: FONT.body,
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ color: t.textMuted }}>Mês anterior</span>
              <span style={{ color: t.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {comparativoMensal.anteriorFmt}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  color: comparativoMensal.up ? corPositivo : corNegativo,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {comparativoMensal.up ? "↑" : "↓"} {comparativoMensal.pctLabel}
              </span>
              <span style={{ color: t.textMuted, fontSize: 10 }}>vs mês anterior</span>
            </div>
          </div>
        ) : null}
        {breakdown && breakdown.length > 0 ? (
          <ul style={{ ...HOME_KPI_BREAKDOWN_LIST, marginTop: value != null && value !== "" ? 12 : 4 }}>
            {breakdown.map((item) => (
              <li key={item.label} style={HOME_KPI_BREAKDOWN_ROW}>
                <span style={{ color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                <span
                  style={{
                    color: t.text,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
