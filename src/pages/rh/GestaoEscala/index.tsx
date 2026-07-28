import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { supabase } from "../../../lib/supabase";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { getFiltroBarPillStateStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle, getPageFilterBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableWrapStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getThStyle, getTdStyle } from "../../../lib/tableStyles";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { TabelaPaginacaoBar } from "../../../components/TabelaPaginacaoBar";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { clampPageIndex, slicePage, TABELA_PAGE_SIZE_ESCALA } from "../../../lib/tablePagination";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { FiltroEstudioSelect } from "../../../components/FiltroEstudioSelect";
import {
  buildOperadoraParaEstudioMap,
  FILTRO_STAFF_ESTUDIO_NENHUM,
  FILTRO_STAFF_ESTUDIO_TODOS,
} from "../GestaoStaff/gestaoStaffEstudioHelpers";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import { SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { gerarCelulasSugestaoCustomerService } from "../../../lib/gestaoEscalaSugestaoCustomerService";
import {
  labelExibicaoCelulaAlterarEscala,
  opcoesSelectCelulaAlterarEscala,
  sanitizarValorCelulaAlterarEscala,
  type EscalaTurnoMesMap,
} from "../../../lib/gestaoEscalaTurnoMes";
import { ModalAlterarEscala } from "./ModalAlterarEscala";
import { ModalHistoricoEscala } from "./ModalHistoricoEscala";
import {
  CelulaIndicadorAlteracaoEscala,
  type EscalaAlteracaoCelulaMeta,
} from "./CelulaIndicadorAlteracaoEscala";
import {
  CONSOLIDADO_COL_TURNO_W,
  CONSOLIDADO_FONT_DIA_HEADER,
  CONSOLIDADO_FONT_HEADER,
  CONSOLIDADO_FONT_TURNO,
  DEFAULT_AREA_ESCALA,
  ESCALA_ANO_MIN,
  ESCALA_MES0_MIN,
  ESCALA_TOOLBAR_AZUL,
  ESCALA_TOOLBAR_VERDE,
  STICKY_W_NICK,
  STICKY_W_NOME,
  STICKY_W_TURNO_STAFF,
  Z_CONSOLIDADO_STICKY_HEAD,
  Z_CONSOLIDADO_STICKY_ROW,
  buildAbasEscalaFromTimes,
  buildCelulasSnapshotGrade,
  carregarEscalaMesGravada,
  celulasIguais,
  chaveCelulaGerar,
  contarCelulasComSigla,
  contarCelulasComSiglaPorEstudio,
  dataMaximaEscalaCarrossel,
  dataMinimaEscalaCarrossel,
  diaComDestaqueCalendario,
  diasDoMes,
  escalaGradeAprovadaNaBase,
  escalaToolbarBtnAzul,
  escalaToolbarBtnNeutro,
  escalaToolbarBtnVerde,
  escalaToolbarBtnVermelho,
  filtrarPorArea,
  filtrarPrestadoresPorEstudio,
  filtroEstudioValueFromConsolidadoKey,
  consolidadoKeyFromFiltroEstudio,
  CONSOLIDADO_ESTUDIO_KEY_TODOS,
  gravarEscalaMes,
  labelAreaEscala,
  labelExibicaoCelulaEscala,
  labelMesAno,
  linhaColaboradorNoFiltroTurnoConsolidado,
  linhaComTurnoMesArea,
  mapAlteracoesUltimasPorCelula,
  mapaCelulasFromGradeCarregarPayload,
  mapLinhaPrestador,
  mapTurnoMesRowsParaEstado,
  mesclarCelulasEscritorioComPadrao,
  mesReferenciaInicial,
  opcoesSelectCelulaGerar,
  posSugestaoAtiva,
  primeiroDiaMes,
  refMesISO,
  registrarHistoricoEscalaAcao,
  sanitizarValorCelulaGerar,
  type AbaEscalaTime,
  type AreaEscalaKey,
  type ConsolidadoEstudioLinha,
  type DiaMes,
  type EscalaDiariaSortCol,
  type EscalaGerarEstadoFiltro,
  type EscalaGradeModo,
  type FiltroTurnoConsolidadoRh,
  type GradeStatusMetaDb,
  type RpcAlteracaoUltimaRow,
  type RpcGradeAprovarResult,
  type RpcGradeMetaRow,
  type RpcGradeResetarResult,
  type RpcGradeSalvarResult,
  type RpcPrestadorEscala,
  type RpcTurnoMesListarRow,
} from "./gestaoEscalaHelpers";

export type GestaoEscalaPageProps = {
  modo?: EscalaGradeModo;
};

export default function RhGestaoEscalaPage({ modo = "estudio" }: GestaoEscalaPageProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const pageKey = modo === "escritorio" ? "escala_escritorio" : "rh_gestao_escala";
  const perm = usePermission(pageKey);

  const hoje = useMemo(() => new Date(), []);
  const inicial = useMemo(() => mesReferenciaInicial(), []);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);

  const [prestadoresRaw, setPrestadoresRaw] = useState<RpcPrestadorEscala[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(true);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);
  /** Abas de time (Organograma) conforme área de atuação / modo. */
  const [abasTimes, setAbasTimes] = useState<AbaEscalaTime[]>([]);
  /** Estúdios ativos para o select ao lado do período. */
  const [estudiosAtivosEscala, setEstudiosAtivosEscala] = useState<{ slug: string; nome: string }[]>([]);
  const [opParaEstudio, setOpParaEstudio] = useState<Record<string, string>>({});
  /** `todos` | `nenhum` | slug do estúdio. */
  const [filtroEstudioEscala, setFiltroEstudioEscala] = useState<string>(FILTRO_STAFF_ESTUDIO_TODOS);
  const [erroSalvarGrade, setErroSalvarGrade] = useState<string | null>(null);
  const [salvandoGrade, setSalvandoGrade] = useState(false);
  const [novaEscalaModalArea, setNovaEscalaModalArea] = useState<AreaEscalaKey | null>(null);
  const [alterarEscalaModalAberto, setAlterarEscalaModalAberto] = useState(false);
  const [historicoModalAberto, setHistoricoModalAberto] = useState(false);
  const [resetandoGrade, setResetandoGrade] = useState(false);
  /** Área (time) para consolidado e grade de geração. */
  const [filtroArea, setFiltroArea] = useState<AreaEscalaKey>(DEFAULT_AREA_ESCALA);
  /** Filtro local da tabela Escala Diária (nickname). */
  const [filtroNicknameEscala, setFiltroNicknameEscala] = useState("");
  /** Filtro da Escala Diária por turno (clique no Consolidado). */
  const [filtroTurnoConsolidado, setFiltroTurnoConsolidado] = useState<FiltroTurnoConsolidadoRh | null>(null);
  /** Drilldown por estúdio no Consolidado (Game Presenter + Todos Estúdios). */
  const [consolidadoTurnoExpandido, setConsolidadoTurnoExpandido] = useState<
    Partial<Record<"manha" | "tarde" | "noite", boolean>>
  >({});
  const [sortEscalaDiaria, setSortEscalaDiaria] = useState<{ col: EscalaDiariaSortCol; dir: SortDir }>({
    col: modo === "escritorio" ? "nome" : "turno",
    dir: "asc",
  });
  /** Página da grade Escala Diária (só a vista — save/sugestão usam todas as linhas). */
  const [paginaEscalaDiaria, setPaginaEscalaDiaria] = useState(0);
  /** Por área: células do mês e baseline após aprovação. */
  const [gerarPorFiltro, setGerarPorFiltro] = useState<Record<string, EscalaGerarEstadoFiltro>>({});
  /** Turno/horário congelados na aprovação (`rh_gestao_escala_turno_mes`). */
  const [turnoMesMap, setTurnoMesMap] = useState<EscalaTurnoMesMap>({});

  useEffect(() => {
    setFiltroNicknameEscala("");
    setFiltroTurnoConsolidado(null);
    setConsolidadoTurnoExpandido({});
    setSortEscalaDiaria({ col: modo === "escritorio" ? "nome" : "turno", dir: "asc" });
    setPaginaEscalaDiaria(0);
  }, [filtroArea, modo]);

  useEffect(() => {
    setFiltroTurnoConsolidado(null);
    setConsolidadoTurnoExpandido({});
    setPaginaEscalaDiaria(0);
  }, [ano, mes]);

  const carregarPrestadores = useCallback(async () => {
    setLoadingPrestadores(true);
    setErroPrestadores(null);
    const pAreaAtuacao = modo === "escritorio" ? "escritorio" : "estudio";
    const [timesRes, prestRes] = await Promise.all([
      supabase.rpc("rh_escala_times_por_area_atuacao", { p_area_atuacao: pAreaAtuacao }),
      supabase.rpc("rh_escala_prestadores_por_area_atuacao", { p_area_atuacao: pAreaAtuacao }),
    ]);
    if (prestRes.error) {
      setErroPrestadores(
        "Não foi possível carregar o staff para a gestão de escala. Verifique permissões e se as migrations foram aplicadas.",
      );
      setPrestadoresRaw([]);
      setAbasTimes([]);
    } else {
      setPrestadoresRaw((prestRes.data ?? []) as RpcPrestadorEscala[]);
      const times = timesRes.error
        ? []
        : ((timesRes.data ?? []) as { id: string; nome: string; tipo?: string }[]).map((row) => ({
            id: String(row.id ?? ""),
            nome: String(row.nome ?? ""),
            tipo: row.tipo === "gerencia" ? ("gerencia" as const) : ("time" as const),
          }));
      const abas = buildAbasEscalaFromTimes(modo, times);
      setAbasTimes(abas);
      setFiltroArea((prev) => {
        if (abas.some((a) => a.areaKey === prev)) return prev;
        if (abas[0]) return abas[0].areaKey;
        return modo === "estudio" ? DEFAULT_AREA_ESCALA : prev;
      });
    }
    setLoadingPrestadores(false);
  }, [modo]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void carregarPrestadores();
  }, [perm.loading, perm.canView, carregarPrestadores]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    void supabase
      .from("estudios_spin")
      .select("slug, nome, tipo, estudios_spin_operadoras(operadora_slug)")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setEstudiosAtivosEscala([]);
          setOpParaEstudio({});
          return;
        }
        const opts: { slug: string; nome: string }[] = [];
        const junctionFlat: { operadora_slug: string; estudio_slug: string; tipo: string }[] = [];
        for (const raw of data ?? []) {
          const e = raw as {
            slug: string;
            nome: string;
            tipo: string;
            estudios_spin_operadoras: { operadora_slug: string } | { operadora_slug: string }[] | null;
          };
          opts.push({ slug: e.slug, nome: (e.nome ?? "").trim() || e.slug });
          const joins = e.estudios_spin_operadoras;
          const list = joins == null ? [] : Array.isArray(joins) ? joins : [joins];
          for (const j of list) {
            junctionFlat.push({
              operadora_slug: j.operadora_slug,
              estudio_slug: e.slug,
              tipo: e.tipo,
            });
          }
        }
        setEstudiosAtivosEscala(opts);
        setOpParaEstudio(buildOperadoraParaEstudioMap(junctionFlat));
      });
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    if (
      filtroEstudioEscala === FILTRO_STAFF_ESTUDIO_TODOS ||
      filtroEstudioEscala === FILTRO_STAFF_ESTUDIO_NENHUM
    ) {
      return;
    }
    if (!estudiosAtivosEscala.some((e) => e.slug === filtroEstudioEscala)) {
      setFiltroEstudioEscala(FILTRO_STAFF_ESTUDIO_TODOS);
    }
  }, [filtroEstudioEscala, estudiosAtivosEscala]);

  const filtroEstudioEscalaEfetivo = useMemo(
    () =>
      filtroArea === "game_presenter" ? filtroEstudioEscala : FILTRO_STAFF_ESTUDIO_TODOS,
    [filtroArea, filtroEstudioEscala],
  );

  const prestadoresFiltradosEstudio = useMemo(
    () =>
      modo === "escritorio"
        ? prestadoresRaw
        : filtrarPrestadoresPorEstudio(prestadoresRaw, filtroEstudioEscalaEfetivo, opParaEstudio),
    [modo, prestadoresRaw, filtroEstudioEscalaEfetivo, opParaEstudio],
  );

  const dias = useMemo(() => diasDoMes(ano, mes), [ano, mes]);
  const tituloMes = useMemo(() => labelMesAno(ano, mes), [ano, mes]);

  const limitesCarrosselMes = useMemo(
    () => ({
      min: dataMinimaEscalaCarrossel(),
      max: dataMaximaEscalaCarrossel(hoje),
    }),
    [hoje],
  );

  const podeMesAnterior = useMemo(() => {
    const ref = primeiroDiaMes(ano, mes);
    return ref > limitesCarrosselMes.min;
  }, [ano, mes, limitesCarrosselMes.min]);

  const podeMesSeguinte = useMemo(() => {
    const ref = primeiroDiaMes(ano, mes);
    return ref < limitesCarrosselMes.max;
  }, [ano, mes, limitesCarrosselMes.max]);

  const mesAnterior = useCallback(() => {
    if (!podeMesAnterior) return;
    if (mes === 0) {
      setMes(11);
      setAno((y) => y - 1);
    } else {
      setMes((m) => m - 1);
    }
  }, [mes, podeMesAnterior]);

  const mesSeguinte = useCallback(() => {
    if (!podeMesSeguinte) return;
    if (mes === 11) {
      setMes(0);
      setAno((y) => y + 1);
    } else {
      setMes((m) => m + 1);
    }
  }, [mes, podeMesSeguinte]);

  const podeEditarGrade = perm.canCriarOk;
  const podeAlterarEscalaAprovada = perm.canEditarOk;
  const mostrarFiltroArea = perm.canView === "sim" || perm.canView === "proprios";

  const hojeIso = useMemo(() => {
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    const d = String(hoje.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [hoje]);

  const mesHydratingRef = useRef(false);

  /** Novo mês: carrega rascunhos gravados no navegador para aquele mês. */
  useEffect(() => {
    setErroSalvarGrade(null);
    mesHydratingRef.current = true;
    setGerarPorFiltro(carregarEscalaMesGravada(ano, mes, modo));
  }, [ano, mes, modo]);

  useEffect(() => {
    if (mesHydratingRef.current) {
      mesHydratingRef.current = false;
      return;
    }
    gravarEscalaMes(ano, mes, gerarPorFiltro, modo);
  }, [gerarPorFiltro, ano, mes, modo]);

  /** Mescla na grade de cada área os valores persistidos na base e o status (`rh_gestao_escala_grade_status`). */
  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || loadingPrestadores) return;
    const areas = abasTimes.map((a) => a.areaKey);
    if (areas.length === 0) return;
    let cancelled = false;
    const ref = refMesISO(ano, mes);
    void (async () => {
      const [{ data: metaData, error: metaError }, { data: turnoMesData }, ...results] = await Promise.all([
        supabase.rpc("rh_gestao_escala_grade_meta_listar", { p_ref_mes: ref }),
        supabase.rpc("rh_gestao_escala_turno_mes_listar", { p_ref_mes: ref }),
        ...areas.map(async (areaKey) => {
          const [gradeRes, alterRes] = await Promise.all([
            supabase.rpc("rh_gestao_escala_grade_carregar", {
              p_ref_mes: ref,
              p_area_key: areaKey,
            }),
            supabase.rpc("rh_gestao_escala_grade_alteracoes_ultimas", {
              p_ref_mes: ref,
              p_area_key: areaKey,
            }),
          ]);
          return { areaKey, gradeRes, alterRes };
        }),
      ]);
      if (cancelled) return;
      if (turnoMesData) {
        setTurnoMesMap(mapTurnoMesRowsParaEstado(turnoMesData as RpcTurnoMesListarRow[]));
      } else {
        setTurnoMesMap({});
      }
      const metaPorArea: Record<string, RpcGradeMetaRow> = {};
      if (!metaError && metaData) {
        for (const row of metaData as RpcGradeMetaRow[]) {
          const ak = (row.area_key ?? "").trim();
          if (ak && areas.includes(ak)) metaPorArea[ak] = row;
        }
      }
      const fromDbPorArea: Record<string, Record<string, string>> = {};
      const alteracoesPorArea: Record<string, Record<string, EscalaAlteracaoCelulaMeta>> = {};
      for (const { areaKey, gradeRes, alterRes } of results) {
        if (!gradeRes.error) {
          fromDbPorArea[areaKey] = mapaCelulasFromGradeCarregarPayload(gradeRes.data);
        }
        if (!alterRes.error && alterRes.data) {
          alteracoesPorArea[areaKey] = mapAlteracoesUltimasPorCelula(alterRes.data as RpcAlteracaoUltimaRow[]);
        }
      }
      if (modo !== "escritorio" && Object.keys(fromDbPorArea).length === 0 && Object.keys(metaPorArea).length === 0) {
        return;
      }
      const turnoMapAtual = turnoMesData
        ? mapTurnoMesRowsParaEstado(turnoMesData as RpcTurnoMesListarRow[])
        : {};

      /** Escala Escritório: grade padrão Comercial/Folga e status aprovado (sem fluxo de rascunho). */
      if (modo === "escritorio") {
        const nextEscritorio: Record<string, EscalaGerarEstadoFiltro> = {};
        for (const ak of areas) {
          const fromDb = fromDbPorArea[ak] ?? {};
          const meta = metaPorArea[ak];
          const statusRaw = (meta?.status ?? "").trim().toLowerCase();
          let aprovadaEfetiva = statusRaw === "aprovada";
          const linhasF = filtrarPorArea(prestadoresRaw, ak).map((r) =>
            linhaComTurnoMesArea(r, ak, true, turnoMapAtual),
          );
          const celulas = mesclarCelulasEscritorioComPadrao(linhasF, dias, fromDb);
          if (!aprovadaEfetiva && linhasF.length > 0 && Object.keys(celulas).length > 0) {
            const { data: saveData, error: saveErr } = await supabase.rpc("rh_gestao_escala_grade_salvar", {
              p_ref_mes: ref,
              p_area_key: ak,
              p_celulas: celulas,
            });
            if (!cancelled && !saveErr && (saveData as RpcGradeSalvarResult | null)?.ok) {
              const { data: aprovData, error: aprovErr } = await supabase.rpc("rh_gestao_escala_grade_aprovar", {
                p_ref_mes: ref,
                p_area_key: ak,
              });
              if (!aprovErr && (aprovData as RpcGradeAprovarResult | null)?.ok) {
                aprovadaEfetiva = true;
              }
            }
          }
          if (cancelled) return;
          const aprovadoEmIso =
            meta?.aprovado_em == null
              ? null
              : typeof meta.aprovado_em === "string"
                ? meta.aprovado_em.slice(0, 25)
                : String(meta.aprovado_em);
          const snap = buildCelulasSnapshotGrade(linhasF, dias, celulas, true, modo, ak);
          nextEscritorio[ak] = {
            celulas,
            statusGradeDb: aprovadaEfetiva ? "aprovada" : "rascunho",
            aprovadoEmDb: aprovadaEfetiva ? aprovadoEmIso : null,
            aprovadoPorDb: aprovadaEfetiva ? meta?.aprovado_por ?? null : null,
            baseline: aprovadaEfetiva ? { ...celulas } : null,
            posSugestao: true,
            celulasSincronizadasComDb: snap,
            alteracoesPorCelula: aprovadaEfetiva ? (alteracoesPorArea[ak] ?? {}) : undefined,
          };
        }
        if (cancelled) return;
        setGerarPorFiltro((prev) => ({ ...prev, ...nextEscritorio }));
        return;
      }

      setGerarPorFiltro((prev) => {
        const next = { ...prev };
        for (const ak of areas) {
          const fromDb = fromDbPorArea[ak];
          const gradeCarregada = Object.prototype.hasOwnProperty.call(fromDbPorArea, ak);
          const meta = metaPorArea[ak];
          const statusRaw = (meta?.status ?? "").trim().toLowerCase();
          const statusGradeDb: GradeStatusMetaDb | null =
            statusRaw === "aprovada" || statusRaw === "rascunho" ? statusRaw : null;
          const aprovadaNaBase = statusGradeDb === "aprovada";
          const cur = next[ak];
          if (!gradeCarregada && !meta) continue;
          /**
           * Grade aprovada: base é a fonte da verdade quando o carregar OK.
           * Se a RPC falhar (`gradeCarregada` false), preservar células locais —
           * não zerar a Escala Diária aprovada.
           */
          const merged = aprovadaNaBase
            ? gradeCarregada
              ? { ...(fromDb ?? {}) }
              : { ...(cur?.celulas ?? {}) }
            : { ...(cur?.celulas ?? {}), ...(fromDb ?? {}) };
          const linhasF = filtrarPorArea(prestadoresRaw, ak).map((r) =>
            linhaComTurnoMesArea(r, ak, aprovadaNaBase, turnoMapAtual),
          );
          const snap = buildCelulasSnapshotGrade(linhasF, dias, merged, aprovadaNaBase, modo, ak);
          const aprovadoEmIso =
            meta?.aprovado_em == null
              ? null
              : typeof meta.aprovado_em === "string"
                ? meta.aprovado_em.slice(0, 25)
                : String(meta.aprovado_em);
          next[ak] = {
            celulas: merged,
            statusGradeDb,
            aprovadoEmDb: aprovadaNaBase ? aprovadoEmIso : null,
            aprovadoPorDb: aprovadaNaBase ? meta?.aprovado_por ?? null : null,
            baseline: aprovadaNaBase ? { ...merged } : cur?.baseline ?? null,
            posSugestao: aprovadaNaBase ? true : cur?.posSugestao ?? cur?.posSugestaoCs ?? false,
            celulasSincronizadasComDb: snap,
            alteracoesPorCelula: aprovadaNaBase
              ? (alteracoesPorArea[ak] ?? cur?.alteracoesPorCelula ?? {})
              : undefined,
          };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ano, mes, dias, perm.loading, perm.canView, loadingPrestadores, prestadoresRaw, abasTimes, modo]);

  const salvarGradeEscalaDb = useCallback(
    async (areaKey: AreaEscalaKey, celulasOverride?: Record<string, string>): Promise<boolean> => {
      setErroSalvarGrade(null);
      const est = gerarPorFiltro[areaKey];
      const celulas = celulasOverride ?? est?.celulas ?? {};
      if (Object.keys(celulas).length === 0) {
        setErroSalvarGrade("Não há células para salvar.");
        return false;
      }
      setSalvandoGrade(true);
      try {
        const ref = refMesISO(ano, mes);
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_salvar", {
          p_ref_mes: ref,
          p_area_key: areaKey,
          p_celulas: celulas,
        });
        if (error) throw error;
        const payload = data as RpcGradeSalvarResult | null;
        if (!payload?.ok) {
          const code = payload?.error ?? "";
          setErroSalvarGrade(
            code === "forbidden"
              ? "Sem permissão para salvar a grade."
              : code === "escala_aprovada"
                ? "Esta escala já está aprovada. Use «Nova Escala» para refazer (os compromissos saem do calendário até nova aprovação)."
                : code === "prestador_fora_area"
                  ? `Um ou mais colaboradores não pertencem ao time ${labelAreaEscala(areaKey, abasTimes)}.`
                  : code
                    ? `Não foi possível salvar: ${code}.`
                    : "Não foi possível salvar a grade.",
          );
          return false;
        }
        setGerarPorFiltro((prev) => {
          const estAtual = prev[areaKey];
          if (!estAtual) return prev;
          const linhasF = filtrarPorArea(prestadoresRaw, areaKey).map((r) =>
            linhaComTurnoMesArea(r, areaKey, false, turnoMesMap),
          );
          const celulasFinais = celulasOverride !== undefined ? celulasOverride : estAtual.celulas;
          const snap = buildCelulasSnapshotGrade(linhasF, dias, celulasFinais, false, modo, areaKey);
          const next = {
            ...prev,
            [areaKey]: {
              ...estAtual,
              celulas: celulasFinais,
              statusGradeDb: "rascunho" as const,
              celulasSincronizadasComDb: snap,
            },
          };
          gravarEscalaMes(ano, mes, next, modo);
          return next;
        });
        return true;
      } catch (e) {
        setErroSalvarGrade(
          e instanceof Error ? e.message : "Erro ao salvar na base de dados. Verifique se a migration foi aplicada.",
        );
        return false;
      } finally {
        setSalvandoGrade(false);
      }
    },
    [ano, mes, dias, gerarPorFiltro, prestadoresRaw, turnoMesMap, abasTimes, modo],
  );

  const linhas = useMemo(() => {
    const aprovada = escalaGradeAprovadaNaBase(gerarPorFiltro[filtroArea]);
    return filtrarPorArea(prestadoresFiltradosEstudio, filtroArea).map((r) =>
      linhaComTurnoMesArea(r, filtroArea, aprovada, turnoMesMap),
    );
  }, [prestadoresFiltradosEstudio, filtroArea, gerarPorFiltro, turnoMesMap]);

  const linhasAposNickname = useMemo(() => {
    const q = filtroNicknameEscala.trim();
    if (!q) return linhas;
    const soNome = modo === "escritorio" || filtroArea === "academy";
    return linhas.filter((row) =>
      soNome
        ? textoContemBuscaEmAlgum(q, row.nome, row.nomeCompletoCadastro)
        : textoContemBuscaEmAlgum(q, row.nome, row.nomeCompletoCadastro, row.nickname),
    );
  }, [linhas, filtroNicknameEscala, modo, filtroArea]);

  const linhasFiltradasEscalaDiaria = useMemo(() => {
    if (filtroTurnoConsolidado == null) return linhasAposNickname;
    return linhasAposNickname.filter((row) => linhaColaboradorNoFiltroTurnoConsolidado(row, filtroTurnoConsolidado));
  }, [linhasAposNickname, filtroTurnoConsolidado]);

  const onSortEscalaDiaria = useCallback((col: EscalaDiariaSortCol) => {
    setSortEscalaDiaria((s) => ({
      col,
      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
    }));
  }, []);

  const linhasOrdenadasEscalaDiaria = useMemo(() => {
    const rows = [...linhasFiltradasEscalaDiaria];
    const { col, dir } = sortEscalaDiaria;
    rows.sort((a, b) => {
      if (col === "nome") {
        return compareLocaleTexto(a.nome, b.nome, dir);
      }
      if (col === "nickname") {
        return compareLocaleTexto(a.nickname, b.nickname, dir);
      }
      return compareLocaleTexto(a.turnoStaffNome || "—", b.turnoStaffNome || "—", dir);
    });
    return rows;
  }, [linhasFiltradasEscalaDiaria, sortEscalaDiaria]);

  useEffect(() => {
    setPaginaEscalaDiaria(0);
  }, [
    filtroNicknameEscala,
    filtroTurnoConsolidado,
    sortEscalaDiaria.col,
    sortEscalaDiaria.dir,
    filtroEstudioEscala,
  ]);

  const paginaEscalaSafe = clampPageIndex(
    paginaEscalaDiaria,
    linhasOrdenadasEscalaDiaria.length,
    TABELA_PAGE_SIZE_ESCALA,
  );
  const linhasPaginaEscalaDiaria = useMemo(
    () => slicePage(linhasOrdenadasEscalaDiaria, paginaEscalaSafe, TABELA_PAGE_SIZE_ESCALA),
    [linhasOrdenadasEscalaDiaria, paginaEscalaSafe],
  );

  const linhasPorFiltroGerar = useCallback(
    (areaKey: AreaEscalaKey) => {
      const aprovada = escalaGradeAprovadaNaBase(gerarPorFiltro[areaKey]);
      return filtrarPorArea(prestadoresFiltradosEstudio, areaKey).map((r) =>
        linhaComTurnoMesArea(r, areaKey, aprovada, turnoMesMap),
      );
    },
    [prestadoresFiltradosEstudio, gerarPorFiltro, turnoMesMap],
  );

  /**
   * Sugestão com regras de escala (3×3, 4×2, 5×1, 5×2 comercial) e continuidade com o mês anterior gravado na base.
   */
  const aplicarSugestaoEscalaArea = useCallback(
    async (areaKey: AreaEscalaKey) => {
      const linhasF = linhasPorFiltroGerar(areaKey);
      const diasLite = dias.map((d) => ({
        iso: d.iso,
        isWeekend: d.isWeekend,
        isFeriadoSP: d.isFeriadoSP,
      }));
      setErroSalvarGrade(null);

      let celulasMesAnterior: Record<string, string> | undefined;
      const mes0Prev = mes === 0 ? 11 : mes - 1;
      const anoPrev = mes === 0 ? ano - 1 : ano;
      const refPrev = refMesISO(anoPrev, mes0Prev);
      const refMin = refMesISO(ESCALA_ANO_MIN, ESCALA_MES0_MIN);
      if (refPrev >= refMin) {
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_carregar", {
          p_ref_mes: refPrev,
          p_area_key: areaKey,
        });
        if (!error && data) {
          const m = mapaCelulasFromGradeCarregarPayload(data);
          if (Object.keys(m).length > 0) celulasMesAnterior = m;
        }
      }

      const celulas = gerarCelulasSugestaoCustomerService(linhasF, diasLite, { celulasMesAnterior });
      setGerarPorFiltro((prev) => {
        const ant = prev[areaKey];
        return {
          ...prev,
          [areaKey]: {
            ...ant,
            celulas,
            baseline: null,
            celulasSincronizadasComDb: null,
            posSugestao: true,
          },
        };
      });
      void registrarHistoricoEscalaAcao(refMesISO(ano, mes), areaKey, "sugestao");
    },
    [ano, mes, dias, linhasPorFiltroGerar],
  );

  const aprovarEscalaGerar = useCallback(
    async (areaKey: AreaEscalaKey) => {
      const linhasF = linhasPorFiltroGerar(areaKey);
      const cur = gerarPorFiltro[areaKey];
      if (!cur) return;
      const merged: Record<string, string> = { ...cur.celulas };
      for (const row of linhasF) {
        for (const d of dias) {
          const k = chaveCelulaGerar(row.id, d.iso);
          merged[k] = sanitizarValorCelulaGerar(row.siglaTurnoStaff, cur.celulas[k] ?? "", row.turnoStaffNome, modo, areaKey);
        }
      }
      const baseline = { ...merged };
      const ok = await salvarGradeEscalaDb(areaKey, merged);
      if (!ok) return;
      const ref = refMesISO(ano, mes);
      try {
        const { data: aprovData, error: aprovErr } = await supabase.rpc("rh_gestao_escala_grade_aprovar", {
          p_ref_mes: ref,
          p_area_key: areaKey,
        });
        if (aprovErr) throw aprovErr;
        const ap = aprovData as RpcGradeAprovarResult | null;
        if (!ap?.ok) {
          const code = ap?.error ?? "";
          setErroSalvarGrade(
            code === "forbidden"
              ? "Sem permissão para aprovar a escala."
              : code === "sem_grade"
                ? "Não há grade gravada para aprovar. Preencha e salve antes de aprovar."
                : code
                  ? `Não foi possível aprovar: ${code}.`
                  : "Não foi possível aprovar a escala.",
          );
          return;
        }
        const aprovadoEmDb = typeof ap.aprovado_em === "string" ? ap.aprovado_em : null;
        const aprovadoPorDb = typeof ap.aprovado_por === "string" ? ap.aprovado_por : null;
        const { data: turnoAreaData } = await supabase.rpc("rh_gestao_escala_turno_mes_listar", {
          p_ref_mes: ref,
          p_area_key: areaKey,
        });
        const snapsArea = mapTurnoMesRowsParaEstado((turnoAreaData ?? []) as RpcTurnoMesListarRow[]);
        setTurnoMesMap((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            if (k.startsWith(`${areaKey}|`)) delete next[k];
          }
          return { ...next, ...snapsArea };
        });
        const linhasAposSnap = filtrarPorArea(prestadoresRaw, areaKey).map((r) =>
          linhaComTurnoMesArea(r, areaKey, true, { ...turnoMesMap, ...snapsArea }),
        );
        setGerarPorFiltro((prev) => {
          const estAtual = prev[areaKey];
          if (!estAtual) return prev;
          const next = {
            ...prev,
            [areaKey]: {
              ...estAtual,
              celulas: merged,
              statusGradeDb: "aprovada" as const,
              aprovadoEmDb,
              aprovadoPorDb,
              baseline,
              posSugestao: true,
              celulasSincronizadasComDb: buildCelulasSnapshotGrade(linhasAposSnap, dias, merged, true, modo, areaKey),
            },
          };
          gravarEscalaMes(ano, mes, next, modo);
          return next;
        });
        // Escala Estúdio GP aprovada → prévias de Rotação do mês (melhor esforço; não bloqueia)
        if (modo === "estudio" && areaKey === "game_presenter") {
          void import("../../../lib/escalaRotacao")
            .then(({ gerarPreviewsMesRotacao }) => gerarPreviewsMesRotacao(ref))
            .catch((err) => console.error(err));
        }
      } catch (e) {
        setErroSalvarGrade(
          e instanceof Error ? e.message : "Erro ao aprovar na base de dados. Verifique se a migration foi aplicada.",
        );
      }
    },
    [ano, mes, dias, gerarPorFiltro, linhasPorFiltroGerar, salvarGradeEscalaDb, prestadoresRaw, turnoMesMap, modo],
  );

  const resetarGradeEscalaDb = useCallback(
    async (areaKey: AreaEscalaKey): Promise<boolean> => {
      setErroSalvarGrade(null);
      setResetandoGrade(true);
      try {
        const ref = refMesISO(ano, mes);
        const { data, error } = await supabase.rpc("rh_gestao_escala_grade_resetar", {
          p_ref_mes: ref,
          p_area_key: areaKey,
        });
        if (error) throw error;
        const payload = data as RpcGradeResetarResult | null;
        if (!payload?.ok) {
          const code = payload?.error ?? "";
          setErroSalvarGrade(
            code === "forbidden"
              ? "Sem permissão para refazer a escala."
              : code
                ? `Não foi possível refazer: ${code}.`
                : "Não foi possível refazer a escala.",
          );
          return false;
        }
        setGerarPorFiltro((prev) => {
          const next = {
            ...prev,
            [areaKey]: {
              celulas: {},
              baseline: null,
              celulasSincronizadasComDb: null,
              posSugestao: false,
              statusGradeDb: null,
              aprovadoEmDb: null,
              aprovadoPorDb: null,
              alteracoesPorCelula: undefined,
            },
          };
          gravarEscalaMes(ano, mes, next, modo);
          return next;
        });
        setTurnoMesMap((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            if (k.startsWith(`${areaKey}|`)) delete next[k];
          }
          return next;
        });
        return true;
      } catch (e) {
        setErroSalvarGrade(
          e instanceof Error ? e.message : "Erro ao refazer a escala na base de dados. Verifique se a migration foi aplicada.",
        );
        return false;
      } finally {
        setResetandoGrade(false);
      }
    },
    [ano, mes, modo],
  );

  const atualizarCelulaGerar = useCallback(
    (areaKey: AreaEscalaKey, rowId: string, iso: string, siglaTurnoStaff: string, turnoStaffNome: string, valor: string) => {
      const k = chaveCelulaGerar(rowId, iso);
      const ok = sanitizarValorCelulaGerar(siglaTurnoStaff, valor, turnoStaffNome, modo, areaKey);
      setGerarPorFiltro((prev) => {
        const cur = prev[areaKey] ?? { celulas: {}, baseline: null };
        if (escalaGradeAprovadaNaBase(cur)) return prev;
        const prevOk = sanitizarValorCelulaGerar(siglaTurnoStaff, cur.celulas[k] ?? "", turnoStaffNome, modo, areaKey);
        if (prevOk === ok) return prev;
        return {
          ...prev,
          [areaKey]: {
            ...cur,
            celulas: { ...cur.celulas, [k]: ok },
            /** Edição manual entra no mesmo fluxo da sugestão (Salvar / Aprovar / Nova Escala). */
            posSugestao: true,
            /** Invalida sync com a BD para «Salvar Alterações» voltar após nova mudança. */
            celulasSincronizadasComDb: null,
          },
        };
      });
    },
    [modo],
  );

  const acaoBotaoGerar = useCallback(
    (areaKey: AreaEscalaKey): "sugestao" | "aprovar" | null => {
      const estado = gerarPorFiltro[areaKey];
      if (posSugestaoAtiva(estado)) return null;
      const linhasF = linhasPorFiltroGerar(areaKey);
      if (linhasF.length === 0) return null;
      const celulas = estado?.celulas ?? {};
      const allFilled = linhasF.every((row) =>
        dias.every((d) => {
          const k = chaveCelulaGerar(row.id, d.iso);
          return sanitizarValorCelulaGerar(row.siglaTurnoStaff, celulas[k] ?? "", row.turnoStaffNome, modo, areaKey).trim() !== "";
        }),
      );
      if (escalaGradeAprovadaNaBase(estado) && estado.baseline) {
        const celSan: Record<string, string> = {};
        for (const row of linhasF) {
          for (const d of dias) {
            const k = chaveCelulaGerar(row.id, d.iso);
            celSan[k] = sanitizarValorCelulaGerar(row.siglaTurnoStaff, celulas[k] ?? "", row.turnoStaffNome, modo, areaKey);
          }
        }
        if (celulasIguais(celSan, estado.baseline)) return null;
      }
      if (allFilled) return "aprovar";
      return "sugestao";
    },
    [gerarPorFiltro, linhasPorFiltroGerar, dias, modo],
  );

  const contentBox = getPageContentBoxStyle(brand, t);

  const thBase = getThStyle(t);

  /** Cabeçalhos fixos à esquerda ficam acima das colunas de dia ao rolar horizontalmente. */
  const Z_STICKY_HEAD = 30;
  /** Colunas sticky à esquerda: z decrescente à direita para o ícone de ordenação não ficar sob a coluna seguinte. */
  const Z_STICKY_HEAD_NOME = 33;
  const Z_STICKY_HEAD_NICK = 32;
  const Z_STICKY_HEAD_TURNO = 31;
  /** Corpo: colunas fixas com z maior que as de dia; ordem Nome > Nick > Turno (staff). */
  const Z_BODY_NOME = 30;
  const Z_BODY_NICK = 29;
  const Z_BODY_TURNO_STAFF = 28;
  const Z_DIA = 0;

  const thSticky = (left: number, extra?: CSSProperties): CSSProperties => ({
    ...thBase,
    fontSize: CONSOLIDADO_FONT_HEADER,
    fontWeight: 700,
    letterSpacing: "0.06em",
    position: "sticky",
    left,
    zIndex: Z_STICKY_HEAD,
    boxSizing: "border-box",
    background: brand.blockBg ?? t.cardBg ?? t.bg ?? "#fff",
    transform: "translateZ(0)",
    ...extra,
  });

  const thDia = (dia: DiaMes): CSSProperties => ({
    ...getThStyle(t, {
      textAlign: "center",
      minWidth: 72,
      maxWidth: 88,
      whiteSpace: "normal",
      lineHeight: 1.25,
      fontSize: 9,
      letterSpacing: 0,
      zIndex: Z_DIA,
      position: "relative",
      background: diaComDestaqueCalendario(dia)
        ? t.isDark
          ? "rgba(245,158,11,0.12)"
          : "rgba(245,158,11,0.14)"
        : getThStyle(t).background,
      color: diaComDestaqueCalendario(dia) ? "#f59e0b" : undefined,
    }),
  });

  const fundoColunaDia = (dia: DiaMes, rowBg: string): string => {
    if (!diaComDestaqueCalendario(dia)) return rowBg;
    return t.isDark
      ? `color-mix(in srgb, rgba(245,158,11,0.22) 32%, ${rowBg})`
      : `color-mix(in srgb, rgba(245,158,11,0.24) 34%, ${rowBg})`;
  };

  const sombraColFixa = t.isDark ? "4px 0 10px rgba(0,0,0,0.35)" : "4px 0 10px rgba(0,0,0,0.08)";

  const fundoStickyConsolidadoTurno = brand.blockBg ?? t.cardBg ?? t.bg ?? "#fff";

  const thConsolidadoTurnoSticky = (zIndex: number, bg: string, extra?: CSSProperties): CSSProperties => ({
    ...getThStyle(t),
    textAlign: "left",
    position: "sticky",
    left: 0,
    zIndex,
    boxSizing: "border-box",
    minWidth: CONSOLIDADO_COL_TURNO_W,
    maxWidth: 200,
    width: CONSOLIDADO_COL_TURNO_W,
    background: bg,
    borderRight: `1px solid ${t.cardBorder}`,
    boxShadow: sombraColFixa,
    verticalAlign: "middle",
    ...extra,
  });

  const tdDia: CSSProperties = {
    ...getTdStyle(t, {
      textAlign: "center",
      minWidth: 72,
      maxWidth: 88,
      fontSize: 12,
      color: t.textMuted,
      zIndex: Z_DIA,
      position: "relative",
    }),
  };

  const thDiaConsolidado = (dia: DiaMes): CSSProperties => ({
    ...thDia(dia),
    fontSize: CONSOLIDADO_FONT_DIA_HEADER,
  });

  const fundoCelulaTotalConsolidado = (dia: DiaMes): string =>
    diaComDestaqueCalendario(dia)
      ? t.isDark
        ? `color-mix(in srgb, rgba(245,158,11,0.14) 35%, ${dataTable.totalRowBgStrong})`
        : `color-mix(in srgb, rgba(245,158,11,0.16) 35%, ${dataTable.totalRowBgStrong})`
      : dataTable.totalRowBgStrong;

  const tdSticky = (left: number, rowBg: string, zBody: number, extra?: CSSProperties): CSSProperties => ({
    ...getTdStyle(t, {
      ...extra,
      background: rowBg,
      boxSizing: "border-box",
    }),
    position: "sticky",
    left,
    zIndex: zBody,
    transform: "translateZ(0)",
  });

  /** Fundo opaco por linha (zebra global usa color-mix transparente e deixa vazar as células de dia por baixo). */
  const zebraBgLinha = (i: number) => {
    const base = brand.blockBg ?? t.cardBg ?? t.bg ?? "#fff";
    if (i % 2 === 0) return base;
    return t.isDark
      ? "color-mix(in srgb, var(--brand-secondary, #4a2082) 16%, #141118)"
      : "color-mix(in srgb, var(--brand-secondary, #4a2082) 10%, #f2effa)";
  };

  const estGradeFiltro = gerarPorFiltro[filtroArea];
  const celulasGerarAtivas = estGradeFiltro?.celulas;
  const alteracoesPorCelulaAtivas = estGradeFiltro?.alteracoesPorCelula;
  const podeEditarCelulasDia = Boolean(
    modo !== "escritorio" && podeEditarGrade && !escalaGradeAprovadaNaBase(estGradeFiltro),
  );
  const mostrarBotaoAlterarEscala = Boolean(
    mostrarFiltroArea &&
      podeAlterarEscalaAprovada &&
      (modo === "escritorio"
        ? escalaGradeAprovadaNaBase(estGradeFiltro)
        : posSugestaoAtiva(estGradeFiltro) && escalaGradeAprovadaNaBase(estGradeFiltro)),
  );

  const estudiosNomeEscala = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of estudiosAtivosEscala) m[e.slug] = e.nome;
    return m;
  }, [estudiosAtivosEscala]);

  const resumoTurnoDias = useMemo(() => {
    if (!mostrarFiltroArea) return null;
    const linhasRpc = filtrarPorArea(prestadoresFiltradosEstudio, filtroArea);
    const linhasF = linhasRpc.map(mapLinhaPrestador);
    const celulas = gerarPorFiltro[filtroArea]?.celulas;
    if (modo === "escritorio") {
      const comercial = contarCelulasComSigla(linhasF, dias, celulas, "Comercial");
      return {
        modoEscritorio: true as const,
        mostrarLinhaComercial: true as const,
        manha: [] as number[],
        tarde: [] as number[],
        noite: [] as number[],
        comercial,
        total: comercial,
        temLinhaTardeConsolidado: false,
        drilldownPorEstudio: false as const,
        manhaPorEstudio: [] as ConsolidadoEstudioLinha[],
        tardePorEstudio: [] as ConsolidadoEstudioLinha[],
        noitePorEstudio: [] as ConsolidadoEstudioLinha[],
      };
    }
    const manha = contarCelulasComSigla(linhasF, dias, celulas, "MRN");
    const tarde = contarCelulasComSigla(linhasF, dias, celulas, "AFT");
    const noite = contarCelulasComSigla(linhasF, dias, celulas, "NGT");
    const ehAcademy = filtroArea === "academy";
    const comercial = ehAcademy
      ? contarCelulasComSigla(linhasF, dias, celulas, "Comercial")
      : ([] as number[]);
    /** Sem pessoal de tarde na operação destas áreas — não exibir linha «Turno da Tarde». */
    const temLinhaTardeConsolidado =
      filtroArea !== "service_manager" && filtroArea !== "shift_leader";
    const drilldownPorEstudio =
      modo === "estudio" &&
      filtroArea === "game_presenter" &&
      filtroEstudioEscalaEfetivo === FILTRO_STAFF_ESTUDIO_TODOS;
    const manhaPorEstudio = drilldownPorEstudio
      ? contarCelulasComSiglaPorEstudio(linhasRpc, dias, celulas, "MRN", opParaEstudio, estudiosNomeEscala)
      : [];
    const tardePorEstudio = drilldownPorEstudio
      ? contarCelulasComSiglaPorEstudio(linhasRpc, dias, celulas, "AFT", opParaEstudio, estudiosNomeEscala)
      : [];
    const noitePorEstudio = drilldownPorEstudio
      ? contarCelulasComSiglaPorEstudio(linhasRpc, dias, celulas, "NGT", opParaEstudio, estudiosNomeEscala)
      : [];
    const total = dias.map((_, i) => {
      let s = (manha[i] ?? 0) + (noite[i] ?? 0);
      if (temLinhaTardeConsolidado) s += tarde[i] ?? 0;
      if (ehAcademy) s += comercial[i] ?? 0;
      return s;
    });
    return {
      modoEscritorio: false as const,
      mostrarLinhaComercial: ehAcademy,
      manha,
      tarde,
      noite,
      comercial,
      total,
      temLinhaTardeConsolidado,
      drilldownPorEstudio,
      manhaPorEstudio,
      tardePorEstudio,
      noitePorEstudio,
    };
  }, [
    mostrarFiltroArea,
    filtroArea,
    prestadoresFiltradosEstudio,
    dias,
    gerarPorFiltro,
    modo,
    filtroEstudioEscalaEfetivo,
    opParaEstudio,
    estudiosNomeEscala,
  ]);

  const mostrarSalvarAlteracoes = useMemo(() => {
    if (modo === "escritorio") return false;
    const est = gerarPorFiltro[filtroArea];
    if (!mostrarFiltroArea || !posSugestaoAtiva(est) || escalaGradeAprovadaNaBase(est)) return false;
    const linhasF = filtrarPorArea(prestadoresRaw, filtroArea).map((r) =>
      linhaComTurnoMesArea(r, filtroArea, false, turnoMesMap),
    );
    if (linhasF.length === 0) return false;
    const atual = buildCelulasSnapshotGrade(linhasF, dias, est?.celulas ?? {}, false, modo, filtroArea);
    const temAlguma = Object.values(atual).some((v) => v.trim() !== "");
    if (!temAlguma) return false;
    const snapDb = est?.celulasSincronizadasComDb ?? null;
    if (snapDb === null) return true;
    return !celulasIguais(atual, snapDb);
  }, [mostrarFiltroArea, filtroArea, prestadoresRaw, dias, gerarPorFiltro, turnoMesMap, modo]);

  const msgTabelaVazia = "Sem dados para o período selecionado.";

  useEffect(() => {
    if (filtroEstudioEscalaEfetivo !== FILTRO_STAFF_ESTUDIO_TODOS || filtroArea !== "game_presenter") {
      setConsolidadoTurnoExpandido({});
      return;
    }
    /** Com Todos Estúdios + Game Presenter, deixa Manhã expandida para o drilldown ficar óbvio. */
    setConsolidadoTurnoExpandido({ manha: true });
  }, [filtroEstudioEscalaEfetivo, filtroArea]);

  const alternarFiltroTurnoConsolidado = useCallback((k: FiltroTurnoConsolidadoRh) => {
    setFiltroTurnoConsolidado((prev) => (prev === k ? null : k));
  }, []);

  /** Clique no estúdio do drilldown: aplica (ou limpa) o filtro da barra + turno da linha pai. */
  const alternarFiltroEstudioConsolidado = useCallback(
    (consolidadoKey: string, turnoKey: FiltroTurnoConsolidadoRh) => {
      /**
       * Bucket «Todos Estúdios» (cadastro Staff): a barra já está em Todos quando o drilldown
       * aparece — só alterna o turno da linha pai (não tratar como clear do filtro de estúdio).
       */
      if (consolidadoKey === CONSOLIDADO_ESTUDIO_KEY_TODOS) {
        setFiltroTurnoConsolidado((prev) => (prev === turnoKey ? null : turnoKey));
        return;
      }
      const nextFiltro = filtroEstudioValueFromConsolidadoKey(consolidadoKey);
      const clearing = filtroEstudioEscala === nextFiltro;
      setFiltroEstudioEscala(clearing ? FILTRO_STAFF_ESTUDIO_TODOS : nextFiltro);
      if (!clearing) setFiltroTurnoConsolidado(turnoKey);
    },
    [filtroEstudioEscala],
  );

  const limparFiltrosConsolidado = useCallback(() => {
    setFiltroTurnoConsolidado(null);
    setFiltroEstudioEscala(FILTRO_STAFF_ESTUDIO_TODOS);
  }, []);

  const consolidadoEstudioKeyAtiva = consolidadoKeyFromFiltroEstudio(filtroEstudioEscalaEfetivo);

  const alternarExpandConsolidadoTurno = useCallback((k: "manha" | "tarde" | "noite") => {
    setConsolidadoTurnoExpandido((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const estiloBotaoTurnoConsolidado = useCallback(
    (ativo: boolean): CSSProperties => ({
      width: "100%",
      textAlign: "left",
      fontWeight: 700,
      fontFamily: FONT.body,
      fontSize: CONSOLIDADO_FONT_TURNO,
      padding: "10px 12px",
      margin: 0,
      border: "none",
      borderLeft: ativo ? `3px solid ${brand.accent}` : "3px solid transparent",
      boxSizing: "border-box",
      background: ativo
        ? brand.useBrand
          ? "color-mix(in srgb, var(--brand-action, #7c3aed) 12%, transparent)"
          : "rgba(124,58,237,0.09)"
        : "transparent",
      color: t.text,
      cursor: "pointer",
      borderRadius: 0,
    }),
    [brand.accent, brand.useBrand, t.text],
  );

  const estiloBotaoEstudioConsolidado = useCallback(
    (ativo: boolean): CSSProperties => ({
      width: "100%",
      textAlign: "left",
      fontWeight: ativo ? 700 : 500,
      fontFamily: FONT.body,
      fontSize: 11,
      padding: "6px 12px 6px 36px",
      margin: 0,
      border: "none",
      borderLeft: ativo ? `3px solid ${brand.accent}` : "3px solid transparent",
      boxSizing: "border-box",
      background: ativo
        ? brand.useBrand
          ? "color-mix(in srgb, var(--brand-action, #7c3aed) 12%, transparent)"
          : "rgba(124,58,237,0.09)"
        : "transparent",
      color: ativo ? t.text : t.textMuted,
      cursor: "pointer",
      borderRadius: 0,
    }),
    [brand.accent, brand.useBrand, t.text, t.textMuted],
  );

  const selectCelulaGerarStyle: CSSProperties = {
    width: "100%",
    maxWidth: 84,
    margin: "0 auto",
    display: "block",
    boxSizing: "border-box",
    textAlign: "center",
    padding: "4px 2px",
    borderRadius: 6,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg ?? "transparent",
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 10,
    cursor: "pointer",
  };

  const acaoGerarNoFiltroSelecionado =
    modo === "escritorio" ? null : podeEditarGrade ? acaoBotaoGerar(filtroArea) : null;

  const estiloCelulaConsolidadoNum = (dia: DiaMes, forte = false): CSSProperties => ({
    ...getTdStyle(t, {
      textAlign: "center",
      fontVariantNumeric: "tabular-nums",
      fontWeight: forte ? 700 : 600,
      ...(diaComDestaqueCalendario(dia)
        ? {
            background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
            color: "#f59e0b",
          }
        : {}),
    }),
  });

  const renderLinhaTurnoConsolidadoComDrill = (
    turnoKey: "manha" | "tarde" | "noite",
    label: string,
    totais: number[],
    porEstudio: ConsolidadoEstudioLinha[],
    rowKeyPrefix: string,
  ) => {
    const expandido = Boolean(consolidadoTurnoExpandido[turnoKey]);
    const mostraDrill = Boolean(resumoTurnoDias?.drilldownPorEstudio);
    return (
      <>
        <tr key={`turno-${turnoKey}`}>
          <th
            scope="row"
            style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_ROW, fundoStickyConsolidadoTurno, {
              fontWeight: 700,
              fontSize: CONSOLIDADO_FONT_TURNO,
              padding: 0,
            })}
          >
            <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
              {mostraDrill ? (
                <button
                  type="button"
                  aria-expanded={expandido}
                  aria-label={
                    expandido
                      ? `Recolher detalhe por estúdio — ${label}`
                      : `Expandir detalhe por estúdio — ${label}`
                  }
                  title={expandido ? "Recolher por estúdio" : "Ver por estúdio"}
                  onClick={() => alternarExpandConsolidadoTurno(turnoKey)}
                  style={{
                    flex: "0 0 40px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    border: "none",
                    borderLeft: filtroTurnoConsolidado === turnoKey ? `3px solid ${brand.accent}` : "3px solid transparent",
                    background: expandido
                      ? "color-mix(in srgb, var(--brand-primary, #7c3aed) 12%, transparent)"
                      : "transparent",
                    color: brand.accent ?? t.text,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <ChevronRight
                    size={16}
                    aria-hidden
                    style={{
                      transform: expandido ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </button>
              ) : null}
              <button
                type="button"
                aria-pressed={filtroTurnoConsolidado === turnoKey}
                aria-label={`Filtrar Escala Diária pelo ${label.toLowerCase()}`}
                onClick={() => alternarFiltroTurnoConsolidado(turnoKey)}
                style={{
                  ...estiloBotaoTurnoConsolidado(filtroTurnoConsolidado === turnoKey),
                  flex: 1,
                  borderLeft: mostraDrill ? "none" : undefined,
                }}
              >
                {label}
              </button>
            </div>
          </th>
          {totais.map((n, idx) => {
            const d = dias[idx]!;
            return (
              <td key={`${rowKeyPrefix}-${d.iso}`} style={estiloCelulaConsolidadoNum(d, true)}>
                {n}
              </td>
            );
          })}
        </tr>
        {mostraDrill && expandido
          ? porEstudio.map((est) => {
              /** Todos Estúdios: ativo quando o turno da linha pai está no filtro (barra já é Todos). */
              const estudioAtivo =
                est.key === CONSOLIDADO_ESTUDIO_KEY_TODOS
                  ? filtroTurnoConsolidado === turnoKey
                  : consolidadoEstudioKeyAtiva === est.key;
              return (
              <tr key={`${turnoKey}-est-${est.key}`}>
                <th
                  scope="row"
                  style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_ROW, fundoStickyConsolidadoTurno, {
                    fontWeight: 500,
                    fontSize: 11,
                    padding: 0,
                    color: t.textMuted,
                  })}
                >
                  <button
                    type="button"
                    aria-pressed={estudioAtivo}
                    aria-label={`Filtrar Escala Diária pelo estúdio ${est.label}`}
                    title={
                      estudioAtivo
                        ? `Remover filtro de estúdio ${est.label}`
                        : `Filtrar Escala Diária por ${est.label}`
                    }
                    onClick={() => alternarFiltroEstudioConsolidado(est.key, turnoKey)}
                    style={estiloBotaoEstudioConsolidado(estudioAtivo)}
                  >
                    {est.label}
                  </button>
                </th>
                {est.counts.map((n, idx) => {
                  const d = dias[idx]!;
                  return (
                    <td key={`${rowKeyPrefix}-${est.key}-${d.iso}`} style={estiloCelulaConsolidadoNum(d, false)}>
                      {n}
                    </td>
                  );
                })}
              </tr>
            );
            })
          : null}
      </>
    );
  };

  const confirmarAlteracaoCelulaAprovada = useCallback(
    (
      funcionarioId: string,
      diaIso: string,
      valor: string,
      metaAlteracao: EscalaAlteracaoCelulaMeta,
    ) => {
      setGerarPorFiltro((prev) => {
        const areaKey = filtroArea;
        const cur = prev[areaKey];
        if (!cur) return prev;
        const k = chaveCelulaGerar(funcionarioId, diaIso);
        const merged = { ...cur.celulas, [k]: valor };
        const alteracoes = { ...(cur.alteracoesPorCelula ?? {}), [k]: metaAlteracao };
        const linhasF = filtrarPorArea(prestadoresRaw, areaKey).map((r) =>
          linhaComTurnoMesArea(r, areaKey, true, turnoMesMap),
        );
        const snap = buildCelulasSnapshotGrade(linhasF, dias, merged, true, modo, areaKey);
        const next = {
          ...prev,
          [areaKey]: {
            ...cur,
            celulas: merged,
            baseline: cur.baseline ? { ...cur.baseline, [k]: valor } : cur.baseline,
            celulasSincronizadasComDb: snap,
            alteracoesPorCelula: alteracoes,
          },
        };
        gravarEscalaMes(ano, mes, next, modo);
        return next;
      });
    },
    [filtroArea, prestadoresRaw, dias, ano, mes, turnoMesMap, modo],
  );
  /** Oculta coluna Nome na Escala Diária (Service Manager / Shift Leader) — só Estúdio. */
  const semColunaNome =
    modo !== "escritorio" && (filtroArea === "service_manager" || filtroArea === "shift_leader");
  /** Academy e Escritório: sem coluna Nickname. */
  const semColunaNickname =
    modo === "escritorio" ||
    filtroArea === "academy" ||
    labelAreaEscala(filtroArea, abasTimes).toLowerCase() === "academy";
  /** Escala Escritório: sem Nickname e sem Turno. */
  const semColunaTurno = modo === "escritorio";
  const semColunasNickTurno = semColunaNickname && semColunaTurno;
  /** Overlap entre sticky — fecha o vão no zoom CSS da plataforma. */
  const STICKY_OVERLAP_PX = 2;
  const stickyLeftNick = semColunaNome ? 0 : STICKY_W_NOME - STICKY_OVERLAP_PX;
  const stickyLeftTurno =
    (semColunaNome ? 0 : STICKY_W_NOME) +
    (semColunaNickname ? 0 : STICKY_W_NICK) -
    STICKY_OVERLAP_PX * (semColunaNome ? 0 : 1) -
    STICKY_OVERLAP_PX * (semColunaNickname ? 0 : 1);
  const colunasFixasEscalaDiaria =
    (semColunaNome ? 0 : 1) + (semColunaNickname ? 0 : 1) + (semColunaTurno ? 0 : 1);
  /** Selo opaco + overlap — evita cabeçalho de dias no vão (zoom da plataforma). */
  const seloStickyDireita = (bg: string): CSSProperties => ({
    boxShadow: `${STICKY_OVERLAP_PX}px 0 0 0 ${bg}`,
    borderRight: `1px solid ${bg}`,
  });
  const fundoStickyCabecalho = brand.blockBg ?? t.cardBg ?? t.bg ?? "#fff";

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <Loader2 size={24} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ fontFamily: FONT.body }}>
      <PageHeader
        icon={<PageMenuIcon pageKey={pageKey} />}
        title={getPageMenuLabel(pageKey)}
        subtitle={
          modo === "escritorio"
            ? "Gere a escala mensal dos times de escritório por colaborador e dia."
            : "Gere a escala por área (time), colaborador e dia do mês."
        }
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 0,
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
                flex: "1 1 auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={mesAnterior}
                  disabled={!podeMesAnterior}
                  aria-label="Mês anterior"
                  style={getCarouselBtnNavStyle(t, !podeMesAnterior)}
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <span style={getCarouselPeriodLabelStyle(t, { minWidth: 200 })}>{tituloMes}</span>
                <button
                  type="button"
                  onClick={mesSeguinte}
                  disabled={!podeMesSeguinte}
                  aria-label="Próximo mês"
                  style={getCarouselBtnNavStyle(t, !podeMesSeguinte)}
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
              {modo !== "escritorio" ? (
                <FiltroEstudioSelect
                  id="rh-gestao-escala-filtro-estudio"
                  value={filtroEstudioEscalaEfetivo}
                  onChange={setFiltroEstudioEscala}
                  estudios={estudiosAtivosEscala}
                  todosValue={FILTRO_STAFF_ESTUDIO_TODOS}
                  extraOptions={[{ value: FILTRO_STAFF_ESTUDIO_NENHUM, label: "Nenhum" }]}
                  minWidth={200}
                  disabled={filtroArea !== "game_presenter"}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setHistoricoModalAberto(true)}
              aria-label="Abrir histórico de ações da escala neste mês"
              title="Histórico"
              style={{
                ...getFiltroBarPillStateStyle(t, brand, false),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                padding: 0,
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              <History size={15} aria-hidden="true" />
            </button>
          </div>

          {mostrarFiltroArea ? (
            <div
              role="group"
              aria-label="Área (time)"
              style={{
                marginTop: 14,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
              }}
            >
              {abasTimes.map((aba) => {
                const key = aba.areaKey;
                const ativo = filtroArea === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setFiltroArea(key)}
                    style={{
                      padding: "10px 14px",
                      minHeight: 44,
                      borderRadius: 10,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      fontSize: 12,
                      cursor: "pointer",
                      border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                      background: ativo
                        ? brand.useBrand
                          ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                          : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                        : (t.inputBg ?? t.cardBg ?? "transparent"),
                      color: ativo ? brand.accent : t.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {labelAreaEscala(key, abasTimes)}
                  </button>
                );
              })}
            </div>
          ) : null}
      </div>

      {erroPrestadores && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroPrestadores}
        </div>
      )}

      {erroSalvarGrade && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT.body,
            color: "#e84025",
            border: "1px solid rgba(232,64,37,0.35)",
            background: "rgba(232,64,37,0.08)",
          }}
        >
          {erroSalvarGrade}
        </div>
      )}

      <div role="region" aria-label="Gestão de escala por colaborador e dia">
        {loadingPrestadores ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 10 }}>
            <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
            <span style={{ color: t.textMuted, fontSize: 13 }}>Carregando gestão de escala…</span>
          </div>
        ) : (
          <>
            {resumoTurnoDias && mostrarFiltroArea ? (
              <section
                aria-label="Consolidado - quantidade de Prestadores no dia por turno"
                style={contentBox}
              >
                <SectionTitle
                  sub={
                    resumoTurnoDias.drilldownPorEstudio
                      ? "clique no turno ou no estúdio para filtrar a Escala Diária · seta para expandir"
                      : "clique num turno para filtrar a Escala Diária"
                  }
                >
                  Consolidado
                </SectionTitle>
                <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                <table
                  style={{
                    width: "100%",
                    minWidth: CONSOLIDADO_COL_TURNO_W + dias.length * 44,
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  <caption style={{ display: "none" }}>
                    Consolidado - quantidade de Prestadores no dia por turno. Linhas de turno são clicáveis para filtrar a
                    tabela Escala Diária.{" "}
                    {resumoTurnoDias.modoEscritorio
                      ? "Totais por turno Comercial e TOTAL por dia."
                      : resumoTurnoDias.mostrarLinhaComercial
                        ? resumoTurnoDias.temLinhaTardeConsolidado
                          ? "Totais por turno Comercial, Manhã, Tarde, Noite e TOTAL por dia."
                          : "Totais por turno Comercial, Manhã, Noite e TOTAL por dia."
                        : resumoTurnoDias.temLinhaTardeConsolidado
                          ? "Totais por turno Manhã, Tarde, Noite e TOTAL por dia."
                          : "Totais por turno Manhã, Noite e TOTAL por dia."}
                  </caption>
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_HEAD, fundoStickyConsolidadoTurno, {
                          fontSize: CONSOLIDADO_FONT_HEADER,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        })}
                      >
                        Turno
                      </th>
                      {dias.map((dia) => (
                        <th
                          key={`resumo-h-${dia.iso}`}
                          scope="col"
                          style={thDiaConsolidado(dia)}
                          title={dia.feriadoNome ? `${dia.iso} · ${dia.feriadoNome}` : dia.iso}
                        >
                          <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dia.dia}</div>
                          <div style={{ fontWeight: 600, textTransform: "lowercase", opacity: 0.95 }}>{dia.dowShort}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumoTurnoDias.modoEscritorio ? (
                      <tr>
                        <th
                          scope="row"
                          style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_ROW, fundoStickyConsolidadoTurno, {
                            fontWeight: 700,
                            fontSize: CONSOLIDADO_FONT_TURNO,
                            padding: 0,
                          })}
                        >
                          <button
                            type="button"
                            aria-pressed={filtroTurnoConsolidado === "comercial"}
                            aria-label="Filtrar Escala Diária pelo turno comercial"
                            onClick={() => alternarFiltroTurnoConsolidado("comercial")}
                            style={estiloBotaoTurnoConsolidado(filtroTurnoConsolidado === "comercial")}
                          >
                            Comercial
                          </button>
                        </th>
                        {resumoTurnoDias.comercial.map((n, idx) => {
                          const d = dias[idx]!;
                          return (
                            <td
                              key={`resumo-c-${d.iso}`}
                              style={getTdStyle(t, {
                                textAlign: "center",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                ...(diaComDestaqueCalendario(d)
                                  ? {
                                      background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                      color: "#f59e0b",
                                    }
                                  : {}),
                              })}
                            >
                              {n}
                            </td>
                          );
                        })}
                      </tr>
                    ) : (
                      <>
                    {resumoTurnoDias.mostrarLinhaComercial ? (
                      <tr>
                        <th
                          scope="row"
                          style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_ROW, fundoStickyConsolidadoTurno, {
                            fontWeight: 700,
                            fontSize: CONSOLIDADO_FONT_TURNO,
                            padding: 0,
                          })}
                        >
                          <button
                            type="button"
                            aria-pressed={filtroTurnoConsolidado === "comercial"}
                            aria-label="Filtrar Escala Diária pelo turno comercial"
                            onClick={() => alternarFiltroTurnoConsolidado("comercial")}
                            style={estiloBotaoTurnoConsolidado(filtroTurnoConsolidado === "comercial")}
                          >
                            Comercial
                          </button>
                        </th>
                        {resumoTurnoDias.comercial.map((n, idx) => {
                          const d = dias[idx]!;
                          return (
                            <td
                              key={`resumo-c-ac-${d.iso}`}
                              style={getTdStyle(t, {
                                textAlign: "center",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                ...(diaComDestaqueCalendario(d)
                                  ? {
                                      background: t.isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.12)",
                                      color: "#f59e0b",
                                    }
                                  : {}),
                              })}
                            >
                              {n}
                            </td>
                          );
                        })}
                      </tr>
                    ) : null}
                    {renderLinhaTurnoConsolidadoComDrill(
                      "manha",
                      "Turno da Manhã",
                      resumoTurnoDias.manha,
                      resumoTurnoDias.manhaPorEstudio,
                      "resumo-m",
                    )}
                    {resumoTurnoDias.temLinhaTardeConsolidado
                      ? renderLinhaTurnoConsolidadoComDrill(
                          "tarde",
                          "Turno da Tarde",
                          resumoTurnoDias.tarde,
                          resumoTurnoDias.tardePorEstudio,
                          "resumo-t",
                        )
                      : null}
                    {renderLinhaTurnoConsolidadoComDrill(
                      "noite",
                      "Turno da Noite",
                      resumoTurnoDias.noite,
                      resumoTurnoDias.noitePorEstudio,
                      "resumo-n",
                    )}
                      </>
                    )}
                    <tr>
                      <th
                        scope="row"
                        style={thConsolidadoTurnoSticky(Z_CONSOLIDADO_STICKY_ROW, dataTable.totalRowBgStrong, {
                          fontWeight: 800,
                          fontSize: CONSOLIDADO_FONT_TURNO,
                          borderTop: `2px solid ${t.cardBorder}`,
                          padding: 0,
                        })}
                      >
                        <button
                          type="button"
                          aria-label="Mostrar na Escala Diária todos os turnos e estúdios"
                          onClick={limparFiltrosConsolidado}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            fontWeight: 800,
                            fontFamily: FONT.body,
                            fontSize: CONSOLIDADO_FONT_TURNO,
                            padding: "10px 12px",
                            margin: 0,
                            border: "none",
                            borderLeft: "3px solid transparent",
                            boxSizing: "border-box",
                            background: dataTable.totalRowBgStrong,
                            color: t.text,
                            cursor: "pointer",
                            borderRadius: 0,
                          }}
                        >
                          TOTAL
                        </button>
                      </th>
                      {resumoTurnoDias.total.map((n, idx) => {
                        const d = dias[idx]!;
                        return (
                          <td
                            key={`resumo-tot-${d.iso}`}
                            style={getTdStyle(t, {
                              textAlign: "center",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 800,
                              borderTop: `2px solid ${t.cardBorder}`,
                              background: fundoCelulaTotalConsolidado(d),
                              color: diaComDestaqueCalendario(d) ? "#f59e0b" : t.text,
                            })}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
                </div>
              </section>
            ) : null}
            <section
              aria-label="Escala Diária - Definição de status diário por Prestador"
              style={contentBox}
            >
              <SectionTitle sub="definição de status diário por Prestador">
                Escala Diária
              </SectionTitle>
              <div
                style={{
                  marginBottom: 14,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {mostrarFiltroArea && podeEditarGrade && modo !== "escritorio" ? (
                    <>
                      {posSugestaoAtiva(gerarPorFiltro[filtroArea]) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const est = gerarPorFiltro[filtroArea];
                              if (escalaGradeAprovadaNaBase(est)) {
                                setNovaEscalaModalArea(filtroArea);
                                return;
                              }
                              setGerarPorFiltro((prev) => ({
                                ...prev,
                                [filtroArea]: {
                                  celulas: {},
                                  baseline: null,
                                  celulasSincronizadasComDb: null,
                                  posSugestao: false,
                                  posSugestaoCs: false,
                                  statusGradeDb: null,
                                  aprovadoEmDb: null,
                                  aprovadoPorDb: null,
                                  alteracoesPorCelula: undefined,
                                },
                              }));
                              void registrarHistoricoEscalaAcao(refMesISO(ano, mes), filtroArea, "nova_escala");
                            }}
                            aria-label="Iniciar nova escala em rascunho"
                            style={
                              escalaGradeAprovadaNaBase(gerarPorFiltro[filtroArea])
                                ? escalaToolbarBtnVermelho({ cursor: "pointer" })
                                : escalaToolbarBtnNeutro(t, { cursor: "pointer" })
                            }
                          >
                            Nova Escala
                          </button>
                          {mostrarSalvarAlteracoes ? (
                            <button
                              type="button"
                              disabled={salvandoGrade}
                              onClick={() => void salvarGradeEscalaDb(filtroArea)}
                              aria-label="Salvar alterações da escala na base de dados"
                              style={escalaToolbarBtnAzul({
                                cursor: salvandoGrade ? "wait" : "pointer",
                                opacity: salvandoGrade ? 0.65 : 1,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              })}
                            >
                              {salvandoGrade ? (
                                <Loader2 size={16} className="app-lucide-spin" color={ESCALA_TOOLBAR_AZUL} aria-hidden />
                              ) : null}
                              Salvar Alterações
                            </button>
                          ) : null}
                          {!escalaGradeAprovadaNaBase(gerarPorFiltro[filtroArea]) ? (
                            <button
                              type="button"
                              disabled={salvandoGrade}
                              onClick={() => void aprovarEscalaGerar(filtroArea)}
                              aria-label="Aprovar escala e bloquear edição manual da grade"
                              style={escalaToolbarBtnVerde({
                                cursor: salvandoGrade ? "wait" : "pointer",
                                opacity: salvandoGrade ? 0.65 : 1,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              })}
                            >
                              {salvandoGrade ? (
                                <Loader2 size={16} className="app-lucide-spin" color={ESCALA_TOOLBAR_VERDE} aria-hidden />
                              ) : null}
                              Aprovar Escala
                            </button>
                          ) : null}
                        </>
                      ) : acaoGerarNoFiltroSelecionado === "sugestao" ? (
                        <button
                          type="button"
                          onClick={() => void aplicarSugestaoEscalaArea(filtroArea)}
                          aria-label="Gerar sugestão de escala para a área selecionada"
                          style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: `1px solid ${brand.accent}`,
                            background: brand.useBrand
                              ? "color-mix(in srgb, var(--brand-action, #7c3aed) 18%, transparent)"
                              : "rgba(124,58,237,0.12)",
                            color: brand.accent,
                            fontFamily: FONT.body,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Sugestão de Escala
                        </button>
                      ) : acaoGerarNoFiltroSelecionado === "aprovar" ? (
                        <button
                          type="button"
                          disabled={salvandoGrade}
                          onClick={() => void aprovarEscalaGerar(filtroArea)}
                          aria-label="Aprovar escala da área selecionada"
                          style={escalaToolbarBtnVerde({
                            cursor: salvandoGrade ? "wait" : "pointer",
                            opacity: salvandoGrade ? 0.65 : 1,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          })}
                        >
                          {salvandoGrade ? (
                            <Loader2 size={16} className="app-lucide-spin" color={ESCALA_TOOLBAR_VERDE} aria-hidden />
                          ) : null}
                          Aprovar Escala
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {mostrarBotaoAlterarEscala ? (
                    <button
                      type="button"
                      onClick={() => setAlterarEscalaModalAberto(true)}
                      aria-label="Alterar status de um prestador em um dia da escala aprovada"
                      style={escalaToolbarBtnAzul({ cursor: "pointer" })}
                    >
                      Alterar Escala
                    </button>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: "1 1 200px",
                    maxWidth: 400,
                    minWidth: 0,
                  }}
                >
                  <BarraPesquisaPagina
                    value={filtroNicknameEscala}
                    onChange={setFiltroNicknameEscala}
                    placeholder={semColunaNickname ? PAGE_SEARCH.nome : PAGE_SEARCH.nomeNickname}
                    aria-label={
                      semColunaNickname
                        ? "Filtrar tabela de escala por nome"
                        : "Filtrar tabela de escala por nome ou nickname"
                    }
                    wrapperStyle={{ flex: 1, minWidth: 0, width: "100%" }}
                  />
                </div>
              </div>
              <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table
              style={{
                width: "100%",
                minWidth:
                  (semColunaNome ? 0 : STICKY_W_NOME) +
                  (semColunaNickname ? 0 : STICKY_W_NICK) +
                  (semColunaTurno ? 0 : STICKY_W_TURNO_STAFF) +
                  dias.length * 80,
                borderCollapse: "separate",
                borderSpacing: 0,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              <caption style={{ display: "none" }}>
                Escala Diária - Definição de status diário por Prestador.{" "}
                {semColunasNickTurno
                  ? "Grade mensal por colaborador e dia do mês (sem nickname e turno)."
                  : semColunaNickname
                    ? "Grade mensal por colaborador e dia do mês (sem nickname)."
                  : semColunaNome
                    ? "Grade por nickname, turno e dia do mês (coluna Nome oculta nesta área)."
                    : "Grade mensal por colaborador e dia do mês."}
              </caption>
              <thead>
                <tr>
                  {!semColunaNome ? (
                    <SortTableTh<EscalaDiariaSortCol>
                      label="Nome"
                      col="nome"
                      sortCol={sortEscalaDiaria.col}
                      sortDir={sortEscalaDiaria.dir}
                      onSort={onSortEscalaDiaria}
                      thStyle={thSticky(0, {
                        minWidth: STICKY_W_NOME,
                        maxWidth: STICKY_W_NOME,
                        width: STICKY_W_NOME,
                        verticalAlign: "middle",
                        zIndex: Z_STICKY_HEAD_NOME,
                        ...(semColunaTurno && semColunaNickname
                          ? {
                              borderRight: `1px solid ${t.cardBorder}`,
                              boxShadow: sombraColFixa,
                            }
                          : {
                              ...seloStickyDireita(fundoStickyCabecalho),
                            }),
                      })}
                    />
                  ) : null}
                  {!semColunaNickname ? (
                    <SortTableTh<EscalaDiariaSortCol>
                      label="Nickname"
                      col="nickname"
                      sortCol={sortEscalaDiaria.col}
                      sortDir={sortEscalaDiaria.dir}
                      onSort={onSortEscalaDiaria}
                      thStyle={thSticky(stickyLeftNick, {
                        minWidth: STICKY_W_NICK,
                        maxWidth: STICKY_W_NICK,
                        width: STICKY_W_NICK,
                        verticalAlign: "middle",
                        zIndex: semColunaNome ? Z_STICKY_HEAD_NOME : Z_STICKY_HEAD_NICK,
                        ...seloStickyDireita(fundoStickyCabecalho),
                      })}
                      align="center"
                    />
                  ) : null}
                  {!semColunaTurno ? (
                    <SortTableTh<EscalaDiariaSortCol>
                      label="Turno"
                      col="turno"
                      sortCol={sortEscalaDiaria.col}
                      sortDir={sortEscalaDiaria.dir}
                      onSort={onSortEscalaDiaria}
                      title="Referência do cadastro na Gestão de Staff (perfil de turno / contrato)."
                      thStyle={thSticky(stickyLeftTurno, {
                        minWidth: STICKY_W_TURNO_STAFF,
                        maxWidth: STICKY_W_TURNO_STAFF,
                        width: STICKY_W_TURNO_STAFF,
                        verticalAlign: "middle",
                        borderRight: `1px solid ${t.cardBorder}`,
                        boxShadow: sombraColFixa,
                        zIndex: semColunaNome && semColunaNickname ? Z_STICKY_HEAD_NOME : Z_STICKY_HEAD_TURNO,
                      })}
                      align="center"
                    />
                  ) : null}
                  {dias.map((dia) => (
                    <th
                      key={dia.iso}
                      scope="col"
                      style={thDiaConsolidado(dia)}
                      title={dia.feriadoNome ? `${dia.iso} · ${dia.feriadoNome}` : dia.iso}
                    >
                      <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dia.dia}</div>
                      <div style={{ fontWeight: 600, textTransform: "lowercase", opacity: 0.95 }}>{dia.dowShort}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colunasFixasEscalaDiaria + dias.length}
                      style={{
                        ...getTdStyle(t),
                        textAlign: "center",
                        padding: "36px 16px",
                        color: t.textMuted,
                      }}
                    >
                      {msgTabelaVazia}
                    </td>
                  </tr>
                ) : linhasFiltradasEscalaDiaria.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colunasFixasEscalaDiaria + dias.length}
                      style={{
                        ...getTdStyle(t),
                        textAlign: "center",
                        padding: "36px 16px",
                        color: t.textMuted,
                        fontFamily: FONT.body,
                        fontSize: 13,
                      }}
                    >
                      {linhasAposNickname.length === 0 && filtroNicknameEscala.trim()
                        ? semColunaNickname
                          ? "Nenhum colaborador corresponde à pesquisa por nome."
                          : "Nenhum colaborador corresponde à pesquisa por nome ou nickname."
                        : filtroTurnoConsolidado != null && linhasAposNickname.length > 0
                          ? "Nenhum colaborador com o turno selecionado."
                          : filtroEstudioEscalaEfetivo !== FILTRO_STAFF_ESTUDIO_TODOS
                            ? "Nenhum colaborador com o estúdio selecionado."
                          : "Nenhum colaborador corresponde aos filtros aplicados."}
                    </td>
                  </tr>
                ) : (
                  linhasPaginaEscalaDiaria.map((row, i) => {
                    const bg = zebraBgLinha(paginaEscalaSafe * TABELA_PAGE_SIZE_ESCALA + i);
                    return (
                      <tr key={row.id} style={{ isolation: "isolate" }}>
                        {!semColunaNome ? (
                          <td
                            style={tdSticky(0, bg, Z_BODY_NOME, {
                              maxWidth: STICKY_W_NOME,
                              width: STICKY_W_NOME,
                              minWidth: STICKY_W_NOME,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              ...(semColunaTurno && semColunaNickname
                                ? {
                                    borderRight: `1px solid ${t.cardBorder}`,
                                    boxShadow: sombraColFixa,
                                  }
                                : {
                                    ...seloStickyDireita(bg),
                                  }),
                            })}
                            title={row.nomeCompletoCadastro}
                          >
                            {row.nome}
                          </td>
                        ) : null}
                        {!semColunaNickname ? (
                          <td
                            style={tdSticky(stickyLeftNick, bg, semColunaNome ? Z_BODY_NOME : Z_BODY_NICK, {
                              minWidth: STICKY_W_NICK,
                              width: STICKY_W_NICK,
                              maxWidth: STICKY_W_NICK,
                              ...seloStickyDireita(bg),
                            })}
                            title={semColunaNome ? row.nomeCompletoCadastro : undefined}
                          >
                            {row.nickname}
                          </td>
                        ) : null}
                        {!semColunaTurno ? (
                          <td
                            style={tdSticky(
                              stickyLeftTurno,
                              bg,
                              semColunaNome && semColunaNickname ? Z_BODY_NOME : Z_BODY_TURNO_STAFF,
                              {
                                minWidth: STICKY_W_TURNO_STAFF,
                                width: STICKY_W_TURNO_STAFF,
                                maxWidth: STICKY_W_TURNO_STAFF,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                borderRight: `1px solid ${t.cardBorder}`,
                                boxShadow: sombraColFixa,
                              },
                            )}
                            title={row.turnoStaffNome || "Sem turno configurado na Staff para esta escala."}
                          >
                            {row.turnoStaffNome || "—"}
                          </td>
                        ) : null}
                        {dias.map((dia) => {
                          const ck = chaveCelulaGerar(row.id, dia.iso);
                          const bruto = celulasGerarAtivas?.[ck] ?? "";
                          const gradeAprovada = escalaGradeAprovadaNaBase(estGradeFiltro);
                          const val = gradeAprovada
                            ? sanitizarValorCelulaAlterarEscala(bruto, modo, filtroArea)
                            : sanitizarValorCelulaGerar(row.siglaTurnoStaff, bruto, row.turnoStaffNome, modo, filtroArea);
                          const opts = opcoesSelectCelulaGerar(row, modo, filtroArea);
                          const textoCelula = gradeAprovada
                            ? labelExibicaoCelulaAlterarEscala(celulasGerarAtivas?.[ck], modo, filtroArea)
                            : labelExibicaoCelulaEscala(
                                row.siglaTurnoStaff,
                                celulasGerarAtivas?.[ck],
                                row.turnoStaffNome,
                                modo,
                                filtroArea,
                              );
                          const alteracaoMeta = alteracoesPorCelulaAtivas?.[ck];
                          const valorAnteriorLabel = alteracaoMeta
                            ? gradeAprovada
                              ? labelExibicaoCelulaAlterarEscala(alteracaoMeta.valorAnterior, modo, filtroArea)
                              : labelExibicaoCelulaEscala(
                                  row.siglaTurnoStaff,
                                  alteracaoMeta.valorAnterior,
                                  row.turnoStaffNome,
                                  modo,
                                  filtroArea,
                                )
                            : "";
                          return (
                            <td
                              key={`${row.id}-${dia.iso}`}
                              style={{
                                ...tdDia,
                                background: fundoColunaDia(dia, bg),
                                ...(podeEditarCelulasDia ? { minWidth: 76, maxWidth: 86 } : {}),
                                ...(alteracaoMeta
                                  ? { position: "relative" as const, overflow: "visible" as const }
                                  : {}),
                              }}
                            >
                              {podeEditarCelulasDia ? (
                                <select
                                  aria-label={`Escala do dia ${dia.dia} para ${row.nomeCompletoCadastro}`}
                                  value={val}
                                  onChange={(e) =>
                                    atualizarCelulaGerar(
                                      filtroArea,
                                      row.id,
                                      dia.iso,
                                      row.siglaTurnoStaff,
                                      row.turnoStaffNome,
                                      e.target.value,
                                    )
                                  }
                                  style={selectCelulaGerarStyle}
                                >
                                  {opts.map((o) => (
                                    <option key={o.value === "" ? "__empty" : o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <>
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: t.text,
                                      lineHeight: 1.2,
                                      padding: "2px 0",
                                      textAlign: "center",
                                    }}
                                  >
                                    {textoCelula}
                                  </span>
                                  {alteracaoMeta ? (
                                    <CelulaIndicadorAlteracaoEscala
                                      meta={alteracaoMeta}
                                      valorAnteriorLabel={valorAnteriorLabel}
                                      t={t}
                                    />
                                  ) : null}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
              </div>
              {linhasOrdenadasEscalaDiaria.length > 0 ? (
                <TabelaPaginacaoBar
                  t={t}
                  page={paginaEscalaSafe}
                  pageSize={TABELA_PAGE_SIZE_ESCALA}
                  totalItems={linhasOrdenadasEscalaDiaria.length}
                  onPageChange={setPaginaEscalaDiaria}
                />
              ) : null}
            </section>
          </>
        )}
      </div>

      {historicoModalAberto ? (
        <ModalHistoricoEscala
          refMesIso={refMesISO(ano, mes)}
          areaKey={filtroArea}
          areaLabel={labelAreaEscala(filtroArea, abasTimes)}
          tituloMes={tituloMes}
          onClose={() => setHistoricoModalAberto(false)}
        />
      ) : null}

      {alterarEscalaModalAberto ? (
        <ModalAlterarEscala
          areaKey={filtroArea}
          refMesIso={refMesISO(ano, mes)}
          hojeIso={hojeIso}
          dias={dias}
          prestadores={linhas}
          celulas={gerarPorFiltro[filtroArea]?.celulas ?? {}}
          canEditar={podeAlterarEscalaAprovada}
          sanitizarValor={(_sigla, valor) => sanitizarValorCelulaAlterarEscala(valor, modo, filtroArea)}
          opcoesSelectCelula={() => opcoesSelectCelulaAlterarEscala(modo, filtroArea)}
          labelExibicaoCelula={(_sigla, valor) => labelExibicaoCelulaAlterarEscala(valor, modo, filtroArea)}
          chaveCelula={chaveCelulaGerar}
          onClose={() => setAlterarEscalaModalAberto(false)}
          onCelulaAlterada={confirmarAlteracaoCelulaAprovada}
        />
      ) : null}

      {novaEscalaModalArea ? (
        <ModalBase
          maxWidth={440}
          onClose={() => {
            if (!resetandoGrade) setNovaEscalaModalArea(null);
          }}
        >
          <ModalHeader
            title="Refazer escala aprovada?"
            onClose={() => {
              if (!resetandoGrade) setNovaEscalaModalArea(null);
            }}
          />
          <div style={{ padding: "0 4px 8px", fontFamily: FONT.body }}>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: t.text, lineHeight: 1.5 }}>
              Esta escala já estava aprovada e disponibilizada para os Prestadores, deseja refazer?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={resetandoGrade}
                onClick={() => setNovaEscalaModalArea(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: resetandoGrade ? "not-allowed" : "pointer",
                }}
              >
                Não
              </button>
              <button
                type="button"
                disabled={resetandoGrade}
                onClick={() => {
                  const ak = novaEscalaModalArea;
                  void (async () => {
                    const ok = await resetarGradeEscalaDb(ak);
                    if (ok) setNovaEscalaModalArea(null);
                  })();
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${brand.accent}`,
                  background: brand.useBrand
                    ? "color-mix(in srgb, var(--brand-action, #7c3aed) 22%, transparent)"
                    : "rgba(124,58,237,0.14)",
                  color: brand.accent,
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: FONT.body,
                  cursor: resetandoGrade ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {resetandoGrade ? <Loader2 size={16} className="app-lucide-spin" aria-hidden /> : null}
                Sim
              </button>
            </div>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}
