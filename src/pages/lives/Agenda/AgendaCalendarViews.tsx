import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { FONT } from "../../../constants/theme";
import { BRAND, FONT_TITLE } from "../../../lib/dashboardConstants";
import { Live } from "../../../types";
import { PlatLogo } from "../../../components/PlatLogo";
import { Clock, Link2 } from "lucide-react";
import { PLAT_COLOR } from "../../../constants/platforms";

export type ViewMode = "mes" | "semana" | "dia";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_COLOR: Record<string, string> = {
  agendada: BRAND.azul,
  realizada: BRAND.verde,
  nao_realizada: BRAND.vermelho,
};

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  nao_realizada: "Não Realizada",
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type AgendaTheme = ReturnType<typeof useApp>["theme"];
type AgendaBrand = ReturnType<typeof useDashboardBrand>;

function agendaDayStyle(date: Date, todayISO: string, isDark: boolean | undefined): React.CSSProperties {
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

function agendaDayNumberColor(date: Date, todayISO: string, isDark: boolean | undefined) {
  const iso = toISO(date);
  if (iso === todayISO) return BRAND.azul;
  if (iso < todayISO) return isDark ? "rgba(232,64,37,0.65)" : "rgba(232,64,37,0.75)";
  return isDark ? "rgba(34,197,94,0.75)" : "rgba(34,197,94,0.85)";
}

export interface LiveChipProps {
  live: Live;
  t: AgendaTheme;
  onOpenLive: (live: Live) => void;
}

export function LiveChip({ live, t, onOpenLive }: LiveChipProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenLive(live)}
      aria-label={`${live.horario.slice(0, 5)} · ${live.influencer_name ?? live.plataforma} — ${STATUS_LABEL[live.status]}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        borderRadius: 8,
        cursor: "pointer",
        background: `${PLAT_COLOR[live.plataforma]}22`,
        border: `1px solid ${PLAT_COLOR[live.plataforma]}44`,
        marginBottom: 4,
        width: "100%",
        textAlign: "left",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: STATUS_COLOR[live.status],
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: t.text,
          fontFamily: FONT.body,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {live.horario.slice(0, 5)}
        {live.influencer_name ? ` · ${live.influencer_name}` : ""}
      </span>
    </button>
  );
}

export interface AgendaCalendarViewProps {
  current: Date;
  livesForDay: (date: Date) => Live[];
  t: AgendaTheme;
  brand: AgendaBrand;
  isDark: boolean | undefined;
  setCurrent: (d: Date) => void;
  setView: (v: ViewMode) => void;
  onOpenLive: (live: Live) => void;
}

export function ViewMes({ current, livesForDay, t, brand, isDark, setCurrent, setView, onOpenLive }: AgendaCalendarViewProps) {
  const cells = getMonthDays(current.getFullYear(), current.getMonth());
  const todayISO = toISO(new Date());
  return (
    <div className="app-agenda-cal-scroll">
      <div className="app-agenda-cal-scroll-inner">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS.map((d) => (
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
                style={{
                  minHeight: 140,
                  padding: 8,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  transition: "background 0.15s",
                  ...agendaDayStyle(date, todayISO, isDark),
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(date);
                    setView("dia");
                  }}
                  aria-label={`Ver lives de ${date.getDate()} de ${MONTHS[date.getMonth()]}`}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    width: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                    ...(dayLives.length === 0 ? { flex: 1, minHeight: 72 } : {}),
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: toISO(date) === todayISO ? 700 : 400, color: agendaDayNumberColor(date, todayISO, isDark), fontFamily: FONT.body }}>
                    {date.getDate()}
                  </span>
                  {dayLives.length > 0 && (
                    <span
                      aria-label={`${dayLives.length} live${dayLives.length > 1 ? "s" : ""} neste dia`}
                      style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: brand.accent, borderRadius: 10, padding: "1px 6px", fontFamily: FONT.body }}
                    >
                      {dayLives.length}
                    </span>
                  )}
                </button>
                <div className="agenda-day-scroll" style={{ marginTop: 4, flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {dayLives.slice(0, 8).map((l) => (
                    <LiveChip key={l.id} live={l} t={t} onOpenLive={onOpenLive} />
                  ))}
                  {dayLives.length > 8 && (
                    <button
                      type="button"
                      onClick={() => {
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

export function ViewSemana({ current, livesForDay, t, brand, isDark, onOpenLive }: AgendaCalendarViewProps) {
  const week = getWeekDays(current);
  const todayISO = toISO(new Date());
  return (
    <div className="app-agenda-cal-scroll">
      <div className="app-agenda-cal-scroll-inner">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {week.map((date, i) => {
            const dayLives = livesForDay(date);
            return (
              <div key={i} style={{ borderRadius: 12, padding: "10px 8px", minHeight: 200, ...agendaDayStyle(date, todayISO, isDark) }}>
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{DAYS[date.getDay()]}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: agendaDayNumberColor(date, todayISO, isDark), fontFamily: FONT_TITLE }}>
                    {date.getDate()}
                  </div>
                  {dayLives.length > 0 && (
                    <div
                      aria-label={`${dayLives.length} live${dayLives.length > 1 ? "s" : ""} neste dia`}
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
                      {dayLives.length} live{dayLives.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                {dayLives.map((l) => (
                  <LiveChip key={l.id} live={l} t={t} onOpenLive={onOpenLive} />
                ))}
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

export function ViewDia({ current, livesForDay, t, brand, isDark, onOpenLive }: AgendaCalendarViewProps) {
  const dayLives = livesForDay(current);
  const todayISO = toISO(new Date());
  const isToday = toISO(current) === todayISO;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: isToday ? BRAND.azul : t.text, fontFamily: FONT_TITLE }}>{current.getDate()}</span>
        <span style={{ fontSize: 16, color: t.textMuted, marginLeft: 8, fontFamily: FONT.body }}>{DAYS[current.getDay()]}</span>
        {dayLives.length > 0 && (
          <span
            aria-label={`${dayLives.length} live${dayLives.length > 1 ? "s" : ""} neste dia`}
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
            {dayLives.length} live{dayLives.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {dayLives.length === 0 ? (
        <div style={{ textAlign: "center", color: t.textMuted, fontSize: 14, padding: "40px 0", fontFamily: FONT.body }}>Nenhuma live agendada para este dia.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dayLives.map((l) => (
            <div key={l.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                onClick={() => onOpenLive(l)}
                aria-label={`Abrir live de ${l.influencer_name ?? l.plataforma} — ${l.horario.slice(0, 5)}`}
                style={{
                  all: "unset",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  borderRadius: 12,
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box",
                  border: `1.5px solid ${PLAT_COLOR[l.plataforma]}44`,
                  background: `${PLAT_COLOR[l.plataforma]}0d`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `${PLAT_COLOR[l.plataforma]}22`,
                    border: `1.5px solid ${PLAT_COLOR[l.plataforma]}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PlatLogo plataforma={l.plataforma} size={22} isDark={isDark ?? false} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {l.influencer_name && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>{l.influencer_name}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        background: `${PLAT_COLOR[l.plataforma]}22`,
                        color: PLAT_COLOR[l.plataforma],
                        padding: "3px 9px",
                        borderRadius: 20,
                        fontFamily: FONT.body,
                        fontWeight: 600,
                      }}
                    >
                      <PlatLogo plataforma={l.plataforma} size={11} isDark={isDark ?? false} />
                      {l.plataforma}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        background: `${STATUS_COLOR[l.status]}22`,
                        color: STATUS_COLOR[l.status],
                        padding: "3px 9px",
                        borderRadius: 20,
                        fontFamily: FONT.body,
                        fontWeight: 600,
                        border: `1px solid ${STATUS_COLOR[l.status]}44`,
                      }}
                    >
                      {STATUS_LABEL[l.status]}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} aria-hidden="true" />
                      {l.horario.slice(0, 5)}
                    </span>
                  </div>
                </div>
              </button>
              {l.link && (
                <a
                  href={l.link.startsWith("http") ? l.link : `https://${l.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    marginLeft: 58,
                    fontSize: 11,
                    color: BRAND.azul,
                    fontFamily: FONT.body,
                    textDecoration: "none",
                    wordBreak: "break-all",
                  }}
                >
                  <Link2 size={11} aria-hidden="true" />
                  {l.link}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
