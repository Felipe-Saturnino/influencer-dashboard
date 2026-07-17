import { Fragment, Suspense, lazy, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Table2, ChartColumnBig } from "lucide-react";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { FONT } from "../../../constants/theme";
import {
  createDataTableBlockStyles,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../lib/dataTableStyles";
import { MarginBadge } from "../../../components/dashboard";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { useApp } from "../../../context/AppContext";
import {
  KPIS_DISPONIVEIS,
  agregaDailyRawPorOperadoraNoDia,
  agregaDailyRawPorOperadoraNoMes,
  normalizeMesasYmd,
  type DailyRawRow,
  type KpiJogoKey,
  type LinhaDetalheTab,
  type MonthlyRawRow,
} from "./overviewSpinLogic";

const OverviewSpinDetalhamentoChart = lazy(() =>
  import("./OverviewSpinCharts").then((m) => ({ default: m.OverviewSpinDetalhamentoChart })),
);

type Brand = ReturnType<typeof useDashboardBrand>;
type Theme = ReturnType<typeof useApp>["theme"];
type DataTable = ReturnType<typeof createDataTableBlockStyles>;

export type OverviewSpinDetalhamentoInterativoProps = {
  colTempoLabel: "Data" | "Mês";
  historico: boolean;
  mesSelecionadoLabel?: string;
  modoAgregadoTodasOperadoras: boolean;
  modoVisualizacaoDetalhe: "tabela" | "grafico";
  setModoVisualizacaoDetalhe: (m: "tabela" | "grafico") => void;
  kpiGraficoDetalhe: KpiJogoKey;
  setKpiGraficoDetalhe: (k: KpiJogoKey) => void;
  tabelaRows: LinhaDetalheTab[];
  expandedDetalhe: Set<string>;
  setExpandedDetalhe: Dispatch<SetStateAction<Set<string>>>;
  dailyRawUnmerged: DailyRawRow[];
  monthlyRawUnmerged: MonthlyRawRow[];
  podeVerOperadora: (slug: string) => boolean;
  slugToNome: (slug: string) => string;
  dadosGraficoDetalheOperadoras: Record<string, unknown>[];
  slugsGraficoDetalhe: string[];
  coresOperadorasDetalhe: Map<string, string>;
  kpiGraficoDetalheConfig: { label: string; somavel: boolean; tipoGrafico: "barra" | "linha" };
  isBRLKpiGraficoDetalhe: boolean;
  chartTooltipTheme: { cardBg: string; cardBorder: string; text: string };
  dataTable: DataTable;
  brand: Brand;
  t: Theme;
};

export function OverviewSpinDetalhamentoInterativo(props: OverviewSpinDetalhamentoInterativoProps) {
  const {
    colTempoLabel,
    historico,
    mesSelecionadoLabel,
    modoAgregadoTodasOperadoras,
    modoVisualizacaoDetalhe,
    setModoVisualizacaoDetalhe,
    kpiGraficoDetalhe,
    setKpiGraficoDetalhe,
    tabelaRows,
    expandedDetalhe,
    setExpandedDetalhe,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    podeVerOperadora,
    slugToNome,
    dadosGraficoDetalheOperadoras,
    slugsGraficoDetalhe,
    coresOperadorasDetalhe,
    kpiGraficoDetalheConfig,
    isBRLKpiGraficoDetalhe,
    chartTooltipTheme,
    dataTable,
    brand,
    t,
  } = props;

  return (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px", minWidth: 0 }}>
              {modoVisualizacaoDetalhe === "grafico" && (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {KPIS_DISPONIVEIS.map((kpi) => {
                      const ativo = kpiGraficoDetalhe === kpi.key;
                      return (
                        <button
                          type="button"
                          key={kpi.key}
                          role="button"
                          aria-pressed={ativo}
                          aria-label={`KPI do gráfico: ${kpi.label}`}
                          onClick={() => setKpiGraficoDetalhe(kpi.key)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 12px",
                            borderRadius: 999,
                            cursor: "pointer",
                            fontFamily: FONT.body,
                            fontSize: 11,
                            fontWeight: ativo ? 700 : 400,
                            border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                            background: ativo ? `color-mix(in srgb, ${brand.accent} 12%, transparent)` : "transparent",
                            color: ativo ? brand.accent : t.textMuted,
                            transition: "all 0.15s",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: ativo ? brand.accent : t.cardBorder,
                              flexShrink: 0,
                              transition: "background 0.15s",
                            }}
                          />
                          {kpi.label}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
                    Selecione um KPI para o gráfico
                  </span>
                </>
              )}
            </div>
    
            <div
              style={{
                display: "flex",
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {(
                [
                  { modo: "tabela" as const, icon: <Table2 size={14} aria-hidden />, label: "Tabela" },
                  { modo: "grafico" as const, icon: <ChartColumnBig size={14} aria-hidden />, label: "Gráfico" },
                ] as const
              ).map(({ modo, icon, label }) => (
                <button
                  type="button"
                  key={modo}
                  aria-label={`Ver em ${label}`}
                  aria-pressed={modoVisualizacaoDetalhe === modo}
                  onClick={() => setModoVisualizacaoDetalhe(modo)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 11,
                    fontWeight: modoVisualizacaoDetalhe === modo ? 700 : 400,
                    background:
                      modoVisualizacaoDetalhe === modo
                        ? `color-mix(in srgb, ${brand.accent} 12%, transparent)`
                        : "transparent",
                    color: modoVisualizacaoDetalhe === modo ? brand.accent : t.textMuted,
                    transition: "all 0.15s",
                    borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
    
          {modoVisualizacaoDetalhe === "tabela" ? (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>
                  {historico ? "Detalhamento mensal consolidado" : "Detalhamento diário consolidado"}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={dataTable.thHeaderSticky}>
                      {colTempoLabel}
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      GGR
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Turnover
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Apostas
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Margem
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      Aposta média
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      UAP
                    </th>
                    <th scope="col" style={dataTable.thHeader}>
                      ARPU
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaRows.map((r, i) => {
                    const ggr = r.ggr ?? 0;
                    const drillId = r.drillId;
                    const isDrillParent = modoAgregadoTodasOperadoras && drillId != null;
                    const aberto = drillId != null && expandedDetalhe.has(drillId);
                    const subLinhas =
                      isDrillParent && aberto
                        ? (
                            historico
                              ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, drillId, monthlyRawUnmerged)
                              : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, normalizeMesasYmd(drillId))
                          ).filter((sl) => podeVerOperadora(sl.operadora_slug))
                        : [];
                    const rowKey = drillId ?? `${r.label}-${i}`;
                    return (
                      <Fragment key={rowKey}>
                        <tr style={{ background: dataTable.zebraRow(i) }}>
                          <td style={dataTable.tdSticky({ rowIndex: i })}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                              }}
                            >
                              {isDrillParent ? (
                                <button
                                  type="button"
                                  aria-expanded={aberto}
                                  aria-label={
                                    aberto
                                      ? `Recolher detalhe por operadora — ${r.label}`
                                      : `Expandir detalhe por operadora — ${r.label}`
                                  }
                                  onClick={() => {
                                    setExpandedDetalhe((prev) => {
                                      const n = new Set(prev);
                                      if (n.has(drillId)) n.delete(drillId);
                                      else n.add(drillId);
                                      return n;
                                    });
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: t.text,
                                    fontFamily: FONT.body,
                                    fontWeight: 600,
                                    padding: 0,
                                    textAlign: "center",
                                  }}
                                >
                                  <ChevronDown
                                    size={16}
                                    aria-hidden
                                    style={{
                                      transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
                                      transition: "transform 0.15s ease",
                                      flexShrink: 0,
                                    }}
                                  />
                                  {r.label}
                                </button>
                              ) : (
                                r.label
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                              fontWeight: 600,
                            }}
                          >
                            {r.ggr != null ? fmtBRL(r.ggr) : "—"}
                          </td>
                          <td style={dataTable.tdCenter}>
                            {r.turnover != null ? fmtBRL(r.turnover) : "—"}
                          </td>
                          <td style={dataTable.tdCenter}>
                            {r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}
                          </td>
                          <td style={dataTable.tdCenter}>
                            <div style={{ display: "flex", justifyContent: "center" }}>
                              <MarginBadge value={r.margin_pct} />
                            </div>
                          </td>
                          <td style={dataTable.tdCenter}>
                            {r.bet_size != null ? fmtBRL(Number(r.bet_size)) : "—"}
                          </td>
                          <td style={dataTable.tdCenter}>
                            {r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}
                          </td>
                          <td style={dataTable.tdCenter}>
                            {r.arpu != null ? fmtBRL(Number(r.arpu)) : "—"}
                          </td>
                        </tr>
                        {isDrillParent &&
                          aberto &&
                          subLinhas.map((sl, j) => {
                            const gg = sl.ggr ?? 0;
                            return (
                              <tr
                                key={`${rowKey}-${sl.operadora_slug}`}
                                style={{
                                  background: dataTable.zebraRow(i + j + 1, "action"),
                                  borderTop: j === 0 ? `1px solid ${t.cardBorder}` : undefined,
                                }}
                              >
                                <th
                                  scope="row"
                                  style={{
                                    ...dataTable.tdSticky({
                                      rowIndex: i + j + 1,
                                      paddingLeft: 32,
                                      stripeAccent: "action",
                                    }),
                                    boxShadow: `${dataTable.shadow}, inset 3px 0 0 color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)`,
                                    textAlign: "center",
                                  }}
                                >
                                  {slugToNome(sl.operadora_slug)}
                                </th>
                                <td
                                  style={{
                                    ...dataTable.tdCenter,
                                    color: gg > 0 ? BRAND.verde : gg < 0 ? BRAND.vermelho : t.text,
                                    fontWeight: 600,
                                  }}
                                >
                                  {sl.ggr != null ? fmtBRL(sl.ggr) : "—"}
                                </td>
                                <td style={dataTable.tdCenter}>
                                  {sl.turnover != null ? fmtBRL(sl.turnover) : "—"}
                                </td>
                                <td style={dataTable.tdCenter}>
                                  {sl.bets != null ? sl.bets.toLocaleString("pt-BR") : "—"}
                                </td>
                                <td style={dataTable.tdCenter}>
                                  <div style={{ display: "flex", justifyContent: "center" }}>
                                    <MarginBadge value={sl.margin_pct} />
                                  </div>
                                </td>
                                <td style={dataTable.tdCenter}>
                                  {sl.bet_size != null ? fmtBRL(sl.bet_size) : "—"}
                                </td>
                                <td style={dataTable.tdCenter}>
                                  {sl.uap != null ? sl.uap.toLocaleString("pt-BR") : "—"}
                                </td>
                                <td style={dataTable.tdCenter}>
                                  {sl.arpu != null ? fmtBRL(sl.arpu) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : dadosGraficoDetalheOperadoras.length === 0 || slugsGraficoDetalhe.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 12,
                fontFamily: FONT.body,
              }}
            >
              {MSG_SEM_DADOS_FILTRO}
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  marginBottom: 8,
                  marginTop: 0,
                }}
              >
                Exibindo <strong style={{ color: t.text }}>{kpiGraficoDetalheConfig.label}</strong> por operadora
              </p>
              <div
                role="img"
                aria-label={`Gráfico de ${kpiGraficoDetalheConfig.label} por operadora — ${historico ? "todo o período" : mesSelecionadoLabel ?? ""}`}
                style={{ width: "100%", height: "clamp(220px, 35vh, 420px)", minHeight: 220 }}
              >
                <Suspense fallback={<div style={{ minHeight: 220 }} aria-hidden="true" />}>
                  <OverviewSpinDetalhamentoChart
                    dados={dadosGraficoDetalheOperadoras}
                    slugs={slugsGraficoDetalhe}
                    cores={coresOperadorasDetalhe}
                    slugToNome={slugToNome}
                    kpi={kpiGraficoDetalhe}
                    config={kpiGraficoDetalheConfig}
                    isBRL={isBRLKpiGraficoDetalhe}
                    tooltipTheme={chartTooltipTheme}
                    t={t}
                  />
                </Suspense>
              </div>
            </>
          )}
        </>
  );
}
