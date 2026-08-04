import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  Clock,
  FileDown,
  Loader2,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchTurnosPorOperadoraSlugs, type TurnosDealersPick } from "../../../lib/turnosDealers";
import {
  MSG_PRESTADOR_PONTO_REDE,
  obterPrestadorPontoEstado,
  registrarPrestadorPonto,
  type PrestadorPontoEstado,
} from "../../../lib/prestadorPontoApi";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import { normalizarEscalaCadastro } from "../../../lib/rhEscalaTurnos";
import { chaveTurnoMes, type EscalaTurnoMesMap } from "../../../lib/gestaoEscalaTurnoMes";
import {
  adicionarMinutosAoRelogioHHMM,
  escalaComHorarioTurnoEditavelNaStaff,
  escalaComHorarioTurnoSomenteOperadora,
  formatarHoraInicioOperadora,
  labelHorarioTurnoStaffPorValor,
  staffHorarioResolvidoParaTurnoDoDia,
} from "../../../lib/rhStaffHorarioTurno";
import {
  CtaCriarButton,
  DashboardPageHeader,
  FiltroBarTabButton,
  FiltroCalendarioStaffSelect,
  FiltroCalendarioTimeSelect,
  FiltroMeuCalendarioButton,
  FiltroTipoCompromissoCalendarioSelect,
  SectionTitle,
  type TipoCompromissoCalFiltroValue,
} from "../../../components/dashboard";
import {
  FILTRO_BAR_TAB_ICON_PROPS,
  getFilterBarRowStyle,
  onFiltroBarTabsKeyDown,
} from "../../../lib/filterBarStyles";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../lib/pageContentBoxStyles";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getCtaCriarButtonStyle } from "../../../lib/ctaCriarStyles";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import { BtnIconeAcaoLinha } from "../../../components/BtnIconeAcaoLinha";
import {
  AjudaContextualAcoes,
  type AjudaContextualTutorial,
} from "../../../components/AjudaContextualAcoes";
import { tooltipAcao } from "../../../lib/iconOnlyButtonA11y";
import {
  labelReuniaoCom,
  listarDatasEscaladoFuturasNoMes,
  turnoOperacionalValorGrade,
  valorCelulaEhFolgaOperacional,
} from "../../../lib/rhCalendarioAcaoHelpers";
import {
  ehReuniaoComRh,
  exibirObservacaoRhModalReuniao,
  subtituloChipReuniaoRhCalendario,
  tituloChipReuniaoRhCalendario,
  tituloModalReuniaoRhCalendario,
} from "../../../lib/rhCalendarioReuniaoRhUi";
import type { RhSolicitacaoStatus } from "../../../types/rhSolicitacao";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { fmtHorasTotal } from "../../../lib/dashboardHelpers";
import {
  normalizarSelecaoUnica,
  CALENDARIO_TIMES_FILTRO_ORDEM,
  prestadorAtendeFiltroTime,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import { carregarRhCalendarioGradeMes } from "../../../lib/rhCalendarioGradeMes";
import {
  baixarCalendarioCompromissosPdf,
  diaSemanaCurtoPdf,
  diaSemanaListaPdf,
  type RhCalendarioPdfDia,
} from "../../../lib/rhCalendarioCompromissosPdf";
import { mesclarGradeComHorarioComercialSintetico, prestadorUsaHorarioComercialSintetico, AREA_KEY_HORARIO_COMERCIAL_SINTETICO } from "../../../lib/overviewPrestadorCalendarioHelpers";
import { ModalAprovarPresencaMesCalendario } from "./ModalAprovarPresencaMesCalendario";
import {
  RelatorioPresencaPainel,
  type RelatorioPresencaLinha,
} from "./RelatorioPresencaPainel";
import {
  clamarDiaCarrosselRelatorioPresenca,
  diaMaximoCarrosselRelatorioPresenca,
  diaMinimoCarrosselRelatorioPresenca,
  labelCarrosselDiaRelatorioPresenca,
  ordenarLinhasRelatorioPresencaPorNome,
} from "../../../lib/rhCalendarioRelatorioPresenca";
import type { SortDir } from "../../../components/dashboard";
import { ModalAgendarReuniaoCalendario } from "./ModalAgendarReuniaoCalendario";
import {
  ModalAprovacaoPresencaCalendario,
  type PresencaTurnoAlvo,
} from "./ModalAprovacaoPresencaCalendario";
import { ModalHistoricoPresencaCalendario } from "./ModalHistoricoPresencaCalendario";
import {
  ModalJustificarPresencaCalendario,
  type PresencaJustificarAlvo,
} from "./ModalJustificarPresencaCalendario";
import { CelulaIndicadorCorrecaoPresencaCalendario } from "./CelulaIndicadorCorrecaoPresencaCalendario";
import { CelulaIndicadorJustificativaMedicoPresencaCalendario } from "./CelulaIndicadorJustificativaMedicoPresencaCalendario";
import {
  chavePresencaGestao,
  computePresencaKpisConsolidados,
  deveExibirCheckInMesFechadoPresenca,
  diasReferenciaMesPresenca,
  refPrimeiroDiaMesAnterior,
  fundoLinhaPresencaDiaHoje,
  linhaPresencaDestaqueHoje,
  mesCalendarioPresencaFechado,
  mesCalendarioPresencaFuturo,
  mensagemAprovacaoPresencaMesPt,
  presencaCorrecaoAnaliseStatusEfetivo,
  presencaCorrecaoCampoAlterado,
  construirIndiceJustificativaMedicoPorDia,
  fundirGestaoPresencaComJustificativaMedico,
  historicoLinhasJustificativaMedico,
  presencaJustificativaMedicoAprovada,
  presencaJustificativaMedicoExibirIndicador,
  PRESENCA_DESTAQUE_VERDE_HEX,
  PRESENCA_KPIS_ZERO,
  resolverAcoesPresencaLinha,
  resolverStatusPresencaLinha,
  type PresencaDiaGestao,
  type PresencaJustificativaMeta,
  type PresencaMesAprovacaoLinha,
} from "../../../lib/rhCalendarioPresencaGestao";
import {
  carregarPontoRegistrosDiaLote,
  carregarPresencaGestaoDiaLote,
  carregarPresencaGestaoMes,
} from "../../../lib/rhCalendarioPresencaGestaoDb";
import {
  carregarAprovacaoPresencaMes,
  type PresencaAprovacaoMes,
} from "../../../lib/rhCalendarioPresencaAprovacaoMesDb";
import {
  chaveMovimentacaoCelula,
  mapOverviewPrestadorMovimentacoes,
  type OverviewPrestadorMovimentacaoCelula,
} from "../../../lib/overviewPrestadorMovimentacoes";
import { useCalendarioPresencaGestaoMutacoes } from "./useCalendarioPresencaGestaoMutacoes";

const TUTORIAL_CALENDARIO: AjudaContextualTutorial = {
  id: "calendario-prestador",
  urlSlug: "Calendario",
};

const TUTORIAL_CONTROLE_PRESENCA: AjudaContextualTutorial = {
  id: "controle-presenca",
  urlSlug: "ControledePresenca",
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** Primeiro mês disponível no calendário RH (sem navegação para meses anteriores). */
const CALENDARIO_ANO_MIN = 2026;
const CALENDARIO_MES0_MIN = 3; // Abril (0-based)

function dataInicialCarrosselCalendarioRh(): Date {
  return new Date(CALENDARIO_ANO_MIN, CALENDARIO_MES0_MIN, 1);
}

/** Mês inicial: mês civil atual (ou mínimo do produto), e nunca acima do limite do carrossel. */
function mesInicialCalendarioRhNaEntrada(): Date {
  const hoje = new Date();
  const primeiroDoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const minimo = dataInicialCarrosselCalendarioRh();
  const maximo = mesMaximoCarrosselCalendarioRh();
  let d = primeiroDoMesAtual < minimo ? minimo : primeiroDoMesAtual;
  if (d.getTime() > maximo.getTime()) d = maximo;
  return d;
}

function mesCalendarioAntesDoMinimo(c: Date): boolean {
  return c.getFullYear() < CALENDARIO_ANO_MIN || (c.getFullYear() === CALENDARIO_ANO_MIN && c.getMonth() < CALENDARIO_MES0_MIN);
}

/** Permite ir ao mês anterior (nunca antes de abril/2026). */
function podeRetrocederMesCalendario(c: Date): boolean {
  return c.getFullYear() > CALENDARIO_ANO_MIN || (c.getFullYear() === CALENDARIO_ANO_MIN && c.getMonth() > CALENDARIO_MES0_MIN);
}

/** Primeiro dia do mês civil «hoje» (fuso local). */
function primeiroDiaMesCivilHoje(): Date {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), 1);
}

/**
 * Último mês que o carrossel pode mostrar: apenas o mês civil seguinte ao atual (não há +2 meses, etc.).
 */
function mesMaximoCarrosselCalendarioRh(): Date {
  const ref = primeiroDiaMesCivilHoje();
  return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
}

/** `true` se o mês de `c` (dia 1) é estritamente depois do limite máximo do carrossel. */
function mesCalendarioAlemDoMaximoFuturo(c: Date): boolean {
  const max = mesMaximoCarrosselCalendarioRh();
  const cur = new Date(c.getFullYear(), c.getMonth(), 1);
  return cur.getTime() > max.getTime();
}

/** Pode avançar um mês sem ultrapassar o mês seguinte ao mês civil atual. */
function podeAvancarMesCalendario(c: Date): boolean {
  const max = mesMaximoCarrosselCalendarioRh();
  const cur = new Date(c.getFullYear(), c.getMonth(), 1);
  return cur.getTime() < max.getTime();
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  return cells;
}

/** Chave YYYY-MM-DD no fuso local (alinhada a `dia_iso` da grade). */
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MAX_CHIPS_COMPROMISSOS_DIA = 8;

type RpcGradeCalendarioRow = {
  funcionario_id: string;
  dia_iso: string;
  valor: string;
  area_key: string;
};

type RpcReuniaoMesRow = {
  id: string;
  solicitante_funcionario_id: string;
  solicitante_nome: string | null;
  dia_iso: string;
  reuniao_com: string | null;
  reuniao_com_label: string | null;
  motivo: string | null;
  turno: string | null;
  status: string;
  created_at: string;
  solicitacao_status: RhSolicitacaoStatus | null;
  observacao_rh: string | null;
  atendente_nome: string | null;
};

function isoChaveDiaReuniaoRpc(raw: string | Date | undefined): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.slice(0, 10);
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw).slice(0, 10);
  }
}

function tituloReuniaoNoCalendario(row: RpcReuniaoMesRow, viewerSolicitanteId: string | null): string {
  const alvo = ((row.reuniao_com_label ?? "").trim() || labelReuniaoCom(row.reuniao_com ?? "")).trim() || "—";
  if (viewerSolicitanteId && row.solicitante_funcionario_id !== viewerSolicitanteId) {
    const nome = (row.solicitante_nome ?? "").trim() || "—";
    return `${nome} — Reunião (${alvo})`;
  }
  return `Reunião (${alvo})`;
}

type CompromissoEscalaCal = {
  prestadorId: string;
  nome: string;
  turno: string;
};

/** Compromissos não-turno; `reuniaoDetalhe` preenchido para reuniões agendadas (modal do dia). */
type CompromissoAgendaExtra = {
  id: string;
  titulo: string;
  /** Segunda linha no chip da grelha (reunião com RH). */
  subtituloChip?: string;
  reuniaoDetalhe?: {
    solicitanteNome: string;
    comQuemLabel: string;
    turno: string;
    motivo: string;
    isReuniaoRh?: boolean;
    solicitacaoStatus?: RhSolicitacaoStatus | null;
    observacaoRh?: string | null;
  };
};

/** Ordem na grelha do dia: eventos → reuniões → treinamentos → feedback → turnos. */
type LinhaCalendarioDia =
  | { tipo: "evento"; item: CompromissoAgendaExtra }
  | { tipo: "reuniao"; item: CompromissoAgendaExtra }
  | { tipo: "treinamento"; item: CompromissoAgendaExtra }
  | { tipo: "feedback"; item: CompromissoAgendaExtra }
  | { tipo: "turno"; comp: CompromissoEscalaCal };

/** Peso para ordenar turnos na mesma categoria: Comercial, Manhã, Tarde, Noite; depois Compra/Venda/Troca. */
function pesoTurnoExibicaoCalendario(turno: string): number {
  switch (turno) {
    case "Comercial":
      return 0;
    case "Manhã":
      return 1;
    case "Tarde":
      return 2;
    case "Noite":
      return 3;
    case "Compra":
      return 4;
    case "Venda":
      return 5;
    case "Troca":
      return 6;
    default:
      return 50;
  }
}

function compararTurnoEscalaCalendario(a: CompromissoEscalaCal, b: CompromissoEscalaCal): number {
  const pa = pesoTurnoExibicaoCalendario(a.turno);
  const pb = pesoTurnoExibicaoCalendario(b.turno);
  if (pa !== pb) return pa - pb;
  return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
}

function ordenarTurnosCalendario(turnos: CompromissoEscalaCal[]): CompromissoEscalaCal[] {
  return [...turnos].sort(compararTurnoEscalaCalendario);
}

