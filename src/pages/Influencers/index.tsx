import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { BASE_COLORS, FONT } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Plataforma = "Twitch" | "YouTube" | "Kick" | "Instagram" | "TikTok";
const PLATAFORMAS: Plataforma[] = ["Twitch", "YouTube", "Kick", "Instagram", "TikTok"];
const PLAT_COLOR: Record<Plataforma, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Kick: "#53fc18",
  Instagram: "#e1306c", TikTok: "#010101",
};
const PLAT_ICON: Record<Plataforma, string> = {
  Twitch: "🟣", YouTube: "▶️", Kick: "🟢", Instagram: "📸", TikTok: "🎵",
};

type Operadora = "blaze" | "bet_nacional" | "casa_apostas";
const OPERADORAS: { key: Operadora; label: string }[] = [
  { key: "blaze",        label: "Blaze"          },
  { key: "bet_nacional", label: "Bet Nacional"    },
  { key: "casa_apostas", label: "Casa de Apostas" },
];

interface Perfil {
  id:               string;
  nome_artistico?:  string;
  telefone?:        string;
  cpf?:             string;
  canais?:          Plataforma[];
  link_twitch?:     string;
  link_youtube?:    string;
  link_kick?:       string;
  link_instagram?:  string;
  link_tiktok?:     string;
  cache_hora?:      number;
  banco?:           string;
  agencia?:         string;
  conta?:           string;
  chave_pix?:       string;
  op_blaze?:        boolean;
  id_blaze?:        string;
  op_bet_nacional?: boolean;
  id_bet_nacional?: string;
  op_casa_apostas?: boolean;
  id_casa_apostas?: string;
}

interface Influencer {
  id:     string;
  name:   string;
  email:  string;
  perfil: Perfil | null;
}

// ─── Formulário vazio ─────────────────────────────────────────────────────────
const emptyPerfil = (id: string): Perfil => ({
  id, nome_artistico: "", telefone: "", cpf: "",
  canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "",
  cache_hora: 0, banco: "", agencia: "", conta: "", chave_pix: "",
  op_blaze: false, id_blaze: "", op_bet_nacional: false, id_bet_nacional: "",
  op_casa_apostas: false, id_casa_apostas: "",
});

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Influencers() {
  const { theme: t, isDark } = useApp();

  const [list,    setList]    = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<Influencer | null>(null);
  const [search,  setSearch]  = useState("");

  async function loadData() {
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "influencer")
      .order("name");

    if (profiles) {
      const ids = profiles.map((p: any) => p.id);
      const { data: perfis } = ids.length > 0
        ? await supabase.from("influencer_perfil").select("*").in("id", ids)
        : { data: [] };

      const perfisMap: Record<string, Perfil> = {};
      (perfis ?? []).forEach((p: Perfil) => { perfisMap[p.id] = p; });

      setList(profiles.map((p: any) => ({
        id: p.id, name: p.name ?? p.email, email: p.email,
        perfil: perfisMap[p.id] ?? null,
      })));
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = list.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Styles ──
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "18px 20px", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "12px", flexWrap: "wrap",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 9px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body,
  });
  const actionBtn = (color = BASE_COLORS.purple): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer",
    background: `linear-gradient(135deg, ${color}, ${BASE_COLORS.blue})`,
    color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
  });

  return (
    <div style={{ padding: "24px", maxWidth: "860px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
            👥 Influencers
          </h1>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            Gerencie o cadastro completo dos influencers parceiros.
          </p>
        </div>
      </div>

      {/* Busca */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nome ou e-mail..."
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 16px",
          borderRadius: "12px", border: `1px solid ${t.inputBorder}`,
          background: t.inputBg, color: t.inputText, fontSize: "13px",
          fontFamily: FONT.body, outline: "none", marginBottom: "16px",
        }}
      />

      {/* Contador */}
      {!loading && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
          {filtered.length} influencer(s)
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          👥 Nenhum influencer encontrado.
        </div>
      ) : (
        filtered.map(inf => {
          const canais = inf.perfil?.canais ?? [];
          const ops = OPERADORAS.filter(o => inf.perfil?.[`op_${o.key}` as keyof Perfil]);
          return (
            <div key={inf.id} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                {/* Avatar */}
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "16px", fontFamily: FONT.body,
                }}>
                  {(inf.name ?? inf.email)[0]?.toUpperCase()}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                    {inf.name}
                    {inf.perfil?.nome_artistico && (
                      <span style={{ fontSize: "12px", color: t.textMuted, fontWeight: 400, marginLeft: "8px" }}>
                        ({inf.perfil.nome_artistico})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginTop: "2px" }}>
                    {inf.email}
                  </div>
                  <div style={{ display: "flex", gap: "5px", marginTop: "7px", flexWrap: "wrap" }}>
                    {canais.map(c => (
                      <span key={c} style={badge(PLAT_COLOR[c])}>{PLAT_ICON[c]} {c}</span>
                    ))}
                    {ops.map(o => (
                      <span key={o.key} style={badge("#f39c12")}>🎰 {o.label}</span>
                    ))}
                    {!inf.perfil && (
                      <span style={badge("#e94025")}>⚠️ Perfil incompleto</span>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={() => setModal(inf)} style={actionBtn()}>
                ✏️ Editar
              </button>
            </div>
          );
        })
      )}

      {modal && (
        <ModalPerfil
          influencer={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
          t={t} isDark={isDark}
        />
      )}
    </div>
  );
}

