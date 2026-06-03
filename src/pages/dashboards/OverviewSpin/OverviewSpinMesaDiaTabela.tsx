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
import { totaisLinhasMesaPorDia, type LinhaMesaPorDia } from "./overviewSpinLogic";

type Brand = ReturnType<typeof useDashboardBrand>;
type Theme = ReturnType<typeof useApp>["theme"];
type DataTable = ReturnType<typeof createDataTableBlockStyles>;

export type OverviewSpinMesaDiaTabelaProps = {
  linhas: LinhaMesaPorDia[];
  colTempo?: "Data" | "Mês";
  tituloTabela?: string;
  mesSelecionadoLabel?: string;
  dataTable: DataTable;
  brand: Brand;
  t: Theme;
};

export function OverviewSpinMesaDiaTabela({
  linhas,
  colTempo = "Data",
  tituloTabela = "Mesa",
  mesSelecionadoLabel = "",
  dataTable,
  brand,
  t,
}: OverviewSpinMesaDiaTabelaProps) {
  return (
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 560 })}>
            <caption style={{ display: "none" }}>
              {`Resultados de ${tituloTabela} — ${colTempo === "Mês" ? "histórico" : mesSelecionadoLabel ?? ""}`}
            </caption>
            <thead>
              <tr>
                <th scope="col" style={dataTable.thHeaderSticky}>
                  {colTempo}
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
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </td>
                </tr>
              ) : (
                <>
                  {(() => {
                    const tot = totaisLinhasMesaPorDia(linhas);
                    if (!tot) return null;
                    const ggrT = tot.ggr ?? 0;
                    return (
                      <tr
                        key={tot.dataIso}
                        style={{
                          background: dataTable.totalRowBgStrong,
                          borderBottom: `2px solid ${t.cardBorder}`,
                        }}
                      >
                        <td
                          style={{
                            ...dataTable.tdTotalSticky(),
                            color: brand.primary,
                            fontFamily: FONT.body,
                          }}
                        >
                          {tot.labelData}
                        </td>
                        <td
                          style={{
                            ...dataTable.tdTotal,
                            color: ggrT > 0 ? BRAND.verde : ggrT < 0 ? BRAND.vermelho : t.text,
                          }}
                        >
                          {tot.ggr != null ? fmtBRL(tot.ggr) : "—"}
                        </td>
                        <td style={dataTable.tdTotal}>
                          {tot.turnover != null ? fmtBRL(tot.turnover) : "—"}
                        </td>
                        <td style={dataTable.tdTotal}>
                          {tot.bets != null ? tot.bets.toLocaleString("pt-BR") : "—"}
                        </td>
                        <td style={dataTable.tdTotal}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <MarginBadge value={tot.margin_pct} />
                          </div>
                        </td>
                        <td style={dataTable.tdTotal}>
                          {tot.bet_size != null ? fmtBRL(Number(tot.bet_size)) : "—"}
                        </td>
                      </tr>
                    );
                  })()}
                  {linhas.map((row, i) => {
                    const ggr = row.ggr ?? 0;
                    return (
                      <tr key={row.dataIso} style={{ background: dataTable.zebraRow(i) }}>
                        <td style={dataTable.tdSticky({ rowIndex: i })}>{row.labelData}</td>
                        <td
                          style={{
                            ...dataTable.tdCenter,
                            color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                            fontWeight: 600,
                          }}
                        >
                          {row.ggr != null ? fmtBRL(row.ggr) : "—"}
                        </td>
                        <td style={dataTable.tdCenter}>
                          {row.turnover != null ? fmtBRL(row.turnover) : "—"}
                        </td>
                        <td style={dataTable.tdCenter}>
                          {row.bets != null ? row.bets.toLocaleString("pt-BR") : "—"}
                        </td>
                        <td style={dataTable.tdCenter}>
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <MarginBadge value={row.margin_pct} />
                          </div>
                        </td>
                        <td style={dataTable.tdCenter}>
                          {row.bet_size != null ? fmtBRL(Number(row.bet_size)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
  );
}
