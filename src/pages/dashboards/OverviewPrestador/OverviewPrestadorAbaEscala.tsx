import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import {
  pctPresencaAderencia,
  type OverviewPrestadorAtencaoLinha,
  type OverviewPrestadorCoberturaLinha,
  type OverviewPrestadorEstudioFatia,
  type OverviewPrestadorMetricas,
} from "../../../lib/overviewPrestadorMetrics";
import type { OverviewPrestadorTimeCaps } from "../../../lib/overviewPrestadorTeamConfig";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableStyle, getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { KpiCard, SectionTitle, SkeletonKpiCard, SortTableTh, type SortDir } from "../../../components/dashboard";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import {
  clampPageIndex,
  slicePage,
  TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR,
} from "../../../lib/tablePagination";

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
  erroCarga?: string | null;
  onRecarregar?: () => void;
};

type SortDetalheCol = "data" | "prestador" | "ocorrencia" | "detalhe";

const MOV_CORES = {
  trocas: "#1e36f8",
  turnosVendidos: "#f59e0b",
  folgasVendidas: "#22c55e",
} as const;
const PIE_ESTUDIO_CORES = ["#7c3aed", "#1e36f8", "#a78bfa", "#22c55e", "#f59e0b"] as const;

type FatiaDonut = { key: string; label: string; valor: number; cor: string };

