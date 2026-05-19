import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  LayoutList,
  ListOrdered,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { BRAND } from "../../../../lib/dashboardConstants";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SkeletonKpiCard } from "../../../../components/dashboard";
import {
  type VisaoPosicionamento,
  type LobbyExecucaoRow,
  type LobbyPosicaoRow,
  fmtPosicao,
  posicaoBgColor,
  posicaoTextColor,
  periodoRange,
  periodoAnteriorRange,
  execucoesNoPeriodo,
  ultimaExecucaoOk,
  penultimaExecucao,
  mapPosicoesPorExecucao,
  calcVisibilidadeVitrine,
  mesasNoTop10Snapshot,
  melhorPosicaoSnapshot,
  maiorQuedaSnapshot,
  deltaPosicao,
  bucketsHistorico,
  assignExecucoesToBuckets,
  posicaoMediaMesaNoBucket,
  heatmapColunas,
  execucoesParaHeatCol,
  rankingConcorrentes,
  visibilidadePorCategoria,
  concorrentesPorJogoSnapshot,
  gerarAlertas,
  LINE_COLORS,
  POS_CHART_MAX,
  SEMANTIC,
} from "../../../../lib/lobbyMonitorHelpers";

interface Props {
  operadoraSlug: string;
  visao: VisaoPosicionamento;
  refDate: Date;
  mesAno?: { ano: number; mes: number; label: string };
}

