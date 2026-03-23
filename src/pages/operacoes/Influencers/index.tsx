import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { Operadora, InfluencerOperadora } from "../../../types";
import { Eye, EyeOff, Pencil, X } from "lucide-react";
import {
  GiMicrophone, GiPodium, GiWarPick, GiTwoCoins,
  GiPokerHand, GiCheckMark, GiShield,
} from "react-icons/gi";

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

// ─── LOGOS SVG DAS PLATAFORMAS ────────────────────────────────────────────────
import { PLATAFORMAS, PLAT_COLOR, PLAT_LOGO, PLAT_LOGO_DARK, type Plataforma } from "../../../constants/platforms";

function PlatLogo({ plataforma, size = 14, isDark }: { plataforma: string; size?: number; isDark: boolean }) {
  const [err, setErr] = useState(false);
  const p = plataforma as Plataforma;
  const src = isDark ? (PLAT_LOGO_DARK[p] ?? PLAT_LOGO[p]) : PLAT_LOGO[p];
  if (err || !src) return <span style={{ fontSize: size * 0.65, color: PLAT_COLOR[p] ?? "#fff" }}>●</span>;
  return <img src={src} alt={plataforma} width={size} height={size} onError={() => setErr(true)} style={{ display: "block", flexShrink: 0 }} />;
}

// ─── BLUR EM DADOS SENSÍVEIS ──────────────────────────────────────────────────
function SensitiveField({
  value, label, labelStyle, textStyle, editMode = false,
}: {
  value?: string; label?: string; labelStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties; editMode?: boolean;
}) {
  const [visible, setVisible] = useState(editMode);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme: t } = useApp();

  function reveal() {
    setVisible(true);
    if (!editMode) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 10000);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const display = value || "—";

  return (
    <div>
      {label && <span style={labelStyle}>{label}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          ...textStyle,
          filter: visible ? "none" : "blur(5px)",
          userSelect: visible ? "auto" : "none",
          transition: "filter 0.2s",
          cursor: visible ? "text" : "default",
        }}>
          {display}
        </span>
        <button
          onClick={() => visible ? setVisible(false) : reveal()}
          title={visible ? "Ocultar" : "Revelar dado sensível"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: t.textMuted, padding: 2, flexShrink: 0,
            display: "flex", alignItems: "center",
            opacity: 0.7,
          }}
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

