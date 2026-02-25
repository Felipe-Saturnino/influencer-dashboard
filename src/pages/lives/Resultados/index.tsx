import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, LiveResultado, LiveStatus } from "../../../types";

const PLAT_COLOR: Record<string, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Instagram: "#e1306c",
  TikTok: "#010101", Kick: "#53fc18",
};

const STATUS_OPTS: { value: LiveStatus; labelPt: string; labelEn: string; color: string }[] = [
  { value: "realizada",     labelPt: "Realizada",     labelEn: "Completed",     color: "#27ae60" },
  { value: "nao_realizada", labelPt: "Não Realizada", labelEn: "Not Completed", color: "#e94025" },
];

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

export default function Resultados() {
  const { theme: t, lang, isDark, user } = useApp();
  const isAdmin = user?.role === "admin";

  const [lives,      setLives]      = useState<Live[]>([]);
  const [resultados, setResultados] = useState<Record<string, LiveResultado>>({});
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<Live | null>(null);

  const todayISO = toISO(new Date());

  async function loadData() {
    setLoading(true);

    const { data: livesData } = await supabase
      .from("lives")
      .select("*, profiles!lives_influencer_id_fkey(name)")
      .lt("data", todayISO)
      .eq("status", "agendada")
      .order("data", { ascending: false })
      .order("horario", { ascending: true });

    if (livesData) {
      const mapped = livesData.map((l: any) => ({ ...l, influencer_name: l.profiles?.name }));
      setLives(mapped);

      const ids = mapped.map((l: Live) => l.id);
      if (ids.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados").select("*").in("live_id", ids);
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

  const L = (pt: string, en: string) => lang === "en" ? en : pt;

  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "20px", marginBottom: "12px",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body,
  });

  function LiveCard({ live }: { live: Live }) {
    return (
      <div style={card}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
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
                <span style={badge("#f39c12")}>⚠️ {L("Pendente validação", "Pending validation")}</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button onClick={() => setModal(live)}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
              ✅ {L("Validar", "Validate")}
            </button>
          )}
        </div>
      </div>
    );
  }

  function ModalValidacao({ live }: { live: Live }) {
    const existing = resultados[live.id];
    const [status,       setStatus]       = useState<LiveStatus>("realizada");
    const [observacao,   setObservacao]   = useState("");
    const [duracaoHoras, setDuracaoHoras] = useState(existing?.duracao_horas ?? 0);
    const [duracaoMin,   setDuracaoMin]   = useState(existing?.duracao_min   ?? 0);
    const [mediaViews,   setMediaViews]   = useState(existing?.media_views   ?? 0);
    const [maxViews,     setMaxViews]     = useState(existing?.max_views     ?? 0);
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState("");

    const showResultFields = status === "realizada";

    async function handleSave() {
      setError("");
      if (showResultFields) {
        if (duracaoHoras === 0 && duracaoMin === 0)
          return setError(L("Informe a duração da live.", "Enter live duration."));
        if (maxViews < mediaViews)
          return setError(L("Máximo não pode ser menor que a média.", "Peak views cannot be less than average."));
      }

      setSaving(true);

      await supabase.from("lives")
        .update({ status, observacao: observacao || null })
        .eq("id", live.id);

      if (showResultFields) {
        const payload = {
          live_id:       live.id,
          duracao_horas: duracaoHoras,
          duracao_min:   duracaoMin,
          media_views:   mediaViews,
          max_views:     maxViews,
        };
        existing
          ? await supabase.from("live_resultados").update(payload).eq("live_id", live.id)
          : await supabase.from("live_resultados").insert(payload);
      }

      setSaving(false);
      setModal(null);
      loadData();
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
    const row: React.CSSProperties = { marginBottom: "14px" };

    return (
      <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
              ✅ {L("Validar Live", "Validate Live")}
            </h2>
            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
          </div>
          <div style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "20px" }}>
            {live.titulo} · {live.influencer_name} · {live.data} {live.horario?.slice(0, 5)}
          </div>

          {error && (
            <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={row}>
            <label style={labelStyle}>{L("Status da Live", "Live Status")}</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {STATUS_OPTS.map(opt => (
                <button key={opt.value} onClick={() => setStatus(opt.value)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${status === opt.value ? opt.color : t.cardBorder}`, background: status === opt.value ? `${opt.color}18` : t.inputBg, color: status === opt.value ? opt.color : t.textMuted, fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}>
                  {lang === "en" ? opt.labelEn : opt.labelPt}
                </button>
              ))}
            </div>
          </div>

          <div style={row}>
            <label style={labelStyle}>{L("Observação", "Notes")}</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
              rows={3} placeholder={L("Comentários sobre a live...", "Comments about the live...")}
              style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
          </div>

          {showResultFields && (
            <>
              <div style={row}>
                <label style={labelStyle}>{L("Duração", "Duration")}</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <input type="number" min={0} max={24} value={duracaoHoras}
                      onChange={e => setDuracaoHoras(Number(e.target.value))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{L("horas", "hours")}</span>
                  </div>
                  <div>
                    <input type="number" min={0} max={59} value={duracaoMin}
                      onChange={e => setDuracaoMin(Number(e.target.value))} style={inputStyle} placeholder="0" />
                    <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>min</span>
                  </div>
                </div>
              </div>

              <div style={row}>
                <label style={labelStyle}>{L("Média de Views", "Average Views")}</label>
                <input type="number" min={0} value={mediaViews}
                  onChange={e => setMediaViews(Number(e.target.value))} style={inputStyle} placeholder="0" />
              </div>

              <div style={row}>
                <label style={labelStyle}>{L("Máximo de Views", "Peak Views")}</label>
                <input type="number" min={0} value={maxViews}
                  onChange={e => setMaxViews(Number(e.target.value))} style={inputStyle} placeholder="0" />
              </div>

              <div style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
                ℹ️ {L("Salvar irá marcar a live como Realizada automaticamente.", "Saving will automatically mark the live as Completed.")}
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳" : L("Salvar Validação", "Save Validation")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
          📋 {L("Resultado de Lives", "Live Results")}
        </h1>
        <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
          {L("Lives passadas com status pendente de validação.", "Past lives pending validation.")}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          {L("Carregando...", "Loading...")}
        </div>
      ) : lives.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          ✅ {L("Nenhuma live pendente de validação.", "No lives pending validation.")}
        </div>
      ) : (
        <>
          <div style={{ fontSize: "13px", color: "#f39c12", fontFamily: FONT.body, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            ⚠️ {lives.length} {L("live(s) aguardando validação", "live(s) awaiting validation")}
          </div>
          {lives.map(l => <LiveCard key={l.id} live={l} />)}
        </>
      )}

      {modal && <ModalValidacao live={modal} />}
    </div>
  );
}
