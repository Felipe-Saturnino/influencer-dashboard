import type { ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { resolveWhitelabelAccentCss } from "../../../lib/whitelabelAccent";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";

type Props = {
  label: string;
  value: string;
  icon: ReactNode;
  accentVar?: string;
  accentColor: string;
  /** Valor do mês anterior (linha inferior, sem %). */
  anteriorLabel: string;
  isInverso?: boolean;
  atual: number;
  anterior: number;
};

/** KPI do Headcount: MoM só com seta + valor do mês anterior (sem percentual). */
export function HeadcountKpiCard({
  label,
  value,
  icon,
  accentVar,
  accentColor,
  anteriorLabel,
  isInverso,
  atual,
  anterior,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const diff = atual - anterior;
  const up = diff >= 0;
  const positivo = isInverso === true ? !up : up;
  const corSeta = positivo ? "var(--brand-success)" : "var(--brand-danger)";

  const useBrandToken = brand.useBrand && accentVar != null && accentVar !== "";
  const tokenOrAccent = useBrandToken ? resolveWhitelabelAccentCss(accentVar) : accentColor;
  const barColor = tokenOrAccent;
  const barBg = `linear-gradient(90deg, ${barColor}, transparent)`;
  const iconBoxBg = useBrandToken
    ? `color-mix(in srgb, ${tokenOrAccent} 10%, transparent)`
    : `${accentColor}18`;
  const iconBoxBorder = useBrandToken
    ? `1px solid color-mix(in srgb, ${tokenOrAccent} 22%, transparent)`
    : `1px solid ${accentColor}35`;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: barBg }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: iconBoxBg,
              border: iconBoxBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tokenOrAccent,
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
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT.body,
            marginBottom: 6,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
          <span style={{ color: corSeta, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>
            {up ? "↑" : "↓"}
          </span>
          <span style={{ color: t.textMuted, fontSize: 10 }}>
            vs {anteriorLabel} · mês ant.
          </span>
        </div>
      </div>
    </div>
  );
}
