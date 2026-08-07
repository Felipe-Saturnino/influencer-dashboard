import { useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { OverviewPrestadorAbaEscala } from "./OverviewPrestadorAbaEscala";
import { OverviewPrestadorAbaKpisMesa } from "./OverviewPrestadorAbaKpisMesa";
import { OverviewPrestadorAbaKpisOcr } from "./OverviewPrestadorAbaKpisOcr";
import { OverviewPrestadorFiltroBar } from "./OverviewPrestadorFiltroBar";
import { useOverviewPrestadorDados, type OverviewPrestadorTab } from "./useOverviewPrestadorDados";

export default function OverviewPrestador() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("dash_overview_prestador");
  const [aba, setAba] = useRouteTab("dash_overview_prestador", "escala", ["escala", "kpis_mesa"] as const);

  const dados = useOverviewPrestadorDados(perm.canView, perm.loading, user?.email);

  const kpisMesaMode = dados.caps.kpisMesaMode;
  const showAbaKpisMesa = kpisMesaMode !== "hidden";
  const labelAbaKpis = kpisMesaMode === "sm" ? "KPIs de OCR" : "KPIs de Mesa";

  useEffect(() => {
    if (!showAbaKpisMesa && aba === "kpis_mesa") setAba("escala");
  }, [showAbaKpisMesa, aba, setAba]);

  const staffNome = useMemo(() => {
    if (!dados.staffSelecionadoId) return undefined;
    return dados.staffMultiselectItems.find((x) => x.id === dados.staffSelecionadoId)?.name;
  }, [dados.staffSelecionadoId, dados.staffMultiselectItems]);

  const prestadoresKpi = useMemo(
    () =>
      dados.idsEscopo.map((id) => ({
        id,
        nome: dados.staffMultiselectItems.find((x) => x.id === id)?.name ?? id,
      })),
    [dados.idsEscopo, dados.staffMultiselectItems],
  );

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
        showAbaKpisMesa={showAbaKpisMesa}
        labelAbaKpis={labelAbaKpis}
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
            prontoParaExibir={dados.prontoParaExibir}
            visaoTime={dados.visaoTime}
            caps={dados.caps}
            pontosAtencao={dados.pontosAtencao}
            coberturaPorTurno={dados.coberturaPorTurno}
            coberturaPorEstudio={dados.coberturaPorEstudio}
            distribuicaoEstudio={dados.distribuicaoEstudio}
          />
        )}

        {aba === "kpis_mesa" && showAbaKpisMesa && kpisMesaMode === "sm" && (
          <OverviewPrestadorAbaKpisOcr
            funcionarioIds={dados.idsEscopo}
            prestadores={prestadoresKpi}
            visaoTime={dados.visaoTime}
            mesSelecionado={dados.mesSelecionado}
            historico={dados.historico}
            staffNome={staffNome}
          />
        )}

        {aba === "kpis_mesa" && showAbaKpisMesa && (kpisMesaMode === "gp" || kpisMesaMode === "shuffler") && (
          <OverviewPrestadorAbaKpisMesa
            funcionarioIds={dados.idsEscopo}
            prestadores={prestadoresKpi}
            visaoTime={dados.visaoTime}
            mesSelecionado={dados.mesSelecionado}
            historico={dados.historico}
            staffNome={staffNome}
            mode={kpisMesaMode}
          />
        )}
      </div>
    </div>
  );
}
