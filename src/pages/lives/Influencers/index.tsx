import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { Operadora, InfluencerOperadora } from "../../../types";
import {
  Eye, EyeOff, Pencil, X, ChevronDown, Loader2, Shield,
  Mic, Users, AlertCircle, CheckCircle, Coins, Building2,
} from "lucide-react";
import OperadoraTag from "../../../components/OperadoraTag";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { PlatLogo } from "../../../components/PlatLogo";
import { CurrencyInput } from "../../../components/CurrencyInput";
import { DashboardPageHeader, SelectComIcone } from "../../../components/dashboard";

// ─── LOGOS SVG DAS PLATAFORMAS ────────────────────────────────────────────────
import { PLATAFORMAS, PLAT_COLOR, type Plataforma } from "../../../constants/platforms";

// ─── BLUR EM DADOS SENSÍVEIS ──────────────────────────────────────────────────
function SensitiveField({
  value, label, labelStyle, textStyle, editMode = false,
}: {
  value?: string;   label?: string; labelStyle?: CSSProperties;
  textStyle?: CSSProperties; editMode?: boolean;
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
          type="button"
          onClick={() => visible ? setVisible(false) : reveal()}
          aria-label={visible ? `Ocultar ${label ?? "dado sensível"}` : `Revelar ${label ?? "dado sensível"}`}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: t.textMuted, padding: 2, flexShrink: 0,
            display: "flex", alignItems: "center",
            opacity: 0.7,
          }}
        >
          {visible ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
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
  created_at?:      string;
  updated_at?:      string;
  status_alterado_em?: string;
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
        type="button"
        onClick={() => { if (!readonly) setOpen((o) => !o); }}
        {...(!readonly ? { "aria-haspopup": "menu" as const, "aria-expanded": open } : {})}
        aria-label={`Status: ${STATUS_LABEL[value]}`}
        style={{
          padding: "4px 12px", borderRadius: "20px",
          border: `1.5px solid ${color}`, background: `${color}18`, color,
          fontSize: "12px", fontWeight: 700, fontFamily: FONT.body,
          cursor: readonly ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: "5px",
        }}
      >
        {STATUS_LABEL[value]}
        {!readonly && <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>
      {open && (
        <div
          role="menu"
          style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          zIndex: 200, minWidth: 140, overflow: "hidden",
        }}
        >
          {STATUS_OPTS.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => { onChange(s); setOpen(false); }}
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
  const { theme: t, user, isDark, escoposVisiveis: _escoposVisiveis, podeVerInfluencer, podeVerOperadora } = useApp();
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
  /** Sem cor salva: omitir — `OperadoraTag` aplica `--brand-action` via color-mix (não passar `var()` aqui: quebraria o sufixo `18` do componente). */
  const opsColorMap = Object.fromEntries(
    operadorasList.map((o) => [o.slug, o.brand_action?.trim() || undefined])
  );
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState<{ mode: "visualizar" | "editar"; inf?: Influencer } | null>(null);

  // Filtros
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState<string>("todos");
  const [filterPlat,    setFilterPlat]    = useState<string>("todas");
  const [filterOp,      setFilterOp]      = useState<string>("todas");
  const [cacheMax,      setCacheMax]      = useState(5000);
  const [cacheLimit,    setCacheLimit]    = useState(5000);
  const [statusError,   setStatusError]   = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: opsList } = await supabase.from("operadoras").select("*").order("nome");
    setOperadorasList(opsList ?? []);
    const opsMap = Object.fromEntries((opsList ?? []).map((o: Operadora) => [o.slug, o.nome]));

    if (showManagementUI) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, name, email").eq("role", "influencer").order("name");
      if (profiles) {
        const ids = profiles.map((p: { id: string }) => p.id);
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
        const mapped = profiles.map((p: { id: string; name?: string | null; email?: string | null }) => ({
          id: p.id,
          name: p.name ?? p.email ?? "",
          email: p.email ?? "",
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
  }, [showManagementUI, user]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleStatusChange(infId: string, newStatus: StatusInfluencer) {
    if (!podeAlterarStatus) return;
    const previousStatus = list.find((i) => i.id === infId)?.perfil?.status;

    const agoraIso = new Date().toISOString();
    setList((prev) =>
      prev.map((i) =>
        i.id === infId
          ? {
              ...i,
              perfil: {
                ...(i.perfil ?? emptyPerfil(i.id)),
                status: newStatus,
                ...(previousStatus !== newStatus ? { status_alterado_em: agoraIso } : {}),
              },
            }
          : i
      )
    );

    const upsertPatch: Record<string, unknown> = { id: infId, status: newStatus };
    if (previousStatus !== newStatus) upsertPatch.status_alterado_em = agoraIso;

    const { error } = await supabase
      .from("influencer_perfil")
      .upsert(upsertPatch, { onConflict: "id" });

    if (error) {
      setList((prev) =>
        prev.map((i) =>
          i.id === infId
            ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(i.id)), status: previousStatus ?? "ativo" } }
            : i
        )
      );
      setStatusError("Erro ao salvar status. Tente novamente.");
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

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const ctaGradient = "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";
  const sliderTrackGradient = "linear-gradient(90deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";
  const sliderThumbGradient = "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";

  // ── Styles ──
  const cardStyle: CSSProperties = {
    background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 18, padding: "18px 20px", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: "12px", flexWrap: "wrap",
    boxShadow: cardShadow,
  };
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      <DashboardPageHeader
        icon={<Mic size={14} aria-hidden="true" />}
        title="Influencers"
        subtitle={showManagementUI ? "Gerencie o cadastro completo dos influencers parceiros." : "Seu perfil completo na plataforma."}
        brand={brand}
        t={t}
      />

      {/* Quadros resumo (quem gerencia múltiplos) */}
      {showManagementUI && (
        <div className="app-grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: brand.secondary, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <Users size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Total de Influencers
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
              {listNoEscopo.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {STATUS_OPTS.map((s) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{STATUS_LABEL[s]}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: STATUS_COLOR[s], fontFamily: FONT.body }}>{porStatus[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: brand.blockBg, border: `1px solid ${BRAND.vermelho}33`, borderRadius: 18, padding: 20, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: BRAND.vermelho, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <AlertCircle size={13} aria-hidden="true" /> Perfil Incompleto
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: BRAND.vermelho, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>
              {incompletos.length}
            </div>
            {incompletos.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: BRAND.verde, fontFamily: FONT.body }}>
                <CheckCircle size={14} aria-hidden="true" /> Todos os perfis ativos estão completos!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {incompletos.map((inf) => {
                  const nomeInf = inf.perfil?.nome_artistico || inf.name;
                  return podeEditarInf(inf.id) ? (
                    <button type="button" key={inf.id} onClick={() => setModal({ mode: "editar", inf })}
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
            borderRadius: 14,
            border: `1px solid ${t.cardBorder}`,
            background: brand.blockBg,
            padding: "12px 20px",
          }}>
            {/* Linha 1: Status / Operadora */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Status</span>
              {STATUS_OPTS.map((s) => {
                const active = filterStatus === s;
                const color = STATUS_COLOR[s];
                return (
                  <button key={s} type="button" onClick={() => setFilterStatus(active ? "todos" : s)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : "transparent",
                      color: active ? color : t.textMuted, fontSize: 12, fontWeight: active ? 700 : 400,
                      fontFamily: FONT.body, transition: "all 0.15s",
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, alignSelf: "center" }} />
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{STATUS_LABEL[s]}</span>
                    {active && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><X size={9} aria-hidden="true" /></span>}
                  </button>
                );
              })}
              {showFiltroOperadora && operadorasNoEscopo.length > 0 && (
                <>
                  <span style={{ width: 1, height: 16, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Operadora</span>
                  <SelectComIcone
                    pill
                    icon={<Shield size={15} aria-hidden="true" />}
                    label="Filtrar por operadora"
                    value={filterOp}
                    onChange={setFilterOp}
                    minWidth={200}
                    style={{
                      border: `1px solid ${filterOp !== "todas" ? brand.accent : t.cardBorder}`,
                      background:
                        filterOp !== "todas"
                          ? brand.useBrand
                            ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                            : `${BRAND.roxoVivo}18`
                          : (t.inputBg ?? t.cardBg),
                      color: filterOp !== "todas" ? brand.accent : t.textMuted,
                      fontWeight: filterOp !== "todas" ? 700 : 400,
                    }}
                  >
                    <option value="todas">Todas as operadoras</option>
                    {operadorasNoEscopo.map((o) => (
                      <option key={o.slug} value={o.slug}>{o.nome}</option>
                    ))}
                  </SelectComIcone>
                </>
              )}
            </div>

            {/* Linha 2: Plataforma */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-start", paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Plataforma</span>
              {PLATAFORMAS.map((plat) => {
                const active = filterPlat === plat;
                const color = PLAT_COLOR[plat as Plataforma] ?? "#94a3b8";
                const nPlat = porPlat[plat] ?? 0;
                return (
                  <button key={plat} type="button" onClick={() => setFilterPlat(active ? "todas" : plat)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${active ? color : color + "55"}`,
                      background: active ? `${color}22` : `${color}11`,
                      color: active ? color : color + "cc",
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      fontFamily: FONT.body, transition: "all 0.15s",
                      lineHeight: 1,
                    }}
                  >
                    <PlatLogo plataforma={plat} size={13} isDark={isDark ?? false} />
                    <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>{plat}</span>
                    <span style={{ width: 1, height: 10, background: `${color}44`, flexShrink: 0, alignSelf: "center" }} aria-hidden />
                    <span style={{ fontSize: 12, fontWeight: 800, color: nPlat > 0 ? t.text : t.textMuted, fontFamily: FONT_TITLE, flexShrink: 0, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>
                      {nPlat}
                    </span>
                    {active && <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><X size={9} aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>

            {/* Linha 3: Filtro de Cachê */}
            {cacheMax > 0 && (
              <div style={{
                paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`,
                paddingBottom: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body }}>
                    <Coins size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Cachê por Hora — até
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: brand.accent, fontFamily: FONT.body }}>
                    {cacheLimit >= cacheMax ? "Todos" : fmtBRL(cacheLimit) + "/h"}
                  </span>
                </div>
                <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: t.cardBorder }} />
                  <div style={{ position: "absolute", left: 0, width: `${(cacheLimit / cacheMax) * 100}%`, height: 4, borderRadius: 2, background: sliderTrackGradient }} />
                  <input
                    type="range"
                    min={0}
                    max={cacheMax}
                    step={50}
                    value={cacheLimit}
                    onChange={(e) => setCacheLimit(Number(e.target.value))}
                    aria-label="Filtrar por cachê máximo por hora"
                    aria-valuemin={0}
                    aria-valuemax={cacheMax}
                    aria-valuenow={cacheLimit}
                    aria-valuetext={cacheLimit >= cacheMax ? "Todos" : `Até ${fmtBRL(cacheLimit)}/h`}
                    style={{ position: "absolute", width: "100%", opacity: 0, cursor: "pointer", height: 20, zIndex: 2 }}
                  />
                  <div style={{ position: "absolute", left: `calc(${(cacheLimit / cacheMax) * 100}% - 8px)`, width: 16, height: 16, borderRadius: "50%", background: sliderThumbGradient, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>R$ 0</span>
                  <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{fmtBRL(cacheMax)}/h</span>
                </div>
              </div>
            )}

            {/* Linha 4: Barra de Pesquisa */}
            <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome artístico ou e-mail..."
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
                  type="button"
                  onClick={() => { setFilterStatus("todos"); setFilterPlat("todas"); setFilterOp("todas"); setSearch(""); setCacheLimit(cacheMax); }}
                  style={{
                    padding: "5px 14px", borderRadius: 999,
                    border: `1px solid ${BRAND.vermelho}44`,
                    background: `${BRAND.vermelho}11`,
                    color: BRAND.vermelho, fontSize: 12, fontWeight: 600,
                    fontFamily: FONT.body, cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <X size={12} aria-hidden="true" /> Limpar filtros
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

      {statusError && (
        <div
          style={{
            background: `${BRAND.vermelho}18`,
            border: `1px solid ${BRAND.vermelho}44`,
            color: BRAND.vermelho,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 14,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          role="alert"
          aria-live="polite"
        >
          {statusError}
          <button
            type="button"
            onClick={() => setStatusError("")}
            aria-label="Fechar erro"
            style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho, display: "flex" }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={16} className="app-lucide-spin" aria-hidden="true" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, boxShadow: cardShadow }}>
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
                  background: ctaGradient,
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
                        <AlertCircle size={10} aria-hidden="true" /> Perfil incompleto
                      </span>
                    )}
                  </div>
                  {p?.cache_hora && p.cache_hora > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 5 }}>
                      <Coins size={12} aria-hidden="true" style={{ color: brand.secondary }} /> {fmtBRL(p.cache_hora)}/h
                    </div>
                  )}
                  {canais.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                      {canais.map((c) => {
                        const link = p?.[`link_${c.toLowerCase()}` as keyof Perfil] as string;
                        const content = (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: PLAT_COLOR[c], fontFamily: FONT.body, lineHeight: 1 }}>
                            <PlatLogo plataforma={c} size={12} isDark={isDark ?? false} />
                            <span style={{ display: "inline-flex", alignItems: "center" }}>{c}</span>
                            {link && <span style={{ fontSize: 10, opacity: 0.7, display: "inline-flex", alignItems: "center" }}>↗</span>}
                          </span>
                        );
                        return link ? (
                          <a
                            key={c}
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver canal ${c} do influencer (abre em nova aba)`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            {content}
                          </a>
                        ) : <span key={c}>{content}</span>;
                      })}
                    </div>
                  )}
                  {opsAtivas.length > 0 && user?.role !== "operador" && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {opsAtivas.map((o) => (
                        <OperadoraTag
                          key={o.operadora_slug}
                          label={o.operadora_nome ?? o.operadora_slug}
                          corPrimaria={opsColorMap[o.operadora_slug]}
                          icon={<Building2 size={11} aria-hidden="true" />}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setModal({ mode: "visualizar", inf })}
                  aria-label={`Ver perfil de ${p?.nome_artistico || inf.name}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10,
                    border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg,
                    color: t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><Eye size={13} aria-hidden="true" /></span>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>Ver</span>
                </button>
                {podeEditarInf(inf.id) && (
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "editar", inf })}
                    aria-label={`Editar perfil de ${p?.nome_artistico || inf.name}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: ctaGradient,
                      color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body,
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}><Pencil size={13} aria-hidden="true" /></span>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>Editar</span>
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
          operadorasList={operadorasNoEscopo}
          onClose={() => setModal(null)}
          isDark={isDark}
        />
      )}
      {modal?.mode === "editar" && modal.inf && (
        <ModalPerfil
          influencer={modal.inf}
          operadorasList={operadorasNoEscopo}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void loadData(); }}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// ─── Modal Visualizar ─────────────────────────────────────────────────────────
function ModalVisualizar({ influencer, operadorasList, onClose, isDark }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; isDark?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const p = influencer.perfil;
  const [tab, setTab] = useState<"cadastral" | "canais" | "financeiro" | "operadoras" | "historico">("cadastral");

  useEffect(() => {
    const id = window.setTimeout(() => containerRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
    { key: "historico"   as const, label: "Histórico" },
  ];

  function fmtTs(iso?: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  }

  const labelStyle: CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: CSSProperties = { marginBottom: 14 };
  const tabActiveBg = brand.useBrand ? "var(--brand-action-12)" : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)";
  const val = (v?: string | number) => (
    <span style={{ fontSize: "13px", color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>
      {v || "—"}
    </span>
  );

  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-visualizar-title"
        style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}
      >

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 id="modal-visualizar-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {p?.nome_artistico || influencer.name}
              </h2>
              {p?.status && <StatusBadge value={p.status} onChange={() => {}} readonly />}
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: brand.useBrand ? "var(--brand-action-12)" : `${BRAND.azul}0d`, border: `1px solid ${brand.useBrand ? "var(--brand-action-border)" : `${BRAND.azul}30`}`, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 18 }}>
          <Eye size={13} aria-hidden="true" style={{ color: brand.primary, flexShrink: 0 }} />
          <span>Modo visualização — somente leitura. Dados sensíveis protegidos.</span>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              aria-pressed={tab === tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                padding: "7px 14px", borderRadius: 20, flexShrink: 0,
                border: `1px solid ${tab === tb.key ? brand.primary : t.cardBorder}`,
                background: tab === tb.key ? tabActiveBg : (t.inputBg ?? t.cardBg),
                color: tab === tb.key ? brand.primary : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
              }}
            >
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
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, border: `2px solid ${PLAT_COLOR[c]}`, background: `${PLAT_COLOR[c]}18`, color: PLAT_COLOR[c], fontSize: 12, fontWeight: 700, fontFamily: FONT.body, lineHeight: 1 }}>
                      <PlatLogo plataforma={c} size={13} isDark={isDark ?? false} />
                      <span style={{ display: "inline-flex", alignItems: "center" }}>{c}</span>
                      {link && <span style={{ fontSize: 10, opacity: 0.7, display: "inline-flex", alignItems: "center" }}>↗</span>}
                    </span>
                  );
                  return link ? (
                    <a
                      key={c}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver canal ${c} do influencer (abre em nova aba)`}
                      style={{ textDecoration: "none" }}
                    >
                      {inner}
                    </a>
                  ) : <span key={c}>{inner}</span>;
                })
              )}
            </div>
          </div>
        )}

        {tab === "financeiro" && (
          <>
            <div style={row}><label style={labelStyle}>Cachê por Hora</label>{val(p?.cache_hora ? fmtBRL(p.cache_hora) : "")}</div>
            <div style={row}>
              <SensitiveField value={p?.chave_pix} label="Chave PIX" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div style={row}>
              <SensitiveField value={p?.banco} label="Banco" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
            <div className="app-grid-2-tight" style={{ ...row, gap: 12 }}>
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
                const opColor = op.brand_action?.trim() || "var(--brand-action, #7c3aed)";
                return (
                  <div key={op.slug} style={{ marginBottom: 14, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}
                      </span>
                      <span style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
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

        {tab === "historico" && (
          <>
            <div style={row}><label style={labelStyle}>Data de criação (cadastro)</label>{val(fmtTs(p?.created_at))}</div>
            <div style={row}><label style={labelStyle}>Data da última atualização</label>{val(fmtTs(p?.updated_at))}</div>
            <div style={row}><label style={labelStyle}>Data da última alteração de status</label>{val(fmtTs(p?.status_alterado_em))}</div>
            <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, margin: 0, lineHeight: 1.45 }}>
              As datas vêm do cadastro do influencer. A alteração de status é registrada a partir desta versão do sistema.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
type OperadorasFormState = Record<string, { ativo: boolean; id_operadora: string }>;

function ModalPerfil({ influencer, operadorasList, onClose, onSaved, isDark }: {
  influencer: Influencer; operadorasList: Operadora[]; onClose: () => void; onSaved: () => void; isDark?: boolean;
}) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const existing = influencer.perfil;
  const tabActiveBg = brand.useBrand ? "var(--brand-action-12)" : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)";
  const ctaSalvar = "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";

  useEffect(() => {
    const id = window.setTimeout(() => containerRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);
  // Status e Cachê somente Gestores e Admin podem alterar
  const podeAlterarStatusCache = user?.role === "admin" || user?.role === "gestor";

  const inicialOperadoras: OperadorasFormState = {};
  operadorasList.forEach((o) => {
    const v = influencer.operadoras?.find((vinc) => vinc.operadora_slug === o.slug);
    inicialOperadoras[o.slug] = v
      ? { ativo: !!v.ativo, id_operadora: v.id_operadora ?? "" }
      : { ativo: false, id_operadora: "" };
  });

  const [editNomeCompleto, setEditNomeCompleto] = useState(influencer.perfil?.nome_completo ?? "");
  const [form,           setForm]           = useState<Perfil>(existing ?? emptyPerfil(influencer.id));
  const [operadorasForm, setOperadorasForm] = useState<OperadorasFormState>(inicialOperadoras);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [tab,            setTab]            = useState<"cadastral" | "canais" | "financeiro" | "operadoras">("cadastral");

  const set = (key: keyof Perfil, val: Perfil[keyof Perfil]) => setForm((f) => ({ ...f, [key]: val }));

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

    const payload: Perfil & { nome_completo: string; updated_at: string; status_alterado_em?: string } = {
      ...form,
      nome_completo: editNomeCompleto.trim(),
      updated_at: new Date().toISOString(),
    };
    // Impede alteração de status e cache por usuários sem permissão (backend defense)
    if (!podeAlterarStatusCache && existing) {
      payload.status = existing.status ?? "ativo";
      payload.cache_hora = existing.cache_hora ?? 0;
    } else if (existing && (payload.cache_hora == null || Number.isNaN(Number(payload.cache_hora)))) {
      payload.cache_hora = existing.cache_hora ?? 0;
    }
    if (existing && podeAlterarStatusCache && form.status !== existing.status) {
      payload.status_alterado_em = new Date().toISOString();
    }
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", influencer.id)
      : await supabase.from("influencer_perfil").insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }

    const slugsGeridos = new Set(operadorasList.map((o) => o.slug));
    for (const slug of slugsGeridos) {
      const st = operadorasForm[slug] ?? { ativo: false, id_operadora: "" };
      await supabase.from("influencer_operadoras").delete().eq("influencer_id", influencer.id).eq("operadora_slug", slug);
      if (st.ativo && st.id_operadora?.trim()) {
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

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    borderRadius: 10, border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg, color: t.text,
    fontSize: 13, fontFamily: FONT.body, outline: "none",
  };
  const labelStyle: CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px",
    textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body,
  };
  const row: CSSProperties = { marginBottom: 14 };
  const tabs = [
    { key: "cadastral"   as const, label: "Cadastral"  },
    { key: "canais"      as const, label: "Canais"     },
    { key: "financeiro"  as const, label: "Financeiro" },
    { key: "operadoras"  as const, label: "Operadoras" },
  ];

  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-perfil-title"
        style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}
      >

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h2 id="modal-perfil-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>
                {form.nome_artistico?.trim() || influencer.name}
              </h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} readonly={!podeAlterarStatusCache} />
            </div>
            <div style={{ fontSize: "12px", color: t.textMuted, fontFamily: FONT.body }}>{influencer.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              aria-pressed={tab === tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                padding: "7px 14px", borderRadius: 20, flexShrink: 0,
                border: `1px solid ${tab === tb.key ? brand.primary : t.cardBorder}`,
                background: tab === tb.key ? tabActiveBg : (t.inputBg ?? t.cardBg),
                color: tab === tb.key ? brand.primary : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: `${BRAND.vermelho}18`,
              border: `1px solid ${BRAND.vermelho}44`,
              color: BRAND.vermelho,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 14,
              fontFamily: FONT.body,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Fechar erro" style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho, display: "flex", flexShrink: 0 }}>
              <X size={14} aria-hidden="true" />
            </button>
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
                    <button key={p} type="button" onClick={() => toggleCanal(p)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 20, cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg), color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, lineHeight: 1 }}>
                      <PlatLogo plataforma={p} size={13} isDark={isDark ?? false} />
                      <span style={{ display: "inline-flex", alignItems: "center" }}>{p}</span>
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
                    Link {c}
                    <CampoObrigatorioMark />
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
            <div className="app-grid-2-tight" style={{ ...row, gap: 12 }}>
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
                const opColor = op.brand_action?.trim() || "var(--brand-action, #7c3aed)";
                return (
                  <div key={op.slug} style={{ ...row, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ativo ? 12 : 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>
                        <Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}
                      </span>
                      <button type="button" onClick={() => setOp(op.slug, { ativo: !ativo })}
                        style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                        {ativo ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                    {ativo && (
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body }}>
                          ID {op.nome}
                          <CampoObrigatorioMark />
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

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            width: "100%", marginTop: 8, padding: 13, borderRadius: 10, border: "none",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            background: ctaSalvar, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="app-lucide-spin" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            "Salvar Perfil"
          )}
        </button>
      </div>
    </div>
  );
}
