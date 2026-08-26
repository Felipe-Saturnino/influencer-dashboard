import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Archive, Ban, Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Store, Undo2, User, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import {
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroHistoricoButton,
  FiltroSolicitacoesTipoAcaoSelect,
  SectionTitle,
  SortTableTh,
  type SortDir,
} from "../../../components/dashboard";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { FiltroBarCampoSelect } from "../../../components/FiltroBarCampoSelect";
import { FiltroEntidadeBarSelect } from "../../../components/FiltroEntidadeBarSelect";
import { FiltroMinhasNegociacoesButton } from "../../../components/FiltroMinhasNegociacoesButton";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import {
  AjudaContextualAcoes,
  type AjudaContextualTutorial,
} from "../../../components/AjudaContextualAcoes";
import { FilterBarIcons } from "../../../lib/filterBarIconCatalog";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { FILTRO_BAR_TAB_ICON_SIZE, getFilterBarRowStyle, getFilterBarWrapperStyle } from "../../../lib/filterBarStyles";
import { getPageContentBoxStyle } from "../../../lib/pageContentBoxStyles";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { compareLocaleTexto } from "../../../lib/classificacaoSort";
import { PAGE_SEARCH, placeholderPesquisaFiltro } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import {
  ESCALA_ACAO_TIPO_OPCOES_MINHAS,
  ESCALA_ACAO_TIPO_OPCOES_MARKETPLACE_TODAS,
  ESCALA_ACAO_TIPO_OPCOES_SPIN,
  OFERTA_STATUS_LABEL,
  RH_CALENDARIO_ACAO_LABEL_FORMAL,
  type EscalaAcaoFiltro,
  type LinhaOfertaMarketplace,
  type MarketplaceTimeFiltro,
} from "../../../lib/escalaTurnosUiConstants";
import type { RhCalendarioAcaoTipo } from "../../../lib/rhCalendarioAcaoHelpers";
import {
  ESCALA_CARROSSEL_MESES_PT,
  getMesesDisponiveisEscalaCarrossel,
  getMesesDisponiveisEscalaCarrosselComMesSeguinte,
  idxMesInicialEscalaCarrossel,
  type MesCarrosselEscalaEntry,
} from "../../../lib/escalaMesCarrosselOverviewStyle";
import {
  carregarMeuContextoMarketplace,
  carregarMinhaGradeMarketplace,
  carregarMinhaGradeMarketplaceMeses,
  carregarOfertasMarketplace,
  ehOfertaSpinBlocoFolga,
  ehOfertaSpinBlocoTurno,
  filtroTimeGrupoNegociacaoMarketplace,
  isDataNoHistoricoMarketplace,
  marketplaceMostrarNovaOferta,
  marketplaceMostrarNovaOfertaSpin,
  marketplacePodeAceitarOfertaSpin,
  marketplacePodeCancelarOfertaSpin,
  marketplacePodeEditarOferta,
  marketplacePodeMinhasNegociacoes,
  marketplacePodeProporNoMural,
  marketplaceVisaoGestao,
  ofertaPassaFiltroTimeMarketplace,
  overlayIdentidadeMarketplaceOfertas,
  type MarketplaceMeuContexto,
  type MarketplaceMinhaGrade,
  competenciaAnoMes,
} from "../../../lib/escalaMarketplace";
import { ModalOfertarMarketplace } from "./ModalOfertarMarketplace";
import { ModalOfertarSpin } from "./ModalOfertarSpin";
import { ModalAceitarOfertaMarketplace } from "./ModalAceitarOfertaMarketplace";
import { ModalAceitarOfertaSpin } from "./ModalAceitarOfertaSpin";
import { ModalCancelarOfertaMarketplace } from "./ModalCancelarOfertaMarketplace";
import { ModalDecidirTrocaMarketplace, type DecisaoOfertaMarketplace } from "./ModalDecidirTrocaMarketplace";

/** Times que negociam turnos no Marketplace (escopo Ver = Sim). Liderança = SL + SM. */
const TUTORIAL_MARKETPLACE_OFERTAS: AjudaContextualTutorial = {
  id: "marketplace-ofertas",
  urlSlug: "MarketplaceOfertas",
};

const MARKETPLACE_TIME_TODOS_VALUE = "todos";
const MARKETPLACE_TIME_TODOS_LABEL = "Todos Times";
const MARKETPLACE_TIME_ARIA_LABEL = "Times";
const MARKETPLACE_TIME_OPCOES: { value: MarketplaceTimeFiltro; label: string }[] = [
  { value: "game_presenter", label: "Game Presenter" },
  { value: "shuffler", label: "Shuffler" },
  { value: "lideranca", label: "Liderança" },
];

const MSG_VAZIO_OFERTAS = "Sem ofertas para os filtros selecionados.";

/** Filtro de dia na barra (aba Todas as Ofertas) — vazio = todos os dias do período. */
const MARKETPLACE_DIA_TODOS_LABEL = "Todos os Dias";
const MARKETPLACE_DIA_ARIA_PREFIX = "Filtrar por dia";
const MARKETPLACE_DIA_LISTBOX_LABEL = "Dias com ofertas";
const GRADE_VAZIA: MarketplaceMinhaGrade = { aprovada: false, areaKey: "", valorPorIso: new Map() };

/**
 * TEMP TESTE — o carrossel oficial da Escala começa em agosto/2026.
 * Inclui julho/2026 e abre nele só nesta página para validação do Marketplace.
 * Remover `TEMP_MARKETPLACE_INCLUIR_JULHO` e voltar a `getMesesDisponiveisEscalaCarrosselComMesSeguinte`
 * + `idxMesInicialEscalaCarrossel` quando os testes terminarem.
 */
const TEMP_MARKETPLACE_INCLUIR_JULHO = true;
const TEMP_JULHO_2026: MesCarrosselEscalaEntry = {
  ano: 2026,
  mes: 6,
  label: `${ESCALA_CARROSSEL_MESES_PT[6]} 2026`,
};

