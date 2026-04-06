import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { verificarElegibilidadeAgendaLive } from "../../../lib/influencerAgendaGate";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { Live } from "../../../types";
import ModalLive from "./ModalLive";
import ModalBloqueioAgendaLive from "./ModalBloqueioAgendaLive";
import InfluencerMultiSelect from "../../../components/InfluencerMultiSelect";
import { PlatLogo } from "../../../components/PlatLogo";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Loader2, Clock, Link2 } from "lucide-react";
import {
  GiFilmProjector, GiCalendar, GiShield,
} from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
} as const;

import { PLAT_COLOR } from "../../../constants/platforms";

// ─── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  agendada:      BRAND.azul,
  realizada:     BRAND.verde,
  nao_realizada: BRAND.vermelho,
};

const STATUS_LABEL: Record<string, string> = {
  agendada:      "Agendada",
  realizada:     "Realizada",
  nao_realizada: "Não Realizada",
};

// ─── CALENDÁRIO ───────────────────────────────────────────────────────────────
type ViewMode = "mes" | "semana" | "dia";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

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

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── SINGLE DROPDOWN (Visualização) ──────────────────────────────────────────
interface SingleDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  t: any;
}

function SingleDropdown({ value, options, onChange, icon, t, accent }: SingleDropdownProps & { accent?: string }) {
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

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 14px", borderRadius: 999,
          border: `1px solid ${accentColor}`,
          background: accentColor.startsWith("var(") ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${accentColor}22`,
          color: accentColor,
          fontSize: 13, fontWeight: 600, fontFamily: FONT.body,
          cursor: "pointer", outline: "none",
          display: "flex", alignItems: "center", gap: 6,
          whiteSpace: "nowrap" as const,
        }}
      >
        {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
        {current?.label}
        {open ? <ChevronUp size={9} style={{ opacity: 0.7 }} aria-hidden="true" /> : <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: 12, padding: 8, minWidth: 130,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "none",
                  background: selected ? (accentColor.startsWith("var(") ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${accentColor}22`) : "transparent",
                  color: selected ? accentColor : t.text,
                  fontSize: 12, fontFamily: FONT.body,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8,
                  fontWeight: selected ? 700 : 400,
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${selected ? accentColor : t.cardBorder}`,
                  background: selected ? accentColor : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "#fff",
                }}>
                  {selected ? "●" : ""}
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Agenda() {
  const { theme: t, isDark, user, setActivePage } = useApp();
  const brand = useDashboardBrand();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis: _escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("agenda");

  const [view,    setView]    = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(new Date());
  const [lives,   setLives]   = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; live?: Live }>({ open: false });
  const [bloqueioNovaLive, setBloqueioNovaLive] = useState<{
    perfilIncompleto: boolean;
    faltaPlaybook: boolean;
  } | null>(null);
  const [checandoNovaLive, setChecandoNovaLive] = useState(false);

  const [filterStatus,      setFilterStatus]      = useState<string | null>(null);
  const [filterPlat,        setFilterPlat]        = useState<string | null>(null);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [influencerList,    setInfluencerList]    = useState<{ id: string; name: string }[]>([]);
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);

  const hasActiveFilters = filterStatus !== null || filterPlat !== null || filterInfluencers.length > 0 || filterOperadora !== "todas";

  const influencerListVisiveis = useMemo(
    () => influencerList.filter((i) => podeVerInfluencer(i.id)),
    [influencerList, podeVerInfluencer]
  );
  async function loadLives() {
    setLoading(true);
    let q = supabase.from("lives").select("*, profiles!lives_influencer_id_fkey(name)").order("data", { ascending: true }).order("horario", { ascending: true });
    if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
    const { data, error } = await q;
    if (!error && data) {
      const mapped = data.map((l: any) => ({ ...l, influencer_name: l.profiles?.name }));
      setLives(mapped.filter((l: Live) => podeVerInfluencer(l.influencer_id)));
    }
    setLoading(false);
  }

  useEffect(() => { loadLives(); }, [podeVerInfluencer, operadoraSlugsForcado]);

  useEffect(() => {
    if (showFiltroInfluencer || showFiltroOperadora) {
      Promise.all([
        showFiltroInfluencer ? supabase.from("profiles").select("id, name").eq("role", "influencer").order("name") : Promise.resolve({ data: [] }),
        showFiltroOperadora  ? supabase.from("operadoras").select("slug, nome").order("nome") : Promise.resolve({ data: [] }),
      ]).then(([profRes, opsRes]) => {
        if (showFiltroInfluencer && profRes.data) setInfluencerList(profRes.data);
        if (showFiltroOperadora)  setOperadorasList((opsRes.data ?? []) as { slug: string; nome: string }[]);
      });
    }
  }, [showFiltroInfluencer, showFiltroOperadora]);

  const operadoraEfetiva = operadoraSlugsForcado ?? (filterOperadora !== "todas" ? [filterOperadora] : null);
  function livesForDay(date: Date): Live[] {
    const iso = toISO(date);
    return lives.filter(l => {
      if (l.data !== iso) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterPlat   && l.plataforma !== filterPlat) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(l.influencer_id)) return false;
      if (operadoraEfetiva && (!l.operadora_slug || !operadoraEfetiva.includes(l.operadora_slug))) return false;
      return true;
    });
  }

  function prev() {
    const d = new Date(current);
    if (view === "mes")    d.setMonth(d.getMonth() - 1);
    if (view === "semana") d.setDate(d.getDate() - 7);
    if (view === "dia")    d.setDate(d.getDate() - 1);
    setCurrent(d);
  }
  function next() {
    const d = new Date(current);
    if (view === "mes")    d.setMonth(d.getMonth() + 1);
    if (view === "semana") d.setDate(d.getDate() + 7);
    if (view === "dia")    d.setDate(d.getDate() + 1);
    setCurrent(d);
  }
  function goToday() { setCurrent(new Date()); }

  function headerTitle() {
    if (view === "mes")    return `${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "semana") {
      const w = getWeekDays(current);
      return `${w[0].getDate()} – ${w[6].getDate()} ${MONTHS[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${current.getDate()} ${MONTHS[current.getMonth()]} ${current.getFullYear()}`;
  }

  // ── Estilos de dia por estado ────────────────────────────────────────────────
  function dayStyle(date: Date, todayISO: string): React.CSSProperties {
    const iso = toISO(date);
    if (iso === todayISO) return {
      border: `1.5px solid ${BRAND.azul}55`,
      background: isDark ? "rgba(30,54,248,0.10)" : "rgba(30,54,248,0.06)",
    };
    if (iso < todayISO) return {
      border: `1.5px solid rgba(232,64,37,0.22)`,
      background: isDark ? "rgba(232,64,37,0.07)" : "rgba(232,64,37,0.04)",
    };
    return {
      border: `1.5px solid rgba(34,197,94,0.22)`,
      background: isDark ? "rgba(34,197,94,0.07)" : "rgba(34,197,94,0.04)",
    };
  }

  function dayNumberColor(date: Date, todayISO: string) {
    const iso = toISO(date);
    if (iso === todayISO) return BRAND.azul;
    if (iso < todayISO)   return isDark ? "rgba(232,64,37,0.65)"  : "rgba(232,64,37,0.75)";
    return                       isDark ? "rgba(34,197,94,0.75)"  : "rgba(34,197,94,0.85)";
  }

  const card: React.CSSProperties = {
    background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 20,
  };

  const btnNav: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const chipBase = (active: boolean, color = BRAND.roxoVivo): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 999, fontSize: 13,
    cursor: "pointer", border: `1px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : "transparent",
    color: active ? color : t.textMuted,
    fontFamily: FONT.body, fontWeight: active ? 700 : 400,
    transition: "all 0.15s",
    display: "flex", alignItems: "center", gap: 6,
  });

  // ── Chip de live no calendário ───────────────────────────────────────────────
  function LiveChip({ live }: { live: Live }) {
    return (
      <button
        type="button"
        onClick={() => setModal({ open: true, live })}
        aria-label={`${live.horario.slice(0, 5)} · ${live.influencer_name ?? live.plataforma} — ${STATUS_LABEL[live.status]}`}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 8px", borderRadius: 8, cursor: "pointer",
          background: `${PLAT_COLOR[live.plataforma]}22`,
          border: `1px solid ${PLAT_COLOR[live.plataforma]}44`,
          marginBottom: 4,
          width: "100%",
          textAlign: "left",
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: STATUS_COLOR[live.status], flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {live.horario.slice(0, 5)}{live.influencer_name ? ` · ${live.influencer_name}` : ""}
        </span>
      </button>
    );
  }

  // ── View Mês ─────────────────────────────────────────────────────────────────
  function ViewMes() {
    const cells    = getMonthDays(current.getFullYear(), current.getMonth());
    const todayISO = toISO(new Date());
    return (
      <div className="app-agenda-cal-scroll">
        <div className="app-agenda-cal-scroll-inner">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: t.textMuted, padding: "8px 0", fontFamily: FONT.body }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(140px, auto)", gap: 4 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const dayLives = livesForDay(date);
            return (
              <div
                key={i}
                onClick={() => { setCurrent(date); setView("dia"); }}
                style={{
                  minHeight: 140, padding: 8, borderRadius: 10, cursor: "pointer",
                  display: "flex", flexDirection: "column", overflow: "hidden",
                  boxSizing: "border-box", transition: "background 0.15s",
                  ...dayStyle(date, todayISO),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: toISO(date) === todayISO ? 700 : 400, color: dayNumberColor(date, todayISO), fontFamily: FONT.body }}>
                    {date.getDate()}
                  </span>
                  {dayLives.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: brand.accent, borderRadius: 10, padding: "1px 6px", fontFamily: FONT.body }}>
                      {dayLives.length}
                    </span>
                  )}
                </div>
                <div className="agenda-day-scroll" style={{ marginTop: 4, flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {dayLives.slice(0, 8).map(l => <LiveChip key={l.id} live={l} />)}
                  {dayLives.length > 8 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrent(date);
                        setView("dia");
                      }}
                      aria-label={`Ver mais ${dayLives.length - 8} lives`}
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
                      +{dayLives.length - 8} mais
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

  // ── View Semana ──────────────────────────────────────────────────────────────
  function ViewSemana() {
    const week     = getWeekDays(current);
    const todayISO = toISO(new Date());
    return (
      <div className="app-agenda-cal-scroll">
        <div className="app-agenda-cal-scroll-inner">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {week.map((date, i) => {
          const dayLives = livesForDay(date);
          return (
            <div key={i} style={{ borderRadius: 12, padding: "10px 8px", minHeight: 200, ...dayStyle(date, todayISO) }}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{DAYS[date.getDay()]}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: dayNumberColor(date, todayISO), fontFamily: FONT_TITLE }}>
                  {date.getDate()}
                </div>
                {dayLives.length > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: brand.accent, borderRadius: 10, padding: "1px 8px", display: "inline-block", fontFamily: FONT.body, marginTop: 2 }}>
                    {dayLives.length} live{dayLives.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
              {dayLives.map(l => <LiveChip key={l.id} live={l} />)}
              {dayLives.length === 0 && (
                <div style={{ fontSize: 11, color: t.textMuted, textAlign: "center", marginTop: 12, fontFamily: FONT.body }}>—</div>
              )}
            </div>
          );
        })}
      </div>
        </div>
      </div>
    );
  }

  // ── View Dia ─────────────────────────────────────────────────────────────────
  function ViewDia() {
    const dayLives = livesForDay(current);
    const todayISO = toISO(new Date());
    const isToday  = toISO(current) === todayISO;

    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: isToday ? BRAND.azul : t.text, fontFamily: FONT_TITLE }}>
            {current.getDate()}
          </span>
          <span style={{ fontSize: 16, color: t.textMuted, marginLeft: 8, fontFamily: FONT.body }}>
            {DAYS[current.getDay()]}
          </span>
          {dayLives.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: brand.accent, borderRadius: 12, padding: "2px 10px", marginLeft: 10, fontFamily: FONT.body }}>
              {dayLives.length} live{dayLives.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {dayLives.length === 0 ? (
          <div style={{ textAlign: "center", color: t.textMuted, fontSize: 14, padding: "40px 0", fontFamily: FONT.body }}>
            Nenhuma live agendada para este dia.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {dayLives.map(l => (
              <div
                key={l.id}
                onClick={() => setModal({ open: true, live: l })}
                style={{
                  padding: 16, borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${PLAT_COLOR[l.plataforma]}44`,
                  background: `${PLAT_COLOR[l.plataforma]}0d`,
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                {/* Ícone da plataforma — logo SVG oficial */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: `${PLAT_COLOR[l.plataforma]}22`,
                  border: `1.5px solid ${PLAT_COLOR[l.plataforma]}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <PlatLogo plataforma={l.plataforma} size={22} isDark={isDark ?? false} />
                </div>

                <div style={{ flex: 1 }}>
                  {l.influencer_name && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>
                      {l.influencer_name}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Badge plataforma */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, background: `${PLAT_COLOR[l.plataforma]}22`,
                      color: PLAT_COLOR[l.plataforma], padding: "3px 9px",
                      borderRadius: 20, fontFamily: FONT.body, fontWeight: 600,
                    }}>
                      <PlatLogo plataforma={l.plataforma} size={11} isDark={isDark ?? false} />
                      {l.plataforma}
                    </span>
                    {/* Badge status */}
                    <span style={{
                      fontSize: 11, background: `${STATUS_COLOR[l.status]}22`,
                      color: STATUS_COLOR[l.status], padding: "3px 9px",
                      borderRadius: 20, fontFamily: FONT.body, fontWeight: 600,
                      border: `1px solid ${STATUS_COLOR[l.status]}44`,
                    }}>
                      {STATUS_LABEL[l.status]}
                    </span>
                    {/* Horário */}
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} aria-hidden="true" />
                      {l.horario.slice(0, 5)}
                    </span>
                  </div>
                  {l.link && (
                    <a
                      href={l.link.startsWith("http") ? l.link : `https://${l.link}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: BRAND.azul, fontFamily: FONT.body, textDecoration: "none", wordBreak: "break-all" }}
                    >
                      <Link2 size={11} aria-hidden="true" />
                      {l.link}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const VIEW_OPTIONS = [
    { value: "mes",    label: "Mês"    },
    { value: "semana", label: "Semana" },
    { value: "dia",    label: "Dia"    },
  ];

  async function tentarAbrirNovaLive() {
    if (!user) return;
    if (user.role === "influencer") {
      setChecandoNovaLive(true);
      try {
        const gate = await verificarElegibilidadeAgendaLive(user.id);
        if (gate.perfilIncompleto || gate.faltaPlaybook) {
          setBloqueioNovaLive(gate);
          return;
        }
      } finally {
        setChecandoNovaLive(false);
      }
    }
    setModal({ open: true });
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a agenda de lives.
      </div>
    );
  }

  return (
    <div className="app-page-shell">

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        {/* Título — cor primária */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: brand.primaryIconBg,
            border: brand.primaryIconBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: brand.primaryIconColor, flexShrink: 0,
          }}>
            <GiFilmProjector size={16} />
          </span>
          <h1 style={{
            fontSize: 18, fontWeight: 800, color: brand.primary,
            fontFamily: FONT_TITLE, margin: 0,
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            Agenda de Lives
          </h1>
        </div>

        {/* Botão Nova Live — cor accent */}
        {perm.canCriarOk && (
          <button
            type="button"
            onClick={() => void tentarAbrirNovaLive()}
            disabled={checandoNovaLive}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 10, border: "none",
              cursor: checandoNovaLive ? "not-allowed" : "pointer",
              opacity: checandoNovaLive ? 0.75 : 1,
              background: brand.useBrand ? "var(--brand-accent)" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
            }}
          >
            <GiFilmProjector size={14} />
            {checandoNovaLive ? "Verificando..." : "+ Nova Live"}
          </button>
        )}
      </div>

      {/* ── BLOCO DE FILTROS (padrão Dashboards) ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          {/* Linha principal — centralizada */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={prev} style={btnNav} aria-label="Período anterior">
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {headerTitle()}
            </span>
            <button type="button" onClick={next} style={btnNav} aria-label="Próximo período">
              <ChevronRight size={14} />
            </button>

            <button onClick={goToday} style={chipBase(false)}>Hoje</button>

            <SingleDropdown
              value={view}
              options={VIEW_OPTIONS}
              onChange={v => setView(v as ViewMode)}
              icon={<GiCalendar size={13} />}
              t={t}
              accent={brand.accent}
            />

            {showFiltroInfluencer && influencerListVisiveis.length > 0 && (
              <InfluencerMultiSelect
                selected={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerListVisiveis}
                t={t}
              />
            )}

            {showFiltroOperadora && operadorasList.length > 0 && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={13} />
                </span>
                <select
                  value={filterOperadora}
                  onChange={(e) => setFilterOperadora(e.target.value)}
                  style={{
                    padding: "6px 14px 6px 30px", borderRadius: 999,
                    border: `1px solid ${filterOperadora !== "todas" ? brand.accent : t.cardBorder}`,
                    background: filterOperadora !== "todas" ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}18`) : (t.inputBg ?? t.cardBg),
                    color: filterOperadora !== "todas" ? brand.accent : t.textMuted,
                    fontSize: 13, fontWeight: filterOperadora !== "todas" ? 700 : 400,
                    fontFamily: FONT.body, cursor: "pointer", outline: "none", appearance: "none",
                  }}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Status e Plataforma */}
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Status</span>
              {Object.entries(STATUS_COLOR).map(([status, color]) => {
                const active = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(prev => prev === status ? null : status)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : "transparent",
                      color: active ? color : t.textMuted, fontSize: 12, fontWeight: active ? 700 : 400,
                      fontFamily: FONT.body, transition: "all 0.15s",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    {STATUS_LABEL[status]}
                    {active && <X size={9} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>Plataforma</span>
              {Object.entries(PLAT_COLOR).map(([plat, color]) => {
                const active = filterPlat === plat;
                return (
                  <button
                    key={plat}
                    onClick={() => setFilterPlat(prev => prev === plat ? null : plat)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : `${color}11`,
                      color: active ? color : color + "cc",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      fontFamily: FONT.body, transition: "all 0.15s",
                    }}
                  >
                    <PlatLogo plataforma={plat} size={13} isDark={isDark ?? false} />
                    {plat}
                    {active && <X size={9} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setFilterStatus(null); setFilterPlat(null); setFilterInfluencers([]); setFilterOperadora("todas"); }}
                style={{
                  padding: "5px 14px", borderRadius: 999,
                  border: `1px solid ${BRAND.vermelho}44`,
                  background: `${BRAND.vermelho}11`,
                  color: BRAND.vermelho, fontSize: 12, fontWeight: 600,
                  fontFamily: FONT.body, cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <X size={12} aria-hidden="true" /> Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CALENDÁRIO ── */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 size={16} className="app-lucide-spin" aria-hidden="true" />
            Carregando...
          </div>
        ) : (
          view === "mes" ? <ViewMes /> : view === "semana" ? <ViewSemana /> : <ViewDia />
        )}
      </div>

      {/* ── MODAL ── */}
      {modal.open && (
        <ModalLive
          live={modal.live}
          onClose={() => setModal({ open: false })}
          onSave={() => { setModal({ open: false }); loadLives(); }}
        />
      )}

      <ModalBloqueioAgendaLive
        open={bloqueioNovaLive !== null}
        onClose={() => setBloqueioNovaLive(null)}
        perfilIncompleto={bloqueioNovaLive?.perfilIncompleto ?? false}
        faltaPlaybook={bloqueioNovaLive?.faltaPlaybook ?? false}
        segundaPessoa
        onIrInfluencers={() => {
          setBloqueioNovaLive(null);
          setActivePage("influencers");
        }}
        onIrPlaybook={() => {
          setBloqueioNovaLive(null);
          setActivePage("playbook_influencers");
        }}
      />
    </div>
  );
}
