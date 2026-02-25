import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import { Live, Plataforma, LiveStatus } from "../../types";

interface Props {
  live?:   Live;
  onClose: () => void;
  onSave:  () => void;
}

const PLATAFORMAS: Plataforma[] = ["Twitch", "YouTube", "Instagram", "TikTok", "Kick"];

export default function ModalLive({ live, onClose, onSave }: Props) {
  const { theme: t } = useApp();
  const isEdit = !!live;

  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    influencer_id: live?.influencer_id ?? "",
    titulo:        live?.titulo        ?? "",
    data:          live?.data          ?? "",
    horario:       live?.horario       ?? "",
    plataforma:    (live?.plataforma   ?? "Twitch") as Plataforma,
    status:        (live?.status       ?? "agendada") as LiveStatus,
    link:          live?.link          ?? "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("id, name").eq("role", "influencer")
      .then(({ data }) => { if (data) setInfluencers(data); });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setError("");
    if (!form.titulo)         return setError("Informe o título.");
    if (!form.data)           return setError("Informe a data.");
    if (!form.horario)        return setError("Informe o horário.");
    if (!form.influencer_id)  return setError("Selecione um influencer.");

    setSaving(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const payload: Record<string, any> = {
      titulo:        form.titulo,
      data:          form.data,
      horario:       form.horario,
      plataforma:    form.plataforma,
      status:        form.status,
      link:          form.link || null,
      influencer_id: form.influencer_id,
    };

    if (!isEdit) {
      payload.created_by = authUser?.id ?? null;
    }

    const { error: err } = isEdit
      ? await supabase.from("lives").update(payload).eq("id", live!.id)
      : await supabase.from("lives").insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  }

  async function handleDelete() {
    setSaving(true);
    await supabase.from("lives").delete().eq("id", live!.id);
    setSaving(false);
    onSave();
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

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
            {isEdit ? "Editar Live" : "Nova Live"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Influencer */}
        <div style={row}>
          <label style={labelStyle}>Influencer</label>
          <select value={form.influencer_id} onChange={e => set("influencer_id", e.target.value)} style={inputStyle}>
            <option value="">Selecione...</option>
            {influencers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>

        {/* Título */}
        <div style={row}>
          <label style={labelStyle}>Título</label>
          <input value={form.titulo} onChange={e => set("titulo", e.target.value)} style={inputStyle}
            placeholder="Título da live..." />
        </div>

        {/* Data + Horário */}
        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.data} onChange={e => set("data", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário</label>
            <input type="time" value={form.horario} onChange={e => set("horario", e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Plataforma */}
        <div style={row}>
          <label style={labelStyle}>Plataforma</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PLATAFORMAS.map(p => (
              <button key={p} onClick={() => set("plataforma", p)}
                style={{ padding: "7px 14px", borderRadius: "20px", border: `1.5px solid ${form.plataforma === p ? BASE_COLORS.purple : t.cardBorder}`, background: form.plataforma === p ? `${BASE_COLORS.purple}22` : t.inputBg, color: form.plataforma === p ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Link */}
        <div style={row}>
          <label style={labelStyle}>Link</label>
          <input value={form.link} onChange={e => set("link", e.target.value)} style={inputStyle}
            placeholder="https://..." />
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          {isEdit && !confirm && (
            <button onClick={() => setConfirm(true)}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid #e94025`, background: "#e9402511", color: "#e94025", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              🗑 Excluir
            </button>
          )}
          {isEdit && confirm && (
            <button onClick={handleDelete} disabled={saving}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#e94025", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              Confirmar exclusão?
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT.body }}>
            {saving ? "⏳" : isEdit ? "Salvar Alterações" : "Criar Live"}
          </button>
        </div>

      </div>
    </div>
  );
}
