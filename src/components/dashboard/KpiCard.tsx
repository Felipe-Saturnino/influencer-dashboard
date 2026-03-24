import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { fmtBRL } from "../../lib/dashboardHelpers";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

interface Props {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentVar: string;
  accentColor: string;
  atual: number;
  anterior: number;
  isBRL?: boolean;
  isHistorico?: boolean;
  subValue?: { label: string; value: string };
}

export default function KpiCard({
  label,
  value,
  icon,
  accentVar,
  accentColor,
  atual,
  anterior,
  isBRL,
  isHistorico,
  subValue,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const isCusto =
    label.toLowerCase().includes("custo") || label.toLowerCase().includes("invest");
  const positivo = isCusto ? !up : up;
  const corSeta = positivo ? "var(--brand-success)" : "var(--brand-danger)";

  // Secundária: faixa e ícones dos KPIs
  const barColor = brand.useBrand ? "var(--brand-secondary)" : accentColor;
  const barBg = `linear-gradient(90deg, ${barColor}, transparent)`;
  const iconBoxBg = brand.useBrand ? "color-mix(in srgb, var(--brand-secondary) 10%, transparent)" : `${accentColor}18`;
  const iconBoxBorder = brand.useBrand ? "1px solid color-mix(in srgb, var(--brand-secondary) 22%, transparent)" : `1px solid ${accentColor}35`;
  const iconBoxColor = brand.useBrand ? "var(--brand-secondary)" : accentColor;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
        transition: "box-shadow 0.2s",
      }}
    >
      <div style={{ height: 3, background: barBg }} />
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
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
              color: iconBoxColor,
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
              textTransform: "uppercase" as const,
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
            marginBottom: subValue ? 4 : 6,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {subValue && (
          <div
            style={{
              fontSize: 12,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 6,
            }}
          >
            <span style={{ color: t.text, fontWeight: 600 }}>{subValue.value}</span>{" "}
            {subValue.label}
          </div>
        )}
        {!isHistorico && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontFamily: FONT.body,
            }}
          >
            <span
              style={{
                color: corSeta,
                fontWeight: 700,
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              {up ? "↑" : "↓"} {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}
            </span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>
              vs {isBRL ? fmtBRL(anterior) : anterior.toLocaleString("pt-BR")} mês ant.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
