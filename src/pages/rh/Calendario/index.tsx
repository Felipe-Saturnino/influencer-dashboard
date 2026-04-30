import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
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

type ViewMode = "mes" | "semana" | "dia";

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

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Dia" },
];

/** Carrossel de período: mês inicial ao abrir a página (1 de abril de 2026). */
function dataInicialCarrosselCalendarioRh(): Date {
  return new Date(2026, 3, 1);
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
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

function refMesPrimeiroDiaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function mesesRefISOEntre(inicio: Date, fim: Date): string[] {
  const keys = new Set<string>();
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const lim = new Date(fim.getFullYear(), fim.getMonth(), 1);
  const c = new Date(cur);
  while (c <= lim) {
    keys.add(refMesPrimeiroDiaISO(c));
    c.setMonth(c.getMonth() + 1);
  }
  return [...keys];
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

/** Valores de célula «Escalado» na Gestão de Escala (siglas ou Comercial). */
function turnoExibicaoDeValorCelulaEscala(valor: string): string | null {
  const v = (valor ?? "").trim();
  if (v === "Comercial") return "Comercial";
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
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  t: SingleDropdownTheme;
  accent?: string;
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
        aria-label={`Modo de visualização: ${current?.label ?? value}`}
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

  const [view, setView] = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(() => dataInicialCarrosselCalendarioRh());

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

  const mesesRefISOConsulta = useMemo(() => {
    if (view === "mes") return [refMesPrimeiroDiaISO(current)];
    if (view === "semana") {
      const w = getWeekDays(current);
      return mesesRefISOEntre(w[0]!, w[6]!);
    }
    return [refMesPrimeiroDiaISO(current)];
  }, [view, current]);

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

  function compromissosNoDia(date: Date): CompromissoEscalaCal[] {
    return compromissosPorDiaIso.get(toISO(date)) ?? [];
  }

  function prev() {
    const d = new Date(current);
    if (view === "mes") d.setMonth(d.getMonth() - 1);
    if (view === "semana") d.setDate(d.getDate() - 7);
    if (view === "dia") d.setDate(d.getDate() - 1);
    setCurrent(d);
  }
  function next() {
    const d = new Date(current);
    if (view === "mes") d.setMonth(d.getMonth() + 1);
    if (view === "semana") d.setDate(d.getDate() + 7);
    if (view === "dia") d.setDate(d.getDate() + 1);
    setCurrent(d);
  }
  function goToday() {
    setCurrent(new Date());
  }

  function headerTitle() {
    if (view === "mes") return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "semana") {
      const w = getWeekDays(current);
      return `${w[0].getDate()} – ${w[6].getDate()} ${MONTHS[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${current.getDate()} ${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
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

  const DEFAULT_CHIP_COLOR = "var(--brand-action, #7c3aed)";
  function chipActiveBg(color: string): string {
    if (color.startsWith("var(")) return `color-mix(in srgb, ${color} 14%, transparent)`;
    return `${color}22`;
  }

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

  const chipBase = (active: boolean, color: string = DEFAULT_CHIP_COLOR): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 13,
    cursor: "pointer",
    border: `1px solid ${active ? color : t.cardBorder}`,
    background: active ? chipActiveBg(color) : "transparent",
    color: active ? color : t.textMuted,
    fontFamily: FONT.body,
    fontWeight: active ? 700 : 400,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 6,
    lineHeight: 1,
  });

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
              const lista = compromissosNoDia(date);
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 140,
                    padding: 8,
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxSizing: "border-box",
                    transition: "background 0.15s",
                    ...dayStyle(date, todayISO),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(date);
                      setView("dia");
                    }}
                    aria-label={`Ver dia ${date.getDate()} de ${MONTHS[date.getMonth()]}`}
                    style={{
                      all: "unset",
                      cursor: "pointer",
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
                    {lista.length > 0 && (
                      <span
                        aria-label={`${lista.length} compromisso${lista.length > 1 ? "s" : ""} de escala neste dia`}
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
                        {lista.length}
                      </span>
                    )}
                  </button>
                  <div className="agenda-day-scroll" style={{ marginTop: 4, flex: 1, minHeight: 0, overflowY: "auto" }} role="list" aria-label="Escalas do dia">
                    {lista.slice(0, MAX_CHIPS_COMPROMISSOS_DIA).map((comp) => (
                      <EscalaCompromissoChip key={`${comp.prestadorId}-${comp.turno}`} comp={comp} />
                    ))}
                    {lista.length > MAX_CHIPS_COMPROMISSOS_DIA && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrent(date);
                          setView("dia");
                        }}
                        aria-label={`Ver mais ${lista.length - MAX_CHIPS_COMPROMISSOS_DIA} compromissos de escala`}
                        style={{
                          fontSize: 11,
                          color: t.textMuted,
                          fontFamily: FONT.body,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                      >
                        +{lista.length - MAX_CHIPS_COMPROMISSOS_DIA} mais
                      </button>
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

  function ViewSemana() {
    const week = getWeekDays(current);
    const todayISO = toISO(new Date());
    return (
      <div className="app-agenda-cal-scroll">
        <div className="app-agenda-cal-scroll-inner">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {week.map((date, i) => {
              const lista = compromissosNoDia(date);
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 12,
                    padding: "10px 8px",
                    minHeight: 200,
                    display: "flex",
                    flexDirection: "column",
                    ...dayStyle(date, todayISO),
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: 8, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{DAYS[date.getDay()]}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrent(date);
                        setView("dia");
                      }}
                      aria-label={`Ver dia ${date.getDate()} em modo dia`}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: dayNumberColor(date, todayISO),
                          fontFamily: FONT_TITLE,
                        }}
                      >
                        {date.getDate()}
                      </div>
                    </button>
                    {lista.length > 0 && (
                      <div
                        aria-label={`${lista.length} compromisso${lista.length > 1 ? "s" : ""} de escala neste dia`}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#fff",
                          background: brand.accent,
                          borderRadius: 10,
                          padding: "1px 8px",
                          display: "inline-block",
                          fontFamily: FONT.body,
                          marginTop: 2,
                        }}
                      >
                        {lista.length} escala{lista.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginTop: 6 }} role="list" aria-label="Escalas da semana">
                    {lista.map((comp) => (
                      <EscalaCompromissoChip key={`${comp.prestadorId}-${comp.turno}`} comp={comp} />
                    ))}
                    {lista.length === 0 && (
                      <div style={{ fontSize: 11, color: t.textMuted, textAlign: "center", marginTop: 8, fontFamily: FONT.body }}>—</div>
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

  function ViewDia() {
    const todayISO = toISO(new Date());
    const isToday = toISO(current) === todayISO;
    const lista = compromissosNoDia(current);

    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: isToday ? BRAND.azul : t.text, fontFamily: FONT_TITLE }}>
            {current.getDate()}
          </span>
          <span style={{ fontSize: 16, color: t.textMuted, marginLeft: 8, fontFamily: FONT.body }}>{DAYS[current.getDay()]}</span>
          {lista.length > 0 && (
            <span
              aria-label={`${lista.length} compromisso${lista.length > 1 ? "s" : ""} de escala neste dia`}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: brand.accent,
                borderRadius: 12,
                padding: "2px 10px",
                marginLeft: 10,
                fontFamily: FONT.body,
              }}
            >
              {lista.length} escala{lista.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {lista.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            Nenhuma escala neste dia.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, margin: "0 auto" }} role="list" aria-label="Compromissos de escala do dia">
            {lista.map((comp) => (
              <EscalaCompromissoChip key={`${comp.prestadorId}-${comp.turno}`} comp={comp} />
            ))}
          </div>
        )}
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

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader
        icon={<CalendarRange size={14} aria-hidden="true" />}
        title="Calendário"
        subtitle={
          soPropriosCal
            ? "Apenas as suas escalas (turno Manhã, Tarde, Noite ou Comercial), conforme a Gestão de Escala."
            : "Visão por período do time — escalas da Gestão de Escala (turno Manhã, Tarde, Noite ou Comercial) aparecem como compromissos nos dias correspondentes."
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={prev} style={btnNav} aria-label="Período anterior">
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
            <button type="button" onClick={next} style={btnNav} aria-label="Próximo período">
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <button type="button" onClick={goToday} style={chipBase(false)}>
              Hoje
            </button>

            <SingleDropdown
              value={view}
              options={VIEW_OPTIONS}
              onChange={(v) => setView(v as ViewMode)}
              icon={<CalendarDays size={13} aria-hidden="true" />}
              t={t}
              accent={brand.accent}
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
          view === "mes" ? <ViewMes /> : view === "semana" ? <ViewSemana /> : <ViewDia />
        )}
      </div>
    </div>
  );
}
