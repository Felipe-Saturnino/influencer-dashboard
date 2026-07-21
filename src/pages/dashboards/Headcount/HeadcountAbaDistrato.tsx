import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Clock, UserMinus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import type { HeadcountDistratoMetricas } from "../../../lib/headcountMetrics";
import { HeadcountKpiCard } from "./HeadcountKpiCard";

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b", "#a78bfa", "#14b8a6", "#e84025", "#6b7280"] as const;

type Props = {
  metricas: HeadcountDistratoMetricas;
  anterior: HeadcountDistratoMetricas;
  loading: boolean;
};

type SortCol = "nome" | "time" | "admissao" | "termino" | "tipo" | "tempo";

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtDias(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("pt-BR")} dias`;
}

export function HeadcountAbaDistrato({ metricas, anterior, loading }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "termino", dir: "desc" });

  const rows = useMemo(() => {
    const list = [...metricas.tabela];
    list.sort((a, b) => {
      switch (sort.col) {
        case "nome":
          return compareLocaleTexto(a.nome, b.nome, sort.dir);
        case "time":
          return compareLocaleTexto(a.timeLabel, b.timeLabel, sort.dir);
        case "admissao":
          return compareLocaleTexto(a.dataAdmissao ?? "", b.dataAdmissao ?? "", sort.dir);
        case "termino":
          return compareLocaleTexto(a.dataTermino ?? "", b.dataTermino ?? "", sort.dir);
        case "tipo":
          return compareLocaleTexto(a.tipoTerminoLabel, b.tipoTerminoLabel, sort.dir);
        case "tempo":
          return compareNumber(a.tempoDias ?? -1, b.tempoDias ?? -1, sort.dir);
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
        <div className="app-grid-kpi-4" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (metricas.distratos === 0) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      </div>
    );
  }

  const pieTime = metricas.porTime.map((x) => ({ name: x.label, value: x.valor }));
  const pieContrato = metricas.porContrato.map((x) => ({ name: x.label, value: x.valor }));

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="desligamentos no mês selecionado">KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-4" style={{ gap: 12 }}>
          <HeadcountKpiCard
            label="Distratos"
            value={String(metricas.distratos)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.distratos}
            anterior={anterior.distratos}
            anteriorLabel={String(anterior.distratos)}
            isInverso
          />
          <HeadcountKpiCard
            label="Voluntários"
            value={String(metricas.voluntarios)}
            icon={<Users size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.voluntarios}
            anterior={anterior.voluntarios}
            anteriorLabel={String(anterior.voluntarios)}
          />
          <HeadcountKpiCard
            label="Não Voluntário"
            value={String(metricas.naoVoluntarios)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.naoVoluntarios}
            anterior={anterior.naoVoluntarios}
            anteriorLabel={String(anterior.naoVoluntarios)}
            isInverso
          />
          <HeadcountKpiCard
            label="Tempo Médio"
            value={fmtDias(metricas.tempoMedioDias)}
            icon={<Clock size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.tempoMedioDias ?? 0}
            anterior={anterior.tempoMedioDias ?? 0}
            anteriorLabel={fmtDias(anterior.tempoMedioDias)}
          />
        </div>
      </div>

      <div className="app-grid-2" style={{ gap: 14 }}>
        <div style={pageBox}>
          <SectionTitle sub="menor nível orgânico do prestador">Áreas</SectionTitle>
          <div style={{ minHeight: 240 }} role="img" aria-label="Distratos por time">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieTime}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieTime.map((_, i) => (
                    <Cell key={pieTime[i]?.name ?? i} fill={PIE_CORES[i % PIE_CORES.length]} />
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
        </div>

        <div style={pageBox}>
          <SectionTitle sub="regime contratual no distrato">Tipo de Contrato</SectionTitle>
          <div style={{ minHeight: 240 }} role="img" aria-label="Distratos por tipo de contrato">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieContrato}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieContrato.map((_, i) => (
                    <Cell key={pieContrato[i]?.name ?? i} fill={PIE_CORES[i % PIE_CORES.length]} />
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
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="desligamentos do mês">Distratos</SectionTitle>
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 840 })}>
            <caption style={{ display: "none" }}>Distratos do período</caption>
            <thead>
              <tr>
                <SortTableTh label="Nome" col="nome" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeaderSticky} align="center" />
                <SortTableTh label="Time" col="time" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                <SortTableTh label="Data de Admissão" col="admissao" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                <SortTableTh label="Data de Término" col="termino" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                <SortTableTh label="Tipo de Término" col="tipo" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
                <SortTableTh label="Tempo" col="tempo" sortCol={sort.col} sortDir={sort.dir} onSort={toggleSort} thStyle={dataTable.thHeader} align="center" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdSticky()}>{row.nome}</td>
                  <td style={dataTable.tdCenter}>{row.timeLabel}</td>
                  <td style={dataTable.tdCenter}>{fmtData(row.dataAdmissao)}</td>
                  <td style={dataTable.tdCenter}>{fmtData(row.dataTermino)}</td>
                  <td style={dataTable.tdCenter}>{row.tipoTerminoLabel}</td>
                  <td style={dataTable.tdCenter}>{fmtDias(row.tempoDias)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
