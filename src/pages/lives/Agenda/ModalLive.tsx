import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, Plataforma, LiveStatus } from "../../../types";

interface Props {
  live?:   Live;
  onClose: () => void;
  onSave:  () => void;
}

const PLATAFORMAS: Plataforma[] = ["Twitch", "YouTube", "Instagram", "TikTok", "Kick"];

const PLAT_LINK_KEY: Record<Plataforma, string> = {
  Twitch:    "link_twitch",
  YouTube:   "link_youtube",
  Instagram: "link_instagram",
  TikTok:    "link_tiktok",
  Kick:      "link_kick",
};

export default function ModalLive({ live, onClose, onSave }: Props) {
  const { theme: t, user } = useApp();
  const { podeVerInfluencer } = useDashboardFiltros();
  const perm = usePermission("agenda");
  const isInfluencer = user?.role === "influencer";
  const isEdit  = !!live;
  const podeCriar = !isEdit && perm.canCriarOk;
  const podeEditar = isEdit && perm.canEditarOk;
  const podeExcluir = isEdit && perm.canExcluirOk;
  const somenteLeitura = isEdit && !podeEditar;

  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    influencer_id: live?.influencer_id ?? (user?.role === "influencer" ? user?.id ?? "" : ""),
    data:          live?.data          ?? "",
    horario:       live?.horario       ?? "",
    plataforma:    (live?.plataforma   ?? "Twitch") as Plataforma,
    status:        (live?.status       ?? "agendada") as LiveStatus,
    link:          live?.link          ?? "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [confirm, setConfirm] = useState(false);

  const [perfilLinks,        setPerfilLinks]        = useState<Record<string, string>>({});
  const [linkAutoPreenchido, setLinkAutoPreenchido] = useState(false);

  // 1. Carrega lista de influencers (para roles que podem selecionar)
  useEffect(() => {
    if (!isInfluencer) {
      supabase.from("profiles").select("id, name").eq("role", "influencer")
        .then(({ data }) => {
          if (data) {
            const visiveis = data.filter((i: { id: string }) => podeVerInfluencer(i.id));
            setInfluencers(visiveis);
          }
        });
    }
  }, [isInfluencer, podeVerInfluencer]);

  // 2. Busca links do perfil quando o influencer selecionado muda
  useEffect(() => {
    if (!form.influencer_id) {
      setPerfilLinks({});
      setForm(f => ({ ...f, link: "" }));
      setLinkAutoPreenchido(false);
      return;
    }

    supabase
      .from("influencer_perfil")
      .select("link_twitch, link_youtube, link_instagram, link_tiktok, link_kick")
      .eq("id", form.influencer_id)
      .single()
      .then(({ data }) => {
        const links = (data as Record<string, string>) ?? {};
        setPerfilLinks(links);
      });
  }, [form.influencer_id]);

  // 3. Atualiza o link sempre que a plataforma ou os links do perfil mudam
  useEffect(() => {
    if (!form.influencer_id || Object.keys(perfilLinks).length === 0) return;

    const linkKey      = PLAT_LINK_KEY[form.plataforma];
    const linkDoPerfil = (perfilLinks[linkKey] ?? "").trim();

    // Sempre atualiza — preenche com o link do perfil ou deixa vazio
    setForm(f => ({ ...f, link: linkDoPerfil }));
    setLinkAutoPreenchido(!!linkDoPerfil);
  }, [form.plataforma, perfilLinks]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === "link") setLinkAutoPreenchido(false);
  };

  async function handleSave() {
    setError("");
    if (!form.data)                      return setError("Informe a data.");
    if (!form.horario)                   return setError("Informe o horário.");
    if (!isInfluencer && influencers.length > 0 && !form.influencer_id) return setError("Selecione um influencer.");
    if (!form.link.trim())               return setError("Informe o link da live na plataforma selecionada.");

    setSaving(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const payload: Record<string, any> = {
      data:          form.data,
      horario:       form.horario,
      plataforma:    form.plataforma,
      status:        form.status,
      link:          form.link.trim(),
      influencer_id: isInfluencer ? user?.id : form.influencer_id || undefined,
    };
    if (!isEdit)  payload.created_by = authUser?.id ?? null;

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

        {!isInfluencer && influencers.length > 0 && (
          <div style={row}>
            <label style={labelStyle}>Influencer</label>
            <select
              value={form.influencer_id}
              onChange={e => {
                if (!somenteLeitura) {
                  setForm(f => ({ ...f, influencer_id: e.target.value, link: "" }));
                  setLinkAutoPreenchido(false);
                }
              }}
              disabled={somenteLeitura}
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {influencers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.data} onChange={e => !somenteLeitura && set("data", e.target.value)} readOnly={somenteLeitura} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário</label>
            <input type="time" value={form.horario} onChange={e => !somenteLeitura && set("horario", e.target.value)} readOnly={somenteLeitura} style={inputStyle} />
          </div>
        </div>

        <div style={row}>
          <label style={labelStyle}>Plataforma</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {PLATAFORMAS.map(p => (
              <button key={p} type="button" onClick={() => !somenteLeitura && set("plataforma", p)}
                disabled={somenteLeitura}
                style={{ padding: "7px 14px", borderRadius: "20px", border: `1.5px solid ${form.plataforma === p ? BASE_COLORS.purple : t.cardBorder}`, background: form.plataforma === p ? `${BASE_COLORS.purple}22` : t.inputBg, color: form.plataforma === p ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: somenteLeitura ? "default" : "pointer", fontFamily: FONT.body, opacity: somenteLeitura ? 0.8 : 1 }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={row}>
          <label style={labelStyle}>
            Link {form.plataforma} <span style={{ color: "#e94025" }}>*</span>
          </label>
          <input
            value={form.link}
            onChange={e => { if (!somenteLeitura) { set("link", e.target.value); setError(""); } }}
            readOnly={somenteLeitura}
            style={{
              ...inputStyle,
              borderColor: error.includes("link") ? "#e94025" : linkAutoPreenchido ? BASE_COLORS.purple : t.inputBorder,
            }}
            placeholder={`https://${form.plataforma.toLowerCase()}.com/...`}
          />
          {linkAutoPreenchido ? (
            <span style={{ fontSize: "11px", color: BASE_COLORS.purple, fontFamily: FONT.body, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              ✨ Pré-preenchido com o link do perfil do influencer.
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body, marginTop: "4px", display: "block" }}>
              Obrigatório para salvar a live.
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          {podeExcluir && !confirm && (
            <button onClick={() => setConfirm(true)}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid #e94025`, background: "#e9402511", color: "#e94025", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              🗑 Excluir
            </button>
          )}
          {podeExcluir && confirm && (
            <button onClick={handleDelete} disabled={saving}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", background: "#e94025", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
              Confirmar exclusão?
            </button>
          )}
          {(podeCriar || podeEditar) && (
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT.body }}>
              {saving ? "⏳" : isEdit ? "Salvar Alterações" : "Criar Live"}
            </button>
          )}
          {!podeCriar && !podeEditar && !podeExcluir && (
            <button onClick={onClose}
              style={{ flex: 1, padding: "12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.text, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