function KpiPosCard({
  label,
  value,
  delta,
  deltaLabel,
  positivo,
  icon,
}: {
  label: string;
  value: string;
  delta?: string | null;
  deltaLabel?: string;
  positivo?: boolean | null;
  icon: React.ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const corDelta =
    positivo == null ? t.textMuted : positivo ? SEMANTIC.verde : SEMANTIC.vermelho;

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${t.cardBorder}`,
        background: brand.blockBg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, var(--brand-action, #7c3aed), transparent)`,
        }}
      />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 22%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brand-action, #7c3aed)",
            }}
          >
            {icon}
          </span>
          <span
            style={{
              color: t.textMuted,
              fontSize: 10,
              fontFamily: FONT.body,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: t.text,
            fontFamily: FONT.body,
            marginBottom: 6,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {delta != null && delta !== "" && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corDelta, fontWeight: 700 }}>{delta}</span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>{deltaLabel ?? "vs anterior"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPosicionamento({ operadoraSlug, visao, refDate, mesAno }: Props) {
  const { theme: t, isDark } = useApp();
  const brand = useDashboardBrand();
  const [loading, setLoading] = useState(true);
  const [execucoesAll, setExecucoesAll] = useState<LobbyExecucaoRow[]>([]);
  const [posicoesAll, setPosicoesAll] = useState<LobbyPosicaoRow[]>([]);

  const card: React.CSSProperties = {
    borderRadius: 14,
    border: `1px solid ${t.cardBorder}`,
    background: brand.blockBg,
    padding: "16px 18px",
    marginBottom: 14,
  };

  const carregar = useCallback(async () => {
    if (!operadoraSlug || operadoraSlug === "todas") {
      setExecucoesAll([]);
      setPosicoesAll([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const range = periodoRange(visao, refDate, mesAno);
      const prev = periodoAnteriorRange(visao, refDate, mesAno);
      const fetchFrom = prev.inicio < range.inicio ? prev.inicio : range.inicio;

      const execRows = await fetchAllPages(async (from, to) =>
        supabase
          .from("lobby_monitor_execucao")
          .select("id, operadora_slug, executado_em, status")
          .eq("operadora_slug", operadoraSlug)
          .gte("executado_em", fetchFrom)
          .lte("executado_em", range.fim)
          .order("executado_em", { ascending: true })
          .range(from, to),
      );

      const execucoes = execRows as LobbyExecucaoRow[];
      if (execucoes.length === 0) {
        setExecucoesAll([]);
        setPosicoesAll([]);
        return;
      }

      const ids = execucoes.map((e) => e.id);
      const posRows = await fetchAllPages(async (from, to) =>
        supabase
          .from("lobby_monitor_posicao")
          .select(
            "execucao_id, mesa_identificacao, nome_mesa, tipo_jogo, posicao, qtd_concorrentes_a_frente, concorrentes_a_frente",
          )
          .in("execucao_id", ids)
          .range(from, to),
      );

      setExecucoesAll(execucoes);
      setPosicoesAll(
        (posRows as LobbyPosicaoRow[]).map((p) => ({
          ...p,
          concorrentes_a_frente: Array.isArray(p.concorrentes_a_frente)
            ? p.concorrentes_a_frente
            : [],
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [operadoraSlug, visao, refDate, mesAno]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const posByExec = useMemo(() => mapPosicoesPorExecucao(posicoesAll), [posicoesAll]);

  const rangeAtual = useMemo(() => periodoRange(visao, refDate, mesAno), [visao, refDate, mesAno]);
  const rangePrev = useMemo(() => periodoAnteriorRange(visao, refDate, mesAno), [visao, refDate, mesAno]);

  const execPeriodo = useMemo(
    () => execucoesNoPeriodo(execucoesAll, rangeAtual.inicio, rangeAtual.fim),
    [execucoesAll, rangeAtual],
  );
  const execPeriodoPrev = useMemo(
    () => execucoesNoPeriodo(execucoesAll, rangePrev.inicio, rangePrev.fim),
    [execucoesAll, rangePrev],
  );

  const ultimaGlobal = useMemo(() => ultimaExecucaoOk(execucoesAll), [execucoesAll]);
  const snapshotAtual = useMemo(
    () => (ultimaGlobal ? posByExec.get(ultimaGlobal.id) ?? [] : []),
    [ultimaGlobal, posByExec],
  );
  const execAnteriorSnap = useMemo(
    () => (ultimaGlobal ? penultimaExecucao(execucoesAll, ultimaGlobal.id) : null),
    [ultimaGlobal, execucoesAll],
  );
  const snapshotAnterior = useMemo(
    () => (execAnteriorSnap ? posByExec.get(execAnteriorSnap.id) ?? [] : []),
    [execAnteriorSnap, posByExec],
  );

  const visAtual = useMemo(() => calcVisibilidadeVitrine(execPeriodo, posByExec), [execPeriodo, posByExec]);
  const visPrev = useMemo(
    () => calcVisibilidadeVitrine(execPeriodoPrev, posByExec),
    [execPeriodoPrev, posByExec],
  );

  const top10Atual = useMemo(() => mesasNoTop10Snapshot(snapshotAtual), [snapshotAtual]);
  const top10PrevSnap = useMemo(() => {
    if (!execAnteriorSnap) return { noTop10: 0, total: 0 };
    return mesasNoTop10Snapshot(posByExec.get(execAnteriorSnap.id) ?? []);
  }, [execAnteriorSnap, posByExec]);

  const melhor = useMemo(() => melhorPosicaoSnapshot(snapshotAtual), [snapshotAtual]);
  const queda = useMemo(
    () => maiorQuedaSnapshot(snapshotAtual, snapshotAnterior),
    [snapshotAtual, snapshotAnterior],
  );

  const mesasOrdenadas = useMemo(() => {
    return [...snapshotAtual].sort((a, b) => {
      const pa = a.posicao ?? 999;
      const pb = b.posicao ?? 999;
      return pa - pb;
    });
  }, [snapshotAtual]);

  const prevMap = useMemo(
    () => new Map(snapshotAnterior.map((p) => [p.mesa_identificacao, p.posicao])),
    [snapshotAnterior],
  );

  const concorrentesJogo = useMemo(() => concorrentesPorJogoSnapshot(snapshotAtual), [snapshotAtual]);
  const maxConc = useMemo(
    () => Math.max(1, ...concorrentesJogo.map((c) => c.qtd), 0),
    [concorrentesJogo],
  );

  const tituloHistorico =
    visao === "dia"
      ? "Histórico de posicionamento — comparativo por hora"
      : visao === "semana"
        ? "Histórico de posicionamento — comparativo semanal"
        : "Histórico de posicionamento — comparativo mensal";

  const chartData = useMemo(() => {
    const buckets = assignExecucoesToBuckets(
      bucketsHistorico(visao, refDate, mesAno),
      execPeriodo,
      visao,
    );
    const mesas = [...new Set(snapshotAtual.map((m) => m.mesa_identificacao))];
    return buckets.map((b) => {
      const row: Record<string, string | number | null> = { label: b.label };
      for (const mid of mesas) {
        const nome =
          snapshotAtual.find((m) => m.mesa_identificacao === mid)?.nome_mesa ?? mid;
        row[nome] = posicaoMediaMesaNoBucket(mid, b.execucaoIds, posByExec);
      }
      return row;
    });
  }, [visao, refDate, mesAno, execPeriodo, snapshotAtual, posByExec]);

  const mesasChart = useMemo(() => {
    const set = new Set<string>();
    for (const row of chartData) {
      for (const k of Object.keys(row)) {
        if (k !== "label") set.add(k);
      }
    }
    return [...set];
  }, [chartData]);

  const heatCols = useMemo(() => heatmapColunas(visao, refDate, mesAno), [visao, refDate, mesAno]);
  const heatMesas = useMemo(() => mesasOrdenadas.map((m) => m.mesa_identificacao), [mesasOrdenadas]);

  const ranking = useMemo(
    () => rankingConcorrentes(execPeriodo, posByExec),
    [execPeriodo, posByExec],
  );
  const maxRank = ranking[0]?.count ?? 1;

  const cats = useMemo(
    () => visibilidadePorCategoria(execPeriodo, posByExec),
    [execPeriodo, posByExec],
  );

  const alertas = useMemo(
    () => gerarAlertas(snapshotAtual, snapshotAnterior, execPeriodo, posByExec),
    [snapshotAtual, snapshotAnterior, execPeriodo, posByExec],
  );

  const semDados =
    operadoraSlug === "todas" || (!loading && execucoesAll.length === 0);

  if (operadoraSlug === "todas") {
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        Selecione uma operadora para ver o posicionamento no lobby.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-grid-kpi-4" style={{ marginBottom: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpiCard key={i} />
        ))}
      </div>
    );
  }

  if (semDados) {
    return (
      <div
        style={{
          padding: "40px 0",
          textAlign: "center",
          color: t.textMuted,
          fontSize: 13,
          fontFamily: FONT.body,
        }}
      >
        Sem dados para o período selecionado.
      </div>
    );
  }

  const deltaVisPp =
    visAtual != null && visPrev != null ? visAtual - visPrev : null;
  const deltaTop10 = top10Atual.noTop10 - top10PrevSnap.noTop10;

  return (
    <>
      <div className="app-grid-kpi-4" style={{ marginBottom: 14 }}>
        <KpiPosCard
          label="Visibilidade na vitrine"
          value={visAtual != null ? `${visAtual.toFixed(0)}%` : "—"}
          delta={
            deltaVisPp != null
              ? `${deltaVisPp >= 0 ? "+" : ""}${deltaVisPp.toFixed(0)}pp`
              : null
          }
          positivo={deltaVisPp == null ? null : deltaVisPp >= 0}
          icon={<Eye size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Mesas no top 10"
          value={`${top10Atual.noTop10} / ${top10Atual.total || "—"}`}
          delta={deltaTop10 !== 0 ? `${deltaTop10 >= 0 ? "+" : ""}${deltaTop10}` : "—"}
          positivo={deltaTop10 >= 0}
          icon={<Trophy size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Melhor posição"
          value={melhor ? `${fmtPosicao(melhor.posicao)} — ${melhor.nome_mesa}` : "—"}
          icon={<MapPin size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Maior queda"
          value={queda ? `−${queda.delta} · ${queda.nome_mesa}` : "—"}
          icon={<TrendingDown size={16} aria-hidden />}
          positivo={false}
        />
      </div>

      <div className="app-grid-2" style={{ marginBottom: 14 }}>
        <div style={card}>
          <SectionTitle icon={<ListOrdered size={15} />}>Posição atual das mesas</SectionTitle>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 12px", fontFamily: FONT.body }}>
            Último snapshot
            {ultimaGlobal
              ? ` · ${new Date(ultimaGlobal.executado_em).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {mesasOrdenadas.map((m) => {
              const pa = prevMap.get(m.mesa_identificacao) ?? null;
              const d = deltaPosicao(m.posicao, pa);
              return (
                <li
                  key={m.mesa_identificacao}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${t.cardBorder}`,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      minWidth: 40,
                      padding: "4px 8px",
                      borderRadius: 8,
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      background: posicaoBgColor(m.posicao),
                      color: posicaoTextColor(m.posicao),
                    }}
                  >
                    {fmtPosicao(m.posicao)}
                  </span>
                  <span style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }} title={m.nome_mesa}>
                    {m.nome_mesa}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 28, justifyContent: "flex-end" }}>
                    {d == null || d === 0 ? (
                      <Minus size={14} color={SEMANTIC.cinza} aria-hidden />
                    ) : d < 0 ? (
                      <ArrowUp size={14} color={SEMANTIC.verde} aria-label="Melhorou" />
                    ) : (
                      <ArrowDown size={14} color={SEMANTIC.vermelho} aria-label="Piorou" />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div style={card}>
          <SectionTitle icon={<LayoutList size={15} />}>Concorrentes à frente por jogo</SectionTitle>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 12px", fontFamily: FONT.body }}>
            Snapshot mais recente
          </p>
          {concorrentesJogo.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
          ) : (
            concorrentesJogo.map((c) => (
              <div key={c.jogo} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    color: t.text,
                  }}
                >
                  <span>{c.jogo}</span>
                  <span style={{ color: t.textMuted }}>
                    {c.qtd} {c.qtd === 1 ? "concorrente" : "concorrentes"}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (c.qtd / maxConc) * 100)}%`,
                      borderRadius: 4,
                      background: "var(--brand-action, #7c3aed)",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<TrendingUp size={15} />}>{tituloHistorico}</SectionTitle>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: t.textMuted }} />
              <YAxis
                reversed
                domain={[1, POS_CHART_MAX]}
                tick={{ fontSize: 11, fill: t.textMuted }}
                tickFormatter={(v) => `P${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: brand.blockBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10,
                  fontFamily: FONT.body,
                  fontSize: 12,
                }}
                formatter={(v: number) => (v != null ? fmtPosicao(v) : "—")}
              />
              <Legend wrapperStyle={{ fontFamily: FONT.body, fontSize: 11 }} />
              {mesasChart.map((nome, i) => (
                <Line
                  key={nome}
                  type="monotone"
                  dataKey={nome}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="app-grid-2" style={{ marginBottom: 14 }}>
        <div style={card}>
          <SectionTitle icon={<LayoutList size={15} />} sub={visao === "dia" ? "por hora" : visao === "semana" ? "por dia" : "por semana"}>
            Heatmap de posicionamento
          </SectionTitle>
          <div className="app-table-wrap">
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: FONT.body, fontSize: 12 }}>
              <caption style={{ display: "none" }}>Heatmap de posicionamento das mesas</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: 8, color: t.textMuted, fontWeight: 600 }}>
                    Mesa
                  </th>
                  {heatCols.map((c) => (
                    <th key={c.key} scope="col" style={{ textAlign: "center", padding: 6, color: t.textMuted, fontWeight: 600 }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatMesas.map((mid) => {
                  const nome = snapshotAtual.find((m) => m.mesa_identificacao === mid)?.nome_mesa ?? mid;
                  return (
                    <tr key={mid}>
                      <td style={{ padding: 8, color: t.text, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }} title={nome}>
                        {nome}
                      </td>
                      {heatCols.map((col) => {
                        const execIds = execucoesParaHeatCol(execPeriodo, col.key, visao, refDate, mesAno);
                        const pos = posicaoMediaMesaNoBucket(mid, execIds, posByExec);
                        return (
                          <td key={col.key} style={{ padding: 4, textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                minWidth: 36,
                                padding: "4px 6px",
                                borderRadius: 6,
                                fontWeight: 700,
                                fontSize: 11,
                                background: posicaoBgColor(pos != null ? Math.round(pos) : null),
                                color: posicaoTextColor(pos != null ? Math.round(pos) : null),
                              }}
                            >
                              {pos != null ? fmtPosicao(Math.round(pos)) : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <SectionTitle icon={<Trophy size={15} />}>Ranking de concorrentes frequentes</SectionTitle>
          {ranking.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
          ) : (
            ranking.slice(0, 10).map((r) => (
              <div key={r.provider} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                    fontFamily: FONT.body,
                  }}
                >
                  <span style={{ color: t.text }}>{r.provider}</span>
                  <span style={{ color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>{r.count}x</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(r.count / maxRank) * 100}%`,
                      background: "var(--brand-contrast, #1e36f8)",
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<Eye size={15} />}>Visibilidade por categoria</SectionTitle>
        {cats.map((c) => {
          const dominante = c.pctTop10 >= 60;
          return (
            <div key={c.categoria} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  fontFamily: FONT.body,
                  fontSize: 13,
                }}
              >
                <span style={{ color: t.text, fontWeight: 600 }}>{c.categoria}</span>
                <span style={{ color: dominante ? SEMANTIC.verde : SEMANTIC.vermelho, fontSize: 12 }}>
                  {c.melhorPos != null ? `${fmtPosicao(c.melhorPos)} · ` : ""}
                  {c.pctTop3.toFixed(0)}% top 3 · {c.pctTop10.toFixed(0)}% top 10
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, c.pctTop10)}%`,
                    background: dominante ? SEMANTIC.verde : BRAND.amarelo,
                    borderRadius: 5,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <SectionTitle icon={<AlertTriangle size={15} />}>Alertas do período</SectionTitle>
        {alertas.length === 0 ? (
          <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body, margin: 0 }}>
            Nenhum alerta automático para o período.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {alertas.map((a, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 8,
                  fontFamily: FONT.body,
                  fontSize: 13,
                  background:
                    a.tipo === "positivo"
                      ? "color-mix(in srgb, #22c55e 14%, transparent)"
                      : "color-mix(in srgb, #f59e0b 16%, transparent)",
                  color: t.text,
                  border: `1px solid ${a.tipo === "positivo" ? "color-mix(in srgb, #22c55e 30%, transparent)" : "color-mix(in srgb, #f59e0b 35%, transparent)"}`,
                }}
              >
                {a.texto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
