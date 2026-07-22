import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useAfiliadosFiltrosOptional } from "../AfiliadosFiltrosContext";
import { FunilAfiliados } from "../FunilAfiliados";
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
import { BarChart2, Coins, Receipt, TrendingUp, Trophy, UserPlus, Wallet } from "lucide-react";

type RankingSortCol = "nome" | "acessos" | "registros" | "ftds" | "ggr" | "investimento" | "roi";

function RankingThSort({
  col,
  label,
  sortRanking,
  setSortRanking,
  thStyle,
}: {
  col: RankingSortCol;
  label: string;
  sortRanking: { col: RankingSortCol; dir: SortDir };
  setSortRanking: Dispatch<SetStateAction<{ col: RankingSortCol; dir: SortDir }>>;
  thStyle: React.CSSProperties;
}) {
  return (
    <SortTableTh
      col={col}
      label={label}
      sortCol={sortRanking.col}
      sortDir={sortRanking.dir}
      thStyle={thStyle}
      align="center"
      onSort={(c) =>
        setSortRanking((s) => ({
          col: c,
          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
        }))
      }
    />
  );
}

function performanceSortValue(roi: number | null, ggr: number, investimento: number): number {
  if (roi !== null) return roi;
  if (investimento === 0) {
    if (ggr > 0) return 1e9;
    if (ggr < 0) return ggr;
    return -1e9;
  }
  return 0;
}

export default function DashboardOverview() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const loading = sf?.isLoading ?? false;
  const totais = sf?.totais;
  const totaisAnt = sf?.totaisAnt;
  const ranking = useMemo(() => sf?.ranking ?? [], [sf?.ranking]);
  const dataTable = useDataTableBlock();
  const [sortRanking, setSortRanking] = useState<{ col: RankingSortCol; dir: SortDir }>({
    col: "ggr",
    dir: "desc",
  });

  const rankingOrdenado = useMemo(() => {
    const list = [...ranking];
    const dir = sortRanking.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortRanking.col) {
        case "nome":
          cmp = a.nome.localeCompare(b.nome, "pt-BR");
          break;
        case "acessos":
          cmp = a.acessos - b.acessos;
          break;
        case "registros":
          cmp = a.registros - b.registros;
          break;
        case "ftds":
          cmp = a.ftds - b.ftds;
          break;
        case "ggr":
          cmp = a.ggr - b.ggr;
          break;
        case "investimento":
          cmp = a.investimento - b.investimento;
          break;
        case "roi":
          cmp =
            performanceSortValue(a.roi, a.ggr, a.investimento) -
            performanceSortValue(b.roi, b.ggr, b.investimento);
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });
    return list;
  }, [ranking, sortRanking]);

  const card = getPageContentBoxStyle(brand, t);
  const ggr = totais?.ggr ?? 0;
  const invest = totais?.investimento ?? 0;
  const roi = totais?.roi ?? 0;
  const registros = totais?.registros ?? 0;
  const ftds = totais?.ftds ?? 0;
  const acessos = totais?.acessos ?? 0;
  const custoReg = totais?.custoPorRegistro ?? 0;
  const custoFtd = totais?.custoPorFTD ?? 0;

  return (
    <div className="app-page-shell" style={{ paddingTop: 0 }}>
      <div style={card}>
        <SectionTitle
          sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Executivos
        </SectionTitle>

        <div
          style={{
            fontSize: 10,
            color: t.textMuted,
            fontFamily: FONT.body,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Financeiro
        </div>
        {loading ? (
          <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </div>
        ) : (
          <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
            <KpiCard
              label="GGR"
              value={fmtBRL(ggr)}
              icon={<TrendingUp size={16} aria-hidden />}
              accentColor={ggr >= 0 ? BRAND.verde : BRAND.vermelho}
              atual={ggr}
              anterior={totaisAnt?.ggr ?? 0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="Investimento"
              value={fmtBRL(invest)}
              icon={<Coins size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={BRAND.custo}
              atual={invest}
              anterior={totaisAnt?.investimento ?? 0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="ROI"
              value={invest > 0 ? `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%` : "—"}
              icon={<BarChart2 size={16} aria-hidden />}
              accentColor={invest > 0 ? (roi >= 0 ? BRAND.verde : BRAND.vermelho) : BRAND.verde}
              atual={roi}
              anterior={totaisAnt?.roi ?? 0}
              isHistorico={historico}
            />
          </div>
        )}

        <div
          style={{
            borderTop: `1px solid ${t.cardBorder}`,
            margin: "16px 0 12px",
            paddingTop: 12,
            fontSize: 10,
            color: t.textMuted,
            fontFamily: FONT.body,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Conversão
        </div>
        {loading ? (
          <div className="app-grid-kpi-4">
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </div>
        ) : (
          <div className="app-grid-kpi-4">
            <KpiCard
              label="Registros"
              value={registros.toLocaleString("pt-BR")}
              icon={<UserPlus size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.transacao}
              atual={registros}
              anterior={totaisAnt?.registros ?? 0}
              isHistorico={historico}
            />
            <KpiCard
              label="Custo por Registro"
              value={registros > 0 ? fmtBRL(custoReg) : "—"}
              icon={<Receipt size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={BRAND.custo}
              atual={custoReg}
              anterior={totaisAnt?.custoPorRegistro ?? 0}
              isBRL
              isHistorico={historico}
            />
            <KpiCard
              label="FTDs"
              value={ftds.toLocaleString("pt-BR")}
              icon={<Trophy size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={BRAND.transacao}
              atual={ftds}
              anterior={totaisAnt?.ftds ?? 0}
              isHistorico={historico}
            />
            <KpiCard
              label="Custo por FTD"
              value={ftds > 0 ? fmtBRL(custoFtd) : "—"}
              icon={<Wallet size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={BRAND.custo}
              atual={custoFtd}
              anterior={totaisAnt?.custoPorFTD ?? 0}
              isBRL
              isHistorico={historico}
            />
          </div>
        )}
      </div>

      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Funil de Conversão</SectionTitle>
        <FunilAfiliados acessos={acessos} registros={registros} ftds={ftds} />
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Ranking de Afiliados</SectionTitle>
        {!loading && rankingOrdenado.length === 0 ? (
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
            <table style={getDataTableStyle({ minWidth: 720 })}>
              <caption style={{ display: "none" }}>Ranking de afiliados por performance</caption>
              <thead>
                <tr>
                  <RankingThSort col="nome" label="Afiliado" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeaderSticky} />
                  <RankingThSort col="acessos" label="Acessos" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="registros" label="Registros" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ftds" label="FTDs" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ggr" label="GGR" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="investimento" label="Investimento" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="roi" label="Performance" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? null
                  : rankingOrdenado.map((r, i) => (
                      <tr key={r.afiliado_id} style={{ background: dataTable.zebraRow(i) }}>
                        <td style={dataTable.tdSticky({ rowIndex: i })}>{r.nome}</td>
                        <td style={dataTable.tdCenter}>{r.acessos.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{r.registros.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{r.ftds.toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{fmtBRL(r.ggr)}</td>
                        <td style={dataTable.tdCenter}>{fmtBRL(r.investimento)}</td>
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
    </div>
  );
}
