import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useAfiliadosFiltrosOptional } from "../AfiliadosFiltrosContext";
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
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Gauge,
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
  | "wd"
  | "pvi"
  | "perfil";

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

export default function DashboardFinanceiro() {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const sf = useAfiliadosFiltrosOptional();
  const historico = sf?.historico ?? false;
  const dataTable = useDataTableBlock();
  const [sort, setSort] = useState<{ col: RankingSortCol; dir: SortDir }>({ col: "ggr", dir: "desc" });

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
          KPIs Financeiros
        </SectionTitle>

        <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
          <KpiCard
            label="FTD"
            value="—"
            subValue={{ label: "ticket médio", value: "—" }}
            icon={<Trophy size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={BRAND.roxo}
            atual={0}
            anterior={0}
            isHistorico={historico}
            isBRL
          />
          <KpiCard
            label="Depósitos"
            value="—"
            subValue={{ label: "ticket médio", value: "—" }}
            icon={<ArrowDownToLine size={16} aria-hidden />}
            accentVar="--brand-icon-color"
            accentColor={BRAND.ciano}
            atual={0}
            anterior={0}
            isHistorico={historico}
            isBRL
          />
          <KpiCard
            label="Saques"
            value="—"
            subValue={{ label: "ticket médio", value: "—" }}
            icon={<ArrowUpFromLine size={16} aria-hidden />}
            accentColor={BRAND.vermelho}
            atual={0}
            anterior={0}
            isHistorico={historico}
            isBRL
            isInverso
          />
        </div>
        <div className="app-grid-kpi-3">
          <KpiCard
            label="WD Ratio"
            value="—"
            icon={<Scale size={16} aria-hidden />}
            accentColor={BRAND.vermelho}
            atual={0}
            anterior={0}
            isHistorico={historico}
            isInverso
          />
          <KpiCard
            label="GGR por Jogador"
            value="—"
            icon={<CircleDollarSign size={16} aria-hidden />}
            accentColor={BRAND.roxo}
            atual={0}
            anterior={0}
            isHistorico={historico}
            isBRL
          />
          <KpiCard
            label="PVI"
            value="—"
            subValue={{ label: "Player Value Index (0–100)", value: "" }}
            icon={<Gauge size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={BRAND.verde}
            atual={0}
            anterior={0}
            isHistorico={historico}
          />
        </div>
      </div>

      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>
          Investimento por Afiliado
        </SectionTitle>
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
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>Ranking Financeiro</SectionTitle>
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
        <div
          className="app-table-wrap"
          style={{ ...getDataTableWrapStyle(), opacity: 0.55, pointerEvents: "none" }}
          aria-hidden
        >
          <table style={getDataTableStyle({ minWidth: 900 })}>
            <caption style={{ display: "none" }}>
              Ranking financeiro de afiliados — estrutura de colunas (inclui Perfil PVI)
            </caption>
            <thead>
              <tr>
                <RankingThSort col="nome" label="Afiliado" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="ftdQtd" label="# FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="ftdValor" label="R$ FTD" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="depQtd" label="# Depósitos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="depValor" label="R$ Depósitos" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="saqQtd" label="# Saques" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="saqValor" label="R$ Saques" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="ggr" label="GGR" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="wd" label="WD Ratio" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="pvi" label="PVI" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
                <RankingThSort col="perfil" label="Perfil" sort={sort} setSort={setSort} thStyle={dataTable.thHeader} />
              </tr>
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}
