import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useAfiliadosFiltrosOptional } from "../AfiliadosFiltrosContext";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../../lib/dashboardConstants";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import {
  SectionTitle,
  KpiCard,
  SkeletonKpiCard,
  SortTableTh,
  type SortDir,
} from "../../../../components/dashboard";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../../lib/dataTableStyles";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Scale,
  Trophy,
} from "lucide-react";

type RankingSortCol =
  | "nome"
  | "ftdQtd"
  | "ftdValor"
  | "depQtd"
  | "depValor"
  | "saqQtd"
  | "saqValor"
  | "ggr"
  | "wd";

function RankingThSort({
  col,
  label,
  sort,
  setSort,
  thStyle,
}: {
  col: RankingSortCol;
  label: string;
  sort: { col: RankingSortCol; dir: SortDir };
  setSort: Dispatch<SetStateAction<{ col: RankingSortCol; dir: SortDir }>>;
  thStyle: React.CSSProperties;
}) {
  return (
    <SortTableTh
      col={col}
      label={label}
      sortCol={sort.col}
      sortDir={sort.dir}
      thStyle={thStyle}
      align="center"
      onSort={(c) =>
        setSort((s) => ({
          col: c,
          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
        }))
      }
    />
  );
}

function wdRatio(saques: number, depositos: number): number | null {
  if (depositos <= 0) return null;
  return (saques / depositos) * 100;
}

