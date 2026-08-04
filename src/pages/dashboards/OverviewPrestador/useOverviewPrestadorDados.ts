import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { fetchTurnosPorOperadoraSlugs } from "../../../lib/turnosDealers";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import {
  normalizarSelecaoUnica,
  prestadorAtendeFiltroTime,
  timeRowPorRotuloCanonica,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import {
  getMesesDisponiveisEscalaCarrossel,
  idxMesInicialEscalaCarrossel,
  type MesCarrosselEscalaEntry,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import {
  getPeriodoComparativoMesCompleto,
  HISTORICO_COMPETENCIAS_MESES,
} from "../../../lib/dashboardHelpers";
import type { PresencaDiaGestao } from "../../../lib/rhCalendarioPresencaGestao";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  calcularMetricasPrestadorPeriodo,
  montarLinhaAtencao,
  OVERVIEW_PRESTADOR_METRICAS_ZERO,
  somarMetricasPrestador,
  type OverviewPrestadorAtencaoLinha,
  type OverviewPrestadorCoberturaLinha,
  type OverviewPrestadorEstudioFatia,
  type OverviewPrestadorMetricas,
} from "../../../lib/overviewPrestadorMetrics";
import {
  calcularCoberturaPrestadorPeriodo,
  calcularDistribuicaoEstudioIndividual,
} from "../../../lib/overviewPrestadorCobertura";
import {
  areaKeyGradeDoTime,
  areaKeyGradeDoTimeId,
  capsOverviewPrestadorTime,
  OVERVIEW_PRESTADOR_TIME_DEFAULT,
  OVERVIEW_PRESTADOR_TIMES_ORDEM,
  rotuloTimeFromNomeOrganograma,
  type OverviewPrestadorTimeRotulo,
} from "../../../lib/overviewPrestadorTeamConfig";
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

export type OverviewPrestadorTab = "escala" | "kpis_mesa";

const CONCURRENCY_STAFF = 4;

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

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
  const [rawGradeRows, setRawGradeRows] = useState<RpcGradeCalendarioRow[]>([]);
  const [pontoPorChave, setPontoPorChave] = useState<Map<string, RpcPontoMesRow>>(() => new Map());
  const [presencaGestaoPorChave, setPresencaGestaoPorChave] = useState<Map<string, PresencaDiaGestao>>(
    () => new Map(),
  );
  const [movimentacoesPorChave, setMovimentacoesPorChave] = useState<
    Map<string, OverviewPrestadorMovimentacaoCelula>
  >(() => new Map());
  const [mapOpTurnos, setMapOpTurnos] = useState<Map<string, OpTurnosHorarioPick>>(() => new Map());
  const [estudiosNome, setEstudiosNome] = useState<Record<string, string>>({});
  const [opParaEstudio, setOpParaEstudio] = useState<Record<string, string>>({});
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [loadingStaffDados, setLoadingStaffDados] = useState(false);

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
      setTimes([]);
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
        const timeId = (row.org_time_id ?? "").trim();
        if (timeId) {
          const { data: trow } = await supabase
            .from("rh_org_times")
            .select("id, nome, gerencia_id")
            .eq("id", timeId)
            .maybeSingle();
          if (!cancelled && trow) {
            setTimes([
              {
                id: String((trow as { id: string }).id),
                nome: String((trow as { nome: string }).nome ?? ""),
                gerencia_id: String((trow as { gerencia_id: string }).gerencia_id ?? ""),
                gerencia_nome: "",
              },
            ]);
          } else if (!cancelled) setTimes([]);
        } else if (!cancelled) setTimes([]);
      } else {
        setPrestadores([]);
        setMeuRhFuncionarioId(null);
        setTimes([]);
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
      const idsStaff = times.map((x) => x.id);
      if (idsStaff.length === 0) {
        if (!cancelled) setPrestadores([]);
        return;
      }
      const { data, error } = await supabase
        .from("rh_funcionarios")
        .select("*")
        .in("org_time_id", idsStaff)
        .in("status", ["ativo", "indisponivel"])
        .order("nome", { ascending: true });
      if (cancelled) return;
      if (error) {
        setPrestadores([]);
        return;
      }
      setPrestadores(
        [...(data ?? [])].sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")) as RhFuncionario[],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [permLoading, permCanView, soProprios, times]);

  useEffect(() => {
    if (permCanView === "proprios" && meuRhFuncionarioId) {
      setFiltroStaffIds([meuRhFuncionarioId]);
    }
  }, [permCanView, meuRhFuncionarioId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: estudios }, { data: junction }] = await Promise.all([
        supabase.from("estudios_spin").select("slug, nome").eq("ativo", true).order("nome"),
        supabase.from("estudios_spin_operadoras").select("operadora_slug, estudio_slug, tipo"),
      ]);
      if (cancelled) return;
      const nomes: Record<string, string> = {};
      for (const e of estudios ?? []) {
        const slug = String((e as { slug: string }).slug ?? "").trim();
        if (slug) nomes[slug] = String((e as { nome: string }).nome ?? slug);
      }
      setEstudiosNome(nomes);

      const opMap: Record<string, string> = {};
      const sorted = [...(junction ?? [])].sort((a, b) => {
        const pa = (a as { tipo: string }).tipo === "dedicado" ? 0 : 1;
        const pb = (b as { tipo: string }).tipo === "dedicado" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return String((a as { estudio_slug: string }).estudio_slug).localeCompare(
          String((b as { estudio_slug: string }).estudio_slug),
          "pt-BR",
        );
      });
      for (const row of sorted) {
        const op = String((row as { operadora_slug: string }).operadora_slug ?? "").trim();
        const est = String((row as { estudio_slug: string }).estudio_slug ?? "").trim();
        if (op && est && !opMap[op]) opMap[op] = est;
      }
      setOpParaEstudio(opMap);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timeMultiselectItems = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    for (const rotulo of OVERVIEW_PRESTADOR_TIMES_ORDEM) {
      const row = timeRowPorRotuloCanonica(times, rotulo);
      if (row) items.push({ id: row.id, name: rotulo });
    }
    return items;
  }, [times]);

  /** Default Time = Game Presenter (sem agregador «Todos»). */
  useEffect(() => {
    if (soProprios || timeMultiselectItems.length === 0) return;
    const gp = timeMultiselectItems.find((x) => x.name === OVERVIEW_PRESTADOR_TIME_DEFAULT);
    const fallback = gp?.id ?? timeMultiselectItems[0]!.id;
    setFiltroTimeIds((prev) => {
      if (prev.length === 1 && timeMultiselectItems.some((x) => x.id === prev[0])) return prev;
      return [fallback];
    });
  }, [soProprios, timeMultiselectItems]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeMultiselectItems.map((x) => x.id));
    return new Set(filtroTimeIds.filter((id) => allowed.has(id)));
  }, [filtroTimeIds, timeMultiselectItems]);

  const filtroTimeAtivo = filtroTimeIdsReais.size > 0;

  const timeRotuloSelecionado: OverviewPrestadorTimeRotulo | null = useMemo(() => {
    if (soProprios) {
      const p = prestadores[0];
      const time = times.find((t) => t.id === p?.org_time_id);
      return rotuloTimeFromNomeOrganograma(time?.nome ?? null);
    }
    const id = [...filtroTimeIdsReais][0];
    if (!id) return null;
    const item = timeMultiselectItems.find((x) => x.id === id);
    return item && OVERVIEW_PRESTADOR_TIMES_ORDEM.includes(item.name as OverviewPrestadorTimeRotulo)
      ? (item.name as OverviewPrestadorTimeRotulo)
      : null;
  }, [soProprios, prestadores, times, filtroTimeIdsReais, timeMultiselectItems]);

  /** Para próprios sem time no catálogo: inferir pelo nome via org se já carregado. */
  const timeRotuloEfetivo = timeRotuloSelecionado ?? (soProprios ? "Game Presenter" : OVERVIEW_PRESTADOR_TIME_DEFAULT);
  const caps = useMemo(() => capsOverviewPrestadorTime(timeRotuloEfetivo), [timeRotuloEfetivo]);

  const timeIdEscopo = useMemo(() => {
    if (soProprios) return (prestadores[0]?.org_time_id ?? "").trim() || null;
    return [...filtroTimeIdsReais][0] ?? null;
  }, [soProprios, prestadores, filtroTimeIdsReais]);

  /**
   * Só as células da Escala Estúdio do time selecionado — sem isto, linhas de outras
   * áreas (Academy/treinamento, escritório, outros times) entram nas jornadas e na
   * contagem de prestadores por turno.
   */
  const gradeRows = useMemo(() => {
    const permitidas = new Set(
      [areaKeyGradeDoTime(timeRotuloEfetivo), areaKeyGradeDoTimeId(timeIdEscopo)].filter(
        (x): x is string => Boolean(x),
      ),
    );
    if (permitidas.size === 0) return rawGradeRows;
    const filtradas = rawGradeRows.filter((r) => permitidas.has((r.area_key ?? "").trim().toLowerCase()));
    return filtradas.length > 0 ? filtradas : rawGradeRows;
  }, [rawGradeRows, timeRotuloEfetivo, timeIdEscopo]);

  const staffMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
      treinamentoSelecionado: false,
      treinamentoGerenciaId: null as string | null,
      treinamentoTimeIds: new Set<string>(),
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais]);

  useEffect(() => {
    if (soProprios) return;
    const allowedIds = new Set(staffMultiselectItems.map((x) => x.id));
    setFiltroStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffMultiselectItems, soProprios]);

  const prestadorPorId = useMemo(() => {
    const m = new Map<string, RhFuncionario>();
    prestadores.forEach((p) => m.set(p.id, p));
    return m;
  }, [prestadores]);

  const staffSelecionadoId = filtroStaffIds[0] ?? null;
  const visaoTime = !soProprios && !staffSelecionadoId;

  const idsEscopo = useMemo(() => {
    if (staffSelecionadoId) return [staffSelecionadoId];
    if (visaoTime) return staffMultiselectItems.map((x) => x.id);
    return [];
  }, [staffSelecionadoId, visaoTime, staffMultiselectItems]);

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
    return getPeriodoComparativoMesCompleto(mesSelecionado.ano, mesSelecionado.mes);
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
    if (idsEscopo.length === 0 || mesesParaCarga.length === 0) {
      setPontoPorChave(new Map());
      setPresencaGestaoPorChave(new Map());
      setMovimentacoesPorChave(new Map());
      setLoadingStaffDados(false);
      return;
    }
    let cancelled = false;
    setLoadingStaffDados(true);
    void (async () => {
      try {
        const jobs = idsEscopo.flatMap((fid) =>
          mesesParaCarga.map((ref) => ({ fid, ref })),
        );
        const resultados = await mapPool(jobs, CONCURRENCY_STAFF, async ({ fid, ref }) => {
          const refMes = refMesPrimeiroDiaISO(new Date(ref.ano, ref.mes, 1));
          const [ponto, presenca, mov] = await Promise.all([
            fetchOverviewPrestadorPontoMes(fid, refMes).catch(() => [] as RpcPontoMesRow[]),
            fetchOverviewPrestadorPresencaMes(fid, refMes).catch(
              () => new Map<string, PresencaDiaGestao>(),
            ),
            caps.negocia
              ? fetchOverviewPrestadorMovimentacoesMes(fid, refMes).catch(
                  () => new Map<string, OverviewPrestadorMovimentacaoCelula>(),
                )
              : Promise.resolve(new Map<string, OverviewPrestadorMovimentacaoCelula>()),
          ]);
          return { fid, ponto, presenca, mov };
        });
        if (cancelled) return;
        const nextPonto = new Map<string, RpcPontoMesRow>();
        const nextPresenca = new Map<string, PresencaDiaGestao>();
        const nextMov = new Map<string, OverviewPrestadorMovimentacaoCelula>();
        for (const r of resultados) {
          for (const pt of r.ponto) {
            const iso = (pt.dia_sp ?? "").slice(0, 10);
            if (iso) nextPonto.set(`${r.fid}|${iso}`, pt);
          }
          r.presenca.forEach((v, k) => nextPresenca.set(k, v));
          r.mov.forEach((v, k) => nextMov.set(k, v));
        }
        setPontoPorChave(nextPonto);
        setPresencaGestaoPorChave(nextPresenca);
        setMovimentacoesPorChave(nextMov);
      } finally {
        if (!cancelled) setLoadingStaffDados(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsEscopo, mesesParaCarga, caps.negocia]);

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

  const pontoRowsPorFuncionario = useCallback(
    (fid: string): RpcPontoMesRow[] => {
      const rows: RpcPontoMesRow[] = [];
      pontoPorChave.forEach((v, k) => {
        if (k.startsWith(`${fid}|`)) rows.push(v);
      });
      return rows;
    },
    [pontoPorChave],
  );

  const metricasPorStaff = useMemo(() => {
    const map = new Map<string, OverviewPrestadorMetricas>();
    for (const fid of idsEscopo) {
      const pRow = prestadorPorId.get(fid);
      const slug = (pRow?.staff_operadora_slug ?? "").trim();
      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
      map.set(
        fid,
        calcularMetricasPrestadorPeriodo({
          funcionarioId: fid,
          prestador: pRow,
          opTurnos: opRow,
          gradeRows,
          pontoRows: pontoRowsPorFuncionario(fid),
          presencaGestao: presencaGestaoPorChave,
          movimentacoes: movimentacoesPorChave,
          periodoInicio: periodoComparativo.atual.inicio,
          periodoFim: periodoComparativo.atual.fim,
          mesesRef: mesesMetricasAtual,
        }),
      );
    }
    return map;
  }, [
    idsEscopo,
    prestadorPorId,
    mapOpTurnos,
    gradeRows,
    pontoRowsPorFuncionario,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.atual,
    mesesMetricasAtual,
  ]);

  const metricasAtual: OverviewPrestadorMetricas = useMemo(() => {
    if (idsEscopo.length === 0) return OVERVIEW_PRESTADOR_METRICAS_ZERO;
    const partes = idsEscopo.map((id) => {
      const base = metricasPorStaff.get(id) ?? OVERVIEW_PRESTADOR_METRICAS_ZERO;
      if (!visaoTime) return base;
      const p = prestadorPorId.get(id);
      return {
        ...base,
        detalhamento: base.detalhamento.map((d) => ({
          ...d,
          prestadorId: id,
          prestadorNome: (p?.nome ?? "").trim() || "—",
          timeRotulo: timeRotuloEfetivo,
        })),
      };
    });
    return somarMetricasPrestador(partes);
  }, [idsEscopo, metricasPorStaff, visaoTime, prestadorPorId, timeRotuloEfetivo]);

  const metricasAnterior: OverviewPrestadorMetricas = useMemo(() => {
    if (historico || idsEscopo.length === 0) return OVERVIEW_PRESTADOR_METRICAS_ZERO;
    const partes = idsEscopo.map((fid) => {
      const pRow = prestadorPorId.get(fid);
      const slug = (pRow?.staff_operadora_slug ?? "").trim();
      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
      return calcularMetricasPrestadorPeriodo({
        funcionarioId: fid,
        prestador: pRow,
        opTurnos: opRow,
        gradeRows,
        pontoRows: pontoRowsPorFuncionario(fid),
        presencaGestao: presencaGestaoPorChave,
        movimentacoes: movimentacoesPorChave,
        periodoInicio: periodoComparativo.anterior.inicio,
        periodoFim: periodoComparativo.anterior.fim,
        mesesRef: mesesMetricasAnterior,
      });
    });
    return somarMetricasPrestador(partes);
  }, [
    historico,
    idsEscopo,
    prestadorPorId,
    mapOpTurnos,
    gradeRows,
    pontoRowsPorFuncionario,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.anterior,
    mesesMetricasAnterior,
  ]);

  const pontosAtencao: OverviewPrestadorAtencaoLinha[] = useMemo(() => {
    if (!visaoTime) return [];
    return idsEscopo
      .map((id) => {
        const m = metricasPorStaff.get(id) ?? OVERVIEW_PRESTADOR_METRICAS_ZERO;
        const p = prestadorPorId.get(id);
        return montarLinhaAtencao(id, (p?.nome ?? "").trim() || "—", timeRotuloEfetivo, m);
      })
      .filter((r) => r.severidade !== "ok" || r.atrasos > 0 || r.pontoIncompleto > 0 || r.atestadoDias > 0)
      .sort((a, b) => {
        const rank = { alta: 0, media: 1, ok: 2 };
        if (rank[a.severidade] !== rank[b.severidade]) return rank[a.severidade] - rank[b.severidade];
        return (a.presencaPct ?? 100) - (b.presencaPct ?? 100);
      })
      .slice(0, 12);
  }, [visaoTime, idsEscopo, metricasPorStaff, prestadorPorId, timeRotuloEfetivo]);

  const cobertura = useMemo(() => {
    if (!visaoTime || idsEscopo.length === 0) {
      return { porTurno: [] as OverviewPrestadorCoberturaLinha[], porEstudio: [] as OverviewPrestadorCoberturaLinha[] };
    }
    const opTurnosPorFuncionario = new Map<string, OpTurnosHorarioPick | null>();
    for (const fid of idsEscopo) {
      const p = prestadorPorId.get(fid);
      const slug = (p?.staff_operadora_slug ?? "").trim();
      opTurnosPorFuncionario.set(fid, slug ? mapOpTurnos.get(slug) ?? null : null);
    }
    return calcularCoberturaPrestadorPeriodo({
      funcionarioIds: idsEscopo,
      prestadorPorId,
      opTurnosPorFuncionario,
      gradeRows,
      pontoPorChave,
      presencaGestao: presencaGestaoPorChave,
      movimentacoes: movimentacoesPorChave,
      periodoInicio: periodoComparativo.atual.inicio,
      periodoFim: periodoComparativo.atual.fim,
      mesesRef: mesesMetricasAtual,
      caps,
      opParaEstudio,
      estudiosNome,
    });
  }, [
    visaoTime,
    idsEscopo,
    prestadorPorId,
    mapOpTurnos,
    gradeRows,
    pontoPorChave,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.atual,
    mesesMetricasAtual,
    caps,
    opParaEstudio,
    estudiosNome,
  ]);

  const distribuicaoEstudio: OverviewPrestadorEstudioFatia[] = useMemo(() => {
    if (visaoTime || !staffSelecionadoId || !caps.distribuicaoEstudioIndividual) return [];
    const pRow = prestadorPorId.get(staffSelecionadoId);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    return calcularDistribuicaoEstudioIndividual({
      funcionarioId: staffSelecionadoId,
      prestador: pRow,
      opTurnos: slug ? mapOpTurnos.get(slug) ?? null : null,
      gradeRows,
      pontoRows: pontoRowsPorFuncionario(staffSelecionadoId),
      presencaGestao: presencaGestaoPorChave,
      movimentacoes: movimentacoesPorChave,
      periodoInicio: periodoComparativo.atual.inicio,
      periodoFim: periodoComparativo.atual.fim,
      mesesRef: mesesMetricasAtual,
      opParaEstudio,
      estudiosNome,
    });
  }, [
    visaoTime,
    staffSelecionadoId,
    caps.distribuicaoEstudioIndividual,
    prestadorPorId,
    mapOpTurnos,
    gradeRows,
    pontoRowsPorFuncionario,
    presencaGestaoPorChave,
    movimentacoesPorChave,
    periodoComparativo.atual,
    mesesMetricasAtual,
    opParaEstudio,
    estudiosNome,
  ]);

  const setFiltroTimeIdsNormalizado = useCallback(
    (ids: string[]) => {
      const next = normalizarSelecaoUnica(filtroTimeIds, ids);
      if (next.length === 0) {
        const gp = timeMultiselectItems.find((x) => x.name === OVERVIEW_PRESTADOR_TIME_DEFAULT);
        const keep = filtroTimeIds[0] ?? gp?.id ?? timeMultiselectItems[0]?.id;
        if (keep) setFiltroTimeIds([keep]);
        return;
      }
      setFiltroTimeIds(next);
      setFiltroStaffIds([]);
    },
    [filtroTimeIds, timeMultiselectItems],
  );

  const setFiltroStaffIdsNormalizado = useCallback((ids: string[]) => {
    setFiltroStaffIds(normalizarSelecaoUnica(filtroStaffIds, ids));
  }, [filtroStaffIds]);

  const isLoading = loadingStaff || loadingGrade || loadingStaffDados;
  const prontoParaExibir = soProprios ? Boolean(staffSelecionadoId) : filtroTimeAtivo;

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
    visaoTime,
    timeRotulo: timeRotuloEfetivo,
    caps,
    metricasAtual,
    metricasAnterior,
    pontosAtencao,
    coberturaPorTurno: cobertura.porTurno,
    coberturaPorEstudio: cobertura.porEstudio,
    distribuicaoEstudio,
    prontoParaExibir,
    isLoading,
  };
}
