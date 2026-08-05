import type { ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";

type MetricSide = {
  label: string;
  value: string;
  atual: number | null;
  anterior: number | null;
  /** Quando true, queda é positiva (ex.: Velocidade / Tempo de Reação). */
  isInverso?: boolean;
};

type Props = {
  title: string;
  icon: ReactNode;
  accentHex: string;
  left: MetricSide;
  right: MetricSide;
  isHistorico?: boolean;
};

function MomLine({
  atual,
  anterior,
  isInverso,
  isHistorico,
}: {
  atual: number | null;
  anterior: number | null;
  isInverso?: boolean;
  isHistorico?: boolean;
}) {
  if (isHistorico || atual == null) return null;
  const ant = anterior ?? 0;
  const diff = atual - ant;
  const pct = ant !== 0 ? (diff / Math.abs(ant)) * 100 : null;
  const up = diff >= 0;
  const bom = isInverso ? !up : up;
  return (
    <div style={{ fontSize: 10, fontFamily: FONT.body }}>
      <span style={{ color: bom ? "#22c55e" : "#e84025", fontWeight: 700 }}>
        {up ? "↑" : "↓"} {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}
      </span>
    </div>
  );
}

/** Card com duas métricas lado a lado (ex.: Velocidade | Tempo de Reação; Bola | Cilindro). */
export function OverviewPrestadorKpiDuplaCard({
  title,
  icon,
  accentHex,
  left,
  right,
  isHistorico,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const iconBoxBg = `color-mix(in srgb, ${accentHex} 12%, transparent)`;
  const iconBoxBorder = `1px solid color-mix(in srgb, ${accentHex} 28%, transparent)`;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentHex}, transparent)` }} />
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
              color: accentHex,
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
            {title}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
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
              {left.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                marginBottom: 4,
              }}
            >
              {left.value}
            </div>
            <MomLine
              atual={left.atual}
              anterior={left.anterior}
              isInverso={left.isInverso}
              isHistorico={isHistorico}
            />
          </div>
          <div style={{ borderLeft: `1px solid ${t.cardBorder}`, paddingLeft: 10 }}>
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
              {right.label}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                marginBottom: 4,
              }}
            >
              {right.value}
            </div>
            <MomLine
              atual={right.atual}
              anterior={right.anterior}
              isInverso={right.isInverso}
              isHistorico={isHistorico}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
