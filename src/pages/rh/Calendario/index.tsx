import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarRange,
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
import { ModalAcaoCalendario } from "./ModalAcaoCalendario";
import {
  RH_CALENDARIO_ACAO_LABEL,
  textoResumoPayloadAcaoCalendario,
  type RhCalendarioAcaoTipo,
} from "../../../lib/rhCalendarioAcaoHelpers";

/** Tipos de compromisso filtráveis; conjunto vazio na UI = mostrar todos. */
type ChaveFiltroCompromissoCal = "reunioes" | "treinamentos" | "feedback" | "turnos";

const COMPROMISSOS_FILTRO_BOTOES: { chave: ChaveFiltroCompromissoCal; label: string }[] = [
  { chave: "reunioes", label: "Reuniões" },
  { chave: "treinamentos", label: "Treinamentos" },
  { chave: "feedback", label: "Feedback" },
  { chave: "turnos", label: "Turnos" },
];

const ORDEM_CHAVE_FILTRO_NA_LISTA: ChaveFiltroCompromissoCal[] = ["reunioes", "treinamentos", "feedback", "turnos"];

type StaffTimeRow = { id: string; nome: string; gerencia_id: string; gerencia_nome: string };

/** Id sintético no multiselect (não é uuid de `rh_org_times`). */
const TREINAMENTO_FILTRO_ID = "rh-cal-filtro-treinamento";

/** Ordem e rótulos exibidos no filtro (nome do time; Treinamento = gerência Treinamento). */
const CALENDARIO_TIMES_FILTRO_ORDEM = [
  "Customer Service",
  "Service manager",
  "Game Presenter",
  "Performance Coach",
  "Shift Leader",
  "Shuffler",
  "Treinamento",
] as const;

