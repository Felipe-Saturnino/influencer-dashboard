import type { CSSProperties } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
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
import type {
  OverviewPrestadorAtencaoLinha,
  OverviewPrestadorCoberturaLinha,
  OverviewPrestadorEstudioFatia,
  OverviewPrestadorMetricas,
} from "../../../lib/overviewPrestadorMetrics";
import type { OverviewPrestadorTimeCaps } from "../../../lib/overviewPrestadorTeamConfig";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { KpiCard, SectionTitle, SkeletonKpiCard } from "../../../components/dashboard";

type Props = {
  metricas: OverviewPrestadorMetricas;
  metricasAnterior: OverviewPrestadorMetricas;
  historico: boolean;
  loading: boolean;
  prontoParaExibir: boolean;
  visaoTime: boolean;
  caps: OverviewPrestadorTimeCaps;
  pontosAtencao: OverviewPrestadorAtencaoLinha[];
  coberturaPorTurno: OverviewPrestadorCoberturaLinha[];
  coberturaPorEstudio: OverviewPrestadorCoberturaLinha[];
  distribuicaoEstudio: OverviewPrestadorEstudioFatia[];
};

const PIE_MOV_CORES = ["#1e36f8", "#f59e0b", "#22c55e"] as const;
const PIE_ESTUDIO_CORES = ["#7c3aed", "#1e36f8", "#a78bfa", "#22c55e", "#f59e0b"] as const;

