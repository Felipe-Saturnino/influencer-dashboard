import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { OverviewSpinFiltroBar } from "./OverviewSpinFiltroBar";
import { OverviewSpinKpisConsolidados } from "./OverviewSpinKpisConsolidados";
import { useOverviewSpinDados } from "./useOverviewSpinDados";
import { useOverviewSpinKpiExibir } from "./useOverviewSpinKpiExibir";
import { useOverviewSpinTabelaRows } from "./useOverviewSpinTabelaRows";
import { useOverviewSpinComparativos } from "./useOverviewSpinComparativos";
import { OverviewSpinMesaDiaTabela } from "./OverviewSpinMesaDiaTabela";
import { OverviewSpinDetalhamentoInterativo } from "./OverviewSpinDetalhamentoInterativo";
import { OverviewSpinComparativoJogoInterativo } from "./OverviewSpinComparativoJogoInterativo";
import { useOverviewSpinCatalogo } from "./useOverviewSpinCatalogo";
import { useOverviewSpinFiltrosAcesso } from "./useOverviewSpinFiltrosAcesso";

import {
  abaEhFinanceira,
  canalDaAba,
  TAB_IDS_SPIN_TODAS,
  type OverviewSpinTab,
} from "./overviewSpinTabs";
import { labelCarrosselPos, parseDateKey } from "../../../lib/lobbyMonitorHelpers";
import { hojeIsoBrasil } from "../../../lib/dateBrasil";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import {
  GAME_IDENTITY_HEX,
  getGameMesaTituloMix,
  getGameMesaTituloStripStyle,
} from "../../../lib/gameIdentityColors";
import {
  LABEL_FUTEBOL_BRASILEIRO,
  type KpiJogoKey,
} from "./overviewSpinLogic";

const DashboardPosicionamento = lazy(() => import("./DashboardPosicionamento"));

import { Loader2 } from "lucide-react";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { DashboardPageHeader } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { createDataTableBlockStyles } from "../../../lib/dataTableStyles";

