import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { OverviewPrestadorAbaEscala } from "./OverviewPrestadorAbaEscala";
import { OverviewPrestadorFiltroBar } from "./OverviewPrestadorFiltroBar";
import { useOverviewPrestadorDados, type OverviewPrestadorTab } from "./useOverviewPrestadorDados";

export default function OverviewPrestador() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("dash_overview_prestador");
  const [aba, setAba] = useRouteTab("dash_overview_prestador", "escala", ["escala", "performance"] as const);

  const dados = useOverviewPrestadorDados(perm.canView, perm.loading, user?.email);

  if (perm.loading) {
    return (
      <div
        className="app-page-shell"
        style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, padding: 24, textAlign: "center", color: t.textMuted }}
      >
        Carregando…
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div
        className="app-page-shell"
        style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, padding: 24, textAlign: "center", color: t.textMuted }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const labelCarrossel = dados.historico ? "Todo o período" : (dados.mesSelecionado?.label ?? "—");

  const selecionarAba = (tab: OverviewPrestadorTab) => setAba(tab);

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="dash_overview_prestador" />}
        title={getPageMenuLabel("dash_overview_prestador")}
        subtitle={getPageCanonicalSubtitle("dash_overview_prestador")}
        brand={brand}
        t={t}
      />

      <OverviewPrestadorFiltroBar
        brand={brand}
        t={t}
        aba={aba}
        onSelectAba={selecionarAba}
        historico={dados.historico}
        onToggleHistorico={dados.toggleHistorico}
        labelCarrossel={labelCarrossel}
        carrosselAnteriorDisabled={dados.historico || dados.isPrimeiro}
        carrosselProximoDisabled={dados.historico || dados.isUltimo}
        onCarrosselAnterior={dados.irMesAnterior}
        onCarrosselProximo={dados.irMesProximo}
        showTimeFilter={dados.showTimeFilter}
        showStaffFilter={dados.showStaffFilter}
        timeItems={dados.timeMultiselectItems}
        staffItems={dados.staffMultiselectItems}
        filtroTimeIds={dados.filtroTimeIds}
        onFiltroTimeChange={dados.setFiltroTimeIds}
        filtroStaffIds={dados.filtroStaffIds}
        onFiltroStaffChange={dados.setFiltroStaffIds}
        loading={dados.isLoading}
      />

      <div role="tabpanel" id={`panel-overview-prestador-${aba}`} aria-labelledby={`tab-overview-prestador-${aba}`}>
        {aba === "escala" && (
          <OverviewPrestadorAbaEscala
            metricas={dados.metricasAtual}
            metricasAnterior={dados.metricasAnterior}
            historico={dados.historico}
            loading={dados.isLoading}
            staffSelecionado={Boolean(dados.staffSelecionadoId)}
          />
        )}

        {aba === "performance" && (
          <div style={getPageContentBoxStyle(brand, t)}>
            <div style={{ padding: "48px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Conteúdo em desenvolvimento.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
