import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
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

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)",
          left: "50%", transform: "translateX(-50%)",
          width: "230px", background: t.cardBg,
          border: `1.5px solid ${t.cardBorder}`, borderRadius: "14px",
          boxShadow: t.isDark ? "0 12px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 100, overflow: "hidden",
        }}>
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

// ─── Live estendida com observação da tabela lives ────────────────────────────

interface LiveComObs extends Omit<Live, "observacao"> {
  observacao?: string | null;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Feedback() {
  const { theme: t, isDark } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("feedback");

  const [periodo,           setPeriodo]           = useState<Periodo>("semana");
  const [statusFiltro,      setStatusFiltro]      = useState<LiveStatus | "todos">("todos");
  const [influencerFiltros, setInfluencerFiltros] = useState<string[]>([]);
  const [filterOperadora,   setFilterOperadora]   = useState<string>("todas");
  const [operadorasList,    setOperadorasList]    = useState<{ slug: string; nome: string }[]>([]);

  const [lives,         setLives]         = useState<LiveComObs[]>([]);
  const [resultados,    setResultados]    = useState<Record<string, LiveResultado>>({});
  const [influencers,   setInfluencers]   = useState<{ id: string; name: string }[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [editando,      setEditando]      = useState<LiveComObs | null>(null);
  const [excluindo,     setExcluindo]     = useState<LiveComObs | null>(null);

  // Dados para os quadros (sem filtro de status)
  const [livesAll,      setLivesAll]      = useState<LiveComObs[]>([]);
  const [resultadosAll, setResultadosAll] = useState<Record<string, LiveResultado>>({});

  async function loadData() {
    setLoading(true);
    const { start, end } = getRange(periodo);

    let baseQuery = supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .gte("data", start)
      .lte("data", end)
      .in("status", ["realizada", "nao_realizada"])
      .order("data", { ascending: false })
      .order("horario", { ascending: true });

    if (influencerFiltros.length > 0) baseQuery = baseQuery.in("influencer_id", influencerFiltros);

    const { data: allData } = await baseQuery;

    if (allData) {
      const mappedAll: LiveComObs[] = allData
        .map((l: any) => ({
          ...l,
          influencer_name: l.profiles?.name,
        }))
        .filter((l: LiveComObs) => podeVerInfluencer(l.influencer_id));
      setLivesAll(mappedAll);

      // Lista de influencers para o dropdown (apenas visíveis)
      const unique = Array.from(
        new Map(
          mappedAll.map(l => [l.influencer_id, { id: l.influencer_id, name: l.influencer_name ?? l.influencer_id }])
        ).values()
      ).filter((i) => podeVerInfluencer(i.id));
      setInfluencers(unique);

      // Resultados para os quadros (todos, sem filtro de status)
      const allIds = mappedAll.map(l => l.id);
      let resMapAll: Record<string, LiveResultado> = {};
      if (allIds.length > 0) {
        const { data: resAll } = await supabase.from("live_resultados").select("*").in("live_id", allIds);
        if (resAll) resAll.forEach((r: LiveResultado) => { resMapAll[r.live_id] = r; });
      }
      setResultadosAll(resMapAll);

      // Aplica filtro de status para os cards
      const filtered = statusFiltro === "todos"
        ? mappedAll
        : mappedAll.filter(l => l.status === statusFiltro);
      setLives(filtered);

      // Resultados para os cards filtrados
      const filteredIds = filtered.map(l => l.id);
      let resMap: Record<string, LiveResultado> = {};
      if (filteredIds.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("*").in("live_id", filteredIds);
        if (resData) resData.forEach((r: LiveResultado) => { resMap[r.live_id] = r; });
      }
      setResultados(resMap);
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [periodo, statusFiltro, influencerFiltros, podeVerInfluencer]);

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome")
      .then(({ data }) => { if (data) setOperadorasList(data); });
  }, []);

  const livesAllFiltered = useMemo(() => {
    if (!filterOperadora || filterOperadora === "todas") return livesAll;
    return livesAll.filter((l) => l.operadora_slug === filterOperadora);
  }, [livesAll, filterOperadora]);

  const livesFiltered = useMemo(() => {
    if (!filterOperadora || filterOperadora === "todas") return lives;
    return lives.filter((l) => l.operadora_slug === filterOperadora);
  }, [lives, filterOperadora]);

  // ── Cálculos dos quadros ──────────────────────────────────────────────────

  const totalLives         = livesAllFiltered.length;
  const totalRealizadas    = livesAllFiltered.filter(l => l.status === "realizada").length;
  const totalNaoRealizadas = livesAllFiltered.filter(l => l.status === "nao_realizada").length;

  const realizadasComRes = livesAllFiltered.filter(l => l.status === "realizada" && resultadosAll[l.id]);

  const totalHoras = realizadasComRes.reduce((acc, l) => {
    const r = resultadosAll[l.id];
    return acc + (r.duracao_horas ?? 0) + (r.duracao_min ?? 0) / 60;
  }, 0);
  const horasInt    = Math.floor(totalHoras);
  const minutosRest = Math.round((totalHoras - horasInt) * 60);

  const mediaViews = realizadasComRes.length > 0
    ? Math.round(
        realizadasComRes.reduce((acc, l) => acc + (resultadosAll[l.id]?.media_views ?? 0), 0) /
        realizadasComRes.length
      )
    : 0;

  // ── Estilos reutilizáveis ─────────────────────────────────────────────────

  const filterBtn = (active: boolean, color = BASE_COLORS.purple): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: "20px",
    border: `1.5px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : t.inputBg,
    color: active ? color : t.textMuted,
    fontSize: "12px", fontWeight: 600, cursor: "pointer",
    fontFamily: FONT.body, whiteSpace: "nowrap" as const,
    transition: "all 0.15s",
  });

  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600,
    fontFamily: FONT.body, whiteSpace: "nowrap",
  });

  const statBox = (color: string): React.CSSProperties => ({
    flex: 1, textAlign: "center" as const, padding: "10px 8px",
    borderRadius: "10px",
    background: isDark ? `${color}11` : `${color}09`,
    border: `1px solid ${color}33`, minWidth: 0,
  });

  async function handleExcluir(live: LiveComObs) {
    if (!perm.canExcluirOk || !confirm("Tem certeza que deseja excluir esta live?")) return;
    setExcluindo(live);
    await supabase.from("live_resultados").delete().eq("live_id", live.id);
    const { error } = await supabase.from("lives").delete().eq("id", live.id);
    setExcluindo(null);
    if (!error) loadData();
  }

  // ── LiveCard ──────────────────────────────────────────────────────────────

  function LiveCard({ live }: { live: LiveComObs }) {
    const res         = resultados[live.id];
    const isRealizada = live.status === "realizada";
    const statusColor = isRealizada ? "#27ae60" : "#e94025";
    const platColor   = PLAT_COLOR[live.plataforma];
    const podeEditar  = perm.canEditarOk;
    const podeExcluir = perm.canExcluirOk;
    const isExcluindo = excluindo?.id === live.id;

    return (
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: "16px", padding: "20px", marginBottom: "10px",
        borderLeft: `8px solid ${statusColor}`,
      }}>
        {/* Linha principal + ações */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "10px",
            background: platColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "19px", flexShrink: 0,
          }}>
            {PLAT_ICON[live.plataforma] ?? "📡"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: "14px", fontWeight: 700, color: t.text,
              fontFamily: FONT.body, marginBottom: "4px",
            }}>
              📅 {fmtData(live.data)} às {live.horario?.slice(0, 5)}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>
                👤 {live.influencer_name}
              </span>
              <span style={{ fontSize: "11px", color: t.textMuted }}>·</span>
              <span style={badge(platColor)}>
                {PLAT_ICON[live.plataforma]} {live.plataforma}
              </span>
            </div>
          </div>
          {(podeEditar || podeExcluir) && (
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {podeEditar && (
                <button
                  onClick={() => setEditando(live)}
                  style={{
                    padding: "6px 12px", borderRadius: "8px", border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg, color: t.text, fontSize: "11px", fontWeight: 600,
                    cursor: "pointer", fontFamily: FONT.body,
                  }}
                >
                  ✏️ Editar
                </button>
              )}
              {podeExcluir && (
                <button
                  onClick={() => handleExcluir(live)}
                  disabled={isExcluindo}
                  style={{
                    padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(233,64,37,0.5)",
                    background: "rgba(233,64,37,0.1)", color: "#e94025", fontSize: "11px", fontWeight: 600,
                    cursor: isExcluindo ? "not-allowed" : "pointer", fontFamily: FONT.body, opacity: isExcluindo ? 0.6 : 1,
                  }}
                >
                  {isExcluindo ? "..." : "🗑️ Excluir"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Observação — lida de live.observacao (tabela lives) */}
        {live.observacao && (
          <div style={{
            marginTop: "14px", padding: "10px 14px", borderRadius: "10px",
            background: isDark ? "#ffffff08" : "#00000006",
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
              {live.observacao}
            </p>
          </div>
        )}

        {/* Stats — só se realizada e com resultado */}
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
                {(res.max_views ?? 0).toLocaleString("pt-BR")}
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

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar o feedback de lives.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
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

      {/* ── Quadros de resumo ─────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}>
          {/* Total de lives */}
          <div style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: "14px", padding: "16px 18px",
          }}>
            <div style={{
              fontSize: "28px", fontWeight: 900, color: t.text,
              fontFamily: FONT.title, lineHeight: 1,
            }}>
              {totalLives}
            </div>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: t.textMuted,
              fontFamily: FONT.body, textTransform: "uppercase",
              letterSpacing: "0.8px", marginTop: "4px",
            }}>
              Total de Lives
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT.body, color: "#27ae60" }}>
                ✅ {totalRealizadas} realizadas
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT.body, color: "#e94025" }}>
                ❌ {totalNaoRealizadas} não realizadas
              </span>
            </div>
          </div>

          {/* Horas realizadas */}
          <div style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: "14px", padding: "16px 18px",
          }}>
            <div style={{
              fontSize: "28px", fontWeight: 900, color: "#8e44ad",
              fontFamily: FONT.title, lineHeight: 1,
            }}>
              {horasInt}h{minutosRest > 0 ? ` ${minutosRest}m` : ""}
            </div>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: t.textMuted,
              fontFamily: FONT.body, textTransform: "uppercase",
              letterSpacing: "0.8px", marginTop: "4px",
            }}>
              Horas Realizadas
            </div>
            <div style={{ marginTop: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT.body, color: t.textMuted }}>
                em {realizadasComRes.length} live{realizadasComRes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Média de views */}
          <div style={{
            background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            borderRadius: "14px", padding: "16px 18px",
          }}>
            <div style={{
              fontSize: "28px", fontWeight: 900, color: "#2980b9",
              fontFamily: FONT.title, lineHeight: 1,
            }}>
              {mediaViews > 0 ? mediaViews.toLocaleString("pt-BR") : "—"}
            </div>
            <div style={{
              fontSize: "11px", fontWeight: 700, color: t.textMuted,
              fontFamily: FONT.body, textTransform: "uppercase",
              letterSpacing: "0.8px", marginTop: "4px",
            }}>
              Média de Views
            </div>
            <div style={{ marginTop: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT.body, color: t.textMuted }}>
                média das médias por live
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "center",
        flexWrap: "wrap", gap: "8px",
        marginBottom: "10px", alignItems: "center",
      }}>
        {PERIODOS.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)} style={filterBtn(periodo === p.value)}>
            {p.label}
          </button>
        ))}

        <div style={{
          width: "1.5px", alignSelf: "stretch", minHeight: "28px",
          background: isDark ? "#4a4a6e" : "#b0b0cc",
          borderRadius: "2px", margin: "0 4px", flexShrink: 0,
        }} />

        <button onClick={() => setStatusFiltro("realizada")} style={filterBtn(statusFiltro === "realizada", "#27ae60")}>
          ✅ Realizada
        </button>
        <button onClick={() => setStatusFiltro("nao_realizada")} style={filterBtn(statusFiltro === "nao_realizada", "#e94025")}>
          ❌ Não Realizada
        </button>
        <button onClick={() => setStatusFiltro("todos")} style={filterBtn(statusFiltro === "todos", "#888")}>
          Todos
        </button>

        {showFiltroOperadora && operadorasList.length > 0 && (
          <>
            <div style={{
              width: "1.5px", alignSelf: "stretch", minHeight: "28px",
              background: isDark ? "#4a4a6e" : "#b0b0cc",
              borderRadius: "2px", margin: "0 4px", flexShrink: 0,
            }} />
            <select
              value={filterOperadora}
              onChange={(e) => setFilterOperadora(e.target.value)}
              style={{
                padding: "7px 14px", borderRadius: "20px",
                border: `1.5px solid ${filterOperadora !== "todas" ? BASE_COLORS.purple : t.cardBorder}`,
                background: filterOperadora !== "todas" ? `${BASE_COLORS.purple}22` : t.inputBg,
                color: filterOperadora !== "todas" ? BASE_COLORS.purple : t.textMuted,
                fontSize: "12px", fontWeight: 600, fontFamily: FONT.body,
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="todas">Todas as operadoras</option>
              {operadorasList.filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug)).map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {showFiltroInfluencer && influencers.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <InfluencerDropdown
            items={influencers}
            selected={influencerFiltros}
            onChange={setInfluencerFiltros}
          />
        </div>
      )}

      {/* Contador */}
      {!loading && livesFiltered.length > 0 && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
          {livesFiltered.length} live(s) encontrada(s)
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
      ) : livesFiltered.length === 0 ? (
        <div style={{
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "16px", padding: "48px",
          textAlign: "center", color: t.textMuted, fontFamily: FONT.body,
        }}>
          💬 Nenhuma live encontrada para o período selecionado.
        </div>
      ) : (
        livesFiltered.map(l => <LiveCard key={l.id} live={l} />)
      )}

      {/* Modal Editar Feedback */}
      {editando && (
        <ModalFeedbackEdit
          live={editando}
          res={resultadosAll[editando.id]}
          t={t}
          isDark={isDark}
          onClose={() => setEditando(null)}
          onSalvo={() => { setEditando(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Editar Feedback ────────────────────────────────────────────────────

function ModalFeedbackEdit({
  live,
  res,
  t,
  isDark,
  onClose,
  onSalvo,
}: {
  live: LiveComObs;
  res?: LiveResultado;
  t: ReturnType<typeof useApp>["theme"];
  isDark: boolean;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [observacao, setObservacao] = useState(live.observacao ?? "");
  const [status, setStatus] = useState<LiveStatus>(live.status as LiveStatus);
  const [duracaoHoras, setDuracaoHoras] = useState(res?.duracao_horas ?? 0);
  const [duracaoMin, setDuracaoMin] = useState(res?.duracao_min ?? 0);
  const [mediaViews, setMediaViews] = useState(res?.media_views ?? 0);
  const [maxViews, setMaxViews] = useState(res?.max_views ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const showResultFields = status === "realizada";

  async function handleSave() {
    setError("");
    if (showResultFields && (duracaoHoras > 0 || duracaoMin > 0) && maxViews < mediaViews) {
      setError("Pico de views não pode ser menor que a média.");
      return;
    }
    setSaving(true);

    const { error: upErr } = await supabase
      .from("lives")
      .update({ observacao: observacao.trim() || null, status })
      .eq("id", live.id);

    if (upErr) {
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
      return;
    }

    if (showResultFields) {
      const payload = {
        live_id: live.id,
        duracao_horas: duracaoHoras,
        duracao_min: duracaoMin,
        media_views: mediaViews,
        max_views: maxViews,
      };
      const { error: resErr } = res
        ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
        : await supabase.from("live_resultados").insert(payload);
      if (resErr) {
        setError("Erro ao salvar resultado. Tente novamente.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSalvo();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText,
    fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
            ✏️ Editar Feedback
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
          {live.influencer_name} · {fmtData(live.data)} {live.horario?.slice(0, 5)}
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setStatus("realizada")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${status === "realizada" ? "#27ae60" : t.cardBorder}`, background: status === "realizada" ? "#27ae6018" : t.inputBg, color: status === "realizada" ? "#27ae60" : t.textMuted, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              ✅ Realizada
            </button>
            <button onClick={() => setStatus("nao_realizada")} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${status === "nao_realizada" ? "#e94025" : t.cardBorder}`, background: status === "nao_realizada" ? "#e9402518" : t.inputBg, color: status === "nao_realizada" ? "#e94025" : t.textMuted, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              ❌ Não realizada
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Observação</label>
          <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Feedback ou observação sobre a live..." />
        </div>

        {showResultFields && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Duração (horas)</label>
                <input type="number" min={0} value={duracaoHoras} onChange={e => setDuracaoHoras(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Duração (min)</label>
                <input type="number" min={0} max={59} value={duracaoMin} onChange={e => setDuracaoMin(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Média de views</label>
                <input type="number" min={0} value={mediaViews} onChange={e => setMediaViews(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pico de views</label>
                <input type="number" min={0} value={maxViews} onChange={e => setMaxViews(Math.max(0, parseInt(e.target.value, 10) || 0))} style={inputStyle} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: "none", color: t.text, cursor: "pointer", fontFamily: FONT.body, fontSize: "13px" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT.body, fontSize: "13px", fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
