import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { ArrowDownUp, CalendarPlus, UserCheck, UserMinus, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { compareLocaleTexto, compareNumber } from "../../../lib/classificacaoSort";
import { SectionTitle, SkeletonKpiCard, SortTableTh } from "../../../components/dashboard";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import type {
  HeadcountGerenciaMix,
  HeadcountOverviewHistoricoMetricas,
  HeadcountOverviewMetricas,
} from "../../../lib/headcountMetrics";
import { HeadcountKpiCard } from "./HeadcountKpiCard";

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b", "#a78bfa", "#14b8a6", "#e84025", "#6b7280"] as const;

type Props = {
  historico: boolean;
  metricas: HeadcountOverviewMetricas;
  anterior: HeadcountOverviewMetricas;
  historicoMetricas: HeadcountOverviewHistoricoMetricas;
  loading: boolean;
};

type SortMesCol = "data" | "headcount" | "contratacao" | "distrato" | "turnover";

function fmtPct(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtTenure(meses: number | null): string {
  if (meses == null || Number.isNaN(meses)) return "—";
  return `${meses.toFixed(1)} meses`;
}

function fmtVar(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}

function GerenciaListaItem({
  g,
  cor,
  textColor,
  mutedColor,
  borderColor,
  cardBg,
}: {
  g: HeadcountGerenciaMix;
  cor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cardBg: string;
}) {
  const [hover, setHover] = useState(false);
  const temTimes = g.times.length > 0;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "6px 0",
        borderBottom: `1px solid ${borderColor}`,
      }}
      onMouseEnter={() => {
        if (temTimes) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: textColor }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: cor,
            flexShrink: 0,
          }}
        />
        {g.label}
      </span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{g.valor}</span>
      {hover && temTimes ? (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            zIndex: 5,
            marginTop: 4,
            minWidth: 180,
            maxWidth: 260,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${borderColor}`,
            background: cardBg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            fontFamily: FONT.body,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: textColor }}>Times</div>
          {g.times.map((tm) => (
            <div
              key={tm.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "3px 0",
                color: mutedColor,
              }}
            >
              <span style={{ color: textColor }}>{tm.label}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: textColor }}>
                {tm.valor}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OverviewHistorico({
  metricas,
  loading,
}: {
  metricas: HeadcountOverviewHistoricoMetricas;
  loading: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);
  const [sort, setSort] = useState<{ col: SortMesCol; dir: "asc" | "desc" }>({ col: "data", dir: "desc" });

  const rows = useMemo(() => {
    const list = [...metricas.mesAMes];
    list.sort((a, b) => {
      switch (sort.col) {
        case "data":
          return compareLocaleTexto(a.competencia, b.competencia, sort.dir);
        case "headcount":
          return compareNumber(a.headcount, b.headcount, sort.dir);
        case "contratacao":
          return compareNumber(a.contratacao, b.contratacao, sort.dir);
        case "distrato":
          return compareNumber(a.distrato, b.distrato, sort.dir);
        case "turnover":
          return compareNumber(a.turnoverPct ?? -1, b.turnoverPct ?? -1, sort.dir);
        default:
          return 0;
      }
    });
    return list;
  }, [metricas.mesAMes, sort]);

  const toggleSort = (col: SortMesCol) => {
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

  const vazio =
    metricas.hcAtivo === 0 &&
    metricas.distrato === 0 &&
    metricas.mesAMes.every((m) => m.headcount === 0 && m.contratacao === 0 && m.distrato === 0);
  if (vazio) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="snapshot histórico">KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-4" style={{ gap: 12 }}>
          <HeadcountKpiCard
            label="HC Ativo"
            value={String(metricas.hcAtivo)}
            icon={<Users size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
          />
          <HeadcountKpiCard
            label="Distrato"
            value={String(metricas.distrato)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
          />
          <HeadcountKpiCard
            label="Turnover"
            value={fmtPct(metricas.turnoverPct)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
          />
          <HeadcountKpiCard
            label="Permanência Média"
            value={fmtTenure(metricas.permanenciaMediaMeses)}
            icon={<UserCheck size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
          />
        </div>
      </div>

      <div style={pageBox}>
        <SectionTitle sub="comparativo dos últimos 13 meses">Mês a Mês</SectionTitle>
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 720 })}>
            <caption style={{ display: "none" }}>Comparativo mês a mês do Headcount</caption>
            <thead>
              <tr>
                <SortTableTh
                  label="Data"
                  col="data"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeaderSticky}
                  align="center"
                />
                <SortTableTh
                  label="Headcount"
                  col="headcount"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Contratação"
                  col="contratacao"
                  sortCol={sort.col}
                  sortDir={sort.dir}
                  onSort={toggleSort}
                  thStyle={dataTable.thHeader}
                  align="center"
                />
                <SortTableTh
                  label="Distrato"
                  col="distrato"
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.competencia} style={{ background: dataTable.zebraRow(i) }}>
                  <td style={dataTable.tdSticky()}>{row.label}</td>
                  <td style={dataTable.tdCenter}>{row.headcount}</td>
                  <td style={dataTable.tdCenter}>{row.contratacao}</td>
                  <td style={dataTable.tdCenter}>{row.distrato}</td>
                  <td style={dataTable.tdCenter}>{fmtPct(row.turnoverPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function HeadcountAbaOverview({ historico, metricas, anterior, historicoMetricas, loading }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);

  if (historico) {
    return <OverviewHistorico metricas={historicoMetricas} loading={loading} />;
  }

  if (loading) {
    return (
      <div style={pageBox}>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const vazio = metricas.hcAtivo === 0 && metricas.contratacao === 0 && metricas.distrato === 0;
  if (vazio) {
    return (
      <div style={pageBox}>
        <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
          Sem dados para o período selecionado.
        </div>
      </div>
    );
  }

  const pieData = metricas.hcPorGerencia.map((x) => ({ name: x.label, value: x.valor }));
  const barData = metricas.mixContrato.map((x) => ({ nome: x.label, valor: x.valor }));

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="snapshot do mês selecionado">KPIs Consolidados</SectionTitle>
        <div className="app-grid-kpi-3" style={{ gap: 12 }}>
          <HeadcountKpiCard
            label="HC Ativo"
            value={String(metricas.hcAtivo)}
            icon={<Users size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            anteriorLabel={String(anterior.hcAtivo)}
          />
          <HeadcountKpiCard
            label="Contratação"
            value={String(metricas.contratacao)}
            icon={<CalendarPlus size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            anteriorLabel={String(anterior.contratacao)}
          />
          <HeadcountKpiCard
            label="Distrato"
            value={String(metricas.distrato)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            anteriorLabel={String(anterior.distrato)}
          />
        </div>
        <div className="app-grid-kpi-3" style={{ gap: 12, marginTop: 12 }}>
          <HeadcountKpiCard
            label="Variação"
            value={fmtVar(metricas.variacaoLiquida)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            anteriorLabel={fmtVar(anterior.variacaoLiquida)}
          />
          <HeadcountKpiCard
            label="Turnover"
            value={fmtPct(metricas.turnoverPct)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            anteriorLabel={fmtPct(anterior.turnoverPct)}
          />
          <HeadcountKpiCard
            label="Permanência"
            value={fmtTenure(metricas.tenureMedioMeses)}
            icon={<UserCheck size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            anteriorLabel={fmtTenure(anterior.tenureMedioMeses)}
          />
        </div>
      </div>

      <div className="app-grid-2" style={{ gap: 14 }}>
        <div style={pageBox}>
          <SectionTitle sub="HC ativo por gerência">Gerências</SectionTitle>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{ flex: "1.2 1 240px", minHeight: 280, position: "relative" }}
              role="img"
              aria-label={`HC por gerência — total ${metricas.hcAtivo}`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={112}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={pieData[i]?.name ?? i} fill={PIE_CORES[i % PIE_CORES.length]} />
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
                </PieChart>
              </ResponsiveContainer>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  fontFamily: FONT.body,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: t.text, lineHeight: 1.1 }}>
                  {metricas.hcAtivo}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: t.textMuted,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  HC Total
                </div>
              </div>
            </div>
            <div style={{ flex: "1 1 180px", fontFamily: FONT.body, fontSize: 13 }}>
              {metricas.hcPorGerencia.map((g, i) => (
                <GerenciaListaItem
                  key={g.key}
                  g={g}
                  cor={PIE_CORES[i % PIE_CORES.length]}
                  textColor={t.text}
                  mutedColor={t.textMuted}
                  borderColor={t.cardBorder}
                  cardBg={t.cardBg}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={pageBox}>
          <SectionTitle sub="HC ativo por regime">Tipo de Contrato</SectionTitle>
          <div style={{ minHeight: 280 }} role="img" aria-label="Distribuição por tipo de contrato">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} />
                <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
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
                <Bar dataKey="valor" name="HC ativo" fill="var(--brand-action, #7c3aed)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
