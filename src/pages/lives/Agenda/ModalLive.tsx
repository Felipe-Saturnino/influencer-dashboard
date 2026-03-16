import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { Live, Plataforma, LiveStatus } from "../../../types";
import { X } from "lucide-react";
import { GiFilmProjector } from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── PLATAFORMAS ──────────────────────────────────────────────────────────────
const PLAT_COLOR: Record<string, string> = {
  Twitch:    "#9146ff",
  YouTube:   "#ff0000",
  Instagram: "#e1306c",
  TikTok:    "#69c9d0",
  Kick:      "#53fc18",
};

const PLAT_LOGO: Record<string, string> = {
  Twitch:    "https://cdn.simpleicons.org/twitch/9146FF",
  YouTube:   "https://cdn.simpleicons.org/youtube/FF0000",
  Instagram: "https://cdn.simpleicons.org/instagram/E1306C",
  TikTok:    "https://cdn.simpleicons.org/tiktok/000000",
  Kick:      "https://cdn.simpleicons.org/kick/53FC18",
};

const PLAT_LOGO_DARK: Record<string, string> = {
  ...PLAT_LOGO,
  TikTok: "https://cdn.simpleicons.org/tiktok/FFFFFF",
};

function PlatLogo({ plataforma, size = 14, isDark }: { plataforma: string; size?: number; isDark: boolean }) {
  const [err, setErr] = useState(false);
  const src = isDark ? (PLAT_LOGO_DARK[plataforma] ?? PLAT_LOGO[plataforma]) : PLAT_LOGO[plataforma];
  if (err || !src) return <span style={{ fontSize: size * 0.7, color: PLAT_COLOR[plataforma] ?? "#fff" }}>●</span>;
  return <img src={src} alt={plataforma} width={size} height={size} onError={() => setErr(true)} style={{ display: "block" }} />;
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: LiveStatus; label: string; color: string }[] = [
  { value: "agendada",      label: "Agendada",      color: BRAND.azul     },
  { value: "realizada",     label: "Realizada",     color: BRAND.verde    },
  { value: "nao_realizada", label: "Não Realizada", color: BRAND.vermelho },
];

// ─── TIPOS ────────────────────────────────────────────────────────────────────
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

