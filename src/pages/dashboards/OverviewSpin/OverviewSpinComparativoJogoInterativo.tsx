import { Fragment, Suspense, lazy, type Dispatch, type SetStateAction } from "react";
import { Table2, ChartColumnBig } from "lucide-react";
import { MSG_SEM_DADOS_PERIODO } from "../../../lib/dashboardConstants";
import { FONT } from "../../../constants/theme";
import {
  createDataTableBlockStyles,
  dataTableRowHoverHandlers,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../lib/dataTableStyles";
import type { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import type { useApp } from "../../../context/AppContext";
import {
  KPIS_DISPONIVEIS,
  calcularPctComparativoOficial,
  renderValorKpiComparativo,
  type JogoComparativoKey,
  type KpiJogoDef,
  type KpiJogoKey,
  type LinhaComparativoJogoTab,
} from "./overviewSpinLogic";

const OverviewSpinComparativoJogoChart = lazy(() =>
  import("./OverviewSpinCharts").then((m) => ({ default: m.OverviewSpinComparativoJogoChart })),
);

type Brand = ReturnType<typeof useDashboardBrand>;
type Theme = ReturnType<typeof useApp>["theme"];
type DataTable = ReturnType<typeof createDataTableBlockStyles>;

type JogoAtivo = { key: JogoComparativoKey; label: string; cor: string };

export type OverviewSpinComparativoJogoInterativoProps = {
  colTempoLabel: "Data" | "Mês";
  historico: boolean;
  mesSelecionadoLabel?: string;
  modoVisualizacao: "tabela" | "grafico";
  setModoVisualizacao: (m: "tabela" | "grafico") => void;
  kpisSelecionados: Set<KpiJogoKey>;
  setKpisSelecionados: Dispatch<SetStateAction<Set<KpiJogoKey>>>;
  kpiGrafico: KpiJogoKey;
  setKpiGrafico: (k: KpiJogoKey) => void;
  kpisAtivosComparativo: KpiJogoDef[];
  qtdColunasJogoComparativo: number;
  jogosComparativoAtivos: JogoAtivo[];
  linhaTotaisComparativoJogo: LinhaComparativoJogoTab | null;
  linhasComparativoJogo: LinhaComparativoJogoTab[];
  minWidthTabelaComparativoJogo: number;
  dadosGraficoComparativoJogo: Record<string, string | number | null>[];
  kpiGraficoConfig: { label: string; somavel: boolean; tipoGrafico: "barra" | "linha" };
  isBRLKpiGrafico: boolean;
  chartTooltipTheme: { cardBg: string; cardBorder: string; text: string };
  dataTable: DataTable;
  brand: Brand;
  t: Theme;
};

export function OverviewSpinComparativoJogoInterativo(props: OverviewSpinComparativoJogoInterativoProps) {
  const {
    colTempoLabel,
    historico,
    mesSelecionadoLabel,
    modoVisualizacao,
    setModoVisualizacao,
    kpisSelecionados,
    setKpisSelecionados,
    kpiGrafico,
    setKpiGrafico,
    kpisAtivosComparativo,
    qtdColunasJogoComparativo,
    jogosComparativoAtivos,
    linhaTotaisComparativoJogo,
    linhasComparativoJogo,
    minWidthTabelaComparativoJogo,
    dadosGraficoComparativoJogo,
    kpiGraficoConfig,
    isBRLKpiGrafico,
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
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    marginRight: 2,
                  }}
                >
                  KPIs visíveis:
                </span>
                {KPIS_DISPONIVEIS.map((kpi) => {
                  const ativo =
                    modoVisualizacao === "tabela"
                      ? kpisSelecionados.has(kpi.key)
                      : kpiGrafico === kpi.key;
                  return (
                    <button
                      type="button"
                      role="button"
                      key={kpi.key}
                      aria-pressed={ativo}
                      aria-label={
                        modoVisualizacao === "tabela"
                          ? `${ativo ? "Desativar" : "Ativar"} KPI ${kpi.label}`
                          : `KPI do gráfico: ${kpi.label}`
                      }
                      onClick={() => {
                        if (modoVisualizacao === "tabela") {
                          setKpisSelecionados((prev) => {
                            const next = new Set(prev);
                            if (next.has(kpi.key) && next.size === 1) return prev;
                            if (next.has(kpi.key)) next.delete(kpi.key);
                            else next.add(kpi.key);
                            return next;
                          });
                        } else {
                          setKpiGrafico(kpi.key);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 14px",
                        minHeight: 40,
                        borderRadius: 10,
                        cursor: "pointer",
                        fontFamily: FONT.body,
                        fontSize: 12,
                        fontWeight: ativo ? 700 : 500,
                        border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                        background: ativo
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                          : (t.inputBg ?? t.cardBg),
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
              {modoVisualizacao === "grafico" && (
                <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
                  Selecione um KPI para o gráfico
                </span>
              )}
            </div>
    
            <div
              style={{
                display: "flex",
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 10,
                overflow: "hidden",
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
                  aria-pressed={modoVisualizacao === modo}
                  onClick={() => setModoVisualizacao(modo)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 11,
                    fontWeight: modoVisualizacao === modo ? 700 : 400,
                    background:
                      modoVisualizacao === modo ? `color-mix(in srgb, ${brand.accent} 12%, transparent)` : "transparent",
                    color: modoVisualizacao === modo ? brand.accent : t.textMuted,
                    transition: "all 0.15s",
                    borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
    
          {modoVisualizacao === "tabela" ? (
            <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
                <table style={getDataTableStyle({ minWidth: minWidthTabelaComparativoJogo })}>
                  <caption style={{ display: "none" }}>
                    Comparativo de jogo {colTempoLabel === "Mês" ? "histórico" : (mesSelecionadoLabel ?? "")}
                  </caption>
                  <thead>
                    <tr>
                      <th rowSpan={2} scope="col" style={dataTable.thHeaderSticky}>
                        {colTempoLabel}
                      </th>
                      {kpisAtivosComparativo.map((kpi) => (
                        <th
                          key={kpi.key}
                          colSpan={qtdColunasJogoComparativo}
                          scope="colgroup"
                          style={{
                            ...dataTable.thHeader,
                            borderLeft: `2px solid ${t.cardBorder}`,
                            borderBottom: "none",
                          }}
                        >
                          {kpi.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {kpisAtivosComparativo.map((kpi) => (
                        <Fragment key={`sub-${kpi.key}`}>
                          <th
                            scope="col"
                            style={{
                              ...dataTable.thHeaderSub,
                              borderLeft: `2px solid ${t.cardBorder}`,
                              color: t.text,
                            }}
                          >
                            Total
                          </th>
                          {jogosComparativoAtivos.map((jogo) => (
                            <th
                              key={jogo.key}
                              scope="col"
                              style={{
                                ...dataTable.thHeaderSub,
                                color: jogo.cor,
                              }}
                            >
                              {jogo.label}
                            </th>
                          ))}
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linhaTotaisComparativoJogo != null && (() => {
                      const row = linhaTotaisComparativoJogo;
                      const totaisOficiais = row.totaisOficiais;
                      return (
                        <tr
                          key="__totais-comparativo-jogo__"
                          style={{
                            background: dataTable.totalRowBgStrong,
                            borderBottom: `2px solid ${t.cardBorder}`,
                          }}
                        >
                          <th
                            scope="row"
                            style={{
                              ...dataTable.tdTotalSticky(),
                              color: brand.primary,
                              fontFamily: FONT.body,
                            }}
                          >
                            Total
                          </th>
                          {kpisAtivosComparativo.map((kpi) => (
                            <Fragment key={`tot-${kpi.key}`}>
                              <td
                                style={{
                                  ...dataTable.tdTotal,
                                  borderLeft: `2px solid ${t.cardBorder}`,
                                  color: t.text,
                                }}
                              >
                                {renderValorKpiComparativo(kpi, totaisOficiais[kpi.key])}
                              </td>
                              {jogosComparativoAtivos.map((jogo) => {
                                const cel = row[jogo.key];
                                const valorJogo = cel[kpi.key] as number | null;
                                const pct = calcularPctComparativoOficial(valorJogo, row, kpi);
                                return (
                                  <td
                                    key={jogo.key}
                                    style={{
                                      ...dataTable.tdTotal,
                                      color: jogo.cor,
                                    }}
                                  >
                                    {valorJogo != null ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <span>{renderValorKpiComparativo(kpi, valorJogo)}</span>
                                        {kpi.somavel && pct != null && (
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: t.textMuted,
                                              fontWeight: 700,
                                              opacity: 0.75,
                                            }}
                                          >
                                            {pct.toFixed(0)}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              })}
                            </Fragment>
                          ))}
                        </tr>
                      );
                    })()}
                    {linhasComparativoJogo.map((row, i) => {
                      const totaisOficiais = row.totaisOficiais;
                      const zebra = dataTable.zebraRow(i);
                      return (
                        <tr key={row.dataIso} style={{ background: zebra }} {...dataTableRowHoverHandlers(zebra)}>
                          <th scope="row" style={dataTable.tdSticky({ rowIndex: i })}>
                            {row.labelData}
                          </th>
                          {kpisAtivosComparativo.map((kpi) => (
                            <Fragment key={`${row.dataIso}-${kpi.key}`}>
                              <td
                                style={{
                                  ...dataTable.tdCenter,
                                  borderLeft: `2px solid ${t.cardBorder}`,
                                  fontWeight: 700,
                                  color: t.text,
                                }}
                              >
                                {renderValorKpiComparativo(kpi, totaisOficiais[kpi.key])}
                              </td>
                              {jogosComparativoAtivos.map((jogo) => {
                                const cel = row[jogo.key];
                                const valorJogo = cel[kpi.key] as number | null;
                                const pct = calcularPctComparativoOficial(valorJogo, row, kpi);
                                return (
                                  <td
                                    key={jogo.key}
                                    style={{
                                      ...dataTable.tdCenter,
                                      color: jogo.cor,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {valorJogo != null ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <span>{renderValorKpiComparativo(kpi, valorJogo)}</span>
                                        {kpi.somavel && pct != null && (
                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: t.textMuted,
                                              fontWeight: 700,
                                              opacity: 0.75,
                                            }}
                                          >
                                            {pct.toFixed(0)}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              })}
                            </Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          ) : linhasComparativoJogo.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 12,
                fontFamily: FONT.body,
              }}
            >
              {MSG_SEM_DADOS_PERIODO}
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
                Exibindo <strong style={{ color: t.text }}>{kpiGraficoConfig.label}</strong> por jogo
              </p>
              <div
                role="img"
                aria-label={`Gráfico de ${kpiGraficoConfig.label} por jogo — ${historico ? "todo o período" : mesSelecionadoLabel ?? ""}`}
                style={{ width: "100%", height: "clamp(220px, 35vh, 420px)", minHeight: 220 }}
              >
                <Suspense fallback={<div style={{ minHeight: 220 }} aria-hidden="true" />}>
                  <OverviewSpinComparativoJogoChart
                    dados={dadosGraficoComparativoJogo}
                    jogos={jogosComparativoAtivos}
                    kpi={kpiGrafico}
                    config={kpiGraficoConfig}
                    isBRL={isBRLKpiGrafico}
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
