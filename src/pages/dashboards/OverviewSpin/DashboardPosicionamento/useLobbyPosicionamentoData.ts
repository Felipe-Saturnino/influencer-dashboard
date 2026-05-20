import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import {
  type LobbyExecucaoRow,
  type LobbyPosicaoRow,
  periodoRange,
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
  addDays,
  POS_MONITOR_DIA_MIN,
} from "../../../../lib/lobbyMonitorHelpers";

export const LOBBY_POS_SLUGS_CONSOLIDADOS = ["blaze", "casa_apostas"] as const;

export type LobbyPosSlugConsolidado = (typeof LOBBY_POS_SLUGS_CONSOLIDADOS)[number];

export function useLobbyPosicionamentoData(operadoraSlug: string, refDate: Date) {
  const [loading, setLoading] = useState(true);
  const [execucoesAll, setExecucoesAll] = useState<LobbyExecucaoRow[]>([]);
  const [posicoesAll, setPosicoesAll] = useState<LobbyPosicaoRow[]>([]);

  const dayKey = useMemo(() => toDateKey(refDate), [refDate]);
  const skip = !operadoraSlug || operadoraSlug === "todas";

  const carregar = useCallback(async () => {
    if (skip) {
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
  }, [operadoraSlug, refDate, skip]);

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

  const concorrentesJogo = useMemo(
    () => concorrentesPorJogoDetalhe(snapshotAtual),
    [snapshotAtual],
  );

  const rankingJogos = useMemo(() => {
    const raw = ultimaNoDia?.jogos_a_frente_pior_mesa ?? [];
    return [...raw].sort((a, b) => a.posicao - b.posicao);
  }, [ultimaNoDia]);

  const cats = useMemo(
    () => visibilidadePorCategoriaDia(execDia, posByExec),
    [execDia, posByExec],
  );

  const alertas = useMemo(
    () => gerarAlertas(snapshotAtual, snapshotOntem, execDia, posByExec),
    [snapshotAtual, snapshotOntem, execDia, posByExec],
  );

  const semDados = skip || (!loading && execDia.length === 0);

  return {
    loading: skip ? false : loading,
    semDados,
    execucoesAll,
    posByExec,
    execDia,
    ultimaNoDia,
    snapshotAtual,
    mesasOrdenadas,
    prevMap,
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
