import { PlayCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { FONT } from "../../constants/theme";
import { BRAND } from "../../lib/dashboardConstants";
import { fmtBRL } from "../../lib/dashboardHelpers";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

interface Props {
  atual: { qtd: number; valor: number };
  anterior: { qtd: number; valor: number };
  isHistorico?: boolean;
}

export default function KpiCardDepositos({
  atual,
  anterior,
  isHistorico,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const accentColor = BRAND.transacao;
  const barColor = brand.useBrand ? "var(--brand-icon-color)" : accentColor;
  const barBg = `linear-gradient(90deg, ${barColor}, transparent)`;
  const iconBoxBg = brand.useBrand ? "color-mix(in srgb, var(--brand-icon-color) 10%, transparent)" : `${accentColor}18`;
  const iconBoxBorder = brand.useBrand ? "1px solid color-mix(in srgb, var(--brand-icon-color) 22%, transparent)" : `1px solid ${accentColor}35`;
  const iconBoxColor = brand.useBrand ? "var(--brand-icon-color)" : accentColor;
  const diffQtd = atual.qtd - anterior.qtd;
  const pctQtd =
    anterior.qtd !== 0 ? (diffQtd / Math.abs(anterior.qtd)) * 100 : null;
  const upQtd = diffQtd >= 0;
  const diffVal = atual.valor - anterior.valor;
  const pctVal =
    anterior.valor !== 0 ? (diffVal / Math.abs(anterior.valor)) * 100 : null;
  const upVal = diffVal >= 0;

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
            }}
          >
            <PlayCircle size={16} aria-hidden />
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
            Depósitos
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
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
              }}
            >
              Qtd
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                marginBottom: 4,
              }}
            >
              {atual.qtd.toLocaleString("pt-BR")}
            </div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span
                  style={{
                    color: upQtd ? "var(--brand-success)" : "var(--brand-danger)",
                    fontWeight: 700,
                  }}
                >
                  {upQtd ? "↑" : "↓"}{" "}
                  {pctQtd !== null ? `${Math.abs(pctQtd).toFixed(0)}%` : "—"}
                </span>
              </div>
            )}
          </div>
          <div style={{ borderLeft: `1px solid ${t.cardBorder}`, paddingLeft: 10 }}>
            <div
              style={{
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 3,
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
              }}
            >
              Volume
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                marginBottom: 4,
              }}
            >
              {fmtBRL(atual.valor)}
            </div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span
                  style={{
                    color: upVal ? "var(--brand-success)" : "var(--brand-danger)",
                    fontWeight: 700,
                  }}
                >
                  {upVal ? "↑" : "↓"}{" "}
                  {pctVal !== null ? `${Math.abs(pctVal).toFixed(0)}%` : "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