// ─── STATUS ───────────────────────────────────────────────────────────────────
type StatusInfluencer = "ativo" | "inativo" | "cancelado";
const STATUS_OPTS: StatusInfluencer[] = ["ativo", "inativo", "cancelado"];
const STATUS_COLOR: Record<StatusInfluencer, string> = {
  ativo:      BRAND.verde,
  inativo:    BRAND.amarelo,
  cancelado:  BRAND.vermelho,
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
  link_discord?:    string;
  link_whatsapp?:   string;
  link_telegram?:   string;
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
  canais: [], link_twitch: "", link_youtube: "", link_kick: "", link_instagram: "", link_tiktok: "", link_discord: "", link_whatsapp: "", link_telegram: "",
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
  const { theme: t } = useApp();
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
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          zIndex: 200, minWidth: 140, overflow: "hidden",
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
  const { theme: t, user, isDark, escoposVisiveis, podeVerInfluencer, podeVerOperadora } = useApp();
  const brand = useDashboardBrand();
  const { operadoraSlugsForcado, showFiltroOperadora } = useDashboardFiltros();
  const perm = usePermission("influencers");
  const showManagementUI = user?.role !== "influencer";
  // "proprios": ações apenas em registros do escopo do usuário
  const podeEditarInf = (infId: string) =>
    perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(infId));
  // Status só pode ser alterado por Admin ou Gestor
  const podeAlterarStatus = user?.role === "admin" || user?.role === "gestor";

  const [list,           setList]           = useState<Influencer[]>([]);
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);

  const operadorasNoEscopo = operadorasList.filter((o) => podeVerOperadora(o.slug));
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
    if (!podeAlterarStatus) return; // Só Admin/Gestor podem alterar status
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
    const nomeExibicao = p?.nome_artistico?.trim() || inf.name || "";
    if (search && !(
      nomeExibicao.toLowerCase().includes(searchLower) ||
      inf.name?.toLowerCase().includes(searchLower) ||
      inf.email?.toLowerCase().includes(searchLower)
    )) return false;
    if (filterStatus !== "todos" && (p?.status ?? "ativo") !== filterStatus) return false;
    if (filterPlat !== "todas" && !(p?.canais ?? []).includes(filterPlat as Plataforma)) return false;
    if (operadoraSlugsForcado?.length) {
      const temOp = inf.operadoras?.some((o) => operadoraSlugsForcado.includes(o.operadora_slug));
      if (!temOp) return false;
    } else if (filterOp !== "todas") {
      const temOp = inf.operadoras?.some((o) => o.operadora_slug === filterOp);
      if (!temOp) return false;
    }
    const cache = p?.cache_hora ?? 0;
    if (cacheLimit < cacheMax) {
      if (cache > cacheLimit) return false;
    }
    return true;
  });

  // Base para quadros: mesmo filtro de operadora que a lista (operador vê só sua operadora)
  const listNoEscopo = list.filter((i) => {
    if (!podeVerInfluencer(i.id)) return false;
    if (operadoraSlugsForcado?.length) {
      const temOp = i.operadoras?.some((o) => operadoraSlugsForcado.includes(o.operadora_slug));
      if (!temOp) return false;
    }
    return true;
  });

  // ── CORREÇÃO 2: apenas influencers ATIVOS no escopo entram no quadro de incompletos ──
  const incompletos = listNoEscopo.filter((i) =>
    (i.perfil?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(i.perfil, i.perfil?.nome_artistico ?? i.name ?? "")
  );

  const porStatus: Record<StatusInfluencer, number> = { ativo: 0, inativo: 0, cancelado: 0 };
  const porPlat: Record<string, number> = {};
  listNoEscopo.forEach((inf) => {
    const s = inf.perfil?.status ?? "ativo";
    porStatus[s]++;
    (inf.perfil?.canais ?? []).forEach((c) => { porPlat[c] = (porPlat[c] ?? 0) + 1; });
  });

  // ── Styles ──
  const cardStyle: React.CSSProperties = {
    background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: "16px", padding: "18px 20px", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "12px", flexWrap: "wrap",
  };
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar a página de Influencers.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 48px" }}>

      {/* ── HEADER — primária ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9,
            background: brand.primaryIconBg, border: brand.primaryIconBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: brand.primaryIconColor, flexShrink: 0,
          }}>
            <GiMicrophone size={16} />
          </span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Influencers
            </h1>
            <p style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, margin: "2px 0 0" }}>
              {showManagementUI ? "Gerencie o cadastro completo dos influencers parceiros." : "Seu perfil completo na plataforma."}
            </p>
          </div>
        </div>
      </div>

      {/* Quadros resumo (quem gerencia múltiplos) */}
      {showManagementUI && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: brand.secondary, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <GiPodium size={13} style={{ color: brand.secondary }} /> Total de Influencers
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
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
              <div style={{ borderTop: `1px solid ${t.cardBorder}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
                  Por Plataforma
                </div>
                {Object.entries(porPlat).sort((a, b) => b[1] - a[1]).map(([plat, n]) => (
                  <div key={plat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: PLAT_COLOR[plat as Plataforma], fontFamily: FONT.body }}>
                      <PlatLogo plataforma={plat} size={12} isDark={isDark ?? false} /> {plat}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: brand.blockBg, border: `1px solid ${BRAND.vermelho}33`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: BRAND.vermelho, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <GiWarPick size={13} /> Perfil Incompleto
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: BRAND.vermelho, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
              {incompletos.length}
            </div>
            {incompletos.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: BRAND.verde, fontFamily: FONT.body }}>
                <GiCheckMark size={14} /> Todos os perfis ativos estão completos!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {incompletos.map((inf) => {
                  const nomeInf = inf.perfil?.nome_artistico || inf.name;
                  return podeEditarInf(inf.id) ? (
                    <button key={inf.id} onClick={() => setModal({ mode: "editar", inf })}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontSize: 13, color: BRAND.azul, fontFamily: FONT.body, textDecoration: "underline", fontWeight: 500 }}>
                      {nomeInf}
                    </button>
                  ) : (
                    <span key={inf.id} style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>{nomeInf}</span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bloco de filtros consolidado (estilo Agenda, sem carrossel) */}
      {showManagementUI && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            borderRadius: 14, border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
          }}>
            {/* Linha 1: Status / Plataforma / Operadora */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Status</span>
              {STATUS_OPTS.map((s) => {
                const active = filterStatus === s;
                const color = STATUS_COLOR[s];
                return (
                  <button key={s} onClick={() => setFilterStatus(active ? "todos" : s)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : "transparent",
                      color: active ? color : t.textMuted, fontSize: 12, fontWeight: active ? 700 : 400,
                      fontFamily: FONT.body, transition: "all 0.15s",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    {STATUS_LABEL[s]}
                    {active && <span style={{ fontSize: 9 }}>✕</span>}
                  </button>
                );
              })}
              <span style={{ width: 1, height: 16, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Plataforma</span>
              {PLATAFORMAS.map((plat) => {
                const active = filterPlat === plat;
                const color = PLAT_COLOR[plat as Plataforma] ?? "#94a3b8";
                return (
                  <button key={plat} onClick={() => setFilterPlat(active ? "todas" : plat)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : `${color}11`,
                      color: active ? color : color + "cc",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      fontFamily: FONT.body, transition: "all 0.15s",
                    }}
                  >
                    <PlatLogo plataforma={plat} size={13} isDark={isDark ?? false} />
                    {plat}
                    {active && <span style={{ fontSize: 9 }}>✕</span>}
                  </button>
                );
              })}
              {showFiltroOperadora && operadorasNoEscopo.length > 0 && (
                <>
                  <span style={{ width: 1, height: 16, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Operadora</span>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                      <GiShield size={13} />
                    </span>
                    <select value={filterOp} onChange={(e) => setFilterOp(e.target.value)}
                      style={{
                        padding: "6px 14px 6px 30px", borderRadius: 999,
                        border: `1px solid ${filterOp !== "todas" ? brand.accent : t.cardBorder}`,
                        background: filterOp !== "todas" ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}18`) : (t.inputBg ?? t.cardBg),
                        color: filterOp !== "todas" ? brand.accent : t.textMuted,
                        fontSize: 13, fontWeight: filterOp !== "todas" ? 700 : 400,
                        fontFamily: FONT.body, cursor: "pointer", outline: "none", appearance: "none",
                      }}
                    >
                      <option value="todas">Todas as operadoras</option>
                      {operadorasNoEscopo.map((o) => (
                        <option key={o.slug} value={o.slug}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Linha 2: Filtro de Cachê */}
            {cacheMax > 0 && (
              <div style={{
                paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`,
                paddingBottom: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body }}>
                    <GiTwoCoins size={13} style={{ color: brand.secondary }} /> Cachê por Hora — até
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: brand.accent, fontFamily: FONT.body }}>
                    {cacheLimit >= cacheMax ? "Todos" : formatBRL(cacheLimit) + "/h"}
                  </span>
                </div>
                <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: t.cardBorder }} />
                  <div style={{ position: "absolute", left: 0, width: `${(cacheLimit / cacheMax) * 100}%`, height: 4, borderRadius: 2, background: brand.useBrand ? "linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(90deg, ${BRAND.roxo}, ${BRAND.azul})` }} />
                  <input type="range" min={0} max={cacheMax} step={50} value={cacheLimit}
                    onChange={(e) => setCacheLimit(Number(e.target.value))}
                    style={{ position: "absolute", width: "100%", opacity: 0, cursor: "pointer", height: 20, zIndex: 2 }} />
                  <div style={{ position: "absolute", left: `calc(${(cacheLimit / cacheMax) * 100}% - 8px)`, width: 16, height: 16, borderRadius: "50%", background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>R$ 0</span>
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{formatBRL(cacheMax)}/h</span>
                </div>
              </div>
            )}

            {/* Linha 3: Barra de Pesquisa */}
            <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Buscar por nome artístico ou e-mail..."
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 16px",
                  borderRadius: 12, border: `1px solid ${t.cardBorder}`,
                  background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13,
                  fontFamily: FONT.body, outline: "none",
                }}
              />
            </div>

            {(filterStatus !== "todos" || filterPlat !== "todas" || filterOp !== "todas" || search || (cacheMax > 0 && cacheLimit < cacheMax)) && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => { setFilterStatus("todos"); setFilterPlat("todas"); setFilterOp("todas"); setSearch(""); setCacheLimit(cacheMax); }}
                  style={{
                    padding: "5px 14px", borderRadius: 999,
                    border: `1px solid ${BRAND.vermelho}44`,
                    background: `${BRAND.vermelho}11`,
                    color: BRAND.vermelho, fontSize: 12, fontWeight: 600,
                    fontFamily: FONT.body, cursor: "pointer",
                  }}
                >
                  ✕ Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contador */}
      {!loading && showManagementUI && (
        <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body, marginBottom: "14px" }}>
          <span style={{ color: brand.accent, fontWeight: 700 }}>{filtered.length}</span> influencer(s)
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body }}>
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 16, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
          Nenhum influencer encontrado.
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
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FONT.body,
                }}>
                  {((p?.nome_artistico || inf.name) || inf.email)[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: "16px", rowGap: "8px",
                    flexWrap: "wrap", marginBottom: "10px",
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                      {p?.nome_artistico || inf.name}
                    </span>
                    <StatusBadge value={status} onChange={(v) => handleStatusChange(inf.id, v)} readonly={!podeAlterarStatus} />
                    {incompleto && status === "ativo" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 9px", borderRadius: 20, background: `${BRAND.vermelho}22`, color: BRAND.vermelho, fontWeight: 600, fontFamily: FONT.body }}>
                        <GiWarPick size={10} /> Perfil incompleto
                      </span>
                    )}
                  </div>
                  {p?.cache_hora && p.cache_hora > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 5 }}>
                      <GiTwoCoins size={12} style={{ color: brand.secondary }} /> {formatBRL(p.cache_hora)}/h
                    </div>
                  )}
                  {canais.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                      {canais.map((c) => {
                        const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                        const content = (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: PLAT_COLOR[c], fontFamily: FONT.body }}>
                            <PlatLogo plataforma={c} size={12} isDark={isDark ?? false} /> {c}
                            {link && <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>}
                          </span>
                        );
                        return link ? (
                          <a key={c} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                            {content}
                          </a>
                        ) : <span key={c}>{content}</span>;
                      })}
                    </div>
                  )}
                  {opsAtivas.length > 0 && user?.role !== "operador" && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {opsAtivas.map((o) => (
                        <span key={o.operadora_slug} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 9px", borderRadius: 20, background: `${BRAND.amarelo}22`, color: BRAND.amarelo, fontWeight: 600, fontFamily: FONT.body }}>
                          <GiPokerHand size={11} /> {o.operadora_nome ?? o.operadora_slug}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => setModal({ mode: "visualizar", inf })} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 10,
                  border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg,
                  color: t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
                }}>
                  <Eye size={13} /> Ver
                </button>
                {podeEditarInf(inf.id) && (
                  <button onClick={() => setModal({ mode: "editar", inf })} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: brand.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
                    color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body,
                  }}>
                    <Pencil size={13} /> Editar
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
          isDark={isDark}
          brand={brand}
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
          isDark={isDark}
          brand={brand}
        />
      )}
    </div>
  );
}