function fmtDataPt(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1).replace(".", ",")}%`;
}

function subCardAbsenteismo(t: ReturnType<typeof useApp>["theme"]): CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg,
    padding: "16px 18px",
    flex: "1 1 200px",
    minWidth: 180,
  };
}

function tabelaCobertura(
  rows: OverviewPrestadorCoberturaLinha[],
  dataTable: ReturnType<typeof useDataTableBlock>,
  mostrarMov: boolean,
  colLabel: string,
) {
  return (
    <div className="app-table-wrap" style={getDataTableWrapStyle()}>
      <table style={getDataTableStyle({ minWidth: mostrarMov ? 640 : 520 })}>
        <caption style={{ display: "none" }}>Cobertura por {colLabel.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col" style={dataTable.thHeader}>{colLabel}</th>
            <th scope="col" style={dataTable.thHeader}>Prestadores</th>
            <th scope="col" style={dataTable.thHeader}>Jornadas escaladas</th>
            <th scope="col" style={dataTable.thHeader}>Realizadas</th>
            <th scope="col" style={dataTable.thHeader}>Presença</th>
            {mostrarMov ? <th scope="col" style={dataTable.thHeader}>Movimentações</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isTotal = r.chave === "__total__";
            const pct = r.jornadasEscaladas > 0
              ? (r.jornadasRealizadas / r.jornadasEscaladas) * 100
              : null;
            return (
              <tr
                key={r.chave}
                style={{
                  background: isTotal ? dataTable.totalRowBgStrong : dataTable.zebraRow(i),
                }}
              >
                <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{r.label}</td>
                <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{r.prestadores}</td>
                <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{r.jornadasEscaladas}</td>
                <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{r.jornadasRealizadas}</td>
                <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{fmtPct(pct)}</td>
                {mostrarMov ? (
                  <td style={isTotal ? dataTable.tdTotal : dataTable.tdCenter}>{r.movimentacoes}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OverviewPrestadorAbaEscala({
  metricas,
  metricasAnterior,
  historico,
  loading,
  prontoParaExibir,
  visaoTime,
  caps,
  pontosAtencao,
  coberturaPorTurno,
  coberturaPorEstudio,
  distribuicaoEstudio,
}: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageBox = getPageContentBoxStyle(brand, t);

  const vazio = !prontoParaExibir
    ? "Selecione um time para visualizar os resultados."
    : "Sem dados para o período selecionado.";

  const labelDiasEsc = visaoTime ? "Jornadas escaladas" : "Dias Escalados";
  const labelDiasReal = visaoTime ? "Jornadas realizadas" : "Dias Realizados";

  const dadosAproveitamentoDias = [
    { nome: "Escalados", valor: metricas.diasEscalado, fill: "var(--brand-action, #7c3aed)" },
    { nome: "Realizados", valor: metricas.diasRealizado, fill: "#22c55e" },
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
      fill: "#22c55e",
    },
  ];

  const dadosPizzaTurnos = [
    { name: "Trocas Realizadas", value: metricas.trocas },
    { name: "Turnos Vendidos", value: metricas.vendas },
    { name: "Turnos Comprados", value: metricas.compras },
  ].filter((x) => x.value > 0);

  const totalMovimentacoes = metricas.trocas + metricas.vendas + metricas.compras;

  const dadosPizzaEstudio = distribuicaoEstudio.map((e) => ({
    name: e.label,
    value: e.dias,
  }));
  const totalDiasEstudio = distribuicaoEstudio.reduce((s, e) => s + e.dias, 0);

  const presencaPct =
    metricas.diasEscalado > 0
      ? Math.round((metricas.diasRealizado / metricas.diasEscalado) * 1000) / 10
      : null;
  const pontualidadeOcorr = metricas.entradasAtrasadas + metricas.saidasAntecipadas;
  const controlePresencaOcorr = metricas.checkInNaoRegistrado + metricas.checkOutNaoRegistrado;

  const mostrarMov = caps.negocia;
  const mostrarEstudioPizza = !visaoTime && caps.distribuicaoEstudioIndividual;
  const layoutGpIndividual = mostrarMov && mostrarEstudioPizza;

  const blocoVazioOuLoading = (altura = 32) => (
    <div style={{ padding: `${altura}px 0`, textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Loader2 size={16} className="app-lucide-spin" aria-hidden />
          Carregando…
        </span>
      ) : (
        vazio
      )}
    </div>
  );

  return (
    <>
      <div style={pageBox}>
        <SectionTitle sub={visaoTime ? "consolidado do time · comparativo MTD" : "comparativo MTD vs mês anterior"}>
          {visaoTime ? "Resumo operacional" : "KPIs Consolidados"}
        </SectionTitle>
        {loading ? (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonKpiCard key={i} />
            ))}
          </div>
        ) : !prontoParaExibir ? (
          blocoVazioOuLoading()
        ) : (
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <KpiCard
              label={labelDiasEsc}
              value={String(metricas.diasEscalado)}
              icon={<CalendarDays size={16} aria-hidden />}
              accentVar="--brand-action"
              accentColor={brand.primary}
              atual={metricas.diasEscalado}
              anterior={metricasAnterior.diasEscalado}
              isHistorico={historico}
            />
            <KpiCard
              label={labelDiasReal}
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
        <SectionTitle
          sub={
            visaoTime
              ? "taxas de presença, pontualidade e controle de presença"
              : "pontualidade, controle de presença e atestados"
          }
        >
          {visaoTime ? "Aderência à escala" : "Absenteísmo"}
        </SectionTitle>
        {!prontoParaExibir || loading ? (
          blocoVazioOuLoading()
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {visaoTime ? (
              <div style={subCardAbsenteismo(t)}>
                <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Presença
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                  {fmtPct(presencaPct)}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  {metricas.diasRealizado} de {metricas.diasEscalado} jornadas
                </div>
              </div>
            ) : null}

            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Pontualidade
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {visaoTime && metricas.diasEscalado > 0
                  ? fmtPct(
                      Math.round((1 - pontualidadeOcorr / Math.max(metricas.diasEscalado, 1)) * 1000) / 10,
                    )
                  : pontualidadeOcorr}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                {metricas.entradasAtrasadas} entradas atrasadas · {metricas.saidasAntecipadas} saídas antecipadas
              </div>
            </div>

            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <ClipboardCheck size={14} aria-hidden style={{ color: BRAND.amarelo }} />
                Controle de Presença
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {visaoTime && metricas.diasEscalado > 0
                  ? fmtPct(
                      Math.round((1 - controlePresencaOcorr / Math.max(metricas.diasEscalado * 2, 1)) * 1000) / 10,
                    )
                  : controlePresencaOcorr}
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

      {/* Aproveitamento — linha cheia no GP individual */}
      <div style={pageBox}>
        <SectionTitle sub={visaoTime ? "jornadas e horas do time" : "dias e horas do prestador"}>
          Aproveitamento
        </SectionTitle>
        {!prontoParaExibir || loading ? (
          blocoVazioOuLoading()
        ) : (
          <div className="app-grid-2">
            <div>
              <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, marginBottom: 10, textAlign: "center" }}>
                {visaoTime ? "Jornadas" : "Dias"}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosAproveitamentoDias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} />
                  <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }} />
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

      {/* Movimentações (+ Distribuição por estúdio no GP individual) */}
      {mostrarMov || mostrarEstudioPizza ? (
        <div className={layoutGpIndividual ? "app-grid-2" : undefined} style={layoutGpIndividual ? { gap: 14 } : undefined}>
          {mostrarMov ? (
            <div style={{ ...pageBox, marginBottom: layoutGpIndividual ? 0 : pageBox.marginBottom }}>
              <SectionTitle sub="trocas, vendas e compras de turno">Movimentações de turno</SectionTitle>
              {!prontoParaExibir || loading ? (
                blocoVazioOuLoading()
              ) : totalMovimentacoes === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                  Sem dados para o período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dadosPizzaTurnos}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {dadosPizzaTurnos.map((_, i) => (
                        <Cell key={i} fill={PIE_MOV_CORES[i % PIE_MOV_CORES.length] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : null}

          {mostrarEstudioPizza ? (
            <div style={{ ...pageBox, marginBottom: layoutGpIndividual ? 0 : pageBox.marginBottom }}>
              <SectionTitle sub="dias realizados em cada estúdio">Distribuição por estúdio</SectionTitle>
              {!prontoParaExibir || loading ? (
                blocoVazioOuLoading()
              ) : totalDiasEstudio === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                  Sem dados para o período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dadosPizzaEstudio}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {dadosPizzaEstudio.map((_, i) => (
                        <Cell key={i} fill={PIE_ESTUDIO_CORES[i % PIE_ESTUDIO_CORES.length] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {layoutGpIndividual ? <div style={{ height: 14 }} /> : null}

      {/* Pontos de atenção — só time */}
      {visaoTime ? (
        <div style={pageBox}>
          <SectionTitle sub="prestadores com maior desvio no período">Pontos de atenção</SectionTitle>
          {!prontoParaExibir || loading ? (
            blocoVazioOuLoading()
          ) : pontosAtencao.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: 720 })}>
                <caption style={{ display: "none" }}>Prestadores com desvios de escala</caption>
                <thead>
                  <tr>
                    <th scope="col" style={dataTable.thHeader}>Prestador</th>
                    <th scope="col" style={dataTable.thHeader}>Time</th>
                    <th scope="col" style={dataTable.thHeader}>Presença</th>
                    <th scope="col" style={dataTable.thHeader}>Atrasos</th>
                    <th scope="col" style={dataTable.thHeader}>Ponto incompleto</th>
                    <th scope="col" style={dataTable.thHeader}>Atestado</th>
                    <th scope="col" style={dataTable.thHeader}>Severidade</th>
                  </tr>
                </thead>
                <tbody>
                  {pontosAtencao.map((r, i) => (
                    <tr key={r.prestadorId} style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdCenter}>{r.nome}</td>
                      <td style={dataTable.tdCenter}>{r.timeRotulo}</td>
                      <td style={dataTable.tdCenter}>{fmtPct(r.presencaPct)}</td>
                      <td style={dataTable.tdCenter}>{r.atrasos}</td>
                      <td style={dataTable.tdCenter}>{r.pontoIncompleto}</td>
                      <td style={dataTable.tdCenter}>{r.atestadoDias > 0 ? `${r.atestadoDias} dias` : "—"}</td>
                      <td style={dataTable.tdCenter}>
                        {r.severidade === "alta" ? "Alta" : r.severidade === "media" ? "Média" : "Sob controle"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Cobertura por turno — só time */}
      {visaoTime ? (
        <div style={pageBox}>
          <SectionTitle sub="escala planejada vs realizada por turno">Cobertura por turno</SectionTitle>
          {!prontoParaExibir || loading ? (
            blocoVazioOuLoading()
          ) : coberturaPorTurno.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            tabelaCobertura(coberturaPorTurno, dataTable, mostrarMov, "Turno")
          )}
        </div>
      ) : null}

      {/* Cobertura por estúdio — só GP time */}
      {visaoTime && caps.porEstudio ? (
        <div style={pageBox}>
          <SectionTitle sub="escala planejada vs realizada por estúdio">Cobertura por estúdio</SectionTitle>
          {!prontoParaExibir || loading ? (
            blocoVazioOuLoading()
          ) : coberturaPorEstudio.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Sem dados para o período selecionado.
            </div>
          ) : (
            tabelaCobertura(coberturaPorEstudio, dataTable, mostrarMov, "Estúdio")
          )}
        </div>
      ) : null}

      <div style={pageBox}>
        <SectionTitle sub={visaoTime ? "ocorrências do time no período" : "ocorrências por dia"}>
          Detalhamento Diário
        </SectionTitle>
        {!prontoParaExibir || loading ? (
          blocoVazioOuLoading()
        ) : metricas.detalhamento.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: visaoTime ? 640 : 520 })}>
              <caption style={{ display: "none" }}>Detalhamento diário de ocorrências</caption>
              <thead>
                <tr>
                  <th scope="col" style={dataTable.thHeader}>Data</th>
                  {visaoTime ? <th scope="col" style={dataTable.thHeader}>Prestador</th> : null}
                  <th scope="col" style={dataTable.thHeader}>Ocorrência</th>
                  <th scope="col" style={dataTable.thHeader}>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {metricas.detalhamento.map((row, i) => (
                  <tr key={`${row.dataIso}-${row.ocorrencia}-${row.prestadorId ?? ""}-${i}`} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdCenter}>{fmtDataPt(row.dataIso)}</td>
                    {visaoTime ? <td style={dataTable.tdCenter}>{row.prestadorNome ?? "—"}</td> : null}
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
