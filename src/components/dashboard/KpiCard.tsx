import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { fmtBRL } from "../../lib/dashboardHelpers";
import { resolveWhitelabelAccentCss } from "../../lib/whitelabelAccent";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

interface Props {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Token CSS (ex: `--brand-action`); no whitelabel, mapeado para contraste/ação conforme tabela. */
  accentVar?: string;
  accentColor: string;
  atual: number;
  anterior: number;
  isBRL?: boolean;
  isHistorico?: boolean;
  subValue?: { label: string; value: string };
  /** Quando true, queda no valor é considerada “positiva” (ex.: saques, WD ratio). */
  isInverso?: boolean;
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
  isInverso,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const isCusto =
    label.toLowerCase().includes("custo") || label.toLowerCase().includes("invest");
  const positivo =
    isInverso === true ? !up : isCusto ? !up : up;
  const corSeta = positivo ? "var(--brand-success)" : "var(--brand-danger)";

  /** Sem `accentVar`: barra/ícone seguem `accentColor` (ex.: GGR verde/vermelho, margem âmbar). */
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
  const iconBoxColor = tokenOrAccent;

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
              vs {isBRL ? fmtBRL(anterior) : anterior.toLocaleString("pt-BR")} · mesmo período mês ant.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
