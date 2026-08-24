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
  ultimaExecucaoValida,
  execucaoMesmoHorarioDiaAnterior,
  execucaoAnteriorImediata,
  calcVisibilidadeLeituras,
  melhorPosicaoComCategoria,
  maiorQuedaEntreSnapshots,
  concorrentesPorJogoDetalhe,
  visibilidadePorCategoriaDia,
  gerarAlertas,
  gerarAlertasAlteracoesJanela,
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

type MetadadosMesaSpinMaps = {
  nomeEstudioPorMesa: Map<string, string>;
  canalPorMesa: Map<string, "dedicado" | "network">;
  nomeMesaPorId: Map<string, string>;
  tipoJogoPorId: Map<string, string>;
};

function mapsMetadadosMesasSpin(
  mesasCad: { mesa_identificacao?: unknown; nome_mesa?: unknown; tipo_jogo?: unknown; estudio_slug?: unknown }[],
  estudiosCad: { slug?: unknown; nome?: unknown; tipo?: unknown }[],
): MetadadosMesaSpinMaps {
  const nomeEstudioPorSlug = new Map<string, string>();
  const tipoPorEstudio = new Map<string, "dedicado" | "network">();
  for (const e of estudiosCad) {
    const slug = typeof e.slug === "string" ? e.slug.trim() : "";
    const nome = typeof e.nome === "string" ? e.nome.trim() : "";
    if (slug && nome) nomeEstudioPorSlug.set(slug, nome);
    if (slug && (e.tipo === "dedicado" || e.tipo === "network")) {
      tipoPorEstudio.set(slug, e.tipo);
    }
  }

  const nomeEstudioPorMesa = new Map<string, string>();
  const canalPorMesa = new Map<string, "dedicado" | "network">();
  const nomeMesaPorId = new Map<string, string>();
  const tipoJogoPorId = new Map<string, string>();

  for (const m of mesasCad) {
    const mid = typeof m.mesa_identificacao === "string" ? m.mesa_identificacao.trim() : "";
    if (!mid) continue;
    const nomeMesa = typeof m.nome_mesa === "string" ? m.nome_mesa.trim() : "";
    const tipoJogo = typeof m.tipo_jogo === "string" ? m.tipo_jogo.trim() : "";
    if (nomeMesa) nomeMesaPorId.set(mid, nomeMesa);
    if (tipoJogo) tipoJogoPorId.set(mid, tipoJogo);
    const estSlug = typeof m.estudio_slug === "string" ? m.estudio_slug.trim() : "";
    if (!estSlug) continue;
    const nomeEst = nomeEstudioPorSlug.get(estSlug);
    if (nomeEst) nomeEstudioPorMesa.set(mid, nomeEst);
    const canal = tipoPorEstudio.get(estSlug);
    if (canal) canalPorMesa.set(mid, canal);
  }

  return { nomeEstudioPorMesa, canalPorMesa, nomeMesaPorId, tipoJogoPorId };
}

const METADADOS_MESAS_SPIN_VAZIO: MetadadosMesaSpinMaps = {
  nomeEstudioPorMesa: new Map(),
  canalPorMesa: new Map(),
  nomeMesaPorId: new Map(),
  tipoJogoPorId: new Map(),
};

