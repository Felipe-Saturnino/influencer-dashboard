import { useState, Suspense, lazy } from "react";
import { BarChart2, ChevronLeft, ChevronRight, Clock, GitCompare, Loader2, Wallet } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import {
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroInfluencerSelect,
  FiltroOperadoraSelect,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles";
import { getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { StreamersFiltrosProvider, useStreamersFiltros } from "./StreamersFiltrosContext";

const DashboardOverview = lazy(() => import("./DashboardOverview"));
const DashboardConversao = lazy(() => import("./DashboardConversao"));
const DashboardFinanceiro = lazy(() => import("./DashboardFinanceiro"));

type StreamersTab = "overview" | "conversao" | "financeiro";

const TAB_LABELS: Record<StreamersTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  financeiro: "Financeiro",
};

const TAB_ICONS: Record<StreamersTab, typeof BarChart2> = {
  overview: BarChart2,
  conversao: GitCompare,
  financeiro: Wallet,
};

function StreamersFiltrosEUAbas({
  aba,
  setAba,
}: {
  aba: StreamersTab;
  setAba: (t: StreamersTab) => void;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerOperadora } = useDashboardFiltros();
  const sf = useStreamersFiltros();

  const tabIds: StreamersTab[] = ["overview", "conversao", "financeiro"];

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

          {showFiltroInfluencer && (
            <FiltroInfluencerSelect
              mode="single"
              value={sf.filtroInfluencer}
              onChange={sf.setFiltroInfluencer}
              influencers={sf.influencerOptions.map((r) => ({ id: r.id, name: r.nome }))}
            />
          )}

          {showFiltroOperadora && (
            <FiltroOperadoraSelect
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

        <div
          role="tablist"
          aria-label="Seções Streamers"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
        >
          {tabIds.map((key) => {
            const TabIcon = TAB_ICONS[key];
            return (
              <FiltroBarTabButton
                key={key}
                id={`tab-streamers-${key}`}
                active={aba === key}
                aria-controls={`panel-streamers-${key}`}
                onClick={() => setAba(key)}
                onKeyDown={(e) => handleFiltroBarTabsArrowKeyDown(e, tabIds, key, setAba, "tab-streamers-")}
                icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
              >
                {TAB_LABELS[key]}
              </FiltroBarTabButton>
            );
          })}
        </div>
    </div>
  );
}

function StreamersAutorizado() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [aba, setAba] = useState<StreamersTab>("overview");

  return (
    <StreamersFiltrosProvider>
      <div style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
        <div className="app-page-shell" style={{ paddingBottom: 12 }}>
          <DashboardPageHeader
            icon={<PageMenuIcon pageKey="streamers" />}
            title={getPageMenuLabel("streamers")}
            subtitle="Acompanhe performance, conversão e financeiro do canal de influencers."
            brand={brand}
            t={t}
          />

          <StreamersFiltrosEUAbas aba={aba} setAba={setAba} />
        </div>

        <div role="tabpanel" id={`panel-streamers-${aba}`} aria-labelledby={`tab-streamers-${aba}`}>
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
    </StreamersFiltrosProvider>
  );
}

export default function Streamers() {
  const { theme: t } = useApp();
  const perm = usePermission("streamers");

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
        style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}
      >
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return <StreamersAutorizado />;
}
