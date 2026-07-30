import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchTurnosPorOperadoraSlugs } from "../../../lib/turnosDealers";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import {
  CALENDARIO_TIMES_FILTRO_ORDEM,
  normalizarNomeCalFiltro,
  normalizarSelecaoUnica,
  prestadorAtendeFiltroTime,
  timeRowPorRotuloCanonica,
  TREINAMENTO_FILTRO_ID,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
  type MesCarrosselEscalaEntry,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import {
  getPeriodoComparativoMoM,
  HISTORICO_COMPETENCIAS_MESES,
} from "../../../lib/dashboardHelpers";
import type { PresencaDiaGestao } from "../../../lib/rhCalendarioPresencaGestao";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  calcularMetricasPrestadorPeriodo,
  OVERVIEW_PRESTADOR_METRICAS_ZERO,
  type OverviewPrestadorMetricas,
} from "../../../lib/overviewPrestadorMetrics";
import {
  refMesPrimeiroDiaISO,
  type OpTurnosHorarioPick,
  type RpcGradeCalendarioRow,
  type RpcPontoMesRow,
} from "../../../lib/overviewPrestadorCalendarioHelpers";
import {
  fetchOverviewPrestadorGradeMes,
  fetchOverviewPrestadorMovimentacoesMes,
  fetchOverviewPrestadorPontoMes,
  fetchOverviewPrestadorPresencaMes,
} from "./overviewPrestadorQueries";
import type { OverviewPrestadorMovimentacaoCelula } from "../../../lib/overviewPrestadorMovimentacoes";

export type OverviewPrestadorTab = "escala" | "performance";