// ─── Modal Visualizar ─────────────────────────────────────────────────────────
function ModalVisualizar({ influencer, operadorasList, onClose, isDark, brand }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; isDark?: boolean;
  brand?: ReturnType<typeof useDashboardBrand>;
}) {
  const { theme: t } = useApp();
  const b = brand ?? { blockBg: t.cardBg, accent: "#7c3aed", secondary: "#7c3aed", useBrand: false };
  const p = influencer.perfil;
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
  ];

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: 14 };
  const val = (v?: string | number) => (
    <span style={{ fontSize: "13px", color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>
      {v || "—"}
    </span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: b.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {p?.nome_artistico || influencer.name}
              </h2>
              {p?.status && <StatusBadge value={p.status} onChange={() => {}} readonly />}
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: b.useBrand ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)" : `${BRAND.azul}0d`, border: `1px solid ${b.useBrand ? "color-mix(in srgb, var(--brand-accent) 20%, transparent)" : `${BRAND.azul}30`}`, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 18 }}>
          <Eye size={13} style={{ color: b.accent, flexShrink: 0 }} />
          <span>Modo visualização — somente leitura. Dados sensíveis protegidos.</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${tab === tb.key ? b.accent : t.cardBorder}`, background: tab === tb.key ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}22`) : (t.inputBg ?? t.cardBg), color: tab === tb.key ? b.accent : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "cadastral" && (
          <>
            <div style={row}><label style={labelStyle}>Nome Completo</label>{val(p?.nome_completo)}</div>
            <div style={row}><label style={labelStyle}>Nome Artístico</label>{val(p?.nome_artistico ?? influencer.name)}</div>
            <div style={row}><label style={labelStyle}>E-mail</label>{val(influencer.email)}</div>
            <div style={row}><label style={labelStyle}>Telefone</label>{val(p?.telefone)}</div>
            <div style={row}>
              <SensitiveField value={p?.cpf} label="CPF" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
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
                  const inner = (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, border: `2px solid ${PLAT_COLOR[c]}`, background: `${PLAT_COLOR[c]}18`, color: PLAT_COLOR[c], fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                      <PlatLogo plataforma={c} size={13} isDark={isDark ?? false} /> {c}
                      {link && <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>}
                    </span>
                  );
                  return link ? (
                    <a key={c} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>
                  ) : <span key={c}>{inner}</span>;
                })
              )}
            </div>
          </div>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}><label style={labelStyle}>Cachê por Hora</label>{val(p?.cache_hora ? formatBRL(p.cache_hora) : "")}</div>
            <div style={row}>
              <SensitiveField value={p?.chave_pix} label="Chave PIX" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div style={row}>
              <SensitiveField value={p?.banco} label="Banco" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <SensitiveField value={p?.agencia} label="Agência" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
              <SensitiveField value={p?.conta} label="Conta" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
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
                  <div key={op.slug} style={{ marginBottom: 14, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 35%, transparent)" : BRAND.roxoVivo + "55") : t.cardBorder}`, background: ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)" : `${BRAND.roxoVivo}08`) : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <GiPokerHand size={13} style={{ color: BRAND.amarelo }} /> {op.nome}
                      </span>
                      <span style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${ativo ? b.accent : t.cardBorder}`, background: ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}22`) : (t.inputBg ?? t.cardBg), color: ativo ? b.accent : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
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

