import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../../types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLAT_COLOR: Record<string, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Instagram: "#e1306c",
  TikTok: "#010101", Kick: "#53fc18",
};

const PLAT_ICON: Record<string, string> = {
  Twitch: "🟣", YouTube: "▶️", Instagram: "📸", TikTok: "🎵", Kick: "🟢",
};

// ─── Período ──────────────────────────────────────────────────────────────────

type Periodo = "semana" | "mes" | "todos";

function getRange(periodo: Periodo): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const end = toISO(now);
  if (periodo === "semana") {
    const sun = new Date(now);
    sun.setDate(now.getDate() - now.getDay());
    return { start: toISO(sun), end };
  }
  if (periodo === "mes") {
    return {
      start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      end,
    };
  }
  return { start: "2000-01-01", end };
}

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mês"    },
  { value: "todos",  label: "Tudo"   },
];

// ─── Utilitário: formata data ISO → DD/MM/AA ──────────────────────────────────

function fmtData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// ─── Dropdown multi-select com checkboxes ─────────────────────────────────────

interface DropdownItem { id: string; name: string; }

interface InfluencerDropdownProps {
  items:    DropdownItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function InfluencerDropdown({ items, selected, onChange }: InfluencerDropdownProps) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  const label =
    selected.length === 0 ? "Todos os influencers" :
    selected.length === 1 ? (items.find(i => i.id === selected[0])?.name ?? "1 selecionado") :
    `${selected.length} selecionados`;

