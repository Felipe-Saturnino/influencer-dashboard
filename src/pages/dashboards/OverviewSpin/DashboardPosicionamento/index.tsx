import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  LayoutList,
  ListOrdered,
  MapPin,
  Minus,
  TrendingDown,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "../../../../context/AppContext";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { FONT } from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe } from "../../../../lib/tableStyles";
import SectionTitle from "../../../../components/dashboard/SectionTitle";
import { SkeletonKpiCard } from "../../../../components/dashboard";
import {
  type HeatmapHistoricoModo,
  type LobbyExecucaoRow,
  type LobbyPosicaoRow,
  fmtPosicao,
  posicaoBgColor,
  posicaoTextColor,
  periodoRange,
  execucoesNoPeriodo,
  mapPosicoesPorExecucao,
  mesasNoTop10Snapshot,
  deltaPosicao,
  posicaoMediaMesaNoBucket,
  ultimaExecucaoNoDia,
  execucaoMesmoHorarioDiaAnterior,
  calcVisibilidadeLeituras,
  melhorPosicaoComCategoria,
  maiorQuedaEntreSnapshots,
  colunasHistoricoPosicionamento,
  execIdsColunaHistorico,
  visibilidadePorCategoriaDia,
  concorrentesPorJogoDetalhe,
  fmtUltimaAtualizacao,
  gerarAlertas,
  SEMANTIC,
  toDateKey,
  addDays,
  POS_MONITOR_DIA_MIN,
} from "../../../../lib/lobbyMonitorHelpers";

interface Props {
  operadoraSlug: string;
  refDate: Date;
}

const VS_ONTEM = "vs ontem (mesmo horário)";

