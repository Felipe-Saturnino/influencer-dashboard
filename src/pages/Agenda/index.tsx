import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { Live } from "../../types";
import ModalLive from "./ModalLive";

type ViewMode = "mes" | "semana" | "dia";

const PLAT_COLOR: Record<string, string> = {
  Twitch:    "#9146ff",
  YouTube:   "#ff0000",
  Instagram: "#e1306c",
  TikTok:    "#010101",
  Kick:      "#53fc18",
};

const STATUS_COLOR: Record<string, string> = {
  agendada:      "#1e36f8",
  realizada:     "#27ae60",
  nao_realizada: "#e94025",
};

const STATUS_LABEL: Record<string, { pt: string; en: string }> = {
  agendada:      { pt: "Agendada",      en: "Scheduled"     },
  realizada:     { pt: "Realizada",     en: "Completed"     },
  nao_realizada: { pt: "Não Realizada", en: "Not Completed" },
};

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

export default function Agenda() {
  const { theme: t, user, lang, isDark } = useApp();
  const isAdmin = user?.role === "admin";
  const L = (obj: { pt: string; en: string }) => lang === "en" ? obj.en : obj.pt;

  const [view,    setView]    = useState<ViewMode>("mes");
  const [current, setCurrent] = useState(new Date());
  const [lives,   setLives]   = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; live?: Live }>({ open: false });
  const [search,  setSearch]  = useState("");

  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPlat,   setFilterPlat]   = useState<string>("todas");

  async function loadLives() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lives")
      .select(`*, profiles!lives_influencer_id_fkey(name)`)
      .order("data",    { ascending: true })
      .order("horario", { ascending: true });

    if (!error && data) {
      setLives(data.map((l: any) => ({ ...l, influencer_name: l.profiles?.name })));
    }
    setLoading(false);
  }

  useEffect(() => { loadLives(); }, []);

  function livesForDay(date: Date): Live[] {
    const iso = toISO(date);
    return lives.filter(l => {
      if (l.data !== iso) return false;
      if (filterStatus !== "todos" && l.status !== filterStatus) return false;
      if (filterPlat   !== "todas" && l.plataforma !== filterPlat) return false;
      if (search && !l.titulo.toLowerCase().includes(search.toLowerCase()) &&
          !(l.influencer_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
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

  const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS_PT   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const DAYS_EN   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months    = lang === "en" ? MONTHS_EN : MONTHS_PT;
  const days      = lang === "en" ? DAYS_EN   : DAYS_PT;

  function headerTitle() {
    if (view === "mes")    return `${months[current.getMonth()]} ${current.getFullYear()}`;
    if (view === "semana") {
      const w = getWeekDays(current);
      return `${w[0].getDate()} – ${w[6].getDate()} ${months[w[6].getMonth()]} ${w[6].getFullYear()}`;
    }
    return `${current.getDate()} ${months[current.getMonth()]} ${current.getFullYear()}`;
  }

  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px",
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
    const isToday = iso === todayISO;
    const isPast  = iso < todayISO;
    if (isToday) return { border: `1.5px solid ${BASE_COLORS.blue}`,        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)" };
    if (isPast)  return { border: `1.5px solid rgba(233,64,37,0.2)`,         background: isDark ? "rgba(233,64,37,0.07)"   : "rgba(233,64,37,0.05)"   };
    return               { border: `1.5px solid rgba(39,174,96,0.2)`,        background: isDark ? "rgba(39,174,96,0.07)"   : "rgba(39,174,96,0.05)"   };
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
          {days.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, color: t.textMuted, padding: "8px 0", fontFamily: FONT.body }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const dayLives = livesForDay(date);
            return (
              <div key={i} onClick={() => { setCurrent(date); setView("dia"); }}
                style={{ minHeight: "90px", padding: "6px", borderRadius: "10px", cursor: "pointer", transition: "background 0.15s", ...dayStyle(date, todayISO) }}>
                <span style={{ fontSize: "13px", fontWeight: toISO(date) === todayISO ? 700 : 400, color: dayNumberColor(date, todayISO), fontFamily: FONT.body }}>{date.getDate()}</span>
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
          return (
            <div key={i} style={{ borderRadius: "12px", padding: "10px 8px", minHeight: "200px", ...dayStyle(date, todayISO) }}>
              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{days[date.getDay()]}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: dayNumberColor(date, todayISO), fontFamily: FONT.title }}>{date.getDate()}</div>
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
    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "32px", fontWeight: 900, color: isToday ? BASE_COLORS.blue : t.text, fontFamily: FONT.title }}>{current.getDate()}</span>
          <span style={{ fontSize: "16px", color: t.textMuted, marginLeft: "8px", fontFamily: FONT.body }}>{days[current.getDay()]}</span>
        </div>
        {dayLives.length === 0 ? (
          <div style={{ textAlign: "center", color: t.textMuted, fontSize: "14px", padding: "40px 0", fontFamily: FONT.body }}>
            {L({ pt: "Nenhuma live agendada para este dia.", en: "No lives scheduled for this day." })}
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
                    <span style={{ fontSize: "11px", background: `${STATUS_COLOR[l.status]}22`, color: STATUS_COLOR[l.status], padding: "2px 8px", borderRadius: "20px", fontFamily: FONT.body }}>{STATUS_LABEL[l.status][lang]}</span>
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>🕐 {l.horario.slice(0, 5)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: 0 }}>
          {L({ pt: "Agenda de Lives", en: "Live Schedule" })}
        </h1>
        {isAdmin && (
          <button onClick={() => setModal({ open: true })}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            + {L({ pt: "Nova Live", en: "New Live" })}
          </button>
        )}
      </div>

      {/* FILTROS E NAVEGAÇÃO */}
      <div style={{ ...card, marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={prev} style={{ ...chip(false), padding: "6px 12px" }}>‹</button>
            <span style={{ fontSize: "15px", fontWeight: 700, color: t.text, fontFamily: FONT.title, minWidth: "200px", textAlign: "center" }}>{headerTitle()}</span>
            <button onClick={next} style={{ ...chip(false), padding: "6px 12px" }}>›</button>
            <button onClick={goToday} style={chip(false)}>{L({ pt: "Hoje", en: "Today" })}</button>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {(["mes","semana","dia"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={chip(view === v)}>
                {v === "mes" ? L({ pt: "Mês", en: "Month" }) : v === "semana" ? L({ pt: "Semana", en: "Week" }) : L({ pt: "Dia", en: "Day" })}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={L({ pt: "Buscar live ou influencer...", en: "Search live or influencer..." })}
            style={{ flex: 1, minWidth: "180px", padding: "8px 14px", borderRadius: "10px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none" }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, cursor: "pointer" }}>
            <option value="todos">{L({ pt: "Todos os status", en: "All statuses" })}</option>
            <option value="agendada">{L({ pt: "Agendada", en: "Scheduled" })}</option>
            <option value="realizada">{L({ pt: "Realizada", en: "Completed" })}</option>
            <option value="nao_realizada">{L({ pt: "Não Realizada", en: "Not Completed" })}</option>
          </select>
          <select value={filterPlat} onChange={e => setFilterPlat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "10px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, cursor: "pointer" }}>
            <option value="todas">{L({ pt: "Todas as plataformas", en: "All platforms" })}</option>
            {["Twitch","YouTube","Instagram","TikTok","Kick"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* CALENDÁRIO */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
            {L({ pt: "Carregando...", en: "Loading..." })}
          </div>
        ) : (
          view === "mes" ? <ViewMes /> : view === "semana" ? <ViewSemana /> : <ViewDia />
        )}
      </div>

      {/* MODAL */}
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