  const isActive = selected.length > 0;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: "210px" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "7px 14px", borderRadius: "20px",
          border: `1.5px solid ${isActive ? BASE_COLORS.blue : t.cardBorder}`,
          background: isActive ? `${BASE_COLORS.blue}18` : t.inputBg,
          color: isActive ? BASE_COLORS.blue : t.textMuted,
          fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          transition: "all 0.15s",
        }}
      >
        <span>👥 {label}</span>
        <span style={{
          fontSize: "9px", opacity: 0.7, display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>▼</span>
      </button>

      {/* Painel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          left: "50%", transform: "translateX(-50%)",
          width: "230px", background: t.cardBg,
          border: `1.5px solid ${t.cardBorder}`, borderRadius: "14px",
          boxShadow: t.isDark ? "0 12px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 100, overflow: "hidden",
        }}>
          {/* Header do painel */}
          <div style={{
            padding: "10px 14px 8px",
            borderBottom: `1px solid ${t.isDark ? "#3a3a5c" : "#e0e0ee"}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontSize: "11px", fontWeight: 700, color: t.textMuted,
              textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: FONT.body,
            }}>
              Influencer
            </span>
            {selected.length > 0 && (
              <button onClick={() => onChange([])} style={{
                fontSize: "10px", color: BASE_COLORS.red, background: "none",
                border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT.body,
              }}>
                Limpar
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 0" }}>
            {items.map(inf => {
              const ativo = selected.includes(inf.id);
              return (
                <div
                  key={inf.id}
                  onClick={() => toggle(inf.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "8px 14px", cursor: "pointer",
                    background: ativo
                      ? (t.isDark ? `${BASE_COLORS.blue}18` : `${BASE_COLORS.blue}0e`)
                      : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "5px", flexShrink: 0,
                    border: `2px solid ${ativo ? BASE_COLORS.blue : (t.isDark ? "#4a4a6e" : "#c0c0d8")}`,
                    background: ativo ? BASE_COLORS.blue : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {ativo && <span style={{ fontSize: "9px", color: "#fff", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: "13px", fontFamily: FONT.body,
                    color: ativo ? t.text : t.textMuted,
                    fontWeight: ativo ? 600 : 400,
                  }}>
                    {inf.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Feedback() {
  const { theme: t, user } = useApp();
  const isAdmin = user?.role === "admin";

  const [periodo,           setPeriodo]           = useState<Periodo>("semana");
  const [statusFiltro,      setStatusFiltro]      = useState<LiveStatus | "todos">("todos");
  const [influencerFiltros, setInfluencerFiltros] = useState<string[]>([]);
  const [lives,             setLives]             = useState<Live[]>([]);
  const [resultados,        setResultados]        = useState<Record<string, LiveResultado>>({});
  const [influencers,       setInfluencers]       = useState<{ id: string; name: string }[]>([]);
  const [loading,           setLoading]           = useState(true);

  async function loadData() {
    setLoading(true);
    const { start, end } = getRange(periodo);

    let query = supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .gte("data", start)
      .lte("data", end)
      .in("status", ["realizada", "nao_realizada"])
      .order("data", { ascending: false })
      .order("horario", { ascending: true });

    if (!isAdmin && user?.id) query = query.eq("influencer_id", user.id);
    if (statusFiltro !== "todos") query = query.eq("status", statusFiltro);
    if (isAdmin && influencerFiltros.length > 0) query = query.in("influencer_id", influencerFiltros);

    const { data: livesData } = await query;

    if (livesData) {
      const mapped: Live[] = livesData.map((l: any) => ({
        ...l,
        influencer_name: l.profiles?.name,
      }));
      setLives(mapped);

      if (isAdmin) {
        const unique = Array.from(
          new Map(
            mapped.map(l => [
              l.influencer_id,
              { id: l.influencer_id, name: l.influencer_name ?? l.influencer_id },
            ])
          ).values()
        );
        setInfluencers(unique);
      }

      const ids = mapped.map(l => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados").select("*").in("live_id", ids);
        if (resData) {
          const map: Record<string, LiveResultado> = {};
          resData.forEach((r: LiveResultado) => { map[r.live_id] = r; });
          setResultados(map);
        }
      } else {
        setResultados({});
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [periodo, statusFiltro, influencerFiltros]);

  // ── Style helpers ──────────────────────────────────────────────────────────

  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600,
    fontFamily: FONT.body, whiteSpace: "nowrap",
  });

  const statBox = (color: string): React.CSSProperties => ({
    flex: 1, textAlign: "center" as const, padding: "10px 8px",
    borderRadius: "10px",
    background: t.isDark ? `${color}11` : `${color}09`,
    border: `1px solid ${color}33`, minWidth: 0,
  });

  const filterBtn = (active: boolean, color = BASE_COLORS.purple): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: "20px",
    border: `1.5px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : t.inputBg,
    color: active ? color : t.textMuted,
    fontSize: "12px", fontWeight: 600, cursor: "pointer",
    fontFamily: FONT.body, whiteSpace: "nowrap" as const,
    transition: "all 0.15s",
  });

  // ── Card de Live ───────────────────────────────────────────────────────────

  function LiveCard({ live }: { live: Live }) {
    const res         = resultados[live.id];
    const isRealizada = live.status === "realizada";
    const statusColor = isRealizada ? "#27ae60" : "#e94025";
    const statusLabel = isRealizada ? "Realizada" : "Não Realizada";
    const platColor   = PLAT_COLOR[live.plataforma];

    return (
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: "16px", padding: "20px", marginBottom: "10px",
        borderLeft: `4px solid ${statusColor}`,
      }}>
        {/* Linha principal */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          {/* Ícone plataforma */}
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px",
            background: platColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "19px", flexShrink: 0,
          }}>
            {PLAT_ICON[live.plataforma] ?? "📡"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Data e hora */}
            <div style={{
              fontSize: "15px", fontWeight: 700, color: t.text,
              fontFamily: FONT.body, marginBottom: "3px",
            }}>
              📅 {fmtData(live.data)} às {live.horario?.slice(0, 5)}
            </div>

            {/* Influencer */}
            {isAdmin && (
              <div style={{
                fontSize: "13px", color: t.textMuted,
                fontFamily: FONT.body, marginBottom: "8px",
              }}>
                👤 {live.influencer_name}
              </div>
            )}

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={badge(platColor)}>{PLAT_ICON[live.plataforma]} {live.plataforma}</span>
              <span style={badge(statusColor)}>{isRealizada ? "✅" : "❌"} {statusLabel}</span>
            </div>
          </div>
        </div>

        {/* Observação — exibe se campo preenchido, independente do status */}
        {res?.observacao && (
          <div style={{
            marginTop: "14px", padding: "10px 14px", borderRadius: "10px",
            background: t.isDark ? "#ffffff08" : "#00000006",
            border: `1px solid ${t.cardBorder}`,
          }}>
            <span style={{
              fontSize: "11px", fontWeight: 700, color: t.textMuted,
              fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px",
            }}>
              Observação:
            </span>
            <p style={{
              margin: "4px 0 0", fontSize: "12px", color: t.text,
              fontFamily: FONT.body, lineHeight: "1.5",
            }}>
              {res.observacao}
            </p>
          </div>
        )}

        {/* Stats — só se realizada e com registro em live_resultados */}
        {isRealizada && res && (
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <div style={statBox("#8e44ad")}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#8e44ad", fontFamily: FONT.body }}>
                {res.duracao_horas}h {res.duracao_min}m
              </div>
              <div style={{ fontSize: "10px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                Duração
              </div>
            </div>
            <div style={statBox("#2980b9")}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#2980b9", fontFamily: FONT.body }}>
                {res.media_views.toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: "10px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                Média Views
              </div>
            </div>
            <div style={statBox("#27ae60")}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#27ae60", fontFamily: FONT.body }}>
                {res.max_views.toLocaleString("pt-BR")}
              </div>
              <div style={{ fontSize: "10px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                Pico Views
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{
          fontSize: "22px", fontWeight: 900, color: t.text,
          fontFamily: FONT.title, margin: "0 0 6px",
        }}>
          💬 Feedback de Lives
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
          Histórico de lives realizadas e não realizadas.
        </p>
      </div>

      {/* Linha 1: Período + Status — centralizados */}
      <div style={{
        display: "flex", justifyContent: "center",
        flexWrap: "wrap", gap: "8px",
        marginBottom: "10px", alignItems: "center",
      }}>
        {/* Grupo Período */}
        {PERIODOS.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)} style={filterBtn(periodo === p.value)}>
            {p.label}
          </button>
        ))}

        {/* Divisor nítido */}
        <div style={{
          width: "1.5px", alignSelf: "stretch", minHeight: "28px",
          background: t.isDark ? "#4a4a6e" : "#b0b0cc",
          borderRadius: "2px", margin: "0 4px", flexShrink: 0,
        }} />

        {/* Grupo Status — ordem: Realizada, Não Realizada, Todos */}
        <button onClick={() => setStatusFiltro("realizada")} style={filterBtn(statusFiltro === "realizada", "#27ae60")}>
          ✅ Realizada
        </button>
        <button onClick={() => setStatusFiltro("nao_realizada")} style={filterBtn(statusFiltro === "nao_realizada", "#e94025")}>
          ❌ Não Realizada
        </button>
        <button onClick={() => setStatusFiltro("todos")} style={filterBtn(statusFiltro === "todos", "#888")}>
          Todos
        </button>
      </div>

      {/* Linha 2: Influencer dropdown — centralizado */}
      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <InfluencerDropdown
            items={influencers}
            selected={influencerFiltros}
            onChange={setInfluencerFiltros}
          />
        </div>
      )}

      {/* Contador */}
      {!loading && lives.length > 0 && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
          {lives.length} live(s) encontrada(s)
          {influencerFiltros.length > 0 && (
            <span style={{ marginLeft: "8px", color: BASE_COLORS.blue, fontWeight: 600 }}>
              · {influencerFiltros.length} influencer(s) selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : lives.length === 0 ? (
        <div style={{
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "16px", padding: "48px",
          textAlign: "center", color: t.textMuted, fontFamily: FONT.body,
        }}>
          💬 Nenhuma live encontrada para o período selecionado.
        </div>
      ) : (
        lives.map(l => <LiveCard key={l.id} live={l} />)
      )}
    </div>
  );
}
