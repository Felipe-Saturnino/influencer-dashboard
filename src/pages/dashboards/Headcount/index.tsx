import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { DashboardPageHeader } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { HeadcountConteudo } from "./HeadcountConteudo";
import { HeadcountFiltroBar } from "./HeadcountFiltroBar";
import { useHeadcountDados } from "./useHeadcountDados";

export default function Headcount() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("dash_headcount");
  const dados = useHeadcountDados(perm.canView, perm.loading);

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

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="dash_headcount" />}
        title={getPageMenuLabel("dash_headcount")}
        subtitle={getPageCanonicalSubtitle("dash_headcount")}
        brand={brand}
        t={t}
      />

      <HeadcountFiltroBar
        brand={brand}
        t={t}
        historico={dados.historico}
        onToggleHistorico={dados.toggleHistorico}
        labelCarrossel={labelCarrossel}
        carrosselAnteriorDisabled={dados.historico || dados.isPrimeiro}
        carrosselProximoDisabled={dados.historico || dados.isUltimo}
        onCarrosselAnterior={dados.irMesAnterior}
        onCarrosselProximo={dados.irMesProximo}
        filtroDiretoria={dados.filtroDiretoria}
        onFiltroDiretoria={dados.setFiltroDiretoria}
        diretorias={dados.diretorias}
        filtroArea={dados.filtroArea}
        onFiltroArea={dados.setFiltroArea}
        filtroContrato={dados.filtroContrato}
        onFiltroContrato={dados.setFiltroContrato}
        loading={dados.loading}
      />

      <HeadcountConteudo
        metricas={dados.metricas}
        metricasAnterior={dados.metricasAnterior}
        loading={dados.loading}
        incluirCusto={dados.incluirCusto}
        historico={dados.historico}
        erro={dados.erro}
      />
    </div>
  );
}