// ─── Modal de Perfil ──────────────────────────────────────────────────────────
function ModalPerfil({
  influencer, onClose, onSaved, t, isDark,
}: {
  influencer: Influencer;
  onClose: () => void;
  onSaved: () => void;
  t: any;
  isDark: boolean;
}) {
  const existing = influencer.perfil;
  const [form,   setForm]   = useState<Perfil>(existing ?? emptyPerfil(influencer.id));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [tab,    setTab]    = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: any) => setForm(f => ({ ...f, [key]: val }));

  function toggleCanal(c: Plataforma) {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer.id)
      : await supabase.from("influencer_perfil").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  // ── Estilos internos ──
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText,
    fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "cadastral",  label: "Cadastral"  },
    { key: "canais",     label: "Canais"     },
    { key: "financeiro", label: "Financeiro" },
    { key: "operadoras", label: "Operadoras" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
            ✏️ {influencer.name}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "18px" }}>
          {influencer.email}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{
                padding: "7px 14px", borderRadius: "20px",
                border: `1px solid ${tab === tb.key ? BASE_COLORS.purple : t.cardBorder}`,
                background: tab === tb.key ? `${BASE_COLORS.purple}22` : t.inputBg,
                color: tab === tb.key ? BASE_COLORS.purple : t.textMuted,
                fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
              }}>
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Tab: Cadastral ── */}
        {tab === "cadastral" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Nome Completo</label>
              <input value={influencer.name} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>
                Gerenciado pelo sistema de autenticação.
              </span>
            </div>
            <div style={row}>
              <label style={labelStyle}>Nome Artístico</label>
              <input value={form.nome_artistico ?? ""} onChange={e => set("nome_artistico", e.target.value)} style={inputStyle} placeholder="Ex: StreamerX" />
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail</label>
              <input value={influencer.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Telefone</label>
              <input value={form.telefone ?? ""} onChange={e => set("telefone", e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
            </div>
            <div style={row}>
              <label style={labelStyle}>CPF</label>
              <input value={form.cpf ?? ""} onChange={e => set("cpf", e.target.value)} style={inputStyle} placeholder="000.000.000-00" />
            </div>
          </>
        )}

        {/* ── Tab: Canais ── */}
        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas Ativas</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map(p => {
                  const ativo = (form.canais ?? []).includes(p);
                  return (
                    <button key={p} onClick={() => toggleCanal(p)}
                      style={{
                        padding: "8px 14px", borderRadius: "20px", cursor: "pointer",
                        border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`,
                        background: ativo ? `${PLAT_COLOR[p]}22` : t.inputBg,
                        color: ativo ? PLAT_COLOR[p] : t.textMuted,
                        fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
                      }}>
                      {PLAT_ICON[p]} {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {(form.canais ?? []).map(c => {
              const linkKey = `link_${c.toLowerCase()}` as keyof Perfil;
              return (
                <div key={c} style={row}>
                  <label style={labelStyle}>Link {c}</label>
                  <input
                    value={(form[linkKey] as string) ?? ""}
                    onChange={e => set(linkKey, e.target.value)}
                    style={inputStyle}
                    placeholder={`https://${c.toLowerCase()}.com/seu-canal`}
                  />
                </div>
              );
            })}

            {(form.canais ?? []).length === 0 && (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>
                Selecione ao menos uma plataforma acima.
              </p>
            )}
          </>
        )}

        {/* ── Tab: Financeiro ── */}
        {tab === "financeiro" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Cachê por Hora (R$)</label>
              <input type="number" min={0} value={form.cache_hora ?? 0}
                onChange={e => set("cache_hora", Number(e.target.value))} style={inputStyle} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Chave PIX</label>
              <input value={form.chave_pix ?? ""} onChange={e => set("chave_pix", e.target.value)} style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Banco</label>
              <input value={form.banco ?? ""} onChange={e => set("banco", e.target.value)} style={inputStyle} placeholder="Ex: Nubank, Itaú, Bradesco" />
            </div>
            <div style={{ ...row, ...grid2 }}>
              <div>
                <label style={labelStyle}>Agência</label>
                <input value={form.agencia ?? ""} onChange={e => set("agencia", e.target.value)} style={inputStyle} placeholder="0000" />
              </div>
              <div>
                <label style={labelStyle}>Conta</label>
                <input value={form.conta ?? ""} onChange={e => set("conta", e.target.value)} style={inputStyle} placeholder="00000-0" />
              </div>
            </div>
          </>
        )}

        {/* ── Tab: Operadoras ── */}
        {tab === "operadoras" && (
          <>
            {OPERADORAS.map(op => {
              const opKey = `op_${op.key}` as keyof Perfil;
              const idKey = `id_${op.key}` as keyof Perfil;
              const ativo = !!form[opKey];
              return (
                <div key={op.key} style={{ ...row, padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? "12px" : 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                      🎰 {op.label}
                    </span>
                    <button onClick={() => set(opKey, !ativo)}
                      style={{
                        padding: "5px 14px", borderRadius: "20px",
                        border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`,
                        background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg,
                        color: ativo ? BASE_COLORS.purple : t.textMuted,
                        fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body,
                      }}>
                      {ativo ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                  {ativo && (
                    <div>
                      <label style={labelStyle}>ID {op.label}</label>
                      <input
                        value={(form[idKey] as string) ?? ""}
                        onChange={e => set(idKey, e.target.value)}
                        style={inputStyle}
                        placeholder={`ID do influencer na ${op.label}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Salvar */}
        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginTop: "8px", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
          {saving ? "⏳" : "Salvar Perfil"}
        </button>
      </div>
    </div>
  );
}
