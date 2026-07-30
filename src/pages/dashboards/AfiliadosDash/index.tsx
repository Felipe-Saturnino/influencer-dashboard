import { Suspense, lazy } from "react";
import { BarChart2, ChevronLeft, ChevronRight, Clock, GitCompare, Loader2, Wallet } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import {
  DashboardPageHeader,
  FiltroAfiliadoSelect,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroOperadoraSelect,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { AfiliadosFiltrosProvider, useAfiliadosFiltros } from "./AfiliadosFiltrosContext";

const DashboardOverview = lazy(() => import("./DashboardOverview"));
const DashboardConversao = lazy(() => import("./DashboardConversao"));
const DashboardFinanceiro = lazy(() => import("./DashboardFinanceiro"));

type AfiliadosTab = "overview" | "conversao" | "financeiro";

const TAB_LABELS: Record<AfiliadosTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  financeiro: "Financeiro",
};

const TAB_ICONS: Record<AfiliadosTab, typeof BarChart2> = {
  overview: BarChart2,
  conversao: GitCompare,
  financeiro: Wallet,
};

function AfiliadosFiltrosEUAbas({
  aba,
  setAba,
}: {
  aba: AfiliadosTab;
  setAba: (t: AfiliadosTab) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroOperadora, podeVerOperadora } = useDashboardFiltros();
  const sf = useAfiliadosFiltros();

  const tabIds: AfiliadosTab[] = ["overview", "conversao", "financeiro"];

  return (
    <div style={getPageFilterBoxStyle(brand, t)}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Mês anterior"
            style={getCarouselBtnNavStyle(t, sf.historico || sf.isPrimeiro)}
            onClick={sf.irMesAnterior}
            disabled={sf.historico || sf.isPrimeiro}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>

          <span style={getCarouselPeriodLabelStyle(t, { minWidth: "clamp(120px, 40vw, 180px)" })}>
            {sf.historico ? "Todo o período" : sf.mesSelecionado?.label}
          </span>

          <button
            type="button"
            aria-label="Próximo mês"
            style={getCarouselBtnNavStyle(t, sf.historico || sf.isUltimo)}
            onClick={sf.irMesProximo}
            disabled={sf.historico || sf.isUltimo}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        <FiltroHistoricoButton active={sf.historico} onClick={sf.toggleHistorico} />

        <FiltroAfiliadoSelect
          mode="single"
          value={sf.filtroAfiliado}
          onChange={(id) => sf.setFiltroAfiliado(id)}
          afiliados={sf.afiliadoOptions.map((r) => ({ id: r.id, name: r.nome }))}
        />

        {showFiltroOperadora && (
          <FiltroOperadoraSelect
            pill
            minWidth={200}
            value={sf.filtroOperadora}
            onChange={sf.setFiltroOperadora}
            operadoras={sf.operadorasList}
            podeVerOperadora={podeVerOperadora}
          />
        )}
        {sf.isLoading && (
          <span
            style={{
              fontSize: 12,
              color: t.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
            aria-live="polite"
          >
            <Clock size={12} aria-hidden />
            Carregando…
          </span>
        )}
      </div>

      <div className="app-filter-bar-tabs-cta">
        <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
        <div className="app-filter-bar-tabs-cta__tabs" role="tablist" aria-label="Seções Afiliados">
          {tabIds.map((key) => {
            const TabIcon = TAB_ICONS[key];
            return (
              <FiltroBarTabButton
                key={key}
                id={`tab-dash-afiliados-${key}`}
                active={aba === key}
                aria-controls={`panel-dash-afiliados-${key}`}
                onClick={() => setAba(key)}
                onKeyDown={(e) =>
                  handleFiltroBarTabsArrowKeyDown(e, tabIds, key, setAba, "tab-dash-afiliados-")
                }
                icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
              >
                {TAB_LABELS[key]}
              </FiltroBarTabButton>
            );
          })}
        </div>
        <div className="app-filter-bar-tabs-cta__actions">
          <AjudaContextualAcoes pageKey="dash_afiliados" />
        </div>
      </div>
    </div>
  );
}

function AfiliadosDashAutorizado() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useRouteTab("dash_afiliados", "overview", [
    "overview",
    "conversao",
    "financeiro",
  ] as const);

  return (
    <AfiliadosFiltrosProvider>
      <div style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
        <div className="app-page-shell" style={{ paddingBottom: 12 }}>
          <DashboardPageHeader
            icon={<PageMenuIcon pageKey="dash_afiliados" />}
            title={getPageMenuLabel("dash_afiliados")}
            subtitle={getPageCanonicalSubtitle("dash_afiliados")}
            brand={brand}
            t={t}
          />

          <AfiliadosFiltrosEUAbas aba={aba} setAba={setAba} />
        </div>

        <div
          role="tabpanel"
          id={`panel-dash-afiliados-${aba}`}
          aria-labelledby={`tab-dash-afiliados-${aba}`}
        >
          <Suspense
            fallback={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 48,
                  color: t.textMuted,
                  gap: 8,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                <Loader2
                  size={20}
                  className="app-lucide-spin"
                  color="var(--brand-action, #7c3aed)"
                  aria-hidden="true"
                />
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
    </AfiliadosFiltrosProvider>
  );
}

export default function AfiliadosDash() {
  const { theme: t } = useApp();
  const perm = usePermission("dash_afiliados");

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{
          background: t.bg,
          minHeight: "100vh",
          fontFamily: FONT.body,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={24}
          className="app-lucide-spin"
          color="var(--brand-action, #7c3aed)"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        style={{
          padding: 24,
          textAlign: "center",
          color: t.textMuted,
          fontFamily: FONT.body,
          background: t.bg,
        }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return <AfiliadosDashAutorizado />;
}
