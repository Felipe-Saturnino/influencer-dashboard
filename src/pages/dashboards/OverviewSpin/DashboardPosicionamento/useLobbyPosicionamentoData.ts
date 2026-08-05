import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  fetchAllPages,
  fetchInBatched,
  LOBBY_MONITOR_EXECUCAO_IN_CHUNK,
} from "../../../../lib/supabasePaginate";
import {
  inicioDiaBrasilUtcIso,
  periodoDiaBrasil,
  subDiasIso,
} from "../../../../lib/dateBrasil";
import {
  type LobbyExecucaoRow,
  type LobbyPosicaoRow,
  execucoesNoPeriodo,
  mapPosicoesPorExecucao,
  mesasNoTop10Snapshot,
  ultimaExecucaoNoDia,
  execucaoMesmoHorarioDiaAnterior,
  calcVisibilidadeLeituras,
  melhorPosicaoComCategoria,
  maiorQuedaEntreSnapshots,
  concorrentesPorJogoDetalhe,
  visibilidadePorCategoriaDia,
  gerarAlertas,
  toDateKey,
  POS_MONITOR_DIA_MIN,
  rankingConcorrentesFromPosicoes,
  ultimaPosicaoDiferenteNaJanela,
} from "../../../../lib/lobbyMonitorHelpers";

export const LOBBY_POS_SLUGS_CONSOLIDADOS = [
  "blaze",
  "casa_apostas",
  "esportiva_bet",
  "jonbet",
] as const;

export type LobbyPosSlugConsolidado = (typeof LOBBY_POS_SLUGS_CONSOLIDADOS)[number];

/**
 * Janela do heatmap histórico: 30 colunas incluem o dia de referência,
 * logo a mais antiga é `refDate − 29` (`colunasHistoricoPosicionamento`).
 * Não buscar margem além disso — dias fora das colunas nunca são exibidos.
 */
const POS_HISTORICO_DIAS = 29;

/** Janela padrão da vista consolidada (última posição diferente). */
export const POS_COMPARACAO_DIFERENTE_DIAS = 6;

/** Concorrência dos lotes de posições do histórico (carga em background). */
const POS_HISTORICO_CONCORRENCIA = 4;

interface UseLobbyPosicionamentoDataOpts {
  /**
   * Quando `false`, não busca a janela de 35 dias usada pelo heatmap 7d/30d —
   * só hoje + ontem (KPIs, snapshot, alertas, heatmap Dia). Default `true`.
   */
  historico?: boolean;
  /**
   * Dias atrás do `refDate` para a fase 2 (além de hoje/ontem da fase 1).
   * Default `POS_HISTORICO_DIAS` (29). Vista consolidada usa `6` (= 7 dias civis).
   */
  historicoDias?: number;
}