function ModalPerfil({ influencer, operadorasList, onClose, onSaved, isDark, brand }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; onSaved: () => void; isDark?: boolean;
  brand?: ReturnType<typeof useDashboardBrand>;
}) {
  const { theme: t, user } = useApp();
  const b = brand ?? { blockBg: t.cardBg, accent: "#7c3aed", useBrand: false };
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
    borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg, color: t.text,
    fontSize: 13, fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: React.CSSProperties = { marginBottom: 14 };
  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: b.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {form.nome_artistico?.trim() || influencer.name}
              </h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} readonly={!podeAlterarStatusCache} />
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${tab === tb.key ? b.accent : t.cardBorder}`, background: tab === tb.key ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}22`) : (t.inputBg ?? t.cardBg), color: tab === tb.key ? b.accent : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}>
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            {error}
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
              <label style={labelStyle}>CPF <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label>
              <input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.1em" }} placeholder="000.000.000-00" />
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
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 20, cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg), color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                      <PlatLogo plataforma={p} size={13} isDark={isDark ?? false} /> {p}
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
                    Link {c} <span style={{ color: BRAND.vermelho }}>*</span>
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
            {[
              { key: "chave_pix" as keyof Perfil, label: "Chave PIX", placeholder: "CPF, e-mail, telefone ou chave aleatória" },
              { key: "banco"     as keyof Perfil, label: "Banco",     placeholder: "Ex: Nubank, Itaú, Bradesco" },
            ].map(({ key, label, placeholder }) => (
              <div key={key as string} style={row}>
                <label style={labelStyle}>{label} <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label>
                <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={inputStyle} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { key: "agencia" as keyof Perfil, label: "Agência", placeholder: "0000" },
                { key: "conta"   as keyof Perfil, label: "Conta",   placeholder: "00000-0" },
              ].map(({ key, label, placeholder }) => (
                <div key={key as string}>
                  <label style={labelStyle}>{label} <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(sensível)</span></label>
                  <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={inputStyle} placeholder={placeholder} />
                </div>
              ))}
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
                  <div key={op.slug} style={{ ...row, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 35%, transparent)" : BRAND.roxoVivo + "55") : t.cardBorder}`, background: ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)" : `${BRAND.roxoVivo}08`) : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? 12 : 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <GiPokerHand size={13} style={{ color: BRAND.amarelo }} /> {op.nome}
                      </span>
                      <button onClick={() => setOp(op.slug, { ativo: !ativo })}
                        style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${ativo ? b.accent : t.cardBorder}`, background: ativo ? (b.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}22`) : (t.inputBg ?? t.cardBg), color: ativo ? b.accent : t.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                    {ativo && (
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body }}>
                          ID {op.nome} <span style={{ color: BRAND.vermelho }}>*</span>
                        </label>
                        <input
                          value={st.id_operadora}
                          onChange={(e) => setOp(op.slug, { id_operadora: e.target.value })}
                          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontFamily: FONT.body, outline: "none" }}
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
          style={{ width: "100%", marginTop: 8, padding: 13, borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: b.useBrand ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {saving ? "Salvando..." : "Salvar Perfil"}
        </button>
      </div>
    </div>
  );
}
