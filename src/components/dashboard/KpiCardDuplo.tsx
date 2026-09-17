import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import { resolveWhitelabelAccentCss } from "../../lib/whitelabelAccent";

export type KpiCardDuploValor = {
  label: string;
  valor: number;
  anterior: number;
  exibicao: string;
  isInverso?: boolean;
};

export type KpiCardDuploProps = {
  label: string;
  icon: ReactNode;
  accentColor: string;
  accentVar?: "--brand-action" | "--brand-contrast" | "--brand-icon-color";
  esquerdo: KpiCardDuploValor;
  direito: KpiCardDuploValor;
  isHistorico?: boolean;
};

function Comparativo({
  valor,
  anterior,
  isInverso,
}: Pick<KpiCardDuploValor, "valor" | "anterior" | "isInverso">) {
  const diff = valor - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const subiu = diff >= 0;
  const positivo = isInverso ? !subiu : subiu;
  const Icon = subiu ? TrendingUp : TrendingDown;

  return (
    <div style={{ fontSize: 10, fontFamily: FONT.body }}>
      <span
        style={{
          color: positivo ? "var(--brand-success)" : "var(--brand-danger)",
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          fontWeight: 700,
        }}
      >
        <Icon size={11} aria-hidden />
        {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

export default function KpiCardDuplo({
  label,
  icon,
  accentColor,
  accentVar,
  esquerdo,
  direito,
  isHistorico,
}: KpiCardDuploProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const useBrandToken = brand.useBrand && accentVar != null;
  const accent = useBrandToken ? resolveWhitelabelAccentCss(accentVar) : accentColor;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `color-mix(in srgb, ${accent} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accent,
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[esquerdo, direito].map((item, index) => (
            <div
              key={item.label}
              style={index === 1 ? { borderLeft: `1px solid ${t.cardBorder}`, paddingLeft: 10 } : undefined}
            >
              <div
                style={{
                  fontSize: 10,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: index === 0 ? 20 : 14,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: FONT.body,
                  marginBottom: 4,
                  lineHeight: index === 0 ? 1.1 : 1.55,
                }}
              >
                {item.exibicao}
              </div>
              {!isHistorico && <Comparativo {...item} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