export function useOverviewPrestadorDados(
  permCanView: "sim" | "proprios" | "nao" | null,
  permLoading: boolean,
  userEmail: string | undefined,
) {
  const soProprios = !permLoading && permCanView === "proprios";
  const mesesDisponiveis = useMemo(() => getMesesDisponiveisEscalaCarrossel(), []);
  const idxInicial = useMemo(() => idxMesInicialEscalaCarrossel(mesesDisponiveis), [mesesDisponiveis]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [filtroTimeIds, setFiltroTimeIds] = useState<string[]>([]);
  const [filtroStaffIds, setFiltroStaffIds] = useState<string[]>([]);
  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [meuRhFuncionarioId, setMeuRhFuncionarioId] = useState<string | null>(null);
  const [treinamentoGerenciaId, setTreinamentoGerenciaId] = useState<string | null>(null);
  const [treinamentoTimeIdsList, setTreinamentoTimeIdsList] = useState<string[]>([]);
  const [rawGradeRows, setRawGradeRows] = useState<RpcGradeCalendarioRow[]>([]);
  const [pontoMesLinhas, setPontoMesLinhas] = useState<RpcPontoMesRow[]>([]);
  const [presencaGestaoPorChave, setPresencaGestaoPorChave] = useState<Map<string, PresencaDiaGestao>>(
    () => new Map(),
  );
  const [movimentacoesPorChave, setMovimentacoesPorChave] = useState<
    Map<string, OverviewPrestadorMovimentacaoCelula>
  >(() => new Map());
  const [mapOpTurnos, setMapOpTurnos] = useState<Map<string, OpTurnosHorarioPick>>(() => new Map());
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [loadingPonto, setLoadingPonto] = useState(false);
  const [loadingPresenca, setLoadingPresenca] = useState(false);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

  const mesSelecionado: MesCarrosselEscalaEntry | undefined = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes <= 0;
  const isUltimo = idxMes >= mesesDisponiveis.length - 1;

  const irMesAnterior = useCallback(() => {
    if (historico || isPrimeiro) return;
    setIdxMes((i) => Math.max(0, i - 1));
  }, [historico, isPrimeiro]);

  const irMesProximo = useCallback(() => {
    if (historico || isUltimo) return;
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }, [historico, isUltimo, mesesDisponiveis.length]);

  const toggleHistorico = useCallback(() => {
    setHistorico((h) => {
      if (h) setIdxMes(idxMesInicialEscalaCarrossel(mesesDisponiveis));
      return !h;
    });
  }, [mesesDisponiveis]);

  const carregarTimes = useCallback(async () => {
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setTimes([]);
      return;
    }
    setTimes((data ?? []) as StaffTimeRow[]);
  }, []);

  useEffect(() => {
    if (permLoading || permCanView === "nao") {
      setLoadingGrade(false);
      return;
    }
    if (soProprios) {
      setTimes([]);
      return;
    }
    setLoadingStaff(true);
    void carregarTimes().finally(() => setLoadingStaff(false));
  }, [permLoading, permCanView, soProprios, carregarTimes]);

  useEffect(() => {
    if (permLoading || permCanView !== "proprios") return;
    if (!userEmail?.trim()) {
      setPrestadores([]);
      setMeuRhFuncionarioId(null);
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    void (async () => {
      const row = await buscarRhFuncionarioAtivoPorEmailLogin(userEmail);
      if (cancelled) return;
      if (row) {
        setPrestadores([row]);
        setMeuRhFuncionarioId(row.id);
      } else {
        setPrestadores([]);
        setMeuRhFuncionarioId(null);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [permLoading, permCanView, userEmail]);

  useEffect(() => {
    if (permLoading || permCanView === "nao" || soProprios) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("rh_org_gerencias")
        .select("id, nome")
        .eq("status", "ativo")
        .ilike("nome", "%treinamento%");
      if (cancelled) return;
      if (error || !data?.length) {
        setTreinamentoGerenciaId(null);
        return;
      }
      const exato = data.find((r: { nome: string }) => normalizarNomeCalFiltro(r.nome) === "treinamento");
      setTreinamentoGerenciaId(exato?.id ?? data[0]!.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [permLoading, permCanView, soProprios]);

  useEffect(() => {
    if (permLoading || permCanView === "nao" || soProprios) return;
    let cancelled = false;
    void (async () => {
      const idsStaff = times.map((x) => x.id);
      const merged = new Map<string, RhFuncionario>();

      if (idsStaff.length > 0) {
        const { data, error } = await supabase
          .from("rh_funcionarios")
          .select("*")
          .in("org_time_id", idsStaff)
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (!cancelled && !error) (data ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      }

      if (treinamentoGerenciaId) {
        const { data: tt } = await supabase
          .from("rh_org_times")
          .select("id")
          .eq("gerencia_id", treinamentoGerenciaId)
          .eq("status", "ativo");
        const ttIdsLocal = (tt ?? []).map((r: { id: string }) => r.id);
        if (!cancelled) setTreinamentoTimeIdsList(ttIdsLocal);

        let q = supabase
          .from("rh_funcionarios")
          .select("*")
          .in("status", ["ativo", "indisponivel"])
          .order("nome", { ascending: true });
        if (ttIdsLocal.length > 0) {
          q = q.or(`org_gerencia_id.eq.${treinamentoGerenciaId},org_time_id.in.(${ttIdsLocal.join(",")})`);
        } else {
          q = q.eq("org_gerencia_id", treinamentoGerenciaId);
        }
        const { data: d2, error: e2 } = await q;
        if (!cancelled && !e2) (d2 ?? []).forEach((p: RhFuncionario) => merged.set(p.id, p));
      } else if (!cancelled) {
        setTreinamentoTimeIdsList([]);
      }

      if (!cancelled) {
        setPrestadores(
          [...merged.values()].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permLoading, permCanView, soProprios, times, treinamentoGerenciaId]);

  useEffect(() => {
    if (permCanView === "proprios" && meuRhFuncionarioId) {
      setFiltroStaffIds([meuRhFuncionarioId]);
    }
  }, [permCanView, meuRhFuncionarioId]);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const treinamentoTimeIds = useMemo(() => new Set(treinamentoTimeIdsList), [treinamentoTimeIdsList]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(filtroTimeIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [filtroTimeIds, timeIds]);

  const treinamentoSelecionado = filtroTimeIds.includes(TREINAMENTO_FILTRO_ID);
  const filtroTimeAtivo = filtroTimeIds.length > 0;

  const timeMultiselectItems = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    for (const rotulo of CALENDARIO_TIMES_FILTRO_ORDEM) {
      if (rotulo === "Treinamento") {
        if (treinamentoGerenciaId) items.push({ id: TREINAMENTO_FILTRO_ID, name: "Treinamento" });
        continue;
      }
      const row = timeRowPorRotuloCanonica(times, rotulo);
      if (row) items.push({ id: row.id, name: rotulo });
    }
    return items;
  }, [times, treinamentoGerenciaId]);

  const staffMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [
    prestadores,
    filtroTimeAtivo,
    filtroTimeIdsReais,
    treinamentoSelecionado,
    treinamentoGerenciaId,
    treinamentoTimeIds,
  ]);

  useEffect(() => {
    const allowedIds = new Set(staffMultiselectItems.map((x) => x.id));
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffMultiselectItems]);

  const prestadorPorId = useMemo(() => {
    const m = new Map<string, RhFuncionario>();
    prestadores.forEach((p) => m.set(p.id, p));
    return m;
  }, [prestadores]);

  const staffSelecionadoId = filtroStaffIds[0] ?? null;
  const mesesHistorico = useMemo(
    () => mesesDisponiveis.slice(-HISTORICO_COMPETENCIAS_MESES),
    [mesesDisponiveis],
  );

  const periodoComparativo = useMemo(() => {
    if (historico || !mesSelecionado) {
      const primeiro = mesesHistorico[0];
      const ultimo = mesesHistorico[mesesHistorico.length - 1];
      if (!primeiro || !ultimo) {
        return {
          atual: { inicio: "1970-01-01", fim: "1970-01-01" },
          anterior: { inicio: "1970-01-01", fim: "1970-01-01" },
        };
      }
      const inicio = refMesPrimeiroDiaISO(new Date(primeiro.ano, primeiro.mes, 1));
      const fimRef = new Date(ultimo.ano, ultimo.mes + 1, 0);
      const fim = `${fimRef.getFullYear()}-${String(fimRef.getMonth() + 1).padStart(2, "0")}-${String(fimRef.getDate()).padStart(2, "0")}`;
      return {
        atual: { inicio, fim },
        anterior: { inicio: "1970-01-01", fim: "1970-01-01" },
      };
    }
    return getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
  }, [historico, mesSelecionado, mesesHistorico]);

  const mesesMetricasAtual = useMemo(() => {
    if (historico) return mesesHistorico.map((m) => ({ ano: m.ano, mes: m.mes }));
    if (!mesSelecionado) return [];
    return [{ ano: mesSelecionado.ano, mes: mesSelecionado.mes }];
  }, [historico, mesesHistorico, mesSelecionado]);

  const mesesMetricasAnterior = useMemo(() => {
    if (historico || !mesSelecionado) return [];
    const [ano, mes] = periodoComparativo.anterior.inicio.split("-").map(Number);
    if (!ano || !mes) return [];
    return [{ ano, mes: mes - 1 }];
  }, [historico, mesSelecionado, periodoComparativo.anterior.inicio]);

  const mesesParaCarga = useMemo(() => {
    const unicos = new Map<string, { ano: number; mes: number }>();
    for (const ref of [...mesesMetricasAtual, ...mesesMetricasAnterior]) {
      unicos.set(`${ref.ano}-${ref.mes}`, ref);
    }
    return [...unicos.values()];
  }, [mesesMetricasAtual, mesesMetricasAnterior]);

  useEffect(() => {
    if (permLoading || permCanView === "nao") return;
    let cancelled = false;
    setLoadingGrade(true);
    void (async () => {
      try {
        const grupos = await Promise.all(
          mesesParaCarga.map(({ ano, mes }) =>
            fetchOverviewPrestadorGradeMes(refMesPrimeiroDiaISO(new Date(ano, mes, 1))).catch(() => []),
          ),
        );
        if (!cancelled) setRawGradeRows(grupos.flat());
      } finally {
        if (!cancelled) setLoadingGrade(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mesesParaCarga, permLoading, permCanView]);

  useEffect(() => {
    if (!staffSelecionadoId || mesesParaCarga.length === 0) {
      setPontoMesLinhas([]);
      setLoadingPonto(false);
      return;
    }
    let cancelled = false;
    setLoadingPonto(true);
    void (async () => {
      try {
        const grupos = await Promise.all(
          mesesParaCarga.map(({ ano, mes }) =>
            fetchOverviewPrestadorPontoMes(
              staffSelecionadoId,
              refMesPrimeiroDiaISO(new Date(ano, mes, 1)),
            ).catch(() => []),
          ),
        );
        if (!cancelled) setPontoMesLinhas(grupos.flat());
      } finally {
        if (!cancelled) setLoadingPonto(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffSelecionadoId, mesesParaCarga]);

  useEffect(() => {
    if (!staffSelecionadoId || mesesParaCarga.length === 0) {
      setPresencaGestaoPorChave(new Map());
      setLoadingPresenca(false);
      return;
    }
    let cancelled = false;
    setLoadingPresenca(true);
    void (async () => {
      try {
        const mapas = await Promise.all(
          mesesParaCarga.map(({ ano, mes }) =>
            fetchOverviewPrestadorPresencaMes(
              staffSelecionadoId,
              refMesPrimeiroDiaISO(new Date(ano, mes, 1)),
            ).catch(() => new Map<string, PresencaDiaGestao>()),
          ),
        );
        const next = new Map<string, PresencaDiaGestao>();
        mapas.forEach((mapa) => mapa.forEach((v, k) => next.set(k, v)));
        if (!cancelled) setPresencaGestaoPorChave(next);
      } finally {
        if (!cancelled) setLoadingPresenca(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffSelecionadoId, mesesParaCarga]);

  useEffect(() => {
    if (!staffSelecionadoId || mesesParaCarga.length === 0) {
      setMovimentacoesPorChave(new Map());
      setLoadingMovimentacoes(false);
      return;
    }
    let cancelled = false;
    setLoadingMovimentacoes(true);
    void (async () => {
      try {
        const mapas = await Promise.all(
          mesesParaCarga.map(({ ano, mes }) =>
            fetchOverviewPrestadorMovimentacoesMes(
              staffSelecionadoId,
              refMesPrimeiroDiaISO(new Date(ano, mes, 1)),
            ).catch(() => new Map<string, OverviewPrestadorMovimentacaoCelula>()),
          ),
        );
        const next = new Map<string, OverviewPrestadorMovimentacaoCelula>();
        mapas.forEach((mapa) => mapa.forEach((v, k) => next.set(k, v)));
        if (!cancelled) setMovimentacoesPorChave(next);
      } finally {
        if (!cancelled) setLoadingMovimentacoes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffSelecionadoId, mesesParaCarga]);

  useEffect(() => {
    const slugs = [...new Set(prestadores.map((p) => (p.staff_operadora_slug ?? "").trim()).filter(Boolean))];
    if (slugs.length === 0) {
      setMapOpTurnos(new Map());
      return;
    }
    let cancelled = false;
    void fetchTurnosPorOperadoraSlugs(slugs).then((turnosMap) => {
      if (cancelled) return;
      const m = new Map<string, OpTurnosHorarioPick>();
      for (const slug of slugs) {
        const turnos = turnosMap.get(slug);
        if (turnos) m.set(slug, turnos);
      }
      setMapOpTurnos(m);
    });
    return () => {
      cancelled = true;
    };
  }, [prestadores]);

  const metricasAtual: OverviewPrestadorMetricas = useMemo(() => {
    if (!staffSelecionadoId) return OVERVIEW_PRESTADOR_METRICAS_ZERO;
    const pRow = prestadorPorId.get(staffSelecionadoId);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
    return calcularMetricasPrestadorPeriodo({
      funcionarioId: staffSelecionadoId,
      prestador: pRow,
      opTurnos: opRow,
      gradeRows: rawGradeRows,
      pontoRows: pontoMesLinhas,
      presencaGestao: presencaGestaoPorChave,
      movimentacoes: movimentacoesPorChave,
      periodoInicio: periodoComparativo.atual.inicio,
      periodoFim: periodoComparativo.atual.fim,
      mesesRef: mesesMetricasAtual,
    });
  }, [
    staffSelecionadoId,
    prestadorPorId,
    mapOpTurnos,
    rawGradeRows,
    pontoMesLinhas,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.atual,
    mesesMetricasAtual,
  ]);

  const metricasAnterior: OverviewPrestadorMetricas = useMemo(() => {
    if (historico || !staffSelecionadoId) return OVERVIEW_PRESTADOR_METRICAS_ZERO;
    const pRow = prestadorPorId.get(staffSelecionadoId);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
    return calcularMetricasPrestadorPeriodo({
      funcionarioId: staffSelecionadoId,
      prestador: pRow,
      opTurnos: opRow,
      gradeRows: rawGradeRows,
      pontoRows: pontoMesLinhas,
      presencaGestao: presencaGestaoPorChave,
      movimentacoes: movimentacoesPorChave,
      periodoInicio: periodoComparativo.anterior.inicio,
      periodoFim: periodoComparativo.anterior.fim,
      mesesRef: mesesMetricasAnterior,
    });
  }, [
    historico,
    staffSelecionadoId,
    prestadorPorId,
    mapOpTurnos,
    rawGradeRows,
    pontoMesLinhas,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.anterior,
    mesesMetricasAnterior,
  ]);

  const setFiltroTimeIdsNormalizado = useCallback((ids: string[]) => {
    setFiltroTimeIds(normalizarSelecaoUnica(filtroTimeIds, ids));
  }, [filtroTimeIds]);

  const setFiltroStaffIdsNormalizado = useCallback((ids: string[]) => {
    setFiltroStaffIds(normalizarSelecaoUnica(filtroStaffIds, ids));
  }, [filtroStaffIds]);

  const isLoading = loadingStaff || loadingGrade || loadingPonto || loadingPresenca || loadingMovimentacoes;

  return {
    mesesDisponiveis,
    idxMes,
    mesSelecionado,
    historico,
    isPrimeiro,
    isUltimo,
    irMesAnterior,
    irMesProximo,
    toggleHistorico,
    soProprios,
    showTimeFilter: !soProprios && timeMultiselectItems.length > 0,
    showStaffFilter: !soProprios && staffMultiselectItems.length > 0,
    timeMultiselectItems,
    staffMultiselectItems,
    filtroTimeIds,
    setFiltroTimeIds: setFiltroTimeIdsNormalizado,
    filtroStaffIds,
    setFiltroStaffIds: setFiltroStaffIdsNormalizado,
    staffSelecionadoId,
    metricasAtual,
    metricasAnterior,
    isLoading,
  };
}