function normalizarNomeCalFiltro(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function timeRowPorRotuloCanonica(times: StaffTimeRow[], rotulo: string): StaffTimeRow | undefined {
  const target = normalizarNomeCalFiltro(rotulo);
  return times.find((t) => normalizarNomeCalFiltro(t.nome) === target);
}

function prestadorAtendeFiltroTime(
  p: RhFuncionario,
  opts: {
    filtroAtivo: boolean;
    filtroTimeIdsReais: Set<string>;
    treinamentoSelecionado: boolean;
    treinamentoGerenciaId: string | null;
    treinamentoTimeIds: Set<string>;
  },
): boolean {
  if (!opts.filtroAtivo) return true;
  if (p.org_time_id && opts.filtroTimeIdsReais.has(p.org_time_id)) return true;
  if (opts.treinamentoSelecionado && opts.treinamentoGerenciaId) {
    if (p.org_gerencia_id === opts.treinamentoGerenciaId) return true;
    if (p.org_time_id && opts.treinamentoTimeIds.has(p.org_time_id)) return true;
  }
  return false;
}

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

/** Ao abrir a página: mês civil atual (dia 1); não antes do primeiro mês com dados na grade. */
function mesInicialCalendarioRhNaEntrada(): Date {
  const hoje = new Date();
  const primeiroDoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const minimo = dataInicialCarrosselCalendarioRh();
  return primeiroDoMesAtual < minimo ? minimo : primeiroDoMesAtual;
}

function mesCalendarioAntesDoMinimo(c: Date): boolean {
  return c.getFullYear() < CALENDARIO_ANO_MIN || (c.getFullYear() === CALENDARIO_ANO_MIN && c.getMonth() < CALENDARIO_MES0_MIN);
}

/** Permite ir ao mês anterior (nunca antes de abril/2026). */
function podeRetrocederMesCalendario(c: Date): boolean {
  return c.getFullYear() > CALENDARIO_ANO_MIN || (c.getFullYear() === CALENDARIO_ANO_MIN && c.getMonth() > CALENDARIO_MES0_MIN);
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

/** Alinha login (e-mail da sessão) a `rh_funcionarios` — mesma lógica da vista «Próprios». */
async function buscarRhFuncionarioAtivoPorEmailLogin(emailBruto: string): Promise<RhFuncionario | null> {
  const em = emailBruto.trim();
  if (!em) return null;
  const el = em.toLowerCase();
  const { data: porEmailEq } = await supabase
    .from("rh_funcionarios")
    .select("*")
    .eq("email", em)
    .in("status", ["ativo", "indisponivel"])
    .maybeSingle();
  let row: RhFuncionario | null = (porEmailEq as RhFuncionario | null) ?? null;
  if (!row) {
    const { data: porSpinEq } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .eq("email_spin", em)
      .in("status", ["ativo", "indisponivel"])
      .maybeSingle();
    row = (porSpinEq as RhFuncionario | null) ?? null;
  }
  if (!row) {
    const { data: cand } = await supabase
      .from("rh_funcionarios")
      .select("*")
      .in("status", ["ativo", "indisponivel"])
      .limit(80);
    row =
      (cand as RhFuncionario[] | undefined)?.find(
        (p) =>
          (p.email ?? "").trim().toLowerCase() === el ||
          (Boolean((p.email_spin ?? "").trim()) && (p.email_spin ?? "").trim().toLowerCase() === el),
      ) ?? null;
  }
  return row;
}

type CompromissoEscalaCal = {
  prestadorId: string;
  nome: string;
  turno: string;
};

/** Compromissos não-turno (futuro: API); hoje lista vazia por dia. */
type CompromissoAgendaExtra = { id: string; titulo: string };

/** Ordem na grelha do dia: reuniões → treinamentos → feedback → turnos (ver `pesoTurnoExibicaoCalendario`). */
type LinhaCalendarioDia =
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

export default function RhCalendarioPage() {
  const { theme: t, isDark, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_calendario");
  const soPropriosCal = !perm.loading && perm.canView === "proprios";

  const [current, setCurrent] = useState(() => mesInicialCalendarioRhNaEntrada());
  /** Vazio = mostrar todos os tipos de compromisso na grelha e contagens. */
  const [chavesFiltroCompromissos, setChavesFiltroCompromissos] = useState<ChaveFiltroCompromissoCal[]>([]);
  const [modalDia, setModalDia] = useState<Date | null>(null);
  const [modalDiaTab, setModalDiaTab] = useState<"compromissos" | "ofertas">("compromissos");
  const [acoesOfertadasNoDia, setAcoesOfertadasNoDia] = useState<RhCalAcaoOfertaDiaRow[]>([]);
  const [loadingAcoesOfertadasDia, setLoadingAcoesOfertadasDia] = useState(false);
  const [erroAcoesOfertadasDia, setErroAcoesOfertadasDia] = useState<string | null>(null);
  const [modalAcaoAberto, setModalAcaoAberto] = useState(false);

  const [times, setTimes] = useState<StaffTimeRow[]>([]);
  const [prestadores, setPrestadores] = useState<RhFuncionario[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [erroStaff, setErroStaff] = useState<string | null>(null);

  const [filterStaffIds, setFilterStaffIds] = useState<string[]>([]);
  const [filterTimeIds, setFilterTimeIds] = useState<string[]>([]);
  const [treinamentoGerenciaId, setTreinamentoGerenciaId] = useState<string | null>(null);
  const [treinamentoTimeIdsList, setTreinamentoTimeIdsList] = useState<string[]>([]);

  const [rawGradeRows, setRawGradeRows] = useState<RpcGradeCalendarioRow[]>([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  /** Quando `rh_calendario` está em «Próprios»: id do `rh_funcionarios` do utilizador autenticado (e-mail / e-mail Spin). */
  const [meuRhFuncionarioId, setMeuRhFuncionarioId] = useState<string | null>(null);
  /** Vista completa (`canView === "sim"`): id do prestador ligado ao utilizador, para filtro «Meu Calendário». */
  const [meuPrestadorRhIdVistaCompleta, setMeuPrestadorRhIdVistaCompleta] = useState<string | null>(null);
  const [mapOpTurnos, setMapOpTurnos] = useState<Map<string, OpTurnosCalPick>>(() => new Map());

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
      setFilterStaffIds([]);
      setFilterTimeIds([]);
    }
  }, [perm.canView]);

  const treinamentoTimeIds = useMemo(() => new Set(treinamentoTimeIdsList), [treinamentoTimeIdsList]);

  const filtroTimeIdsReais = useMemo(() => {
    const allowed = new Set(timeIds);
    return new Set(filterTimeIds.filter((id) => id !== TREINAMENTO_FILTRO_ID && allowed.has(id)));
  }, [filterTimeIds, timeIds]);

  const treinamentoSelecionado = filterTimeIds.includes(TREINAMENTO_FILTRO_ID);
  const filtroTimeAtivo = filterTimeIds.length > 0;

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
    setFilterTimeIds((prev) => {
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
    setFilterStaffIds((prev) => {
      if (prev.length === 0) return prev;
      const allowedStaff = new Set(prestadores.filter((p) => prestadorAtendeFiltroTime(p, opts)).map((p) => p.id));
      const next = prev.filter((id) => allowedStaff.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [prestadores, filtroTimeAtivo, filtroTimeIdsReais, treinamentoSelecionado, treinamentoGerenciaId, treinamentoTimeIds, filterTimeIds]);

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
    const filtroStaff = filterStaffIds.length > 0 ? new Set(filterStaffIds) : null;
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
    filterStaffIds,
    nomePrestadorPorId,
    orgTimeIdPorPrestadorId,
    orgGerenciaIdPorPrestadorId,
    filtroTimeAtivo,
    filtroTimeIdsReais,
    treinamentoSelecionado,
    treinamentoGerenciaId,
    treinamentoTimeIds,
  ]);

  /** Valores brutos da grade (por dia) só do colaborador autenticado — para o modal Ação. */
  const gradeValorPorDiaIso = useMemo(() => {
    const m = new Map<string, string>();
    if (!meuRhFuncionarioId) return m;
    for (const r of rawGradeRowsFiltrados) {
      if (r.funcionario_id !== meuRhFuncionarioId) continue;
      const iso = diaIsoChaveGrade(r);
      if (!iso) continue;
      m.set(iso, (r.valor ?? "").trim());
    }
    return m;
  }, [rawGradeRowsFiltrados, meuRhFuncionarioId]);

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

  function reunioesAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }
  function treinamentosAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }
  function feedbackAgendaDoDia(_iso: string): CompromissoAgendaExtra[] {
    return [];
  }

  function turnosAgendadosNoDia(date: Date): CompromissoEscalaCal[] {
    return ordenarTurnosCalendario(compromissosPorDiaIso.get(toISO(date)) ?? []);
  }

  /** Linhas do dia na grelha: Reuniões, Treinamentos, Feedback, Turnos (Comercial → Noite → ofertas). */
  function linhasCompromissosDiaCalendario(date: Date): LinhaCalendarioDia[] {
    const iso = toISO(date);
    const turnosOrd = ordenarTurnosCalendario(compromissosPorDiaIso.get(iso) ?? []);
    const turnLinhas: LinhaCalendarioDia[] = turnosOrd.map((comp) => ({ tipo: "turno", comp }));
    const r: LinhaCalendarioDia[] = reunioesAgendaDoDia(iso).map((item) => ({ tipo: "reuniao", item }));
    const tr: LinhaCalendarioDia[] = treinamentosAgendaDoDia(iso).map((item) => ({ tipo: "treinamento", item }));
    const fb: LinhaCalendarioDia[] = feedbackAgendaDoDia(iso).map((item) => ({ tipo: "feedback", item }));

    if (chavesFiltroCompromissos.length === 0) {
      return [...r, ...tr, ...fb, ...turnLinhas];
    }
    const out: LinhaCalendarioDia[] = [];
    for (const k of ORDEM_CHAVE_FILTRO_NA_LISTA) {
      if (!chavesFiltroCompromissos.includes(k)) continue;
      if (k === "reunioes") out.push(...r);
      else if (k === "treinamentos") out.push(...tr);
      else if (k === "feedback") out.push(...fb);
      else if (k === "turnos") out.push(...turnLinhas);
    }
    return out;
  }

  function contagemItensCalendarioNoDia(date: Date): number {
    const iso = toISO(date);
    const turnos = compromissosPorDiaIso.get(iso) ?? [];
    const r = reunioesAgendaDoDia(iso);
    const tr = treinamentosAgendaDoDia(iso);
    const fb = feedbackAgendaDoDia(iso);
    if (chavesFiltroCompromissos.length === 0) {
      return turnos.length + r.length + tr.length + fb.length;
    }
    let n = 0;
    if (chavesFiltroCompromissos.includes("reunioes")) n += r.length;
    if (chavesFiltroCompromissos.includes("treinamentos")) n += tr.length;
    if (chavesFiltroCompromissos.includes("feedback")) n += fb.length;
    if (chavesFiltroCompromissos.includes("turnos")) n += turnos.length;
    return n;
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
    const d = new Date(current);
    d.setMonth(d.getMonth() + 1);
    setCurrent(d);
  }

  function headerTitle() {
    return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  }

  function dayStyle(date: Date, todayISO: string): React.CSSProperties {
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

  const card: React.CSSProperties = {
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
    linha: Extract<LinhaCalendarioDia, { tipo: "reuniao" } | { tipo: "treinamento" } | { tipo: "feedback" }>;
  }) {
    const { tipo, item } = linha;
    const etiqueta = tipo === "reuniao" ? "Reunião" : tipo === "treinamento" ? "Treinamento" : "Feedback";
    const Icon = tipo === "reuniao" ? Users : tipo === "treinamento" ? BookOpen : MessageSquare;
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
          background: isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)",
          border: `1px solid rgba(245,158,11,0.35)`,
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.2,
        }}
      >
        <Icon size={11} color="#f59e0b" aria-hidden="true" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", fontFamily: FONT.body, flexShrink: 0 }}>{etiqueta}</span>
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

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const showTimeFilter = !soPropriosCal && timeMultiselectItems.length > 0;
  const showStaffFilter = !soPropriosCal && staffMultiselectItems.length > 0;
  const hasStaffFilter = filterStaffIds.length > 0;
  const hasTimeFilter = filterTimeIds.length > 0;
  const mostrarBotaoMeuCalendario =
    !perm.loading && perm.canView === "sim" && Boolean(meuPrestadorRhIdVistaCompleta);
  const calendarioSoMeuAtivo =
    Boolean(meuPrestadorRhIdVistaCompleta) &&
    filterStaffIds.length === 1 &&
    filterStaffIds[0] === meuPrestadorRhIdVistaCompleta;
  const podeRetrocederMes = podeRetrocederMesCalendario(current);

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<CalendarRange size={14} aria-hidden="true" />}
        title="Calendário"
        subtitle={
          soPropriosCal
            ? "Apenas as suas escalas (turno Manhã, Tarde, Noite ou Comercial), conforme a Gestão de Escala."
            : "Grelha mensal — clique num dia para ver compromissos e ofertas. Turnos vêm da Gestão de Escala; reuniões, treinamentos e feedback serão integrados em breve."
        }
        brand={brand}
        t={t}
      />

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
              <button type="button" onClick={next} style={btnNav} aria-label="Próximo mês">
                <ChevronRight size={14} aria-hidden="true" />
              </button>

              {loadingEscala && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
                Atualizando escala…
              </span>
            )}

            {loadingStaff ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>
                <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="var(--brand-primary, #7c3aed)" />
                {soPropriosCal ? "Carregando…" : "Carregando staff…"}
              </span>
            ) : erroStaff ? (
              <span style={{ color: BRAND.vermelho, fontSize: 12, fontFamily: FONT.body }}>{erroStaff}</span>
            ) : (
              <>
                {showTimeFilter ? (
                  <InfluencerMultiSelect
                    selected={filterTimeIds}
                    onChange={setFilterTimeIds}
                    influencers={timeMultiselectItems}
                    t={t}
                    triggerEmptyLabel="Time"
                    ariaFilterPrefix="Filtrar por time"
                    listboxAriaLabel="Selecionar time"
                  />
                ) : null}
                {showStaffFilter ? (
                  <InfluencerMultiSelect
                    selected={filterStaffIds}
                    onChange={setFilterStaffIds}
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
                        setFilterStaffIds([]);
                      } else {
                        setFilterTimeIds([]);
                        setFilterStaffIds([meuPrestadorRhIdVistaCompleta!]);
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

            <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setModalAcaoAberto(true)}
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
                aria-label="Abrir ações"
              >
                Ação
              </button>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filtrar compromissos por tipo. Sem nenhum botão ativo, mostra todos."
            style={{
              paddingTop: 12,
              marginTop: 12,
              borderTop: `1px solid ${t.cardBorder}`,
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                maxWidth: "100%",
              }}
            >
              {COMPROMISSOS_FILTRO_BOTOES.map(({ chave, label }) => {
                const ativo = chavesFiltroCompromissos.includes(chave);
                const accent = brand.accent;
                return (
                  <button
                    key={chave}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      setChavesFiltroCompromissos((prev) =>
                        prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave],
                      );
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      border: `1px solid ${ativo ? accent : t.cardBorder}`,
                      background: ativo
                        ? accent.startsWith("var(")
                          ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 18%, transparent)"
                          : `${String(accent)}28`
                        : "transparent",
                      color: ativo ? accent : t.text,
                      fontSize: 13,
                      fontWeight: ativo ? 700 : 500,
                      fontFamily: FONT.body,
                      cursor: "pointer",
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {(hasStaffFilter || hasTimeFilter) && (
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
                  setFilterTimeIds([]);
                  setFilterStaffIds([]);
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
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>Reuniões</div>
                {reunioesAgendaDoDia(toISO(modalDia)).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                    {reunioesAgendaDoDia(toISO(modalDia)).map((x) => (
                      <li key={x.id}>{x.titulo}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>Treinamentos</div>
                {treinamentosAgendaDoDia(toISO(modalDia)).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                    {treinamentosAgendaDoDia(toISO(modalDia)).map((x) => (
                      <li key={x.id}>{x.titulo}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>Feedback</div>
                {feedbackAgendaDoDia(toISO(modalDia)).length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontFamily: FONT.body, fontSize: 13, color: t.text }}>
                    {feedbackAgendaDoDia(toISO(modalDia)).map((x) => (
                      <li key={x.id}>{x.titulo}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>Turnos</div>
                {turnosAgendadosNoDia(modalDia).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
                    {turnosAgendadosNoDia(modalDia).map((comp) => (
                      <EscalaCompromissoChip
                        key={`${comp.prestadorId}-${comp.turno}`}
                        comp={comp}
                        subtituloModal={horarioSubtituloParaCompromissoCal(comp)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
                )}
              </div>
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

      {modalAcaoAberto &&
        (soPropriosCal && meuRhFuncionarioId && prestadores[0] ? (
          <ModalAcaoCalendario
            open={modalAcaoAberto}
            onClose={() => setModalAcaoAberto(false)}
            t={t}
            brand={brand}
            refMes={current}
            meuFuncionario={prestadores[0]}
            meuFuncionarioId={meuRhFuncionarioId}
            gradeValorPorDiaIso={gradeValorPorDiaIso}
            operadoraTurnos={(() => {
              const slug = (prestadores[0]?.staff_operadora_slug ?? "").trim();
              return slug ? mapOpTurnos.get(slug) ?? null : null;
            })()}
          />
        ) : (
          <ModalBase maxWidth={440} onClose={() => setModalAcaoAberto(false)} zIndex={1150}>
            <ModalHeader title="Ação" onClose={() => setModalAcaoAberto(false)} />
            <p style={{ margin: 0, color: t.textMuted, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.5 }}>
              As ações do calendário (venda de folga ou turno, trocas e agendamento de reunião) estão disponíveis na vista do seu próprio calendário enquanto prestador.
            </p>
          </ModalBase>
        ))}
    </div>
  );
}
