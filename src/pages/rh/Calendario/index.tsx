import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  LayoutList,
  Loader2,
  X,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { RhFuncionario } from "../../../types/rhFuncionario";
import { siglaGradeParaNomeTurno } from "../../../lib/rhEscalaTurnos";
import { DashboardPageHeader } from "../../../components/dashboard";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { ModalBase, ModalHeader } from "../../../components/OperacoesModal";

type FiltroCompromissosCal = "todos" | "turnos" | "reunioes" | "treinamentos" | "feedback";

const COMPROMISSOS_FILTER_OPTIONS: { value: FiltroCompromissosCal; label: string }[] = [
  { value: "todos", label: "Todos os Compromissos" },
  { value: "turnos", label: "Turnos" },
  { value: "reunioes", label: "Reuniões" },
  { value: "treinamentos", label: "Treinamentos" },
  { value: "feedback", label: "Feedback" },
];

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

type CompromissoEscalaCal = {
  prestadorId: string;
  nome: string;
  turno: string;
};

/** Compromissos não-turno (futuro: API); hoje lista vazia por dia. */
type CompromissoAgendaExtra = { id: string; titulo: string };

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

/** Rótulo no Calendário para o valor gravado na grade (Gestão de Escala). */
function turnoExibicaoDeValorCelulaEscala(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (v === "Comercial") return "Comercial";
  if (v === "Folga") return "Folga";
  if (v === "Compra" || v === "Venda" || v === "Troca") return v;
  const nome = siglaGradeParaNomeTurno(v);
  return nome || null;
}

interface SingleDropdownTheme {
  cardBg: string;
  cardBorder: string;
  text: string;
}

function SingleDropdown({
  value,
  options,
  onChange,
  icon,
  t,
  accent,
  triggerAriaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  t: SingleDropdownTheme;
  accent?: string;
  /** Se definido, substitui o texto fixo «Modo de visualização» no aria-label do botão. */
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const accentColor = accent ?? BRAND.roxoVivo;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          triggerAriaLabel
            ? `${triggerAriaLabel}: ${current?.label ?? value}`
            : `Modo de visualização: ${current?.label ?? value}`
        }
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: `1px solid ${accentColor}`,
          background: accentColor.startsWith("var(")
            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
            : `${accentColor}22`,
          color: accentColor,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap" as const,
          lineHeight: 1,
        }}
      >
        {icon && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>{icon}</span>}
        <span style={{ display: "inline-flex", alignItems: "center" }}>{current?.label}</span>
        {open ? (
          <ChevronUp size={9} style={{ opacity: 0.7 }} aria-hidden="true" />
        ) : (
          <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            padding: 8,
            minWidth: 130,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                type="button"
                role="menuitem"
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: selected
                    ? accentColor.startsWith("var(")
                      ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                      : `${accentColor}22`
                    : "transparent",
                  color: selected ? accentColor : t.text,
                  fontSize: 12,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: selected ? 700 : 400,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `1.5px solid ${selected ? accentColor : t.cardBorder}`,
                    background: selected ? accentColor : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected ? <Check size={9} color="#fff" aria-hidden="true" /> : null}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RhCalendarioPage() {
  const { theme: t, isDark, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("rh_calendario");
  const soPropriosCal = !perm.loading && perm.canView === "proprios";

  const [current, setCurrent] = useState(() => dataInicialCarrosselCalendarioRh());
  const [filtroCompromissos, setFiltroCompromissos] = useState<FiltroCompromissosCal>("todos");
  const [modalDia, setModalDia] = useState<Date | null>(null);
  const [modalDiaTab, setModalDiaTab] = useState<"compromissos" | "ofertas">("compromissos");
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
      const em = user.email.trim();
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
        if (!cancelled && cand?.length) {
          row =
            (cand as RhFuncionario[]).find(
              (p) =>
                (p.email ?? "").trim().toLowerCase() === el ||
                (Boolean((p.email_spin ?? "").trim()) && (p.email_spin ?? "").trim().toLowerCase() === el),
            ) ?? null;
        }
      }
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
    if (!perm.loading && perm.canView === "sim") setMeuRhFuncionarioId(null);
  }, [perm.loading, perm.canView]);

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
    return compromissosPorDiaIso.get(toISO(date)) ?? [];
  }

  function compromissosVisiveisNoCalendario(date: Date): CompromissoEscalaCal[] {
    const iso = toISO(date);
    const turnos = compromissosPorDiaIso.get(iso) ?? [];
    if (filtroCompromissos === "todos" || filtroCompromissos === "turnos") return turnos;
    return [];
  }

  function contagemItensCalendarioNoDia(date: Date): number {
    const iso = toISO(date);
    const turnos = compromissosPorDiaIso.get(iso) ?? [];
    const r = reunioesAgendaDoDia(iso);
    const tr = treinamentosAgendaDoDia(iso);
    const fb = feedbackAgendaDoDia(iso);
    switch (filtroCompromissos) {
      case "todos":
        return turnos.length + r.length + tr.length + fb.length;
      case "turnos":
        return turnos.length;
      case "reunioes":
        return r.length;
      case "treinamentos":
        return tr.length;
      case "feedback":
        return fb.length;
      default:
        return turnos.length;
    }
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

  function EscalaCompromissoChip({ comp }: { comp: CompromissoEscalaCal }) {
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
          background: isDark ? "rgba(30,54,248,0.12)" : "rgba(30,54,248,0.08)",
          border: `1px solid ${BRAND.azul}40`,
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.2,
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
              const lista = compromissosVisiveisNoCalendario(date);
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
                    {lista.slice(0, MAX_CHIPS_COMPROMISSOS_DIA).map((comp) => (
                      <EscalaCompromissoChip key={`${comp.prestadorId}-${comp.turno}`} comp={comp} />
                    ))}
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
                aria-label={podeRetrocederMes ? "Mês anterior" : "Primeiro mês: Abril de 2026"}
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

              <SingleDropdown
                value={filtroCompromissos}
                options={COMPROMISSOS_FILTER_OPTIONS}
                onChange={(v) => setFiltroCompromissos(v as FiltroCompromissosCal)}
                icon={<LayoutList size={13} aria-hidden="true" />}
                t={t}
                accent={brand.accent}
                triggerAriaLabel="Filtrar compromissos"
              />

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
                  />
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
                <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, marginBottom: 10, fontFamily: FONT_TITLE }}>Turnos</div>
                {turnosAgendadosNoDia(modalDia).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="list">
                    {turnosAgendadosNoDia(modalDia).map((comp) => (
                      <EscalaCompromissoChip key={`${comp.prestadorId}-${comp.turno}`} comp={comp} />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
                )}
              </div>
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
              <div>
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
            </div>
          ) : (
            <div id="cal-modal-tab-ofertas" role="tabpanel" aria-labelledby="cal-modal-tab-btn-ofertas">
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12, fontFamily: FONT_TITLE }}>
                Ofertas de Troca e Compra
              </div>
              <div style={{ color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>Sem dados para o período selecionado.</div>
            </div>
          )}
        </ModalBase>
      )}

      {modalAcaoAberto && (
        <ModalBase maxWidth={420} onClose={() => setModalAcaoAberto(false)} zIndex={1100}>
          <ModalHeader title="Ação" onClose={() => setModalAcaoAberto(false)} />
          <p style={{ margin: 0, color: t.textMuted, fontSize: 14, fontFamily: FONT.body, lineHeight: 1.5 }}>
            Este fluxo será configurado numa próxima etapa.
          </p>
        </ModalBase>
      )}
    </div>
  );
}
