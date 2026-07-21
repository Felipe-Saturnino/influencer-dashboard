import { useEffect } from "react";
import { useAfiliadosFiltrosOptional } from "../AfiliadosFiltrosContext";
import { FunilAfiliados } from "../FunilAfiliados";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { getPageContentBoxStyle } from "../../../../lib/pageContentBoxStyles";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../../lib/dashboardConstants";
import {
  SectionTitle,
  KpiCard,
  SortTableTh,
  type SortDir,
} from "../../../../components/dashboard";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../../lib/dataTableStyles";
import { BarChart2, Coins, Receipt, TrendingUp, Trophy, UserPlus, Wallet } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";

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

export default function DashboardOverview() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const dataTable = useDataTableBlock();
  const [sortRanking, setSortRanking] = useState<{ col: RankingSortCol; dir: SortDir }>({
    col: "ggr",
    dir: "desc",
  });

  useEffect(() => {
    sf?.setIsLoading(false);
  }, [sf]);

  const card = getPageContentBoxStyle(brand, t);

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
        <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
          <KpiCard
            label="GGR"
            value="—"
            icon={<TrendingUp size={16} aria-hidden />}
            accentColor={BRAND.verde}
            atual={0}
            anterior={0}
            isBRL
            isHistorico={historico}
          />
          <KpiCard
            label="Investimento"
            value="—"
            icon={<Coins size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={BRAND.custo}
            atual={0}
            anterior={0}
            isBRL
            isHistorico={historico}
          />
          <KpiCard
            label="ROI"
            value="—"
            icon={<BarChart2 size={16} aria-hidden />}
            accentColor={BRAND.verde}
            atual={0}
            anterior={0}
            isHistorico={historico}
          />
        </div>

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
        <div className="app-grid-kpi-4">
          <KpiCard
            label="Registros"
            value="—"
            icon={<UserPlus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={BRAND.transacao}
            atual={0}
            anterior={0}
            isHistorico={historico}
          />
          <KpiCard
            label="Custo por Registro"
            value="—"
            icon={<Receipt size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={BRAND.custo}
            atual={0}
            anterior={0}
            isBRL
            isHistorico={historico}
          />
          <KpiCard
            label="FTDs"
            value="—"
            icon={<Trophy size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={BRAND.transacao}
            atual={0}
            anterior={0}
            isHistorico={historico}
          />
          <KpiCard
            label="Custo por FTD"
            value="—"
            icon={<Wallet size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={BRAND.custo}
            atual={0}
            anterior={0}
            isBRL
            isHistorico={historico}
          />
        </div>
      </div>

      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Funil de Conversão</SectionTitle>
        <FunilAfiliados />
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Ranking de Afiliados</SectionTitle>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          {MSG_SEM_DADOS_FILTRO}
        </div>
        <div className="app-table-wrap" style={{ ...getDataTableWrapStyle(), opacity: 0.55, pointerEvents: "none" }} aria-hidden>
          <table style={getDataTableStyle({ minWidth: 720 })}>
            <caption style={{ display: "none" }}>Ranking de afiliados — estrutura de colunas</caption>
            <thead>
              <tr>
                <RankingThSort col="nome" label="Afiliado" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="acessos" label="Acessos" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="registros" label="Registros" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="ftds" label="FTDs" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="ggr" label="GGR" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="investimento" label="Investimento" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                <RankingThSort col="roi" label="Performance" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}
