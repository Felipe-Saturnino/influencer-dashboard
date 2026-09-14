import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { FONT } from "../../../../constants/theme";
import { posicaoBgColor, posicaoTextColor } from "../../../../lib/lobbyMonitorHelpers";
import type { HomeTopMesaItem } from "../hooks/useHomeTopMesasOperadora";
import { HOME_BODY_MUTED } from "../shared/homeSharedUi";

function fmtTurnoverCurto(n: number): string {
  if (n >= 1_000_000) {
    const mi = n / 1_000_000;
    return `R$ ${mi.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 })} mi`;
  }
  return fmtBRL(n);
}

function TopMesaCard({ item }: { item: HomeTopMesaItem }) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const canalLabel = item.canal === "network" ? "Network" : "Dedicada";
  const pillColor = brand.useBrand ? "var(--brand-primary)" : "var(--brand-primary, #7c3aed)";

  return (
    <article
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg ?? t.cardBg,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 4, background: item.gameHex }} aria-hidden />
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1.3,
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {item.nomeMesa}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
              {item.nomeEstudio}
            </div>
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              background: `color-mix(in srgb, ${pillColor} 12%, transparent)`,
              color: pillColor,
              border: `1px solid color-mix(in srgb, ${pillColor} 28%, transparent)`,
              fontFamily: FONT.body,
            }}
          >
            {canalLabel}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 12px",
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${t.cardBorder}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              GGR do mês
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 15,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {fmtBRL(item.ggr)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              Apostas
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 15,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {item.apostas.toLocaleString("pt-BR")}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              Turnover
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 15,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                color: t.text,
                fontFamily: FONT.body,
              }}
            >
              {fmtTurnoverCurto(item.turnover)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textMuted,
                fontFamily: FONT.body,
              }}
            >
              Posicionamento
            </div>
            <div style={{ marginTop: 4 }}>
              {item.posicao != null ? (
                <span
                  style={{
                    display: "inline-flex",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 9px",
                    borderRadius: 999,
                    fontVariantNumeric: "tabular-nums",
                    background: posicaoBgColor(item.posicao),
                    color: posicaoTextColor(item.posicao),
                    border: `1px solid ${isDark ? "transparent" : "rgba(0,0,0,0.06)"}`,
                    fontFamily: FONT.body,
                  }}
                >
                  #{item.posicao}
                </span>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 800, color: t.textMuted, fontFamily: FONT.body }}>—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TopMesasOperador({
  items,
  loading,
}: {
  items: HomeTopMesaItem[];
  loading?: boolean;
}) {
  const { theme: t } = useApp();

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p
        style={{
          ...HOME_BODY_MUTED,
          color: t.textMuted,
          margin: "0 0 12px",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        Top 3 mesas · resultado do mês + posição no lobby
      </p>
      <div
        className="app-grid-kpi-3"
        style={{ gap: 12 }}
        role="list"
        aria-label="Top 3 mesas por GGR do mês"
      >
        {items.map((item) => (
          <div key={item.key} role="listitem">
            <TopMesaCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