function tituloModalDiaPt(d: Date): string {
  const dow = DAYS_LONG[d.getDay()] ?? "";
  return `${dow}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function refMesPrimeiroDiaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function diaIsoChaveGrade(row: RpcGradeCalendarioRow): string {
  const raw = row.dia_iso as string | Date | undefined;
  if (raw == null) return "";
  if (typeof raw === "string") return raw.slice(0, 10);
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw).slice(0, 10);
  }
}

/** Rótulo no Calendário para o valor gravado na grade (Gestão de Escala). Folgas não entram na grelha. */
function turnoExibicaoDeValorCelulaEscala(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (valorCelulaEhFolgaOperacional(v)) return null;
  return turnoOperacionalValorGrade(v) ?? (v === "Compra" || v === "Troca" ? v : null);
}

type OpTurnosCalPick = { slug: string } & TurnosDealersPick;
type OpTurnosHorarioPick = TurnosDealersPick;

function turnoCalendarioEhCompraVendaTroca(turnoNome: string): boolean {
  return turnoNome === "Compra" || turnoNome === "Venda" || turnoNome === "Troca";
}

/** Situação na grade (Gestão de Escala) para o dia — Folga vs escalado de turno; CVT mantém o rótulo. */
function situacaoGestaoEscalaParaDia(valorCelulaRaw: string | null | undefined): string {
  const v = (valorCelulaRaw ?? "").trim();
  if (!v) return "—";
  if (valorCelulaEhFolgaOperacional(v)) return v.toLowerCase() === "venda" ? "Venda" : "Folga";
  if (v.startsWith("Compra - ")) return v;
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  return "Escalado";
}

/** Início/fim do turno para o modal (null = não calculado; usar "—" no UI). */
function resumoHorarioTurnoModalCalendario(
  p: RhFuncionario | undefined,
  turnoNomeExibicao: string,
  op: OpTurnosHorarioPick | null | undefined,
  /** Horário congelado na aprovação da escala (quando existir). */
  horarioStaffOverride?: string | null,
): string | null {
  if (!p) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNomeExibicao)) return null;
  if (turnoNomeExibicao === "Comercial") {
    return "Início 09:00 · Fim 18:00";
  }

  const escala = p.escala ?? "";

  if (turnoNomeExibicao !== "Manhã" && turnoNomeExibicao !== "Tarde" && turnoNomeExibicao !== "Noite") return null;

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const hor = staffHorarioResolvidoParaTurnoDoDia(
      escala,
      turnoNomeExibicao,
      horarioStaffOverride ?? p.staff_horario_turno,
    );
    const lbl = labelHorarioTurnoStaffPorValor(hor);
    return lbl !== "—" ? lbl : null;
  }

  if (escalaComHorarioTurnoSomenteOperadora(escala) && op) {
    const k = normalizarEscalaCadastro(escala);
    const durMin = k === "5x1" ? 6 * 60 + 30 : 8 * 60;
    let iniDb: string | null = null;
    if (turnoNomeExibicao === "Manhã") iniDb = op.turno_manha_inicio ?? null;
    else if (turnoNomeExibicao === "Tarde") iniDb = op.turno_tarde_inicio ?? null;
    else iniDb = op.turno_noite_inicio ?? null;
    const hi = formatarHoraInicioOperadora(iniDb ?? undefined);
    if (hi === "—") return null;
    const hf = adicionarMinutosAoRelogioHHMM(hi, durMin);
    return `Início ${hi} · Fim ${hf}`;
  }

  return null;
}

type RpcPontoMesRow = {
  dia_sp: string;
  check_in_at: string | null;
  check_out_at: string | null;
};

/** Primeiro valor de célula da grade com turno exibível (por dia / funcionário). */
function primeiroValorGradeDia(rows: RpcGradeCalendarioRow[], funcionarioId: string, iso: string): string | null {
  const hits = rows.filter((r) => r.funcionario_id === funcionarioId && diaIsoChaveGrade(r) === iso);
  if (hits.length === 0) return null;
  for (const h of hits) {
    const t = turnoExibicaoDeValorCelulaEscala((h.valor ?? "").trim());
    if (t) return (h.valor ?? "").trim() || null;
  }
  const v0 = (hits[0]?.valor ?? "").trim();
  return v0 || null;
}

const HORARIO_ESCRITORIO_COMERCIAL = { entrada: "09:00", saida: "18:00" } as const;

function parseHorarioStaffValorParaHHMM(valor: string | null | undefined): { entrada: string; saida: string } | null {
  const raw = (valor ?? "").trim();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (!m) return null;
  const h1 = parseInt(m[1]!, 10);
  const h2 = parseInt(m[2]!, 10);
  return {
    entrada: `${String(h1).padStart(2, "0")}:00`,
    saida: `${String(h2).padStart(2, "0")}:00`,
  };
}

/** `area_key` da célula usada em `primeiroValorGradeDia`. */
function areaKeyGradeDia(
  rows: RpcGradeCalendarioRow[],
  funcionarioId: string,
  iso: string,
): string | null {
  const hits = rows.filter((r) => r.funcionario_id === funcionarioId && diaIsoChaveGrade(r) === iso);
  if (hits.length === 0) return null;
  for (const h of hits) {
    const t = turnoExibicaoDeValorCelulaEscala((h.valor ?? "").trim());
    if (t) return (h.area_key ?? "").trim() || null;
  }
  return (hits[0]?.area_key ?? "").trim() || null;
}

/**
 * Entrada / saída programadas (HH:mm).
 * Horário comercial (Escritório ou Estúdio Comercial/5×2) → sempre 09:00–18:00.
 * Não depender só de `area_atuacao` no cliente (pode vir vazio com Ver=Próprios).
 */
function obterEntradaSaidaEscaladasPrestadorDia(
  p: RhFuncionario | undefined,
  valorCelula: string | null | undefined,
  op: OpTurnosHorarioPick | null | undefined,
  _areaKey?: string | null,
  horarioStaffOverride?: string | null,
): { entrada: string; saida: string } | null {
  const turnoNome = turnoExibicaoDeValorCelulaEscala(valorCelula ?? "");
  if (!turnoNome) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNome)) return { entrada: "—", saida: "—" };

  if (turnoNome === "Comercial") {
    return { ...HORARIO_ESCRITORIO_COMERCIAL };
  }

  if (!p) return null;

  const escala = p.escala ?? "";

  if (turnoNome !== "Manhã" && turnoNome !== "Tarde" && turnoNome !== "Noite") {
    return { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const hor = staffHorarioResolvidoParaTurnoDoDia(
      escala,
      turnoNome,
      horarioStaffOverride ?? p.staff_horario_turno,
    );
    const parsed = parseHorarioStaffValorParaHHMM(hor);
    return parsed ?? { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoSomenteOperadora(escala) && op) {
    const k = normalizarEscalaCadastro(escala);
    const durMin = k === "5x1" ? 6 * 60 + 30 : 8 * 60;
    let iniDb: string | null = null;
    if (turnoNome === "Manhã") iniDb = op.turno_manha_inicio ?? null;
    else if (turnoNome === "Tarde") iniDb = op.turno_tarde_inicio ?? null;
    else iniDb = op.turno_noite_inicio ?? null;
    const hi = formatarHoraInicioOperadora(iniDb ?? undefined);
    if (hi === "—") return { entrada: "—", saida: "—" };
    const hf = adicionarMinutosAoRelogioHHMM(hi, durMin);
    return { entrada: hi, saida: hf };
  }

  return { entrada: "—", saida: "—" };
}

function duracaoMinutosRelogioHHMM(entrada: string, saida: string): number | null {
  if (entrada === "—" || saida === "—") return null;
  const m1 = /^(\d{1,2}):(\d{2})$/.exec(entrada.trim());
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(saida.trim());
  if (!m1 || !m2) return null;
  const a = parseInt(m1[1]!, 10) * 60 + parseInt(m1[2]!, 10);
  const b = parseInt(m2[1]!, 10) * 60 + parseInt(m2[2]!, 10);
  let d = b - a;
  if (d <= 0) d += 24 * 60;
  return d;
}

function formatoDuracaoFmtHorasTotal(entrada: string, saida: string): string {
  const min = duracaoMinutosRelogioHHMM(entrada, saida);
  if (min == null) return "—";
  return fmtHorasTotal(min / 60);
}

function horaRegistoSP(isoTs: string | null | undefined): string {
  if (!isoTs) return "—";
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

/** Subtítulo do modal de ponto — ex.: «21:52 EM 01 DE JUNHO». */
function formatarSubtituloPontoRealizado(d: Date): string {
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" });
  const mes = d
    .toLocaleDateString("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" })
    .toUpperCase();
  return `${hora} EM ${dia} DE ${mes}`;
}

type PontoSucessoModalData = {
  tipo: "check_in" | "check_out";
  subtitulo: string;
  corpo: string;
};

function duracaoEntreTimestamps(isoIn: string | null | undefined, isoOut: string | null | undefined): string {
  if (!isoIn || !isoOut) return "—";
  const t0 = new Date(isoIn).getTime();
  const t1 = new Date(isoOut).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1) || t1 <= t0) return "—";
  return fmtHorasTotal((t1 - t0) / 3600000);
}

/** Duração real em minutos (check-in → check-out). */
function duracaoMinutosEntreTimestampsIso(
  isoIn: string | null | undefined,
  isoOut: string | null | undefined,
): number | null {
  if (!isoIn || !isoOut) return null;
  const t0 = new Date(isoIn).getTime();
  const t1 = new Date(isoOut).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1) || t1 <= t0) return null;
  return Math.round((t1 - t0) / 60000);
}

const COR_DESVIO_PONTO = "#e84025";

/** Minutos desde 00:00 para "HH:mm" no mesmo dia civil. */
function minutosRelogioHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

/** Diferença mínima em minutos entre dois relógios no mesmo dia (considera envoltório 24h). */
function diffMinutosAbsRelogioMesmoDia(esc: string, real: string): number | null {
  if (esc === "—" || real === "—") return null;
  const a = minutosRelogioHHmm(esc);
  const b = minutosRelogioHHmm(real);
  if (a == null || b == null) return null;
  let d = Math.abs(b - a);
  d = Math.min(d, 24 * 60 - d);
  return d;
}

/** Desvio estritamente superior a 5 minutos entre horário escalado e realizado. */
function presencaDesvioRelogioMaior5Min(esc: string, real: string): boolean {
  const d = diffMinutosAbsRelogioMesmoDia(esc, real);
  return d != null && d > 5;
}

/** Desvio na duração total (minutos) entre escalado e realizado. */
function presencaDesvioHorasMaior5Min(escEnt: string, escSai: string, isoIn: string | null, isoOut: string | null): boolean {
  const escMin = duracaoMinutosRelogioHHMM(escEnt, escSai);
  const realMin = duracaoMinutosEntreTimestampsIso(isoIn, isoOut);
  if (escMin == null || realMin == null) return false;
  return Math.abs(realMin - escMin) > 5;
}

function statusPresencaNoDia(
  escaladas: { entrada: string; saida: string } | null,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
): string {
  if (!escaladas) return "Folga";
  const semHorarioProgramado = escaladas.entrada === "—" && escaladas.saida === "—";
  const temHorarioProgramado =
    !semHorarioProgramado && (escaladas.entrada !== "—" || escaladas.saida !== "—");
  if (!temHorarioProgramado) return "Sem horário";
  if (!checkIn && !checkOut) return "Pendente";
  if (checkIn && !checkOut) return "Em aberto";
  if (checkIn && checkOut) return "Registrado";
  return "—";
}

export default function RhCalendarioPage() {
  const { theme: t, isDark, user } = useApp();
  const brand = useDashboardBrand();
  const dataTable = useDataTableBlock();
  const perm = usePermission("rh_calendario");

  const [current, setCurrent] = useState(() => mesInicialCalendarioRhNaEntrada());
  const [abaPrincipal, setAbaPrincipal] = useRouteTab(
    "rh_calendario",
    "compromissos",
    ["compromissos", "presenca", "relatorio"] as const,
  );
  const [filtroTipoCompromisso, setFiltroTipoCompromisso] = useState<TipoCompromissoCalFiltroValue>("todos");
  const [modalDia, setModalDia] = useState<Date | null>(null);
  const [modalAgendarAberto, setModalAgendarAberto] = useState(false);
  const [baixandoCalendarioPdf, setBaixandoCalendarioPdf] = useState(false);
  const [erroCalendarioPdf, setErroCalendarioPdf] = useState<string | null>(null);

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [erroStaff, setErroStaff] = useState<string | null>(null);
  const [escopoVersao, setEscopoVersao] = useState<string | null>(null);
  const [escopoRefreshTick, setEscopoRefreshTick] = useState(0);

  /** Filtros da aba Compromissos (multi). */
  const [compFilterStaffIds, setCompFilterStaffIds] = useState<string[]>([]);
  const [compFilterTimeIds, setCompFilterTimeIds] = useState<string[]>([]);
  /** Filtros da aba Controle de Presença (Time e Staff: seleção única). */
  const [presencaFilterTimeIds, setPresencaFilterTimeIds] = useState<string[]>([]);
  const [presencaFilterStaffIds, setPresencaFilterStaffIds] = useState<string[]>([]);
  const [relatorioFilterTimeIds, setRelatorioFilterTimeIds] = useState<string[]>([]);
  const [relatorioFilterStaffIds, setRelatorioFilterStaffIds] = useState<string[]>([]);
  const [relatorioDia, setRelatorioDia] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  });
  const [pontoRelatorioPorFid, setPontoRelatorioPorFid] = useState<
    Map<string, { check_in_at: string | null; check_out_at: string | null }>
  >(() => new Map());
  const [gestaoRelatorioPorChave, setGestaoRelatorioPorChave] = useState<Map<string, PresencaDiaGestao>>(
    () => new Map(),
  );
  const [loadingRelatorioPresenca, setLoadingRelatorioPresenca] = useState(false);
  const [sortRelatorioNomeDir, setSortRelatorioNomeDir] = useState<SortDir>("asc");

  const [rawGradeRowsRpc, setRawGradeRowsRpc] = useState<RpcGradeCalendarioRow[]>([]);
  /** Horário/turno congelados na aprovação da Gestão de Escala (mês da grade). */
  const [turnoMesMap, setTurnoMesMap] = useState<EscalaTurnoMesMap>({});
  const [loadingEscala, setLoadingEscala] = useState(false);
  const [erroEscala, setErroEscala] = useState<string | null>(null);
  /** Funcionário ligado ao login atual (e-mail / e-mail Spin). */
  const [meuRhFuncionarioId, setMeuRhFuncionarioId] = useState<string | null>(null);
  const [funcionariosGerenciaveisIds, setFuncionariosGerenciaveisIds] = useState<Set<string>>(() => new Set());
  const [mapOpTurnos, setMapOpTurnos] = useState<Map<string, OpTurnosCalPick>>(() => new Map());

  const [pontoEstado, setPontoEstado] = useState<PrestadorPontoEstado | null>(null);
  const [pontoEstadoLoading, setPontoEstadoLoading] = useState(false);
  const [pontoSubmitting, setPontoSubmitting] = useState(false);
  const [pontoMsgModal, setPontoMsgModal] = useState<string | null>(null);
  const [pontoSucessoModal, setPontoSucessoModal] = useState<PontoSucessoModalData | null>(null);
  const [pontoMesLinhas, setPontoMesLinhas] = useState<RpcPontoMesRow[]>([]);
  /** Staff cujo ponto está em `pontoMesLinhas` — evita merge otimista entre prestadores. */
  const pontoMesStaffIdRef = useRef<string | null>(null);
  const presencaGestaoStaffIdRef = useRef<string | null>(null);
  const movimentacoesPresencaStaffIdRef = useRef<string | null>(null);
  const [loadingPontoMes, setLoadingPontoMes] = useState(false);
  const [pontoMesTick, setPontoMesTick] = useState(0);
  const [reunioesMesRaw, setReunioesMesRaw] = useState<RpcReuniaoMesRow[]>([]);
  const [reunioesMesTick, setReunioesMesTick] = useState(0);
  const [presencaGestaoPorChave, setPresencaGestaoPorChave] = useState<Map<string, PresencaDiaGestao>>(
    () => new Map(),
  );
  const [loadingPresencaGestao, setLoadingPresencaGestao] = useState(false);
  const [presencaGestaoTick, setPresencaGestaoTick] = useState(0);
  /**
   * Snapshot Marketplace do staff filtrado no mês — usado só nos KPIs para contar
   * como Troca os dias gravados na grade como Venda / `Compra - Turno`.
   */
  const [movimentacoesPresencaPorChave, setMovimentacoesPresencaPorChave] = useState<
    Map<string, OverviewPrestadorMovimentacaoCelula>
  >(() => new Map());
  const [aprovacaoPresencaMes, setAprovacaoPresencaMes] = useState<PresencaAprovacaoMes | null>(null);
  const [loadingAprovacaoPresencaMes, setLoadingAprovacaoPresencaMes] = useState(false);
  const [modalAprovarPresencaMesAberto, setModalAprovarPresencaMesAberto] = useState(false);
  const [presencaAlvoModal, setPresencaAlvoModal] = useState<PresencaTurnoAlvo | null>(null);
  const [presencaHistoricoAlvo, setPresencaHistoricoAlvo] = useState<{
    dia: Date;
    funcionarioId: string;
    justificativaMedico?: PresencaJustificativaMeta;
  } | null>(null);
  const [presencaJustificarAlvo, setPresencaJustificarAlvo] = useState<PresencaJustificarAlvo | null>(null);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);
  const soPropriosCal =
    !perm.loading &&
    perm.canView === "proprios" &&
    prestadores.length <= 1;

  useEffect(() => {
    if (perm.loading || (perm.canView !== "sim" && perm.canView !== "proprios")) {
      setTimes([]);
      setPrestadores([]);
      setMeuRhFuncionarioId(null);
      setFuncionariosGerenciaveisIds(new Set());
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    setErroStaff(null);
    void (async () => {
      const [timesRes, staffRes, meuIdRes, gerenciaveisRes, versaoRes] = await Promise.all([
        supabase.rpc("rh_calendario_times_visiveis"),
        supabase.rpc("rh_calendario_funcionarios_visiveis"),
        supabase.rpc("rh_calendario_meu_funcionario_id"),
        supabase.rpc("rh_calendario_funcionarios_gerenciaveis"),
        supabase.rpc("rh_calendario_escopo_versao"),
      ]);
      if (cancelled) return;
      if (
        timesRes.error ||
        staffRes.error ||
        meuIdRes.error ||
        gerenciaveisRes.error ||
        versaoRes.error
      ) {
        console.error("rh_calendario escopo", {
          times: timesRes.error,
          staff: staffRes.error,
          meuId: meuIdRes.error,
          gerenciaveis: gerenciaveisRes.error,
          versao: versaoRes.error,
        });
        setTimes([]);
        setPrestadores([]);
        setMeuRhFuncionarioId(null);
        setFuncionariosGerenciaveisIds(new Set());
        setErroStaff(
          "Não foi possível carregar os times e prestadores. Se o problema persistir, entre em contato com o suporte.",
        );
      } else {
        setTimes((timesRes.data ?? []) as StaffTimeRow[]);
        setPrestadores(
          ((staffRes.data ?? []) as RhFuncionario[]).sort((a, b) =>
            (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"),
          ),
        );
        setMeuRhFuncionarioId((meuIdRes.data as string | null) ?? null);
        setFuncionariosGerenciaveisIds(
          new Set(
            ((gerenciaveisRes.data ?? []) as { funcionario_id: string }[]).map(
              (row) => row.funcionario_id,
            ),
          ),
        );
        setEscopoVersao(versaoRes.data ? String(versaoRes.data) : null);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, escopoRefreshTick]);

  useEffect(() => {
    if (perm.loading || (perm.canView !== "sim" && perm.canView !== "proprios")) return;
    let cancelled = false;
    const verificarEscopoAtual = async () => {
      const { data, error } = await supabase.rpc("rh_calendario_escopo_versao");
      if (cancelled || error || !data) return;
      const proximaVersao = String(data);
      if (escopoVersao && proximaVersao !== escopoVersao) {
        setEscopoVersao(proximaVersao);
        setEscopoRefreshTick((tick) => tick + 1);
      } else if (!escopoVersao) {
        setEscopoVersao(proximaVersao);
      }
    };
    const verificarAoFocar = () => void verificarEscopoAtual();
    const verificarAoExibir = () => {
      if (document.visibilityState === "visible") void verificarEscopoAtual();
    };
    // Organograma muda raramente — verificação leve a cada 5 min + ao voltar o foco à aba.
    const intervalId = window.setInterval(() => void verificarEscopoAtual(), 300_000);
    window.addEventListener("focus", verificarAoFocar);
    document.addEventListener("visibilitychange", verificarAoExibir);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", verificarAoFocar);
      document.removeEventListener("visibilitychange", verificarAoExibir);
    };
  }, [perm.loading, perm.canView, escopoVersao]);

  useEffect(() => {
    if (!soPropriosCal || !meuRhFuncionarioId) return;
    setPresencaFilterStaffIds([meuRhFuncionarioId]);
    setRelatorioFilterStaffIds([meuRhFuncionarioId]);
  }, [soPropriosCal, meuRhFuncionarioId]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(compFilterTimeIds.filter((id) => allowed.has(id)));
  }, [compFilterTimeIds, timeIds]);

  const filtroTimeAtivo = compFilterTimeIds.length > 0;

  const timeMultiselectItems = useMemo(() => {
    const prioridade = new Map<string, number>(
      CALENDARIO_TIMES_FILTRO_ORDEM.map((nome, index) => [nome.toLocaleLowerCase("pt-BR"), index]),
    );
    return [...times]
      .sort((a, b) => {
        const pa = prioridade.get(a.nome.trim().toLocaleLowerCase("pt-BR")) ?? Number.MAX_SAFE_INTEGER;
        const pb = prioridade.get(b.nome.trim().toLocaleLowerCase("pt-BR")) ?? Number.MAX_SAFE_INTEGER;
        return pa - pb || a.nome.localeCompare(b.nome, "pt-BR");
      })
      .map((row) => ({ id: row.id, name: row.nome }));
  }, [times]);

  useEffect(() => {
    const valid = new Set(timeMultiselectItems.map((x) => x.id));
    setCompFilterTimeIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [timeMultiselectItems]);

  useEffect(() => {
    if (prestadores.length === 0 || !filtroTimeAtivo) return;
    const opts = {
      filtroAtivo: true,
      filtroTimeIdsReais,
    };
    setCompFilterStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const allowedStaff = new Set(prestadores.filter((p) => prestadorAtendeFiltroTime(p, opts)).map((p) => p.id));
      const next = prev.filter((id) => allowedStaff.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, compFilterTimeIds]);

  const staffMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais]);

  const presencaFiltroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(presencaFilterTimeIds.filter((id) => allowed.has(id)));
  }, [presencaFilterTimeIds, timeIds]);

  const presencaFiltroTimeAtivo = presencaFilterTimeIds.length > 0;

  const staffPresencaMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: presencaFiltroTimeAtivo,
      filtroTimeIdsReais: presencaFiltroTimeIdsReais,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [
    prestadores,
    presencaFiltroTimeAtivo,
    presencaFiltroTimeIdsReais,
  ]);

  const relatorioFiltroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(relatorioFilterTimeIds.filter((id) => allowed.has(id)));
  }, [relatorioFilterTimeIds, timeIds]);

  const relatorioFiltroTimeAtivo = relatorioFilterTimeIds.length > 0;
  const relatorioFiltroStaffAtivo = relatorioFilterStaffIds.length > 0;

  const prestadoresRelatorioTime = useMemo(() => {
    const opts = {
      filtroAtivo: relatorioFiltroTimeAtivo,
      filtroTimeIdsReais: relatorioFiltroTimeIdsReais,
    };
    const filtroStaff = relatorioFiltroStaffAtivo ? new Set(relatorioFilterStaffIds) : null;
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .filter((p) => !filtroStaff || filtroStaff.has(p.id))
      .sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR"));
  }, [
    prestadores,
    relatorioFiltroTimeAtivo,
    relatorioFiltroTimeIdsReais,
    relatorioFiltroStaffAtivo,
    relatorioFilterStaffIds,
  ]);

  const staffRelatorioMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: relatorioFiltroTimeAtivo,
      filtroTimeIdsReais: relatorioFiltroTimeIdsReais,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [prestadores, relatorioFiltroTimeAtivo, relatorioFiltroTimeIdsReais]);

  /** Relatório de Presença: só Editar = Sim (ou admin). Editar = Próprios não vê a aba. */
  const podeVerAbaRelatorioPresenca =
    !perm.loading && (user?.role === "admin" || perm.canEditar === "sim");

  useEffect(() => {
    if (!perm.loading && abaPrincipal === "relatorio" && !podeVerAbaRelatorioPresenca) {
      setAbaPrincipal("compromissos");
    }
  }, [perm.loading, abaPrincipal, podeVerAbaRelatorioPresenca, setAbaPrincipal]);

  useEffect(() => {
    if (abaPrincipal !== "relatorio") return;
    const mesAlvo = new Date(relatorioDia.getFullYear(), relatorioDia.getMonth(), 1);
    if (current.getFullYear() !== mesAlvo.getFullYear() || current.getMonth() !== mesAlvo.getMonth()) {
      setCurrent(mesAlvo);
    }
  }, [abaPrincipal, relatorioDia, current]);

  useEffect(() => {
    const valid = new Set(timeMultiselectItems.map((x) => x.id));
    setPresencaFilterTimeIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
    setRelatorioFilterTimeIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [timeMultiselectItems]);

  useEffect(() => {
    const valid = new Set(staffRelatorioMultiselectItems.map((item) => item.id));
    setRelatorioFilterStaffIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffRelatorioMultiselectItems]);

  useEffect(() => {
    const allowedIds = new Set(staffPresencaMultiselectItems.map((x) => x.id));
    setPresencaFilterStaffIds((prev) => {
      if (prev.length === 0) return prev;
      // Ver=Próprios: não dropar o próprio id enquanto a lista de staff ainda carrega.
      if (soPropriosCal && meuRhFuncionarioId && prev.length === 1 && prev[0] === meuRhFuncionarioId) {
        return prev;
      }
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffPresencaMultiselectItems, soPropriosCal, meuRhFuncionarioId]);

  const mesAnteriorPresencaRef = useMemo(
    () => refPrimeiroDiaMesAnterior(current),
    [current],
  );

  const mesesRefISOConsulta = useMemo(
    () => [refMesPrimeiroDiaISO(current), refMesPrimeiroDiaISO(mesAnteriorPresencaRef)],
    [current, mesAnteriorPresencaRef],
  );

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    let cancelled = false;
    setLoadingEscala(true);
    setErroEscala(null);
    void (async () => {
      const merged: RpcGradeCalendarioRow[] = [];
      const turnoMapMerged: EscalaTurnoMesMap = {};
      /** Só o mês do carrossel dispara o banner; o mês anterior é auxiliar (virada de turno). */
      const refMesAtual = mesesRefISOConsulta[0] ?? null;
      let erroMesAtual = false;
      try {
        const resultados = await Promise.all(
          mesesRefISOConsulta.map(async (refIso) => {
            const [{ rows, error }, turnoRes] = await Promise.all([
              carregarRhCalendarioGradeMes(refIso),
              supabase.rpc("rh_gestao_escala_turno_mes_listar", { p_ref_mes: refIso }),
            ]);
            return { refIso, rows, error, turnoRes };
          }),
        );
        if (cancelled) return;
        for (const { refIso, rows, error, turnoRes } of resultados) {
          if (error) {
            if (refIso === refMesAtual) erroMesAtual = true;
            else console.warn("rh_calendario_grade_mes (mês anterior)", refIso, error.message);
            continue;
          }
          merged.push(...rows);
          for (const row of (turnoRes.data ?? []) as {
            area_key: string;
            funcionario_id: string;
            staff_turno: string;
            staff_horario_turno: string | null;
          }[]) {
            const area = (row.area_key ?? "").trim();
            const fid = (row.funcionario_id ?? "").trim();
            const turno = (row.staff_turno ?? "").trim();
            if (!area || !fid || !turno) continue;
            turnoMapMerged[chaveTurnoMes(area, fid)] = {
              staff_turno: turno,
              staff_horario_turno: row.staff_horario_turno?.trim() || null,
            };
          }
        }
        if (!cancelled) {
          setRawGradeRowsRpc(merged);
          setTurnoMesMap(turnoMapMerged);
          setErroEscala(
            erroMesAtual
              ? "Não foi possível carregar a escala do calendário. Se o problema persistir, entre em contato com o suporte."
              : null,
          );
        }
      } finally {
        if (!cancelled) setLoadingEscala(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mesesRefISOConsulta, perm.loading, perm.canView]);

  /** Escritório: mês completo no cliente (RPC truncava em ~1000 linhas). */
  const rawGradeRows = useMemo(
    () => mesclarGradeComHorarioComercialSintetico(rawGradeRowsRpc, prestadores, mesesRefISOConsulta),
    [rawGradeRowsRpc, prestadores, mesesRefISOConsulta],
  );

  useEffect(() => {
    if (perm.loading) return;
    if (perm.canView !== "sim" && perm.canView !== "proprios") {
      setPontoEstado(null);
      setPontoEstadoLoading(false);
      return;
    }
    if (loadingEscala) return;
    let cancelled = false;
    async function loadPonto() {
      setPontoEstadoLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const tok = session?.access_token;
        if (!tok) {
          if (!cancelled) setPontoEstado(null);
          return;
        }
        const est = await obterPrestadorPontoEstado(tok);
        if (!cancelled) setPontoEstado(est);
      } finally {
        if (!cancelled) setPontoEstadoLoading(false);
      }
    }
    void loadPonto();
    const id = window.setInterval(() => {
      void loadPonto();
    }, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [perm.loading, perm.canView, loadingEscala, user?.id]);

  const rawGradeRowsFiltrados = useMemo(() => {
    if (!soPropriosCal) return rawGradeRows;
    if (!meuRhFuncionarioId) return [];
    return rawGradeRows.filter((r) => r.funcionario_id === meuRhFuncionarioId);
  }, [rawGradeRows, soPropriosCal, meuRhFuncionarioId]);

  const nomePrestadorPorId = useMemo(() => {
    const m = new Map<string, string>();
    prestadores.forEach((p) => {
      m.set(p.id, (p.nome ?? "").trim() || "—");
    });
    if (soPropriosCal && meuRhFuncionarioId && user?.name) {
      const cur = m.get(meuRhFuncionarioId);
      if (!cur || cur === "—") m.set(meuRhFuncionarioId, user.name.trim() || "—");
    }
    return m;
  }, [prestadores, soPropriosCal, meuRhFuncionarioId, user?.name]);

  const prestadorPorId = useMemo(() => {
    const m = new Map<string, RhFuncionario>();
    prestadores.forEach((p) => m.set(p.id, p));
    return m;
  }, [prestadores]);

  const meuFuncionarioIdOrganograma = meuRhFuncionarioId;
  const isAdminPresenca = user?.role === "admin";

  /**
   * ID em `rh_calendario_acoes.solicitante_funcionario_id`: a política RLS só permite INSERT quando este
   * funcionário coincide com o login (e-mail / e-mail Spin em `rh_funcionarios`). Sem esse vínculo o
   * agendamento seria rejeitado — por isso o botão «Agendar» só aparece quando conseguimos resolver o id.
   */
  const solicitanteAgendarId = meuRhFuncionarioId;

  const gradeValorPorDiaIsoAgendar = useMemo(() => {
    const m = new Map<string, string>();
    const fid = solicitanteAgendarId;
    if (!fid) return m;
    for (const r of rawGradeRows) {
      if (r.funcionario_id !== fid) continue;
      const iso = diaIsoChaveGrade(r);
      if (!iso) continue;
      if (!m.has(iso)) m.set(iso, (r.valor ?? "").trim());
    }
    return m;
  }, [rawGradeRows, solicitanteAgendarId]);

  /** Dias escalados do mês em datas estritamente futuras (regra de agendamento de reunião). */
  const diasEscaladosAgendarMes = useMemo(
    () => listarDatasEscaladoFuturasNoMes(new Date(current.getFullYear(), current.getMonth(), 1), gradeValorPorDiaIsoAgendar),
    [current, gradeValorPorDiaIsoAgendar],
  );

  const mapaPontoPorDiaIso = useMemo(() => {
    const m = new Map<string, { check_in_at: string | null; check_out_at: string | null }>();
    for (const row of pontoMesLinhas) {
      m.set(row.dia_sp.slice(0, 10), { check_in_at: row.check_in_at, check_out_at: row.check_out_at });
    }
    return m;
  }, [pontoMesLinhas]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") {
      pontoMesStaffIdRef.current = null;
      setPontoMesLinhas([]);
      return;
    }
    if (abaPrincipal !== "presenca") return;
    const fid = presencaFilterStaffIds[0];
    if (!fid) {
      pontoMesStaffIdRef.current = null;
      setPontoMesLinhas([]);
      return;
    }
    const trocouStaff = pontoMesStaffIdRef.current !== fid;
    if (trocouStaff) {
      pontoMesStaffIdRef.current = fid;
      // Limpa na hora — senão a tabela mostra check-in do prestador anterior até a RPC voltar.
      setPontoMesLinhas([]);
    }
    let cancelled = false;
    setLoadingPontoMes(true);
    const refIsos = [refMesPrimeiroDiaISO(current), refMesPrimeiroDiaISO(mesAnteriorPresencaRef)];
    void (async () => {
      const merged: RpcPontoMesRow[] = [];
      let hadError = false;
      for (const refIso of refIsos) {
        const { data, error } = await supabase.rpc("rh_calendario_ponto_registros_mes", {
          p_funcionario_id: fid,
          p_ref_mes: refIso,
        });
        if (cancelled) return;
        if (error) {
          hadError = true;
          continue;
        }
        const rows = (data ?? []) as { dia_sp: string | Date; check_in_at: string | null; check_out_at: string | null }[];
        merged.push(
          ...rows.map((r) => {
            const raw = r.dia_sp as string | Date;
            const diaStr = typeof raw === "string" ? String(raw).slice(0, 10) : toISO(new Date(raw));
            return { dia_sp: diaStr, check_in_at: r.check_in_at, check_out_at: r.check_out_at };
          }),
        );
      }
      if (cancelled) return;
      setLoadingPontoMes(false);
      if (hadError && merged.length === 0) {
        setPontoMesLinhas([]);
        return;
      }
      // Merge otimista só no mesmo Staff (ex.: pós check-in se a RPC ainda vier sem horário).
      // Nunca reaproveitar check-in/out de outro prestador ao trocar o filtro.
      setPontoMesLinhas((prev) => {
        if (trocouStaff || prev.length === 0) return merged;
        const prevPorDia = new Map(prev.map((r) => [r.dia_sp.slice(0, 10), r]));
        return merged.map((r) => {
          const key = r.dia_sp.slice(0, 10);
          const ant = prevPorDia.get(key);
          if (!ant) return r;
          return {
            ...r,
            check_in_at: r.check_in_at ?? ant.check_in_at,
            check_out_at: r.check_out_at ?? ant.check_out_at,
          };
        });
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, abaPrincipal, presencaFilterStaffIds, current, mesAnteriorPresencaRef, pontoMesTick]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || abaPrincipal !== "presenca") {
      movimentacoesPresencaStaffIdRef.current = null;
      setMovimentacoesPresencaPorChave(new Map());
      return;
    }
    const fid = presencaFilterStaffIds[0];
    if (!fid) {
      movimentacoesPresencaStaffIdRef.current = null;
      setMovimentacoesPresencaPorChave(new Map());
      return;
    }
    if (movimentacoesPresencaStaffIdRef.current !== fid) {
      movimentacoesPresencaStaffIdRef.current = fid;
      setMovimentacoesPresencaPorChave(new Map());
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("dash_overview_prestador_movimentacoes_mes", {
        p_funcionario_id: fid,
        p_ref_mes: refMesPrimeiroDiaISO(current),
      });
      if (cancelled) return;
      if (error) {
        console.error("[calendario-presenca-movimentacoes]", error);
        setMovimentacoesPresencaPorChave(new Map());
        return;
      }
      setMovimentacoesPresencaPorChave(mapOverviewPrestadorMovimentacoes(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, abaPrincipal, presencaFilterStaffIds, current, presencaGestaoTick]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") {
      presencaGestaoStaffIdRef.current = null;
      setPresencaGestaoPorChave(new Map());
      return;
    }
    if (abaPrincipal !== "presenca") return;
    const fid = presencaFilterStaffIds[0];
    if (!fid) {
      presencaGestaoStaffIdRef.current = null;
      setPresencaGestaoPorChave(new Map());
      return;
    }
    if (presencaGestaoStaffIdRef.current !== fid) {
      presencaGestaoStaffIdRef.current = fid;
      setPresencaGestaoPorChave(new Map());
    }
    let cancelled = false;
    setLoadingPresencaGestao(true);
    const refIsos = [refMesPrimeiroDiaISO(current), refMesPrimeiroDiaISO(mesAnteriorPresencaRef)];
    void (async () => {
      const merged = new Map<string, PresencaDiaGestao>();
      let hadError = false;
      for (const refIso of refIsos) {
        const { mapa, error } = await carregarPresencaGestaoMes(supabase, fid, refIso);
        if (cancelled) return;
        if (error) {
          hadError = true;
          continue;
        }
        for (const [k, v] of mapa) merged.set(k, v);
      }
      if (cancelled) return;
      setLoadingPresencaGestao(false);
      if (!hadError || merged.size > 0) setPresencaGestaoPorChave(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, abaPrincipal, presencaFilterStaffIds, current, mesAnteriorPresencaRef, presencaGestaoTick]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || abaPrincipal !== "presenca") {
      setAprovacaoPresencaMes(null);
      return;
    }
    const fid = presencaFilterStaffIds[0];
    if (!fid || !mesCalendarioPresencaFechado(current)) {
      setAprovacaoPresencaMes(null);
      return;
    }
    let cancelled = false;
    setLoadingAprovacaoPresencaMes(true);
    void (async () => {
      const { aprovacao, error } = await carregarAprovacaoPresencaMes(supabase, fid, current);
      if (cancelled) return;
      setLoadingAprovacaoPresencaMes(false);
      if (!error) setAprovacaoPresencaMes(aprovacao);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    perm.loading,
    perm.canView,
    abaPrincipal,
    presencaFilterStaffIds,
    current,
  ]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || abaPrincipal !== "relatorio" || !podeVerAbaRelatorioPresenca) {
      setPontoRelatorioPorFid(new Map());
      setGestaoRelatorioPorChave(new Map());
      setLoadingRelatorioPresenca(false);
      return;
    }
    const fids =
      relatorioFiltroTimeAtivo || relatorioFiltroStaffAtivo
        ? prestadoresRelatorioTime.map((p) => p.id)
        : [];
    if (fids.length === 0) {
      setPontoRelatorioPorFid(new Map());
      setGestaoRelatorioPorChave(new Map());
      setLoadingRelatorioPresenca(false);
      return;
    }
    let cancelled = false;
    setLoadingRelatorioPresenca(true);
    const diaIso = toISO(relatorioDia);
    void (async () => {
      // 2 RPCs em lote (antes: 3N — ponto mês + gestão mês atual + gestão mês anterior por fid).
      const [pontoRes, gestaoRes] = await Promise.all([
        carregarPontoRegistrosDiaLote(supabase, fids, diaIso),
        carregarPresencaGestaoDiaLote(supabase, fids, diaIso),
      ]);
      if (cancelled) return;
      setPontoRelatorioPorFid(pontoRes.mapa);
      setGestaoRelatorioPorChave(gestaoRes.mapa);
      setLoadingRelatorioPresenca(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    perm.loading,
    perm.canView,
    abaPrincipal,
    podeVerAbaRelatorioPresenca,
    prestadoresRelatorioTime,
    relatorioFiltroTimeAtivo,
    relatorioFiltroStaffAtivo,
    relatorioDia,
    presencaGestaoTick,
    pontoMesTick,
  ]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    const slugs = [
      ...new Set(prestadores.map((p) => (p.staff_operadora_slug ?? "").trim()).filter(Boolean)),
    ];
    if (slugs.length === 0) {
      setMapOpTurnos(new Map());
      return;
    }
    let cancelled = false;
    void fetchTurnosPorOperadoraSlugs(slugs).then((turnosMap) => {
      if (cancelled) return;
      const m = new Map<string, OpTurnosCalPick>();
      for (const slug of slugs) {
        const turnos = turnosMap.get(slug);
        if (turnos) m.set(slug, { slug, ...turnos });
      }
      setMapOpTurnos(m);
    });
    return () => {
      cancelled = true;
    };
  }, [prestadores, perm.loading, perm.canView]);

  const compromissosPorDiaIso = useMemo(() => {
    const filtroStaff = compFilterStaffIds.length > 0 ? new Set(compFilterStaffIds) : null;
    const optsTime = {
      filtroAtivo: filtroTimeAtivo,
      filtroTimeIdsReais,
    };
    const mapa = new Map<string, CompromissoEscalaCal[]>();
    for (const r of rawGradeRowsFiltrados) {
      if (filtroStaff && !filtroStaff.has(r.funcionario_id)) continue;
      if (filtroTimeAtivo) {
        const p = prestadorPorId.get(r.funcionario_id);
        if (!p || !prestadorAtendeFiltroTime(p, optsTime)) continue;
      }
      const turno = turnoExibicaoDeValorCelulaEscala(r.valor ?? "");
      if (!turno) continue;
      const iso = diaIsoChaveGrade(r);
      if (!iso) continue;
      const nome = nomePrestadorPorId.get(r.funcionario_id) ?? "—";
      const item: CompromissoEscalaCal = { prestadorId: r.funcionario_id, nome, turno };
      const arr = mapa.get(iso) ?? [];
      if (!arr.some((x) => x.prestadorId === item.prestadorId && x.turno === item.turno)) arr.push(item);
      mapa.set(iso, arr);
    }
    return mapa;
  }, [
    rawGradeRowsFiltrados,
    compFilterStaffIds,
    nomePrestadorPorId,
    prestadorPorId,
    filtroTimeAtivo,
    filtroTimeIdsReais,
  ]);

  useEffect(() => {
    setErroCalendarioPdf(null);
  }, [current]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") {
      setReunioesMesRaw([]);
      return;
    }
    let cancelled = false;
    const refIso = refMesPrimeiroDiaISO(current);
    void supabase.rpc("rh_calendario_reunioes_mes", { p_ref_mes: refIso }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setReunioesMesRaw([]);
        return;
      }
      setReunioesMesRaw((data ?? []) as RpcReuniaoMesRow[]);
    });
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, current, reunioesMesTick]);

  const reunioesItemsPorIso = useMemo(() => {
    const map = new Map<string, CompromissoAgendaExtra[]>();
    for (const row of reunioesMesRaw) {
      if (compFilterStaffIds.length > 0 && !compFilterStaffIds.includes(row.solicitante_funcionario_id)) continue;
      if (filtroTimeAtivo) {
        const p = prestadorPorId.get(row.solicitante_funcionario_id);
        if (!p || !prestadorAtendeFiltroTime(p, { filtroAtivo: true, filtroTimeIdsReais })) continue;
      }
      const iso = isoChaveDiaReuniaoRpc(row.dia_iso as string | Date | undefined);
      if (!iso) continue;
      const comQuem = ((row.reuniao_com_label ?? "").trim() || labelReuniaoCom(row.reuniao_com ?? "")).trim() || "—";
      const solicitanteNome = (row.solicitante_nome ?? "").trim() || "—";
      const isReuniaoRh = ehReuniaoComRh(row.reuniao_com) && row.solicitacao_status;
      const item: CompromissoAgendaExtra = isReuniaoRh
        ? {
            id: row.id,
            titulo: tituloChipReuniaoRhCalendario(row.solicitacao_status),
            subtituloChip: subtituloChipReuniaoRhCalendario(solicitanteNome),
            reuniaoDetalhe: {
              solicitanteNome,
              comQuemLabel: "RH",
              turno: (row.turno ?? "").trim() || "—",
              motivo: (row.motivo ?? "").trim() || "—",
              isReuniaoRh: true,
              solicitacaoStatus: row.solicitacao_status,
              observacaoRh: row.observacao_rh,
            },
          }
        : {
            id: row.id,
            titulo: tituloReuniaoNoCalendario(row, solicitanteAgendarId),
            reuniaoDetalhe: {
              solicitanteNome,
              comQuemLabel: comQuem,
              turno: (row.turno ?? "").trim() || "—",
              motivo: (row.motivo ?? "").trim() || "—",
            },
          };
      const arr = map.get(iso) ?? [];
      arr.push(item);
      map.set(iso, arr);
    }
    return map;
  }, [
    reunioesMesRaw,
    solicitanteAgendarId,
    compFilterStaffIds,
    filtroTimeAtivo,
    filtroTimeIdsReais,
    prestadorPorId,
  ]);

  const obterReunioesDiaIso = useCallback(
    (iso: string) => reunioesItemsPorIso.get(iso) ?? [],
    [reunioesItemsPorIso],
  );

  function treinamentosAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }
  function feedbackAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }
  function eventosAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }

  function turnosAgendadosNoDia(date: Date): CompromissoEscalaCal[] {
    return ordenarTurnosCalendario(compromissosPorDiaIso.get(toISO(date)) ?? []);
  }

  /** Linhas do dia na grelha: Eventos → Reuniões → Treinamentos → Feedback → Turnos. */
  function linhasCompromissosDiaCalendario(date: Date): LinhaCalendarioDia[] {
    const iso = toISO(date);
    const turnosOrd = ordenarTurnosCalendario(compromissosPorDiaIso.get(iso) ?? []);
    const turnLinhas: LinhaCalendarioDia[] = turnosOrd.map((comp) => ({ tipo: "turno", comp }));
    const ev: LinhaCalendarioDia[] = eventosAgendaDoDia(iso).map((item) => ({ tipo: "evento", item }));
    const r: LinhaCalendarioDia[] = obterReunioesDiaIso(iso).map((item) => ({ tipo: "reuniao", item }));
    const tr: LinhaCalendarioDia[] = treinamentosAgendaDoDia(iso).map((item) => ({ tipo: "treinamento", item }));
    const fb: LinhaCalendarioDia[] = feedbackAgendaDoDia(iso).map((item) => ({ tipo: "feedback", item }));

    if (filtroTipoCompromisso === "todos") {
      return [...ev, ...r, ...tr, ...fb, ...turnLinhas];
    }
    if (filtroTipoCompromisso === "eventos") return ev;
    if (filtroTipoCompromisso === "reunioes") return r;
    if (filtroTipoCompromisso === "treinamentos") return tr;
    if (filtroTipoCompromisso === "feedback") return fb;
    return turnLinhas;
  }

  function contagemItensCalendarioNoDia(date: Date): number {
    const iso = toISO(date);
    const turnos = compromissosPorDiaIso.get(iso) ?? [];
    const ev = eventosAgendaDoDia(iso);
    const r = obterReunioesDiaIso(iso);
    const tr = treinamentosAgendaDoDia(iso);
    const fb = feedbackAgendaDoDia(iso);
    if (filtroTipoCompromisso === "todos") {
      return turnos.length + ev.length + r.length + tr.length + fb.length;
    }
    if (filtroTipoCompromisso === "eventos") return ev.length;
    if (filtroTipoCompromisso === "reunioes") return r.length;
    if (filtroTipoCompromisso === "treinamentos") return tr.length;
    if (filtroTipoCompromisso === "feedback") return fb.length;
    return turnos.length;
  }

  function abrirModalDia(d: Date) {
    setModalDia(d);
  }

  function prev() {
    if (abaPrincipal === "relatorio") {
      const minD = diaMinimoCarrosselRelatorioPresenca(CALENDARIO_ANO_MIN, CALENDARIO_MES0_MIN);
      const maxD = diaMaximoCarrosselRelatorioPresenca(mesMaximoCarrosselCalendarioRh());
      const d = new Date(relatorioDia);
      d.setDate(d.getDate() - 1);
      setRelatorioDia(clamarDiaCarrosselRelatorioPresenca(d, minD, maxD));
      return;
    }
    if (!podeRetrocederMesCalendario(current)) return;
    const d = new Date(current);
    d.setMonth(d.getMonth() - 1);
    if (mesCalendarioAntesDoMinimo(d)) setCurrent(dataInicialCarrosselCalendarioRh());
    else setCurrent(d);
  }
  function next() {
    if (abaPrincipal === "relatorio") {
      const minD = diaMinimoCarrosselRelatorioPresenca(CALENDARIO_ANO_MIN, CALENDARIO_MES0_MIN);
      const maxD = diaMaximoCarrosselRelatorioPresenca(mesMaximoCarrosselCalendarioRh());
      const d = new Date(relatorioDia);
      d.setDate(d.getDate() + 1);
      setRelatorioDia(clamarDiaCarrosselRelatorioPresenca(d, minD, maxD));
      return;
    }
    if (!podeAvancarMesCalendario(current)) return;
    const d = new Date(current);
    d.setMonth(d.getMonth() + 1);
    if (mesCalendarioAlemDoMaximoFuturo(d)) setCurrent(mesMaximoCarrosselCalendarioRh());
    else setCurrent(d);
  }

  function headerTitle() {
    if (abaPrincipal === "relatorio") return labelCarrosselDiaRelatorioPresenca(relatorioDia);
    return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  }

  function dayStyle(date: Date, todayISO: string): CSSProperties {
    const iso = toISO(date);
    if (iso === todayISO) {
      return {
        border: `1.5px solid ${BRAND.azul}55`,
        background: isDark ? "rgba(30,54,248,0.10)" : "rgba(30,54,248,0.06)",
      };
    }
    if (iso < todayISO) {
      return {
        border: `1.5px solid rgba(232,64,37,0.22)`,
        background: isDark ? "rgba(232,64,37,0.07)" : "rgba(232,64,37,0.04)",
      };
    }
    return {
      border: `1.5px solid rgba(34,197,94,0.22)`,
      background: isDark ? "rgba(34,197,94,0.07)" : "rgba(34,197,94,0.04)",
    };
  }

  function dayNumberColor(date: Date, todayISO: string) {
    const iso = toISO(date);
    if (iso === todayISO) return BRAND.azul;
    if (iso < todayISO) return isDark ? "rgba(232,64,37,0.65)" : "rgba(232,64,37,0.75)";
    return isDark ? "rgba(34,197,94,0.75)" : "rgba(34,197,94,0.85)";
  }

  const contentBox = getPageContentBoxStyle(brand, t);
  const cardShadow = isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  /** Início/fim do turno (ou "—"); `undefined` para Compra/Venda/Troca. */
  function horarioStaffTurnoMesSnap(funcionarioId: string, areaKey: string | null | undefined): string | null {
    const a = (areaKey ?? "").trim();
    if (!a) return null;
    return turnoMesMap[chaveTurnoMes(a, funcionarioId)]?.staff_horario_turno ?? null;
  }

  function horarioSubtituloParaCompromissoCal(comp: CompromissoEscalaCal, diaIso?: string): string | undefined {
    if (turnoCalendarioEhCompraVendaTroca(comp.turno)) return undefined;
    const pRow = prestadorPorId.get(comp.prestadorId);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) : undefined;
    const area = diaIso ? areaKeyGradeDia(rawGradeRows, comp.prestadorId, diaIso) : null;
    const horario = resumoHorarioTurnoModalCalendario(
      pRow,
      comp.turno,
      opRow ?? null,
      horarioStaffTurnoMesSnap(comp.prestadorId, area),
    );
    return horario ?? "—";
  }

  /** Monta o mês do PDF (todos os dias) com turnos/folgas e reuniões do próprio usuário. */
  function montarDiasPdfMeuCalendario(): RhCalendarioPdfDia[] {
    const fid = meuRhFuncionarioId;
    if (!fid) return [];
    const y = current.getFullYear();
    const m = current.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const nome = (nomePrestadorPorId.get(fid) ?? user?.name ?? "").trim() || "—";
    const out: RhCalendarioPdfDia[] = [];

    for (let d = 1; d <= last; d++) {
      const iso = toISO(new Date(y, m, d));
      const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
      const turno = turnoExibicaoDeValorCelulaEscala(valorG ?? "");
      let turnoLinha: string | null = null;
      if (turno) {
        const horario = horarioSubtituloParaCompromissoCal(
          { prestadorId: fid, nome, turno },
          iso,
        );
        turnoLinha = horario && horario !== "—" ? `${turno} — ${horario}` : turno;
      }

      const reunioes: string[] = [];
      for (const row of reunioesMesRaw) {
        if (row.solicitante_funcionario_id !== fid) continue;
        if (isoChaveDiaReuniaoRpc(row.dia_iso as string | Date | undefined) !== iso) continue;
        const comQuem = ehReuniaoComRh(row.reuniao_com)
          ? "RH"
          : ((row.reuniao_com_label ?? "").trim() || labelReuniaoCom(row.reuniao_com ?? "")).trim() ||
            "—";
        reunioes.push(`Reunião - ${comQuem}`);
      }

      out.push({
        diaIso: iso,
        diaNumero: d,
        diaSemanaCurto: diaSemanaCurtoPdf(iso),
        diaSemanaLista: diaSemanaListaPdf(iso),
        turnoLinha,
        reunioes,
      });
    }
    return out;
  }

  function nomeTimePdfMeuCalendario(fid: string): string {
    const p = prestadorPorId.get(fid);
    if (!p) return "—";
    if (p.org_time_id) {
      const t = times.find((x) => x.id === p.org_time_id);
      if (t?.nome?.trim()) return t.nome.trim();
    }
    if (p.org_gerencia_id) {
      const gSemTime = times.find((x) => x.id === p.org_gerencia_id && x.id === x.gerencia_id);
      if (gSemTime?.nome?.trim()) return gSemTime.nome.trim();
      const qualquer = times.find((x) => x.gerencia_id === p.org_gerencia_id);
      if (qualquer?.gerencia_nome?.trim()) return qualquer.gerencia_nome.trim();
    }
    return "—";
  }

  async function onBaixarCalendarioPdf() {
    const fid = meuRhFuncionarioId;
    if (!fid || baixandoCalendarioPdf) return;
    setErroCalendarioPdf(null);
    setBaixandoCalendarioPdf(true);
    try {
      const nome = (nomePrestadorPorId.get(fid) ?? user?.name ?? "").trim() || "Usuário";
      const ano = current.getFullYear();
      const mes0 = current.getMonth();
      await baixarCalendarioCompromissosPdf({
        mesLabel: `${MONTHS[mes0]} ${ano}`,
        nomePessoa: nome,
        timeNome: nomeTimePdfMeuCalendario(fid),
        ano,
        mes0,
        dias: montarDiasPdfMeuCalendario(),
      });
    } catch (e) {
      console.error("[Calendario] PDF:", e);
      setErroCalendarioPdf(
        "Não foi possível baixar o calendário. Se o problema persistir, entre em contato com o suporte.",
      );
    } finally {
      setBaixandoCalendarioPdf(false);
    }
  }

  function obterEntradaSaidaDiaCal(
    pRow: RhFuncionario | undefined,
    valorG: string | null | undefined,
    opRow: OpTurnosHorarioPick | null | undefined,
    funcionarioId: string,
    iso: string,
  ) {
    const area = areaKeyGradeDia(rawGradeRows, funcionarioId, iso);
    return obterEntradaSaidaEscaladasPrestadorDia(
      pRow,
      valorG,
      opRow,
      area,
      horarioStaffTurnoMesSnap(funcionarioId, area),
    );
  }

  /** Situação (coluna Controle de Presença) para o dia do prestador em modo «Próprios». */
  function situacaoPresencaControleModalProprio(iso: string): string {
    const fid = meuRhFuncionarioId;
    if (!fid) return "—";
    const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
    return situacaoGestaoEscalaParaDia(valorG);
  }

  function ModalDiaReuniaoCardProprio({ item }: { item: CompromissoAgendaExtra }) {
    const det = item.reuniaoDetalhe;
    const cardStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(245,158,11,0.35)",
      background: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
      fontFamily: FONT.body,
    };
    if (!det) {
      return (
        <div role="listitem" style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: t.text, lineHeight: 1.4 }}>
            <Users size={14} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{item.titulo}</span>
          </div>
        </div>
      );
    }
    if (det.isReuniaoRh && det.solicitacaoStatus) {
      const mostrarObs = exibirObservacaoRhModalReuniao(det.solicitacaoStatus);
      return (
        <div role="listitem" style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Users size={14} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, minWidth: 0, fontWeight: 700 }}>
              {tituloModalReuniaoRhCalendario(det.solicitacaoStatus)}
            </div>
          </div>
          {mostrarObs ? (
            <div
              style={{
                fontSize: 12,
                color: t.text,
                paddingLeft: 22,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
              }}
            >
              {det.observacaoRh?.trim() || "—"}
            </div>
          ) : null}
        </div>
      );
    }
    return (
      <div role="listitem" style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Users size={14} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, minWidth: 0 }}>
            Reunião com {det.comQuemLabel} - {det.turno}
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: t.text,
            paddingLeft: 22,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          {det.motivo}
        </div>
      </div>
    );
  }

  function ModalDiaTurnoCardProprio({ comp, iso }: { comp: CompromissoEscalaCal; iso: string }) {
    const horario = horarioSubtituloParaCompromissoCal(comp, iso);
    const situacao = situacaoPresencaControleModalProprio(iso);
    const linhaHorario = horario !== undefined ? `${horario} - ${situacao}` : situacao;
    return (
      <div
        role="listitem"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${BRAND.azul}40`,
          background: isDark ? "rgba(30,54,248,0.12)" : "rgba(30,54,248,0.08)",
          fontFamily: FONT.body,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Clock size={14} color={BRAND.azul} aria-hidden="true" style={{ flexShrink: 0, width: 14, height: 14, marginTop: 2 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.azul, lineHeight: 1.4, minWidth: 0 }}>
            Turno de {comp.turno}
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            color: t.textMuted,
            paddingLeft: 22,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.45,
          }}
        >
          {linhaHorario}
        </div>
      </div>
    );
  }

  function AgendaExtraDiaChip({
    linha,
  }: {
    linha: Extract<
      LinhaCalendarioDia,
      { tipo: "evento" } | { tipo: "reuniao" } | { tipo: "treinamento" } | { tipo: "feedback" }
    >;
  }) {
    const { tipo, item } = linha;
    const temSubtitulo = Boolean(item.subtituloChip?.trim());
    const etiqueta =
      tipo === "evento"
        ? "Evento"
        : tipo === "reuniao"
          ? "Reunião"
          : tipo === "treinamento"
            ? "Treinamento"
            : "Feedback";
    const Icon = tipo === "evento" ? CalendarDays : tipo === "reuniao" ? Users : tipo === "treinamento" ? BookOpen : MessageSquare;
    const cor = tipo === "evento" ? "#a78bfa" : "#f59e0b";
    const bg = tipo === "evento" ? (isDark ? "rgba(167,139,250,0.12)" : "rgba(167,139,250,0.08)") : isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)";
    const border = tipo === "evento" ? "rgba(167,139,250,0.45)" : "rgba(245,158,11,0.35)";
    return (
      <div
        role="listitem"
        style={{
          display: "flex",
          flexDirection: temSubtitulo ? "column" : "row",
          alignItems: temSubtitulo ? "stretch" : "center",
          gap: temSubtitulo ? 4 : 6,
          padding: "5px 8px",
          borderRadius: 8,
          marginBottom: 4,
          background: bg,
          border: `1px solid ${border}`,
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, width: "100%" }}>
          <Icon
            size={11}
            color={cor}
            aria-hidden="true"
            style={{ flexShrink: 0, width: 11, height: 11 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: cor,
              fontFamily: FONT.body,
              flexShrink: 0,
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {etiqueta}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: t.text,
              fontFamily: FONT.body,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              lineHeight: 1.2,
            }}
            title={temSubtitulo ? `${item.titulo}\n${item.subtituloChip}` : `${etiqueta} — ${item.titulo}`}
          >
            {item.titulo}
          </span>
        </div>
        {temSubtitulo ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: t.textMuted,
              fontFamily: FONT.body,
              paddingLeft: 17,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
            title={item.subtituloChip}
          >
            {item.subtituloChip}
          </div>
        ) : null}
      </div>
    );
  }

  function EscalaCompromissoChip({
    comp,
    subtituloModal,
  }: {
    comp: CompromissoEscalaCal;
    /** Segunda linha: início/fim (ou "—") no modal; na grelha só em modo «Próprios» (prestador). */
    subtituloModal?: string;
  }) {
    const temSubtitulo = subtituloModal !== undefined;
    return (
      <div
        role="listitem"
        style={{
          display: "flex",
          flexDirection: temSubtitulo ? "column" : "row",
          alignItems: temSubtitulo ? "stretch" : "center",
          gap: temSubtitulo ? 4 : 6,
          padding: "5px 8px",
          borderRadius: 8,
          marginBottom: 4,
          background: isDark ? "rgba(30,54,248,0.12)" : "rgba(30,54,248,0.08)",
          border: `1px solid ${BRAND.azul}40`,
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            width: "100%",
          }}
        >
          <Clock
            size={11}
            color={BRAND.azul}
            aria-hidden="true"
            style={{ flexShrink: 0, width: 11, height: 11 }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: BRAND.azul,
              fontFamily: FONT.body,
              flexShrink: 0,
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {comp.turno}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: t.text,
              fontFamily: FONT.body,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              lineHeight: 1.2,
            }}
            title={`${comp.turno} — ${comp.nome}`}
          >
            {comp.nome}
          </span>
        </div>
        {temSubtitulo ? (
          <div
            style={{
              fontSize: 11,
              color: t.textMuted,
              fontFamily: FONT.body,
              paddingLeft: 17,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.35,
            }}
          >
            {subtituloModal}
          </div>
        ) : null}
      </div>
    );
  }

  function ViewMes() {
    const cells = getMonthDays(current.getFullYear(), current.getMonth());
    const todayISO = toISO(new Date());
    return (
      <div className="app-agenda-cal-scroll">
        <div className="app-agenda-cal-scroll-inner">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.textMuted,
                  padding: "8px 0",
                  fontFamily: FONT.body,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(140px, auto)", gap: 4 }}>
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const lista = linhasCompromissosDiaCalendario(date);
              const totalDia = contagemItensCalendarioNoDia(date);
              return (
                <div
                  key={i}
                  tabIndex={0}
                  onClick={() => abrirModalDia(date)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      abrirModalDia(date);
                    }
                  }}
                  aria-label={`Abrir detalhes do dia ${date.getDate()} de ${MONTHS[date.getMonth()]}`}
                  style={{
                    minHeight: 140,
                    padding: 8,
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    transition: "background 0.15s",
                    cursor: "pointer",
                    outline: "none",
                    ...dayStyle(date, todayISO),
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexShrink: 0,
                      ...(lista.length === 0 ? { flex: 1, minHeight: 72 } : {}),
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: toISO(date) === todayISO ? 700 : 400,
                        color: dayNumberColor(date, todayISO),
                        fontFamily: FONT.body,
                      }}
                    >
                      {date.getDate()}
                    </span>
                    {totalDia > 0 && (
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#fff",
                          background: brand.accent,
                          borderRadius: 10,
                          padding: "1px 6px",
                          fontFamily: FONT.body,
                        }}
                      >
                        {totalDia}
                      </span>
                    )}
                  </div>
                  <div
                    className="agenda-day-scroll"
                    style={{ marginTop: 4, flex: 1, minHeight: 0, overflowY: "auto" }}
                    role="list"
                    aria-label="Compromissos do dia na grelha"
                  >
                    {lista.slice(0, MAX_CHIPS_COMPROMISSOS_DIA).map((linha) =>
                      linha.tipo === "turno" ? (
                        <EscalaCompromissoChip
                          key={`${linha.comp.prestadorId}-${linha.comp.turno}`}
                          comp={linha.comp}
                          subtituloModal={soPropriosCal ? horarioSubtituloParaCompromissoCal(linha.comp, toISO(date)) : undefined}
                        />
                      ) : (
                        <AgendaExtraDiaChip key={`${linha.tipo}-${linha.item.id}`} linha={linha} />
                      ),
                    )}
                    {lista.length > MAX_CHIPS_COMPROMISSOS_DIA && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalDia(date);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            abrirModalDia(date);
                          }
                        }}
                        aria-label={`Ver mais ${lista.length - MAX_CHIPS_COMPROMISSOS_DIA} compromissos`}
                        style={{
                          fontSize: 11,
                          color: t.textMuted,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                          display: "inline-block",
                        }}
                      >
                        +{lista.length - MAX_CHIPS_COMPROMISSOS_DIA} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const onPrestadorPontoRegistrar = useCallback(async () => {
    setPontoMsgModal(null);
    setPontoSucessoModal(null);
    const tipoRegistro = pontoEstado?.proximoTipo;
    const { data: { session } } = await supabase.auth.getSession();
    const tok = session?.access_token;
    if (!tok) return;
    setPontoSubmitting(true);
    try {
      const res = await registrarPrestadorPonto(tok);
      if (res.ok && res.estado) {
        setPontoEstado(res.estado);
        const diaRegistro = String(
          res.registro?.diaSp ?? res.estado.turnoDiaSp ?? res.estado.diaSp ?? "",
        ).slice(0, 10);
        const createdAtReg = res.registro?.createdAt ?? new Date().toISOString();
        if (diaRegistro && (tipoRegistro === "check_in" || tipoRegistro === "check_out")) {
          // Atualização otimista: evita tela vazia se a RPC ainda resolver Auth pelo e-mail errado.
          setPontoMesLinhas((prev) => {
            const idx = prev.findIndex((r) => r.dia_sp.slice(0, 10) === diaRegistro);
            if (idx >= 0) {
              const cur = prev[idx]!;
              const next = [...prev];
              next[idx] = {
                ...cur,
                check_in_at:
                  tipoRegistro === "check_in" ? createdAtReg : cur.check_in_at ?? createdAtReg,
                check_out_at: tipoRegistro === "check_out" ? createdAtReg : cur.check_out_at,
              };
              return next;
            }
            return [
              ...prev,
              {
                dia_sp: diaRegistro,
                check_in_at: tipoRegistro === "check_in" ? createdAtReg : null,
                check_out_at: tipoRegistro === "check_out" ? createdAtReg : null,
              },
            ];
          });
        }
        setPontoMesTick((x) => x + 1);
        if (tipoRegistro === "check_in" || tipoRegistro === "check_out") {
          const agora = new Date();
          const subtitulo = formatarSubtituloPontoRealizado(agora);
          if (tipoRegistro === "check_in") {
            setPontoSucessoModal({
              tipo: "check_in",
              subtitulo,
              corpo: "Turno iniciado, bom turno.",
            });
          } else {
            const diaIso = String(
              res.registro?.diaSp ?? res.estado.turnoDiaSp ?? res.estado.diaSp ?? toISO(agora),
            ).slice(0, 10);
            let checkInAt = mapaPontoPorDiaIso.get(diaIso)?.check_in_at ?? null;
            if (!checkInAt && res.estado.rhFuncionarioId) {
              const refIso = refMesPrimeiroDiaISO(new Date(`${diaIso}T12:00:00`));
              const { data } = await supabase.rpc("rh_calendario_ponto_registros_mes", {
                p_funcionario_id: res.estado.rhFuncionarioId,
                p_ref_mes: refIso,
              });
              const rows = (data ?? []) as { dia_sp: string | Date; check_in_at: string | null }[];
              for (const row of rows) {
                const raw = row.dia_sp;
                const ds =
                  typeof raw === "string" ? String(raw).slice(0, 10) : toISO(new Date(raw as Date));
                if (ds === diaIso) {
                  checkInAt = row.check_in_at;
                  break;
                }
              }
            }
            const horas = duracaoEntreTimestamps(checkInAt, agora.toISOString());
            setPontoSucessoModal({
              tipo: "check_out",
              subtitulo,
              corpo: `Turno encerrado, você cumpriu ${horas} horas neste turno.`,
            });
          }
        }
        return;
      }
      if (res.code === "rede" || res.code === "config") {
        setPontoMsgModal(MSG_PRESTADOR_PONTO_REDE);
      } else {
        setPontoMsgModal(res.error ?? "Não foi possível registrar.");
      }
      if (res.estado) setPontoEstado(res.estado);
    } finally {
      setPontoSubmitting(false);
    }
  }, [pontoEstado?.proximoTipo, mapaPontoPorDiaIso]);

  const gradeEstudioAusenteNoMes =
    !loadingEscala &&
    !erroEscala &&
    prestadores.some((p) => p.area_atuacao !== "escritorio" && !prestadorUsaHorarioComercialSintetico(p)) &&
    !rawGradeRows.some((r) => {
      const ak = (r.area_key ?? "").trim().toLowerCase();
      return ak !== "escritorio" && ak !== AREA_KEY_HORARIO_COMERCIAL_SINTETICO;
    });

  const mostrarBotaoPontoCalendario =
    !perm.loading && (perm.canView === "sim" || perm.canView === "proprios");
  const labelBotaoPonto =
    pontoEstado?.proximoTipo === "check_out" ? "Fazer Check-out" : "Fazer Check-in";
  const pontoBotaoHabilitado =
    mostrarBotaoPontoCalendario &&
    !pontoEstadoLoading &&
    !pontoSubmitting &&
    pontoEstado?.proximoTipo != null;
  const pontoBotaoTitle = (() => {
    if (!mostrarBotaoPontoCalendario) return undefined;
    if (pontoEstadoLoading) return "Carregando estado do ponto…";
    if (!pontoEstado) return "Não foi possível obter o estado do ponto.";
    if (!pontoEstado.rhFuncionarioId) {
      return "Não há colaborador em RH associado ao seu e-mail de login (e-mail ou e-mail Spin).";
    }
    if (pontoEstado.proximoTipo == null) return "Check-in e Check-out de hoje já foram registrados.";
    return undefined;
  })();

  const showTimeFilter = !soPropriosCal && timeMultiselectItems.length > 0;
  const showStaffFilter = !soPropriosCal && staffMultiselectItems.length > 0;
  const hasStaffFilterComp = compFilterStaffIds.length > 0;
  const hasTimeFilterComp = compFilterTimeIds.length > 0;
  const mostrarBotaoMeuCalendario =
    !perm.loading && Boolean(meuRhFuncionarioId) && prestadores.length > 1;
  const calendarioSoMeuAtivo =
    Boolean(meuRhFuncionarioId) &&
    compFilterStaffIds.length === 1 &&
    compFilterStaffIds[0] === meuRhFuncionarioId;
  const meuIdParaBotoesMeu = meuRhFuncionarioId;
  const mostrarBotaoMeuControle =
    !perm.loading && Boolean(meuRhFuncionarioId) && prestadores.length > 1;
  const meuControleAtivo =
    Boolean(meuIdParaBotoesMeu) &&
    presencaFilterStaffIds.length === 1 &&
    presencaFilterStaffIds[0] === meuIdParaBotoesMeu;
  const showTimeFilterPresenca = !soPropriosCal && timeMultiselectItems.length > 0;
  const showStaffFilterPresenca = !soPropriosCal && staffPresencaMultiselectItems.length > 0;
  const filterBarSection = (withTopBorder: boolean): CSSProperties => ({
    ...getFilterBarRowStyle(),
    width: "100%",
    ...(withTopBorder ? { paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` } : {}),
  });

  const temLimparFiltrosCompromissos =
    hasStaffFilterComp || hasTimeFilterComp || filtroTipoCompromisso !== "todos";

  const diaMinRelatorio = diaMinimoCarrosselRelatorioPresenca(CALENDARIO_ANO_MIN, CALENDARIO_MES0_MIN);
  const diaMaxRelatorio = diaMaximoCarrosselRelatorioPresenca(mesMaximoCarrosselCalendarioRh());
  const podeRetrocederDiaRelatorio = toISO(relatorioDia) > toISO(diaMinRelatorio);
  const podeAvancarDiaRelatorio = toISO(relatorioDia) < toISO(diaMaxRelatorio);
  const podeAvancarMes = podeAvancarMesCalendario(current);
  const podeRetrocederCarrossel =
    abaPrincipal === "relatorio" ? podeRetrocederDiaRelatorio : podeRetrocederMesCalendario(current);
  const podeAvancarCarrossel = abaPrincipal === "relatorio" ? podeAvancarDiaRelatorio : podeAvancarMes;

  const diasDoMesPresenca = useMemo(() => {
    const y = current.getFullYear();
    const m = current.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const out: Date[] = [];
    for (let d = 1; d <= last; d++) out.push(new Date(y, m, d));
    return out;
  }, [current]);

  const indiceJustificativaMedicoPresenca = useMemo(() => {
    const fid = presencaFilterStaffIds[0];
    if (!fid) return new Map<string, PresencaJustificativaMeta>();
    return construirIndiceJustificativaMedicoPorDia(
      Array.from(presencaGestaoPorChave.entries())
        .filter(([k]) => k.startsWith(`${fid}:`))
        .map(([chave, gestao]) => ({ chave, gestao })),
      fid,
      (iso) => situacaoGestaoEscalaParaDia(primeiroValorGradeDia(rawGradeRows, fid, iso)),
    );
  }, [presencaFilterStaffIds, presencaGestaoPorChave, rawGradeRows]);

  const mesPresencaFechado = mesCalendarioPresencaFechado(current);
  const mesPresencaFuturo = mesCalendarioPresencaFuturo(current);

  const escUltimoDiaMesCarousel = useMemo(() => {
    if (!mesPresencaFechado || diasDoMesPresenca.length === 0) return null;
    const fid = presencaFilterStaffIds[0];
    if (!fid) return null;
    const ultimoDia = diasDoMesPresenca[diasDoMesPresenca.length - 1]!;
    const iso = toISO(ultimoDia);
    const pRow = prestadorPorId.get(fid);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
    const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
    return obterEntradaSaidaDiaCal(pRow, valorG, opRow, fid, iso);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- helper local do render (rawGradeRows/turnoMesMap já nas deps)
  }, [mesPresencaFechado, diasDoMesPresenca, presencaFilterStaffIds, prestadorPorId, mapOpTurnos, rawGradeRows, turnoMesMap]);

  const exibirCheckInMesFechadoExcecao = useMemo(() => {
    if (!mesPresencaFechado) return false;
    const fid = presencaFilterStaffIds[0];
    if (!fid || fid !== meuFuncionarioIdOrganograma) return false;
    if (!escUltimoDiaMesCarousel) return false;
    return deveExibirCheckInMesFechadoPresenca({
      refMes: current,
      ultimoDiaMesEntEsc: escUltimoDiaMesCarousel.entrada,
      ultimoDiaMesSaiEsc: escUltimoDiaMesCarousel.saida,
      proximoTipo: pontoEstado?.proximoTipo,
    });
  }, [
    mesPresencaFechado,
    presencaFilterStaffIds,
    meuFuncionarioIdOrganograma,
    escUltimoDiaMesCarousel,
    current,
    pontoEstado?.proximoTipo,
  ]);

  const mostrarBotaoCheckInPresenca =
    mostrarBotaoPontoCalendario &&
    !mesPresencaFuturo &&
    (!mesPresencaFechado || exibirCheckInMesFechadoExcecao);

  const podeGerirPresencaStaff = useCallback(
    (fid: string | undefined | null) => {
      if (!fid) return false;
      if (isAdminPresenca || perm.canEditar === "sim") return true;
      if (perm.canEditar !== "proprios") return false;
      // `rh_calendario_funcionarios_gerenciaveis` exclui o próprio — Meu Controle precisa das ações.
      if (meuRhFuncionarioId && fid === meuRhFuncionarioId) return true;
      return funcionariosGerenciaveisIds.has(fid);
    },
    [isAdminPresenca, perm.canEditar, funcionariosGerenciaveisIds, meuRhFuncionarioId],
  );

  /** Justificar a própria falta/pendência: disponível no Meu Controle mesmo só com Ver. */
  const podeJustificarPresencaStaff = useCallback(
    (fid: string | undefined | null) => {
      if (!fid) return false;
      if (podeGerirPresencaStaff(fid)) return true;
      if (perm.canView !== "sim" && perm.canView !== "proprios") return false;
      return Boolean(meuRhFuncionarioId && fid === meuRhFuncionarioId);
    },
    [podeGerirPresencaStaff, perm.canView, meuRhFuncionarioId],
  );

  const podeAprovarPresencaMes = useMemo(() => {
    const fid = presencaFilterStaffIds[0];
    if (!fid || !mesPresencaFechado) return false;
    return podeGerirPresencaStaff(fid);
  }, [presencaFilterStaffIds, mesPresencaFechado, podeGerirPresencaStaff]);

  const linhasAprovacaoPresencaMes = useMemo((): PresencaMesAprovacaoLinha[] => {
    const fid = presencaFilterStaffIds[0];
    if (!fid) return [];
    const pRow = prestadorPorId.get(fid);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
    const out: PresencaMesAprovacaoLinha[] = [];
    for (const dia of diasDoMesPresenca) {
      const iso = toISO(dia);
      const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
      const situacao = situacaoGestaoEscalaParaDia(valorG);
      if (situacao !== "Escalado") continue;
      const esc = obterEntradaSaidaDiaCal(pRow, valorG, opRow, fid, iso);
      const pt = mapaPontoPorDiaIso.get(iso);
      const entEsc = esc ? esc.entrada : "—";
      const saiEsc = esc ? esc.saida : "—";
      const temCheckIn = Boolean(pt?.check_in_at);
      const temCheckOut = Boolean(pt?.check_out_at);
      const stBase = statusPresencaNoDia(esc, pt?.check_in_at, pt?.check_out_at);
      const gestaoDia = fundirGestaoPresencaComJustificativaMedico(
        presencaGestaoPorChave.get(chavePresencaGestao(fid, iso)),
        iso,
        situacao,
        indiceJustificativaMedicoPresenca,
      );
      const st = resolverStatusPresencaLinha({
        situacao,
        diaIso: iso,
        entEsc,
        saiEsc,
        temCheckIn,
        temCheckOut,
        statusBase: stBase,
        gestao: gestaoDia,
      });
      const correcao = gestaoDia?.correcao;
      const correcaoEntradaAlterada = correcao ? presencaCorrecaoCampoAlterado("entrada", correcao) : false;
      const correcaoSaidaAlterada = correcao ? presencaCorrecaoCampoAlterado("saida", correcao) : false;
      const correcaoAprovada =
        Boolean(correcao) && presencaCorrecaoAnaliseStatusEfetivo(correcao) === "aprovada";
      const entReal = horaRegistoSP(pt?.check_in_at);
      const saiReal = horaRegistoSP(pt?.check_out_at);
      const entRealExib =
        correcaoAprovada && correcao && correcaoEntradaAlterada ? correcao.entradaCorrigida : entReal;
      const saiRealExib =
        correcaoAprovada && correcao && correcaoSaidaAlterada ? correcao.saidaCorrigida : saiReal;
      out.push({
        diaIso: iso,
        dataLabel: dia.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }),
        entRealExib,
        saiRealExib,
        status: st,
      });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- obterEntradaSaidaDiaCal helper local do render
  }, [
    presencaFilterStaffIds,
    diasDoMesPresenca,
    prestadorPorId,
    mapOpTurnos,
    rawGradeRows,
    mapaPontoPorDiaIso,
    presencaGestaoPorChave,
    indiceJustificativaMedicoPresenca,
  ]);

  const calcularKpisPresencaReferenciaMes = useCallback(
    (refMes: Date) => {
      const fid = presencaFilterStaffIds[0];
      if (!fid) return PRESENCA_KPIS_ZERO;
      const pRow = prestadorPorId.get(fid);
      const slug = (pRow?.staff_operadora_slug ?? "").trim();
      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
      const diasInput = diasReferenciaMesPresenca(refMes).map((dia) => {
        const iso = toISO(dia);
        const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
        const situacao = situacaoGestaoEscalaParaDia(valorG);
        const esc = obterEntradaSaidaDiaCal(pRow, valorG, opRow, fid, iso);
        const pt = mapaPontoPorDiaIso.get(iso);
        const entEsc = esc ? esc.entrada : "—";
        const saiEsc = esc ? esc.saida : "—";
        const temCheckIn = Boolean(pt?.check_in_at);
        const temCheckOut = Boolean(pt?.check_out_at);
        const stBase = statusPresencaNoDia(esc, pt?.check_in_at, pt?.check_out_at);
        const gestaoDia = fundirGestaoPresencaComJustificativaMedico(
          presencaGestaoPorChave.get(chavePresencaGestao(fid, iso)),
          iso,
          situacao,
          indiceJustificativaMedicoPresenca,
        );
        const status = resolverStatusPresencaLinha({
          situacao,
          diaIso: iso,
          entEsc,
          saiEsc,
          temCheckIn,
          temCheckOut,
          statusBase: stBase,
          gestao: gestaoDia,
        });
        const origemTrocaMarketplace =
          movimentacoesPresencaPorChave.get(chaveMovimentacaoCelula(fid, iso))?.tipo === "troca";
        return { situacao, status, temCheckIn, origemTrocaMarketplace };
      });
      return computePresencaKpisConsolidados(diasInput);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- obterEntradaSaidaDiaCal helper local do render
    [
      presencaFilterStaffIds,
      rawGradeRows,
      mapaPontoPorDiaIso,
      presencaGestaoPorChave,
      prestadorPorId,
      mapOpTurnos,
      indiceJustificativaMedicoPresenca,
      movimentacoesPresencaPorChave,
    ],
  );

  const kpisPresencaConsolidados = useMemo(
    () => calcularKpisPresencaReferenciaMes(current),
    [calcularKpisPresencaReferenciaMes, current],
  );

  const kpisPresencaCarregando =
    presencaFilterStaffIds.length === 1 && (loadingEscala || loadingPontoMes || loadingPresencaGestao);

  const linhasRelatorioPresenca = useMemo((): RelatorioPresencaLinha[] => {
    if (!relatorioFiltroTimeAtivo && !relatorioFiltroStaffAtivo) return [];
    const iso = toISO(relatorioDia);
    const out: RelatorioPresencaLinha[] = [];
    for (const pRow of prestadoresRelatorioTime) {
      const fid = pRow.id;
      const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
      const slug = (pRow.staff_operadora_slug ?? "").trim();
      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
      const esc = obterEntradaSaidaDiaCal(pRow, valorG, opRow, fid, iso);
      const pt = pontoRelatorioPorFid.get(fid);
      const entEsc = esc ? esc.entrada : "—";
      const saiEsc = esc ? esc.saida : "—";
      const entReal = horaRegistoSP(pt?.check_in_at);
      const saiReal = horaRegistoSP(pt?.check_out_at);
      const horasEsc = esc ? formatoDuracaoFmtHorasTotal(entEsc, saiEsc) : "—";
      const horasReal = duracaoEntreTimestamps(pt?.check_in_at ?? null, pt?.check_out_at ?? null);
      const situacao = situacaoGestaoEscalaParaDia(valorG);
      const temCheckIn = Boolean(pt?.check_in_at);
      const temCheckOut = Boolean(pt?.check_out_at);
      const stBase = statusPresencaNoDia(esc, pt?.check_in_at, pt?.check_out_at);
      const chave = chavePresencaGestao(fid, iso);
      const gestaoBase = gestaoRelatorioPorChave.get(chave);
      const indiceMedicoFid = construirIndiceJustificativaMedicoPorDia(
        Array.from(gestaoRelatorioPorChave.entries())
          .filter(([k]) => k.startsWith(`${fid}:`))
          .map(([k, gestao]) => ({ chave: k, gestao })),
        fid,
        (dIso) => situacaoGestaoEscalaParaDia(primeiroValorGradeDia(rawGradeRows, fid, dIso)),
      );
      const gestaoDia = fundirGestaoPresencaComJustificativaMedico(
        gestaoBase,
        iso,
        situacao,
        indiceMedicoFid,
      );
      const paramsPresencaLinha = {
        situacao,
        diaIso: iso,
        entEsc,
        saiEsc,
        temCheckIn,
        temCheckOut,
        statusBase: stBase,
        gestao: gestaoDia,
      };
      const st = resolverStatusPresencaLinha(paramsPresencaLinha);
      const acoesBase = resolverAcoesPresencaLinha(paramsPresencaLinha);
      const acaoOk =
        acoesBase.acaoPrimaria === "justificar"
          ? podeJustificarPresencaStaff(fid)
          : acoesBase.acaoPrimaria === "aprovar"
            ? podeGerirPresencaStaff(fid)
            : true;
      const acoesLinha: typeof acoesBase = !acaoOk
        ? {
            acaoPrimaria: null,
            mostrarHistorico: acoesBase.mostrarHistorico,
            mostrarTravessaoAcoes: !acoesBase.mostrarHistorico,
          }
        : acoesBase;
      const correcao = gestaoDia?.correcao;
      const exibirIndicadorMedico = presencaJustificativaMedicoExibirIndicador(gestaoDia, iso, situacao);
      const justificativaMedico =
        gestaoDia?.justificativa?.motivo === "medico" ? gestaoDia.justificativa : null;
      const correcaoEntradaAlterada = correcao ? presencaCorrecaoCampoAlterado("entrada", correcao) : false;
      const correcaoSaidaAlterada = correcao ? presencaCorrecaoCampoAlterado("saida", correcao) : false;
      const correcaoAprovada =
        Boolean(correcao) && presencaCorrecaoAnaliseStatusEfetivo(correcao) === "aprovada";
      const entRealExib =
        correcaoAprovada && correcao && correcaoEntradaAlterada ? correcao.entradaCorrigida : entReal;
      const saiRealExib =
        correcaoAprovada && correcao && correcaoSaidaAlterada ? correcao.saidaCorrigida : saiReal;
      const horasRealExib =
        correcaoAprovada && correcao && (correcaoEntradaAlterada || correcaoSaidaAlterada)
          ? formatoDuracaoFmtHorasTotal(entRealExib, saiRealExib)
          : horasReal;
      const podeAnalisarCorrecao = Boolean(
        correcao &&
          presencaCorrecaoAnaliseStatusEfetivo(correcao) === "pendente" &&
          podeGerirPresencaStaff(fid),
      );
      out.push({
        funcionarioId: fid,
        nome: (pRow.nome ?? "").trim() || "—",
        situacao,
        entEsc,
        saiEsc,
        entRealExib,
        saiRealExib,
        horasEsc,
        horasRealExib,
        status: st,
        entRealDesvio: presencaDesvioRelogioMaior5Min(entEsc, entRealExib),
        saiRealDesvio: presencaDesvioRelogioMaior5Min(saiEsc, saiRealExib),
        horasRealDesvio:
          correcaoAprovada && correcao && (correcaoEntradaAlterada || correcaoSaidaAlterada)
            ? (() => {
                const escMin = duracaoMinutosRelogioHHMM(entEsc, saiEsc);
                const realMin = duracaoMinutosRelogioHHMM(entRealExib, saiRealExib);
                if (escMin == null || realMin == null) return false;
                return Math.abs(realMin - escMin) > 5;
              })()
            : presencaDesvioHorasMaior5Min(entEsc, saiEsc, pt?.check_in_at ?? null, pt?.check_out_at ?? null),
        acoesLinha,
        exibirIndicadorMedico,
        justificativaMedico,
        correcao,
        correcaoEntradaAlterada,
        correcaoSaidaAlterada,
        podeAnalisarCorrecao,
        dia: new Date(relatorioDia),
        entReal,
        saiReal,
        horasReal,
      });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- obterEntradaSaidaDiaCal helper local do render
  }, [
    relatorioFiltroTimeAtivo,
    relatorioFiltroStaffAtivo,
    relatorioDia,
    prestadoresRelatorioTime,
    rawGradeRows,
    mapOpTurnos,
    pontoRelatorioPorFid,
    gestaoRelatorioPorChave,
    podeGerirPresencaStaff,
    podeJustificarPresencaStaff,
  ]);

  const linhasRelatorioPresencaOrdenadas = useMemo(
    () => ordenarLinhasRelatorioPresencaPorNome(linhasRelatorioPresenca, sortRelatorioNomeDir),
    [linhasRelatorioPresenca, sortRelatorioNomeDir],
  );

  const kpiPresencaSkeletonStyle: CSSProperties = {
    height: 28,
    width: "65%",
    borderRadius: 8,
    background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  };

  const nomeUsuarioPresencaGestao = useMemo(() => {
    const nome = user?.name?.trim();
    if (nome) return nome;
    const email = user?.email?.trim();
    if (email) return email;
    return "Usuário";
  }, [user?.name, user?.email]);

  const {
    confirmarAprovacaoPresenca,
    aprovarPresencaMesTodos,
    salvarCorrecaoPresenca,
    analisarCorrecaoPresenca,
    salvarJustificativaPresenca,
  } = useCalendarioPresencaGestaoMutacoes({
    nomeUsuarioPresencaGestao,
    presencaFilterStaffIds,
    mesPresencaFechado,
    linhasAprovacaoPresencaMes,
    current,
    presencaGestaoPorChave,
    setPresencaGestaoPorChave,
    gestaoRelatorioPorChave,
    setGestaoRelatorioPorChave,
    setPresencaGestaoTick,
    setAprovacaoPresencaMes,
    setModalAprovarPresencaMesAberto,
    presencaAlvoModal,
    setPresencaAlvoModal,
    presencaJustificarAlvo,
    setPresencaJustificarAlvo,
  });

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="rh_calendario" />}
        title={getPageMenuLabel("rh_calendario")}
        subtitle="Organize a rotina operacional com visibilidade completa de turnos, trocas e compromissos."
        brand={brand}
        t={t}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
          <div className="app-marketplace-filtro-minhas">
            <span className="app-marketplace-filtro-minhas__spacer" aria-hidden="true" />
            <div
              className="app-marketplace-filtro-minhas__centro"
              role="group"
              aria-label="Período e filtros do calendário"
            >
              <button
                type="button"
                onClick={prev}
                disabled={!podeRetrocederCarrossel}
                style={getCarouselBtnNavStyle(t, !podeRetrocederCarrossel)}
                aria-label={
                  abaPrincipal === "relatorio"
                    ? podeRetrocederCarrossel
                      ? "Dia anterior"
                      : "Primeiro dia disponível"
                    : podeRetrocederCarrossel
                      ? "Mês anterior"
                      : `Primeiro mês disponível: ${MONTHS[CALENDARIO_MES0_MIN]} de ${CALENDARIO_ANO_MIN}`
                }
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span style={getCarouselPeriodLabelStyle(t, { minWidth: abaPrincipal === "relatorio" ? 220 : 180 })}>
                {headerTitle()}
              </span>
              <button
                type="button"
                onClick={next}
                disabled={!podeAvancarCarrossel}
                style={getCarouselBtnNavStyle(t, !podeAvancarCarrossel)}
                aria-label={
                  abaPrincipal === "relatorio"
                    ? podeAvancarCarrossel
                      ? "Próximo dia"
                      : "Último dia disponível"
                    : podeAvancarCarrossel
                      ? "Próximo mês"
                      : `Último mês disponível: ${MONTHS[mesMaximoCarrosselCalendarioRh().getMonth()]} de ${mesMaximoCarrosselCalendarioRh().getFullYear()}`
                }
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>

              {abaPrincipal === "compromissos" && loadingEscala ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: t.textMuted,
                    fontSize: 12,
                    fontFamily: FONT.body,
                  }}
                >
                  <Loader2
                    size={14}
                    className="app-lucide-spin"
                    aria-hidden="true"
                    color="var(--brand-primary, #7c3aed)"
                  />
                  Atualizando escala…
                </span>
              ) : null}

              {loadingStaff ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: t.textMuted,
                    fontSize: 12,
                    fontFamily: FONT.body,
                  }}
                >
                  <Loader2
                    size={14}
                    className="app-lucide-spin"
                    aria-hidden="true"
                    color="var(--brand-primary, #7c3aed)"
                  />
                  {soPropriosCal ? "Carregando…" : "Carregando staff…"}
                </span>
              ) : erroStaff ? (
                <span style={{ color: BRAND.vermelho, fontSize: 12, fontFamily: FONT.body }}>{erroStaff}</span>
              ) : abaPrincipal === "compromissos" ? (
                <>
                  {mostrarBotaoMeuCalendario ? (
                    <FiltroMeuCalendarioButton
                      active={calendarioSoMeuAtivo}
                      onClick={() => {
                        if (calendarioSoMeuAtivo) {
                          setCompFilterStaffIds([]);
                        } else {
                          setCompFilterTimeIds([]);
                          setCompFilterStaffIds([meuRhFuncionarioId!]);
                        }
                      }}
                    />
                  ) : null}
                  {showTimeFilter ? (
                    <FiltroCalendarioTimeSelect
                      selected={compFilterTimeIds}
                      onChange={setCompFilterTimeIds}
                      items={timeMultiselectItems}
                    />
                  ) : null}
                  {showStaffFilter ? (
                    <FiltroCalendarioStaffSelect
                      selected={compFilterStaffIds}
                      onChange={setCompFilterStaffIds}
                      items={staffMultiselectItems}
                    />
                  ) : null}
                </>
              ) : abaPrincipal === "relatorio" ? (
                <>
                  {showTimeFilterPresenca ? (
                    <FiltroCalendarioTimeSelect
                      selected={relatorioFilterTimeIds}
                      onChange={(ids) => setRelatorioFilterTimeIds((prev) => normalizarSelecaoUnica(prev, ids))}
                      items={timeMultiselectItems}
                    />
                  ) : null}
                  {!soPropriosCal && staffRelatorioMultiselectItems.length > 0 ? (
                    <FiltroCalendarioStaffSelect
                      selected={relatorioFilterStaffIds}
                      onChange={(ids) =>
                        setRelatorioFilterStaffIds((prev) => normalizarSelecaoUnica(prev, ids))
                      }
                      items={staffRelatorioMultiselectItems}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {mostrarBotaoMeuControle ? (
                    <FiltroMeuCalendarioButton
                      active={meuControleAtivo}
                      onClick={() => {
                        if (meuControleAtivo) {
                          setPresencaFilterStaffIds([]);
                          setPresencaFilterTimeIds([]);
                        } else {
                          setPresencaFilterTimeIds([]);
                          setPresencaFilterStaffIds([meuIdParaBotoesMeu!]);
                        }
                      }}
                      ariaLabelActive="Mostrar lista geral de staff"
                      ariaLabelInactive="Filtrar controle de presença apenas para o meu usuário"
                    >
                      Meu Controle
                    </FiltroMeuCalendarioButton>
                  ) : null}
                  {showTimeFilterPresenca ? (
                    <FiltroCalendarioTimeSelect
                      selected={presencaFilterTimeIds}
                      onChange={(ids) => setPresencaFilterTimeIds((prev) => normalizarSelecaoUnica(prev, ids))}
                      items={timeMultiselectItems}
                    />
                  ) : null}
                  {showStaffFilterPresenca ? (
                    <FiltroCalendarioStaffSelect
                      selected={presencaFilterStaffIds}
                      onChange={(ids) => setPresencaFilterStaffIds((prev) => normalizarSelecaoUnica(prev, ids))}
                      items={staffPresencaMultiselectItems}
                    />
                  ) : null}
                </>
              )}
            </div>

            <div className="app-marketplace-filtro-minhas__cta" style={{ gap: 10 }}>
              {abaPrincipal === "compromissos" && meuRhFuncionarioId ? (
                <button
                  type="button"
                  onClick={() => void onBaixarCalendarioPdf()}
                  disabled={baixandoCalendarioPdf || loadingEscala || loadingStaff}
                  aria-label="Download do calendário em PDF"
                  title="Download do calendário em PDF"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg,
                    color: t.text,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: FONT.body,
                    cursor:
                      baixandoCalendarioPdf || loadingEscala || loadingStaff ? "not-allowed" : "pointer",
                    opacity: baixandoCalendarioPdf || loadingEscala || loadingStaff ? 0.7 : 1,
                  }}
                >
                  {baixandoCalendarioPdf ? (
                    <Loader2
                      size={14}
                      className="app-lucide-spin"
                      aria-hidden="true"
                      color="var(--brand-primary, #7c3aed)"
                    />
                  ) : (
                    <FileDown size={14} aria-hidden="true" />
                  )}
                  {baixandoCalendarioPdf ? "Gerando…" : "Download"}
                </button>
              ) : null}
              {abaPrincipal === "compromissos" && solicitanteAgendarId ? (
                <CtaCriarButton type="button" onClick={() => setModalAgendarAberto(true)} aria-label="Nova Agenda">
                  Nova Agenda
                </CtaCriarButton>
              ) : null}
              {abaPrincipal === "presenca" && mostrarBotaoCheckInPresenca ? (
                <button
                  type="button"
                  onClick={() => void onPrestadorPontoRegistrar()}
                  disabled={!pontoBotaoHabilitado || pontoEstadoLoading || pontoSubmitting}
                  title={pontoBotaoTitle}
                  aria-label={labelBotaoPonto}
                  style={getCtaCriarButtonStyle(
                    brand,
                    {
                      cursor:
                        pontoBotaoHabilitado && !pontoEstadoLoading && !pontoSubmitting
                          ? "pointer"
                          : "not-allowed",
                      opacity:
                        pontoBotaoHabilitado && !pontoEstadoLoading && !pontoSubmitting ? 1 : 0.75,
                      color: pontoBotaoHabilitado ? "#fff" : t.textMuted,
                    },
                    {
                      disabled: !pontoBotaoHabilitado,
                      disabledBackground: t.inputBg,
                    },
                  )}
                >
                  {(pontoEstadoLoading || pontoSubmitting) && (
                    <Loader2 size={14} className="app-lucide-spin" color="#fff" aria-hidden="true" />
                  )}
                  {labelBotaoPonto}
                </button>
              ) : null}
              {abaPrincipal === "presenca" &&
              mesPresencaFechado &&
              presencaFilterStaffIds.length === 1 &&
              podeAprovarPresencaMes &&
              !aprovacaoPresencaMes ? (
                <button
                  type="button"
                  onClick={() => setModalAprovarPresencaMesAberto(true)}
                  disabled={loadingAprovacaoPresencaMes || loadingPresencaGestao}
                  aria-label="Aprovar Presença"
                  style={getCtaCriarButtonStyle(brand, {
                    cursor: loadingAprovacaoPresencaMes || loadingPresencaGestao ? "not-allowed" : "pointer",
                    opacity: loadingAprovacaoPresencaMes || loadingPresencaGestao ? 0.75 : 1,
                  })}
                >
                  Aprovar Presença
                </button>
              ) : null}
              {abaPrincipal === "presenca" &&
              mesPresencaFechado &&
              presencaFilterStaffIds.length === 1 &&
              aprovacaoPresencaMes ? (
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: FONT.body,
                    color: t.textMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {mensagemAprovacaoPresencaMesPt(aprovacaoPresencaMes.aprovadoEm)}
                </span>
              ) : null}
            </div>
          </div>

          {abaPrincipal === "compromissos" && erroCalendarioPdf ? (
            <div
              role="alert"
              aria-live="polite"
              style={{
                marginTop: 10,
                width: "100%",
                textAlign: "center",
                color: "#e84025",
                fontSize: 12,
                fontFamily: FONT.body,
              }}
            >
              {erroCalendarioPdf}
            </div>
          ) : null}

          {abaPrincipal === "compromissos" && temLimparFiltrosCompromissos ? (
            <div style={filterBarSection(true)}>
              <button
                type="button"
                onClick={() => {
                  setCompFilterTimeIds([]);
                  setCompFilterStaffIds([]);
                  setFiltroTipoCompromisso("todos");
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: `1px solid ${BRAND.vermelho}44`,
                  background: `${BRAND.vermelho}11`,
                  color: BRAND.vermelho,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={12} aria-hidden="true" /> Limpar filtros
              </button>
            </div>
          ) : null}

          <div
            className="app-filter-bar-tabs-cta"
            style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}
          >
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden="true" />
            <div
              role="tablist"
              aria-label="Seção do calendário"
              className="app-filter-bar-tabs-cta__tabs"
              onKeyDown={(e) =>
                onFiltroBarTabsKeyDown(
                  e,
                  (podeVerAbaRelatorioPresenca
                    ? (["compromissos", "presenca", "relatorio"] as const)
                    : (["compromissos", "presenca"] as const)),
                  setAbaPrincipal,
                  (k) => `tab-cal-${k}`,
                )
              }
            >
              <FiltroBarTabButton
                id="tab-cal-compromissos"
                active={abaPrincipal === "compromissos"}
                aria-controls="panel-cal-compromissos"
                onClick={() => setAbaPrincipal("compromissos")}
                icon={<CalendarDays {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Compromissos
              </FiltroBarTabButton>
              <FiltroBarTabButton
                id="tab-cal-presenca"
                active={abaPrincipal === "presenca"}
                aria-controls="panel-cal-presenca"
                onClick={() => setAbaPrincipal("presenca")}
                icon={<ClipboardCheck {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                Controle de Presença
              </FiltroBarTabButton>
              {podeVerAbaRelatorioPresenca ? (
                <FiltroBarTabButton
                  id="tab-cal-relatorio"
                  active={abaPrincipal === "relatorio"}
                  aria-controls="panel-cal-relatorio"
                  onClick={() => setAbaPrincipal("relatorio")}
                  icon={<ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />}
                >
                  Relatório de Presença
                </FiltroBarTabButton>
              ) : null}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes
                pageKey="rh_calendario"
                tutorial={
                  abaPrincipal === "compromissos"
                    ? TUTORIAL_CALENDARIO
                    : abaPrincipal === "presenca"
                      ? TUTORIAL_CONTROLE_PRESENCA
                      : null
                }
              />
            </div>
          </div>
      </div>

      {soPropriosCal && !loadingStaff && !meuRhFuncionarioId && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
            lineHeight: 1.45,
          }}
          role="status"
        >
          Não encontramos um cadastro de colaborador (RH) associado ao seu e-mail de login. As escalas só aparecem após essa associação — fale com o RH se precisar de ajuda.
        </div>
      )}

      {erroEscala ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(232,64,37,0.35)",
            background: isDark ? "rgba(232,64,37,0.12)" : "rgba(232,64,37,0.08)",
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            lineHeight: 1.45,
          }}
        >
          {erroEscala}
        </div>
      ) : null}

      {!erroEscala && gradeEstudioAusenteNoMes && (abaPrincipal === "compromissos" || abaPrincipal === "presenca") ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${t.cardBorder}`,
            background: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
            color: t.text,
            fontSize: 13,
            fontFamily: FONT.body,
            lineHeight: 1.45,
          }}
          role="status"
        >
          Não há escala de estúdio <strong>aprovada</strong> para este mês. A Escala Diária é gerada e aprovada pela liderança e só então os turnos passam a refletir aqui.
        </div>
      ) : null}

      {abaPrincipal === "relatorio" && podeVerAbaRelatorioPresenca ? (
        <RelatorioPresencaPainel
          t={t}
          dataTable={dataTable}
          contentBox={contentBox}
          linhas={linhasRelatorioPresencaOrdenadas}
          loading={loadingRelatorioPresenca || loadingEscala}
          semTime={!relatorioFiltroTimeAtivo && !relatorioFiltroStaffAtivo}
          sortDir={sortRelatorioNomeDir}
          onToggleSortNome={() =>
            setSortRelatorioNomeDir((d) => (d === "asc" ? "desc" : "asc"))
          }
          onAprovarTurno={(row) => {
            setPresencaAlvoModal({
              funcionarioId: row.funcionarioId,
              dia: row.dia,
              entEsc: row.entEsc,
              saiEsc: row.saiEsc,
              horasEsc: row.horasEsc,
              entReal: row.entReal,
              saiReal: row.saiReal,
              horasReal: row.horasReal,
              entRealOriginal: row.entReal,
              saiRealOriginal: row.saiReal,
            });
          }}
          onJustificar={(row) =>
            setPresencaJustificarAlvo({
              funcionarioId: row.funcionarioId,
              dia: row.dia,
              entRealOriginal: row.entReal,
              saiRealOriginal: row.saiReal,
            })
          }
          onHistorico={(row) =>
            setPresencaHistoricoAlvo({
              dia: row.dia,
              funcionarioId: row.funcionarioId,
              justificativaMedico: row.justificativaMedico
                ? presencaJustificativaMedicoAprovada({
                    justificativa: row.justificativaMedico,
                  })
                  ? row.justificativaMedico
                  : undefined
                : undefined,
            })
          }
          onAnalisarCorrecao={(fid, dia, decisao) =>
            analisarCorrecaoPresenca(fid, toISO(dia), decisao)
          }
        />
      ) : abaPrincipal === "compromissos" ? (
        <div style={contentBox}>
          <div style={{ ...getFilterBarRowStyle(), marginBottom: 16, width: "100%" }}>
            <FiltroTipoCompromissoCalendarioSelect
              value={filtroTipoCompromisso}
              onChange={setFiltroTipoCompromisso}
            />
          </div>
          {loadingStaff ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: t.textMuted,
                fontFamily: FONT.body,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Loader2 size={16} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
              Carregando…
            </div>
          ) : (
            <ViewMes />
          )}
        </div>
      ) : (
        <>
          <div className="app-grid-kpi-4" style={{ ...getPageKpiSectionGapStyle(), width: "100%", gap: 14 }}>
            {(
              [
                {
                  label: "ESCALADOS",
                  value: kpisPresencaConsolidados.escalados,
                  cor: "var(--brand-primary, #7c3aed)",
                },
                {
                  label: "TROCAS",
                  value: kpisPresencaConsolidados.trocas,
                  cor: "#a78bfa",
                },
                {
                  label: "VENDA",
                  value: kpisPresencaConsolidados.venda,
                  cor: "#22c55e",
                },
                {
                  label: "COMPRA",
                  value: kpisPresencaConsolidados.compra,
                  cor: "#f59e0b",
                },
              ] as const
            ).map((k) => (
              <div
                key={k.label}
                aria-label={
                  kpisPresencaCarregando
                    ? k.label
                    : `${k.label}: ${k.value.toLocaleString("pt-BR")}`
                }
                style={{
                  borderRadius: 14,
                  border: `1px solid ${t.cardBorder}`,
                  borderLeft: `3px solid ${k.cor}`,
                  background: brand.blockBg,
                  padding: "16px 18px",
                  boxShadow: cardShadow,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: k.cor,
                    fontFamily: FONT_TITLE,
                    marginTop: 6,
                    minHeight: 32,
                    display: "flex",
                    alignItems: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {kpisPresencaCarregando ? (
                    <div style={kpiPresencaSkeletonStyle} aria-hidden />
                  ) : (
                    k.value.toLocaleString("pt-BR")
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={contentBox}>
            <SectionTitle>Controle de Presença</SectionTitle>
            {presencaFilterStaffIds.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: t.textMuted,
                  fontSize: 13,
                  fontFamily: FONT.body,
                }}
              >
                Selecione um colaborador na lista para ver o controle de presença do mês.
              </div>
            ) : (
              <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                {loadingPontoMes ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                      color: t.textMuted,
                      fontSize: 13,
                      fontFamily: FONT.body,
                    }}
                  >
                    <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
                    Atualizando registros de ponto…
                  </div>
                ) : null}
                <table style={getDataTableStyle()}>
                  <caption style={{ display: "none" }}>
                    Controle de presença por dia no mês selecionado
                  </caption>
                  <thead>
                    <tr>
                      <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                        Data
                      </th>
                      <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                        Situação
                      </th>
                      <th
                        colSpan={2}
                        scope="colgroup"
                        style={{
                          ...dataTable.thHeader,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                          borderBottom: "none",
                        }}
                      >
                        Entrada
                      </th>
                      <th
                        colSpan={2}
                        scope="colgroup"
                        style={{
                          ...dataTable.thHeader,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                          borderBottom: "none",
                        }}
                      >
                        Saída
                      </th>
                      <th
                        colSpan={2}
                        scope="colgroup"
                        style={{
                          ...dataTable.thHeader,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                          borderBottom: "none",
                        }}
                      >
                        Horas
                      </th>
                      <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                        Status
                      </th>
                      <th rowSpan={2} scope="col" style={{ ...dataTable.thHeader, whiteSpace: "normal" }}>
                        Ações
                      </th>
                    </tr>
                    <tr>
                      <th
                        scope="col"
                        style={{
                          ...dataTable.thHeaderSub,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                        }}
                      >
                        Escalada
                      </th>
                      <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                        Realizada
                      </th>
                      <th
                        scope="col"
                        style={{
                          ...dataTable.thHeaderSub,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                        }}
                      >
                        Escalada
                      </th>
                      <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                        Realizada
                      </th>
                      <th
                        scope="col"
                        style={{
                          ...dataTable.thHeaderSub,
                          whiteSpace: "normal",
                          borderLeft: `2px solid ${t.cardBorder}`,
                        }}
                      >
                        Escalada
                      </th>
                      <th scope="col" style={{ ...dataTable.thHeaderSub, whiteSpace: "normal" }}>
                        Realizada
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasDoMesPresenca.map((dia, i) => {
                      const fid = presencaFilterStaffIds[0]!;
                      const iso = toISO(dia);
                      const diaAnterior = i > 0 ? diasDoMesPresenca[i - 1]! : null;
                      const isoAnterior = diaAnterior ? toISO(diaAnterior) : null;
                      const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
                      const valorGAnterior =
                        diaAnterior && isoAnterior
                          ? primeiroValorGradeDia(rawGradeRows, fid, isoAnterior)
                          : null;
                      const pRow = prestadorPorId.get(fid);
                      const slug = (pRow?.staff_operadora_slug ?? "").trim();
                      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
                      const esc = obterEntradaSaidaDiaCal(pRow, valorG, opRow, fid, iso);
                      const pt = mapaPontoPorDiaIso.get(iso);
                      const entEsc = esc ? esc.entrada : "—";
                      const saiEsc = esc ? esc.saida : "—";
                      const escAnterior =
                        valorGAnterior != null && isoAnterior
                          ? obterEntradaSaidaDiaCal(pRow, valorGAnterior, opRow, fid, isoAnterior)
                          : null;
                      const entEscAnterior = escAnterior ? escAnterior.entrada : undefined;
                      const saiEscAnterior = escAnterior ? escAnterior.saida : undefined;
                      const entReal = horaRegistoSP(pt?.check_in_at);
                      const saiReal = horaRegistoSP(pt?.check_out_at);
                      const horasEsc = esc ? formatoDuracaoFmtHorasTotal(entEsc, saiEsc) : "—";
                      const horasReal = duracaoEntreTimestamps(pt?.check_in_at ?? null, pt?.check_out_at ?? null);
                      const situacao = situacaoGestaoEscalaParaDia(valorG);
                      const temCheckIn = Boolean(pt?.check_in_at);
                      const temCheckOut = Boolean(pt?.check_out_at);
                      const stBase = statusPresencaNoDia(esc, pt?.check_in_at, pt?.check_out_at);
                      const gestaoDia = fundirGestaoPresencaComJustificativaMedico(
                        presencaGestaoPorChave.get(chavePresencaGestao(fid, iso)),
                        iso,
                        situacao,
                        indiceJustificativaMedicoPresenca,
                      );
                      const paramsPresencaLinha = {
                        situacao,
                        diaIso: iso,
                        entEsc,
                        saiEsc,
                        temCheckIn,
                        temCheckOut,
                        statusBase: stBase,
                        gestao: gestaoDia,
                      };
                      const st = resolverStatusPresencaLinha(paramsPresencaLinha);
                      const acoesLinha = resolverAcoesPresencaLinha(paramsPresencaLinha);
                      const correcao = gestaoDia?.correcao;
                      const exibirIndicadorMedico = presencaJustificativaMedicoExibirIndicador(
                        gestaoDia,
                        iso,
                        situacao,
                      );
                      const justificativaMedico =
                        gestaoDia?.justificativa?.motivo === "medico" ? gestaoDia.justificativa : null;
                      const correcaoEntradaAlterada = correcao ? presencaCorrecaoCampoAlterado("entrada", correcao) : false;
                      const correcaoSaidaAlterada = correcao ? presencaCorrecaoCampoAlterado("saida", correcao) : false;
                      const correcaoAprovada =
                        Boolean(correcao) && presencaCorrecaoAnaliseStatusEfetivo(correcao) === "aprovada";
                      const entRealExib =
                        correcaoAprovada && correcao && correcaoEntradaAlterada
                          ? correcao.entradaCorrigida
                          : entReal;
                      const saiRealExib =
                        correcaoAprovada && correcao && correcaoSaidaAlterada
                          ? correcao.saidaCorrigida
                          : saiReal;
                      const horasRealExib =
                        correcaoAprovada && correcao && (correcaoEntradaAlterada || correcaoSaidaAlterada)
                          ? formatoDuracaoFmtHorasTotal(entRealExib, saiRealExib)
                          : horasReal;
                      const entRealDesvio = presencaDesvioRelogioMaior5Min(entEsc, entRealExib);
                      const saiRealDesvio = presencaDesvioRelogioMaior5Min(saiEsc, saiRealExib);
                      const horasRealDesvio =
                        correcaoAprovada && correcao && (correcaoEntradaAlterada || correcaoSaidaAlterada)
                          ? (() => {
                              const escMin = duracaoMinutosRelogioHHMM(entEsc, saiEsc);
                              const realMin = duracaoMinutosRelogioHHMM(entRealExib, saiRealExib);
                              if (escMin == null || realMin == null) return false;
                              return Math.abs(realMin - escMin) > 5;
                            })()
                          : presencaDesvioHorasMaior5Min(
                              entEsc,
                              saiEsc,
                              pt?.check_in_at ?? null,
                              pt?.check_out_at ?? null,
                            );
                      const podeAnalisarCorrecao = Boolean(
                        correcao &&
                          presencaCorrecaoAnaliseStatusEfetivo(correcao) === "pendente" &&
                          podeGerirPresencaStaff(fid),
                      );
                      const mostrarAprovarTurno =
                        acoesLinha.acaoPrimaria === "aprovar" && podeGerirPresencaStaff(fid);
                      const mostrarJustificarPresenca =
                        acoesLinha.acaoPrimaria === "justificar" &&
                        podeJustificarPresencaStaff(fid);
                      const semAcaoPresencaVisivel =
                        !mostrarAprovarTurno &&
                        !mostrarJustificarPresenca &&
                        !acoesLinha.mostrarHistorico;
                      const acoesCellInner: CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minHeight: 32,
                        flexWrap: "nowrap",
                      };
                      const isDestaqueHojePresenca = linhaPresencaDestaqueHoje({
                        diaIso: iso,
                        entEsc,
                        saiEsc,
                        entEscDiaAnterior: entEscAnterior,
                        saiEscDiaAnterior: saiEscAnterior,
                        diaIsoEscalonadoAnterior: isoAnterior ?? undefined,
                      });
                      return (
                        <tr
                          key={iso}
                          style={{
                            background: isDestaqueHojePresenca
                              ? fundoLinhaPresencaDiaHoje(dataTable.colBg, isDark)
                              : dataTable.zebraRow(i),
                          }}
                        >
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              ...(isDestaqueHojePresenca
                                ? { fontWeight: 700, color: PRESENCA_DESTAQUE_VERDE_HEX }
                                : {}),
                            }}
                          >
                            {dia.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                          </td>
                          <td style={dataTable.tdCenter}>{situacao}</td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              borderLeft: `2px solid ${t.cardBorder}`,
                            }}
                          >
                            {entEsc}
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              position: "relative",
                              ...(entRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                            }}
                          >
                            {entRealExib}
                            {exibirIndicadorMedico && justificativaMedico ? (
                              <CelulaIndicadorJustificativaMedicoPresencaCalendario
                                t={t}
                                justificativa={justificativaMedico}
                              />
                            ) : correcao && correcaoEntradaAlterada ? (
                              <CelulaIndicadorCorrecaoPresencaCalendario
                                t={t}
                                campo="entrada"
                                correcao={correcao}
                                valorCorrecao={correcao.entradaCorrigida}
                                podeAnalisar={podeAnalisarCorrecao}
                                onAprovar={() => analisarCorrecaoPresenca(fid, iso, "aprovada")}
                                onRejeitar={() => analisarCorrecaoPresenca(fid, iso, "recusada")}
                              />
                            ) : null}
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              borderLeft: `2px solid ${t.cardBorder}`,
                            }}
                          >
                            {saiEsc}
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              position: "relative",
                              ...(saiRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                            }}
                          >
                            {saiRealExib}
                            {exibirIndicadorMedico && justificativaMedico ? (
                              <CelulaIndicadorJustificativaMedicoPresencaCalendario
                                t={t}
                                justificativa={justificativaMedico}
                              />
                            ) : correcao && correcaoSaidaAlterada ? (
                              <CelulaIndicadorCorrecaoPresencaCalendario
                                t={t}
                                campo="saida"
                                correcao={correcao}
                                valorCorrecao={correcao.saidaCorrigida}
                                podeAnalisar={podeAnalisarCorrecao}
                                onAprovar={() => analisarCorrecaoPresenca(fid, iso, "aprovada")}
                                onRejeitar={() => analisarCorrecaoPresenca(fid, iso, "recusada")}
                              />
                            ) : null}
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              borderLeft: `2px solid ${t.cardBorder}`,
                            }}
                          >
                            {horasEsc}
                          </td>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              ...(horasRealDesvio ? { color: COR_DESVIO_PONTO } : {}),
                            }}
                          >
                            {horasRealExib}
                          </td>
                          <td style={dataTable.tdCenter}>{st}</td>
                          <td style={{ ...dataTable.tdCenter, verticalAlign: "middle" }}>
                            <div style={acoesCellInner}>
                              {acoesLinha.mostrarTravessaoAcoes || semAcaoPresencaVisivel ? (
                                <span style={{ lineHeight: "32px" }} aria-hidden="true">
                                  —
                                </span>
                              ) : (
                                <>
                                  {mostrarAprovarTurno ? (
                                    <BtnIconeAcaoLinha
                                      label={tooltipAcao("APROVAÇÃO DE TURNO")}
                                      onClick={() => {
                                        setPresencaAlvoModal({
                                          funcionarioId: fid,
                                          dia,
                                          entEsc,
                                          saiEsc,
                                          horasEsc,
                                          entReal,
                                          saiReal,
                                          horasReal,
                                          entRealOriginal: entReal,
                                          saiRealOriginal: saiReal,
                                        });
                                      }}
                                    >
                                      <Check size={14} aria-hidden="true" />
                                    </BtnIconeAcaoLinha>
                                  ) : null}
                                  {mostrarJustificarPresenca ? (
                                    <BtnIconeAcaoLinha
                                      label={tooltipAcao("Justificar")}
                                      onClick={() =>
                                        setPresencaJustificarAlvo({
                                          funcionarioId: fid,
                                          dia,
                                          entRealOriginal: entReal,
                                          saiRealOriginal: saiReal,
                                        })
                                      }
                                    >
                                      <ClipboardPen size={14} aria-hidden="true" />
                                    </BtnIconeAcaoLinha>
                                  ) : null}
                                  {acoesLinha.mostrarHistorico ? (
                                    <BtnIconeAcaoLinha
                                      label={tooltipAcao("Histórico de presença")}
                                      onClick={() =>
                                        setPresencaHistoricoAlvo({
                                          dia,
                                          funcionarioId: fid,
                                          justificativaMedico: presencaJustificativaMedicoAprovada(gestaoDia)
                                            ? gestaoDia?.justificativa
                                            : undefined,
                                        })
                                      }
                                    >
                                      <Clock size={14} aria-hidden="true" />
                                    </BtnIconeAcaoLinha>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalDia && (
        <ModalBase maxWidth={520} onClose={() => setModalDia(null)} zIndex={1100}>
          <ModalHeader title={tituloModalDiaPt(modalDia)} onClose={() => setModalDia(null)} />
          <div aria-label="Compromissos do dia">
            {(() => {
              const iso = toISO(modalDia);
              const mostrarTipo = (ch: Exclude<TipoCompromissoCalFiltroValue, "todos">) =>
                filtroTipoCompromisso === "todos" || filtroTipoCompromisso === ch;
              const ev = eventosAgendaDoDia(iso);
              const r = obterReunioesDiaIso(iso);
              const tr = treinamentosAgendaDoDia(iso);
              const fb = feedbackAgendaDoDia(iso);
              const turnos = turnosAgendadosNoDia(modalDia);
              const partes: { key: string; node: ReactNode }[] = [];
              if (mostrarTipo("eventos") && ev.length > 0) {
                partes.push({
                  key: "eventos",
                  node: (
                    <div key="eventos" style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                        Eventos
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                        {ev.map((x) => (
                          <li key={x.id}>{x.titulo}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                });
              }
              if (mostrarTipo("reunioes") && r.length > 0) {
                partes.push({
                  key: "reunioes",
                  node: soPropriosCal ? (
                    <div
                      key="reunioes"
                      style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}
                      role="list"
                      aria-label="Reuniões agendadas para este dia"
                    >
                      {r.map((x) => (
                        <ModalDiaReuniaoCardProprio key={x.id} item={x} />
                      ))}
                    </div>
                  ) : (
                    <div key="reunioes" style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                        Reuniões
                      </div>
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 8 }}
                        role="list"
                        aria-label="Reuniões agendadas para este dia"
                      >
                        {r.map((x) => {
                          const det = x.reuniaoDetalhe;
                          if (!det) {
                            return (
                              <div key={x.id} style={{ fontSize: 13, fontFamily: FONT.body, color: t.text }} role="listitem">
                                {x.titulo}
                              </div>
                            );
                          }
                          if (det.isReuniaoRh && det.solicitacaoStatus) {
                            const mostrarObs = exibirObservacaoRhModalReuniao(det.solicitacaoStatus);
                            return (
                              <div
                                key={x.id}
                                role="listitem"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 6,
                                  padding: "10px 12px",
                                  borderRadius: 10,
                                  border: "1px solid rgba(245,158,11,0.35)",
                                  background: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
                                  fontFamily: FONT.body,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                  <Users size={14} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                                  <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, minWidth: 0, fontWeight: 700 }}>
                                    {tituloModalReuniaoRhCalendario(det.solicitacaoStatus)}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, paddingLeft: 22 }}>
                                  {det.solicitanteNome}
                                </div>
                                {mostrarObs ? (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: t.text,
                                      paddingLeft: 22,
                                      lineHeight: 1.45,
                                      whiteSpace: "pre-wrap",
                                    }}
                                  >
                                    {det.observacaoRh?.trim() || "—"}
                                  </div>
                                ) : null}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={x.id}
                              role="listitem"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(245,158,11,0.35)",
                                background: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
                                fontFamily: FONT.body,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <Users size={14} color="#f59e0b" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, minWidth: 0 }}>
                                  <span style={{ fontWeight: 800 }}>{det.solicitanteNome}</span>
                                  <span style={{ fontWeight: 500, color: t.textMuted }}> — {det.comQuemLabel}</span>
                                </div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.azul, paddingLeft: 22 }}>{det.turno}</div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: t.text,
                                  paddingLeft: 22,
                                  lineHeight: 1.45,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {det.motivo}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                });
              }
              if (mostrarTipo("treinamentos") && tr.length > 0) {
                partes.push({
                  key: "treinamentos",
                  node: (
                    <div key="treinamentos" style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                        Treinamentos
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                        {tr.map((x) => (
                          <li key={x.id}>{x.titulo}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                });
              }
              if (mostrarTipo("feedback") && fb.length > 0) {
                partes.push({
                  key: "feedback",
                  node: (
                    <div key="feedback" style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                        Feedback
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                        {fb.map((x) => (
                          <li key={x.id}>{x.titulo}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                });
              }
              if (mostrarTipo("turnos") && turnos.length > 0) {
                partes.push({
                  key: "turnos",
                  node: soPropriosCal ? (
                    <div
                      key="turnos"
                      style={{ display: "flex", flexDirection: "column", gap: 8 }}
                      role="list"
                      aria-label="Turnos agendados para este dia"
                    >
                      {turnos.map((comp) => (
                        <ModalDiaTurnoCardProprio key={`${comp.prestadorId}-${comp.turno}`} comp={comp} iso={iso} />
                      ))}
                    </div>
                  ) : (
                    <div key="turnos">
                      <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                        Turnos
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
                        {turnos.map((comp) => (
                          <EscalaCompromissoChip
                            key={`${comp.prestadorId}-${comp.turno}`}
                            comp={comp}
                            subtituloModal={horarioSubtituloParaCompromissoCal(comp, iso)}
                          />
                        ))}
                      </div>
                    </div>
                  ),
                });
              }
              if (partes.length === 0) {
                return (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem dados para o período selecionado.
                  </div>
                );
              }
              return <>{partes.map((p) => p.node)}</>;
            })()}
          </div>
        </ModalBase>
      )}

      {modalAgendarAberto && solicitanteAgendarId ? (
        <ModalAgendarReuniaoCalendario
          open
          onClose={() => setModalAgendarAberto(false)}
          onAgendado={() => {
            setReunioesMesTick((x) => x + 1);
          }}
          t={t}
          brand={brand}
          refMesIso={refMesPrimeiroDiaISO(current)}
          solicitanteFuncionarioId={solicitanteAgendarId}
          diasEscalados={diasEscaladosAgendarMes}
        />
      ) : null}

      {presencaAlvoModal ? (
        <ModalAprovacaoPresencaCalendario
          open
          alvo={presencaAlvoModal}
          onClose={() => setPresencaAlvoModal(null)}
          onAprovar={confirmarAprovacaoPresenca}
          onSalvarCorrecao={salvarCorrecaoPresenca}
          t={t}
          brand={brand}
        />
      ) : null}

      {modalAprovarPresencaMesAberto ? (
        <ModalAprovarPresencaMesCalendario
          open
          refMes={current}
          linhas={linhasAprovacaoPresencaMes}
          onClose={() => setModalAprovarPresencaMesAberto(false)}
          onAprovarTodos={aprovarPresencaMesTodos}
          t={t}
          brand={brand}
        />
      ) : null}

      {presencaHistoricoAlvo ? (
        <ModalHistoricoPresencaCalendario
          open
          dia={presencaHistoricoAlvo.dia}
          titulo={presencaHistoricoAlvo.justificativaMedico ? "Histórico" : "Histórico de presença"}
          linhas={
            presencaHistoricoAlvo.justificativaMedico
              ? historicoLinhasJustificativaMedico(presencaHistoricoAlvo.justificativaMedico)
              : undefined
          }
          historico={
            presencaHistoricoAlvo.justificativaMedico
              ? undefined
              : (gestaoRelatorioPorChave.get(
                  chavePresencaGestao(presencaHistoricoAlvo.funcionarioId, toISO(presencaHistoricoAlvo.dia)),
                ) ??
                  presencaGestaoPorChave.get(
                    chavePresencaGestao(presencaHistoricoAlvo.funcionarioId, toISO(presencaHistoricoAlvo.dia)),
                  ))?.historico ?? []
          }
          onClose={() => setPresencaHistoricoAlvo(null)}
          t={t}
        />
      ) : null}

      <ModalJustificarPresencaCalendario
        open={presencaJustificarAlvo != null}
        alvo={presencaJustificarAlvo}
        onClose={() => setPresencaJustificarAlvo(null)}
        onSalvar={salvarJustificativaPresenca}
        t={t}
        brand={brand}
      />

      {pontoSucessoModal ? (
        <ModalBase maxWidth={440} onClose={() => setPontoSucessoModal(null)} zIndex={1200}>
          <ModalHeader
            title={pontoSucessoModal.tipo === "check_in" ? "Check-in Realizado" : "Check-out Realizado"}
            onClose={() => setPontoSucessoModal(null)}
          />
          <p
            style={{
              margin: "0 0 12px",
              color: t.textMuted,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT.body,
              letterSpacing: "0.04em",
            }}
          >
            {pontoSucessoModal.subtitulo}
          </p>
          <p style={{ margin: 0, color: t.text, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.55 }}>
            {pontoSucessoModal.corpo}
          </p>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setPontoSucessoModal(null)}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                border: "none",
                background: brand.accent.startsWith("var(") ? "var(--brand-action, #7c3aed)" : String(brand.accent),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </ModalBase>
      ) : null}

      {pontoMsgModal ? (
        <ModalBase maxWidth={440} onClose={() => setPontoMsgModal(null)} zIndex={1200}>
          <ModalHeader title="Check-in / Check-out" onClose={() => setPontoMsgModal(null)} />
          <p style={{ margin: 0, color: t.text, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.55 }}>
            {pontoMsgModal}
          </p>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setPontoMsgModal(null)}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                border: "none",
                background: brand.accent.startsWith("var(") ? "var(--brand-action, #7c3aed)" : String(brand.accent),
                color: "#fff",
                fontWeight: 700,
                fontFamily: FONT.body,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </div>
        </ModalBase>
      ) : null}
    </div>
  );
}
