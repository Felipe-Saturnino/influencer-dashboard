import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { FONT_TITLE } from "../../../lib/dashboardConstants"
import { fmtBRL, fmtHorasTotal } from "../../../lib/dashboardHelpers"
import { getPageKpiSectionGapStyle } from "../../../lib/pageContentBoxStyles"
import type { FinanceiroMesData } from "./financeiroMesData"

export function BlocoKpis({
  mesData,
  loadingMes,
}: {
  mesData: FinanceiroMesData | null;
  loadingMes: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  const totalPago = mesData?.kpis.totalPago ?? 0;
  const pendente = mesData?.kpis.pendente ?? 0;
  const horas = mesData?.kpis.horas ?? 0;

  const kpiSkeletonStyle: React.CSSProperties = {
    height: 28,
    width: "65%",
    borderRadius: 8,
    background: t.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  const kpis = [
    {
      label: "R$ PAGO",
      color: "var(--brand-primary, #7c3aed)",
      display: loadingMes ? null : fmtBRL(totalPago),
    },
    {
      label: "R$ PENDENTE",
      color: "#f59e0b",
      display: loadingMes ? null : fmtBRL(pendente),
    },
    {
      label: "HORAS REALIZADAS",
      color: "#22c55e",
      display: loadingMes ? null : fmtHorasTotal(horas),
    },
  ] as const;

  return (
    <div className="app-grid-kpi-3" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
      {kpis.map((k) => (
        <div
          key={k.label}
          aria-label={k.display ? `${k.label}: ${k.display}` : k.label}
          style={{
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            borderLeft: `3px solid ${k.color}`,
            background: brand.blockBg,
            padding: "16px 18px",
            boxShadow: cardShadow,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: t.textMuted,
              fontFamily: FONT.body,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {k.label}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: k.color,
              fontFamily: FONT_TITLE,
              marginTop: 6,
              minHeight: 32,
              display: "flex",
              alignItems: "center",
            }}
          >
            {loadingMes ? <div style={kpiSkeletonStyle} aria-hidden /> : k.display}
          </div>
        </div>
      ))}
    </div>
  );
}
