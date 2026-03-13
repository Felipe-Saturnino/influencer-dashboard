import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import type { Operadora, InfluencerOperadora } from "../../../types";

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
  nome_completo?:   string;
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
}

interface Influencer {
  id:         string;
  name:       string;
  email:      string;
  perfil:     Perfil | null;
  operadoras: InfluencerOperadora[];
}

const emptyPerfil = (id: string): Perfil => ({
  id, nome_artistico: "", nome_completo: "", status: "ativo", telefone: "", cpf: "",
  canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "",
  cache_hora: 0, banco: "", agencia: "", conta: "", chave_pix: "",
});

// ─── Moeda BRL ────────────────────────────────────────────────────────────────
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function maskBRL(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const num    = parseInt(digits, 10) / 100;
  return formatBRL(num);
}

// Input de moeda controlado
function CurrencyInput({
  value, onChange, style, placeholder, disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [display, setDisplay] = useState(value > 0 ? formatBRL(value) : "");

  useEffect(() => {
    setDisplay(value > 0 ? formatBRL(value) : "");
  }, [value]);

  if (disabled) {
    return (
      <input
        type="text"
        value={value > 0 ? formatBRL(value) : ""}
        readOnly
        disabled
        style={{ ...style, opacity: 0.8, cursor: "not-allowed" }}
      />
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder ?? "R$ 0,00"}
      onChange={(e) => {
        const masked = maskBRL(e.target.value);
        setDisplay(masked);
        onChange(parseBRL(masked));
      }}
      onFocus={(e) => {
        if (!display) setDisplay(formatBRL(0));
        e.target.select();
      }}
      onBlur={() => {
        if (value === 0) setDisplay("");
      }}
      style={style}
    />
  );
}

// ─── isPerfilIncompleto ───────────────────────────────────────────────────────
function isPerfilIncompleto(perfil: Perfil | null, name: string): boolean {
  if (!perfil) return true;
  if (!name?.trim())                    return true;
  if (!perfil.nome_completo?.trim())    return true;
  if (!perfil.telefone?.trim())         return true;
  if (!perfil.cpf?.trim())              return true;
  if (!perfil.cache_hora || perfil.cache_hora <= 0) return true;
  if (!perfil.chave_pix?.trim())        return true;
  if (!perfil.banco?.trim())            return true;
  if (!perfil.agencia?.trim())          return true;
  if (!perfil.conta?.trim())            return true;
  return false;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  value:     StatusInfluencer;
  onChange:  (v: StatusInfluencer) => void;
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
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "9px 14px", border: "none",
                background: s === value ? `${STATUS_COLOR[s]}18` : "transparent",
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

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Influencers() {
  const { theme: t, user, escoposVisiveis, podeVerInfluencer } = useApp();
  const perm = usePermission("influencers");
  const showManagementUI = user?.role !== "influencer";
  // "proprios": ações apenas em registros do escopo do usuário
  const podeEditarInf = (infId: string) =>
    perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(infId));

  const [list,           setList]           = useState<Influencer[]>([]);
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);

  const operadorasNoEscopo = escoposVisiveis.operadorasVisiveis.length === 0
    ? operadorasList
    : operadorasList.filter((o) => escoposVisiveis.operadorasVisiveis.includes(o.slug));
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState<{ mode: "visualizar" | "editar"; inf?: Influencer } | null>(null);

  // Filtros
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState<string>("todos");
  const [filterPlat,    setFilterPlat]    = useState<string>("todas");
  const [filterOp,      setFilterOp]      = useState<string>("todas");
  const [cacheMax,      setCacheMax]      = useState(0);
  const [cacheLimit,    setCacheLimit]    = useState(0);

  async function loadData() {
    setLoading(true);
    const { data: opsList } = await supabase.from("operadoras").select("*").order("nome");
    setOperadorasList(opsList ?? []);
    const opsMap = Object.fromEntries((opsList ?? []).map((o: Operadora) => [o.slug, o.nome]));

    if (showManagementUI) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, name, email").eq("role", "influencer").order("name");
      if (profiles) {
        const ids = profiles.map((p: any) => p.id);
        const [perfisRes, opsRes] = await Promise.all([
          ids.length > 0 ? supabase.from("influencer_perfil").select("*").in("id", ids) : { data: [] },
          ids.length > 0 ? supabase.from("influencer_operadoras").select("*").in("influencer_id", ids) : { data: [] },
        ]);
        const perfisMap: Record<string, Perfil> = {};
        (perfisRes.data ?? []).forEach((p: Perfil) => { perfisMap[p.id] = p; });
        const opsPorInf: Record<string, InfluencerOperadora[]> = {};
        (opsRes.data ?? []).forEach((o: InfluencerOperadora) => {
          if (!opsPorInf[o.influencer_id]) opsPorInf[o.influencer_id] = [];
          opsPorInf[o.influencer_id].push({ ...o, operadora_nome: opsMap[o.operadora_slug] ?? o.operadora_nome });
        });
        const mapped = profiles.map((p: any) => ({
          id: p.id,
          name: p.name ?? p.email,
          email: p.email,
          perfil: perfisMap[p.id] ?? null,
          operadoras: opsPorInf[p.id] ?? [],
        }));
        setList(mapped);

        const caches = mapped
          .map((i: Influencer) => i.perfil?.cache_hora ?? 0)
          .filter((v: number) => v > 0);
        if (caches.length > 0) {
          const mx = Math.max(...caches);
          setCacheMax(mx);
          setCacheLimit(mx);
        } else {
          setCacheMax(5000);
          setCacheLimit(5000);
        }
      }
    } else {
      if (!user) return;
      const [perfilRes, opsRes] = await Promise.all([
        supabase.from("influencer_perfil").select("*").eq("id", user.id).single(),
        supabase.from("influencer_operadoras").select("*").eq("influencer_id", user.id),
      ]);
      const perfil = perfilRes.data ?? null;
      const operadoras = ((opsRes.data ?? []) as InfluencerOperadora[]).map((o) => ({
        ...o,
        operadora_nome: opsMap[o.operadora_slug] ?? o.operadora_nome,
      }));
      setList([{
        id: user.id,
        name: user.name,
        email: user.email,
        perfil,
        operadoras,
      }]);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // ── CORREÇÃO 1: upsert com await para garantir persistência do status ──
  async function handleStatusChange(infId: string, newStatus: StatusInfluencer) {
    // Atualiza estado local imediatamente (UX responsiva)
    setList((prev) =>
      prev.map((i) =>
        i.id === infId
          ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(i.id)), status: newStatus } }
          : i
      )
    );

    // Upsert garante que o registro seja criado caso ainda não exista
    const { error } = await supabase
      .from("influencer_perfil")
      .upsert({ id: infId, status: newStatus }, { onConflict: "id" });

    if (error) {
      console.error("[Influencers] Erro ao salvar status:", error.message);
    }
  }

  const filtered = list.filter((inf) => {
    if (!podeVerInfluencer(inf.id)) return false;
    const p = inf.perfil;
    const searchLower = search.toLowerCase();
    if (search && !(
      inf.name?.toLowerCase().includes(searchLower) ||
      inf.email?.toLowerCase().includes(searchLower)
    )) return false;
    if (filterStatus !== "todos" && (p?.status ?? "ativo") !== filterStatus) return false;
    if (filterPlat !== "todas" && !(p?.canais ?? []).includes(filterPlat as Plataforma)) return false;
    if (filterOp !== "todas") {
      const temOp = inf.operadoras?.some((o) => o.operadora_slug === filterOp);
      if (!temOp) return false;
    }
    const cache = p?.cache_hora ?? 0;
    if (cacheLimit < cacheMax) {
      if (cache > cacheLimit) return false;
    }
    return true;
  });

  // ── CORREÇÃO 2: apenas influencers ATIVOS no escopo entram no quadro de incompletos ──
  const incompletos = list.filter((i) =>
    podeVerInfluencer(i.id) &&
    (i.perfil?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(i.perfil, i.name)
  );

  const listNoEscopo = list.filter((i) => podeVerInfluencer(i.id));
  const porStatus: Record<StatusInfluencer, number> = { ativo: 0, inativo: 0, cancelado: 0 };
  const porPlat: Record<string, number> = {};
  listNoEscopo.forEach((inf) => {
    const s = inf.perfil?.status ?? "ativo";
    porStatus[s]++;
    (inf.perfil?.canais ?? []).forEach((c) => { porPlat[c] = (porPlat[c] ?? 0) + 1; });
  });

  // ── Styles ──
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
  const selectStyle: React.CSSProperties = {
    flex: 1, padding: "8px 12px", borderRadius: "10px",
    border: `1px solid ${t.inputBorder}`, background: t.inputBg,
    color: t.inputText, fontSize: "12px", fontFamily: FONT.body,
    cursor: "pointer", outline: "none",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a página de Influencers.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 900, color: t.text, fontFamily: FONT.title, margin: "0 0 6px" }}>
            👥 Influencers
          </h1>
          <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
            {showManagementUI
              ? "Gerencie o cadastro completo dos influencers parceiros."
              : "Seu perfil completo na plataforma."}
          </p>
        </div>
      </div>

      {/* Quadros resumo (quem gerencia múltiplos) */}
      {showManagementUI && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: t.label, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
              📊 Total de Influencers
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: t.text, fontFamily: FONT.title, marginBottom: "12px" }}>
              {listNoEscopo.length}
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

          <div style={{ background: t.cardBg, border: `1px solid #e9402533`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#e94025", letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: "6px" }}>
              ⚠️ Perfil Incompleto
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#e94025", fontFamily: FONT.title, marginBottom: "12px" }}>
              {incompletos.length}
            </div>
            {incompletos.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body, margin: 0 }}>
                ✅ Todos os perfis ativos estão completos!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {incompletos.map((inf) =>
                  podeEditarInf(inf.id) ? (
                    <button key={inf.id} onClick={() => setModal({ mode: "editar", inf })}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontSize: "13px", color: BASE_COLORS.blue, fontFamily: FONT.body, textDecoration: "underline", fontWeight: 500 }}>
                      {inf.name}
                    </button>
                  ) : (
                    <span key={inf.id} style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>{inf.name}</span>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Busca e filtros */}
      {showManagementUI && (
        <>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome artístico ou e-mail..."
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 16px",
              borderRadius: "12px", border: `1px solid ${t.inputBorder}`,
              background: t.inputBg, color: t.inputText, fontSize: "13px",
              fontFamily: FONT.body, outline: "none", marginBottom: "10px",
            }}
          />

          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="todos">Todos os status</option>
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <select value={filterPlat} onChange={(e) => setFilterPlat(e.target.value)} style={selectStyle}>
              <option value="todas">Todas as plataformas</option>
              {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)} style={selectStyle}>
              <option value="todas">Todas as operadoras</option>
              {operadorasNoEscopo.map((o) => (
                <option key={o.slug} value={o.slug}>{o.nome}</option>
              ))}
            </select>
          </div>

          {cacheMax > 0 && (
            <div style={{
              background: t.cardBg, border: `1px solid ${t.cardBorder}`,
              borderRadius: "12px", padding: "14px 18px", marginBottom: "16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: t.label, fontFamily: FONT.body }}>
                  💰 Cachê por Hora — até
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: BASE_COLORS.purple, fontFamily: FONT.body }}>
                  {cacheLimit >= cacheMax ? "Todos" : formatBRL(cacheLimit) + "/h"}
                </span>
              </div>
              <div style={{ position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, right: 0, height: "4px", borderRadius: "2px", background: t.cardBorder }} />
                <div style={{
                  position: "absolute", left: 0,
                  width: `${(cacheLimit / cacheMax) * 100}%`,
                  height: "4px", borderRadius: "2px",
                  background: `linear-gradient(90deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
                }} />
                <input
                  type="range"
                  min={0} max={cacheMax} step={50}
                  value={cacheLimit}
                  onChange={(e) => setCacheLimit(Number(e.target.value))}
                  style={{
                    position: "absolute", width: "100%",
                    opacity: 0, cursor: "pointer", height: "20px", zIndex: 2,
                  }}
                />
                <div style={{
                  position: "absolute",
                  left: `calc(${(cacheLimit / cacheMax) * 100}% - 8px)`,
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
                  border: "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  pointerEvents: "none", zIndex: 3,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>R$ 0</span>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{formatBRL(cacheMax)}/h</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Contador */}
      {!loading && showManagementUI && (
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
          const p          = inf.perfil;
          const canais     = p?.canais ?? [];
          const opsAtivas  = (inf.operadoras ?? []).filter((o) => o.ativo);
          const incompleto = isPerfilIncompleto(p, inf.name);
          const status: StatusInfluencer = p?.status ?? "ativo";
          return (
            <div key={inf.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "16px", fontFamily: FONT.body,
                }}>
                  {(inf.name || inf.email)[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: "16px", rowGap: "8px",
                    flexWrap: "wrap", marginBottom: "10px",
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                      {inf.name}
                    </span>
                    <StatusBadge value={status} onChange={(v) => handleStatusChange(inf.id, v)} readonly={!podeEditarInf(inf.id)} />
                    {incompleto && status === "ativo" && (
                      <span style={badge("#e94025")}>⚠️ Perfil incompleto</span>
                    )}
                  </div>
                  {p?.cache_hora && p.cache_hora > 0 ? (
                    <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "6px" }}>
                      💰 {formatBRL(p.cache_hora)}/h
                    </div>
                  ) : null}
                  {canais.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                      {canais.map((c) => {
                        const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                        return link ? (
                          <a key={c}
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank" rel="noopener noreferrer"
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
                        <span key={o.operadora_slug} style={badge("#f39c12")}>🎰 {o.operadora_nome ?? o.operadora_slug}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button onClick={() => setModal({ mode: "visualizar", inf })}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.label, fontSize: "12px", fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                  👁️ Ver
                </button>
                {podeEditarInf(inf.id) && (
                  <button onClick={() => setModal({ mode: "editar", inf })}
                    style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${BASE_COLORS.purple}, ${BASE_COLORS.blue})`, color: "#fff", fontSize: "12px", fontWeight: 700, fontFamily: FONT.body }}>
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {modal?.mode === "visualizar" && modal.inf && (
        <ModalVisualizar
          influencer={modal.inf}
          operadorasList={operadorasNoEscopo.filter((o) =>
            (modal.inf!.operadoras ?? []).some((op) => op.operadora_slug === o.slug)
          )}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "editar" && modal.inf && (
        <ModalPerfil
          influencer={modal.inf}
          operadorasList={operadorasNoEscopo.filter((o) =>
            (modal.inf!.operadoras ?? []).some((op) => op.operadora_slug === o.slug)
          )}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Modal Visualizar ─────────────────────────────────────────────────────────
function ModalVisualizar({
  influencer, operadorasList, onClose,
}: { influencer: Influencer; operadorasList: Operadora[]; onClose: () => void }) {
  const { theme: t } = useApp();
  const p = influencer.perfil;
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
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
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
                {influencer.name}
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
            <div style={row}><label style={labelStyle}>Nome Completo</label>{val(p?.nome_completo)}</div>
            <div style={row}><label style={labelStyle}>Nome Artístico</label>{val(influencer.name)}</div>
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
                    <a key={c}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank" rel="noopener noreferrer"
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
            <div style={row}><label style={labelStyle}>Cachê por Hora</label>{val(p?.cache_hora ? formatBRL(p.cache_hora) : "")}</div>
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
            {operadorasList.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma operadora cadastrada na plataforma.</p>
            ) : (
              operadorasList.map((op) => {
                const vinculo = influencer.operadoras?.find((o) => o.operadora_slug === op.slug);
                const ativo = !!vinculo?.ativo;
                const id = vinculo?.id_operadora;
                return (
                  <div key={op.slug} style={{ marginBottom: "14px", padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.nome}</span>
                      <span style={{ padding: "4px 12px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    {ativo && id && <div style={{ marginTop: "8px", fontSize: "13px", color: t.text, fontFamily: FONT.body }}>ID: {id}</div>}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
type OperadorasFormState = Record<string, { ativo: boolean; id_operadora: string }>;

function ModalPerfil({
  influencer, operadorasList, onClose, onSaved,
}: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; onSaved: () => void;
}) {
  const { theme: t, user } = useApp();
  const existing = influencer.perfil;
  // Status e Cachê somente Gestores e Admin podem alterar
  const podeAlterarStatusCache = user?.role === "admin" || user?.role === "gestor";

  const inicialOperadoras: OperadorasFormState = {};
  (influencer.operadoras ?? []).forEach((o) => {
    inicialOperadoras[o.operadora_slug] = {
      ativo: o.ativo,
      id_operadora: o.id_operadora ?? "",
    };
  });

  const [editNomeCompleto, setEditNomeCompleto] = useState(influencer.perfil?.nome_completo ?? "");
  const [form,           setForm]           = useState<Perfil>(existing ?? emptyPerfil(influencer.id));
  const [operadorasForm, setOperadorasForm] = useState<OperadorasFormState>(inicialOperadoras);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [tab,            setTab]            = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const setOp = (slug: string, patch: Partial<{ ativo: boolean; id_operadora: string }>) => {
    setOperadorasForm((prev) => {
      const cur = prev[slug] ?? { ativo: false, id_operadora: "" };
      return { ...prev, [slug]: { ...cur, ...patch } };
    });
  };

  const toggleCanal = (c: Plataforma) => {
    const cur = form.canais ?? [];
    set("canais", cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]);
  };

  async function handleSave() {
    setError("");

    const temCanalSemLink = (form.canais ?? []).some((c) => {
      const link = form[`link_${c.toLowerCase()}` as keyof Perfil] as string;
      return !link?.trim();
    });
    if (temCanalSemLink) return setError("Preencha o link de cada canal selecionado.");

    const opsAtivas = Object.entries(operadorasForm).filter(([_, st]) => st.ativo);
    const temOpSemId = opsAtivas.some(([_, st]) => !st.id_operadora?.trim());
    if (temOpSemId) return setError("Preencha o ID de cada operadora ativa.");

    setSaving(true);

    if (form.nome_artistico?.trim()) {
      await supabase.from("profiles").update({ name: form.nome_artistico.trim() }).eq("id", influencer.id);
    }

    const payload = {
      ...form,
      nome_completo: editNomeCompleto.trim(),
      updated_at: new Date().toISOString(),
    };
    // Impede alteração de status e cache por usuários sem permissão (backend defense)
    if (!podeAlterarStatusCache && existing) {
      payload.status = existing.status ?? "ativo";
      payload.cache_hora = existing.cache_hora ?? 0;
    }
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer.id)
      : await supabase.from("influencer_perfil").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }

    const slugsValidos = new Set(operadorasList.map((o) => o.slug));
    await supabase.from("influencer_operadoras").delete().eq("influencer_id", influencer.id);
    for (const [slug, st] of opsAtivas) {
      if (slugsValidos.has(slug) && st.id_operadora?.trim()) {
        await supabase.from("influencer_operadoras").insert({
          influencer_id: influencer.id,
          operadora_slug: slug,
          id_operadora: st.id_operadora.trim(),
          ativo: true,
        });
      }
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
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: "14px" };
  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: t.text, fontFamily: FONT.title }}>
                {form.nome_artistico?.trim() || influencer.name}
              </h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} readonly={!podeAlterarStatusCache} />
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
              <label style={labelStyle}>Nome Artístico</label>
              <input value={form.nome_artistico ?? ""} onChange={(e) => set("nome_artistico", e.target.value)} style={inputStyle} placeholder="Ex: NeryXLS" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Nome Completo</label>
              <input value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} style={inputStyle} placeholder="Nome completo (nome real)" />
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
                  <label style={labelStyle}>
                    Link {c} <span style={{ color: "#e94025", marginLeft: "3px" }}>*</span>
                  </label>
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
              <label style={labelStyle}>Cachê por Hora (R$) {!podeAlterarStatusCache && <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 400 }}>(somente Gestor/Admin)</span>}</label>
              <CurrencyInput value={form.cache_hora ?? 0} onChange={(v) => set("cache_hora", Math.max(0, v))} style={inputStyle} disabled={!podeAlterarStatusCache} />
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
            {operadorasList.length === 0 ? (
              <p style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma operadora cadastrada. Acesse Gestão de Operadoras primeiro.</p>
            ) : (
              operadorasList.map((op) => {
                const st = operadorasForm[op.slug] ?? { ativo: false, id_operadora: "" };
                const ativo = st.ativo;
                return (
                  <div key={op.slug} style={{ ...row, padding: "14px", borderRadius: "12px", border: `1px solid ${ativo ? BASE_COLORS.purple + "55" : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}08` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? "12px" : 0 }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>🎰 {op.nome}</span>
                      <button onClick={() => setOp(op.slug, { ativo: !ativo })}
                        style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${ativo ? BASE_COLORS.purple : t.cardBorder}`, background: ativo ? `${BASE_COLORS.purple}22` : t.inputBg, color: ativo ? BASE_COLORS.purple : t.textMuted, fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                    {ativo && (
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.label, marginBottom: "5px", fontFamily: FONT.body }}>
                          ID {op.nome} <span style={{ color: "#e94025" }}>*</span>
                        </label>
                        <input
                          value={st.id_operadora}
                          onChange={(e) => setOp(op.slug, { id_operadora: e.target.value })}
                          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.inputText, fontSize: "13px", fontFamily: FONT.body, outline: "none" }}
                          placeholder={`ID do influencer na ${op.nome}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
