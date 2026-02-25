import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../types";

const PLAT_COLOR: Record<string, string> = {
  Twitch: "#9146ff",
  YouTube: "#ff0000",
  Instagram: "#e1306c",
  TikTok: "#010101",
  Kick: "#53fc18",
};

const PLAT_ICON: Record<string, string> = {
  Twitch: "🟣",
  YouTube: "▶️",
  Instagram: "📸",
  TikTok: "🎵",
  Kick: "🟢",
};

type Periodo = "semana" | "mes" | "30dias" | "todos";

function getRange(periodo: Periodo): { start: string; end: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const end = toISO(now);
  if (periodo === "semana") {
    const day = now.getDay();
    const sun = new Date(now);
    sun.setDate(now.getDate() - day);
    return { start: toISO(sun), end };
  }
  if (periodo === "mes") {
    return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end };
  }
  if (periodo === "30dias") {
    const d = new Date(now);
    d.setDate(now.getDate() - 30);
    return { start: toISO(d), end };
  }
  return { start: "2000-01-01", end };
}

export default function Feedback() {
  const { theme: t, isDark } = useApp();

  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [statusFiltro, setStatusFiltro] = useState<LiveStatus | "todos">("todos");
  const [influencerFiltro, setInfluencerFiltro] = useState<string>("todos");

  const [lives, setLives] = useState<Live[]>([]);
  const [resultados, setResultados] = useState<Record<string, LiveResultado>>({});
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (statusFiltro !== "todos") query = query.eq("status", statusFiltro);
    if (influencerFiltro !== "todos") query = query.eq("influencer_id", influencerFiltro);

    const { data: livesData } = await query;

    if (livesData) {
      const mapped: Live[] = livesData.map((l: any) => ({
        ...l,
        influencer_name: l.profiles?.name,
      }));
      setLives(mapped);

      const unique = Array.from(
        new Map(mapped.map(l => [l.influencer_id, { id: l.influencer_id, name: l.influencer_name ?? l.influencer_id }])).values()
      );
      setInfluencers(unique);

      const ids = mapped.map(l => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("*").in("live_id", ids);
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

  useEffect(() => { loadData(); }, [periodo, statusFiltro, influencerFiltro]);

  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body, whiteSpace: "nowrap",
  });

  const statBox = (color: string): React.CSSProperties => ({
    flex: 1, textAlign: "center" as const, padding: "10px 8px", borderRadius: "10px",
    background: isDark ? `${color}11` : `${color}09`, border: `1px solid ${color}33`, minWidth: 0,
  });

  const filterBtn = (active: boolean, color = BASE_COLORS.purple): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: "20px",
    border: `1px solid ${active ? color : t.cardBorder}`,
    background: active ? `${color}22` : t.inputBg,
    color: active ? color : t.textMuted,
    fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body, whiteSpace: "nowrap" as const,
  });

  const select: React.CSSProperties = {
    padding: "7px 12px", borderRadius: "20px",
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg, color: t.inputText,
    fontSize: "12px", fontFamily: FONT.body, cursor: "pointer", outline: "none",
  };

  function LiveCard({ live }: { live: Live }) {
    const res = resultados[live.id];
    const isRealizada = live.status === "realizada";
    const statusColor = isRealizada ? "#27ae60" : "#e94025";
    const statusLabel = isRealizada ? "Realizada" : "Não Realizada";

    return (
      <div style={{
        background: t.cardBg, border: `1px solid ${t.cardBorder}`,
        borderRadius: "16px", padding: "20px", marginBottom: "10px",
        borderLeft: `4px solid ${statusColor}`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: PLAT_COLOR[live.plataforma],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "17px", flexShrink: 0,
            }}>
              {PLAT_ICON[live.plataforma] ?? "📡"}
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                {live.titulo}
              </div>
              <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                {live.influencer_name} · {live.data} · {live.horario?.slice(0, 5)}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={badge(PLAT_COLOR[live.plataforma])}>{live.plataforma}</span>
                <span style={badge(statusColor)}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

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

        {res?.observacao && (
          <div style={{
            marginTop: "12px", padding: "10px 14px", borderRadius: "10px",
            background: isDark ? "#ffffff08" : "#00000006",
            border: `1px solid ${t.cardBorder}`,
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Observação:
            </span>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: t.text, fontFamily: FONT.body, lineHeight: "1.5" }}>
              {res.observacao}
            </p>
          </div>
        )}
      </div>
    );
  }

  const periodos: { value: Periodo; label: string }[] = [
    { value: "semana",  label: "Semana"  },
    { value: "mes",     label: "Mês"     },
    { value: "30dias",  label: "30 dias" },
    { value: "todos",   label: "Tudo"    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
          💬 Feedback de Lives
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
          Histórico de lives realizadas e não realizadas.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
        {periodos.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)} style={filterBtn(periodo === p.value)}>
            {p.label}
          </button>
        ))}
        <div style={{ width: "1px", background: t.cardBorder, margin: "0 4px" }} />
        <button onClick={() => setStatusFiltro("todos")}        style={filterBtn(statusFiltro === "todos", "#888")}>Todos</button>
        <button onClick={() => setStatusFiltro("realizada")}    style={filterBtn(statusFiltro === "realizada", "#27ae60")}>✅ Realizada</button>
        <button onClick={() => setStatusFiltro("nao_realizada")} style={filterBtn(statusFiltro === "nao_realizada", "#e94025")}>❌ Não Realizada</button>
        <div style={{ width: "1px", background: t.cardBorder, margin: "0 4px" }} />
        <select value={influencerFiltro} onChange={e => setInfluencerFiltro(e.target.value)} style={select}>
          <option value="todos">Todos influencers</option>
          {influencers.map(inf => (
            <option key={inf.id} value={inf.id}>{inf.name}</option>
          ))}
        </select>
      </div>

      {!loading && lives.length > 0 && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
          {lives.length} live(s) encontrada(s)
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : lives.length === 0 ? (
        <div style={{
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: "16px", padding: "48px", textAlign: "center",
          color: t.textMuted, fontFamily: FONT.body,
        }}>
          💬 Nenhuma live encontrada para o período selecionado.
        </div>
      ) : (
        lives.map(l => <LiveCard key={l.id} live={l} />)
      )}
    </div>
  );
}