// ─── MODAL ────────────────────────────────────────────────────────────────────
export default function ModalLive({ live, onClose, onSave }: Props) {
  const { theme: t, user, isDark } = useApp();
  const { podeVerInfluencer } = useDashboardFiltros();
  const perm = usePermission("agenda");
  const isInfluencer = user?.role === "influencer";
  const isEdit       = !!live;
  const podeCriar    = !isEdit && perm.canCriarOk;
  const podeEditar   = isEdit  && perm.canEditarOk;
  const podeExcluir  = isEdit  && perm.canExcluirOk;
  const somenteLeitura = isEdit && !podeEditar;

  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [operadorasInfluencer, setOperadorasInfluencer] = useState<{ slug: string; nome: string }[]>([]);
  const [operadorasTodas, setOperadorasTodas] = useState<{ slug: string; nome: string }[]>([]);
  const [form, setForm] = useState({
    influencer_id:  live?.influencer_id  ?? (user?.role === "influencer" ? user?.id ?? "" : ""),
    operadora_slug: live?.operadora_slug ?? "",
    data:           live?.data           ?? "",
    horario:        live?.horario        ?? "",
    plataforma:     (live?.plataforma    ?? "Twitch") as Plataforma,
    status:         (live?.status        ?? "agendada") as LiveStatus,
    link:           live?.link           ?? "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [confirm, setConfirm] = useState(false);
  const [perfilLinks,        setPerfilLinks]        = useState<Record<string, string>>({});
  const [linkAutoPreenchido, setLinkAutoPreenchido] = useState(false);

  const showOperadoraField = !!form.influencer_id;
  const operadoraObrigatoria = !!form.influencer_id;
  const opcoesOperadora = operadorasInfluencer.length > 0 ? operadorasInfluencer : operadorasTodas;

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => {
      setOperadorasTodas((data ?? []).map((o: { slug: string; nome: string }) => ({ slug: o.slug, nome: o.nome })));
    });
  }, []);

  useEffect(() => {
    if (!isInfluencer) {
      supabase.from("profiles").select("id, name").eq("role", "influencer").then(({ data }) => {
        if (data) setInfluencers(data.filter((i: { id: string }) => podeVerInfluencer(i.id)));
      });
    }
  }, [isInfluencer, podeVerInfluencer]);

  useEffect(() => {
    if (!form.influencer_id) {
      setOperadorasInfluencer([]);
      setPerfilLinks({});
      setForm(f => ({ ...f, link: "", operadora_slug: "" }));
      setLinkAutoPreenchido(false);
      return;
    }
    Promise.all([
      supabase.from("influencer_operadoras").select("operadora_slug").eq("influencer_id", form.influencer_id).eq("ativo", true),
      supabase.from("influencer_perfil").select("link_twitch, link_youtube, link_instagram, link_tiktok, link_kick").eq("id", form.influencer_id).single(),
    ]).then(([opsRes, perfRes]) => {
      const slugs = (opsRes.data ?? []).map((o: { operadora_slug: string }) => o.operadora_slug).filter(Boolean);
      if (slugs.length > 0) {
        supabase.from("operadoras").select("slug, nome").in("slug", slugs).order("nome").then(({ data: ops }) => {
          const lista = (ops ?? []).map((o: { slug: string; nome: string }) => ({ slug: o.slug, nome: o.nome }));
          setOperadorasInfluencer(lista);
          const novaOp = lista.length === 1 ? lista[0].slug : (isEdit && live?.operadora_slug ? live.operadora_slug : "");
          setForm(f => ({ ...f, operadora_slug: novaOp }));
        });
      } else {
        setOperadorasInfluencer([]);
        setForm(f => ({ ...f, operadora_slug: isEdit && live?.operadora_slug ? live.operadora_slug : "" }));
      }
      setPerfilLinks((perfRes.data as Record<string, string>) ?? {});
    });
  }, [form.influencer_id, isEdit, live?.operadora_slug]);

  useEffect(() => {
    if (!form.influencer_id || Object.keys(perfilLinks).length === 0) return;
    const linkKey = PLAT_LINK_KEY[form.plataforma];
    const linkDoPerfil = (perfilLinks[linkKey] ?? "").trim();
    setForm(f => ({ ...f, link: linkDoPerfil }));
    setLinkAutoPreenchido(!!linkDoPerfil);
  }, [form.plataforma, perfilLinks]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === "link") setLinkAutoPreenchido(false);
  };

  async function handleSave() {
    setError("");
    if (!form.data)   return setError("Informe a data.");
    if (!form.horario) return setError("Informe o horário.");
    if (!isInfluencer && influencers.length > 0 && !form.influencer_id) return setError("Selecione um influencer.");
    if (operadoraObrigatoria && !form.operadora_slug?.trim()) return setError("Selecione a operadora.");
    if (!form.link.trim()) return setError("Informe o link da live na plataforma selecionada.");

    const opSlug = form.operadora_slug?.trim();
    if (!opSlug) return setError("Selecione a operadora. É obrigatório para o Financeiro.");

    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = {
      data:           form.data,
      horario:        form.horario,
      plataforma:     form.plataforma,
      status:         form.status,
      link:           form.link.trim(),
      operadora_slug: opSlug,
      influencer_id:  isInfluencer ? user?.id : form.influencer_id || undefined,
    };
    if (!isEdit) (payload as Record<string, unknown>).created_by = authUser?.id ?? null;

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
    borderRadius: 10, border: `1px solid ${t.inputBorder ?? t.cardBorder}`,
    background: t.inputBg ?? t.cardBg, color: t.inputText ?? t.text,
    fontSize: 13, fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: 14 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(74,32,130,0.18)",
              border: "1px solid rgba(74,32,130,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: BRAND.ciano,
            }}>
              <GiFilmProjector size={14} />
            </span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {isEdit ? "Editar Live" : "Nova Live"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Influencer */}
        {!isInfluencer && influencers.length > 0 && (
          <div style={row}>
            <label style={labelStyle}>Influencer</label>
            <select
              value={form.influencer_id}
              onChange={e => {
                if (!somenteLeitura) {
                  setForm(f => ({ ...f, influencer_id: e.target.value, link: "", operadora_slug: "" }));
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

        {/* Operadora — sempre visível quando há influencer; obrigatória para o Financeiro */}
        {showOperadoraField && (
          <div style={row}>
            <label style={labelStyle}>Operadora <span style={{ color: BRAND.vermelho }}>*</span></label>
            <select
              value={form.operadora_slug}
              onChange={e => !somenteLeitura && setForm(f => ({ ...f, operadora_slug: e.target.value }))}
              disabled={somenteLeitura}
              style={inputStyle}
            >
              <option value="">Selecione a operadora...</option>
              {opcoesOperadora.map(o => <option key={o.slug} value={o.slug}>{o.nome}</option>)}
            </select>
            {operadorasInfluencer.length === 0 && opcoesOperadora.length > 0 && (
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
                Influencer sem operadoras vinculadas — selecione uma. Para vincular no perfil, use Operações → Influencers.
              </span>
            )}
          </div>
        )}

        {/* Data e horário */}
        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.data} onChange={e => !somenteLeitura && set("data", e.target.value)} readOnly={somenteLeitura} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário</label>
            <input type="time" value={form.horario} onChange={e => !somenteLeitura && set("horario", e.target.value)} readOnly={somenteLeitura} style={inputStyle} />
          </div>
        </div>

        {/* Plataforma — com logos SVG */}
        <div style={row}>
          <label style={labelStyle}>Plataforma</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLATAFORMAS.map(p => {
              const selected = form.plataforma === p;
              return (
                <button
                  key={p} type="button"
                  onClick={() => !somenteLeitura && set("plataforma", p)}
                  disabled={somenteLeitura}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 20,
                    border: `1.5px solid ${selected ? PLAT_COLOR[p] : t.cardBorder}`,
                    background: selected ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg),
                    color: selected ? PLAT_COLOR[p] : t.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: somenteLeitura ? "default" : "pointer",
                    fontFamily: FONT.body, opacity: somenteLeitura ? 0.8 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <PlatLogo plataforma={p} size={14} isDark={isDark ?? false} />
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Link */}
        <div style={row}>
          <label style={labelStyle}>
            Link {form.plataforma} <span style={{ color: BRAND.vermelho }}>*</span>
          </label>
          <input
            value={form.link}
            onChange={e => { if (!somenteLeitura) { set("link", e.target.value); setError(""); } }}
            readOnly={somenteLeitura}
            style={{
              ...inputStyle,
              borderColor: error.includes("link") ? BRAND.vermelho : linkAutoPreenchido ? BRAND.roxoVivo : (t.inputBorder ?? t.cardBorder),
            }}
            placeholder={`https://${form.plataforma.toLowerCase()}.com/...`}
          />
          {linkAutoPreenchido ? (
            <span style={{ fontSize: 11, color: BRAND.roxoVivo, fontFamily: FONT.body, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              ✨ Pré-preenchido com o link do perfil do influencer.
            </span>
          ) : (
            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4, display: "block" }}>
              Obrigatório para salvar a live.
            </span>
          )}
        </div>

        {/* Status — seletor visual com chips coloridos (visível apenas na edição) */}
        {isEdit && (
          <div style={row}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map(s => {
                const selected = form.status === s.value;
                return (
                  <button
                    key={s.value} type="button"
                    onClick={() => !somenteLeitura && set("status", s.value)}
                    disabled={somenteLeitura}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 20,
                      border: `1.5px solid ${selected ? s.color : t.cardBorder}`,
                      background: selected ? `${s.color}22` : (t.inputBg ?? t.cardBg),
                      color: selected ? s.color : t.textMuted,
                      fontSize: 12, fontWeight: selected ? 700 : 500,
                      cursor: somenteLeitura ? "default" : "pointer",
                      fontFamily: FONT.body, transition: "all 0.15s",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected ? s.color : t.textMuted }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {podeExcluir && !confirm && (
            <button
              onClick={() => setConfirm(true)}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${BRAND.vermelho}`, background: `${BRAND.vermelho}11`, color: BRAND.vermelho, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              🗑 Excluir
            </button>
          )}
          {podeExcluir && confirm && (
            <button
              onClick={handleDelete} disabled={saving}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: BRAND.vermelho, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}
            >
              Confirmar exclusão?
            </button>
          )}
          {(podeCriar || podeEditar) && (
            <button
              onClick={handleSave} disabled={saving}
              style={{
                flex: 2, padding: 12, borderRadius: 10, border: "none",
                background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1, fontFamily: FONT.body,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <GiFilmProjector size={14} />
              {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Live"}
            </button>
          )}
          {!podeCriar && !podeEditar && !podeExcluir && (
            <button
              onClick={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