export default function OverviewSpin() {
  const { theme: t, escoposVisiveis, user, effectiveRole } = useApp();
  const perm = usePermission("mesas_spin");
  const role = effectiveRole ?? user?.role;
  const isAdmin = role === "admin";

  const [aba, setAba] = useRouteTab("mesas_spin", "overview", TAB_IDS_SPIN_TODAS);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");

  const { catalogo, loadingCatalogo, verAbaDedicado, verAbaNetwork } = useOverviewSpinCatalogo({
    isAdmin,
    canView: perm.canView === "sim" || perm.canView === "proprios" ? perm.canView : "nao",
    operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
  });

  /** Evita flash: enquanto o catálogo não resolve, mantém as 4 abas (Overview + Dedicado + Network + Posicionamento). */
  const tabsVisiveis = useMemo((): OverviewSpinTab[] => {
    if (loadingCatalogo) return [...TAB_IDS_SPIN_TODAS];
    return TAB_IDS_SPIN_TODAS.filter((id) => {
      if (id === "estudio_dedicado") return verAbaDedicado;
      if (id === "estudio_network") return verAbaNetwork;
      return true;
    });
  }, [loadingCatalogo, verAbaDedicado, verAbaNetwork]);

  useEffect(() => {
    if (loadingCatalogo) return;
    if (!tabsVisiveis.includes(aba)) {
      setAba("overview");
    }
  }, [aba, tabsVisiveis, setAba, loadingCatalogo]);

  const {
    showFiltroOperadora,
    podeVerOperadora,
    operadoraSlugsForcado,
    operadorasDoFiltro,
    operadorasAtivas,
    slugsPermitidosPelaAba,
  } = useOverviewSpinFiltrosAcesso({
    canView: perm.canView,
    aba,
    catalogo,
  });

  const canal = canalDaAba(aba);

  const {
    mesesDisponiveis,
    idxMes,
    historico,
    setHistorico,
    loading,
    modoAgregadoTodasOperadoras,
    mesSelecionado,
    mesasCadastro,
    dailyData,
    monthlyData,
    porTabelaRows,
    porTabelaHistAll,
    monthlyUapArpuSel,
    monthlyUapArpuPrev,
    dailyDataPrevMonth,
    uapPorJogoRows,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    irMesAnterior,
    irMesProximo,
    toggleHistorico,
  } = useOverviewSpinDados(canal, {
    operadoraSlugsForcado,
    slugsPermitidosPelaAba,
    filtroOperadora,
    setFiltroOperadora,
  });

  useEffect(() => {
    if (filtroOperadora === "todas") return;
    if (!operadorasDoFiltro.some((o) => o.slug === filtroOperadora)) {
      setFiltroOperadora(
        operadoraSlugsForcado?.length === 1 ? operadoraSlugsForcado[0]! : "todas",
      );
    }
  }, [filtroOperadora, operadorasDoFiltro, operadoraSlugsForcado]);

  const [compMesaA, setCompMesaA] = useState("");
  const [compMesaB, setCompMesaB] = useState("");
  const [kpisSelecionados, setKpisSelecionados] = useState<Set<KpiJogoKey>>(
    () => new Set<KpiJogoKey>(["ggr", "turnover", "uap"]),
  );
  const [kpiGrafico, setKpiGrafico] = useState<KpiJogoKey>("ggr");
  const [expandedDetalhe, setExpandedDetalhe] = useState<Set<string>>(() => new Set());
  const [modoVisualizacao, setModoVisualizacao] = useState<"tabela" | "grafico">("tabela");
  const [modoVisualizacaoDetalhe, setModoVisualizacaoDetalhe] = useState<"tabela" | "grafico">("tabela");
  const [kpiGraficoDetalhe, setKpiGraficoDetalhe] = useState<KpiJogoKey>("ggr");

  useEffect(() => {
    setExpandedDetalhe(new Set());
  }, [historico, filtroOperadora, operadoraSlugsForcado, idxMes]);

  useEffect(() => {
    if (!modoAgregadoTodasOperadoras) return;
    setKpisSelecionados((prev) => {
      if (prev.has("arpu")) return prev;
      const next = new Set(prev);
      next.add("arpu");
      return next;
    });
  }, [modoAgregadoTodasOperadoras]);

  const operadorasListFmt = operadorasAtivas;

  const slugToNome = useCallback(
    (slug: string) => operadorasAtivas.find((o) => o.slug === slug)?.nome ?? slug,
    [operadorasAtivas],
  );

  const { porTabelaFiltradas, porTabelaFiltradasHist, tabelaRows } = useOverviewSpinTabelaRows({
    porTabelaRows,
    porTabelaHistAll,
    filtroOperadora,
    operadoraSlugsForcado: operadoraSlugsForcado ?? null,
    podeVerOperadora,
    historico,
    dailyData,
    monthlyData,
    modoAgregadoTodasOperadoras,
  });

  const {
    mesasOpcoesBlackjack,
    linhasSpeedBaccarat,
    linhasRoleta,
    linhasFutebolBrasileiro,
    jogosComparativoAtivos,
    exibirBlocoDadosPorMesaFutebol,
    qtdColunasJogoComparativo,
    linhasComparativoJogo,
    linhaTotaisComparativoJogo,
    kpisAtivosComparativo,
    kpiGraficoConfig,
    dadosGraficoComparativoJogo,
    isBRLKpiGrafico,
    kpiGraficoDetalheConfig,
    isBRLKpiGraficoDetalhe,
    dadosGraficoDetalheOperadoras,
    slugsGraficoDetalhe,
    coresOperadorasDetalhe,
    minWidthTabelaComparativoJogo,
    linhasMesaA,
    linhasMesaB,
  } = useOverviewSpinComparativos({
    historico,
    modoAgregadoTodasOperadoras,
    mesasCadastro,
    operadorasListFmt,
    porTabelaFiltradas,
    porTabelaFiltradasHist,
    dailyData,
    monthlyData,
    uapPorJogoRows,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    filtroOperadora,
    operadoraSlugsForcado: operadoraSlugsForcado ?? null,
    podeVerOperadora,
    escoposVisiveis,
    kpisSelecionados,
    kpiGrafico,
    kpiGraficoDetalhe,
    tabelaRows,
    compMesaA,
    compMesaB,
    setCompMesaA,
    setCompMesaB,
  });

  const { kpiExibir, kpiAntExibir, isHistoricoKpi } = useOverviewSpinKpiExibir({
    historico,
    modoAgregadoTodasOperadoras,
    tabelaRows,
    dailyData,
    dailyDataPrevMonth,
    monthlyUapArpuSel,
    monthlyUapArpuPrev,
  });



  const brand = useDashboardBrand();

  const corTituloBlackjack = useMemo(
    () => getGameMesaTituloMix(GAME_IDENTITY_HEX.blackjack),
    [],
  );

  const vsBadgeStyle: React.CSSProperties = {
    padding: "5px 12px",
    borderRadius: 999,
    border: brand.useBrand
      ? "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 30%, transparent)"
      : "1px solid rgba(74,32,130,0.35)",
    background: brand.useBrand
      ? "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)"
      : "rgba(74,32,130,0.10)",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--brand-action, #7c3aed)",
    fontFamily: FONT.body,
    letterSpacing: "0.05em",
    textAlign: "center",
  };

  const contentBox = getPageContentBoxStyle(brand, t);

  const tituloMesaSpeedBaccarat = useMemo(
    () => getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.baccarat, { fontFamily: FONT.body }),
    [],
  );
  const tituloMesaRoleta = useMemo(
    () => getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.roleta, { fontFamily: FONT.body }),
    [],
  );
  const tituloMesaFutebolBrasileiro = useMemo(
    () =>
      getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.futebol_brasileiro, {
        fontFamily: FONT.body,
        marginTop: 14,
      }),
    [],
  );

  const dataTable = useMemo(() => createDataTableBlockStyles(t, brand), [t, brand]);

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const refDatePosicionamento = useMemo(() => parseDateKey(hojeIsoBrasil()), []);

  const financeira = abaEhFinanceira(aba);

  const carrosselAnteriorDisabled = useMemo(() => {
    if (!financeira) return true;
    return historico || isPrimeiro;
  }, [financeira, historico, isPrimeiro]);

  const carrosselProximoDisabled = useMemo(() => {
    if (!financeira) return true;
    return historico || isUltimo;
  }, [financeira, historico, isUltimo]);

  const labelCarrosselCentral = financeira
    ? historico
      ? "Todo o período"
      : (mesSelecionado?.label ?? "")
    : labelCarrosselPos("dia", refDatePosicionamento);

  const operadoraSlugPosicionamento = useMemo(() => {
    if (filtroOperadora !== "todas") return filtroOperadora;
    if (operadoraSlugsForcado?.length === 1) return operadoraSlugsForcado[0];
    if (escoposVisiveis.operadorasVisiveis.length === 1) {
      return escoposVisiveis.operadorasVisiveis[0];
    }
    if (showFiltroOperadora) return "todas";
    return operadoraSlugsForcado?.[0] ?? escoposVisiveis.operadorasVisiveis[0] ?? "blaze";
  }, [
    filtroOperadora,
    operadoraSlugsForcado,
    escoposVisiveis.operadorasVisiveis,
    showFiltroOperadora,
  ]);

  function irCarrosselAnterior() {
    if (!financeira) return;
    irMesAnterior();
  }

  function irCarrosselProximo() {
    if (!financeira) return;
    irMesProximo();
  }

  function selecionarAbaSpin(key: OverviewSpinTab) {
    setAba(key);
    if (key === "posicionamento") setHistorico(false);
  }

  const selectStyle: React.CSSProperties = {
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  const selectStyleSimple: React.CSSProperties = {
    ...selectStyle,
    padding: "7px 12px",
  };

  const labelMesaComparativoA = mesasOpcoesBlackjack.find((m) => m.key === compMesaA)?.label ?? "—";
  const labelMesaComparativoB = mesasOpcoesBlackjack.find((m) => m.key === compMesaB)?.label ?? "—";

  const chartTooltipTheme = useMemo(
    () => ({ cardBg: t.cardBg, cardBorder: t.cardBorder, text: t.text }),
    [t.cardBg, t.cardBorder, t.text],
  );

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="mesas_spin" />}
        title={getPageMenuLabel("mesas_spin")}
        subtitle={getPageCanonicalSubtitle("mesas_spin")}
        brand={brand}
        t={t}
      />

      <OverviewSpinFiltroBar
        brand={brand}
        t={t}
        aba={aba}
        tabsVisiveis={tabsVisiveis}
        labelCarrosselCentral={labelCarrosselCentral}
        carrosselAnteriorDisabled={carrosselAnteriorDisabled}
        carrosselProximoDisabled={carrosselProximoDisabled}
        onCarrosselAnterior={irCarrosselAnterior}
        onCarrosselProximo={irCarrosselProximo}
        historico={historico}
        onToggleHistorico={toggleHistorico}
        showFiltroOperadora={showFiltroOperadora}
        filtroOperadora={filtroOperadora}
        onFiltroOperadoraChange={setFiltroOperadora}
        operadorasOcr={operadorasDoFiltro}
        podeVerOperadora={podeVerOperadora}
        loading={loading}
        onSelectAba={selecionarAbaSpin}
      />

      <div role="tabpanel" id={`panel-overview-spin-${aba}`} aria-labelledby={`tab-overview-spin-${aba}`}>
      {financeira && (
      <>
      <OverviewSpinKpisConsolidados
        contentBoxStyle={contentBox}
        loading={loading}
        historico={historico}
        modoAgregadoTodasOperadoras={modoAgregadoTodasOperadoras}
        kpiExibir={kpiExibir}
        kpiAntExibir={kpiAntExibir}
        isHistoricoKpi={isHistoricoKpi}
      />

      <div style={contentBox}>
        <SectionTitle sub={historico ? "mês a mês" : "dia a dia"}>
          {historico ? "Detalhamento Mensal" : "Detalhamento Diário"}
        </SectionTitle>

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: t.textMuted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
            <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
          </div>
        ) : tabelaRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <OverviewSpinDetalhamentoInterativo
            colTempoLabel={historico ? "Mês" : "Data"}
            historico={historico}
            mesSelecionadoLabel={mesSelecionado?.label ?? ""}
            modoAgregadoTodasOperadoras={modoAgregadoTodasOperadoras}
            modoVisualizacaoDetalhe={modoVisualizacaoDetalhe}
            setModoVisualizacaoDetalhe={setModoVisualizacaoDetalhe}
            kpiGraficoDetalhe={kpiGraficoDetalhe}
            setKpiGraficoDetalhe={setKpiGraficoDetalhe}
            tabelaRows={tabelaRows}
            expandedDetalhe={expandedDetalhe}
            setExpandedDetalhe={setExpandedDetalhe}
            dailyRawUnmerged={dailyRawUnmerged}
            monthlyRawUnmerged={monthlyRawUnmerged}
            podeVerOperadora={podeVerOperadora}
            slugToNome={slugToNome}
            dadosGraficoDetalheOperadoras={dadosGraficoDetalheOperadoras}
            slugsGraficoDetalhe={slugsGraficoDetalhe}
            coresOperadorasDetalhe={coresOperadorasDetalhe}
            kpiGraficoDetalheConfig={kpiGraficoDetalheConfig}
            isBRLKpiGraficoDetalhe={isBRLKpiGraficoDetalhe}
            chartTooltipTheme={chartTooltipTheme}
            dataTable={dataTable}
            brand={brand}
            t={t}
          />
        )}
      </div>

      {!historico && (
        <>
          {loading ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: t.textMuted,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                  <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : porTabelaRows.length === 0 ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <OverviewSpinComparativoJogoInterativo
                  colTempoLabel="Data"
                  historico={historico}
                  mesSelecionadoLabel={mesSelecionado?.label ?? ""}
                  modoVisualizacao={modoVisualizacao}
                  setModoVisualizacao={setModoVisualizacao}
                  kpisSelecionados={kpisSelecionados}
                  setKpisSelecionados={setKpisSelecionados}
                  kpiGrafico={kpiGrafico}
                  setKpiGrafico={setKpiGrafico}
                  kpisAtivosComparativo={kpisAtivosComparativo}
                  qtdColunasJogoComparativo={qtdColunasJogoComparativo}
                  jogosComparativoAtivos={jogosComparativoAtivos}
                  linhaTotaisComparativoJogo={linhaTotaisComparativoJogo}
                  linhasComparativoJogo={linhasComparativoJogo}
                  minWidthTabelaComparativoJogo={minWidthTabelaComparativoJogo}
                  dadosGraficoComparativoJogo={dadosGraficoComparativoJogo}
                  kpiGraficoConfig={kpiGraficoConfig}
                  isBRLKpiGrafico={isBRLKpiGrafico}
                  chartTooltipTheme={chartTooltipTheme}
                  dataTable={dataTable}
                  brand={brand}
                  t={t}
                />
                )}
              </div>

              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>

                    {mesasOpcoesBlackjack.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <>
                    <div className="app-conversao-vs-row">
                      <select
                        value={compMesaA}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaA(v);
                          if (v && v === compMesaB) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaB(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaA ? corTituloBlackjack.borderMix : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                      <div style={vsBadgeStyle}>VS</div>
                      <select
                        value={compMesaB}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaB(v);
                          if (v && v === compMesaA) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaA(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaB ? corTituloBlackjack.borderMix : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {(compMesaA || compMesaB) && (
                      <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: corTituloBlackjack.bg,
                            border: corTituloBlackjack.border,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: corTituloBlackjack.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoA}
                        </div>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: corTituloBlackjack.bg,
                            border: corTituloBlackjack.border,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: corTituloBlackjack.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoB}
                        </div>
                      </div>
                    )}

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <OverviewSpinMesaDiaTabela linhas={linhasMesaA} colTempo="Data" tituloTabela={labelMesaComparativoA} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <OverviewSpinMesaDiaTabela linhas={linhasMesaB} colTempo="Data" tituloTabela={labelMesaComparativoB} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={contentBox}>
                <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                  Dados por mesa
                </SectionTitle>

                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={tituloMesaSpeedBaccarat}>
                      Speed Baccarat
                    </div>
                    <OverviewSpinMesaDiaTabela linhas={linhasSpeedBaccarat} colTempo="Data" tituloTabela={"Speed Baccarat"} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                  </div>
                  <div
                    className="app-conversao-funil-divider"
                    style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={tituloMesaRoleta}>
                      Roleta
                    </div>
                    <OverviewSpinMesaDiaTabela linhas={linhasRoleta} colTempo="Data" tituloTabela={"Roleta"} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                  </div>
                </div>
                {exibirBlocoDadosPorMesaFutebol && (
                  <div style={{ marginTop: 4 }}>
                    <div style={tituloMesaFutebolBrasileiro}>{LABEL_FUTEBOL_BRASILEIRO}</div>
                    <OverviewSpinMesaDiaTabela linhas={linhasFutebolBrasileiro} colTempo="Data" tituloTabela={LABEL_FUTEBOL_BRASILEIRO} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                  </div>
                )}
              </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {historico && (
        <>
          {loading ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: t.textMuted,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                  <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : porTabelaHistAll.length === 0 ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <OverviewSpinComparativoJogoInterativo
                  colTempoLabel="Mês"
                  historico={historico}
                  mesSelecionadoLabel={mesSelecionado?.label ?? ""}
                  modoVisualizacao={modoVisualizacao}
                  setModoVisualizacao={setModoVisualizacao}
                  kpisSelecionados={kpisSelecionados}
                  setKpisSelecionados={setKpisSelecionados}
                  kpiGrafico={kpiGrafico}
                  setKpiGrafico={setKpiGrafico}
                  kpisAtivosComparativo={kpisAtivosComparativo}
                  qtdColunasJogoComparativo={qtdColunasJogoComparativo}
                  jogosComparativoAtivos={jogosComparativoAtivos}
                  linhaTotaisComparativoJogo={linhaTotaisComparativoJogo}
                  linhasComparativoJogo={linhasComparativoJogo}
                  minWidthTabelaComparativoJogo={minWidthTabelaComparativoJogo}
                  dadosGraficoComparativoJogo={dadosGraficoComparativoJogo}
                  kpiGraficoConfig={kpiGraficoConfig}
                  isBRLKpiGrafico={isBRLKpiGrafico}
                  chartTooltipTheme={chartTooltipTheme}
                  dataTable={dataTable}
                  brand={brand}
                  t={t}
                />
                )}
              </div>

              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>

                    {mesasOpcoesBlackjack.length === 0 ? (
                      <div
                        style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                      >
                        {MSG_SEM_DADOS_FILTRO}
                      </div>
                    ) : (
                      <>
                        <div className="app-conversao-vs-row">
                          <select
                            value={compMesaA}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCompMesaA(v);
                              if (v && v === compMesaB) {
                                const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                                if (o) setCompMesaB(o.key);
                              }
                            }}
                            style={{
                              ...selectStyleSimple,
                              borderColor: compMesaA ? corTituloBlackjack.borderMix : undefined,
                              width: "100%",
                            }}
                          >
                            {mesasOpcoesBlackjack
                              .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                              .map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                          <div style={vsBadgeStyle}>VS</div>
                          <select
                            value={compMesaB}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCompMesaB(v);
                              if (v && v === compMesaA) {
                                const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                                if (o) setCompMesaA(o.key);
                              }
                            }}
                            style={{
                              ...selectStyleSimple,
                              borderColor: compMesaB ? corTituloBlackjack.borderMix : undefined,
                              width: "100%",
                            }}
                          >
                            {mesasOpcoesBlackjack
                              .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                              .map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {(compMesaA || compMesaB) && (
                          <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                            <div
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                background: corTituloBlackjack.bg,
                                border: corTituloBlackjack.border,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                color: corTituloBlackjack.accent,
                                fontFamily: FONT.body,
                              }}
                            >
                              {labelMesaComparativoA}
                            </div>
                            <div
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                background: corTituloBlackjack.bg,
                                border: corTituloBlackjack.border,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                color: corTituloBlackjack.accent,
                                fontFamily: FONT.body,
                              }}
                            >
                              {labelMesaComparativoB}
                            </div>
                          </div>
                        )}

                        <div className="app-conversao-funil-duo">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <OverviewSpinMesaDiaTabela linhas={linhasMesaA} colTempo="Mês" tituloTabela={labelMesaComparativoA} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                          </div>
                          <div
                            className="app-conversao-funil-divider"
                            style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <OverviewSpinMesaDiaTabela linhas={linhasMesaB} colTempo="Mês" tituloTabela={labelMesaComparativoB} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={tituloMesaSpeedBaccarat}>
                          Speed Baccarat
                        </div>
                        <OverviewSpinMesaDiaTabela linhas={linhasSpeedBaccarat} colTempo="Mês" tituloTabela={"Speed Baccarat"} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={tituloMesaRoleta}>
                          Roleta
                        </div>
                        <OverviewSpinMesaDiaTabela linhas={linhasRoleta} colTempo="Mês" tituloTabela={"Roleta"} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                      </div>
                    </div>
                    {exibirBlocoDadosPorMesaFutebol && (
                      <div style={{ marginTop: 4 }}>
                        <div style={tituloMesaFutebolBrasileiro}>{LABEL_FUTEBOL_BRASILEIRO}</div>
                        <OverviewSpinMesaDiaTabela linhas={linhasFutebolBrasileiro} colTempo="Mês" tituloTabela={LABEL_FUTEBOL_BRASILEIRO} mesSelecionadoLabel={mesSelecionado?.label ?? ""} dataTable={dataTable} brand={brand} t={t} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      </>
      )}
      {aba === "posicionamento" && (
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
          <DashboardPosicionamento
            operadoraSlug={operadoraSlugPosicionamento}
            refDate={refDatePosicionamento}
            slugToNome={slugToNome}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}
