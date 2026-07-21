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
import { HeadcountAbaDistrato } from "./HeadcountAbaDistrato";
import { HeadcountAbaOverview } from "./HeadcountAbaOverview";
import { HeadcountAbaVagas } from "./HeadcountAbaVagas";
import { HeadcountFiltroBar } from "./HeadcountFiltroBar";
import { useHeadcountDados, type HeadcountTab } from "./useHeadcountDados";

const HEADCOUNT_TABS = ["overview", "vagas", "distrato"] as const;

export default function Headcount() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("dash_headcount");
  const [aba, setAba] = useRouteTab("dash_headcount", "overview", HEADCOUNT_TABS);
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
  const pageBox = getPageContentBoxStyle(brand, t);

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
        aba={aba}
        onSelectAba={(tab: HeadcountTab) => setAba(tab)}
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
        loading={dados.loading}
      />

      {dados.erro ? (
        <div style={pageBox}>
          <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, textAlign: "center", padding: 40 }}>
            {dados.erro}
          </div>
        </div>
      ) : (
        <div role="tabpanel" id={`panel-headcount-${aba}`} aria-labelledby={`tab-headcount-${aba}`}>
          {aba === "overview" && (
            <HeadcountAbaOverview
              historico={dados.historico}
              metricas={dados.overview}
              anterior={dados.overviewAnt}
              historicoMetricas={dados.overviewHistorico}
              loading={dados.loading}
            />
          )}
          {aba === "vagas" && (
            <HeadcountAbaVagas
              historico={dados.historico}
              metricas={dados.vagasMetricas}
              anterior={dados.vagasAnt}
              loading={dados.loading}
            />
          )}
          {aba === "distrato" && (
            <HeadcountAbaDistrato
              historico={dados.historico}
              metricas={dados.distrato}
              anterior={dados.distratoAnt}
              loading={dados.loading}
            />
          )}
        </div>
      )}
    </div>
  );
}
