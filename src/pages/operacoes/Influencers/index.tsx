import { useState, useEffect, useRef } from "react";
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

type StatusInfluencer = "ativo" | "inativo" | "cancelado";
const STATUS_OPTS: { value: StatusInfluencer; label: string; color: string }[] = [
  { value: "ativo",      label: "Ativo",      color: "#27ae60" },
  { value: "inativo",    label: "Inativo",    color: "#f39c12" },
  { value: "cancelado",  label: "Cancelado",  color: "#e94025" },
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
  status?:          StatusInfluencer;
}

interface Influencer {
  id:     string;
  name:   string;
  email:  string;
  perfil: Perfil | null;
}

type ModalMode = "criar" | "editar" | "ver";

const emptyPerfil = (id: string): Perfil => ({
  id, nome_artistico: "", telefone: "", cpf: "",
  canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "",
  cache_hora: undefined, banco: "", agencia: "", conta: "", chave_pix: "",
  op_blaze: false, id_blaze: "", op_bet_nacional: false, id_bet_nacional: "",
  op_casa_apostas: false, id_casa_apostas: "", status: "ativo",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isIncomplete(inf: Influencer): boolean {
  const p = inf.perfil;
  if (!p) return true;
  const cadastralOk = !!(p.cpf && p.telefone);
  const financeiroOk = !!(p.cache_hora && p.chave_pix && p.banco);
  return !cadastralOk || !financeiroOk;
}

function displayName(inf: Influencer): { name: string; fallback: boolean } {
  const na = inf.perfil?.nome_artistico?.trim();
  if (na) return { name: na, fallback: false };
  return { name: inf.name, fallback: true };
}

function statusColor(s: StatusInfluencer | undefined) {
  return STATUS_OPTS.find(o => o.value === s)?.color ?? "#27ae60";
}
function statusLabel(s: StatusInfluencer | undefined) {
  return STATUS_OPTS.find(o => o.value === s)?.label ?? "Ativo";
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Influencers() {
  const { theme: t, lang, isDark, user } = useApp();
  const isAdmin = user?.role === "admin";
  const L = (pt: string, en: string) => lang === "en" ? en : pt;

  const [list,       setList]       = useState<Influencer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<{ mode: ModalMode; inf: Influencer | null } | null>(null);

  // Filtros
  const [search,           setSearch]           = useState("");
  const [filterStatus,     setFilterStatus]     = useState<StatusInfluencer | "todos">("todos");
  const [filterPlat,       setFilterPlat]       = useState<Plataforma | "todas">("todas");
  const [filterOp,         setFilterOp]         = useState<Operadora | "todas">("todas");
  const [cacheMin,         setCacheMin]         = useState(0);
  const [cacheMax,         setCacheMax]         = useState(1000);
  const [showIncomplete,   setShowIncomplete]   = useState(false);

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

  // ── Summary stats ──
  const totalInf = list.length;
  const countByStatus = {
    ativo:     list.filter(i => (i.perfil?.status ?? "ativo") === "ativo").length,
    inativo:   list.filter(i => i.perfil?.status === "inativo").length,
    cancelado: list.filter(i => i.perfil?.status === "cancelado").length,
  };
  const activeList = list.filter(i => (i.perfil?.status ?? "ativo") === "ativo");
  const countByPlat: Partial<Record<Plataforma, number>> = {};
  PLATAFORMAS.forEach(p => {
    countByPlat[p] = activeList.filter(i => i.perfil?.canais?.includes(p)).length;
  });
  const maxPlatCount = Math.max(...Object.values(countByPlat) as number[], 1);
  const incompleteList = list.filter(isIncomplete);

  // ── Filtered list ──
  const filtered = list.filter(inf => {
    if (showIncomplete && !isIncomplete(inf)) return false;
    const dn = displayName(inf);
    if (search && !dn.name.toLowerCase().includes(search.toLowerCase()) &&
        !inf.email.toLowerCase().includes(search.toLowerCase())) return false;
    const st = inf.perfil?.status ?? "ativo";
    if (filterStatus !== "todos" && st !== filterStatus) return false;
    if (filterPlat !== "todas" && !(inf.perfil?.canais ?? []).includes(filterPlat)) return false;
    if (filterOp !== "todas") {
      const opKey = `op_${filterOp}` as keyof Perfil;
      if (!inf.perfil?.[opKey]) return false;
    }
    const cache = inf.perfil?.cache_hora ?? 0;
    if (cache < cacheMin || cache > cacheMax) return false;
    return true;
  });

  // ── Inline status update ──
  async function updateStatus(inf: Influencer, newStatus: StatusInfluencer) {
    const existing = inf.perfil;
    if (existing) {
      await supabase.from("influencer_perfil").update({ status: newStatus }).eq("id", inf.id);
    } else {
      await supabase.from("influencer_perfil").insert({ id: inf.id, status: newStatus });
    }
    setList(prev => prev.map(i => i.id === inf.id
      ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(i.id)), status: newStatus } }
      : i
    ));
  }

  // ── Styles ──
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "14px", padding: "14px 18px", marginBottom: "8px",
    display: "flex", gap: "12px", alignItems: "flex-start",
  };
  const badge = (color: string): React.CSSProperties => ({
    fontSize: "11px", padding: "2px 9px", borderRadius: "20px",
    background: `${color}22`, color, fontWeight: 600, fontFamily: FONT.body,
  });
  const selectStyle: React.CSSProperties = {
    padding: "7px 12px", borderRadius: "10px",
    border: `1px solid ${t.inputBorder}`, background: t.inputBg,
    color: t.inputText, fontSize: "12px", fontFamily: FONT.body,
    cursor: "pointer", outline: "none",
  };

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 4px" }}>
            👥 {L("Influencers", "Influencers")}
          </h1>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            {L("Gerencie o cadastro completo dos influencers parceiros.", "Manage all partner influencer profiles.")}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ mode: "criar", inf: null })}
            style={{ padding: "10px 18px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            + {L("Adicionar", "Add")}
          </button>
        )}
      </div>

      {/* ── Summary boxes ── */}
      {isAdmin && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>

          {/* Box esquerda */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "14px", padding: "18px 20px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, margin: "0 0 10px" }}>
              {L("Total de Influencers", "Total Influencers")}
            </p>
            <p style={{ fontFamily: FONT.title, fontSize: "40px", fontWeight: 900, color: t.text, margin: "0 0 12px", lineHeight: 1 }}>
              {totalInf} <span style={{ fontSize: "15px", fontWeight: 600, color: t.textMuted, fontFamily: FONT.body }}>influencers</span>
            </p>

            {/* Status breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
              {STATUS_OPTS.map(s => (
                <div key={s.value} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: t.textMuted }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: s.color, display: "inline-block" }} />
                    {s.label}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: t.text }}>{countByStatus[s.value]}</span>
                </div>
              ))}
            </div>

            <div style={{ height: "1px", background: t.divider, margin: "12px 0" }} />

            {/* Platform breakdown */}
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: t.textMuted, margin: "0 0 8px" }}>
              {L("Por Plataforma (ativos)", "By Platform (active)")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {PLATAFORMAS.map(p => {
                const cnt = countByPlat[p] ?? 0;
                const pct = Math.round((cnt / maxPlatCount) * 100);
                return (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", color: t.textMuted, width: "74px", flexShrink: 0 }}>{PLAT_ICON[p]} {p}</span>
                    <div style={{ flex: 1, height: "5px", borderRadius: "4px", background: t.divider, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: "4px", background: PLAT_COLOR[p] }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: PLAT_COLOR[p], width: "18px", textAlign: "right" }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box direita — incompletos */}
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "14px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, margin: 0 }}>
              {L("Cadastros Incompletos", "Incomplete Profiles")}
            </p>
            <div>
              <p style={{ fontFamily: FONT.title, fontSize: "40px", fontWeight: 900, color: "#e94025", margin: "0 0 2px", lineHeight: 1 }}>
                {incompleteList.length}
              </p>
              <p style={{ fontSize: "12px", color: t.textMuted, margin: 0 }}>
                {L("influencers com dados faltando", "influencers with missing data")}
              </p>
            </div>

            {/* Lista de nomes clicáveis */}
            {incompleteList.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {incompleteList.map(inf => {
                  const dn = displayName(inf);
                  return (
                    <button
                      key={inf.id}
                      onClick={() => setModal({ mode: "editar", inf })}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: "3px 0",
                        textAlign: "left", fontSize: "13px", fontWeight: 600, fontFamily: FONT.body,
                        color: BASE_COLORS.blue, textDecoration: "underline",
                        display: "flex", alignItems: "center", gap: "5px",
                      }}>
                      ⚠️ {dn.name}
                    </button>
                  );
                })}
              </div>
            )}

            {incompleteList.length === 0 && (
              <p style={{ fontSize: "13px", color: "#27ae60", fontWeight: 600, fontFamily: FONT.body }}>
                ✅ {L("Todos os cadastros completos!", "All profiles complete!")}
              </p>
            )}

            {incompleteList.length > 0 && (
              <button
                onClick={() => setShowIncomplete(v => !v)}
                style={{
                  alignSelf: "flex-start", padding: "7px 14px", borderRadius: "20px",
                  border: `1.5px solid ${showIncomplete ? BASE_COLORS.purple : "#e94025"}`,
                  background: showIncomplete ? `${BASE_COLORS.purple}10` : "rgba(233,64,37,.06)",
                  color: showIncomplete ? BASE_COLORS.purple : "#c0341d",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body,
                  marginTop: "4px",
                }}>
                {showIncomplete ? L("✕ Ver todos", "✕ Show all") : L("⚠️ Filtrar incompletos", "⚠️ Filter incomplete")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={L("Buscar por nome artístico ou e-mail...", "Search by stage name or email...")}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 16px",
          borderRadius: "12px", border: `1px solid ${t.inputBorder}`,
          background: t.inputBg, color: t.inputText, fontSize: "13px",
          fontFamily: FONT.body, outline: "none", marginBottom: "12px",
        }}
      />

      {/* ── Filters row 1: Status, Plataforma, Operadora ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body }}>
            {L("Status", "Status")}
          </label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={selectStyle}>
            <option value="todos">{L("Todos", "All")}</option>
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body }}>
            {L("Plataforma", "Platform")}
          </label>
          <select value={filterPlat} onChange={e => setFilterPlat(e.target.value as any)} style={selectStyle}>
            <option value="todas">{L("Todas", "All")}</option>
            {PLATAFORMAS.map(p => <option key={p} value={p}>{PLAT_ICON[p]} {p}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body }}>
            {L("Operadora", "Operator")}
          </label>
          <select value={filterOp} onChange={e => setFilterOp(e.target.value as any)} style={selectStyle}>
            <option value="todas">{L("Todas", "All")}</option>
            {OPERADORAS.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Filter row 2: Cachê slider ── */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, display: "block", marginBottom: "6px" }}>
          {L("Cachê / hora", "Hourly Rate")}
        </label>
        <CacheSlider
          min={0} max={1000}
          valueMin={cacheMin} valueMax={cacheMax}
          onChange={(mn, mx) => { setCacheMin(mn); setCacheMax(mx); }}
          theme={t}
        />
      </div>

      {/* ── Count ── */}
      {!loading && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "12px" }}>
          {filtered.length} {L("influencer(s) encontrado(s)", "influencer(s) found")}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          {L("Carregando...", "Loading...")}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "48px", textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          👥 {L("Nenhum influencer encontrado.", "No influencers found.")}
        </div>
      ) : (
        filtered.map(inf => {
          const dn    = displayName(inf);
          const canais = inf.perfil?.canais ?? [];
          const ops    = OPERADORAS.filter(o => inf.perfil?.[`op_${o.key}` as keyof Perfil]);
          const cache  = inf.perfil?.cache_hora;
          const incomplete = isIncomplete(inf);
          const st     = inf.perfil?.status ?? "ativo";

          return (
            <div key={inf.id} style={card}>
              {/* Avatar */}
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "16px" }}>
                {dn.name[0]?.toUpperCase()}
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name */}
                <div style={{ fontSize: "14px", fontWeight: dn.fallback ? 400 : 700, color: dn.fallback ? t.textMuted : t.text, fontStyle: dn.fallback ? "italic" : "normal", fontFamily: FONT.body, marginBottom: "8px" }}>
                  {dn.name}
                  {dn.fallback && (
                    <span style={{ fontSize: "10px", fontStyle: "normal", fontWeight: 400, background: t.inputBg, color: t.textMuted, padding: "1px 7px", borderRadius: "8px", marginLeft: "6px", border: `1px solid ${t.cardBorder}` }}>
                      {L("sem nome artístico", "no stage name")}
                    </span>
                  )}
                </div>

                {/* Canais */}
                {canais.length > 0 && (
                  <div style={{ marginBottom: "5px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "3px" }}>
                      {L("Canais", "Channels")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {canais.map(c => {
                        const link = inf.perfil?.[`link_${c.toLowerCase()}` as keyof Perfil] as string | undefined;
                        return link ? (
                          <a key={c} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ ...badge(PLAT_COLOR[c]), textDecoration: "none" }}>
                            {PLAT_ICON[c]} {c}
                          </a>
                        ) : (
                          <span key={c} style={badge(PLAT_COLOR[c])}>{PLAT_ICON[c]} {c}</span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Operadoras */}
                {ops.length > 0 && (
                  <div style={{ marginBottom: "6px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: t.textMuted, marginBottom: "3px" }}>
                      {L("Operadoras", "Operators")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {ops.map(op => <span key={op.key} style={badge("#f39c12")}>🎰 {op.label}</span>)}
                    </div>
                  </div>
                )}

                {/* Bottom row: cachê + status + incompleto */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
                  {cache != null && cache > 0 ? (
                    <span style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>
                      {L("Cachê:", "Rate:")} <strong style={{ color: t.text }}>R$ {cache.toLocaleString("pt-BR")},00/h</strong>
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: t.textMuted, fontStyle: "italic", fontFamily: FONT.body }}>
                      {L("Cachê não informado", "Rate not set")}
                    </span>
                  )}
                  <StatusDropdown
                    value={st}
                    onChange={v => updateStatus(inf, v)}
                    theme={t}
                  />
                  {incomplete && (
                    <span style={{ ...badge("#e94025"), border: `1px solid rgba(233,64,37,.25)` }}>⚠️ {L("Cadastro incompleto", "Incomplete profile")}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => setModal({ mode: "ver", inf })}
                  style={{ padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                  👁 {L("Ver", "View")}
                </button>
                <button
                  onClick={() => setModal({ mode: "editar", inf })}
                  style={{ padding: "6px 12px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body }}>
                  ✏️ {L("Editar", "Edit")}
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* ── Modal ── */}
      {modal && (
        <ModalPerfil
          mode={modal.mode}
          influencer={modal.inf}
          allInfluencers={list}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
          L={L}
          t={t}
        />
      )}
    </div>
  );
}

// ─── Slider duplo de Cachê ────────────────────────────────────────────────────
function CacheSlider({ min, max, valueMin, valueMax, onChange, theme: t }: {
  min: number; max: number;
  valueMin: number; valueMax: number;
  onChange: (mn: number, mx: number) => void;
  theme: any;
}) {
  const refMin = useRef<HTMLInputElement>(null);
  const refMax = useRef<HTMLInputElement>(null);

  function update(newMin: number, newMax: number) {
    if (newMin > newMax) return;
    onChange(newMin, newMax);
  }

  const pMin = ((valueMin - min) / (max - min)) * 100;
  const pMax = ((valueMax - min) / (max - min)) * 100;

  return (
    <div style={{ maxWidth: "420px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: BASE_COLORS.purple, fontFamily: FONT.body, minWidth: "80px" }}>
          R$ {valueMin.toLocaleString("pt-BR")},00
        </span>
        <div style={{ flex: 1, position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
          {/* Track */}
          <div style={{ position: "absolute", left: 0, right: 0, height: "4px", background: t.divider, borderRadius: "4px" }} />
          {/* Fill */}
          <div style={{ position: "absolute", left: `${pMin}%`, right: `${100 - pMax}%`, height: "4px", background: `linear-gradient(90deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, borderRadius: "4px" }} />
          {/* Thumb min */}
          <input
            ref={refMin} type="range" min={min} max={max} value={valueMin}
            onChange={e => update(Number(e.target.value), valueMax)}
            style={{ position: "absolute", width: "100%", height: "4px", background: "transparent", pointerEvents: "none", WebkitAppearance: "none", appearance: "none", outline: "none" }}
          />
          {/* Thumb max */}
          <input
            ref={refMax} type="range" min={min} max={max} value={valueMax}
            onChange={e => update(valueMin, Number(e.target.value))}
            style={{ position: "absolute", width: "100%", height: "4px", background: "transparent", pointerEvents: "none", WebkitAppearance: "none", appearance: "none", outline: "none" }}
          />
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, color: BASE_COLORS.blue, fontFamily: FONT.body, minWidth: "80px", textAlign: "right" }}>
          R$ {valueMax.toLocaleString("pt-BR")},00
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: t.textMuted, fontFamily: FONT.body }}>
        <span>R$ {min}</span><span>R$ {max.toLocaleString("pt-BR")}</span>
      </div>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: ${BASE_COLORS.purple};
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(74,48,130,.4);
          pointer-events: all; cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ value, onChange, theme: t }: {
  value: StatusInfluencer;
  onChange: (v: StatusInfluencer) => void;
  theme: any;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_OPTS.find(o => o.value === value)!;

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px 3px 8px", borderRadius: "20px", cursor: "pointer", fontSize: "11px", fontWeight: 700, fontFamily: FONT.body, border: `1.5px solid ${cfg.color}`, color: cfg.color, background: `${cfg.color}12`, userSelect: "none", whiteSpace: "nowrap" }}>
        ● {cfg.label} <span style={{ fontSize: "8px", opacity: 0.6 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 200, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: "130px", overflow: "hidden" }}>
          {STATUS_OPTS.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ padding: "8px 13px", fontSize: "12px", fontWeight: value === opt.value ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "7px", color: value === opt.value ? opt.color : t.text, fontFamily: FONT.body, background: value === opt.value ? `${opt.color}0a` : "transparent" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de Perfil ──────────────────────────────────────────────────────────
function ModalPerfil({
  mode, influencer, allInfluencers, onClose, onSaved, L, t,
}: {
  mode: ModalMode;
  influencer: Influencer | null;
  allInfluencers: Influencer[];
  onClose: () => void;
  onSaved: () => void;
  L: (pt: string, en: string) => string;
  t: any;
}) {
  const YEAR = new Date().getFullYear();
  const isCreate = mode === "criar";
  const isView   = mode === "ver";
  const isEdit   = mode === "editar";

  const existing = influencer?.perfil ?? null;
  const [form, setForm] = useState<Perfil>(existing ?? (influencer ? emptyPerfil(influencer.id) : emptyPerfil("")));

  // Create form fields
  const [newName,  setNewName]  = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: any) => setForm(f => ({ ...f, [key]: val }));

  function toggleCanal(c: Plataforma) {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }

  // ── Uniqueness validation ──
  function checkDuplicates(cpf: string, email: string, idBlaze: string, idBetNac: string, idCasa: string): string {
    const others = allInfluencers.filter(i => i.id !== influencer?.id);
    for (const o of others) {
      if (cpf && o.perfil?.cpf && o.perfil.cpf.replace(/\D/g, "") === cpf.replace(/\D/g, ""))
        return L(`CPF já cadastrado para o influencer "${displayName(o).name}".`, `CPF already registered for influencer "${displayName(o).name}".`);
      if (email && o.email.toLowerCase() === email.toLowerCase())
        return L(`E-mail já cadastrado para o influencer "${displayName(o).name}".`, `Email already registered for influencer "${displayName(o).name}".`);
      if (idBlaze && o.perfil?.id_blaze && o.perfil.id_blaze === idBlaze)
        return L(`ID Blaze "${idBlaze}" já cadastrado para o influencer "${displayName(o).name}".`, `Blaze ID "${idBlaze}" already registered for influencer "${displayName(o).name}".`);
      if (idBetNac && o.perfil?.id_bet_nacional && o.perfil.id_bet_nacional === idBetNac)
        return L(`ID Bet Nacional "${idBetNac}" já cadastrado para o influencer "${displayName(o).name}".`, `Bet Nacional ID "${idBetNac}" already registered for influencer "${displayName(o).name}".`);
      if (idCasa && o.perfil?.id_casa_apostas && o.perfil.id_casa_apostas === idCasa)
        return L(`ID Casa de Apostas "${idCasa}" já cadastrado para o influencer "${displayName(o).name}".`, `Casa de Apostas ID "${idCasa}" already registered for influencer "${displayName(o).name}".`);
    }
    return "";
  }

  async function handleSave() {
    setError("");

    if (isCreate) {
      if (!newName.trim()) return setError(L("Informe o nome completo.", "Enter the full name."));
      if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) return setError(L("Informe um e-mail válido.", "Enter a valid email."));
      if (!form.canais?.length) return setError(L("Selecione ao menos uma plataforma.", "Select at least one platform."));
      const hasOp = OPERADORAS.some(o => form[`op_${o.key}` as keyof Perfil]);
      if (!hasOp) return setError(L("Ative ao menos uma operadora.", "Enable at least one operator."));
    }

    const dupErr = checkDuplicates(
      form.cpf ?? "",
      isCreate ? newEmail : (influencer?.email ?? ""),
      form.op_blaze  ? (form.id_blaze          ?? "") : "",
      form.op_bet_nacional ? (form.id_bet_nacional  ?? "") : "",
      form.op_casa_apostas ? (form.id_casa_apostas  ?? "") : "",
    );
    if (dupErr) return setError(dupErr);

    setSaving(true);

    if (isCreate) {
      // 1. Cria usuário via Supabase Auth Admin (necessita service_role no backend ou Edge Function)
      // Por ora, insere apenas o perfil assumindo que a conta de auth já existe
      // TODO: integrar com Edge Function para criar auth user + perfil atomicamente
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const payload = { ...form, updated_at: new Date().toISOString() };
      const { error: err } = await supabase.from("influencer_perfil").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const payload = { ...form, updated_at: new Date().toISOString() };
      const { error: err } = existing
        ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer!.id)
        : await supabase.from("influencer_perfil").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: "10px", border: `1px solid ${t.inputBorder}`,
    background: t.inputBg, color: t.inputText,
    fontSize: "13px", fontFamily: FONT.body, outline: "none",
  };
  const inputRO: React.CSSProperties = { ...inputStyle, background: t.cardBg, color: t.textMuted, cursor: "default", borderColor: t.cardBorder };
  const inputDis: React.CSSProperties = { ...inputStyle, opacity: 0.5, cursor: "not-allowed", background: t.cardBg };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const req = <span style={{ color: "#e94025" }}>*</span>;

  const displayInf  = influencer ? displayName(influencer) : null;
  const currentStatus: StatusInfluencer = form.status ?? "ativo";

  const tabs: { key: typeof tab; label: string; required?: boolean }[] = [
    { key: "cadastral",   label: L("Cadastral", "Profile")   },
    { key: "canais",      label: L("Canais", "Channels"),     required: isCreate },
    { key: "financeiro",  label: L("Financeiro", "Financial") },
    { key: "operadoras",  label: L("Operadoras", "Operators"),required: isCreate },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "500px", maxHeight: "92vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
              {isCreate ? `➕ ${L("Novo Influencer", "New Influencer")}`
               : isEdit ? `✏️ ${displayInf?.name ?? ""}`
               : `👁 ${displayInf?.name ?? ""}`}
            </h2>
            {/* Status: dropdown no edit, badge estático no view */}
            {isEdit && (
              <StatusDropdown value={currentStatus} onChange={v => set("status", v)} theme={t} />
            )}
            {isView && (
              <span style={{
                fontSize: "12px", padding: "4px 12px", borderRadius: "20px", fontWeight: 700,
                border: `1.5px solid ${statusColor(currentStatus)}`,
                color: statusColor(currentStatus),
                background: `${statusColor(currentStatus)}12`,
                fontFamily: FONT.body,
              }}>
                ● {statusLabel(currentStatus)}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: t.textMuted, flexShrink: 0 }}>✕</button>
        </div>

        {!isCreate && (
          <p style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "16px" }}>
            {influencer?.email}
          </p>
        )}

        {/* View banner */}
        {isView && (
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: `${BASE_COLORS.blue}0a`, border: `1px solid ${BASE_COLORS.blue}28`, borderRadius: "10px", padding: "9px 13px", fontSize: "12px", color: BASE_COLORS.blue, fontWeight: 600, marginBottom: "16px", fontFamily: FONT.body }}>
            👁 {L("Modo visualização — nenhuma alteração pode ser feita.", "View mode — no changes can be made.")}
          </div>
        )}

        {/* Senha provisória (só criar) */}
        {isCreate && (
          <div style={{ background: `${BASE_COLORS.blue}0a`, border: `1px solid ${BASE_COLORS.blue}28`, borderRadius: "10px", padding: "10px 13px", fontSize: "12px", color: BASE_COLORS.blue, marginBottom: "16px", lineHeight: 1.5, fontFamily: FONT.body }}>
            🔑 {L("Senha provisória:", "Temporary password:")} <strong>Spingaming@{YEAR}</strong><br />
            <span style={{ opacity: 0.8 }}>{L("O influencer pode alterar em Configurações após o primeiro acesso.", "The influencer can change it in Settings after first login.")}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "#e9402510", border: "1px solid #e9402540", color: "#e94025", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "14px", fontFamily: FONT.body }}>
            ⛔ {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "18px", flexWrap: "wrap" }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => !isView && setTab(tb.key)}
              style={{ padding: "6px 13px", borderRadius: "20px", border: `1px solid ${tab === tb.key ? BASE_COLORS.purple : t.cardBorder}`, background: tab === tb.key ? `${BASE_COLORS.purple}14` : t.inputBg, color: tab === tb.key ? BASE_COLORS.purple : t.textMuted, fontSize: "12px", fontWeight: 600, cursor: isView ? "default" : "pointer", fontFamily: FONT.body }}>
              {tb.label}{tb.required && <span style={{ color: "#e94025", marginLeft: "3px", fontWeight: 900 }}>*</span>}
            </button>
          ))}
        </div>

        {/* ── Tab: Cadastral ── */}
        {tab === "cadastral" && (
          <>
            {isCreate && (
              <>
                <div style={row}>
                  <label style={labelStyle}>{L("Nome Completo", "Full Name")}{req}</label>
                  <input value={newName} onChange={e => { setNewName(e.target.value); setError(""); }} style={inputStyle} placeholder={L("Nome completo do influencer", "Influencer's full name")} />
                </div>
                <div style={row}>
                  <label style={labelStyle}>E-mail{req}</label>
                  <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setError(""); }} style={inputStyle} placeholder="email@spingaming.com.br" />
                </div>
              </>
            )}
            {!isCreate && (
              <>
                <div style={row}>
                  <label style={labelStyle}>{L("Nome Completo", "Full Name")}</label>
                  <input value={influencer?.name ?? ""} disabled style={inputDis} />
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{L("Gerenciado pelo sistema de autenticação.", "Managed by the auth system.")}</span>
                </div>
                <div style={row}>
                  <label style={labelStyle}>E-mail</label>
                  <input value={influencer?.email ?? ""} disabled style={inputDis} />
                </div>
              </>
            )}
            <div style={row}>
              <label style={labelStyle}>{L("Nome Artístico", "Stage Name")}</label>
              <input value={form.nome_artistico ?? ""} onChange={e => set("nome_artistico", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="Ex: StreamerX" />
            </div>
            <div style={row}>
              <label style={labelStyle}>{L("Telefone", "Phone")}</label>
              <input value={form.telefone ?? ""} onChange={e => set("telefone", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="(11) 99999-9999" />
            </div>
            <div style={row}>
              <label style={labelStyle}>CPF</label>
              <input value={form.cpf ?? ""} onChange={e => { set("cpf", e.target.value); setError(""); }} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="000.000.000-00" />
            </div>
          </>
        )}

        {/* ── Tab: Canais ── */}
        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>{L("Plataformas Ativas", "Active Platforms")}{isCreate && req}</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map(p => {
                  const ativo = (form.canais ?? []).includes(p);
                  return (
                    <button key={p} onClick={() => !isView && toggleCanal(p)}
                      style={{ padding: "7px 13px", borderRadius: "20px", cursor: isView ? "default" : "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}18` : t.inputBg, color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
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
                  <input value={(form[linkKey] as string) ?? ""} onChange={e => set(linkKey, e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder={`https://${c.toLowerCase()}.com/seu-canal`} />
                </div>
              );
            })}
          </>
        )}

        {/* ── Tab: Financeiro ── */}
        {tab === "financeiro" && (
          <>
            <div style={row}>
              <label style={labelStyle}>{L("Cachê por Hora (R$)", "Hourly Rate (R$)")}</label>
              <input type="number" min={0} value={form.cache_hora ?? ""} onChange={e => set("cache_hora", e.target.value ? Number(e.target.value) : undefined)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="0" />
            </div>
            <div style={row}>
              <label style={labelStyle}>{L("Chave PIX", "PIX Key")}</label>
              <input value={form.chave_pix ?? ""} onChange={e => set("chave_pix", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
            <div style={row}>
              <label style={labelStyle}>{L("Banco", "Bank")}</label>
              <input value={form.banco ?? ""} onChange={e => set("banco", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="Ex: Nubank, Itaú" />
            </div>
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px" }}>
              <div>
                <label style={labelStyle}>{L("Agência", "Branch")}</label>
                <input value={form.agencia ?? ""} onChange={e => set("agencia", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="0000" />
              </div>
              <div>
                <label style={labelStyle}>{L("Conta", "Account")}</label>
                <input value={form.conta ?? ""} onChange={e => set("conta", e.target.value)} style={isView ? inputRO : inputStyle} readOnly={isView} placeholder="00000-0" />
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
                <div key={op.key} style={{ ...row, padding: "13px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "44" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}06` : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? "12px" : 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.label}</span>
                    {!isView && (
                      <button onClick={() => set(opKey, !ativo)}
                        style={{ padding: "4px 13px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}14` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                        {ativo ? L("Ativo", "Active") : L("Inativo", "Inactive")}
                      </button>
                    )}
                    {isView && (
                      <span style={{ fontSize: "11px", fontWeight: 700, color: ativo ? "#27ae60" : t.textMuted, fontFamily: FONT.body }}>
                        {ativo ? L("✓ Ativo", "✓ Active") : L("Inativo", "Inactive")}
                      </span>
                    )}
                  </div>
                  {ativo && (
                    <div>
                      <label style={labelStyle}>ID {op.label}{isCreate && req}</label>
                      <input
                        value={(form[idKey] as string) ?? ""}
                        onChange={e => { set(idKey, e.target.value); setError(""); }}
                        style={isView ? inputRO : inputStyle}
                        readOnly={isView}
                        placeholder={`ID do influencer na ${op.label}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── Footer buttons ── */}
        {isView ? (
          <button onClick={onClose} style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.textMuted, fontSize: "13px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
            {L("Fechar", "Close")}
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: FONT.body }}>
            {saving ? "⏳" : isCreate ? L("✅ Criar Influencer", "✅ Create Influencer") : L("💾 Salvar Perfil", "💾 Save Profile")}
          </button>
        )}
      </div>
    </div>
  );
}
EOSX
echo "done"
