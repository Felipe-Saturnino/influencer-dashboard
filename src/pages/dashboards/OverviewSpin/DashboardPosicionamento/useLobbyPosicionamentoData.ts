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
} from "../../../../lib/lobbyMonitorHelpers";

export const LOBBY_POS_SLUGS_CONSOLIDADOS = ["blaze", "casa_apostas"] as const;

export type LobbyPosSlugConsolidado = (typeof LOBBY_POS_SLUGS_CONSOLIDADOS)[number];

export function useLobbyPosicionamentoData(operadoraSlug: string, refDate: Date) {
  const [loading, setLoading] = useState(true);
  const [execucoesAll, setExecucoesAll] = useState<LobbyExecucaoRow[]>([]);
  const [posicoesAll, setPosicoesAll] = useState<LobbyPosicaoRow[]>([]);

  const dayKey = useMemo(() => {
    const y = refDate.getFullYear();
    const m = String(refDate.getMonth() + 1).padStart(2, "0");
    const d = String(refDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [refDate]);
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
      const rangeDia = periodoDiaBrasil(dayKey);
      const fetchStartKey = subDiasIso(dayKey, 35);
      const minKey = toDateKey(POS_MONITOR_DIA_MIN);
      const fetchInicioKey = fetchStartKey < minKey ? minKey : fetchStartKey;
      const fetchFrom = inicioDiaBrasilUtcIso(fetchInicioKey);

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
          nome_estudio: nomeEstudioPorMesaSpin.get(p.mesa_identificacao.trim()) ?? null,
          concorrentes_a_frente: Array.isArray(p.concorrentes_a_frente)
            ? p.concorrentes_a_frente
            : [],
        })),
      );
    } catch (err) {
      console.error("[useLobbyPosicionamentoData]", operadoraSlug, err);
      setExecucoesAll([]);
      setPosicoesAll([]);
    } finally {
      setLoading(false);
    }
  }, [operadoraSlug, dayKey, skip]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

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
