import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { Live, LiveResultado } from "../../types";

const PLAT_COLOR: Record<string, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Instagram: "#e1306c",
  TikTok: "#010101", Kick: "#53fc18",
};

function getWeekRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

export default function ResultadoLives() {
  const { theme: t, lang, isDark, user } = useApp();
  const isAdmin = user?.role === "admin";

  const [lives,      setLives]      = useState<Live[]>([]);
  const [resultados, setResultados] = useState<Record<string, LiveResultado>>({});
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<Live | null>(null);

  const { start, end } = getWeekRange();

  async function loadData() {
    setLoading(true);

    const { data: livesData } = await supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .gte("data", toISO(start))
      .lte("data", toISO(end))
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (livesData) {
      const mapped = livesData.map((l: any) => ({ ...l, influencer_name: l.profiles?.name }));
      setLives(mapped);

      const ids = mapped.map((l: Live) => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados")
          .select("*")
          .in("live_id", ids);
        if (resData) {
          const map: Record<string, LiveResultado> = {};
          resData.forEach((r: LiveResultado) => { map[r.live_id] = r; });
          setResultados(map);
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // ── Styles ──
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px", marginBottom: "12px",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color: color, fontWeight: 600, fontFamily: FONT.body,
  });
  const statBox = (color: string): React.CSSProperties => ({
    flex: 1, textAlign: "center", padding: "14px 10px", borderRadius: "12px",
    background: isDark ? `${color}11` : `${color}08`,
    border: `1px solid ${color}33`,
  });

  function LiveCard({ live }: { live: Live }) {
    const res = resultados[live.id];
    const hasResult = !!res;
    const isPast = live.data < toISO(new Date());
    const isToday = live.data === toISO(new Date());

    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          {/* Info da live */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: PLAT_COLOR[live.plataforma], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
              {live.plataforma === "Twitch" ? "🟣" : live.plataforma === "YouTube" ? "▶️" : live.plataforma === "Instagram" ? "📸" : live.plataforma === "TikTok" ? "🎵" : "🟢"}
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{live.titulo}</div>
              <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                {isAdmin && <span>{live.influencer_name} · </span>}
                {live.data} · {live.horario?.slice(0, 5)}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={badge(PLAT_COLOR[live.plataforma])}>{live.plataforma}</span>
                {hasResult && <span style={badge("#27ae60")}>{lang === "en" ? "✓ Result saved" : "✓ Resultado salvo"}</span>}
                {!hasResult && isPast && <span style={badge("#e94025")}>{lang === "en" ? "No result" : "Sem resultado"}</span>}
                {isToday && <span style={badge(BASE_COLORS.blue)}>{lang === "en" ? "Today" : "Hoje"}</span>}
              </div>
            </div>
          </div>

          {/* Botão (só admin) */}
          {isAdmin && (
            <button onClick={() => setModal(live)}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", background: hasResult ? `${BASE_COLORS.purple}22` : `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: hasResult ? BASE_COLORS.purple : "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
              {hasResult ? (lang === "en" ? "Edit Result" : "Editar") : (lang === "en" ? "+ Add Result" : "+ Adicionar")}
            </button>
          )}
        </div>

        {/* Stats (se tiver resultado) */}
        {hasResult && (
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <div style={statBox("#9146ff")}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: isDark ? "#9146ff99" : "#9146ffaa", fontFamily: FONT.body, marginBottom: "4px" }}>
                {lang === "en" ? "Duration" : "Duração"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#9146ff", fontFamily: FONT.title }}>
                {res.duracao_horas}h {res.duracao_min > 0 ? `${res.duracao_min}min` : ""}
              </div>
            </div>
            <div style={statBox("#1e36f8")}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: isDark ? "#1e36f899" : "#1e36f8aa", fontFamily: FONT.body, marginBottom: "4px" }}>
                {lang === "en" ? "Avg Views" : "Média de Views"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#1e36f8", fontFamily: FONT.title }}>
                {res.media_views.toLocaleString()}
              </div>
            </div>
            <div style={statBox("#27ae60")}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: isDark ? "#27ae6099" : "#27ae60aa", fontFamily: FONT.body, marginBottom: "4px" }}>
                {lang === "en" ? "Peak Views" : "Máx. de Views"}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#27ae60", fontFamily: FONT.title }}>
                {res.max_views.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function ModalResultado({ live }: { live: Live }) {
    const existing = resultados[live.id];
    const [form, setForm] = useState({
      duracao_horas: existing?.duracao_horas ?? 0,
      duracao_min:   existing?.duracao_min   ?? 0,
      media_views:   existing?.media_views   ?? 0,
      max_views:     existing?.max_views     ?? 0,
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState("");

    const set = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }));

    async function handleSave() {
      setError("");
      if (form.duracao_horas === 0 && form.duracao_min === 0)
        return setError(lang === "en" ? "Enter live duration." : "Informe a duração da live.");
      if (form.max_views < form.media_views)
        return setError(lang === "en" ? "Peak views cannot be less than average." : "Máximo não pode ser menor que a média.");

      setSaving(true);
      const payload = { ...form, live_id: live.id };

      const { error: err } = existing
        ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
        : await supabase.from("live_resultados").insert(payload);

      if (!err) {
        // Atualiza status da live para "realizada"
        await supabase.from("lives").update({ status: "realizada" }).eq("id", live.id);
      }

      setSaving(false);
      if (err) { setError(err.message); return; }
      setModal(null);
      loadData();
    }

    const inputNum: React.CSSProperties = {
      width: "100%", boxSizing: "border-box", padding: "10px 14px",
      borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
      background: t.inputBg, color: t.inputText,
      fontSize: "14px", fontFamily: FONT.body, outline: "none",
    };
    const labelStyle: React.CSSProperties = {
      display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px",
      textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
    };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "420px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
              {existing ? (lang === "en" ? "Edit Result" : "Editar Resultado") : (lang === "en" ? "Add Result" : "Adicionar Resultado")}
            </h2>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
          </div>

          <div style={{ fontSize: "13px", color: t.textMuted, marginBottom: "20px", fontFamily: FONT.body }}>
            {live.titulo} · {live.data}
          </div>

          {error && (
            <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Duração */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>{lang === "en" ? "Duration" : "Duração"}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <input type="number" min={0} max={24} value={form.duracao_horas}
                  onChange={e => set("duracao_horas", Number(e.target.value))}
                  style={inputNum} placeholder="0" />
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>
                  {lang === "en" ? "hours" : "horas"}
                </span>
              </div>
              <div>
                <input type="number" min={0} max={59} value={form.duracao_min}
                  onChange={e => set("duracao_min", Number(e.target.value))}
                  style={inputNum} placeholder="0" />
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>min</span>
              </div>
            </div>
          </div>

          {/* Média de views */}
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>{lang === "en" ? "Average Views" : "Média de Views"}</label>
            <input type="number" min={0} value={form.media_views}
              onChange={e => set("media_views", Number(e.target.value))}
              style={inputNum} placeholder="0" />
          </div>

          {/* Máx de views */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>{lang === "en" ? "Peak Views" : "Máximo de Views"}</label>
            <input type="number" min={0} value={form.max_views}
              onChange={e => set("max_views", Number(e.target.value))}
              style={inputNum} placeholder="0" />
          </div>

          <div style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
            ℹ️ {lang === "en" ? "Saving will automatically mark the live as Completed." : "Salvar irá marcar a live como Realizada automaticamente."}
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳" : (lang === "en" ? "Save Result" : "Salvar Resultado")}
          </button>
        </div>
      </div>
    );
  }

  // ── Semana label ──
  const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = lang === "en" ? MONTHS_EN : MONTHS_PT;
  const weekLabel = `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
          📋 {lang === "en" ? "Live Results" : "Resultado de Lives"}
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
          {lang === "en" ? "Week of" : "Semana de"} {weekLabel}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          {lang === "en" ? "Loading..." : "Carregando..."}
        </div>
      ) : lives.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: t.textMuted, fontFamily: FONT.body }}>
          {lang === "en" ? "No lives scheduled this week." : "Nenhuma live agendada para esta semana."}
        </div>
      ) : (
        lives.map(l => <LiveCard key={l.id} live={l} />)
      )}

      {modal && <ModalResultado live={modal} />}
    </div>
  );
}