function getMesesMarketplace(hoje = new Date()): MesCarrosselEscalaEntry[] {
  const base = getMesesDisponiveisEscalaCarrosselComMesSeguinte(hoje);
  if (!TEMP_MARKETPLACE_INCLUIR_JULHO) return base;
  if (base.some((m) => m.ano === TEMP_JULHO_2026.ano && m.mes === TEMP_JULHO_2026.mes)) return base;
  return [TEMP_JULHO_2026, ...base];
}

/** Meses cuja grade aprovada alimenta Ofertar / Aceitar — igual ao carrossel do Marketplace. */
function getMesesGradeOfertarMarketplace(hoje = new Date()): MesCarrosselEscalaEntry[] {
  return getMesesMarketplace(hoje);
}

function idxMesInicialMarketplace(meses: MesCarrosselEscalaEntry[], hoje = new Date()): number {
  if (TEMP_MARKETPLACE_INCLUIR_JULHO) {
    const idxJulho = meses.findIndex((m) => m.ano === TEMP_JULHO_2026.ano && m.mes === TEMP_JULHO_2026.mes);
    if (idxJulho >= 0) return idxJulho;
  }
  return idxMesInicialEscalaCarrossel(meses, hoje);
}

function refMesIsoPrimeiroDia(ano: number, mes0: number): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${p2(mes0 + 1)}-01`;
}

function refMesIsoDaData(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

type OfertaSortCol =
  | "dataOferta"
  | "tipo"
  | "turnoOferta"
  | "estudio"
  | "ofertante"
  | "observacao"
  | "dataInteresse"
  | "turnoInteresse"
  | "comprador"
  | "status";

/** Blocos da aba Minhas Ofertas — cada um com o seu conjunto de colunas. */
type MinhasVariant = "abertas" | "aceitei" | "historico";

/** Blocos da aba Ofertas Encerradas (Ver = Sim). */
type EncerradasVariant = "aceitas" | "canceladas";

type MarketplaceAba = "todas" | "minhas" | "encerradas" | "spin";
const MARKETPLACE_ABAS: readonly MarketplaceAba[] = ["todas", "minhas", "encerradas", "spin"];

/** Estúdio do prestador ofertante; ofertas legadas sem estúdio caem no rótulo de operadora. */
function estudioDaOferta(row: LinhaOfertaMarketplace): string {
  return row.estudio?.trim() || row.operadora;
}

function tableRowHoverBg(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
}

function valorOrdenacaoOferta(row: LinhaOfertaMarketplace, col: OfertaSortCol): string {
  switch (col) {
    case "dataOferta":
      return row.dataOfertaIso.slice(0, 10);
    case "tipo":
      return RH_CALENDARIO_ACAO_LABEL_FORMAL[row.tipo as RhCalendarioAcaoTipo] ?? row.tipo;
    case "turnoOferta":
      return row.turnoOferta;
    case "estudio":
      return estudioDaOferta(row);
    case "ofertante":
      return row.ofertante;
    case "observacao":
      return row.observacao ?? "";
    case "dataInteresse":
      return row.dataInteresseIso ?? "";
    case "turnoInteresse":
      return row.turnoInteresse ?? "";
    case "comprador":
      return row.comprador ?? "";
    case "status":
      return row.status ? OFERTA_STATUS_LABEL[row.status] : "";
    default:
      return "";
  }
}

function ordenarOfertas(
  rows: LinhaOfertaMarketplace[],
  sort: { col: OfertaSortCol; dir: SortDir },
): LinhaOfertaMarketplace[] {
  const arr = [...rows];
  const { col, dir } = sort;
  arr.sort((a, b) => {
    const c = compareLocaleTexto(valorOrdenacaoOferta(a, col), valorOrdenacaoOferta(b, col), dir);
    if (c !== 0) return c;
    return compareLocaleTexto(a.id, b.id, "asc");
  });
  return arr;
}

function inicioFimMesUtc(ano: number, mes0: number): { ini: string; fim: string } {
  const ini = new Date(Date.UTC(ano, mes0, 1));
  const fim = new Date(Date.UTC(ano, mes0 + 1, 0));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    ini: `${ini.getUTCFullYear()}-${p2(ini.getUTCMonth() + 1)}-${p2(ini.getUTCDate())}`,
    fim: `${fim.getUTCFullYear()}-${p2(fim.getUTCMonth() + 1)}-${p2(fim.getUTCDate())}`,
  };
}

/** `2026-07-05` → `05/07/2026` (rótulo do filtro de dia). */
function labelDiaBr(dataIso: string): string {
  const [y, mo, d] = dataIso.slice(0, 10).split("-");
  if (!y || !mo || !d) return dataIso;
  return `${d}/${mo}/${y}`;
}

function dataIsoNoMes(dataIso: string, ano: number, mes0: number): boolean {
  const s = dataIso.slice(0, 10);
  const { ini, fim } = inicioFimMesUtc(ano, mes0);
  return s >= ini && s <= fim;
}

function passaFiltroTipo(row: LinhaOfertaMarketplace, filtro: EscalaAcaoFiltro): boolean {
  if (filtro === "todos") return true;
  return row.tipo === filtro;
}

function passaFiltroTime(row: LinhaOfertaMarketplace, filtro: MarketplaceTimeFiltro): boolean {
  return ofertaPassaFiltroTimeMarketplace(row.timeKey, filtro);
}

function filtrarPorMesEscala(rows: LinhaOfertaMarketplace[], ano: number, mes0: number): LinhaOfertaMarketplace[] {
  return rows.filter((r) => dataIsoNoMes(r.dataOfertaIso, ano, mes0));
}

/** Oferta ainda disponível para aceite. */
function ofertaEmAberto(row: LinhaOfertaMarketplace): boolean {
  return row.status === "aberto" || row.status === "interessado";
}

/** Inclui proposta de troca reservada, que continua pendente na aba do ofertante. */
function ofertaAtiva(row: LinhaOfertaMarketplace): boolean {
  return ofertaEmAberto(row) || row.status === "em_analise";
}

export default function EscalaMarketplaceTurnosPage() {
  const { theme: t } = useApp();
  const { email: emailEfetivo } = useIdentidadeEfetiva();
  const brand = useDashboardBrand();
  const perm = usePermission("escala_marketplace_turnos");

  const hoje = useMemo(() => new Date(), []);
  const mesesDisponiveis = useMemo(() => getMesesMarketplace(hoje), [hoje]);
  const [idxMes, setIdxMes] = useState(() => idxMesInicialMarketplace(getMesesMarketplace(new Date()), new Date()));
  const [historico, setHistorico] = useState(true);
  const [minhasNegociacoes, setMinhasNegociacoes] = useState(false);

  const idxMesInicial = useMemo(
    () => idxMesInicialMarketplace(mesesDisponiveis, hoje),
    [mesesDisponiveis, hoje],
  );

  useEffect(() => {
    setIdxMes((i) => Math.min(Math.max(0, i), Math.max(0, mesesDisponiveis.length - 1)));
  }, [mesesDisponiveis.length]);

  const [aba, setAba] = useRouteTab("escala_marketplace_turnos", "todas", MARKETPLACE_ABAS);
  const [filtroTipoTodas, setFiltroTipoTodas] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTimeTodas, setFiltroTimeTodas] = useState<MarketplaceTimeFiltro>("todos");
  /** `""` = todos os dias do período (mês do carrossel ou Histórico). */
  const [filtroDiaTodas, setFiltroDiaTodas] = useState("");
  const [filtroTipoMinhas, setFiltroTipoMinhas] = useState<EscalaAcaoFiltro>("todos");
  const [filtroTipoSpin, setFiltroTipoSpin] = useState<EscalaAcaoFiltro>("todos");
  const [busca, setBusca] = useState("");
  const [sortOferta, setSortOferta] = useState<{ col: OfertaSortCol; dir: SortDir }>({
    col: "dataOferta",
    dir: "desc",
  });
  const [ofertas, setOfertas] = useState<LinhaOfertaMarketplace[]>([]);
  const [loadingOfertas, setLoadingOfertas] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [contexto, setContexto] = useState<MarketplaceMeuContexto | null>(null);
  const [gradeMes, setGradeMes] = useState<MarketplaceMinhaGrade>(GRADE_VAZIA);
  const [gradeAceite, setGradeAceite] = useState<MarketplaceMinhaGrade>(GRADE_VAZIA);

  const [ofertarAberto, setOfertarAberto] = useState(false);
  const [ofertarSpinAberto, setOfertarSpinAberto] = useState(false);
  const [ofertaAceitar, setOfertaAceitar] = useState<LinhaOfertaMarketplace | null>(null);
  const [ofertaCancelar, setOfertaCancelar] = useState<LinhaOfertaMarketplace | null>(null);
  const [decisaoTroca, setDecisaoTroca] = useState<{
    oferta: LinhaOfertaMarketplace;
    decisao: DecisaoOfertaMarketplace;
  } | null>(null);
  const [preparandoAceiteId, setPreparandoAceiteId] = useState<string | null>(null);

  const dataTable = useDataTableBlock();

  const onSortOferta = (col: OfertaSortCol) =>
    setSortOferta((s) => ({
      col,
      dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
    }));

  const podeFiltrarTimes = marketplaceVisaoGestao(perm.canView);
  const podeMinhasNegociacoes = marketplacePodeMinhasNegociacoes(perm, contexto?.funcionarioId);
  const visaoPessoal = !podeFiltrarTimes || minhasNegociacoes;
  const mostrarEncerradas = podeFiltrarTimes && !minhasNegociacoes;
  const filtroTimeGrupo = minhasNegociacoes
    ? filtroTimeGrupoNegociacaoMarketplace(contexto?.areaKey)
    : null;

  /** Ver = Sim: Encerradas por defeito. Minhas Ofertas só com Minhas Negociações (ou URL /MinhasOfertas). */
  useEffect(() => {
    if (perm.loading) return;
    if (!podeFiltrarTimes) {
      if (aba === "encerradas" || aba === "spin") setAba("minhas");
      return;
    }
    if (aba === "minhas") {
      if (!minhasNegociacoes) setMinhasNegociacoes(true);
      return;
    }
    if ((aba === "encerradas" || aba === "spin") && minhasNegociacoes) setAba("minhas");
  }, [perm.loading, podeFiltrarTimes, aba, minhasNegociacoes, setAba]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  const refsMesGradeOfertar = useMemo(
    () => getMesesGradeOfertarMarketplace(hoje).map((m) => refMesIsoPrimeiroDia(m.ano, m.mes)),
    [hoje],
  );

  const recarregar = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    void carregarMeuContextoMarketplace(emailEfetivo).then((ctx) => {
      if (!cancelled) setContexto(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, [emailEfetivo]);

  useEffect(() => {
    let cancelled = false;
    setLoadingOfertas(true);
    const refMes = historico
      ? null
      : mesSelecionado
        ? refMesIsoPrimeiroDia(mesSelecionado.ano, mesSelecionado.mes)
        : null;
    void carregarOfertasMarketplace(refMes)
      .then((rows) => {
        if (!cancelled) setOfertas(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingOfertas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historico, mesSelecionado, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    void carregarMinhaGradeMarketplaceMeses(refsMesGradeOfertar).then((g) => {
      if (!cancelled) setGradeMes(g);
    });
    return () => {
      cancelled = true;
    };
  }, [refsMesGradeOfertar, reloadKey]);

  const competenciaFimCarrossel = useMemo(() => {
    const last = mesesDisponiveis[mesesDisponiveis.length - 1];
    if (!last) return null;
    return competenciaAnoMes(last.ano, last.mes);
  }, [mesesDisponiveis]);

  const ofertasEscopo = useMemo(() => {
    const overlay = overlayIdentidadeMarketplaceOfertas(
      ofertas,
      contexto?.funcionarioId ?? null,
      contexto?.areaKey,
    );
    if (perm.canView === "sim") return overlay;
    return overlay.filter((r) => r.mesmoTime || r.souOfertante || r.souInteressado);
  }, [ofertas, contexto?.funcionarioId, contexto?.areaKey, perm.canView]);

  const linhasMes = useMemo(() => {
    if (historico) {
      return ofertasEscopo.filter((r) =>
        isDataNoHistoricoMarketplace(r.dataOfertaIso, hoje, competenciaFimCarrossel),
      );
    }
    const m = mesesDisponiveis[idxMes];
    if (!m) return [];
    return filtrarPorMesEscala(ofertasEscopo, m.ano, m.mes);
  }, [ofertasEscopo, mesesDisponiveis, idxMes, historico, hoje, competenciaFimCarrossel]);

  const diasReservadosUsuario = useMemo(() => {
    const dias = new Set<string>();
    for (const oferta of ofertasEscopo) {
      if (!ofertaAtiva(oferta)) continue;
      if (oferta.souOfertante) dias.add(oferta.dataOfertaIso);
      if (oferta.status === "em_analise" && (oferta.souOfertante || oferta.souInteressado)) {
        dias.add(oferta.dataOfertaIso);
        if (oferta.dataInteresseIso) dias.add(oferta.dataInteresseIso);
      }
    }
    return dias;
  }, [ofertasEscopo]);

  const carrosselPrimeiro = idxMes === 0;
  const carrosselUltimo = idxMes >= mesesDisponiveis.length - 1;

  /** Mural público: só ofertas ainda disponíveis (aceitas/canceladas somem daqui). */
  const linhasTodasBase = useMemo(() => {
    const passaTime = (r: LinhaOfertaMarketplace) => {
      if (minhasNegociacoes) {
        return filtroTimeGrupo != null && passaFiltroTime(r, filtroTimeGrupo);
      }
      return !podeFiltrarTimes || passaFiltroTime(r, filtroTimeTodas);
    };
    return linhasMes.filter(
      (r) =>
        ofertaEmAberto(r) &&
        passaFiltroTipo(r, filtroTipoTodas) &&
        passaTime(r) &&
        textoContemBuscaEmAlgum(busca, r.ofertante, estudioDaOferta(r), r.turnoOferta, r.turnoInteresse),
    );
  }, [
    linhasMes,
    filtroTipoTodas,
    filtroTimeTodas,
    podeFiltrarTimes,
    minhasNegociacoes,
    filtroTimeGrupo,
    busca,
  ]);

  /** Dias com oferta em aberto no período — alimentam o filtro de dia da barra. */
  const diasComOfertaTodas = useMemo(() => {
    const isos = new Set<string>();
    for (const r of linhasTodasBase) isos.add(r.dataOfertaIso.slice(0, 10));
    return [...isos].sort().map((iso) => ({ id: iso, name: labelDiaBr(iso) }));
  }, [linhasTodasBase]);

  /** Dia selecionado deixa de existir ao mudar mês, Histórico, aba ou demais filtros. */
  useEffect(() => {
    if (!filtroDiaTodas) return;
    if (aba !== "todas" || !diasComOfertaTodas.some((d) => d.id === filtroDiaTodas)) {
      setFiltroDiaTodas("");
    }
  }, [aba, diasComOfertaTodas, filtroDiaTodas]);

  const linhasTodasDoDia = useMemo(() => {
    if (!filtroDiaTodas) return linhasTodasBase;
    return linhasTodasBase.filter((r) => r.dataOfertaIso.slice(0, 10) === filtroDiaTodas);
  }, [linhasTodasBase, filtroDiaTodas]);

  const linhasTurnoTodas = useMemo(
    () => linhasTodasDoDia.filter((r) => ehOfertaSpinBlocoTurno(r.tipo)),
    [linhasTodasDoDia],
  );

  const linhasFolgaTodas = useMemo(
    () => linhasTodasDoDia.filter((r) => ehOfertaSpinBlocoFolga(r.tipo)),
    [linhasTodasDoDia],
  );

  const linhasTrocaTodas = useMemo(
    () => linhasTodasDoDia.filter((r) => r.tipo === "oferta_troca"),
    [linhasTodasDoDia],
  );

  const minhasBase = useMemo(
    () =>
      linhasMes.filter(
        (r) =>
          passaFiltroTipo(r, filtroTipoMinhas) &&
          textoContemBuscaEmAlgum(busca, r.ofertante, estudioDaOferta(r), r.turnoOferta, r.turnoInteresse),
      ),
    [linhasMes, filtroTipoMinhas, busca],
  );

  const minhasAbertas = useMemo(
    () => minhasBase.filter((r) => r.souOfertante === true && ofertaAtiva(r)),
    [minhasBase],
  );
  const minhasAceitas = useMemo(
    () => minhasBase.filter((r) => r.souInteressado === true),
    [minhasBase],
  );
  const minhasEncerradas = useMemo(
    () => minhasBase.filter((r) => r.souOfertante === true && !ofertaAtiva(r)),
    [minhasBase],
  );

  /** Gestores (Ver = Sim): todas as aceitas/canceladas, respeitando filtro de time. */
  const encerradasBase = useMemo(
    () =>
      linhasMes.filter(
        (r) =>
          passaFiltroTipo(r, filtroTipoTodas) &&
          passaFiltroTime(r, filtroTimeTodas) &&
          textoContemBuscaEmAlgum(
            busca,
            r.ofertante,
            estudioDaOferta(r),
            r.turnoOferta,
            r.turnoInteresse,
            r.comprador,
          ),
      ),
    [linhasMes, filtroTipoTodas, filtroTimeTodas, busca],
  );
  const encerradasAceitas = useMemo(
    () => encerradasBase.filter((r) => r.status === "aprovada"),
    [encerradasBase],
  );
  const encerradasCanceladas = useMemo(
    () => encerradasBase.filter((r) => r.status === "cancelada"),
    [encerradasBase],
  );

  const spinBase = useMemo(
    () =>
      linhasMes.filter(
        (r) =>
          r.ofertaSpin &&
          passaFiltroTipo(r, filtroTipoSpin) &&
          passaFiltroTime(r, filtroTimeTodas) &&
          textoContemBuscaEmAlgum(busca, r.ofertante, estudioDaOferta(r), r.turnoOferta, r.turnoInteresse),
      ),
    [linhasMes, filtroTipoSpin, filtroTimeTodas, busca],
  );
  const spinAbertas = useMemo(() => spinBase.filter((r) => ofertaEmAberto(r)), [spinBase]);
  const spinAceitas = useMemo(() => spinBase.filter((r) => r.status === "aprovada"), [spinBase]);
  const spinHistorico = useMemo(
    () => spinBase.filter((r) => !ofertaEmAberto(r) && r.status !== "aprovada"),
    [spinBase],
  );

  const mostrarNovaOferta = marketplaceMostrarNovaOferta(
    perm,
    contexto?.funcionarioId,
    minhasNegociacoes,
  );
  const mostrarNovaOfertaSpin = marketplaceMostrarNovaOfertaSpin(perm) && aba === "spin";
  const podeProporNoMural = marketplacePodeProporNoMural(perm, contexto?.funcionarioId);

  const abrirAceite = useCallback(async (row: LinhaOfertaMarketplace) => {
    setPreparandoAceiteId(row.id);
    const grade =
      row.tipo === "oferta_troca"
        ? await carregarMinhaGradeMarketplaceMeses(refsMesGradeOfertar)
        : await carregarMinhaGradeMarketplace(refMesIsoDaData(row.dataOfertaIso));
    setGradeAceite(grade);
    setOfertaAceitar(row);
    setPreparandoAceiteId(null);
  }, [refsMesGradeOfertar]);

  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder
      ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }
      : {}),
  });

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ padding: 24, color: t.textMuted, fontFamily: FONT.body }}>
        Carregando…
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const blocoCarrosselHistorico = (
    <>
      <button
        type="button"
        aria-label="Mês anterior"
        style={getCarouselBtnNavStyle(t, historico || carrosselPrimeiro)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.max(0, i - 1));
        }}
        disabled={historico || carrosselPrimeiro}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <span style={getCarouselPeriodLabelStyle(t, { minWidth: "min(100%, 180px)" })}>
        {historico ? "Todo o período" : (mesSelecionado?.label ?? "—")}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        style={getCarouselBtnNavStyle(t, historico || carrosselUltimo)}
        onClick={() => {
          setHistorico(false);
          setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
        }}
        disabled={historico || carrosselUltimo}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      <FiltroHistoricoButton
        active={historico}
        onClick={() => {
          if (historico) {
            setHistorico(false);
            setIdxMes(idxMesInicial >= 0 ? idxMesInicial : Math.max(0, mesesDisponiveis.length - 1));
          } else {
            setHistorico(true);
          }
        }}
      />
      {podeMinhasNegociacoes ? (
        <FiltroMinhasNegociacoesButton
          active={minhasNegociacoes}
          onClick={() => {
            if (minhasNegociacoes) {
              setMinhasNegociacoes(false);
              if (aba === "minhas") setAba("todas");
            } else {
              setMinhasNegociacoes(true);
              setAba("minhas");
            }
          }}
        />
      ) : null}
    </>
  );

  const ctaOfertar = mostrarNovaOfertaSpin ? (
    <CtaCriarButton onClick={() => setOfertarSpinAberto(true)}>Nova Oferta</CtaCriarButton>
  ) : mostrarNovaOferta ? (
    <CtaCriarButton onClick={() => setOfertarAberto(true)}>Nova Oferta</CtaCriarButton>
  ) : null;

  const blocoFiltrosLinha1 = (
    <>
      {blocoCarrosselHistorico}
      {aba === "minhas" ? (
        <FiltroSolicitacoesTipoAcaoSelect
          value={filtroTipoMinhas}
          onChange={setFiltroTipoMinhas}
          opcoes={ESCALA_ACAO_TIPO_OPCOES_MINHAS}
        />
      ) : aba === "spin" ? (
        <FiltroSolicitacoesTipoAcaoSelect
          value={filtroTipoSpin}
          onChange={setFiltroTipoSpin}
          opcoes={ESCALA_ACAO_TIPO_OPCOES_SPIN}
        />
      ) : (
        <FiltroSolicitacoesTipoAcaoSelect
          value={filtroTipoTodas}
          onChange={setFiltroTipoTodas}
          opcoes={ESCALA_ACAO_TIPO_OPCOES_MARKETPLACE_TODAS}
        />
      )}
      {podeFiltrarTimes && !minhasNegociacoes && (aba === "todas" || aba === "spin" || aba === "encerradas") ? (
        <FiltroBarCampoSelect
          value={filtroTimeTodas}
          onChange={(v) => setFiltroTimeTodas(v as MarketplaceTimeFiltro)}
          options={MARKETPLACE_TIME_OPCOES}
          icon={FilterBarIcons.time}
          ariaLabel={MARKETPLACE_TIME_ARIA_LABEL}
          todasValue={MARKETPLACE_TIME_TODOS_VALUE}
          todasLabel={MARKETPLACE_TIME_TODOS_LABEL}
        />
      ) : null}
      {aba === "todas" ? (
        <FiltroEntidadeBarSelect
          mode="single"
          selected={filtroDiaTodas ? [filtroDiaTodas] : []}
          onChange={(v) => setFiltroDiaTodas(v[0] ?? "")}
          items={diasComOfertaTodas}
          icon={FilterBarIcons.dia}
          triggerEmptyLabel={MARKETPLACE_DIA_TODOS_LABEL}
          ariaFilterPrefix={MARKETPLACE_DIA_ARIA_PREFIX}
          listboxAriaLabel={MARKETPLACE_DIA_LISTBOX_LABEL}
          searchPlaceholder={placeholderPesquisaFiltro("Dia")}
          disabled={diasComOfertaTodas.length === 0}
        />
      ) : null}
    </>
  );

  const contentBox = getPageContentBoxStyle(brand, t);

  function celulaVazia() {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        {MSG_VAZIO_OFERTAS}
      </div>
    );
  }

  function thSort(label: string, col: OfertaSortCol) {
    return (
      <SortTableTh<OfertaSortCol>
        label={label}
        col={col}
        sortCol={sortOferta.col}
        sortDir={sortOferta.dir}
        thStyle={dataTable.thHeader}
        align="center"
        onSort={onSortOferta}
      />
    );
  }

  function acoesTodas(row: LinhaOfertaMarketplace) {
    if (row.ofertaSpin) {
      if (!ofertaEmAberto(row)) {
        return <span style={{ color: t.textMuted }}>—</span>;
      }
      if (row.souCriadorSpin) {
        return <span style={{ color: t.textMuted, fontSize: 12 }}>Sua oferta</span>;
      }
      if (!marketplacePodeAceitarOfertaSpin(perm, row, contexto?.funcionarioId)) {
        return <span style={{ color: t.textMuted }}>—</span>;
      }
      if (preparandoAceiteId === row.id) {
        return <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color={brand.accent} />;
      }
      return (
        <BtnIconeAcaoLinha
          label={tooltipAcao("Aceitar oferta Spin")}
          onClick={() => void abrirAceite(row)}
        >
          <Check size={14} aria-hidden="true" />
        </BtnIconeAcaoLinha>
      );
    }
    if (row.souOfertante) {
      return <span style={{ color: t.textMuted, fontSize: 12 }}>Sua oferta</span>;
    }
    if (!ofertaEmAberto(row) || !podeProporNoMural || row.mesmoTime === false) {
      return <span style={{ color: t.textMuted }}>—</span>;
    }
    if (preparandoAceiteId === row.id) {
      return <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color={brand.accent} />;
    }
    return (
      <BtnIconeAcaoLinha
        label={tooltipAcao(row.tipo === "oferta_troca" ? "Propor Troca" : "Enviar proposta")}
        onClick={() => void abrirAceite(row)}
      >
        <Check size={14} aria-hidden="true" />
      </BtnIconeAcaoLinha>
    );
  }

  function linhaTabela(row: LinhaOfertaMarketplace, i: number, celulas: React.ReactNode) {
    const zebra = dataTable.zebraRow(i);
    return (
      <tr
        key={row.id}
        style={{ background: zebra }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = tableRowHoverBg(t.isDark);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = zebra;
        }}
      >
        {celulas}
      </tr>
    );
  }

  function tdAcoes(conteudo: React.ReactNode) {
    return (
      <td style={dataTable.tdCenter}>
        <div style={{ display: "flex", justifyContent: "center" }}>{conteudo}</div>
      </td>
    );
  }

  function labelTipo(row: LinhaOfertaMarketplace) {
    return RH_CALENDARIO_ACAO_LABEL_FORMAL[row.tipo as RhCalendarioAcaoTipo] ?? row.tipo;
  }

  function tdObservacao(row: LinhaOfertaMarketplace) {
    const obs = row.observacao?.trim();
    return (
      <td style={dataTable.tdCenter}>
        {obs ? (
          <span
            title={obs}
            style={{
              display: "block",
              maxWidth: 240,
              margin: "0 auto",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {obs}
          </span>
        ) : (
          "—"
        )}
      </td>
    );
  }

  /** Mural de vendas — blocos Ofertas de Turno e Ofertas de Folga (tipo já vem do bloco). */
  function renderTabelaOfertasVenda(rows: LinhaOfertaMarketplace[], caption: string) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>{caption}</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Estúdio", "estudio")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Observação", "observacao")}
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{estudioDaOferta(r)}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  {tdObservacao(r)}
                  {tdAcoes(acoesTodas(r))}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaTrocaTodas(rows: LinhaOfertaMarketplace[]) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Ofertas de troca</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Estúdio", "estudio")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Observação", "observacao")}
              {thSort("Status", "status")}
              <th scope="col" style={dataTable.thHeader}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{estudioDaOferta(r)}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  {tdObservacao(r)}
                  <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  {tdAcoes(acoesTodas(r))}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTabelaMinhas(rows: LinhaOfertaMarketplace[], variant: MinhasVariant) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    const mostrarOfertante = variant === "aceitei";
    const mostrarComprador = variant === "historico";
    const mostrarStatus = true;
    const mostrarAcoes = variant === "abertas" || variant === "aceitei";

    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>Minhas ofertas no Marketplace</caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Tipo de Ação", "tipo")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Estúdio", "estudio")}
              {mostrarOfertante && thSort("Ofertante", "ofertante")}
              {thSort("Data de Interesse", "dataInteresse")}
              {thSort("Turno de Interesse", "turnoInteresse")}
              {mostrarComprador && thSort("Aceito por", "comprador")}
              {mostrarStatus && thSort("Status", "status")}
              {mostrarAcoes && (
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{labelTipo(r)}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{estudioDaOferta(r)}</td>
                  {mostrarOfertante && <td style={dataTable.tdCenter}>{r.ofertante}</td>}
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  {mostrarComprador && <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>}
                  {mostrarStatus && (
                    <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  )}
                  {mostrarAcoes &&
                    tdAcoes(
                      !marketplacePodeEditarOferta(perm, r) ? (
                        <span style={{ color: t.textMuted }}>—</span>
                      ) : variant === "aceitei" ? (
                        r.status === "em_analise" ? (
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Desistir da proposta")}
                            onClick={() => setDecisaoTroca({ oferta: r, decisao: "desistir" })}
                          >
                            <Undo2 size={14} aria-hidden="true" />
                          </BtnIconeAcaoLinha>
                        ) : (
                          <span style={{ color: t.textMuted }}>—</span>
                        )
                      ) : r.status === "em_analise" ? (
                        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao(r.tipo === "oferta_troca" ? "Aprovar Troca" : "Aprovar compra")}
                            onClick={() => setDecisaoTroca({ oferta: r, decisao: "aprovar" })}
                          >
                            <Check size={14} aria-hidden="true" />
                          </BtnIconeAcaoLinha>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Recusar Proposta")}
                            onClick={() => setDecisaoTroca({ oferta: r, decisao: "recusar" })}
                          >
                            <X size={14} aria-hidden="true" />
                          </BtnIconeAcaoLinha>
                          <BtnIconeAcaoLinha
                            label={tooltipAcao("Cancelar Oferta")}
                            onClick={() => setOfertaCancelar(r)}
                          >
                            <Ban size={14} aria-hidden="true" />
                          </BtnIconeAcaoLinha>
                        </div>
                      ) : (
                        <BtnIconeAcaoLinha
                          label={tooltipAcao("Cancelar Oferta")}
                          onClick={() => setOfertaCancelar(r)}
                        >
                          <Ban size={14} aria-hidden="true" />
                        </BtnIconeAcaoLinha>
                      ),
                    )}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  /** Tabelas da aba Ofertas Encerradas — visão de gestão (todos os prestadores). */
  function renderTabelaEncerradas(rows: LinhaOfertaMarketplace[], variant: EncerradasVariant) {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    const mostrarAceitoPor = variant === "aceitas";
    const mostrarStatus = variant === "canceladas";

    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>
            {variant === "aceitas" ? "Ofertas aceitas no Marketplace" : "Ofertas canceladas no Marketplace"}
          </caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Tipo de Ação", "tipo")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Estúdio", "estudio")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Data de Interesse", "dataInteresse")}
              {thSort("Turno de Interesse", "turnoInteresse")}
              {mostrarAceitoPor && thSort("Aceito por", "comprador")}
              {mostrarStatus && thSort("Status", "status")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{labelTipo(r)}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{estudioDaOferta(r)}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  <td style={dataTable.tdCenter}>{r.dataInteresseIso ?? "—"}</td>
                  <td style={dataTable.tdCenter}>{r.turnoInteresse ?? "—"}</td>
                  {mostrarAceitoPor && <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>}
                  {mostrarStatus && (
                    <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  )}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  /** Tabelas da aba Ofertas Spin — visão de gestão (ofertas da empresa). */
  function renderTabelaSpin(rows: LinhaOfertaMarketplace[], variant: "abertas" | "aceitas" | "historico") {
    const sorted = ordenarOfertas(rows, sortOferta);
    if (sorted.length === 0) return celulaVazia();
    const mostrarAceitoPor = variant === "aceitas";
    const mostrarStatus = variant === "historico";
    const mostrarAcoes = variant === "abertas";

    return (
      <div className="app-table-wrap" style={getDataTableWrapStyle()}>
        <table style={getDataTableStyle()}>
          <caption style={{ display: "none" }}>
            {variant === "abertas"
              ? "Ofertas Spin abertas"
              : variant === "aceitas"
                ? "Ofertas Spin aceitas"
                : "Histórico de ofertas Spin"}
          </caption>
          <thead>
            <tr>
              {thSort("Data da Oferta", "dataOferta")}
              {thSort("Tipo de Ação", "tipo")}
              {thSort("Turno da Oferta", "turnoOferta")}
              {thSort("Estúdio", "estudio")}
              {thSort("Ofertante", "ofertante")}
              {thSort("Observação", "observacao")}
              {mostrarAceitoPor && thSort("Aceito por", "comprador")}
              {mostrarStatus && thSort("Status", "status")}
              {mostrarAcoes && (
                <th scope="col" style={dataTable.thHeader}>
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) =>
              linhaTabela(
                r,
                i,
                <>
                  <td style={dataTable.tdCenter}>{r.dataOfertaIso}</td>
                  <td style={dataTable.tdCenter}>{labelTipo(r)}</td>
                  <td style={dataTable.tdCenter}>{r.turnoOferta}</td>
                  <td style={dataTable.tdCenter}>{estudioDaOferta(r)}</td>
                  <td style={dataTable.tdCenter}>{r.ofertante}</td>
                  {tdObservacao(r)}
                  {mostrarAceitoPor && <td style={dataTable.tdCenter}>{r.comprador ?? "—"}</td>}
                  {mostrarStatus && (
                    <td style={dataTable.tdCenter}>{r.status ? OFERTA_STATUS_LABEL[r.status] : "—"}</td>
                  )}
                  {mostrarAcoes &&
                    tdAcoes(
                      marketplacePodeCancelarOfertaSpin(perm, r) ? (
                        <BtnIconeAcaoLinha
                          label={tooltipAcao("Cancelar Oferta")}
                          onClick={() => setOfertaCancelar(r)}
                        >
                          <Ban size={14} aria-hidden="true" />
                        </BtnIconeAcaoLinha>
                      ) : (
                        <span style={{ color: t.textMuted }}>—</span>
                      ),
                    )}
                </>,
              ),
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="escala_marketplace_turnos" />}
        title={getPageMenuLabel("escala_marketplace_turnos")}
        subtitle="Ofertas de venda e troca de turnos — mural aberto e histórico conforme a sua permissão."
        brand={brand}
        t={t}
      />

      <div style={getFilterBarWrapperStyle(brand, t)}>
        <div style={filterBarSection(false)} role="group" aria-label="Período, tipo de ação e time">
          {blocoFiltrosLinha1}
        </div>
        <div style={filterBarSection(true)}>
          <div className="app-filter-bar-tabs-cta">
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden="true" />
            <div
              className="app-filter-bar-tabs-cta__tabs"
              role="tablist"
              aria-label="Vista do marketplace"
            >
              <FiltroBarTabButton
                id="tab-mkt-todas"
                active={aba === "todas"}
                aria-controls="panel-mkt-todas"
                onClick={() => setAba("todas")}
                icon={<Store size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
              >
                Todas as Ofertas
              </FiltroBarTabButton>
              {mostrarEncerradas ? (
                <>
                  <FiltroBarTabButton
                    id="tab-mkt-spin"
                    active={aba === "spin"}
                    aria-controls="panel-mkt-spin"
                    onClick={() => setAba("spin")}
                    icon={<Sparkles size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
                  >
                    Ofertas Spin
                  </FiltroBarTabButton>
                  <FiltroBarTabButton
                    id="tab-mkt-encerradas"
                    active={aba === "encerradas"}
                    aria-controls="panel-mkt-encerradas"
                    onClick={() => setAba("encerradas")}
                    icon={<Archive size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
                  >
                    Ofertas Encerradas
                  </FiltroBarTabButton>
                </>
              ) : (
                <FiltroBarTabButton
                  id="tab-mkt-minhas"
                  active={aba === "minhas"}
                  aria-controls="panel-mkt-minhas"
                  onClick={() => setAba("minhas")}
                  icon={<User size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
                >
                  Minhas Ofertas
                </FiltroBarTabButton>
              )}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes
                pageKey="escala_marketplace_turnos"
                tutorial={TUTORIAL_MARKETPLACE_OFERTAS}
              />
              {ctaOfertar}
            </div>
          </div>
        </div>
        <div style={filterBarSection(true)}>
          <BarraPesquisaPagina
            value={busca}
            onChange={setBusca}
            placeholder={PAGE_SEARCH.marketplaceOferta}
            aria-label="Buscar por ofertante, estúdio ou turno"
            wrapperStyle={{ width: "min(100%, 680px)" }}
          />
        </div>
      </div>

      {loadingOfertas ? (
        <div style={contentBox}>
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Carregando…
          </div>
        </div>
      ) : (
        <>
          {aba === "todas" && (
            <div role="tabpanel" id="panel-mkt-todas" aria-labelledby="tab-mkt-todas">
              <div style={contentBox}>
                <SectionTitle sub="Turnos que colegas de folga podem assumir">
                  Ofertas de Turno
                </SectionTitle>
                {renderTabelaOfertasVenda(linhasTurnoTodas, "Ofertas de venda de turno")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Folgas de quem se oferece para trabalhar no seu lugar">
                  Ofertas de Folga
                </SectionTitle>
                {renderTabelaOfertasVenda(linhasFolgaTodas, "Ofertas de venda de folga")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Turnos oferecidos em troca de outro dia">Ofertas de Troca</SectionTitle>
                {renderTabelaTrocaTodas(linhasTrocaTodas)}
              </div>
            </div>
          )}

          {aba === "minhas" && visaoPessoal && (
            <div role="tabpanel" id="panel-mkt-minhas" aria-labelledby="tab-mkt-minhas">
              <div style={contentBox}>
                <SectionTitle sub="Disponíveis ou com proposta de troca em análise">
                  Minhas ofertas abertas
                </SectionTitle>
                {renderTabelaMinhas(minhasAbertas, "abertas")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Aceites concluídos e propostas em análise">
                  Ofertas que aceitei
                </SectionTitle>
                {renderTabelaMinhas(minhasAceitas, "aceitei")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Suas ofertas já aceitas ou canceladas">Histórico</SectionTitle>
                {renderTabelaMinhas(minhasEncerradas, "historico")}
              </div>
            </div>
          )}

          {aba === "encerradas" && mostrarEncerradas && (
            <div role="tabpanel" id="panel-mkt-encerradas" aria-labelledby="tab-mkt-encerradas">
              <div style={contentBox}>
                <SectionTitle sub="Ofertas de todos os prestadores que foram aceitas">
                  Ofertas aceitas
                </SectionTitle>
                {renderTabelaEncerradas(encerradasAceitas, "aceitas")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Ofertas de todos os prestadores que foram canceladas">
                  Ofertas Canceladas
                </SectionTitle>
                {renderTabelaEncerradas(encerradasCanceladas, "canceladas")}
              </div>
            </div>
          )}

          {aba === "spin" && mostrarEncerradas && (
            <div role="tabpanel" id="panel-mkt-spin" aria-labelledby="tab-mkt-spin">
              <div style={contentBox}>
                <SectionTitle sub="Coberturas e liberações publicadas pela Spin Gaming">
                  Ofertas abertas
                </SectionTitle>
                {renderTabelaSpin(spinAbertas, "abertas")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Aceites concluídos sem aprovação adicional">
                  Ofertas aceitas
                </SectionTitle>
                {renderTabelaSpin(spinAceitas, "aceitas")}
              </div>
              <div style={contentBox}>
                <SectionTitle sub="Canceladas ou expiradas">Histórico</SectionTitle>
                {renderTabelaSpin(spinHistorico, "historico")}
              </div>
            </div>
          )}
        </>
      )}

      <ModalOfertarMarketplace
        open={ofertarAberto}
        onClose={() => setOfertarAberto(false)}
        onCriada={recarregar}
        contexto={contexto}
        grade={gradeMes}
        diasReservados={diasReservadosUsuario}
      />

      <ModalOfertarSpin
        open={ofertarSpinAberto}
        onClose={() => setOfertarSpinAberto(false)}
        onCriada={recarregar}
      />

      {ofertaAceitar?.ofertaSpin ? (
        <ModalAceitarOfertaSpin
          oferta={ofertaAceitar}
          onClose={() => setOfertaAceitar(null)}
          onAceita={recarregar}
          contexto={contexto}
          grade={gradeAceite}
        />
      ) : (
        <ModalAceitarOfertaMarketplace
          oferta={ofertaAceitar}
          onClose={() => setOfertaAceitar(null)}
          onAceita={recarregar}
          contexto={contexto}
          grade={gradeAceite}
          diasReservados={diasReservadosUsuario}
        />
      )}

      <ModalCancelarOfertaMarketplace
        oferta={ofertaCancelar}
        onClose={() => setOfertaCancelar(null)}
        onCancelada={recarregar}
      />

      <ModalDecidirTrocaMarketplace
        oferta={decisaoTroca?.oferta ?? null}
        decisao={decisaoTroca?.decisao ?? "aprovar"}
        onClose={() => setDecisaoTroca(null)}
        onConcluida={recarregar}
      />
    </div>
  );
}