/** Catálogo opcional — falha não bloqueia posições históricas (fallback de rótulo usa mesa_identificacao). */
async function carregarMetadadosMesasSpinCatalogo(): Promise<MetadadosMesaSpinMaps> {
  try {
    const [mesasCad, estudiosCad] = await Promise.all([
      fetchAllPages(async (from, to) =>
        supabase
          .from("mesas_spin_cadastro")
          .select("mesa_identificacao, nome_mesa, tipo_jogo, estudio_slug")
          .range(from, to),
      ),
      fetchAllPages(async (from, to) =>
        supabase.from("estudios_spin").select("slug, nome, tipo").range(from, to),
      ),
    ]);
    return mapsMetadadosMesasSpin(mesasCad, estudiosCad);
  } catch (err) {
    console.error("[useLobbyPosicionamentoData:metadados]", err);
    return METADADOS_MESAS_SPIN_VAZIO;
  }
}

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
  const [erro, setErro] = useState<string | null>(null);
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
      setErro(null);
      setLoading(false);
      setLoadingHistorico(false);
      return;
    }
    setLoading(true);
    setErro(null);
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

      let execucoes = execRows as LobbyExecucaoRow[];
      if (execucoes.length === 0) {
        const { data: lastRows, error: lastErr } = await supabase
          .from("lobby_monitor_execucao")
          .select(
            "id, operadora_slug, executado_em, status, pior_mesa_nome, pior_mesa_identificacao, pior_mesa_posicao, jogos_a_frente_pior_mesa",
          )
          .eq("operadora_slug", operadoraSlug)
          .in("status", ["ok", "parcial"])
          .order("executado_em", { ascending: false })
          .limit(1);
        if (lastErr) throw lastErr;
        execucoes = (lastRows ?? []) as LobbyExecucaoRow[];
      }
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
          fetchAllPages(async (from, to) =>
            supabase
              .from("mesas_spin_cadastro")
              .select("mesa_identificacao, nome_mesa, tipo_jogo, estudio_slug")
              .range(from, to),
          ),
          fetchAllPages(async (from, to) =>
            supabase.from("estudios_spin").select("slug, nome, tipo").range(from, to),
          ),
        ]);

        const { nomeEstudioPorMesa, canalPorMesa } = mapsMetadadosMesasSpin(mesasCad, estudiosCad);
        const nomeEstudioPorMesaSpin = nomeEstudioPorMesa;
        const canalPorMesaSpin = canalPorMesa;

        setExecRecentes(
          execucoes.map((e) => ({
            ...e,
            jogos_a_frente_pior_mesa: Array.isArray(e.jogos_a_frente_pior_mesa)
              ? e.jogos_a_frente_pior_mesa
              : [],
          })),
        );
        setPosRecentes(
          (posRows as LobbyPosicaoRow[]).map((p) => {
            const mid = p.mesa_identificacao.trim();
            return {
              ...p,
              nome_estudio: nomeEstudioPorMesaSpin.get(mid) ?? null,
              canal_estudio: canalPorMesaSpin.get(mid) ?? null,
              concorrentes_a_frente: Array.isArray(p.concorrentes_a_frente)
                ? p.concorrentes_a_frente
                : [],
            };
          }),
        );
        temDadosRecentes = true;
      }
    } catch (err) {
      console.error("[useLobbyPosicionamentoData]", operadoraSlug, err);
      setExecRecentes([]);
      setPosRecentes([]);
      setErro(
        "Não foi possível carregar o posicionamento. Se o problema persistir, entre em contato com o suporte.",
      );
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

      const metaHist = await carregarMetadadosMesasSpinCatalogo();

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
        posHistRows.map((p) => {
          const mid = (p.mesa_identificacao as string).trim();
          return {
            execucao_id: p.execucao_id as string,
            mesa_identificacao: mid,
            nome_mesa: metaHist.nomeMesaPorId.get(mid) ?? mid,
            nome_estudio: metaHist.nomeEstudioPorMesa.get(mid) ?? null,
            canal_estudio: metaHist.canalPorMesa.get(mid) ?? null,
            tipo_jogo: metaHist.tipoJogoPorId.get(mid) ?? "",
            posicao: (p.posicao ?? null) as number | null,
            qtd_concorrentes_a_frente: 0,
            concorrentes_a_frente: [],
          };
        }),
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
  const snapshotExec = useMemo(
    () => ultimaNoDia ?? ultimaExecucaoValida(execucoesAll),
    [ultimaNoDia, execucoesAll],
  );
  const usaSnapshotFallback = Boolean(snapshotExec && !ultimaNoDia);
  const execComparacao = useMemo(() => {
    if (!snapshotExec) return null;
    if (ultimaNoDia) return execucaoMesmoHorarioDiaAnterior(ultimaNoDia, execucoesAll);
    return execucaoAnteriorImediata(snapshotExec, execucoesAll);
  }, [snapshotExec, ultimaNoDia, execucoesAll]);

  const snapshotAtual = useMemo(
    () => (snapshotExec ? (posByExec.get(snapshotExec.id) ?? []) : []),
    [snapshotExec, posByExec],
  );
  const snapshotOntem = useMemo(
    () => (execComparacao ? (posByExec.get(execComparacao.id) ?? []) : []),
    [execComparacao, posByExec],
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
          snapshotExec?.id,
          execucoesAll,
          posByExec,
          desdeKey,
        ),
      );
    }
    return map;
  }, [snapshotAtual, snapshotExec?.id, execucoesAll, posByExec, dayKey]);

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

  /** Todas as mudanças de posição nos últimos 7 dias civis (vista consolidada). */
  const alertasAlteracoes7d = useMemo(() => {
    const desdeKey = subDiasIso(dayKey, POS_COMPARACAO_DIFERENTE_DIAS);
    return gerarAlertasAlteracoesJanela(execucoesAll, posByExec, desdeKey, dayKey);
  }, [execucoesAll, posByExec, dayKey]);

  const semDados =
    skip || (!loading && !erro && (!snapshotExec || snapshotAtual.length === 0));

  return {
    loading: skip ? false : loading,
    loadingHistorico: skip ? false : loadingHistorico,
    erro: skip ? null : erro,
    recarregar: carregar,
    semDados,
    execucoesAll,
    posByExec,
    execDia,
    ultimaNoDia,
    snapshotExec,
    usaSnapshotFallback,
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
    alertasAlteracoes7d,
  };
}
