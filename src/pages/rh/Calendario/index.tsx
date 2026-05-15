import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BookOpen,
  CalendarRange,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import {
  MSG_PRESTADOR_PONTO_REDE,
  obterPrestadorPontoEstado,
  registrarPrestadorPonto,
  type PrestadorPontoEstado,
} from "../../../lib/prestadorPontoApi";
import type { Operadora } from "../../../types";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import {
  normalizarEscalaCadastro,
  siglaGradeParaNomeTurno,
  turnoStaffEhComercial5x2,
} from "../../../lib/rhEscalaTurnos";
import {
  adicionarMinutosAoRelogioHHMM,
  escalaComHorarioTurnoEditavelNaStaff,
  escalaComHorarioTurnoSomenteOperadora,
  formatarHoraInicioOperadora,
  labelHorarioTurnoStaffPorValor,
} from "../../../lib/rhStaffHorarioTurno";
import { DashboardPageHeader } from "../../../components/dashboard";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";
import {
  RH_CALENDARIO_ACAO_LABEL,
  labelReuniaoCom,
  listarDatasEscaladoFuturasNoMes,
  textoResumoPayloadAcaoCalendario,
  type RhCalendarioAcaoTipo,
} from "../../../lib/rhCalendarioAcaoHelpers";
import { getThStyle, getTdStyle, zebraStripe } from "../../../lib/tableStyles";
import { fmtHorasTotal } from "../../../lib/dashboardHelpers";
import {
  normalizarSelecaoUnica,
  TREINAMENTO_FILTRO_ID,
  CALENDARIO_TIMES_FILTRO_ORDEM,
  normalizarNomeCalFiltro,
  timeRowPorRotuloCanonica,
  prestadorAtendeFiltroTime,
  type StaffTimeRow,
} from "../../../lib/rhCalendarioStaffFiltroHelpers";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { ModalAgendarReuniaoCalendario } from "./ModalAgendarReuniaoCalendario";

/** Tipos de compromisso (filtro único na UI; `todos` = default). */
type ChaveTipoCompromissoCal = "eventos" | "reunioes" | "treinamentos" | "feedback" | "turnos";
type FiltroTipoCompromissoUi = "todos" | ChaveTipoCompromissoCal;

const OPCOES_TIPO_COMPROMISSO_SELECT: { value: FiltroTipoCompromissoUi; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "eventos", label: "Eventos" },
  { value: "reunioes", label: "Reuniões" },
  { value: "treinamentos", label: "Treinamentos" },
  { value: "feedback", label: "Feedback" },
  { value: "turnos", label: "Turnos" },
];

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

type RhCalAcaoOfertaDiaRow = {
  id: string;
  solicitante_funcionario_id: string;
  tipo_acao: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
  solicitante_nome: string | null;
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

/** Compromissos não-turno (reuniões via `rh_calendario_reunioes_mes`; demais em evolução). */
type CompromissoAgendaExtra = { id: string; titulo: string };

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
  const vl = v.toLowerCase();
  if (v === "Folga" || vl === "folga" || v === "F" || vl === "f") return null;
  if (v === "Comercial") return "Comercial";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  const nome = siglaGradeParaNomeTurno(v);
  return nome || null;
}

type OpTurnosCalPick = Pick<Operadora, "slug" | "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio">;
type OpTurnosHorarioPick = Pick<Operadora, "turno_manha_inicio" | "turno_tarde_inicio" | "turno_noite_inicio">;

function turnoCalendarioEhCompraVendaTroca(turnoNome: string): boolean {
  return turnoNome === "Compra" || turnoNome === "Venda" || turnoNome === "Troca";
}

/** Situação na grade (Gestão de Escala) para o dia — Folga vs escalado de turno; CVT mantém o rótulo. */
function situacaoGestaoEscalaParaDia(valorCelulaRaw: string | null | undefined): string {
  const v = (valorCelulaRaw ?? "").trim();
  if (!v) return "—";
  const vl = v.toLowerCase();
  if (v === "Folga" || vl === "folga" || v === "F" || vl === "f") return "Folga";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  return "Escalado";
}

/** Início/fim do turno para o modal (null = não calculado; usar "—" no UI). */
function resumoHorarioTurnoModalCalendario(
  p: RhFuncionario | undefined,
  turnoNomeExibicao: string,
  op: OpTurnosHorarioPick | null | undefined,
): string | null {
  if (!p) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNomeExibicao)) return null;

  const escala = p.escala ?? "";

  if (turnoNomeExibicao === "Comercial") {
    if (turnoStaffEhComercial5x2(p.staff_turno)) {
      const lbl = labelHorarioTurnoStaffPorValor(p.staff_horario_turno);
      return lbl !== "—" ? lbl : null;
    }
    return null;
  }

  if (turnoNomeExibicao !== "Manhã" && turnoNomeExibicao !== "Tarde" && turnoNomeExibicao !== "Noite") return null;

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const lbl = labelHorarioTurnoStaffPorValor(p.staff_horario_turno);
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

/** Entrada / saída programadas (HH:mm) a partir da escala e do cadastro do prestador. */
function obterEntradaSaidaEscaladasPrestadorDia(
  p: RhFuncionario | undefined,
  valorCelula: string | null | undefined,
  op: OpTurnosHorarioPick | null | undefined,
): { entrada: string; saida: string } | null {
  if (!p) return null;
  const turnoNome = turnoExibicaoDeValorCelulaEscala(valorCelula ?? "");
  if (!turnoNome) return null;
  if (turnoCalendarioEhCompraVendaTroca(turnoNome)) return { entrada: "—", saida: "—" };

  const escala = p.escala ?? "";

  if (turnoNome === "Comercial" && turnoStaffEhComercial5x2(p.staff_turno)) {
    const parsed = parseHorarioStaffValorParaHHMM(p.staff_horario_turno);
    return parsed ?? { entrada: "—", saida: "—" };
  }

  if (turnoNome !== "Manhã" && turnoNome !== "Tarde" && turnoNome !== "Noite") {
    return { entrada: "—", saida: "—" };
  }

  if (escalaComHorarioTurnoEditavelNaStaff(escala)) {
    const parsed = parseHorarioStaffValorParaHHMM(p.staff_horario_turno);
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

function duracaoEntreTimestamps(isoIn: string | null | undefined, isoOut: string | null | undefined): string {
  if (!isoIn || !isoOut) return "—";
  const t0 = new Date(isoIn).getTime();
  const t1 = new Date(isoOut).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1) || t1 <= t0) return "—";
  return fmtHorasTotal((t1 - t0) / 3600000);
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
  if (checkIn && checkOut) return "Registado";
  return "—";
}