export default function DashboardFinanceiro() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const loading = sf?.isLoading ?? false;
  const totais = sf?.totais;
  const totaisAnt = sf?.totaisAnt;
  const ranking = sf?.ranking ?? [];
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: RankingSortCol; dir: SortDir }>({ col: "ggr", dir: "desc" });

  const card = getPageContentBoxStyle(brand, t);

  const ftds = totais?.ftds ?? 0;
  const ftdTotal = totais?.ftd_total ?? 0;
  const depQtd = totais?.depositos_qtd ?? 0;
  const depValor = totais?.depositos_valor ?? 0;
  const saqQtd = totais?.saques_qtd ?? 0;
  const saqValor = totais?.saques_valor ?? 0;
  const ggr = totais?.ggr ?? 0;
  const ticketFtd = ftds > 0 ? ftdTotal / ftds : 0;
  const ticketDep = depQtd > 0 ? depValor / depQtd : 0;
  const ticketSaq = saqQtd > 0 ? saqValor / saqQtd : 0;
  const wd = wdRatio(saqValor, depValor);
  const ggrPorJogador = ftds > 0 ? ggr / ftds : 0;

  const rankingOrdenado = useMemo(() => {
    const list = ranking.map((r) => ({
      ...r,
      wd: wdRatio(r.saques_valor, r.depositos_valor),
    }));
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sort.col) {
        case "nome":
          cmp = a.nome.localeCompare(b.nome, "pt-BR");
          break;
        case "ftdQtd":
          cmp = a.ftds - b.ftds;
          break;
        case "ftdValor":
          cmp = a.ftd_total - b.ftd_total;
          break;
        case "depQtd":
          cmp = a.depositos_qtd - b.depositos_qtd;
          break;
        case "depValor":
          cmp = a.depositos_valor - b.depositos_valor;
          break;
        case "saqQtd":
          cmp = a.saques_qtd - b.saques_qtd;
          break;
        case "saqValor":
          cmp = a.saques_valor - b.saques_valor;
          break;
        case "ggr":
          cmp = a.ggr - b.ggr;
          break;
        case "wd":
          cmp = (a.wd ?? -1) - (b.wd ?? -1);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [ranking, sort]);

  const investPorAfiliado = useMemo(
    () => ranking.filter((r) => r.investimento > 0).sort((a, b) => b.investimento - a.investimento),
    [ranking],
  );

  return (
    <div className="app-page-shell" style={{ paddingTop: 0 }}>
      <div style={card}>
        <SectionTitle
          sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Financeiros
        </SectionTitle>

        {loading ? (
          <>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
            <div className="app-grid-kpi-3">
              <SkeletonKpiCard />
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </div>
          </>
        ) : (
          <>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              <KpiCard
                label="FTD"
                value={fmtBRL(ftdTotal)}
                subValue={{ label: "ticket médio", value: ftds > 0 ? fmtBRL(ticketFtd) : "—" }}
                icon={<Trophy size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.roxo}
                atual={ftdTotal}
                anterior={totaisAnt?.ftd_total ?? 0}
                isHistorico={historico}
                isBRL
              />
              <KpiCard
                label="Depósitos"
                value={fmtBRL(depValor)}
                subValue={{ label: "ticket médio", value: depQtd > 0 ? fmtBRL(ticketDep) : "—" }}
                icon={<ArrowDownToLine size={16} aria-hidden />}
                accentVar="--brand-icon-color"
                accentColor={BRAND.ciano}
                atual={depValor}
                anterior={totaisAnt?.depositos_valor ?? 0}
                isHistorico={historico}
                isBRL
              />
              <KpiCard
                label="Saques"
                value={fmtBRL(saqValor)}
                subValue={{ label: "ticket médio", value: saqQtd > 0 ? fmtBRL(ticketSaq) : "—" }}
                icon={<ArrowUpFromLine size={16} aria-hidden />}
                accentColor={BRAND.vermelho}
                atual={saqValor}
                anterior={totaisAnt?.saques_valor ?? 0}
                isHistorico={historico}
                isBRL
                isInverso
              />
            </div>
            <div className="app-grid-kpi-3">
              <KpiCard
                label="WD Ratio"
                value={wd !== null ? `${wd.toFixed(1)}%` : "—"}
                icon={<Scale size={16} aria-hidden />}
                accentColor={BRAND.vermelho}
                atual={wd ?? 0}
                anterior={
                  wdRatio(totaisAnt?.saques_valor ?? 0, totaisAnt?.depositos_valor ?? 0) ?? 0
                }
                isHistorico={historico}
                isInverso
              />
              <KpiCard
                label="GGR por Jogador"
                value={ftds > 0 ? fmtBRL(ggrPorJogador) : "—"}
                icon={<CircleDollarSign size={16} aria-hidden />}
                accentColor={BRAND.roxo}
                atual={ggrPorJogador}
                anterior={
                  (totaisAnt?.ftds ?? 0) > 0
                    ? (totaisAnt?.ggr ?? 0) / (totaisAnt?.ftds ?? 1)
                    : 0
                }
                isHistorico={historico}
                isBRL
              />
              <KpiCard
                label="GGR"
                value={fmtBRL(ggr)}
                icon={<CircleDollarSign size={16} aria-hidden />}
                accentColor={ggr >= 0 ? BRAND.verde : BRAND.vermelho}
                atual={ggr}
                anterior={totaisAnt?.ggr ?? 0}
                isHistorico={historico}
                isBRL
              />
            </div>
          </>
        )}
      </div>

      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>
          Investimento por Afiliado
        </SectionTitle>
        {investPorAfiliado.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 480 })}>
              <caption style={{ display: "none" }}>Investimento pago por afiliado</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Afiliado</th>
                  <th scope="col" style={dataTable.thHeader}>Investimento</th>
                  <th scope="col" style={dataTable.thHeader}>GGR</th>
                  <th scope="col" style={dataTable.thHeader}>ROI</th>
                </tr>
              </thead>
              <tbody>
                {investPorAfiliado.map((r, i) => (
                  <tr key={r.afiliado_id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{r.nome}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.investimento)}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.ggr)}</td>
                    <td style={dataTable.tdCenter}>
                      {r.roi !== null ? `${r.roi >= 0 ? "+" : ""}${r.roi.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Ranking Financeiro</SectionTitle>
        {rankingOrdenado.length === 0 ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: t.textMuted,
              fontSize: 13,
              fontFamily: FONT.body,
            }}
          >
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 900 })}>
              <caption style={{ display: "none" }}>Ranking financeiro de afiliados</caption>
              <thead>
                <tr>
                  <RankingThSort col="nome" label="Afiliado" sort={sort} setSort={setSort} thStyle={dataTable.thHeaderSticky} />
                  <RankingThSort col="ftdQtd" label="# FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ftdValor" label="R$ FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="depQtd" label="# Depósitos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="depValor" label="R$ Depósitos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="saqQtd" label="# Saques" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="saqValor" label="R$ Saques" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ggr" label="GGR" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                  <RankingThSort col="wd" label="WD Ratio" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                </tr>
              </thead>
              <tbody>
                {rankingOrdenado.map((r, i) => (
                  <tr key={r.afiliado_id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky({ rowIndex: i })}>{r.nome}</td>
                    <td style={dataTable.tdCenter}>{r.ftds.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.ftd_total)}</td>
                    <td style={dataTable.tdCenter}>{r.depositos_qtd.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.depositos_valor)}</td>
                    <td style={dataTable.tdCenter}>{r.saques_qtd.toLocaleString("pt-BR")}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.saques_valor)}</td>
                    <td style={dataTable.tdCenter}>{fmtBRL(r.ggr)}</td>
                    <td style={dataTable.tdCenter}>{r.wd !== null ? `${r.wd.toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
