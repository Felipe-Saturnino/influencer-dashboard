import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live } from "../../../types";
import ModalLive from "./ModalLive";

type ViewMode = "mes" | "semana" | "dia";

const PLAT_COLOR: Record<string, string> = {
  Twitch:    "#9146ff",
  YouTube:   "#ff0000",
  Instagram: "#e1306c",
  TikTok:    "#69c9d0",
  Kick:      "#53fc18",
};

const STATUS_COLOR: Record<string, string> = {
  agendada:      "#1e36f8",
  realizada:     "#27ae60",
  nao_realizada: "#e94025",
};

const STATUS_LABEL: Record<string, string> = {
  agendada:      "Agendada",
  realizada:     "Realizada",
  nao_realizada: "Não Realizada",
};

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

// ── Dropdown single-select (Visualização) ─────────────────────────────────
interface SingleDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: string;
  t: any;
}

function SingleDropdown({ value, options, onChange, icon, t }: SingleDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          padding: "6px 14px", borderRadius: "20px",
          border: `1.5px solid ${BASE_COLORS.purple}`,
          background: `${BASE_COLORS.purple}22`,
          color: BASE_COLORS.purple,
          fontSize: "12px", fontWeight: 600, fontFamily: FONT.body,
          cursor: "pointer", outline: "none",
          display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap" as const,
        }}
      >
        {icon && <span>{icon}</span>}
        {current?.label}
        <span style={{ fontSize: "9px", opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "12px", padding: "8px", minWidth: "130px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {options.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  border: "none",
                  background: selected ? `${BASE_COLORS.purple}22` : "transparent",
                  color: selected ? BASE_COLORS.purple : t.text,
                  fontSize: "12px", fontFamily: FONT.body,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontWeight: selected ? 700 : 400,
                }}
              >
                <span style={{
                  width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${selected ? BASE_COLORS.purple : t.cardBorder}`,
                  background: selected ? BASE_COLORS.purple : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "8px", color: "#fff",
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

// ── Dropdown multi-select (Influencers) ───────────────────────────────────
interface InfluencerMultiSelectProps {
  selected: string[];
  onChange: (v: string[]) => void;
  influencers: { id: string; name: string }[];
  t: any;
}

function InfluencerMultiSelect({ selected, onChange, influencers, t }: InfluencerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter(n => n !== id));
    else onChange([...selected, id]);
  }

  const active = selected.length > 0;
  const label = selected.length === 0
    ? "Influencers"
    : selected.length === 1
      ? (influencers.find(i => i.id === selected[0])?.name ?? "Influencers")
      : `${selected.length} selecionados`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 14px", borderRadius: "20px",
          border: `1.5px solid ${active ? BASE_COLORS.purple : t.cardBorder}`,
          background: active ? `${BASE_COLORS.purple}22` : t.inputBg,
          color: active ? BASE_COLORS.purple : t.textMuted,
          fontSize: "12px", fontWeight: 600, fontFamily: FONT.body,
          cursor: "pointer", outline: "none",
          display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap" as const,
        }}
      >
        👥 {label}
        <span style={{ fontSize: "9px", opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "12px", padding: "8px", minWidth: "190px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          maxHeight: "240px", overflowY: "auto",
        }}>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                width: "100%", padding: "7px 12px", borderRadius: "8px",
                border: "none", background: `${BASE_COLORS.red}11`,
                color: BASE_COLORS.red, fontSize: "11px", fontWeight: 600,
                fontFamily: FONT.body, cursor: "pointer", textAlign: "left",
                marginBottom: "4px",
              }}
            >
              ✕ Limpar seleção
            </button>
          )}
          {influencers.map(inf => {
            const checked = selected.includes(inf.id);
            return (
              <button
                key={inf.id}
                onClick={() => toggle(inf.id)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  border: "none",
                  background: checked ? `${BASE_COLORS.purple}22` : "transparent",
                  color: checked ? BASE_COLORS.purple : t.text,
                  fontSize: "12px", fontFamily: FONT.body,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "8px",
                  fontWeight: checked ? 700 : 400,
                }}
              >
                <span style={{
                  width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                  border: `1.5px solid ${checked ? BASE_COLORS.purple : t.cardBorder}`,
                  background: checked ? BASE_COLORS.purple : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "9px", color: "#fff",
                }}>
                  {checked ? "✓" : ""}
                </span>
                {inf.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────
export default function Agenda() {
  const { theme: t, user, isDark } = useApp();
  const isAdmin = user?.role === "admin";

  const [view,    setView]    = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(new Date());
  const [lives,   setLives]   = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; live?: Live }>({ open: false });

  const [filterStatus,      setFilterStatus]      = useState<string | null>(null);
  const [filterPlat,        setFilterPlat]        = useState<string | null>(null);
  const [filterInfluencers, setFilterInfluencers] = useState<string[]>([]);
  const [influencerList,    setInfluencerList]    = useState<{ id: string; name: string }[]>([]);

  const hasActiveFilters = filterStatus !== null || filterPlat !== null || filterInfluencers.length > 0;

  async function loadLives() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lives")
      .select(`*, profiles!lives_influencer_id_fkey(name), influencer_perfil(nome_artistico)`)
      .order("data",    { ascending: true })
      .order("horario", { ascending: true });

    if (!error && data) {
      setLives(data.map((l: any) => ({
  ...l,
  influencer_name: l.influencer_perfil?.nome_artistico || l.profiles?.name,
})));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLives();
    if (isAdmin) {
      supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "influencer")
        .order("name")
        .then(({ data }) => { if (data) setInfluencerList(data); });
    }
  }, []);

  function livesForDay(date: Date): Live[] {
    const iso = toISO(date);
    return lives.filter(l => {
      if (l.data !== iso) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterPlat   && l.plataforma !== filterPlat) return false;
      if (filterInfluencers.length > 0 && !filterInfluencers.includes(l.influencer_id)) return false;
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

  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "20px",
  };
  const chip = (active: boolean, color = BASE_COLORS.purple): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
    cursor: "pointer", border: `1.5px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : t.inputBg, color: active ? color : t.textMuted,
    fontFamily: FONT.body, transition: "all 0.15s",
  });

  function LiveChip({ live }: { live: Live }) {
    return (
      <div onClick={() => setModal({ open: true, live })}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "8px", cursor: "pointer", background: `${PLAT_COLOR[live.plataforma]}22`, border: `1px solid ${PLAT_COLOR[live.plataforma]}55`, marginBottom: "3px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: STATUS_COLOR[live.status], flexShrink: 0 }} />
        <span style={{ fontSize: "11px", color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {live.horario.slice(0, 5)} {isAdmin ? `· ${live.influencer_name}` : live.titulo}
        </span>
      </div>
    );
  }

  function dayStyle(date: Date, todayISO: string): React.CSSProperties {
    const iso = toISO(date);
    if (iso === todayISO) return { border: `1.5px solid ${BASE_COLORS.blue}`,      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)" };
    if (iso < todayISO)   return { border: `1.5px solid rgba(233,64,37,0.2)`,       background: isDark ? "rgba(233,64,37,0.07)"   : "rgba(233,64,37,0.05)"   };
    return                       { border: `1.5px solid rgba(39,174,96,0.2)`,       background: isDark ? "rgba(39,174,96,0.07)"   : "rgba(39,174,96,0.05)"   };
  }

  function dayNumberColor(date: Date, todayISO: string) {
    const iso = toISO(date);
    if (iso === todayISO) return BASE_COLORS.blue;
    if (iso < todayISO)   return isDark ? "rgba(233,64,37,0.6)"  : "rgba(233,64,37,0.7)";
    return                       isDark ? "rgba(39,174,96,0.7)"  : "rgba(39,174,96,0.8)";
  }

  function ViewMes() {
    const cells    = getMonthDays(current.getFullYear(), current.getMonth());
    const todayISO = toISO(new Date());
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: t.textMuted, padding: "8px 0", fontFamily: FONT.body }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const dayLives = livesForDay(date);
            const count    = dayLives.length;
            return (
              <div key={i} onClick={() => { setCurrent(date); setView("dia"); }}
                style={{ minHeight: "90px", padding: "6px", borderRadius: "10px", cursor: "pointer", transition: "background 0.15s", ...dayStyle(date, todayISO) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: toISO(date) === todayISO ? 700 : 400, color: dayNumberColor(date, todayISO), fontFamily: FONT.body }}>{date.getDate()}</span>
                  {count > 0 && (
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", background: BASE_COLORS.blue, borderRadius: "10px", padding: "1px 6px", fontFamily: FONT.body }}>
                      {count}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "4px" }}>
                  {dayLives.slice(0, 3).map(l => <LiveChip key={l.id} live={l} />)}
                  {dayLives.length > 3 && <span style={{ fontSize: "10px", color: t.textMuted, fontFamily: FONT.body }}>+{dayLives.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function ViewSemana() {
    const week     = getWeekDays(current);
    const todayISO = toISO(new Date());
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
        {week.map((date, i) => {
          const dayLives = livesForDay(date);
          const count    = dayLives.length;
          return (
            <div key={i} style={{ borderRadius: "12px", padding: "10px 8px", minHeight: "200px", ...dayStyle(date, todayISO) }}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{DAYS[date.getDay()]}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: dayNumberColor(date, todayISO), fontFamily: FONT.title }}>{date.getDate()}</div>
                {count > 0 && (
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#fff", background: BASE_COLORS.blue, borderRadius: "10px", padding: "1px 8px", display: "inline-block", fontFamily: FONT.body, marginTop: "2px" }}>
                    {count} live{count > 1 ? "s" : ""}
                  </div>
                )}
              </div>
              {dayLives.map(l => <LiveChip key={l.id} live={l} />)}
              {dayLives.length === 0 && <div style={{ fontSize: "11px", color: t.textMuted, textAlign: "center", marginTop: "12px", fontFamily: FONT.body }}>—</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function ViewDia() {
    const dayLives = livesForDay(current);
    const todayISO = toISO(new Date());
    const isToday  = toISO(current) === todayISO;
    const count    = dayLives.length;
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "32px", fontWeight: 900, color: isToday ? BASE_COLORS.blue : t.text, fontFamily: FONT.title }}>{current.getDate()}</span>
          <span style={{ fontSize: "16px", color: t.textMuted, marginLeft: "8px", fontFamily: FONT.body }}>{DAYS[current.getDay()]}</span>
          {count > 0 && (
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", background: BASE_COLORS.blue, borderRadius: "12px", padding: "2px 10px", marginLeft: "10px", fontFamily: FONT.body }}>
              {count} live{count > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {dayLives.length === 0 ? (
          <div style={{ textAlign: "center", color: t.textMuted, fontSize: "14px", padding: "40px 0", fontFamily: FONT.body }}>
            Nenhuma live agendada para este dia.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dayLives.map(l => (
              <div key={l.id} onClick={() => setModal({ open: true, live: l })}
                style={{ padding: "16px", borderRadius: "12px", cursor: "pointer", border: `1.5px solid ${PLAT_COLOR[l.plataforma]}55`, background: `${PLAT_COLOR[l.plataforma]}11`, display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: PLAT_COLOR[l.plataforma], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                  {l.plataforma === "Twitch" ? "🟣" : l.plataforma === "YouTube" ? "▶️" : l.plataforma === "Instagram" ? "📸" : l.plataforma === "TikTok" ? "🎵" : "🟢"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{l.titulo}</div>
                  {isAdmin && <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{l.influencer_name}</div>}
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", background: `${PLAT_COLOR[l.plataforma]}33`, color: PLAT_COLOR[l.plataforma], padding: "2px 8px", borderRadius: "20px", fontFamily: FONT.body }}>{l.plataforma}</span>
                    <span style={{ fontSize: "11px", background: `${STATUS_COLOR[l.status]}22`, color: STATUS_COLOR[l.status], padding: "2px 8px", borderRadius: "20px", fontFamily: FONT.body }}>{STATUS_LABEL[l.status]}</span>
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>🕐 {l.horario.slice(0, 5)}</span>
                  </div>
                  {l.link && (
                    <a href={l.link.startsWith("http") ? l.link : `https://${l.link}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "11px", color: BASE_COLORS.blue, fontFamily: FONT.body, textDecoration: "none", wordBreak: "break-all" }}>
                      🔗 {l.link}
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

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: 0 }}>
          🎥 Agenda de Lives
        </h1>
        {isAdmin && (
          <button onClick={() => setModal({ open: true })}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            + Nova Live
          </button>
        )}
      </div>

      {/* ── CARD DE CONTROLES ── */}
      <div style={{ ...card, marginBottom: "16px" }}>

        {/* LINHA DE NAVEGAÇÃO */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <button onClick={prev} style={{ ...chip(false), padding: "6px 12px" }}>‹</button>
          <span style={{ fontSize: "15px", fontWeight: 700, color: t.text, fontFamily: FONT.title, minWidth: "180px", textAlign: "center" }}>
            {headerTitle()}
          </span>
          <button onClick={next} style={{ ...chip(false), padding: "6px 12px" }}>›</button>

          <div style={{ width: "1px", height: "22px", background: t.divider, flexShrink: 0, margin: "0 2px" }} />

          <button onClick={goToday} style={chip(false)}>Hoje</button>

          <div style={{ width: "1px", height: "22px", background: t.divider, flexShrink: 0, margin: "0 2px" }} />

          <SingleDropdown
            value={view}
            options={VIEW_OPTIONS}
            onChange={v => setView(v as ViewMode)}
            icon="📅"
            t={t}
          />

          {isAdmin && influencerList.length > 0 && (
            <>
              <div style={{ width: "1px", height: "22px", background: t.divider, flexShrink: 0, margin: "0 2px" }} />
              <InfluencerMultiSelect
                selected={filterInfluencers}
                onChange={setFilterInfluencers}
                influencers={influencerList}
                t={t}
              />
            </>
          )}
        </div>

        {/* ── LEGENDAS / FILTROS ── */}
        <div style={{
          paddingTop: "14px", borderTop: `1px solid ${t.divider}`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        }}>

          {/* STATUS */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Status
            </span>
            {Object.entries(STATUS_COLOR).map(([status, color]) => {
              const active = filterStatus === status;
              return (
                <button key={status} onClick={() => setFilterStatus(prev => prev === status ? null : status)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "4px 10px", borderRadius: "20px", cursor: "pointer",
                    border: `1.5px solid ${active ? color : color + "55"}`,
                    background: active ? `${color}22` : "transparent",
                    transition: "all 0.15s",
                  }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: "11px", color: active ? color : t.textMuted, fontWeight: active ? 700 : 400, fontFamily: FONT.body }}>
                    {STATUS_LABEL[status]}
                  </span>
                  {active && <span style={{ fontSize: "9px", color }}>✕</span>}
                </button>
              );
            })}
          </div>

          {/* PLATAFORMA */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Plataforma
            </span>
            {Object.entries(PLAT_COLOR).map(([plat, color]) => {
              const active = filterPlat === plat;
              return (
                <button key={plat} onClick={() => setFilterPlat(prev => prev === plat ? null : plat)}
                  style={{
                    padding: "4px 10px", borderRadius: "20px", cursor: "pointer",
                    border: `1.5px solid ${active ? color : color + "55"}`,
                    background: active ? `${color}22` : `${color}11`,
                    color: active ? color : color + "cc",
                    fontSize: "11px", fontWeight: active ? 700 : 500,
                    fontFamily: FONT.body,
                    display: "flex", alignItems: "center", gap: "4px",
                    transition: "all 0.15s",
                  }}>
                  {plat}
                  {active && <span style={{ fontSize: "9px" }}>✕</span>}
                </button>
              );
            })}
          </div>

          {/* LIMPAR FILTROS */}
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterStatus(null); setFilterPlat(null); setFilterInfluencers([]); }}
              style={{
                padding: "5px 16px", borderRadius: "20px",
                border: `1px solid ${BASE_COLORS.red}44`,
                background: `${BASE_COLORS.red}11`,
                color: BASE_COLORS.red,
                fontSize: "11px", fontWeight: 600,
                fontFamily: FONT.body, cursor: "pointer",
              }}>
              ✕ Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── CALENDÁRIO ── */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
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
    </div>
  );
}