export default function RhCalendarioPage() {
  const { theme: t, isDark, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_calendario");
  const soPropriosCal = !perm.loading && perm.canView === "proprios";

  const [current, setCurrent] = useState(() => mesInicialCalendarioRhNaEntrada());
  const [abaPrincipal, setAbaPrincipal] = useState<"compromissos" | "presenca">("compromissos");
  const [filtroTipoCompromisso, setFiltroTipoCompromisso] = useState<FiltroTipoCompromissoUi>("todos");
  const [modalDia, setModalDia] = useState<Date | null>(null);
  const [modalDiaTab, setModalDiaTab] = useState<"compromissos" | "ofertas">("compromissos");
  const [acoesOfertadasNoDia, setAcoesOfertadasNoDia] = useState<RhCalAcaoOfertaDiaRow[]>([]);
  const [loadingAcoesOfertadasDia, setLoadingAcoesOfertadasDia] = useState(false);
  const [erroAcoesOfertadasDia, setErroAcoesOfertadasDia] = useState<string | null>(null);
  const [modalAgendarAberto, setModalAgendarAberto] = useState(false);

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [erroStaff, setErroStaff] = useState<string | null>(null);

  /** Filtros da aba Compromissos (multi). */
  const [compFilterStaffIds, setCompFilterStaffIds] = useState<string[]>([]);
  const [compFilterTimeIds, setCompFilterTimeIds] = useState<string[]>([]);
  /** Filtros da aba Controle de Presença (Time e Staff: seleção única). */
  const [presencaFilterTimeIds, setPresencaFilterTimeIds] = useState<string[]>([]);
  const [presencaFilterStaffIds, setPresencaFilterStaffIds] = useState<string[]>([]);
  const [treinamentoGerenciaId, setTreinamentoGerenciaId] = useState<string | null>(null);
  const [treinamentoTimeIdsList, setTreinamentoTimeIdsList] = useState<string[]>([]);

  const [rawGradeRows, setRawGradeRows] = useState<RpcGradeCalendarioRow[]>([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  /** Quando `rh_calendario` está em «Próprios»: id do `rh_funcionarios` do utilizador autenticado (e-mail / e-mail Spin). */
  const [meuRhFuncionarioId, setMeuRhFuncionarioId] = useState<string | null>(null);
  /** Vista completa (`canView === "sim"`): id do prestador ligado ao utilizador, para filtro «Meu Calendário». */
  const [meuPrestadorRhIdVistaCompleta, setMeuPrestadorRhIdVistaCompleta] = useState<string | null>(null);
  const [mapOpTurnos, setMapOpTurnos] = useState<Map<string, OpTurnosCalPick>>(() => new Map());

  const [pontoEstado, setPontoEstado] = useState<PrestadorPontoEstado | null>(null);
  const [pontoEstadoLoading, setPontoEstadoLoading] = useState(false);
  const [pontoSubmitting, setPontoSubmitting] = useState(false);
  const [pontoMsgModal, setPontoMsgModal] = useState<string | null>(null);
  const [pontoMesLinhas, setPontoMesLinhas] = useState<RpcPontoMesRow[]>([]);
  const [loadingPontoMes, setLoadingPontoMes] = useState(false);
  const [pontoMesTick, setPontoMesTick] = useState(0);
  const [reunioesMesRaw, setReunioesMesRaw] = useState<RpcReuniaoMesRow[]>([]);
  const [reunioesMesTick, setReunioesMesTick] = useState(0);

  const carregarTimes = useCallback(async () => {
    setErroStaff(null);
    const { data, error } = await supabase.rpc("rh_staff_times_filtrados");
    if (error) {
      setErroStaff("Não foi possível carregar os times de staff.");
      setTimes([]);
      return;
    }
    setTimes((data ?? []) as StaffTimeRow[]);
  }, []);

  const timeIds = useMemo(() => times.map((x) => x.id), [times]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView !== "sim" && perm.canView !== "proprios") return;
    if (perm.canView === "proprios") {
      setTimes([]);
      setErroStaff(null);
      return;
    }
    setLoadingStaff(true);
    void carregarTimes().finally(() => setLoadingStaff(false));
  }, [perm.loading, perm.canView, carregarTimes]);

  useEffect(() => {
    if (perm.loading || perm.canView !== "proprios") return;
    if (!user?.email?.trim()) {
      setPrestadores([]);
      setMeuRhFuncionarioId(null);
      setLoadingStaff(false);
      return;
    }
    let cancelled = false;
    setLoadingStaff(true);
    void (async () => {
      const row = await buscarRhFuncionarioAtivoPorEmailLogin(user.email!);
      if (cancelled) return;
      if (row) {
        setPrestadores([row]);
        setMeuRhFuncionarioId(row.id);
        setErroStaff(null);
      } else {
        setPrestadores([]);
        setMeuRhFuncionarioId(null);
        setErroStaff(null);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, user?.email]);

  useEffect(() => {
    if (perm.loading) return;
    if (perm.canView !== "sim") {
      setMeuPrestadorRhIdVistaCompleta(null);
      return;
    }
    if (!user?.email?.trim()) {
      setMeuPrestadorRhIdVistaCompleta(null);
      return;
    }
    let cancelled = false;
    void buscarRhFuncionarioAtivoPorEmailLogin(user.email).then((row) => {
      if (!cancelled) setMeuPrestadorRhIdVistaCompleta(row?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, user?.email]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
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
  }, [perm.loading, perm.canView]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    if (perm.canView === "proprios") return;
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

      let ttIdsLocal: string[] = [];
      if (treinamentoGerenciaId) {
        const { data: tt } = await supabase
          .from("rh_org_times")
          .select("id")
          .eq("gerencia_id", treinamentoGerenciaId)
          .eq("status", "ativo");
        ttIdsLocal = (tt ?? []).map((r: { id: string }) => r.id);
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
  }, [perm.loading, perm.canView, times, treinamentoGerenciaId]);

  useEffect(() => {
    if (perm.canView === "proprios") {
      setCompFilterStaffIds([]);
      setCompFilterTimeIds([]);
    }
  }, [perm.canView]);

  useEffect(() => {
    if (perm.canView !== "proprios" || !meuRhFuncionarioId) return;
    setPresencaFilterStaffIds([meuRhFuncionarioId]);
  }, [perm.canView, meuRhFuncionarioId]);

  const treinamentoTimeIds = useMemo(() => new Set(treinamentoTimeIdsList), [treinamentoTimeIdsList]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(compFilterTimeIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [compFilterTimeIds, timeIds]);

  const treinamentoSelecionado = compFilterTimeIds.includes(TREINAMENTO_FILTRO_ID);
  const filtroTimeAtivo = compFilterTimeIds.length > 0;

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
      treinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    setCompFilterStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const allowedStaff = new Set(prestadores.filter((p) => prestadorAtendeFiltroTime(p, opts)).map((p) => p.id));
      const next = prev.filter((id) => allowedStaff.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds, compFilterTimeIds]);

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
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds]);

  const presencaFiltroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(presencaFilterTimeIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [presencaFilterTimeIds, timeIds]);

  const presencaTreinamentoSelecionado = presencaFilterTimeIds.includes(TREINAMENTO_FILTRO_ID);
  const presencaFiltroTimeAtivo = presencaFilterTimeIds.length > 0;

  const staffPresencaMultiselectItems = useMemo(() => {
    const opts = {
      filtroAtivo: presencaFiltroTimeAtivo,
      filtroTimeIdsReais: presencaFiltroTimeIdsReais,
      treinamentoSelecionado: presencaTreinamentoSelecionado,
      treinamentoGerenciaId,
      treinamentoTimeIds,
    };
    return prestadores
      .filter((p) => prestadorAtendeFiltroTime(p, opts))
      .map((p) => ({ id: p.id, name: (p.nome ?? "").trim() || "—" }));
  }, [
    prestadores,
    presencaFiltroTimeAtivo,
    presencaFiltroTimeIdsReais,
    presencaTreinamentoSelecionado,
    treinamentoGerenciaId,
    treinamentoTimeIds,
  ]);

  useEffect(() => {
    const valid = new Set(timeMultiselectItems.map((x) => x.id));
    setPresencaFilterTimeIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [timeMultiselectItems]);

  useEffect(() => {
    const allowedIds = new Set(staffPresencaMultiselectItems.map((x) => x.id));
    setPresencaFilterStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => allowedIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [staffPresencaMultiselectItems]);

  const mesesRefISOConsulta = useMemo(() => [refMesPrimeiroDiaISO(current)], [current]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao") return;
    let cancelled = false;
    setLoadingEscala(true);
    void (async () => {
      const merged: RpcGradeCalendarioRow[] = [];
      try {
        for (const refIso of mesesRefISOConsulta) {
          if (cancelled) return;
          const { data, error } = await supabase.rpc("rh_calendario_grade_escala_mes", { p_ref_mes: refIso });
          if (cancelled) return;
          if (error || !data) continue;
          merged.push(...(data as RpcGradeCalendarioRow[]));
        }
        if (!cancelled) setRawGradeRows(merged);
      } finally {
        if (!cancelled) setLoadingEscala(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mesesRefISOConsulta, perm.loading, perm.canView]);

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
    if (perm.canView !== "proprios") return rawGradeRows;
    if (!meuRhFuncionarioId) return [];
    return rawGradeRows.filter((r) => r.funcionario_id === meuRhFuncionarioId);
  }, [rawGradeRows, perm.canView, meuRhFuncionarioId]);

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

  const orgTimeIdPorPrestadorId = useMemo(() => {
    const m = new Map<string, string | null>();
    prestadores.forEach((p) => m.set(p.id, p.org_time_id ?? null));
    return m;
  }, [prestadores]);

  const orgGerenciaIdPorPrestadorId = useMemo(() => {
    const m = new Map<string, string | null>();
    prestadores.forEach((p) => m.set(p.id, p.org_gerencia_id ?? null));
    return m;
  }, [prestadores]);

  const prestadorPorId = useMemo(() => {
    const m = new Map<string, RhFuncionario>();
    prestadores.forEach((p) => m.set(p.id, p));
    return m;
  }, [prestadores]);

  /**
   * ID em `rh_calendario_acoes.solicitante_funcionario_id`: a política RLS só permite INSERT quando este
   * funcionário coincide com o login (e-mail / e-mail Spin em `rh_funcionarios`). Sem esse vínculo o
   * agendamento seria rejeitado — por isso o botão «Agendar» só aparece quando conseguimos resolver o id.
   */
  const solicitanteAgendarId = useMemo(
    () => meuRhFuncionarioId ?? meuPrestadorRhIdVistaCompleta,
    [meuRhFuncionarioId, meuPrestadorRhIdVistaCompleta],
  );

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
      setPontoMesLinhas([]);
      return;
    }
    if (abaPrincipal !== "presenca") return;
    const fid = presencaFilterStaffIds[0];
    if (!fid) {
      setPontoMesLinhas([]);
      return;
    }
    let cancelled = false;
    setLoadingPontoMes(true);
    const refIso = refMesPrimeiroDiaISO(current);
    void supabase.rpc("rh_calendario_ponto_registros_mes", { p_funcionario_id: fid, p_ref_mes: refIso }).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingPontoMes(false);
      if (error) {
        setPontoMesLinhas([]);
        return;
      }
      const rows = (data ?? []) as { dia_sp: string | Date; check_in_at: string | null; check_out_at: string | null }[];
      setPontoMesLinhas(
        rows.map((r) => {
          const raw = r.dia_sp as string | Date;
          const diaStr = typeof raw === "string" ? String(raw).slice(0, 10) : toISO(new Date(raw));
          return { dia_sp: diaStr, check_in_at: r.check_in_at, check_out_at: r.check_out_at };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [perm.loading, perm.canView, abaPrincipal, presencaFilterStaffIds, current, pontoMesTick]);

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
    void supabase
      .from("operadoras")
      .select("slug, turno_manha_inicio, turno_tarde_inicio, turno_noite_inicio")
      .in("slug", slugs)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMapOpTurnos(new Map());
          return;
        }
        const m = new Map<string, OpTurnosCalPick>();
        (data ?? []).forEach((row: OpTurnosCalPick) => {
          if (row.slug) m.set(row.slug, row);
        });
        setMapOpTurnos(m);
      });
    return () => {
      cancelled = true;
    };
  }, [prestadores, perm.loading, perm.canView]);

  const compromissosPorDiaIso = useMemo(() => {
    const filtroStaff = compFilterStaffIds.length > 0 ? new Set(compFilterStaffIds) : null;
    const mapa = new Map<string, CompromissoEscalaCal[]>();
    for (const r of rawGradeRowsFiltrados) {
      if (filtroStaff && !filtroStaff.has(r.funcionario_id)) continue;
      if (filtroTimeAtivo) {
        const tid = orgTimeIdPorPrestadorId.get(r.funcionario_id) ?? null;
        const gid = orgGerenciaIdPorPrestadorId.get(r.funcionario_id) ?? null;
        let pass = false;
        if (tid && filtroTimeIdsReais.has(tid)) pass = true;
        if (treinamentoSelecionado && treinamentoGerenciaId) {
          if (gid === treinamentoGerenciaId) pass = true;
          if (tid && treinamentoTimeIds.has(tid)) pass = true;
        }
        if (!pass) continue;
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
    orgTimeIdPorPrestadorId,
    orgGerenciaIdPorPrestadorId,
    filtroTimeAtivo,
    filtroTimeIdsReais,
    treinamentoSelecionado,
    treinamentoGerenciaId,
    treinamentoTimeIds,
  ]);

  useEffect(() => {
    if (!modalDia || perm.loading || perm.canView === "nao") {
      setAcoesOfertadasNoDia([]);
      setErroAcoesOfertadasDia(null);
      setLoadingAcoesOfertadasDia(false);
      return;
    }
    let cancelled = false;
    setLoadingAcoesOfertadasDia(true);
    setErroAcoesOfertadasDia(null);
    const iso = toISO(modalDia);
    void supabase.rpc("rh_calendario_acoes_ofertadas_no_dia", { p_dia_iso: iso }).then(({ data, error }) => {
      if (cancelled) return;
      setLoadingAcoesOfertadasDia(false);
      if (error) {
        setErroAcoesOfertadasDia(error.message || "Não foi possível carregar as ofertas.");
        setAcoesOfertadasNoDia([]);
        return;
      }
      const rows = (data ?? []) as RhCalAcaoOfertaDiaRow[];
      setAcoesOfertadasNoDia(
        rows.map((r) => ({
          ...r,
          payload:
            r.payload != null && typeof r.payload === "object" && !Array.isArray(r.payload)
              ? (r.payload as Record<string, unknown>)
              : {},
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [modalDia, perm.loading, perm.canView]);

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
        const tid = orgTimeIdPorPrestadorId.get(row.solicitante_funcionario_id) ?? null;
        const gid = orgGerenciaIdPorPrestadorId.get(row.solicitante_funcionario_id) ?? null;
        let pass = false;
        if (tid && filtroTimeIdsReais.has(tid)) pass = true;
        if (treinamentoSelecionado && treinamentoGerenciaId) {
          if (gid === treinamentoGerenciaId) pass = true;
          if (tid && treinamentoTimeIds.has(tid)) pass = true;
        }
        if (!pass) continue;
      }
      const iso = isoChaveDiaReuniaoRpc(row.dia_iso as string | Date | undefined);
      if (!iso) continue;
      const item: CompromissoAgendaExtra = {
        id: row.id,
        titulo: tituloReuniaoNoCalendario(row, solicitanteAgendarId),
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
    treinamentoSelecionado,
    treinamentoGerenciaId,
    treinamentoTimeIds,
    orgTimeIdPorPrestadorId,
    orgGerenciaIdPorPrestadorId,
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
    setModalDiaTab("compromissos");
  }

  function prev() {
    if (!podeRetrocederMesCalendario(current)) return;
    const d = new Date(current);
    d.setMonth(d.getMonth() - 1);
    if (mesCalendarioAntesDoMinimo(d)) setCurrent(dataInicialCarrosselCalendarioRh());
    else setCurrent(d);
  }
  function next() {
    if (!podeAvancarMesCalendario(current)) return;
    const d = new Date(current);
    d.setMonth(d.getMonth() + 1);
    if (mesCalendarioAlemDoMaximoFuturo(d)) setCurrent(mesMaximoCarrosselCalendarioRh());
    else setCurrent(d);
  }

  function headerTitle() {
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

  const card: CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const btnNav: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  /** Início/fim do turno (ou "—"); `undefined` para Compra/Venda/Troca. */
  function horarioSubtituloParaCompromissoCal(comp: CompromissoEscalaCal): string | undefined {
    if (turnoCalendarioEhCompraVendaTroca(comp.turno)) return undefined;
    const pRow = prestadorPorId.get(comp.prestadorId);
    const slug = (pRow?.staff_operadora_slug ?? "").trim();
    const opRow = slug ? mapOpTurnos.get(slug) : undefined;
    const horario = resumoHorarioTurnoModalCalendario(pRow, comp.turno, opRow ?? null);
    return horario ?? "—";
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
          alignItems: "center",
          gap: 6,
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
        <Icon size={11} color={cor} aria-hidden="true" />
        <span style={{ fontSize: 11, fontWeight: 700, color: cor, fontFamily: FONT.body, flexShrink: 0 }}>{etiqueta}</span>
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
          }}
          title={`${etiqueta} — ${item.titulo}`}
        >
          {item.titulo}
        </span>
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
          <Clock size={11} color={BRAND.azul} aria-hidden="true" />
          <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.azul, fontFamily: FONT.body, flexShrink: 0 }}>{comp.turno}</span>
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
                          subtituloModal={soPropriosCal ? horarioSubtituloParaCompromissoCal(linha.comp) : undefined}
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
    const { data: { session } } = await supabase.auth.getSession();
    const tok = session?.access_token;
    if (!tok) return;
    setPontoSubmitting(true);
    try {
      const res = await registrarPrestadorPonto(tok);
      if (res.ok && res.estado) {
        setPontoEstado(res.estado);
        setPontoMesTick((x) => x + 1);
        return;
      }
      if (res.code === "rede" || res.code === "config") {
        setPontoMsgModal(MSG_PRESTADOR_PONTO_REDE);
      } else {
        setPontoMsgModal(res.error ?? "Não foi possível registar.");
      }
      if (res.estado) setPontoEstado(res.estado);
    } finally {
      setPontoSubmitting(false);
    }
  }, []);

  const mostrarBotaoPontoCalendario =
    !perm.loading && (perm.canView === "sim" || perm.canView === "proprios");
  const labelBotaoPonto = pontoEstado?.proximoTipo === "check_out" ? "Check-out" : "Check-in";
  const pontoBotaoHabilitado =
    mostrarBotaoPontoCalendario &&
    !pontoEstadoLoading &&
    !pontoSubmitting &&
    pontoEstado?.escaladoHoje === true &&
    pontoEstado?.proximoTipo != null;
  const pontoBotaoTitle = (() => {
    if (!mostrarBotaoPontoCalendario) return undefined;
    if (pontoEstadoLoading) return "A carregar estado do ponto…";
    if (!pontoEstado) return "Não foi possível obter o estado do ponto.";
    if (!pontoEstado.rhFuncionarioId) {
      return "Não há colaborador em RH associado ao seu e-mail de login (e-mail ou e-mail Spin).";
    }
    if (pontoEstado.escaladoHoje !== true) return "Sem escala aprovada para hoje na Gestão de Escala.";
    if (pontoEstado.proximoTipo == null) return "Check-in e Check-out de hoje já foram registados.";
    return undefined;
  })();

  const showTimeFilter = !soPropriosCal && timeMultiselectItems.length > 0;
  const showStaffFilter = !soPropriosCal && staffMultiselectItems.length > 0;
  const hasStaffFilterComp = compFilterStaffIds.length > 0;
  const hasTimeFilterComp = compFilterTimeIds.length > 0;
  const mostrarBotaoMeuCalendario =
    !perm.loading && perm.canView === "sim" && Boolean(meuPrestadorRhIdVistaCompleta);
  const calendarioSoMeuAtivo =
    Boolean(meuPrestadorRhIdVistaCompleta) &&
    compFilterStaffIds.length === 1 &&
    compFilterStaffIds[0] === meuPrestadorRhIdVistaCompleta;
  const meuIdParaBotoesMeu = perm.canView === "proprios" ? meuRhFuncionarioId : meuPrestadorRhIdVistaCompleta;
  const mostrarBotaoMeuControle =
    !perm.loading && (perm.canView === "sim" || perm.canView === "proprios") && Boolean(meuIdParaBotoesMeu);
  const meuControleAtivo =
    Boolean(meuIdParaBotoesMeu) &&
    presencaFilterStaffIds.length === 1 &&
    presencaFilterStaffIds[0] === meuIdParaBotoesMeu;
  const showTimeFilterPresenca = !soPropriosCal && timeMultiselectItems.length > 0;
  const showStaffFilterPresenca = !soPropriosCal && staffPresencaMultiselectItems.length > 0;
  const podeRetrocederMes = podeRetrocederMesCalendario(current);
  const podeAvancarMes = podeAvancarMesCalendario(current);

  const diasDoMesPresenca = useMemo(() => {
    const y = current.getFullYear();
    const m = current.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const out: Date[] = [];
    for (let d = 1; d <= last; d++) out.push(new Date(y, m, d));
    return out;
  }, [current]);

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
        icon={<CalendarRange size={14} aria-hidden="true" />}
        title="Calendário"
        subtitle="Organize a rotina operacional com visibilidade completa de turnos, trocas e compromissos."
        brand={brand}
        t={t}
      />

      <div
        role="tablist"
        aria-label="Secção do calendário"
        style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={abaPrincipal === "compromissos"}
          onClick={() => setAbaPrincipal("compromissos")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${abaPrincipal === "compromissos" ? brand.accent : t.cardBorder}`,
            background:
              abaPrincipal === "compromissos"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: abaPrincipal === "compromissos" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: abaPrincipal === "compromissos" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Compromissos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={abaPrincipal === "presenca"}
          onClick={() => setAbaPrincipal("presenca")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${abaPrincipal === "presenca" ? brand.accent : t.cardBorder}`,
            background:
              abaPrincipal === "presenca"
                ? brand.accent.startsWith("var(")
                  ? "color-mix(in srgb, var(--brand-action, #7c3aed) 14%, transparent)"
                  : `${String(brand.accent)}20`
                : t.inputBg,
            color: abaPrincipal === "presenca" ? brand.accent : t.textMuted,
            fontSize: 13,
            fontWeight: abaPrincipal === "presenca" ? 800 : 600,
            fontFamily: FONT.body,
            cursor: "pointer",
          }}
        >
          Controle de Presença
        </button>
      </div>

      {abaPrincipal === "compromissos" ? (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              background: brand.blockBg,
              padding: "12px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 18,
                  flex: "1 1 280px",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={prev}
                  disabled={!podeRetrocederMes}
                  style={{
                    ...btnNav,
                    opacity: podeRetrocederMes ? 1 : 0.38,
                    cursor: podeRetrocederMes ? "pointer" : "not-allowed",
                  }}
                  aria-label={
                    podeRetrocederMes
                      ? "Mês anterior"
                      : `Primeiro mês disponível: ${MONTHS[CALENDARIO_MES0_MIN]} de ${CALENDARIO_ANO_MIN}`
                  }
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: t.text,
                    fontFamily: FONT.body,
                    minWidth: 180,
                    textAlign: "center",
                  }}
                >
                  {headerTitle()}
                </span>
                <button
                  type="button"
                  onClick={next}
                  disabled={!podeAvancarMes}
                  style={{
                    ...btnNav,
                    opacity: podeAvancarMes ? 1 : 0.38,
                    cursor: podeAvancarMes ? "pointer" : "not-allowed",
                  }}
                  aria-label={
                    podeAvancarMes
                      ? "Próximo mês"
                      : `Último mês disponível: ${MONTHS[mesMaximoCarrosselCalendarioRh().getMonth()]} de ${mesMaximoCarrosselCalendarioRh().getFullYear()}`
                  }
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>

                {loadingEscala && (
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
                )}

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
                ) : (
                  <>
                    {showTimeFilter ? (
                      <InfluencerMultiSelect
                        selected={compFilterTimeIds}
                        onChange={setCompFilterTimeIds}
                        influencers={timeMultiselectItems}
                        t={t}
                        triggerEmptyLabel="Time"
                        ariaFilterPrefix="Filtrar por time"
                        listboxAriaLabel="Selecionar time"
                      />
                    ) : null}
                    {showStaffFilter ? (
                      <InfluencerMultiSelect
                        selected={compFilterStaffIds}
                        onChange={setCompFilterStaffIds}
                        influencers={staffMultiselectItems}
                        t={t}
                        triggerEmptyLabel="Staff"
                        ariaFilterPrefix="Filtrar por staff"
                        listboxAriaLabel="Selecionar membro do staff"
                        enableSearch
                        searchPlaceholder="Pesquisar prestador…"
                      />
                    ) : null}
                    {mostrarBotaoMeuCalendario ? (
                      <button
                        type="button"
                        aria-pressed={calendarioSoMeuAtivo}
                        onClick={() => {
                          if (calendarioSoMeuAtivo) {
                            setCompFilterStaffIds([]);
                          } else {
                            setCompFilterTimeIds([]);
                            setCompFilterStaffIds([meuPrestadorRhIdVistaCompleta!]);
                          }
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: `1.5px solid ${calendarioSoMeuAtivo ? brand.accent : t.cardBorder}`,
                          background: calendarioSoMeuAtivo
                            ? brand.accent.startsWith("var(")
                              ? "color-mix(in srgb, var(--brand-action, #7c3aed) 18%, transparent)"
                              : `${String(brand.accent)}22`
                            : t.inputBg,
                          color: calendarioSoMeuAtivo ? brand.accent : t.textMuted,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        aria-label={
                          calendarioSoMeuAtivo
                            ? "Mostrar calendário geral de todos os prestadores"
                            : "Filtrar calendário apenas para o meu registo de prestador"
                        }
                      >
                        Meu Calendário
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                {solicitanteAgendarId ? (
                  <button
                    type="button"
                    onClick={() => setModalAgendarAberto(true)}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 999,
                      border: `1px solid ${brand.accent}`,
                      background: brand.accent.startsWith("var(")
                        ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 12%, transparent)"
                        : `${String(brand.accent)}18`,
                      color: brand.accent,
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                    aria-label="Agendar reunião"
                  >
                    Agendar
                  </button>
                ) : null}
              </div>
            </div>

            <div
              style={{
                paddingTop: 12,
                marginTop: 12,
                borderTop: `1px solid ${t.cardBorder}`,
                width: "100%",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <label
                htmlFor="cal-filtro-tipo-compromisso"
                style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body }}
              >
                Tipo de compromisso
              </label>
              <select
                id="cal-filtro-tipo-compromisso"
                aria-label="Filtrar por tipo de compromisso"
                value={filtroTipoCompromisso}
                onChange={(e) => setFiltroTipoCompromisso(e.target.value as FiltroTipoCompromissoUi)}
                style={{
                  minWidth: 200,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg,
                  color: t.text,
                  fontSize: 13,
                  fontFamily: FONT.body,
                }}
              >
                {OPCOES_TIPO_COMPROMISSO_SELECT.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {(hasStaffFilterComp || hasTimeFilterComp || filtroTipoCompromisso !== "todos") && (
              <div
                style={{
                  paddingTop: 12,
                  marginTop: 12,
                  borderTop: `1px solid ${t.cardBorder}`,
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
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
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              borderRadius: 14,
              border: `1px solid ${t.cardBorder}`,
              background: brand.blockBg,
              padding: "12px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 16,
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 18,
                  flex: "1 1 280px",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={prev}
                  disabled={!podeRetrocederMes}
                  style={{
                    ...btnNav,
                    opacity: podeRetrocederMes ? 1 : 0.38,
                    cursor: podeRetrocederMes ? "pointer" : "not-allowed",
                  }}
                  aria-label={
                    podeRetrocederMes
                      ? "Mês anterior"
                      : `Primeiro mês disponível: ${MONTHS[CALENDARIO_MES0_MIN]} de ${CALENDARIO_ANO_MIN}`
                  }
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: t.text,
                    fontFamily: FONT.body,
                    minWidth: 180,
                    textAlign: "center",
                  }}
                >
                  {headerTitle()}
                </span>
                <button
                  type="button"
                  onClick={next}
                  disabled={!podeAvancarMes}
                  style={{
                    ...btnNav,
                    opacity: podeAvancarMes ? 1 : 0.38,
                    cursor: podeAvancarMes ? "pointer" : "not-allowed",
                  }}
                  aria-label={
                    podeAvancarMes
                      ? "Próximo mês"
                      : `Último mês disponível: ${MONTHS[mesMaximoCarrosselCalendarioRh().getMonth()]} de ${mesMaximoCarrosselCalendarioRh().getFullYear()}`
                  }
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>

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
                ) : (
                  <>
                    {showTimeFilterPresenca ? (
                      <InfluencerMultiSelect
                        selected={presencaFilterTimeIds}
                        onChange={(ids) => setPresencaFilterTimeIds((prev) => normalizarSelecaoUnica(prev, ids))}
                        influencers={timeMultiselectItems}
                        t={t}
                        triggerEmptyLabel="Time"
                        ariaFilterPrefix="Filtrar por time"
                        listboxAriaLabel="Selecionar time"
                      />
                    ) : null}
                    {showStaffFilterPresenca ? (
                      <InfluencerMultiSelect
                        selected={presencaFilterStaffIds}
                        onChange={(ids) => setPresencaFilterStaffIds((prev) => normalizarSelecaoUnica(prev, ids))}
                        influencers={staffPresencaMultiselectItems}
                        t={t}
                        triggerEmptyLabel="Staff"
                        ariaFilterPrefix="Filtrar por staff"
                        listboxAriaLabel="Selecionar membro do staff"
                        enableSearch
                        searchPlaceholder="Pesquisar prestador…"
                      />
                    ) : null}
                    {mostrarBotaoMeuControle ? (
                      <button
                        type="button"
                        aria-pressed={meuControleAtivo}
                        onClick={() => {
                          if (meuControleAtivo) {
                            setPresencaFilterStaffIds([]);
                            setPresencaFilterTimeIds([]);
                          } else {
                            setPresencaFilterTimeIds([]);
                            setPresencaFilterStaffIds([meuIdParaBotoesMeu!]);
                          }
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: `1.5px solid ${meuControleAtivo ? brand.accent : t.cardBorder}`,
                          background: meuControleAtivo
                            ? brand.accent.startsWith("var(")
                              ? "color-mix(in srgb, var(--brand-action, #7c3aed) 18%, transparent)"
                              : `${String(brand.accent)}22`
                            : t.inputBg,
                          color: meuControleAtivo ? brand.accent : t.textMuted,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: FONT.body,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        aria-label={
                          meuControleAtivo
                            ? "Mostrar lista geral de staff"
                            : "Filtrar controle de presença apenas para o meu utilizador"
                        }
                      >
                        Meu Controle
                      </button>
                    ) : null}
                  </>
                )}
              </div>

              <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                {mostrarBotaoPontoCalendario ? (
                  <button
                    type="button"
                    onClick={() => void onPrestadorPontoRegistrar()}
                    disabled={!pontoBotaoHabilitado}
                    title={pontoBotaoTitle}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 999,
                      border: `1px solid ${brand.accent}`,
                      background: pontoBotaoHabilitado
                        ? brand.accent.startsWith("var(")
                          ? "color-mix(in srgb, var(--brand-action, #7c3aed) 22%, transparent)"
                          : `${String(brand.accent)}28`
                        : t.cardBorder,
                      color: pontoBotaoHabilitado ? brand.accent : t.textMuted,
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: FONT.body,
                      cursor: pontoBotaoHabilitado ? "pointer" : "not-allowed",
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: pontoBotaoHabilitado ? 1 : 0.72,
                    }}
                    aria-label={labelBotaoPonto}
                  >
                    {(pontoEstadoLoading || pontoSubmitting) && (
                      <Loader2
                        size={14}
                        className="app-lucide-spin"
                        aria-hidden="true"
                        color={pontoBotaoHabilitado ? "#fff" : "var(--brand-primary, #7c3aed)"}
                      />
                    )}
                    {labelBotaoPonto}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {abaPrincipal === "compromissos" ? (
        <div style={card}>
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
          <div className="app-grid-kpi-3" style={{ marginBottom: 14 }}>
            {(["Trabalhados", "Pendentes", "Aprovados"] as const).map((label) => (
              <div
                key={label}
                style={{
                  background: brand.blockBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 18,
                  padding: "16px 18px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, fontFamily: FONT_TITLE, marginBottom: 8 }}>
                  {label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>—</div>
                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 6 }}>Valores em definição</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 14 }}>
              Controle de Presença
            </div>
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
              <div className="app-table-wrap">
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
                    Atualizando registos de ponto…
                  </div>
                ) : null}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <caption style={{ display: "none" }}>
                    Controle de presença por dia no mês selecionado
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={getThStyle(t, { whiteSpace: "normal" })}>
                        Data
                      </th>
                      <th scope="col" style={getThStyle(t, { whiteSpace: "normal" })}>
                        Situação
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Entrada Escalada
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Entrada Realizada
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Saída Escalada
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Saída Realizada
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Horas Escaladas
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Horas Realizadas
                      </th>
                      <th scope="col" style={getThStyle(t, { whiteSpace: "normal" })}>
                        Status
                      </th>
                      <th scope="col" style={getThStyle(t, { textAlign: "right", whiteSpace: "normal" })}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diasDoMesPresenca.map((dia, i) => {
                      const fid = presencaFilterStaffIds[0]!;
                      const iso = toISO(dia);
                      const valorG = primeiroValorGradeDia(rawGradeRows, fid, iso);
                      const pRow = prestadorPorId.get(fid);
                      const slug = (pRow?.staff_operadora_slug ?? "").trim();
                      const opRow = slug ? mapOpTurnos.get(slug) ?? null : null;
                      const esc = obterEntradaSaidaEscaladasPrestadorDia(pRow, valorG, opRow);
                      const pt = mapaPontoPorDiaIso.get(iso);
                      const entEsc = esc ? esc.entrada : "—";
                      const saiEsc = esc ? esc.saida : "—";
                      const entReal = horaRegistoSP(pt?.check_in_at);
                      const saiReal = horaRegistoSP(pt?.check_out_at);
                      const horasEsc = esc ? formatoDuracaoFmtHorasTotal(entEsc, saiEsc) : "—";
                      const horasReal = duracaoEntreTimestamps(pt?.check_in_at ?? null, pt?.check_out_at ?? null);
                      const st = statusPresencaNoDia(esc, pt?.check_in_at, pt?.check_out_at);
                      const situacao = situacaoGestaoEscalaParaDia(valorG);
                      return (
                        <tr key={iso} style={{ background: zebraStripe(i) }}>
                          <td style={getTdStyle(t)}>
                            {dia.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                          </td>
                          <td style={getTdStyle(t)}>{situacao}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{entEsc}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{entReal}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{saiEsc}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{saiReal}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{horasEsc}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{horasReal}</td>
                          <td style={getTdStyle(t)}>{st}</td>
                          <td style={{ ...getTdStyle(t), textAlign: "right", fontVariantNumeric: "tabular-nums" }}>—</td>
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
          <div
            role="tablist"
            aria-label="Conteúdo do dia"
            style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 10 }}
          >
            <button
              type="button"
              onClick={() => setModalDiaTab("compromissos")}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: modalDiaTab === "compromissos" ? 800 : 500,
                color: modalDiaTab === "compromissos" ? brand.accent : t.textMuted,
                background: modalDiaTab === "compromissos" ? (isDark ? "rgba(30,54,248,0.15)" : "rgba(30,54,248,0.08)") : "transparent",
                boxShadow: modalDiaTab === "compromissos" ? `inset 0 -2px 0 ${brand.accent}` : "none",
              }}
              aria-selected={modalDiaTab === "compromissos"}
              role="tab"
              aria-controls="cal-modal-tab-compromissos"
              id="cal-modal-tab-btn-compromissos"
            >
              Compromissos
            </button>
            <button
              type="button"
              onClick={() => setModalDiaTab("ofertas")}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: modalDiaTab === "ofertas" ? 800 : 500,
                color: modalDiaTab === "ofertas" ? brand.accent : t.textMuted,
                background: modalDiaTab === "ofertas" ? (isDark ? "rgba(30,54,248,0.15)" : "rgba(30,54,248,0.08)") : "transparent",
                boxShadow: modalDiaTab === "ofertas" ? `inset 0 -2px 0 ${brand.accent}` : "none",
              }}
              aria-selected={modalDiaTab === "ofertas"}
              role="tab"
              aria-controls="cal-modal-tab-ofertas"
              id="cal-modal-tab-btn-ofertas"
            >
              Ofertas
            </button>
          </div>

          {modalDiaTab === "compromissos" ? (
            <div id="cal-modal-tab-compromissos" role="tabpanel" aria-labelledby="cal-modal-tab-btn-compromissos">
              {(() => {
                const iso = toISO(modalDia);
                const mostrarTipo = (ch: FiltroTipoCompromissoUi) =>
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
                    node: (
                      <div key="reunioes" style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                          Reuniões
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                          {r.map((x) => (
                            <li key={x.id}>{x.titulo}</li>
                          ))}
                        </ul>
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
                    node: (
                      <div key="turnos">
                        <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>
                          Turnos
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
                          {turnos.map((comp) => (
                            <EscalaCompromissoChip
                              key={`${comp.prestadorId}-${comp.turno}`}
                              comp={comp}
                              subtituloModal={horarioSubtituloParaCompromissoCal(comp)}
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
          ) : (
            <div id="cal-modal-tab-ofertas" role="tabpanel" aria-labelledby="cal-modal-tab-btn-ofertas">
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12, fontFamily: FONT_TITLE }}>
                Ofertas de Troca e Compra
              </div>
              {loadingAcoesOfertadasDia ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: t.textMuted,
                    fontSize: 13,
                    fontFamily: FONT.body,
                  }}
                >
                  <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
                  Carregando…
                </div>
              ) : erroAcoesOfertadasDia ? (
                <p style={{ margin: 0, fontSize: 13, color: "#e84025", fontFamily: FONT.body }} role="alert">
                  {erroAcoesOfertadasDia}
                </p>
              ) : acoesOfertadasNoDia.length === 0 ? (
                <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, listStyleType: "disc", fontFamily: FONT.body }}>
                  {acoesOfertadasNoDia.map((row) => {
                    const labelTipo =
                      RH_CALENDARIO_ACAO_LABEL[row.tipo_acao as RhCalendarioAcaoTipo] ?? row.tipo_acao;
                    const detalhe = textoResumoPayloadAcaoCalendario(row.tipo_acao, row.payload);
                    return (
                      <li key={row.id} style={{ marginBottom: 12, color: t.text, fontSize: 13 }}>
                        <div style={{ fontWeight: 700 }}>{(row.solicitante_nome ?? "").trim() || "—"}</div>
                        <div style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                          {labelTipo}
                          {" · "}
                          {row.status}
                        </div>
                        {detalhe ? (
                          <div style={{ fontSize: 12, marginTop: 4, color: t.text }}>{detalhe}</div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
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
