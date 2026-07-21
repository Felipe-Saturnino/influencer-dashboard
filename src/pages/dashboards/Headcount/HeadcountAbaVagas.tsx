import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Briefcase, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import type { HeadcountVagasMetricas } from "../../../lib/headcountMetrics";
import { OverviewGenericFunnel } from "../../comercial/OverviewComercial/OverviewGenericFunnel";
import { HeadcountKpiCard } from "./HeadcountKpiCard";

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b", "#a78bfa", "#14b8a6", "#e84025", "#6b7280"] as const;

type Props = {
  metricas: HeadcountVagasMetricas;
  anterior: HeadcountVagasMetricas;
  loading: boolean;
};

type SortCol = "titulo" | "tipo" | "org" | "abertura" | "encerramento" | "repasse" | "candidatos" | "status";

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function HeadcountAbaVagas({ metricas, anterior, loading }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "abertura", dir: "desc" });

  const rows = useMemo(() => {
    const list = [...metricas.tabela];
    list.sort((a, b) => {
      switch (sort.col) {
        case "titulo":
          return compareLocaleTexto(a.titulo, b.titulo, sort.dir);
        case "tipo":
          return compareLocaleTexto(a.tipoLabel, b.tipoLabel, sort.dir);
        case "org":
          return compareLocaleTexto(a.organograma, b.organograma, sort.dir);
        case "abertura":
          return compareLocaleTexto(a.dataAbertura ?? "", b.dataAbertura ?? "", sort.dir);
        case "encerramento":
          return compareLocaleTexto(a.dataEncerramento ?? "", b.dataEncerramento ?? "", sort.dir);
        case "repasse":
          return compareNumber(a.repasseCentavos ?? -1, b.repasseCentavos ?? -1, sort.dir);
        case "candidatos":
          return compareNumber(a.candidatos, b.candidatos, sort.dir);
        case "status":
          return compareLocaleTexto(a.statusLabel, b.statusLabel, sort.dir);
        default:
          return 0;
      }
    });
    return list;
  }, [metricas.tabela, sort]);

  const toggleSort = (col: SortCol) => {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }));
  };

  if (loading) {
    return (
      <div style={pageBox}>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: 40, color: t.textMuted }}>
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
        </div>
      </div>
    );
  }

  const pieOrigem = metricas.origemCandidaturas.map((x) => ({ name: x.label, value: x.valor }));

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="status das vagas e candidaturas no mês">KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          <HeadcountKpiCard
            label="Vagas Abertas"
            value={String(metricas.abertas)}
            icon={<Briefcase size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            anteriorLabel={String(anterior.abertas)}
          />
          <HeadcountKpiCard
            label="Vagas Em Andamento"
            value={String(metricas.emAndamento)}
            icon={<Briefcase size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            anteriorLabel={String(anterior.emAndamento)}
          />
          <HeadcountKpiCard
            label="Vagas Fechadas"
            value={String(metricas.fechadas)}
            icon={<CheckCircle2 size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            anteriorLabel={String(anterior.fechadas)}
          />
        </div>
      </div>

      <div className="app-grid-2" style={{ gap: 14 }}>
        <div style={pageBox}>
          <SectionTitle sub="Como chegou até nós?">Origem das Candidaturas</SectionTitle>
          {pieOrigem.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div style={{ minHeight: 260 }} role="img" aria-label="Origem das candidaturas">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieOrigem}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieOrigem.map((_, i) => (
                      <Cell key={pieOrigem[i]?.name ?? i} fill={PIE_CORES[i % PIE_CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: t.cardBg,
                      border: `1px solid ${t.cardBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: FONT.body,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT.body }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={pageBox}>
          <SectionTitle sub="etapas das candidaturas">Pipeline</SectionTitle>
          <OverviewGenericFunnel
            levels={metricas.pipeline}
            taxas={[]}
            showTaxas={false}
            ariaLabel="Funil de candidaturas do Headcount"
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="vagas em andamento">Vagas</SectionTitle>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 960 })}>
              <caption style={{ display: "none" }}>Vagas em andamento</caption>
              <thead>
                <tr>
                  <SortTableTh label="Título da Vaga" col="titulo" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeaderSticky} align="center" />
                  <SortTableTh label="Tipo da Vaga" col="tipo" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Organograma" col="org" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Data de Abertura" col="abertura" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Data de Encerramento" col="encerramento" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Repasse Inicial" col="repasse" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Candidatos" col="candidatos" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                  <SortTableTh label="Status" col="status" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky()}>{row.titulo}</td>
                    <td style={dataTable.tdCenter}>{row.tipoLabel}</td>
                    <td style={dataTable.tdCenter}>{row.organograma}</td>
                    <td style={dataTable.tdCenter}>{fmtData(row.dataAbertura)}</td>
                    <td style={dataTable.tdCenter}>{fmtData(row.dataEncerramento)}</td>
                    <td style={dataTable.tdCenter}>
                      {row.repasseCentavos != null ? fmtBRL(row.repasseCentavos / 100) : "—"}
                    </td>
                    <td style={dataTable.tdCenter}>{row.candidatos}</td>
                    <td style={dataTable.tdCenter}>{row.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
