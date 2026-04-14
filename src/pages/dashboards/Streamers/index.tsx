import { useState, Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { GiTv } from "react-icons/gi";

const DashboardOverview = lazy(() => import("../DashboardOverview"));
const DashboardConversao = lazy(() => import("../DashboardConversao"));
const DashboardFinanceiro = lazy(() => import("../DashboardFinanceiro"));

type StreamersTab = "overview" | "conversao" | "financeiro";

const TAB_LABELS: Record<StreamersTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  financeiro: "Financeiro",
};

export default function Streamers() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("streamers");
  const [aba, setAba] = useState<StreamersTab>("overview");

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden="true" />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const tabIds: StreamersTab[] = ["overview", "conversao", "financeiro"];

  return (
    <div style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <div className="app-page-shell" style={{ paddingBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: brand.primaryIconColor,
            }}
          >
            <GiTv size={14} aria-hidden="true" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: brand.primary,
                fontFamily: FONT_TITLE,
                margin: 0,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Streamers
            </h1>
            <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
              Três visões do desempenho de streamers; cada aba mantém o bloco de filtros e regras dos dashboards anteriores.
            </p>
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Seções Streamers"
        style={{ display: "flex", gap: 8, marginBottom: 0, flexWrap: "wrap" }}
      >
        {tabIds.map((key) => {
          const ativo = aba === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-streamers-${key}`}
              aria-selected={ativo}
              aria-controls={`panel-streamers-${key}`}
              onClick={() => setAba(key)}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                background: ativo
                  ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : "rgba(124,58,237,0.15)")
                  : (t.inputBg ?? t.cardBg),
                color: ativo ? brand.accent : t.textMuted,
                fontWeight: ativo ? 700 : 500,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-streamers-${aba}`}
        aria-labelledby={`tab-streamers-${aba}`}
      >
        <Suspense
          fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: t.textMuted, gap: 8, fontFamily: FONT.body, fontSize: 13 }}>
              <Loader2 size={20} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden="true" />
              Carregando…
            </div>
          }
        >
          {aba === "overview" && <DashboardOverview />}
          {aba === "conversao" && <DashboardConversao />}
          {aba === "financeiro" && <DashboardFinanceiro />}
        </Suspense>
      </div>
    </div>
  );
}
