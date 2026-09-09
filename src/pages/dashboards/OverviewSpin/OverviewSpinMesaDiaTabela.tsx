import { BRAND, MSG_SEM_DADOS_PERIODO } from "../../../lib/dashboardConstants";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { FONT } from "../../../constants/theme";
import {
  createDataTableBlockStyles,
  dataTableRowHoverHandlers,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../lib/dataTableStyles";
import { MarginBadge } from "../../../components/dashboard";
import { TabelaComPaginacao } from "../../../components/TabelaPaginacaoBar";
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
  if (linhas.length === 0) {
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
            <tr>
              <td colSpan={6} style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                {MSG_SEM_DADOS_PERIODO}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const tot = totaisLinhasMesaPorDia(linhas);
  const ggrT = tot?.ggr ?? 0;

  return (
    <TabelaComPaginacao
      items={linhas}
      t={t}
      resetKey={`${colTempo}|${tituloTabela}|${linhas.length}|${linhas[0]?.dataIso ?? ""}`}
    >
      {(pageRows, zebraIdx) => (
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
              {tot ? (
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
              ) : null}
              {pageRows.map((row, i) => {
                const ggr = row.ggr ?? 0;
                const z = zebraIdx(i);
                const zebra = dataTable.zebraRow(z);
                return (
                  <tr key={row.dataIso} style={{ background: zebra }} {...dataTableRowHoverHandlers(zebra)}>
                    <td style={dataTable.tdSticky({ rowIndex: z })}>{row.labelData}</td>
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
            </tbody>
          </table>
        </div>
      )}
    </TabelaComPaginacao>
  );
}
