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
import { ArrowDownUp, CalendarPlus, UserCheck, UserMinus, Users } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { SectionTitle, SkeletonKpiCard } from "../../../components/dashboard";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import type { HeadcountOverviewMetricas } from "../../../lib/headcountMetrics";
import { HeadcountKpiCard } from "./HeadcountKpiCard";

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b", "#a78bfa", "#14b8a6", "#e84025", "#6b7280"] as const;

type Props = {
  metricas: HeadcountOverviewMetricas;
  anterior: HeadcountOverviewMetricas;
  loading: boolean;
};

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

export function HeadcountAbaOverview({ metricas, anterior, loading }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const pageBox = getPageContentBoxStyle(brand, t);

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
            atual={metricas.hcAtivo}
            anterior={anterior.hcAtivo}
            anteriorLabel={String(anterior.hcAtivo)}
          />
          <HeadcountKpiCard
            label="Contratação"
            value={String(metricas.contratacao)}
            icon={<CalendarPlus size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.contratacao}
            anterior={anterior.contratacao}
            anteriorLabel={String(anterior.contratacao)}
          />
          <HeadcountKpiCard
            label="Distrato"
            value={String(metricas.distrato)}
            icon={<UserMinus size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.distrato}
            anterior={anterior.distrato}
            anteriorLabel={String(anterior.distrato)}
            isInverso
          />
        </div>
        <div className="app-grid-kpi-3" style={{ gap: 12, marginTop: 12 }}>
          <HeadcountKpiCard
            label="Variação Líquida"
            value={fmtVar(metricas.variacaoLiquida)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.variacaoLiquida}
            anterior={anterior.variacaoLiquida}
            anteriorLabel={fmtVar(anterior.variacaoLiquida)}
          />
          <HeadcountKpiCard
            label="Turnover"
            value={fmtPct(metricas.turnoverPct)}
            icon={<ArrowDownUp size={16} aria-hidden />}
            accentVar="--brand-action"
            accentColor={brand.primary}
            atual={metricas.turnoverPct ?? 0}
            anterior={anterior.turnoverPct ?? 0}
            anteriorLabel={fmtPct(anterior.turnoverPct)}
            isInverso
          />
          <HeadcountKpiCard
            label="Tenure Médio"
            value={fmtTenure(metricas.tenureMedioMeses)}
            icon={<UserCheck size={16} aria-hidden />}
            accentVar="--brand-contrast"
            accentColor={brand.accent}
            atual={metricas.tenureMedioMeses ?? 0}
            anterior={anterior.tenureMedioMeses ?? 0}
            anteriorLabel={fmtTenure(anterior.tenureMedioMeses)}
          />
        </div>
      </div>

      <div className="app-grid-2" style={{ gap: 14 }}>
        <div style={pageBox}>
          <SectionTitle sub="HC ativo por gerência">Gerências</SectionTitle>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", minHeight: 220 }} role="img" aria-label="HC por gerência">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
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
            </div>
            <div style={{ flex: "1 1 160px", fontFamily: FONT.body, fontSize: 13 }}>
              {metricas.hcPorGerencia.map((g, i) => (
                <div
                  key={g.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "6px 0",
                    borderBottom: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: t.text }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: PIE_CORES[i % PIE_CORES.length],
                        flexShrink: 0,
                      }}
                    />
                    {g.label}
                  </span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{g.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={pageBox}>
          <SectionTitle sub="HC ativo por regime">Tipo de Contrato</SectionTitle>
          <div style={{ minHeight: 240 }} role="img" aria-label="Distribuição por tipo de contrato">
            <ResponsiveContainer width="100%" height={240}>
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