export function useLobbyPosicionamentoData(
  operadoraSlug: string,
  refDate: Date,
  opts?: UseLobbyPosicionamentoDataOpts,
) {
  const comHistorico = opts?.historico ?? true;
  const historicoDias = opts?.historicoDias ?? POS_HISTORICO_DIAS;
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(comHistorico);
  const [execRecentes, setExecRecentes] = useState<LobbyExecucaoRow[]>([]);
  const [posRecentes, setPosRecentes] = useState<LobbyPosicaoRow[]>([]);
  const [execHist, setExecHist] = useState<LobbyExecucaoRow[]>([]);
  const [posHist, setPosHist] = useState<LobbyPosicaoRow[]>([]);

  const dayKey = useMemo(() => {
    const y = refDate.getFullYear();
    const m = String(refDate.getMonth() + 1).padStart(2, "0");
    const d = String(refDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [refDate]);
  const skip = !operadoraSlug || operadoraSlug === "todas";

  const carregar = useCallback(async () => {
    if (skip) {
      setExecRecentes([]);
      setPosRecentes([]);
      setExecHist([]);
      setPosHist([]);
      setLoading(false);
      setLoadingHistorico(false);
      return;
    }
    setLoading(true);
    setLoadingHistorico(comHistorico);
    setExecHist([]);
    setPosHist([]);

    const rangeDia = periodoDiaBrasil(dayKey);
    const minKey = toDateKey(POS_MONITOR_DIA_MIN);
    const ontemKey = subDiasIso(dayKey, 1);
    const inicioRecenteKey = ontemKey < minKey ? minKey : ontemKey;
    const inicioRecente = inicioDiaBrasilUtcIso(inicioRecenteKey);

    let temDadosRecentes = false;

    // Fase 1 — essencial (hoje + ontem): KPIs, snapshot, alertas, heatmap Dia.
    try {
      const execRows = await fetchAllPages(async (from, to) =>
        supabase
          .from("lobby_monitor_execucao")
          .select(
            "id, operadora_slug, executado_em, status, pior_mesa_nome, pior_mesa_identificacao, pior_mesa_posicao, jogos_a_frente_pior_mesa",
          )
          .eq("operadora_slug", operadoraSlug)
          .gte("executado_em", inicioRecente)
          .lte("executado_em", rangeDia.fim)
          .order("executado_em", { ascending: true })
          .range(from, to),
      );

      const execucoes = execRows as LobbyExecucaoRow[];
      if (execucoes.length === 0) {
        setExecRecentes([]);
        setPosRecentes([]);
      } else {
        const ids = execucoes.map((e) => e.id);
        const [posRows, mesasCad, estudiosCad] = await Promise.all([
          fetchInBatched(ids, LOBBY_MONITOR_EXECUCAO_IN_CHUNK, async (slice) =>
            fetchAllPages(async (from, to) =>
              supabase
                .from("lobby_monitor_posicao")
                .select(
                  "execucao_id, mesa_identificacao, nome_mesa, tipo_jogo, posicao, qtd_concorrentes_a_frente, concorrentes_a_frente",
                )
                .in("execucao_id", slice)
                .range(from, to),
            ),
          ),
          supabase.from("mesas_spin_cadastro").select("mesa_identificacao, estudio_slug"),
          supabase.from("estudios_spin").select("slug, nome"),
        ]);

        const nomeEstudioPorSlug = new Map<string, string>();
        for (const e of estudiosCad.data ?? []) {
          const slug = typeof e.slug === "string" ? e.slug.trim() : "";
          const nome = typeof e.nome === "string" ? e.nome.trim() : "";
          if (slug && nome) nomeEstudioPorSlug.set(slug, nome);
        }
        const nomeEstudioPorMesaSpin = new Map<string, string>();
        for (const m of mesasCad.data ?? []) {
          const mid = typeof m.mesa_identificacao === "string" ? m.mesa_identificacao.trim() : "";
          const estSlug = typeof m.estudio_slug === "string" ? m.estudio_slug.trim() : "";
          if (!mid || !estSlug) continue;
          const nomeEst = nomeEstudioPorSlug.get(estSlug);
          if (nomeEst) nomeEstudioPorMesaSpin.set(mid, nomeEst);
        }

        setExecRecentes(
          execucoes.map((e) => ({
            ...e,
            jogos_a_frente_pior_mesa: Array.isArray(e.jogos_a_frente_pior_mesa)
              ? e.jogos_a_frente_pior_mesa
              : [],
          })),
        );
        setPosRecentes(
          (posRows as LobbyPosicaoRow[]).map((p) => ({
            ...p,
            nome_estudio: nomeEstudioPorMesaSpin.get(p.mesa_identificacao.trim()) ?? null,
            concorrentes_a_frente: Array.isArray(p.concorrentes_a_frente)
              ? p.concorrentes_a_frente
              : [],
          })),
        );
        temDadosRecentes = true;
      }
    } catch (err) {
      console.error("[useLobbyPosicionamentoData]", operadoraSlug, err);
      setExecRecentes([]);
      setPosRecentes([]);
    } finally {
      setLoading(false);
    }

    // Fase 2 — histórico (heatmap 7d/30d) em background, colunas mínimas.
    if (!comHistorico || !temDadosRecentes) {
      setLoadingHistorico(false);
      return;
    }
    try {
      const fetchStartKey = subDiasIso(dayKey, historicoDias);
      const fetchInicioKey = fetchStartKey < minKey ? minKey : fetchStartKey;
      if (fetchInicioKey >= inicioRecenteKey) return;

      const execHistRows = await fetchAllPages(async (from, to) =>
        supabase
          .from("lobby_monitor_execucao")
          .select("id, executado_em, status")
          .eq("operadora_slug", operadoraSlug)
          .gte("executado_em", inicioDiaBrasilUtcIso(fetchInicioKey))
          .lt("executado_em", inicioRecente)
          .order("executado_em", { ascending: true })
          .range(from, to),
      );
      if (execHistRows.length === 0) return;

      const idsHist = execHistRows.map((e) => e.id as string);
      const posHistRows = await fetchInBatched(
        idsHist,
        LOBBY_MONITOR_EXECUCAO_IN_CHUNK,
        async (slice) =>
          fetchAllPages(async (from, to) =>
            supabase
              .from("lobby_monitor_posicao")
              .select("execucao_id, mesa_identificacao, posicao")
              .in("execucao_id", slice)
              .range(from, to),
          ),
        POS_HISTORICO_CONCORRENCIA,
      );

      setExecHist(
        execHistRows.map((e) => ({
          id: e.id as string,
          operadora_slug: operadoraSlug,
          executado_em: e.executado_em as string,
          status: e.status as string,
          jogos_a_frente_pior_mesa: [],
        })),
      );
      setPosHist(
        posHistRows.map((p) => ({
          execucao_id: p.execucao_id as string,
          mesa_identificacao: p.mesa_identificacao as string,
          nome_mesa: "",
          tipo_jogo: "",
          posicao: (p.posicao ?? null) as number | null,
          qtd_concorrentes_a_frente: 0,
          concorrentes_a_frente: [],
        })),
      );
    } catch (err) {
      console.error("[useLobbyPosicionamentoData:historico]", operadoraSlug, err);
    } finally {
      setLoadingHistorico(false);
    }
  }, [operadoraSlug, dayKey, skip, comHistorico, historicoDias]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const execucoesAll = useMemo(
    () => (execHist.length ? [...execHist, ...execRecentes] : execRecentes),
    [execHist, execRecentes],
  );
  const posicoesAll = useMemo(
    () => (posHist.length ? [...posHist, ...posRecentes] : posRecentes),
    [posHist, posRecentes],
  );

  const posByExec = useMemo(() => mapPosicoesPorExecucao(posicoesAll), [posicoesAll]);
  const rangeDia = useMemo(() => periodoDiaBrasil(dayKey), [dayKey]);
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
    () => (ultimaNoDia ? (posByExec.get(ultimaNoDia.id) ?? []) : []),
    [ultimaNoDia, posByExec],
  );
  const snapshotOntem = useMemo(
    () =>
      execOntemMesmoHorario ? (posByExec.get(execOntemMesmoHorario.id) ?? []) : [],
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

  const mesasOrdenadas = useMemo(
    () =>
      [...snapshotAtual].sort((a, b) => {
        const pa = a.posicao ?? 999;
        const pb = b.posicao ?? 999;
        return pa - pb;
      }),
    [snapshotAtual],
  );

  const prevMap = useMemo(
    () => new Map(snapshotOntem.map((p) => [p.mesa_identificacao, p.posicao])),
    [snapshotOntem],
  );

  /** Última posição ≠ atual nos últimos 7 dias civis (vista consolidada). */
  const prevDiferenteMap = useMemo(() => {
    const desdeKey = subDiasIso(dayKey, POS_COMPARACAO_DIFERENTE_DIAS);
    const map = new Map<string, number | null>();
    for (const m of snapshotAtual) {
      map.set(
        m.mesa_identificacao,
        ultimaPosicaoDiferenteNaJanela(
          m.mesa_identificacao,
          m.posicao,
          ultimaNoDia?.id,
          execucoesAll,
          posByExec,
          desdeKey,
        ),
      );
    }
    return map;
  }, [snapshotAtual, ultimaNoDia?.id, execucoesAll, posByExec, dayKey]);

  const concorrentesJogo = useMemo(
    () => concorrentesPorJogoDetalhe(snapshotAtual),
    [snapshotAtual],
  );

  const rankingJogos = useMemo(
    () => rankingConcorrentesFromPosicoes(snapshotAtual),
    [snapshotAtual],
  );

  const cats = useMemo(
    () => visibilidadePorCategoriaDia(execDia, posByExec),
    [execDia, posByExec],
  );

  const alertas = useMemo(
    () => gerarAlertas(snapshotAtual, snapshotOntem, execDia, posByExec),
    [snapshotAtual, snapshotOntem, execDia, posByExec],
  );

  const semDados =
    skip || (!loading && (!ultimaNoDia || snapshotAtual.length === 0));

  return {
    loading: skip ? false : loading,
    loadingHistorico: skip ? false : loadingHistorico,
    semDados,
    execucoesAll,
    posByExec,
    execDia,
    ultimaNoDia,
    snapshotAtual,
    mesasOrdenadas,
    prevMap,
    prevDiferenteMap,
    visAtual,
    visOntem,
    top10Atual,
    top10Ontem,
    melhor,
    queda,
    concorrentesJogo,
    rankingJogos,
    cats,
    alertas,
  };
}
