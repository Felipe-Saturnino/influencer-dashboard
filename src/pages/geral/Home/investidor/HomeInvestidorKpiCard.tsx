import type { ReactNode } from "react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { resolveWhitelabelAccentCss } from "../../../../lib/whitelabelAccent";
import {
  HOME_INVESTIDOR_OPERADORA_LIST,
  HOME_INVESTIDOR_OPERADORA_ROW,
} from "./homeInvestidorUi";

export type HomeInvestidorKpiBreakdownItem = {
  label: string;
  value: string;
};

export function HomeInvestidorKpiCard({
  label,
  value,
  icon,
  accentVar = "--brand-primary",
  breakdown,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accentVar?: string;
  breakdown?: HomeInvestidorKpiBreakdownItem[];
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const token = brand.useBrand ? resolveWhitelabelAccentCss(accentVar) : `var(${accentVar}, #7c3aed)`;

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
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT.body, lineHeight: 1.1 }}>
          {value}
        </div>
        {breakdown && breakdown.length > 0 ? (
          <ul style={HOME_INVESTIDOR_OPERADORA_LIST}>
            {breakdown.map((item) => (
              <li key={item.label} style={HOME_INVESTIDOR_OPERADORA_ROW}>
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
