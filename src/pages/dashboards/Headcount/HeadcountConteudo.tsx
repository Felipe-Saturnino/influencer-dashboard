import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Briefcase,
  Building2,
  CalendarPlus,
  CircleDollarSign,
  Loader2,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { HEADCOUNT_HORAS_MES_ESTIMADAS, type HeadcountMetricas } from "../../../lib/headcountMetrics";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { HeadcountCharts } from "./HeadcountCharts";

type Props = {
  metricas: HeadcountMetricas;
  metricasAnterior: HeadcountMetricas | null;
  loading: boolean;
  incluirCusto: boolean;
  historico: boolean;
  erro: string | null;
};

type SortCol =
  | "diretoria"
  | "hcAtivo"
  | "indisponiveis"
  | "admissoes"
  | "desligamentos"
  | "turnover"
  | "massa"
  | "vagas";

function fmtPct(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtTenure(meses: number | null): string {
  if (meses == null || Number.isNaN(meses)) return "—";
  return `${meses.toFixed(1)} meses`;
}

function fmtVariacao(v: number): string {
  if (v > 0) return `+${v}`;
  return String(v);
}

export function HeadcountConteudo({
  metricas,
  metricasAnterior,
  loading,
  incluirCusto,
  historico,
  erro,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const ant = metricasAnterior;

  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "hcAtivo", dir: "desc" });

  const rowsOrdenadas = useMemo(() => {
    const rows = [...metricas.porDiretoria];
    rows.sort((a, b) => {
      switch (sort.col) {
        case "diretoria":
          return compareLocaleTexto(a.diretoriaNome, b.diretoriaNome, sort.dir);
        case "hcAtivo":
          return compareNumber(a.hcAtivo, b.hcAtivo, sort.dir);
        case "indisponiveis":
          return compareNumber(a.indisponiveis, b.indisponiveis, sort.dir);
        case "admissoes":
          return compareNumber(a.admissoes, b.admissoes, sort.dir);
        case "desligamentos":
          return compareNumber(a.desligamentos, b.desligamentos, sort.dir);
        case "turnover":
          return compareNumber(a.turnoverPct ?? -1, b.turnoverPct ?? -1, sort.dir);
        case "massa":
          return compareNumber(a.massaSalarial ?? -1, b.massaSalarial ?? -1, sort.dir);
        case "vagas":
          return compareNumber(a.vagasAbertas, b.vagasAbertas, sort.dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [metricas.porDiretoria, sort]);

  const toggleSort = (col: SortCol) => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  };

  if (loading) {
    return (
      <div style={pageBox}>
        <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: t.textMuted }}>
          <Loader2 size={24} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
          <span style={{ marginLeft: 10, fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={pageBox}>
        <div role="alert" aria-live="polite" style={{ color: "#e84025", fontSize: 13, fontFamily: FONT.body, textAlign: "center", padding: 40 }}>
          {erro}
        </div>
      </div>
    );
  }

  const vazio = metricas.hcAtivo === 0 && metricas.admissoes === 0 && metricas.desligamentos === 0;

  if (vazio) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      </div>
    );
  }

  const subPeriodo = historico ? "acumulado no Histórico" : "no período selecionado";

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={`snapshot e movimento ${subPeriodo}`}>KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-4" style={{ gap: 12 }}>
          <KpiCard
            label="HC Ativo"
            value={String(metricas.hcAtivo)}
            icon={<Users size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.hcAtivo}
            anterior={ant?.hcAtivo ?? metricas.hcAtivo}
            isHistorico={historico}
          />
          <KpiCard
            label="Indisponíveis"
            value={String(metricas.indisponiveis)}
            icon={<UserX size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.indisponiveis}
            anterior={ant?.indisponiveis ?? metricas.indisponiveis}
            isHistorico={historico}
            isInverso
          />
          <KpiCard
            label="Variação Líquida"
            value={fmtVariacao(metricas.variacaoLiquida)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.variacaoLiquida}
            anterior={ant?.variacaoLiquida ?? metricas.variacaoLiquida}
            isHistorico={historico}
          />
          <KpiCard
            label="Tenure Médio"
            value={fmtTenure(metricas.tenureMedioMeses)}
            icon={<UserCheck size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.tenureMedioMeses ?? 0}
            anterior={ant?.tenureMedioMeses ?? metricas.tenureMedioMeses ?? 0}
            isHistorico={historico}
          />
        </div>
        <div className="app-grid-kpi-4" style={{ gap: 12, marginTop: 12 }}>
          <KpiCard
            label="Admissões"
            value={String(metricas.admissoes)}
            icon={<CalendarPlus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.admissoes}
            anterior={ant?.admissoes ?? metricas.admissoes}
            isHistorico={historico}
          />
          <KpiCard
            label="Desligamentos"
            value={String(metricas.desligamentos)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.desligamentos}
            anterior={ant?.desligamentos ?? metricas.desligamentos}
            isHistorico={historico}
            isInverso
          />
          <KpiCard
            label="Turnover"
            value={fmtPct(metricas.turnoverPct)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.turnoverPct ?? 0}
            anterior={ant?.turnoverPct ?? metricas.turnoverPct ?? 0}
            isHistorico={historico}
            isInverso
          />
          <KpiCard
            label="Saídas Voluntárias"
            value={fmtPct(metricas.saidasVoluntariasPct)}
            icon={<Briefcase size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.saidasVoluntariasPct ?? 0}
            anterior={ant?.saidasVoluntariasPct ?? metricas.saidasVoluntariasPct ?? 0}
            isHistorico={historico}
          />
        </div>
      </div>

      {incluirCusto && (
        <div style={pageBox}>
          <SectionTitle sub={`estimativa com ${HEADCOUNT_HORAS_MES_ESTIMADAS} h/mês no estúdio`}>
            Custo de Pessoas
          </SectionTitle>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <KpiCard
              label="Massa Salarial (est.)"
              value={metricas.massaSalarial != null ? fmtBRL(metricas.massaSalarial) : "—"}
              icon={<CircleDollarSign size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={brand.primary}
              atual={metricas.massaSalarial ?? 0}
              anterior={ant?.massaSalarial ?? metricas.massaSalarial ?? 0}
              isBRL
              isHistorico={historico}
              isInverso
            />
            <KpiCard
              label="Custo Médio / HC"
              value={metricas.custoMedioHc != null ? fmtBRL(metricas.custoMedioHc) : "—"}
              icon={<CircleDollarSign size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={brand.accent}
              atual={metricas.custoMedioHc ?? 0}
              anterior={ant?.custoMedioHc ?? metricas.custoMedioHc ?? 0}
              isBRL
              isHistorico={historico}
              isInverso
            />
            <KpiCard
              label="% Custo no Estúdio"
              value={fmtPct(metricas.pctCustoEstudio)}
              icon={<Building2 size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={brand.primary}
              atual={metricas.pctCustoEstudio ?? 0}
              anterior={ant?.pctCustoEstudio ?? metricas.pctCustoEstudio ?? 0}
              isHistorico={historico}
            />
          </div>
        </div>
      )}

      <div style={pageBox}>
        <SectionTitle sub="vagas com inscrição aberta ou em andamento">Pipeline de Contratação</SectionTitle>
        <div className="app-grid-kpi-2" style={{ gap: 12 }}>
          <KpiCard
            label="Vagas Abertas"
            value={String(metricas.vagasAbertas)}
            icon={<Briefcase size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.vagasAbertas}
            anterior={ant?.vagasAbertas ?? metricas.vagasAbertas}
            isHistorico={historico}
          />
          <KpiCard
            label="Vagas Em Andamento"
            value={String(metricas.vagasEmAndamento)}
            icon={<Briefcase size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.vagasEmAndamento}
            anterior={ant?.vagasEmAndamento ?? metricas.vagasEmAndamento}
            isHistorico={historico}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="distribuição e evolução reconstruída por datas de vínculo">
          Mix e Movimento
        </SectionTitle>
        <HeadcountCharts metricas={metricas} t={t} />
        <p style={{ margin: "10px 0 0", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
          O HC histórico é aproximado a partir de data de início e data de desligamento — não é um snapshot auditável
          mensal.
        </p>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="consolidado executivo por diretoria">Detalhamento por Diretoria</SectionTitle>
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: incluirCusto ? 880 : 720 })}>
            <caption style={{ display: "none" }}>Headcount consolidado por diretoria</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Diretoria"
                  col="diretoria"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeaderSticky}
                  align="center"
                />
                <SortTableTh
                  label="HC Ativo"
                  col="hcAtivo"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Indisp."
                  col="indisponiveis"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Adm."
                  col="admissoes"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Saídas"
                  col="desligamentos"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Turnover"
                  col="turnover"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                {incluirCusto && (
                  <SortTableTh
                    label="Massa sal."
                    col="massa"
                    sortCol={sort.col}
                    sortDir={sort.dir}
                    onSort={toggleSort}
                    thStyle={dataTable.thHeader}
                    align="center"
                  />
                )}
                <SortTableTh
                  label="Vagas"
                  col="vagas"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
              </tr>
            </thead>
            <tbody>
              {rowsOrdenadas.map((row, i) => (
                <tr key={row.diretoriaId} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdSticky()}>{row.diretoriaNome}</td>
                  <td style={dataTable.tdCenter}>{row.hcAtivo}</td>
                  <td style={dataTable.tdCenter}>{row.indisponiveis}</td>
                  <td style={dataTable.tdCenter}>{row.admissoes}</td>
                  <td style={dataTable.tdCenter}>{row.desligamentos}</td>
                  <td style={dataTable.tdCenter}>{fmtPct(row.turnoverPct)}</td>
                  {incluirCusto && (
                    <td style={dataTable.tdCenter}>
                      {row.massaSalarial != null ? fmtBRL(row.massaSalarial) : "—"}
                    </td>
                  )}
                  <td style={dataTable.tdCenter}>{row.vagasAbertas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