function GraficoDonut({
  fatias,
  totalLabel,
  unidadeLabel,
}: {
  fatias: FatiaDonut[];
  totalLabel: string;
  unidadeLabel: string;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const comValor = fatias.filter((f) => f.valor > 0);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
      <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220, height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={comValor}
              dataKey="valor"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={comValor.length > 1 ? 2 : 0}
              stroke="none"
              labelLine={false}
            >
              {comValor.map((f) => (
                <Cell key={f.key} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, fontSize: 12 }}
              formatter={(v: number, n: string) => [`${v} ${unidadeLabel}`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT.body, color: t.text }}>{total}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: t.textMuted,
              fontFamily: FONT.body,
            }}
          >
            {totalLabel}
          </span>
        </div>
      </div>

      <ul
        style={{
          flex: "1 1 220px",
          minWidth: 200,
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {fatias.map((f) => {
          const pct = total > 0 ? (f.valor / total) * 100 : 0;
          return (
            <li
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                fontFamily: FONT.body,
              }}
            >
              <span
                aria-hidden
                style={{ width: 10, height: 10, borderRadius: 999, background: f.cor, flex: "0 0 auto" }}
              />
              <span style={{ fontSize: 12, color: t.text, flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontVariantNumeric: "tabular-nums" }}>
                {f.valor}
              </span>
              <span style={{ fontSize: 11, color: t.textMuted, minWidth: 44, textAlign: "right" }}>
                {`${pct.toFixed(1).replace(".", ",")}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
            const pct = pctPresencaAderencia(r.jornadasRealizadas, r.jornadasEscaladasAderencia);
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
  erroCarga,
  onRecarregar,
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

  const denomAderencia = metricas.diasEscaladoAderencia;

  const dadosAproveitamentoDias = [
    { nome: "Escalados", valor: denomAderencia, fill: "var(--brand-action, #7c3aed)" },
    { nome: "Realizados", valor: metricas.diasRealizado, fill: "#22c55e" },
  ];

  const dadosAproveitamentoHoras = [
    {
      nome: "Escaladas",
      valor: Math.round(metricas.horasEscaladasAderenciaMin / 60),
      fill: "var(--brand-action, #7c3aed)",
    },
    {
      nome: "Realizadas",
      valor: Math.round(metricas.horasRealizadasMin / 60),
      fill: "#22c55e",
    },
  ];

  const fatiasMovimentacoes: FatiaDonut[] = [
    { key: "trocas", label: "Trocas realizadas", valor: metricas.trocas, cor: MOV_CORES.trocas },
    {
      key: "turnosVendidos",
      label: "Turnos vendidos",
      valor: metricas.turnosVendidos,
      cor: MOV_CORES.turnosVendidos,
    },
    {
      key: "folgasVendidas",
      label: "Folgas vendidas",
      valor: metricas.folgasVendidas,
      cor: MOV_CORES.folgasVendidas,
    },
  ];

  const totalMovimentacoes =
    metricas.trocas + metricas.turnosVendidos + metricas.folgasVendidas;

  const fatiasEstudio: FatiaDonut[] = distribuicaoEstudio.map((e, i) => ({
    key: e.slug,
    label: e.label,
    valor: e.dias,
    cor: PIE_ESTUDIO_CORES[i % PIE_ESTUDIO_CORES.length] ?? "#94a3b8",
  }));
  const totalDiasEstudio = distribuicaoEstudio.reduce((s, e) => s + e.dias, 0);

  const presencaPct = pctPresencaAderencia(metricas.diasRealizado, denomAderencia);
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

  const [sortDetalhe, setSortDetalhe] = useState<{ col: SortDetalheCol; dir: SortDir }>({
    col: "data",
    dir: "desc",
  });
  const [paginaDetalhe, setPaginaDetalhe] = useState(0);

  const detalheOrdenado = useMemo(() => {
    const rows = [...metricas.detalhamento];
    const dir = sortDetalhe.dir;
    rows.sort((a, b) => {
      switch (sortDetalhe.col) {
        case "prestador":
          return compareLocaleTexto(a.prestadorNome ?? "", b.prestadorNome ?? "", dir);
        case "ocorrencia":
          return compareLocaleTexto(a.ocorrencia, b.ocorrencia, dir);
        case "detalhe":
          return compareLocaleTexto(a.detalhe, b.detalhe, dir);
        default:
          return compareLocaleTexto(a.dataIso, b.dataIso, dir);
      }
    });
    return rows;
  }, [metricas.detalhamento, sortDetalhe]);

  useEffect(() => {
    setPaginaDetalhe(0);
  }, [metricas.detalhamento, visaoTime, sortDetalhe]);

  const paginaDetalheSafe = clampPageIndex(
    paginaDetalhe,
    detalheOrdenado.length,
    TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR,
  );
  const detalhePagina = slicePage(detalheOrdenado, paginaDetalheSafe, TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR);

  return (
    <>
      {erroCarga ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            ...pageBox,
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{erroCarga}</span>
          {onRecarregar ? (
            <button
              type="button"
              onClick={onRecarregar}
              style={{
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid rgba(232,64,37,0.35)",
                background: "transparent",
                color: "#e84025",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          ) : null}
        </div>
      ) : null}
      <div style={pageBox}>
        <SectionTitle sub={visaoTime ? "consolidado do time · presença até hoje no mês corrente" : "presença até hoje no mês corrente"}>
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
                  {metricas.diasRealizado} de {denomAderencia} jornadas
                </div>
              </div>
            ) : null}

            <div style={subCardAbsenteismo(t)}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Pontualidade
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT.body, color: t.text, marginBottom: 8 }}>
                {visaoTime && denomAderencia > 0
                  ? fmtPct(
                      Math.round((1 - pontualidadeOcorr / Math.max(denomAderencia, 1)) * 1000) / 10,
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
                {visaoTime && denomAderencia > 0
                  ? fmtPct(
                      Math.round((1 - controlePresencaOcorr / Math.max(denomAderencia * 2, 1)) * 1000) / 10,
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
              <SectionTitle sub="trocas, turnos vendidos e folgas vendidas">
                Movimentações de turno
              </SectionTitle>
              {!prontoParaExibir || loading ? (
                blocoVazioOuLoading()
              ) : totalMovimentacoes === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                  Sem dados para o período selecionado.
                </div>
              ) : (
                <GraficoDonut
                  fatias={fatiasMovimentacoes}
                  totalLabel={visaoTime ? "Movimentações" : "No período"}
                  unidadeLabel={visaoTime ? "jornadas" : "dias"}
                />
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
                <GraficoDonut fatias={fatiasEstudio} totalLabel="Dias realizados" unidadeLabel="dias" />
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
                    <th scope="col" style={dataTable.thHeader}>Controle de Presença</th>
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
        ) : detalheOrdenado.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <>
            <div className="app-table-wrap" style={getDataTableWrapStyle()}>
              <table style={getDataTableStyle({ minWidth: visaoTime ? 640 : 520 })}>
                <caption style={{ display: "none" }}>Detalhamento diário de ocorrências</caption>
                <thead>
                  <tr>
                    <SortTableTh
                      label="Data"
                      col="data"
                      sortCol={sortDetalhe.col}
                      sortDir={sortDetalhe.dir}
                      onSort={(c) =>
                        setSortDetalhe((p) =>
                          p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDetalheCol, dir: "desc" },
                        )
                      }
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    {visaoTime ? (
                      <SortTableTh
                        label="Prestador"
                        col="prestador"
                        sortCol={sortDetalhe.col}
                        sortDir={sortDetalhe.dir}
                        onSort={(c) =>
                          setSortDetalhe((p) =>
                            p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDetalheCol, dir: "asc" },
                          )
                        }
                        thStyle={dataTable.thHeader}
                        align="center"
                      />
                    ) : null}
                    <SortTableTh
                      label="Ocorrência"
                      col="ocorrencia"
                      sortCol={sortDetalhe.col}
                      sortDir={sortDetalhe.dir}
                      onSort={(c) =>
                        setSortDetalhe((p) =>
                          p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDetalheCol, dir: "asc" },
                        )
                      }
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                    <SortTableTh
                      label="Detalhe"
                      col="detalhe"
                      sortCol={sortDetalhe.col}
                      sortDir={sortDetalhe.dir}
                      onSort={(c) =>
                        setSortDetalhe((p) =>
                          p.col === c ? { col: c, dir: p.dir === "asc" ? "desc" : "asc" } : { col: c as SortDetalheCol, dir: "asc" },
                        )
                      }
                      thStyle={dataTable.thHeader}
                      align="center"
                    />
                  </tr>
                </thead>
                <tbody>
                  {detalhePagina.map((row, i) => {
                    const zebra = dataTable.zebraRow(i);
                    return (
                      <tr
                        key={`${row.dataIso}-${row.ocorrencia}-${row.prestadorId ?? ""}-${i}`}
                        style={{ background: zebra }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = t.isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = zebra;
                        }}
                      >
                        <td style={dataTable.tdCenter}>{fmtDataPt(row.dataIso)}</td>
                        {visaoTime ? <td style={dataTable.tdCenter}>{row.prestadorNome ?? "—"}</td> : null}
                        <td style={dataTable.tdCenter}>{row.ocorrencia}</td>
                        <td style={dataTable.tdCenter}>{row.detalhe}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TabelaPaginacaoBar
              t={t}
              page={paginaDetalheSafe}
              pageSize={TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR}
              totalItems={detalheOrdenado.length}
              onPageChange={setPaginaDetalhe}
            />
          </>
        )}
      </div>
    </>
  );
}
