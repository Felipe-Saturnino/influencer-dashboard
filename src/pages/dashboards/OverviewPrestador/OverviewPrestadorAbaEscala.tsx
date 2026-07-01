import type { CSSProperties } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardX,
  Clock,
  FileHeart,
  Loader2,
  Timer,
} from "lucide-react";
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
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { FONT } from "../../../constants/theme";
import { BRAND } from "../../../lib/dashboardConstants";
import { horasLabelFromMinutos } from "../../../lib/overviewPrestadorCalendarioHelpers";
import type { OverviewPrestadorMetricas } from "../../../lib/overviewPrestadorMetrics";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { KpiCard, SectionTitle, SkeletonKpiCard } from "../../../components/dashboard";

type Props = {
  metricas: OverviewPrestadorMetricas;
  metricasAnterior: OverviewPrestadorMetricas;
  historico: boolean;
  loading: boolean;
  staffSelecionado: boolean;
};

const PIE_CORES = ["#1e36f8", "#22c55e", "#f59e0b"] as const;

function fmtDataPt(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function subCardAbsenteismo(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    padding: "16px 18px",
    flex: "1 1 220px",
    minWidth: 200,
  };
}

export function OverviewPrestadorAbaEscala({
  metricas,
  metricasAnterior,
  historico,
  loading,
  staffSelecionado,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const semStaff = !staffSelecionado;
  const vazio = semStaff
    ? "Selecione um prestador para visualizar os resultados."
    : "Sem dados para o período selecionado.";

  const dadosAproveitamentoDias = [
    { nome: "Escalados", valor: metricas.diasEscalado, fill: "var(--brand-action, #7c3aed)" },
    { nome: "Realizados", valor: metricas.diasRealizado, fill: "var(--brand-contrast, #1e36f8)" },
  ];

  const dadosAproveitamentoHoras = [
    {
      nome: "Escaladas",
      valor: Math.round(metricas.horasEscaladasMin / 60),
      fill: "var(--brand-action, #7c3aed)",
    },
    {
      nome: "Realizadas",
      valor: Math.round(metricas.horasRealizadasMin / 60),
      fill: "var(--brand-contrast, #1e36f8)",
    },
  ];

  const dadosPizzaTurnos = [
    { name: "Trocas Realizadas", value: metricas.trocas },
    { name: "Turnos Vendidos", value: metricas.vendas },
    { name: "Turnos Comprados", value: metricas.compras },
  ].filter((x) => x.value > 0);

  const totalMovimentacoes = metricas.trocas + metricas.vendas + metricas.compras;

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub="comparativo MTD vs mês anterior">KPIs Consolidados</SectionTitle>
        {loading ? (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : semStaff ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {vazio}
          </div>
        ) : (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <KpiCard
              label="Dias Escalado"
              value={String(metricas.diasEscalado)}
              icon={<CalendarDays size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={brand.primary}
              atual={metricas.diasEscalado}
              anterior={metricasAnterior.diasEscalado}
              isHistorico={historico}
            />
            <KpiCard
              label="Dias Realizado"
              value={String(metricas.diasRealizado)}
              icon={<CalendarCheck size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={brand.accent}
              atual={metricas.diasRealizado}
              anterior={metricasAnterior.diasRealizado}
              isHistorico={historico}
            />
            <KpiCard
              label="Horas Escaladas"
              value={horasLabelFromMinutos(metricas.horasEscaladasMin)}
              icon={<Clock size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={brand.primary}
              atual={metricas.horasEscaladasMin}
              anterior={metricasAnterior.horasEscaladasMin}
              isHistorico={historico}
            />
            <KpiCard
              label="Horas Realizadas"
              value={horasLabelFromMinutos(metricas.horasRealizadasMin)}
              icon={<Timer size={16} aria-hidden />}
              accentVar="--brand-contrast"
              accentColor={brand.accent}
              atual={metricas.horasRealizadasMin}
              anterior={metricasAnterior.horasRealizadasMin}
              isHistorico={historico}
            />
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="pontualidade, registro de ponto e atestados">Absenteísmo</SectionTitle>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, color: t.textMuted }}>
            <Loader2 size={20} className="app-lucide-spin" aria-hidden />
            <span style={{ fontSize: 13, fontFamily: FONT.body }}>Carregando…</span>
          </div>
        ) : semStaff ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {vazio}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Pontualidade
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {metricas.entradasAtrasadas + metricas.saidasAntecipadas}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                {metricas.entradasAtrasadas} entradas atrasadas · {metricas.saidasAntecipadas} saídas antecipadas
              </div>
            </div>

            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <ClipboardX size={14} aria-hidden style={{ color: BRAND.amarelo }} />
                Ponto não Registrado
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {metricas.checkInNaoRegistrado + metricas.checkOutNaoRegistrado}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                {metricas.checkInNaoRegistrado} Check-in · {metricas.checkOutNaoRegistrado} Check-out
              </div>
            </div>

            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <FileHeart size={14} aria-hidden style={{ color: BRAND.vermelho }} />
                Atestados
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {metricas.diasAtestado}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                dias de atestado médico no período
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="escalado vs realizado">Aproveitamento</SectionTitle>
        {loading || semStaff ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {loading ? "Carregando…" : vazio}
          </div>
        ) : (
          <div className="app-grid-2">
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                Dias
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosAproveitamentoDias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                  <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {dadosAproveitamentoDias.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                Horas
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosAproveitamentoHoras} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                  <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }}
                    formatter={(v: number) => [`${v} h`, "Horas"]}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {dadosAproveitamentoHoras.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="trocas, vendas e compras de turno">Movimentações de turno</SectionTitle>
        {loading || semStaff ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {loading ? "Carregando…" : vazio}
          </div>
        ) : totalMovimentacoes === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dadosPizzaTurnos.length > 0 ? dadosPizzaTurnos : [{ name: "Sem movimentações", value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {(dadosPizzaTurnos.length > 0 ? dadosPizzaTurnos : [{ name: "—", value: 1 }]).map((_, i) => (
                  <Cell key={i} fill={PIE_CORES[i % PIE_CORES.length] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={pageBox}>
        <SectionTitle sub="ocorrências por dia">Detalhamento Diário</SectionTitle>
        {loading || semStaff ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            {loading ? "Carregando…" : vazio}
          </div>
        ) : metricas.detalhamento.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 520 })}>
              <caption style={{ display: "none" }}>Detalhamento diário de ocorrências do prestador</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>
                    Data
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Ocorrência
                  </th>
                  <th scope="col" style={dataTable.thHeader}>
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody>
                {metricas.detalhamento.map((row, i) => (
                  <tr key={`${row.dataIso}-${row.ocorrencia}-${i}`} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{fmtDataPt(row.dataIso)}</td>
                    <td style={dataTable.tdCenter}>{row.ocorrencia}</td>
                    <td style={dataTable.tdCenter}>{row.detalhe}</td>
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
