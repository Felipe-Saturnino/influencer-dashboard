import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

type Plataforma = "Twitch" | "YouTube" | "Kick" | "Instagram" | "TikTok";
const PLATAFORMAS: Plataforma[] = ["Twitch", "YouTube", "Kick", "Instagram", "TikTok"];
const PLAT_COLOR: Record<Plataforma, string> = {
  Twitch: "#9146ff", YouTube: "#ff0000", Kick: "#53fc18", Instagram: "#e1306c", TikTok: "#010101",
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

type StatusInfluencer = "ativo" | "inativo" | "cancelado";
const STATUS_OPTS: StatusInfluencer[] = ["ativo", "inativo", "cancelado"];
const STATUS_COLOR: Record<StatusInfluencer, string> = {
  ativo: "#27ae60", inativo: "#f39c12", cancelado: "#e94025",
};
const STATUS_LABEL: Record<StatusInfluencer, string> = {
  ativo: "Ativo", inativo: "Inativo", cancelado: "Cancelado",
};

interface Perfil {
  id:               string;
  nome_artistico?:  string;
  status?:          StatusInfluencer;
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

const emptyPerfil = (id: string): Perfil => ({
  id, nome_artistico: "", status: "ativo", telefone: "", cpf: "",
  canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "",
  cache_hora: 0, banco: "", agencia: "", conta: "", chave_pix: "",
  op_blaze: false, id_blaze: "", op_bet_nacional: false, id_bet_nacional: "",
  op_casa_apostas: false, id_casa_apostas: "",
});

function isPerfilIncompleto(perfil: Perfil | null): boolean {
  if (!perfil) return true;
  if (!perfil.nome_artistico?.trim()) return true;
  if ((perfil.canais ?? []).length === 0) return true;
  const temOp = OPERADORAS.some((o) => {
    const ativo = perfil[`op_${o.key}` as keyof Perfil];
    const id = perfil[`id_${o.key}` as keyof Perfil] as string;
    return ativo && id?.trim();
  });
  if (!temOp) return true;
  return false;
}

interface StatusBadgeProps {
  value: StatusInfluencer;
  onChange: (v: StatusInfluencer) => void;
  readonly?: boolean;
}

function StatusBadge({ value, onChange, readonly }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[value] ?? "#888";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => { if (!readonly) setOpen((o) => !o); }}
        style={{
          padding: "4px 12px", borderRadius: "20px",
          border: `1.5px solid ${color}`, background: `${color}18`, color,
          fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
          cursor: readonly ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: "5px",
        }}
      >
        {STATUS_LABEL[value]}
        {!readonly && <span style={{ fontSize: "9px", opacity: 0.7 }}>▼</span>}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#1a1a2e", border: "1px solid #2a2a4e",
          borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          zIndex: 200, minWidth: "140px", overflow: "hidden",
        }}>
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "9px 14px",
                border: "none", background: s === value ? `${STATUS_COLOR[s]}18` : "transparent",
                color: STATUS_COLOR[s], fontSize: "12px", fontWeight: 700,
                cursor: "pointer", textAlign: "left", fontFamily: FONT.body,
              }}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Influencers() {
  const { theme: t, user } = useApp();
  const isAdmin = user?.role === "admin";

  const [list, setList] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "visualizar" | "editar" | "novo"; inf?: Influencer } | null>(null);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    if (isAdmin) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, name, email").eq("role", "influencer").order("name");
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
    } else {
      if (!user) return;
      const { data: perfil } = await supabase
        .from("influencer_perfil").select("*").eq("id", user.id).single();
      setList([{ id: user.id, name: user.name, email: user.email, perfil: perfil ?? null }]);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function handleStatusChange(infId: string, newStatus: StatusInfluencer) {
    setList((prev) => prev.map((i) =>
      i.id === infId
        ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(i.id)), status: newStatus } }
        : i
    ));
    supabase.from("influencer_perfil").update({ status: newStatus }).eq("id", infId);
  }

  const incompletos = list.filter((i) => isPerfilIncompleto(i.perfil));

  const filtered = list.filter((i) =>
    (i.perfil?.nome_artistico ?? i.name)?.toLowerCase().includes(search.toLowerCase()) ||
    i.email?.toLowerCase().includes(search.toLowerCase())
  );

  const porStatus: Record<StatusInfluencer, number> = { ativo: 0, inativo: 0, cancelado: 0 };
  const porPlat: Record<string, number> = {};
  list.forEach((inf) => {
    const s = inf.perfil?.status ?? "ativo";
    porStatus[s]++;
    (inf.perfil?.canais ?? []).forEach((c) => { porPlat[c] = (porPlat[c] ?? 0) + 1; });
  });

  const cardStyle: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "18px 20px", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "12px", flexWrap: "wrap",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "3px 9px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body,
  });

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
            👥 Influencers
          </h1>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            {isAdmin
              ? "Gerencie o cadastro completo dos influencers parceiros."
              : "Seu perfil completo na plataforma."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ mode: "novo" })}
            style={{ padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}
          >
            + Adicionar
          </button>
        )}
      </div>

      {/* Quadros resumo (admin) */}
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>

          {/* Total */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: t.label, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
              📊 Total de Influencers
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: t.text, fontFamily: FONT.title, marginBottom: "12px" }}>
              {list.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
              {STATUS_OPTS.map((s) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{STATUS_LABEL[s]}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: STATUS_COLOR[s], fontFamily: FONT.body }}>{porStatus[s]}</span>
                </div>
              ))}
            </div>
            {Object.keys(porPlat).length > 0 && (
              <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: t.label, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
                  Por Plataforma
                </div>
                {Object.entries(porPlat).sort((a, b) => b[1] - a[1]).map(([plat, n]) => (
                  <div key={plat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: PLAT_COLOR[plat as Plataforma], fontFamily: FONT.body }}>
                      {PLAT_ICON[plat as Plataforma]} {plat}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Perfil Incompleto */}
          <div style={{ background: t.cardBg, border: `1px solid #e9402533`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#e94025", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
              ⚠️ Perfil Incompleto
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#e94025", fontFamily: FONT.title, marginBottom: "12px" }}>
              {incompletos.length}
            </div>
            {incompletos.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
                ✅ Todos os perfis estão completos!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {incompletos.map((inf) => (
                  <button
                    key={inf.id}
                    onClick={() => setModal({ mode: "editar", inf })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontSize: "13px", color: BASE_COLORS.blue, fontFamily: FONT.body, textDecoration: "underline", fontWeight: 500 }}
                  >
                    {inf.perfil?.nome_artistico?.trim() || inf.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Busca */}
      {isAdmin && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome artístico ou e-mail..."
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 16px", borderRadius: "12px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none", marginBottom: "16px" }}
        />
      )}

      {!loading && isAdmin && (
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
        filtered.map((inf) => {
          const p = inf.perfil;
          const canais = p?.canais ?? [];
          const opsAtivas = OPERADORAS.filter((o) => p?.[`op_${o.key}` as keyof Perfil]);
          const incompleto = isPerfilIncompleto(p);
          const status: StatusInfluencer = p?.status ?? "ativo";

          return (
            <div key={inf.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "16px", fontFamily: FONT.body }}>
                  {(p?.nome_artistico || inf.name || inf.email)[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                      {p?.nome_artistico?.trim() || inf.name}
                    </span>
                    <StatusBadge value={status} onChange={(v) => handleStatusChange(inf.id, v)} />
                    {incompleto && <span style={badge("#e94025")}>⚠️ Perfil incompleto</span>}
                  </div>
                  {p?.cache_hora && p.cache_hora > 0 ? (
                    <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "6px" }}>
                      💰 R$ {p.cache_hora}/h
                    </div>
                  ) : null}
                  {canais.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                      {canais.map((c) => {
                        const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                        return link ? (
                          <a
                            key={c}
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: PLAT_COLOR[c], fontFamily: FONT.body, textDecoration: "none" }}
                          >
                            {PLAT_ICON[c]} {c} <span style={{ fontSize: "10px", opacity: 0.7 }}>↗</span>
                          </a>
                        ) : (
                          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: PLAT_COLOR[c], fontFamily: FONT.body }}>
                            {PLAT_ICON[c]} {c}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {opsAtivas.length > 0 && (
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                      {opsAtivas.map((o) => (
                        <span key={o.key} style={badge("#f39c12")}>🎰 {o.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  onClick={() => setModal({ mode: "visualizar", inf })}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.label, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
                >
                  👁️ Ver
                </button>
                <button
                  onClick={() => setModal({ mode: "editar", inf })}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          );
        })
      )}

      {modal?.mode === "visualizar" && modal.inf && (
        <ModalVisualizar influencer={modal.inf} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "editar" && modal.inf && (
        <ModalPerfil influencer={modal.inf} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadData(); }} />
      )}
      {modal?.mode === "novo" && (
        <ModalNovo onClose={() => setModal(null)} onSaved={() => { setModal(null); loadData(); }} />
      )}
    </div>
  );
}

// ── Modal Visualizar ──────────────────────────────────────────────────────────
interface ModalVisualizarProps {
  influencer: Influencer;
  onClose: () => void;
}

function ModalVisualizar({ influencer, onClose }: ModalVisualizarProps) {
  const { theme: t } = useApp();
  const p = influencer.perfil;
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const tabs = [
    { key: "cadastral"  as const, label: "Cadastral"  },
    { key: "canais"     as const, label: "Canais"     },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "operadoras" as const, label: "Operadoras" },
  ];
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const val = (v?: string | number) => (
    <span style={{ fontSize: "13px", color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>
      {v || "—"}
    </span>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
                {p?.nome_artistico?.trim() || influencer.name}
              </h2>
              {p?.status && <StatusBadge value={p.status} onChange={() => {}} readonly />}
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>

        <div style={{ background: `${BASE_COLORS.blue}08`, border: `1px solid ${BASE_COLORS.blue}22`, borderRadius: "10px", padding: "8px 14px", fontSize: "12px", color: BASE_COLORS.blue, fontFamily: FONT.body, marginBottom: "18px" }}>
          👁️ Modo visualização — somente leitura
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${tab === tb.key ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb.key ? `${BASE_COLORS.purple}22` : t.inputBg, color: tab === tb.key ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "cadastral" && (
          <>
            <div style={row}><label style={labelStyle}>Nome Completo</label>{val(influencer.name)}</div>
            <div style={row}><label style={labelStyle}>Nome Artístico</label>{val(p?.nome_artistico)}</div>
            <div style={row}><label style={labelStyle}>E-mail</label>{val(influencer.email)}</div>
            <div style={row}><label style={labelStyle}>Telefone</label>{val(p?.telefone)}</div>
            <div style={row}><label style={labelStyle}>CPF</label>{val(p?.cpf)}</div>
          </>
        )}

        {tab === "canais" && (
          <div style={row}>
            <label style={labelStyle}>Plataformas Ativas</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(p?.canais ?? []).length === 0 ? (
                <span style={{ color: t.textMuted, fontSize: "13px", fontFamily: FONT.body }}>—</span>
              ) : (
                (p?.canais ?? []).map((c) => {
                  const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                  return link ? (
                    <a key={c} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", border: `2px solid ${PLAT_COLOR[c]}`, background: `${PLAT_COLOR[c]}18`, color: PLAT_COLOR[c], fontSize: "12px", fontWeight: 700, fontFamily: FONT.body, textDecoration: "none" }}>
                      {PLAT_ICON[c]} {c} <span style={{ fontSize: "10px", opacity: 0.7 }}>↗</span>
                    </a>
                  ) : (
                    <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", border: `2px solid ${PLAT_COLOR[c]}`, background: `${PLAT_COLOR[c]}18`, color: PLAT_COLOR[c], fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
                      {PLAT_ICON[c]} {c}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}><label style={labelStyle}>Cachê por Hora</label>{val(p?.cache_hora ? `R$ ${p.cache_hora}` : "")}</div>
            <div style={row}><label style={labelStyle}>Chave PIX</label>{val(p?.chave_pix)}</div>
            <div style={row}><label style={labelStyle}>Banco</label>{val(p?.banco)}</div>
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Agência</label>{val(p?.agencia)}</div>
              <div><label style={labelStyle}>Conta</label>{val(p?.conta)}</div>
            </div>
          </>
        )}

        {tab === "operadoras" && (
          <>
            {OPERADORAS.map((op) => {
              const ativo = !!p?.[`op_${op.key}` as keyof Perfil];
              const id = p?.[`id_${op.key}` as keyof Perfil] as string;
              return (
                <div key={op.key} style={{ marginBottom: "14px", padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.label}</span>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, fontFamily: FONT.body }}>
                      {ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {ativo && id && <div style={{ marginTop: "8px", fontSize: "13px", color: t.text, fontFamily: FONT.body }}>ID: {id}</div>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal Novo ────────────────────────────────────────────────────────────────
interface ModalNovoProps {
  onClose: () => void;
  onSaved: () => void;
}

function ModalNovo({ onClose, onSaved }: ModalNovoProps) {
  const { theme: t } = useApp();

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [form, setForm] = useState<Omit<Perfil, "id">>({
    nome_artistico: "", status: "ativo", telefone: "", cpf: "",
    canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "",
    cache_hora: 0, banco: "", agencia: "", conta: "", chave_pix: "",
    op_blaze: false, id_blaze: "", op_bet_nacional: false, id_bet_nacional: "",
    op_casa_apostas: false, id_casa_apostas: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: any) => setForm((f) => ({ ...f, [key]: val }));
  const toggleCanal = (c: Plataforma) => {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };

  async function handleSave() {
    setError("");
    if (!newEmail.trim())             return setError("E-mail é obrigatório.");
    if (!form.nome_artistico?.trim()) return setError("Nome Artístico é obrigatório.");
    if ((form.canais ?? []).length === 0) return setError("Selecione ao menos 1 canal com link.");
    const temCanalSemLink = (form.canais ?? []).some((c) => {
      const link = form[`link_${c.toLowerCase()}` as keyof typeof form] as string;
      return !link?.trim();
    });
    if (temCanalSemLink) return setError("Preencha o link de cada canal selecionado.");
    const temOp = OPERADORAS.some((o) => {
      const ativo = form[`op_${o.key}` as keyof typeof form];
      const id = form[`id_${o.key}` as keyof typeof form] as string;
      return ativo && id?.trim();
    });
    if (!temOp) return setError("Ative ao menos 1 operadora com ID preenchido.");

    setSaving(true);
    const { data: profile, error: profileErr } = await supabase
      .from("profiles").select("id").eq("email", newEmail.toLowerCase().trim()).single();

    if (profileErr || !profile) {
      setError("Usuário não encontrado. Verifique o e-mail.");
      setSaving(false);
      return;
    }

    const payload: Perfil = { ...(form as Perfil), id: profile.id };
    const { error: err } = await supabase.from("influencer_perfil").insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const req = <span style={{ color: "#e94025", marginLeft: "3px" }}>*</span>;
  const row: React.CSSProperties = { marginBottom: "14px" };
  const tabs = [
    { key: "cadastral"  as const, label: "Cadastral"  },
    { key: "canais"     as const, label: "Canais"     },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "operadoras" as const, label: "Operadoras" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>➕ Novo Influencer</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>
        <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "18px", marginTop: "4px" }}>
          Campos com <span style={{ color: "#e94025" }}>*</span> são obrigatórios.
        </p>

        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${tab === tb.key ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb.key ? `${BASE_COLORS.purple}22` : t.inputBg, color: tab === tb.key ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {tab === "cadastral" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Nome Completo</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} placeholder="Nome completo do influencer" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Nome Artístico{req}</label>
              <input value={form.nome_artistico ?? ""} onChange={(e) => set("nome_artistico", e.target.value)} style={inputStyle} placeholder="Ex: StreamerX" />
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail{req}</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={inputStyle} placeholder="email@dominio.com" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Telefone</label>
              <input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
            </div>
            <div style={row}>
              <label style={labelStyle}>CPF</label>
              <input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} style={inputStyle} placeholder="000.000.000-00" />
            </div>
          </>
        )}

        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas Ativas{req}</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map((p) => {
                  const ativo = (form.canais ?? []).includes(p);
                  return (
                    <button key={p} onClick={() => toggleCanal(p)}
                      style={{ padding: "8px 14px", borderRadius: "20px", cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : t.inputBg, color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
                      {PLAT_ICON[p]} {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {(form.canais ?? []).map((c) => {
              const linkKey = `link_${c.toLowerCase()}` as keyof Perfil;
              return (
                <div key={c} style={row}>
                  <label style={labelStyle}>Link {c}{req}</label>
                  <input value={(form[linkKey] as string) ?? ""} onChange={(e) => set(linkKey, e.target.value)} style={inputStyle} placeholder={`https://${c.toLowerCase()}.com/seu-canal`} />
                </div>
              );
            })}
            {(form.canais ?? []).length === 0 && (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Selecione ao menos uma plataforma acima.</p>
            )}
          </>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Cachê por Hora (R$)</label>
              <input type="number" min={0} value={form.cache_hora ?? 0} onChange={(e) => set("cache_hora", Number(e.target.value))} style={inputStyle} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Chave PIX</label>
              <input value={form.chave_pix ?? ""} onChange={(e) => set("chave_pix", e.target.value)} style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Banco</label>
              <input value={form.banco ?? ""} onChange={(e) => set("banco", e.target.value)} style={inputStyle} placeholder="Ex: Nubank, Itaú, Bradesco" />
            </div>
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Agência</label>
                <input value={form.agencia ?? ""} onChange={(e) => set("agencia", e.target.value)} style={inputStyle} placeholder="0000" />
              </div>
              <div>
                <label style={labelStyle}>Conta</label>
                <input value={form.conta ?? ""} onChange={(e) => set("conta", e.target.value)} style={inputStyle} placeholder="00000-0" />
              </div>
            </div>
          </>
        )}

        {tab === "operadoras" && (
          <>
            <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
              Ative ao menos <span style={{ color: "#e94025" }}>1 operadora</span> com ID preenchido.
            </p>
            {OPERADORAS.map((op) => {
              const opKey = `op_${op.key}` as keyof Perfil;
              const idKey = `id_${op.key}` as keyof Perfil;
              const ativo = !!form[opKey];
              return (
                <div key={op.key} style={{ ...row, padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? "12px" : 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.label}</span>
                    <button onClick={() => set(opKey, !ativo)}
                      style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                      {ativo ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                  {ativo && (
                    <div>
                      <label style={labelStyle}>ID {op.label}{req}</label>
                      <input value={(form[idKey] as string) ?? ""} onChange={(e) => set(idKey, e.target.value)} style={inputStyle} placeholder={`ID do influencer na ${op.label}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginTop: "8px", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
          {saving ? "⏳ Salvando..." : "Criar Influencer"}
        </button>
      </div>
    </div>
  );
}

// ── Modal Editar ──────────────────────────────────────────────────────────────
interface ModalPerfilProps {
  influencer: Influencer;
  onClose: () => void;
  onSaved: () => void;
}

function ModalPerfil({ influencer, onClose, onSaved }: ModalPerfilProps) {
  const { theme: t } = useApp();
  const existing = influencer.perfil;
  const [form, setForm] = useState<Perfil>(existing ?? emptyPerfil(influencer.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: any) => setForm((f) => ({ ...f, [key]: val }));
  const toggleCanal = (c: Plataforma) => {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };

  async function handleSave() {
    setError(""); setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer.id)
      : await supabase.from("influencer_perfil").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const tabs = [
    { key: "cadastral"  as const, label: "Cadastral"  },
    { key: "canais"     as const, label: "Canais"     },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "operadoras" as const, label: "Operadoras" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
                {form.nome_artistico?.trim() || influencer.name}
              </h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} />
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 14px", borderRadius: "20px", border: `1px solid ${tab === tb.key ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb.key ? `${BASE_COLORS.purple}22` : t.inputBg, color: tab === tb.key ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#e9402518", border: "1px solid #e9402544", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        {tab === "cadastral" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Nome Completo</label>
              <input value={influencer.name} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>Gerenciado pelo sistema de autenticação.</span>
            </div>
            <div style={row}>
              <label style={labelStyle}>Nome Artístico</label>
              <input value={form.nome_artistico ?? ""} onChange={(e) => set("nome_artistico", e.target.value)} style={inputStyle} placeholder="Ex: StreamerX" />
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail</label>
              <input value={influencer.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Telefone</label>
              <input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
            </div>
            <div style={row}>
              <label style={labelStyle}>CPF</label>
              <input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} style={inputStyle} placeholder="000.000.000-00" />
            </div>
          </>
        )}

        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas Ativas</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map((p) => {
                  const ativo = (form.canais ?? []).includes(p);
                  return (
                    <button key={p} onClick={() => toggleCanal(p)}
                      style={{ padding: "8px 14px", borderRadius: "20px", cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : t.inputBg, color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
                      {PLAT_ICON[p]} {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {(form.canais ?? []).map((c) => {
              const linkKey = `link_${c.toLowerCase()}` as keyof Perfil;
              return (
                <div key={c} style={row}>
                  <label style={labelStyle}>Link {c}</label>
                  <input value={(form[linkKey] as string) ?? ""} onChange={(e) => set(linkKey, e.target.value)} style={inputStyle} placeholder={`https://${c.toLowerCase()}.com/seu-canal`} />
                </div>
              );
            })}
            {(form.canais ?? []).length === 0 && (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Selecione ao menos uma plataforma acima.</p>
            )}
          </>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Cachê por Hora (R$)</label>
              <input type="number" min={0} value={form.cache_hora ?? 0} onChange={(e) => set("cache_hora", Number(e.target.value))} style={inputStyle} />
            </div>
            <div style={row}>
              <label style={labelStyle}>Chave PIX</label>
              <input value={form.chave_pix ?? ""} onChange={(e) => set("chave_pix", e.target.value)} style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Banco</label>
              <input value={form.banco ?? ""} onChange={(e) => set("banco", e.target.value)} style={inputStyle} placeholder="Ex: Nubank, Itaú, Bradesco" />
            </div>
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Agência</label>
                <input value={form.agencia ?? ""} onChange={(e) => set("agencia", e.target.value)} style={inputStyle} placeholder="0000" />
              </div>
              <div>
                <label style={labelStyle}>Conta</label>
                <input value={form.conta ?? ""} onChange={(e) => set("conta", e.target.value)} style={inputStyle} placeholder="00000-0" />
              </div>
            </div>
          </>
        )}

        {tab === "operadoras" && (
          <>
            {OPERADORAS.map((op) => {
              const opKey = `op_${op.key}` as keyof Perfil;
              const idKey = `id_${op.key}` as keyof Perfil;
              const ativo = !!form[opKey];
              return (
                <div key={op.key} style={{ ...row, padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? "12px" : 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.label}</span>
                    <button onClick={() => set(opKey, !ativo)}
                      style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                      {ativo ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                  {ativo && (
                    <div>
                      <label style={labelStyle}>ID {op.label}</label>
                      <input value={(form[idKey] as string) ?? ""} onChange={(e) => set(idKey, e.target.value)} style={inputStyle} placeholder={`ID do influencer na ${op.label}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ width: "100%", marginTop: "8px", padding: "13px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
          {saving ? "⏳ Salvando..." : "Salvar Perfil"}
        </button>
      </div>
    </div>
  );
}