const HISTORICO_MODOS: { id: HeatmapHistoricoModo; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

function KpiPosCard({
  label,
  value,
  subValue,
  delta,
  deltaLabel,
  positivo,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string | null;
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
            marginBottom: subValue ? 4 : 6,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        {subValue ? (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 6,
            }}
          >
            {subValue}
          </div>
        ) : null}
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

function ConcorrentesCountHover({
  qtd,
  jogos,
}: {
  qtd: number;
  jogos: { name: string; provider_name: string; posicao: number }[];
}) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  if (qtd === 0) {
    return <span style={{ color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>0</span>;
  }
  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        style={{
          color: "var(--brand-action, #7c3aed)",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          cursor: "default",
          borderBottom: "1px dotted var(--brand-action, #7c3aed)",
        }}
      >
        {qtd}
      </span>
      {open && jogos.length > 0 && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 6,
            zIndex: 20,
            minWidth: 200,
            maxWidth: 280,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${t.cardBorder}`,
            background: t.cardBg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            fontFamily: FONT.body,
            fontSize: 12,
            textAlign: "left",
          }}
        >
          {jogos.map((j) => (
            <div
              key={`${j.posicao}-${j.name}`}
              style={{ marginBottom: 6, color: t.text, lineHeight: 1.35 }}
            >
              <span style={{ color: t.textMuted }}>{fmtPosicao(j.posicao)} · </span>
              {j.name}
              <span style={{ color: t.textMuted }}> — {j.provider_name}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

export default function DashboardPosicionamento({ operadoraSlug, refDate }: Props) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const [loading, setLoading] = useState(true);
  const [execucoesAll, setExecucoesAll] = useState<LobbyExecucaoRow[]>([]);
  const [posicoesAll, setPosicoesAll] = useState<LobbyPosicaoRow[]>([]);
  const [historicoModo, setHistoricoModo] = useState<HeatmapHistoricoModo>("dia");

  const dayKey = useMemo(() => toDateKey(refDate), [refDate]);

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
      const rangeDia = periodoRange("dia", refDate);
      const fetchStart = addDays(refDate, -35);
      const minKey = toDateKey(POS_MONITOR_DIA_MIN);
      const fetchInicioKey =
        toDateKey(fetchStart) < minKey ? minKey : toDateKey(fetchStart);
      const fetchFrom = `${fetchInicioKey}T00:00:00.000Z`;

      const execRows = await fetchAllPages(async (from, to) =>
        supabase
          .from("lobby_monitor_execucao")
          .select(
            "id, operadora_slug, executado_em, status, pior_mesa_nome, pior_mesa_identificacao, pior_mesa_posicao, jogos_a_frente_pior_mesa",
          )
          .eq("operadora_slug", operadoraSlug)
          .gte("executado_em", fetchFrom)
          .lte("executado_em", rangeDia.fim)
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

      setExecucoesAll(
        execucoes.map((e) => ({
          ...e,
          jogos_a_frente_pior_mesa: Array.isArray(e.jogos_a_frente_pior_mesa)
            ? e.jogos_a_frente_pior_mesa
            : [],
        })),
      );
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
  }, [operadoraSlug, refDate]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const posByExec = useMemo(() => mapPosicoesPorExecucao(posicoesAll), [posicoesAll]);

  const rangeDia = useMemo(() => periodoRange("dia", refDate), [refDate]);
  const execDia = useMemo(
    () => execucoesNoPeriodo(execucoesAll, rangeDia.inicio, rangeDia.fim),
    [execucoesAll, rangeDia],
  );

  const ultimaNoDia = useMemo(
    () => ultimaExecucaoNoDia(execucoesAll, dayKey),
    [execucoesAll, dayKey],
  );
  const execOntemMesmoHorario = useMemo(
    () => (ultimaNoDia ? execucaoMesmoHorarioDiaAnterior(ultimaNoDia, execucoesAll) : null),
    [ultimaNoDia, execucoesAll],
  );

  const snapshotAtual = useMemo(
    () => (ultimaNoDia ? posByExec.get(ultimaNoDia.id) ?? [] : []),
    [ultimaNoDia, posByExec],
  );
  const snapshotOntem = useMemo(
    () => (execOntemMesmoHorario ? posByExec.get(execOntemMesmoHorario.id) ?? [] : []),
    [execOntemMesmoHorario, posByExec],
  );

  const visAtual = useMemo(() => calcVisibilidadeLeituras(snapshotAtual), [snapshotAtual]);
  const visOntem = useMemo(() => calcVisibilidadeLeituras(snapshotOntem), [snapshotOntem]);

  const top10Atual = useMemo(() => mesasNoTop10Snapshot(snapshotAtual), [snapshotAtual]);
  const top10Ontem = useMemo(() => mesasNoTop10Snapshot(snapshotOntem), [snapshotOntem]);

  const melhor = useMemo(() => melhorPosicaoComCategoria(snapshotAtual), [snapshotAtual]);
  const queda = useMemo(
    () => maiorQuedaEntreSnapshots(snapshotAtual, snapshotOntem),
    [snapshotAtual, snapshotOntem],
  );

  const mesasOrdenadas = useMemo(() => {
    return [...snapshotAtual].sort((a, b) => {
      const pa = a.posicao ?? 999;
      const pb = b.posicao ?? 999;
      return pa - pb;
    });
  }, [snapshotAtual]);

  const prevMap = useMemo(
    () => new Map(snapshotOntem.map((p) => [p.mesa_identificacao, p.posicao])),
    [snapshotOntem],
  );

  const concorrentesJogo = useMemo(
    () => concorrentesPorJogoDetalhe(snapshotAtual),
    [snapshotAtual],
  );

  const rankingJogos = useMemo(() => {
    const raw = ultimaNoDia?.jogos_a_frente_pior_mesa ?? [];
    return [...raw].sort((a, b) => a.posicao - b.posicao);
  }, [ultimaNoDia]);

  const heatCols = useMemo(
    () => colunasHistoricoPosicionamento(historicoModo, refDate),
    [historicoModo, refDate],
  );
  const heatMesas = useMemo(() => mesasOrdenadas.map((m) => m.mesa_identificacao), [mesasOrdenadas]);

  const cats = useMemo(
    () => visibilidadePorCategoriaDia(execDia, posByExec),
    [execDia, posByExec],
  );

  const alertas = useMemo(
    () => gerarAlertas(snapshotAtual, snapshotOntem, execDia, posByExec),
    [snapshotAtual, snapshotOntem, execDia, posByExec],
  );

  const semDados =
    operadoraSlug === "todas" || (!loading && execDia.length === 0);

  const sombraColMesaHist = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";

  const zebraBgHistLinha = (i: number) => {
    const base = brand.blockBg ?? t.cardBg;
    if (i % 2 === 0) return base;
    return t.isDark
      ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 16%, #141118)"
      : "color-mix(in srgb, var(--brand-secondary, #4a2082) 10%, #f2effa)";
  };

  const thHistMesa: CSSProperties = {
    ...getThStyle(t),
    position: "sticky",
    left: 0,
    zIndex: 3,
    minWidth: 140,
    maxWidth: 180,
    background: brand.blockBg,
    boxShadow: sombraColMesaHist,
  };

  const tdHistMesa = (i: number): CSSProperties => ({
    ...getTdStyle(t),
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 140,
    maxWidth: 160,
    fontWeight: 600,
    textAlign: "left",
    background: zebraBgHistLinha(i),
    boxShadow: sombraColMesaHist,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

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
    visAtual != null && visOntem != null ? visAtual - visOntem : null;
  const deltaTop10 = top10Atual.noTop10 - top10Ontem.noTop10;

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
          deltaLabel={VS_ONTEM}
          positivo={deltaVisPp == null ? null : deltaVisPp >= 0}
          icon={<Eye size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Mesas no top 10"
          value={`${top10Atual.noTop10} / ${top10Atual.total || "—"}`}
          delta={deltaTop10 !== 0 ? `${deltaTop10 >= 0 ? "+" : ""}${deltaTop10}` : null}
          deltaLabel={VS_ONTEM}
          positivo={deltaTop10 >= 0}
          icon={<Trophy size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Melhor posição"
          value={melhor ? fmtPosicao(melhor.posicao) : "—"}
          subValue={melhor?.categoria ?? null}
          icon={<MapPin size={16} aria-hidden />}
        />
        <KpiPosCard
          label="Maior queda"
          value={queda ? `−${queda.delta}` : "—"}
          subValue={queda?.nome_mesa ?? null}
          icon={<TrendingDown size={16} aria-hidden />}
          positivo={false}
        />
      </div>

      <div className="app-grid-2" style={{ marginBottom: 14 }}>
        <div style={card}>
          <SectionTitle icon={<ListOrdered size={15} />}>Posição atual das mesas</SectionTitle>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 12px", fontFamily: FONT.body }}>
            {fmtUltimaAtualizacao(ultimaNoDia?.executado_em)}
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
          <SectionTitle icon={<LayoutList size={15} />}>Concorrentes à frente</SectionTitle>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 12px", fontFamily: FONT.body }}>
            {fmtUltimaAtualizacao(ultimaNoDia?.executado_em)}
          </p>
          {concorrentesJogo.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {concorrentesJogo.map((c) => (
                <li
                  key={c.jogo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${t.cardBorder}`,
                    fontFamily: FONT.body,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: t.text, fontWeight: 600 }}>{c.jogo}</span>
                  <ConcorrentesCountHover qtd={c.qtd} jogos={c.jogos} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <SectionTitle icon={<LayoutList size={15} />}>Histórico de posicionamento</SectionTitle>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {HISTORICO_MODOS.map((m) => {
              const ativo = historicoModo === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setHistoricoModo(m.id)}
                  style={{
                    padding: "6px 14px",
                    minHeight: 36,
                    borderRadius: 999,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    border: `1px solid ${ativo ? "var(--brand-action, #7c3aed)" : t.cardBorder}`,
                    background: ativo
                      ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                      : "transparent",
                    color: ativo ? "var(--brand-action, #7c3aed)" : t.textMuted,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="app-table-wrap">
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              borderRadius: 14,
              fontFamily: FONT.body,
              fontSize: 12,
            }}
          >
            <caption style={{ display: "none" }}>Histórico de posicionamento das mesas</caption>
            <thead>
              <tr>
                <th scope="col" style={thHistMesa}>
                  Mesa
                </th>
                {heatCols.map((c) => (
                  <th key={c.key} scope="col" style={{ ...getThStyle(t), textAlign: "center" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatMesas.map((mid, rowIdx) => {
                const nome = snapshotAtual.find((m) => m.mesa_identificacao === mid)?.nome_mesa ?? mid;
                return (
                  <tr key={mid} style={{ background: zebraStripe(rowIdx) }}>
                    <td style={tdHistMesa(rowIdx)} title={nome}>
                      {nome}
                    </td>
                    {heatCols.map((col) => {
                      const execIds = execIdsColunaHistorico(historicoModo, col.key, refDate, execucoesAll);
                      const pos = posicaoMediaMesaNoBucket(mid, execIds, posByExec);
                      return (
                        <td key={col.key} style={{ ...getTdStyle(t), textAlign: "center" }}>
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

      <div className="app-grid-2" style={{ marginBottom: 14 }}>
        <div style={card}>
          <SectionTitle icon={<Trophy size={15} />}>Ranking de concorrentes</SectionTitle>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "0 0 12px", fontFamily: FONT.body }}>
            {fmtUltimaAtualizacao(ultimaNoDia?.executado_em)}
          </p>
          {rankingJogos.length === 0 ? (
            <p style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rankingJogos.map((j) => (
                <li
                  key={j.game_id}
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
                      background: posicaoBgColor(j.posicao),
                      color: posicaoTextColor(j.posicao),
                    }}
                  >
                    {fmtPosicao(j.posicao)}
                  </span>
                  <span style={{ flex: 1, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }} title={j.name}>
                    {j.name}
                  </span>
                  <span
                    style={{
                      color: t.textMuted,
                      fontSize: 12,
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={j.provider_name}
                  >
                    {j.provider_name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={card}>
          <SectionTitle icon={<Eye size={15} />}>Visibilidade por categoria</SectionTitle>
          <div className="app-table-wrap">
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                borderRadius: 14,
                overflow: "hidden",
                fontFamily: FONT.body,
                fontSize: 12,
              }}
            >
              <caption style={{ display: "none" }}>Visibilidade por categoria no dia</caption>
              <thead>
                <tr>
                  <th scope="col" style={getThStyle(t)}>
                    Jogo
                  </th>
                  <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                    Top 3
                  </th>
                  <th scope="col" style={{ ...getThStyle(t), textAlign: "right" }}>
                    Top 10
                  </th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c, i) => (
                  <tr key={c.categoria} style={{ background: zebraStripe(i) }}>
                    <td style={getTdStyle(t)}>{c.categoria}</td>
                    <td style={getTdNumStyle(t)}>{c.pctTop3.toFixed(0)}%</td>
                    <td style={getTdNumStyle(t)}>{c.pctTop10.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
