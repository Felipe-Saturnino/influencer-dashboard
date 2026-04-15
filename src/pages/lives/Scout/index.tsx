import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission, type Permissoes } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { PLATAFORMAS, PLAT_COLOR, type Plataforma } from "../../../constants/platforms";
import { supabase, supabaseAnonKey } from "../../../lib/supabase";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { PlatLogo } from "../../../components/PlatLogo";
import { CurrencyInput } from "../../../components/CurrencyInput";
import { X, Eye, Pencil, Trash2, ChevronDown, Loader2, Search, Coins, Building2 } from "lucide-react";

export type OperadoraScoutOpt = { slug: string; nome: string };

/** Chama a Edge Function (service role): influencer_operadoras + user_scopes — alinha Gestão de Usuários e quadro Influencers. */
async function vincularOperadoraInfluencerViaApi(userId: string, operadoraSlug: string, scoutId?: string): Promise<void> {
  const slug = operadoraSlug.trim();
  if (!slug || !userId.trim()) return;
  const res = await fetch("/api/criar-usuario-scout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, Apikey: supabaseAnonKey },
    body: JSON.stringify({
      vincular_operadora: { user_id: userId.trim(), operadora_slug: slug },
      ...(scoutId ? { scout_id: scoutId } : {}),
    }),
  });
  const fnData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((fnData as { error?: string }).error ?? `Erro ${res.status}`);
}

export type StatusScout = "visualizado" | "contato" | "negociacao" | "fechado";
const STATUS_SCOUT_OPTS: StatusScout[] = ["visualizado", "contato", "negociacao", "fechado"];
const STATUS_SCOUT_LABEL: Record<StatusScout, string> = {
  visualizado: "Visualizado", contato: "Contato", negociacao: "Negociação", fechado: "Fechado",
};
const STATUS_SCOUT_COLOR: Record<StatusScout, string> = {
  visualizado: "#6b7280", contato: BRAND.azul, negociacao: BRAND.amarelo, fechado: BRAND.verde,
};

const CATEGORIAS = ["Vida Real", "Jogos Populares", "Variedades", "Esportes", "Cassino"] as const;

const CTA_GRADIENT = "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";
const SLIDER_TRACK_GRADIENT = "linear-gradient(90deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";
const SLIDER_THUMB_GRADIENT = "linear-gradient(135deg, var(--brand-action, #4a2082), var(--brand-contrast, #1e36f8))";

// Métrica exibida por plataforma (apenas front — não altera DB)
const PLAT_METRICA: Record<string, string> = {
  YouTube: "Média de Views",
  Instagram: "Seguidores",
  Twitch: "Média de Views",
  Kick: "Média de Views",
  TikTok: "Média de Views",
  Discord: "Seguidores",
  WhatsApp: "Seguidores",
  Telegram: "Seguidores",
};

const TIPO_CONTATO_OPTS = [
  { value: "agente" as const, label: "Agente" },
  { value: "plataforma" as const, label: "Plataforma" },
  { value: "direto" as const, label: "Direto" },
];

const LIVE_CASSINO_OPTS = [
  { value: "" as const, label: "—" },
  { value: "sim" as const, label: "Sim" },
  { value: "nao" as const, label: "Não" },
];

export interface ScoutInfluencer {
  id: string;
  nome_artistico: string;
  status: StatusScout;
  tipo_contato?: string | null;
  nome_agente?: string | null;
  telefone?: string | null;
  cache_negociado?: number | null;
  live_cassino?: string | null;
  email?: string | null;
  plataformas?: string[];
  link_twitch?: string | null;
  link_youtube?: string | null;
  link_kick?: string | null;
  link_instagram?: string | null;
  link_tiktok?: string | null;
  link_discord?: string | null;
  link_whatsapp?: string | null;
  link_telegram?: string | null;
  views_twitch?: number | null;
  views_youtube?: number | null;
  views_kick?: number | null;
  views_instagram?: number | null;
  views_tiktok?: number | null;
  views_discord?: number | null;
  views_whatsapp?: number | null;
  views_telegram?: number | null;
  categorias?: string[];
  /** Operadora da parceria (obrigatória ao fechar); replica em influencer_operadoras e user_scopes. */
  operadora_slug?: string | null;
  user_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ScoutAnotacao {
  id: string;
  scout_id: string;
  usuario_id?: string | null;
  texto: string;
  created_at: string;
  usuario_nome?: string;
}

function getViewsTotal(s: ScoutInfluencer): number {
  return (s.views_twitch ?? 0) + (s.views_youtube ?? 0) + (s.views_kick ?? 0) + (s.views_instagram ?? 0) + (s.views_tiktok ?? 0) + (s.views_discord ?? 0) + (s.views_whatsapp ?? 0) + (s.views_telegram ?? 0);
}

function getLiveCassinoLabel(v: string | null | undefined): string {
  if (!v) return "—";
  return v === "sim" ? "Sim" : "Não";
}

/** Numeric do Postgres costuma vir como string no JSON do Supabase — normaliza para ≥ 0. */
function toCacheNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? Math.max(0, v) : 0;
  const s = String(v).trim();
  if (!s) return 0;
  let n = Number(s);
  if (!Number.isFinite(n) && s.includes(",")) {
    n = Number(s.replace(/\./g, "").replace(",", "."));
  }
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function validarParaFechado(s: {
  nome_artistico?: string | null;
  email?: string | null;
  cache_negociado?: number | null | string;
  plataformas?: string[];
  link_twitch?: string | null;
  link_youtube?: string | null;
  link_kick?: string | null;
  link_instagram?: string | null;
  link_tiktok?: string | null;
  link_discord?: string | null;
  link_whatsapp?: string | null;
  link_telegram?: string | null;
  views_twitch?: number | null;
  views_youtube?: number | null;
  views_kick?: number | null;
  views_instagram?: number | null;
  views_tiktok?: number | null;
  views_discord?: number | null;
  views_whatsapp?: number | null;
  views_telegram?: number | null;
  operadora_slug?: string | null;
}): { ok: boolean; msg?: string } {
  if (!(s.nome_artistico ?? "").trim()) return { ok: false, msg: "Nome artístico é obrigatório para marcar como Fechado." };
  if (!(s.email ?? "").trim()) return { ok: false, msg: "E-mail é obrigatório para marcar como Fechado." };
  if (!(s.operadora_slug ?? "").toString().trim()) return { ok: false, msg: "Selecione a operadora da parceria para marcar como Fechado (campo no modal Editar)." };
  const cache = toCacheNumber(s.cache_negociado);
  if (cache <= 0) return { ok: false, msg: "Cachê negociado é obrigatório e deve ser maior que zero para marcar como Fechado." };
  const plats = s.plataformas ?? [];
  if (plats.length === 0) return { ok: false, msg: "Selecione pelo menos 1 plataforma para marcar como Fechado." };
  const temPlatCompleta = plats.some((p) => {
    const key = p.toLowerCase();
    const link = (s as Record<string, unknown>)[`link_${key}`] as string | null | undefined;
    const v = (s as Record<string, unknown>)[`views_${key}`] as number | null | undefined;
    return !!link?.trim() && (v ?? 0) > 0;
  });
  if (!temPlatCompleta) return { ok: false, msg: "Pelo menos 1 plataforma deve ter link e views preenchidos para marcar como Fechado." };
  return { ok: true };
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusScoutBadge({ value, onChange, readonly }: { value: StatusScout; onChange: (v: StatusScout) => void; readonly?: boolean }) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const color = STATUS_SCOUT_COLOR[value] ?? "#888";
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => { if (!readonly) setOpen((o) => !o); }}
        {...(!readonly ? { "aria-haspopup": "menu" as const, "aria-expanded": open } : {})}
        aria-label={`Status: ${STATUS_SCOUT_LABEL[value]}`}
        style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${color}`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: readonly ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
      >
        {STATUS_SCOUT_LABEL[value]}
        {!readonly && <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200, minWidth: 140, overflow: "hidden" }}>
          {STATUS_SCOUT_OPTS.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => { onChange(s); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "9px 14px", border: "none", background: s === value ? `${STATUS_SCOUT_COLOR[s]}18` : "transparent", color: STATUS_SCOUT_COLOR[s], fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", fontFamily: FONT.body }}>
              {STATUS_SCOUT_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function Scout() {
  const { theme: t, user, isDark } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("scout");
  const [list, setList] = useState<ScoutInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "visualizar" | "editar"; scout?: ScoutInfluencer } | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPlat, setFilterPlat] = useState<string>("todas");
  const [cacheMax, setCacheMax] = useState(5000);
  const [cacheLimit, setCacheLimit] = useState(5000);
  const [viewsMax, setViewsMax] = useState(100000);
  const [viewsLimit, setViewsLimit] = useState(100000);
  const [operadorasOpt, setOperadorasOpt] = useState<OperadoraScoutOpt[]>([]);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => {
      setOperadorasOpt((data ?? []) as OperadoraScoutOpt[]);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("scout_influencer").select("*").order("nome_artistico");
    if (error) { console.error("[Scout] Erro ao carregar:", error); setList([]); }
    else {
      setList((data ?? []) as ScoutInfluencer[]);
      const caches = (data ?? []).map((s: ScoutInfluencer) => toCacheNumber(s.cache_negociado)).filter((v: number) => v > 0);
      const viewsAll = (data ?? []).map((s: ScoutInfluencer) => getViewsTotal(s)).filter((v: number) => v > 0);
      if (caches.length > 0) { const cm = Math.max(...caches, 5000); setCacheMax(cm); setCacheLimit(cm); }
      if (viewsAll.length > 0) { const vm = Math.max(...viewsAll, 100000); setViewsMax(vm); setViewsLimit(vm); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = list.filter((s) => {
    const q = search.toLowerCase();
    if (search && !(s.nome_artistico ?? "").toLowerCase().includes(q) && !(s.email ?? "").toLowerCase().includes(q)) return false;
    // Vista padrão ("todos"): não listar fechados — só aparecem ao filtrar explicitamente por Fechado.
    if (filterStatus === "todos") {
      if (s.status === "fechado") return false;
    } else if (s.status !== filterStatus) {
      return false;
    }
    if (filterPlat !== "todas" && !(s.plataformas ?? []).includes(filterPlat)) return false;
    if (cacheMax > 0 && toCacheNumber(s.cache_negociado) > cacheLimit) return false;
    if (viewsMax > 0 && getViewsTotal(s) > viewsLimit) return false;
    return true;
  });

  const porStatus: Record<string, number> = { visualizado: 0, contato: 0, negociacao: 0, fechado: 0 };
  const porPlat: Record<string, number> = {};
  list.forEach((s) => {
    porStatus[s.status] = (porStatus[s.status] ?? 0) + 1;
    (s.plataformas ?? []).forEach((p) => { porPlat[p] = (porPlat[p] ?? 0) + 1; });
  });

  const podeEditarScout   = (s: ScoutInfluencer) => perm.canEditarOk  && (perm.canEditar  !== "proprios" || s.created_by === user?.id);
  const podeAlterarStatus = (s: ScoutInfluencer) => podeEditarScout(s);

  async function handleStatusChange(scout: ScoutInfluencer, newStatus: StatusScout) {
    let effective: ScoutInfluencer = scout;
    if (newStatus === "fechado") {
      const { data: freshRow } = await supabase.from("scout_influencer").select("*").eq("id", scout.id).maybeSingle();
      if (freshRow) effective = { ...scout, ...(freshRow as ScoutInfluencer) };
      const val = validarParaFechado(effective);
      if (!val.ok) { setStatusError(val.msg ?? "Dados incompletos para marcar como Fechado."); return; }
    }
    if (newStatus === "fechado" && !effective.user_id) {
      try {
        const cacheNeg = toCacheNumber(effective.cache_negociado);
        const res = await fetch("/api/criar-usuario-scout", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseAnonKey}`, "Apikey": supabaseAnonKey },
          body: JSON.stringify({
            email: (effective.email ?? "").trim(),
            nome_artistico: (effective.nome_artistico ?? "").trim(),
            telefone: (effective.telefone ?? "").trim() || undefined,
            cache_negociado: cacheNeg,
            scout_id: scout.id,
            plataformas: effective.plataformas ?? [],
            link_twitch: effective.link_twitch ?? "",
            link_youtube: effective.link_youtube ?? "",
            link_kick: effective.link_kick ?? "",
            link_instagram: effective.link_instagram ?? "",
            link_tiktok: effective.link_tiktok ?? "",
            link_discord: effective.link_discord ?? "",
            link_whatsapp: effective.link_whatsapp ?? "",
            link_telegram: effective.link_telegram ?? "",
            operadora_slug: (effective.operadora_slug ?? "").trim() || undefined,
          }),
        });
        const fnData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((fnData as { error?: string })?.error ?? `Erro ${res.status}`);
        const uid = (fnData as { userId?: string })?.userId;
        if (!uid) throw new Error("Usuário criado mas ID não retornado");
        const opSlug = (effective.operadora_slug ?? "").trim();
        const { error } = await supabase.from("scout_influencer").update({ status: "fechado", user_id: uid, operadora_slug: opSlug || null }).eq("id", scout.id);
        if (error) throw new Error(error.message);
        if (cacheNeg > 0) {
          const { error: syncErr } = await supabase.from("influencer_perfil").update({ cache_hora: cacheNeg }).eq("id", uid);
          if (syncErr) console.warn("[Scout] Falha ao sincronizar cachê em influencer_perfil:", syncErr.message);
        }
        loadData();
      } catch (e) { setStatusError(e instanceof Error ? e.message : "Erro ao criar usuário. Verifique permissões."); }
      return;
    }
    setList((prev) => prev.map((s) => (s.id === scout.id ? { ...s, status: newStatus } : s)));
    const { error } = await supabase.from("scout_influencer").update({ status: newStatus }).eq("id", scout.id);
    if (error) { setList((prev) => prev.map((s) => (s.id === scout.id ? { ...s, status: scout.status } : s))); return; }
    // Sincronizar cache e operadora quando scout já tinha user_id e passou a fechado
    if (newStatus === "fechado" && effective.user_id) {
      const slugOp = (effective.operadora_slug ?? "").trim();
      if (slugOp) {
        try {
          await vincularOperadoraInfluencerViaApi(effective.user_id, slugOp, scout.id);
        } catch (e) {
          setStatusError(e instanceof Error ? e.message : "Erro ao vincular operadora.");
        }
      }
      const cacheHora = toCacheNumber(effective.cache_negociado);
      if (cacheHora > 0) {
        const { error: syncErr } = await supabase.from("influencer_perfil").update({ cache_hora: cacheHora }).eq("id", effective.user_id);
        if (syncErr) console.warn("[Scout] Falha ao sincronizar cache para influencer_perfil:", syncErr.message);
      }
    }
  }

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar este dashboard.</div>;
  }

  // Ordem canônica das plataformas para os chips
  const PLATS_ORDEM = ["Twitch", "YouTube", "Kick", "Instagram", "TikTok", "Discord", "WhatsApp", "Telegram"];

  return (
    <div className="app-page-shell">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: brand.primaryIconBg, border: brand.primaryIconBorder, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: brand.primaryIconColor }}>
            <Search size={14} aria-hidden="true" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: brand.primary, fontFamily: FONT_TITLE, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>Scout</h1>
            <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body, margin: "5px 0 0" }}>Prospecte e registre informações de influencers para parcerias.</p>
          </div>
        </div>
        {perm.canCriarOk && (
          <button
            type="button"
            onClick={() => setModalNovo(true)}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              background: CTA_GRADIENT,
              color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
            }}
          >
            + Adicionar
          </button>
        )}
      </div>

      {/* Bloco 1: Cards Consolidados */}
      {!loading && (
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body, marginBottom: 10, paddingLeft: 2 }}>Funil de Prospecção</div>
            <div className="app-grid-kpi-4" style={{ width: "100%" }}>
              {STATUS_SCOUT_OPTS.map((s) => (
                <div key={s} style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderLeft: `3px solid ${STATUS_SCOUT_COLOR[s]}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", minWidth: 0 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: brand.accent, fontFamily: FONT_TITLE, lineHeight: 1 }}>{porStatus[s] ?? 0}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: brand.secondary, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 6 }}>{STATUS_SCOUT_LABEL[s]}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 10, paddingLeft: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: t.textMuted, fontFamily: FONT.body }}>
                Cobertura de Plataformas
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 4 }}>
                Clique em uma plataforma para filtrar a lista; clique de novo para ver todos.
              </div>
            </div>
            <div className="app-table-wrap">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, width: "100%" }}>
              {PLATS_ORDEM.map((plat) => {
                const count = porPlat[plat] ?? 0;
                const cor = PLAT_COLOR[plat as Plataforma];
                const filtroAtivo = filterPlat === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setFilterPlat(filtroAtivo ? "todas" : plat)}
                    aria-pressed={filtroAtivo}
                    aria-label={filtroAtivo ? `Remover filtro ${plat}` : `Filtrar por ${plat}`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "12px 16px", borderRadius: 18,
                      background: brand.blockBg,
                      border: filtroAtivo ? `2px solid ${cor}` : `1.5px solid ${cor}55`,
                      boxShadow: filtroAtivo ? `0 0 0 2px ${cor}33` : "0 2px 8px rgba(0,0,0,0.08)",
                      minWidth: 0,
                      cursor: "pointer",
                      font: "inherit",
                      textAlign: "center",
                    }}
                  >
                    <PlatLogo plataforma={plat} size={14} isDark={isDark ?? false} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: cor, fontFamily: FONT.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {plat}
                    </span>
                    <span style={{ width: 1, height: 12, background: `${cor}44`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: count > 0 ? t.text : t.textMuted, fontFamily: FONT_TITLE, flexShrink: 0 }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Bloco 2: Filtros (estilo Influencers) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          {/* Linha 1: Status (filtro de plataforma: chips em Cobertura de Plataformas) */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Status</span>
            {STATUS_SCOUT_OPTS.map((s) => {
              const active = filterStatus === s;
              const color = STATUS_SCOUT_COLOR[s];
              return (
                <button key={s} type="button" onClick={() => setFilterStatus(active ? "todos" : s)}
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
                  {STATUS_SCOUT_LABEL[s]}
                  {active && <X size={9} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* Linha 2: Cachê / Views */}
          <div className="app-grid-2" style={{
            paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`,
            gap: 18,
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body }}>
                  <Coins size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Cachê por Hora — até
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: brand.accent, fontFamily: FONT.body }}>{(cacheMax <= 0 || cacheLimit >= cacheMax) ? "Todos" : fmtBRL(cacheLimit) + "/h"}</span>
              </div>
              <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: t.cardBorder }} />
                <div style={{ position: "absolute", left: 0, width: `${(cacheMax > 0 ? cacheLimit / cacheMax : 1) * 100}%`, height: 4, borderRadius: 2, background: SLIDER_TRACK_GRADIENT }} />
                <input
                  type="range"
                  min={0}
                  max={cacheMax || 1}
                  step={50}
                  value={cacheLimit}
                  onChange={(e) => setCacheLimit(Number(e.target.value))}
                  aria-label="Filtrar por cachê máximo negociado"
                  aria-valuemin={0}
                  aria-valuemax={cacheMax || 1}
                  aria-valuenow={cacheLimit}
                  aria-valuetext={(cacheMax <= 0 || cacheLimit >= cacheMax) ? "Todos" : `Até ${fmtBRL(cacheLimit)}/h`}
                  style={{ position: "absolute", width: "100%", opacity: 0, cursor: "pointer", height: 20, zIndex: 2 }}
                />
                <div style={{ position: "absolute", left: `calc(${(cacheMax > 0 ? cacheLimit / cacheMax : 1) * 100}% - 8px)`, width: 16, height: 16, borderRadius: "50%", background: SLIDER_THUMB_GRADIENT, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>R$ 0</span>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{fmtBRL(cacheMax || 5000)}/h</span>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body }}>
                  <Eye size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Views — até
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: brand.accent, fontFamily: FONT.body }}>{viewsMax <= 0 || viewsLimit >= viewsMax ? "Todos" : viewsLimit.toLocaleString("pt-BR")}</span>
              </div>
              <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: t.cardBorder }} />
                <div style={{ position: "absolute", left: 0, width: `${viewsMax > 0 ? (viewsLimit / viewsMax) * 100 : 100}%`, height: 4, borderRadius: 2, background: SLIDER_TRACK_GRADIENT }} />
                <input
                  type="range"
                  min={0}
                  max={viewsMax || 1}
                  step={1000}
                  value={viewsLimit}
                  onChange={(e) => setViewsLimit(Number(e.target.value))}
                  aria-label="Filtrar por views máximas"
                  aria-valuemin={0}
                  aria-valuemax={viewsMax || 1}
                  aria-valuenow={viewsLimit}
                  aria-valuetext={(viewsMax <= 0 || viewsLimit >= viewsMax) ? "Todos" : `Até ${viewsLimit.toLocaleString("pt-BR")} views`}
                  style={{ position: "absolute", width: "100%", opacity: 0, cursor: "pointer", height: 20, zIndex: 2 }}
                />
                <div style={{ position: "absolute", left: `calc(${viewsMax > 0 ? (viewsLimit / viewsMax) * 100 : 100}% - 8px)`, width: 16, height: 16, borderRadius: "50%", background: SLIDER_THUMB_GRADIENT, border: "2px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", pointerEvents: "none", zIndex: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>0</span>
                <span style={{ fontSize: "11px", color: t.textMuted, fontFamily: FONT.body }}>{(viewsMax || 100000).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>

          {/* Linha 3: Barra de Pesquisa */}
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 16px",
                borderRadius: 12, border: `1px solid ${t.cardBorder}`,
                background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13,
                fontFamily: FONT.body, outline: "none",
              }}
            />
          </div>

          {(filterStatus !== "todos" || filterPlat !== "todas" || search || (cacheMax > 0 && cacheLimit < cacheMax) || (viewsMax > 0 && viewsLimit < viewsMax)) && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => { setFilterStatus("todos"); setFilterPlat("todas"); setSearch(""); setCacheLimit(cacheMax); setViewsLimit(viewsMax); }}
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

      {/* Bloco 3: Lista */}
      {!loading && <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 14 }}><span style={{ color: brand.accent, fontWeight: 700 }}>{filtered.length}</span> {filtered.length === 1 ? "prospecto" : "prospectos"}</div>}
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
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={16} className="app-lucide-spin" aria-hidden="true" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 48, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Nenhum prospecto encontrado.</div>
      ) : (
        filtered.map((s) => {
          const plats = s.plataformas ?? [];
          return (
            <div key={s.id} style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "18px 20px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: CTA_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FONT.body }}>
                  {(s.nome_artistico || "?")[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{s.nome_artistico}</span>
                    <StatusScoutBadge value={s.status} onChange={(v) => handleStatusChange(s, v)} readonly={!podeAlterarStatus(s)} />
                  </div>
                  {plats.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
                      {plats.map((p) => {
                        const plat = p as Plataforma;
                        const key = p.toLowerCase();
                        const link = s[`link_${key}` as keyof ScoutInfluencer] as string | null;
                        const views = s[`views_${key}` as keyof ScoutInfluencer] as number | null;
                        const platColor = PLAT_COLOR[plat] ?? t.textMuted;
                        const conteudo = (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: platColor, fontFamily: FONT.body, fontWeight: 600 }}>
                            <PlatLogo plataforma={p} size={13} isDark={isDark ?? false} />
                            {p}
                            {(views ?? 0) > 0 && (
                              <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 400 }}>
                                · {(views as number).toLocaleString("pt-BR")} {PLAT_METRICA[p] ?? "views"}
                              </span>
                            )}
                          </span>
                        );
                        return link?.trim() ? (
                          <a
                            key={p}
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver canal ${p} (abre em nova aba)`}
                            style={{ textDecoration: "none" }}
                          >
                            {conteudo}
                          </a>
                        ) : (
                          <span key={p}>{conteudo}</span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {s.operadora_slug && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "var(--brand-contrast-12)", border: "1px solid var(--brand-contrast-30)", fontSize: 11, fontWeight: 600, color: "var(--brand-contrast, #1e36f8)", fontFamily: FONT.body }}>
                        <Building2 size={11} aria-hidden="true" /> {operadorasOpt.find((o) => o.slug === s.operadora_slug)?.nome ?? s.operadora_slug}
                      </span>
                    )}
                    {toCacheNumber(s.cache_negociado) > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "var(--brand-action-12)", border: "1px solid var(--brand-action-30)", fontSize: 11, fontWeight: 600, color: "var(--brand-action, #7c3aed)", fontFamily: FONT.body }}>
                        {fmtBRL(toCacheNumber(s.cache_negociado))}
                      </span>
                    )}
                    {s.live_cassino === "sim" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "var(--brand-contrast-12)", border: "1px solid var(--brand-contrast-30)", fontSize: 11, fontWeight: 600, color: "var(--brand-contrast, #1e36f8)", fontFamily: FONT.body }}>
                        Live Cassino
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setModal({ mode: "visualizar", scout: s })}
                  aria-label={`Ver prospecto ${s.nome_artistico}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}
                >
                  <Eye size={13} aria-hidden="true" /> Ver
                </button>
                {podeEditarScout(s) && (
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "editar", scout: s })}
                    aria-label={`Editar prospecto ${s.nome_artistico}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: CTA_GRADIENT, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}
                  >
                    <Pencil size={13} aria-hidden="true" /> Editar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {modal?.mode === "visualizar" && modal.scout && (
        <ModalVisualizar scout={modal.scout} operadorasList={operadorasOpt} onClose={() => setModal(null)} isDark={isDark} />
      )}
      {modal?.mode === "editar" && modal.scout && (
        <ModalEditar scout={modal.scout} operadorasList={operadorasOpt} perm={perm} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadData(); }} isDark={isDark} />
      )}
      {modalNovo && (
        <ModalEditar scout={null} operadorasList={operadorasOpt} perm={perm} onClose={() => setModalNovo(false)} onSaved={() => { setModalNovo(false); loadData(); }} isDark={isDark} />
      )}
    </div>
  );
}

// ─── Modal Visualizar ─────────────────────────────────────────────────────────
function ModalVisualizar({ scout, operadorasList, onClose, isDark }: { scout: ScoutInfluencer; operadorasList: OperadoraScoutOpt[]; onClose: () => void; isDark?: boolean }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"contato" | "canais" | "anotacoes">("contato");
  const [anotacoes, setAnotacoes] = useState<ScoutAnotacao[]>([]);
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body };
  const row: CSSProperties = { marginBottom: 14 };
  const val = (v?: string | number | null) => <span style={{ fontSize: 13, color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>{v ?? "—"}</span>;
  const tabActiveBg = brand.useBrand
    ? "var(--brand-action-12)"
    : `${BRAND.roxoVivo}22`;

  useEffect(() => { containerRef.current?.focus(); }, []);

  useEffect(() => {
    if (scout?.id) {
      supabase.from("scout_anotacoes").select("id, scout_id, usuario_id, texto, created_at").eq("scout_id", scout.id).order("created_at", { ascending: false }).then(({ data }) => {
        const lista = (data ?? []) as ScoutAnotacao[];
        if (lista.some((a) => a.usuario_id)) {
          const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
          if (ids.length > 0) {
            supabase.from("profiles").select("id, name").in("id", ids).then(({ data: profs }) => {
              const map: Record<string, string> = {};
              (profs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name ?? p.id; });
              setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
            });
          } else setAnotacoes(lista);
        } else setAnotacoes(lista);
      });
    } else setAnotacoes([]);
  }, [scout?.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-scout-viz-title"
        style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px", maxHeight: "92vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 id="modal-scout-viz-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>{scout.nome_artistico}</h2>
            <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: `${STATUS_SCOUT_COLOR[scout.status]}22`, color: STATUS_SCOUT_COLOR[scout.status], fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>{STATUS_SCOUT_LABEL[scout.status]}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: brand.useBrand ? "var(--brand-action-12)" : `${BRAND.azul}0d`, border: brand.useBrand ? `1px solid var(--brand-action-border)` : `1px solid ${BRAND.azul}30`, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 18 }}>
          <Eye size={13} aria-hidden="true" style={{ color: brand.primary, flexShrink: 0 }} />
          <span>Modo visualização — somente leitura.</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {(["contato", "canais", "anotacoes"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              aria-pressed={tab === tb}
              onClick={() => setTab(tb)}
              style={{ padding: "7px 14px", borderRadius: 20, flexShrink: 0, border: `1px solid ${tab === tb ? brand.primary : t.cardBorder}`, background: tab === tb ? tabActiveBg : (t.inputBg ?? t.cardBg), color: tab === tb ? brand.primary : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}
            >
              {tb === "contato" ? "Contato" : tb === "canais" ? "Canais" : "Anotações"}
            </button>
          ))}
        </div>
        {tab === "contato" && (
          <>
            <div style={row}><label style={labelStyle}>E-mail</label>{val(scout.email)}</div>
            <div style={row}><label style={labelStyle}>Tipo de Contato</label>{val(scout.tipo_contato ? TIPO_CONTATO_OPTS.find((o) => o.value === scout.tipo_contato)?.label : null)}</div>
            {scout.tipo_contato === "agente" && <div style={row}><label style={labelStyle}>Nome do Agente</label>{val(scout.nome_agente)}</div>}
            <div style={row}><label style={labelStyle}>Telefone</label>{val(scout.telefone)}</div>
            <div style={row}><label style={labelStyle}>Cachê Negociado</label>{val(toCacheNumber(scout.cache_negociado) > 0 ? fmtBRL(toCacheNumber(scout.cache_negociado)) : null)}</div>
            <div style={row}><label style={labelStyle}>Live Cassino</label>{val(getLiveCassinoLabel(scout.live_cassino))}</div>
            <div style={row}><label style={labelStyle}>Operadora (parceria)</label>{val(scout.operadora_slug ? (operadorasList.find((o) => o.slug === scout.operadora_slug)?.nome ?? scout.operadora_slug) : null)}</div>
          </>
        )}
        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(scout.plataformas ?? []).length === 0 && <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>—</span>}
                {(scout.plataformas ?? []).map((p) => {
                  const plat = p as Plataforma;
                  const link = scout[`link_${p.toLowerCase()}` as keyof ScoutInfluencer] as string;
                  const views = scout[`views_${p.toLowerCase()}` as keyof ScoutInfluencer] as number;
                  return (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <PlatLogo plataforma={p} size={14} isDark={isDark ?? false} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {link ? (
                          <a href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" aria-label={`Ver canal ${p} (abre em nova aba)`} style={{ fontSize: 13, color: PLAT_COLOR[plat], fontFamily: FONT.body, fontWeight: 600, textDecoration: "none", wordBreak: "break-all" }}>{link}</a>
                        ) : (
                          <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Sem link</span>
                        )}
                        {views != null && views > 0 && <span style={{ display: "block", fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginTop: 2 }}>{views.toLocaleString("pt-BR")} {PLAT_METRICA[p] ?? "views"}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={row}><label style={labelStyle}>Categorias</label>{val((scout.categorias ?? []).join(", ") || null)}</div>
          </>
        )}
        {tab === "anotacoes" && (
          <div style={row}>
            <label style={labelStyle}>Histórico de Anotações</label>
            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {anotacoes.length === 0 ? (
                <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
              ) : anotacoes.map((a) => (
                <div key={a.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, fontSize: 12, fontFamily: FONT.body }}>
                  <div style={{ color: t.text }}>{a.texto}</div>
                  <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>{a.usuario_nome ?? "—"} • {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Editar ─────────────────────────────────────────────────────────────
function ModalEditar({ scout, operadorasList, perm, onClose, onSaved, isDark }: { scout: ScoutInfluencer | null; operadorasList: OperadoraScoutOpt[]; perm: Permissoes; onClose: () => void; onSaved: () => void; isDark?: boolean }) {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabActiveBg = brand.useBrand
    ? "var(--brand-action-12)"
    : `${BRAND.roxoVivo}22`;
  const [tab, setTab] = useState<"contato" | "canais" | "anotacoes">("contato");
  const [nomeArtistico, setNomeArtistico] = useState(scout?.nome_artistico ?? "");
  const [status, setStatus] = useState<StatusScout>(scout?.status ?? "visualizado");
  const [tipoContato, setTipoContato] = useState<string>(scout?.tipo_contato ?? "");
  const [nomeAgente, setNomeAgente] = useState(scout?.nome_agente ?? "");
  const [telefone, setTelefone] = useState(scout?.telefone ?? "");
  const [cacheNegociado, setCacheNegociado] = useState<number>(toCacheNumber(scout?.cache_negociado));
  const [liveCassino, setLiveCassino] = useState<string>(scout?.live_cassino ?? "");
  const [email, setEmail] = useState(scout?.email ?? "");
  const [operadoraSlug, setOperadoraSlug] = useState<string>(scout?.operadora_slug ?? "");
  const [plataformas, setPlataformas] = useState<string[]>(scout?.plataformas ?? []);
  const [categorias, setCategorias] = useState<string[]>(scout?.categorias ?? []);
  const [novoTextoAnotacao, setNovoTextoAnotacao] = useState("");
  const [anotacoes, setAnotacoes] = useState<ScoutAnotacao[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({
    twitch: scout?.link_twitch ?? "", youtube: scout?.link_youtube ?? "", kick: scout?.link_kick ?? "",
    instagram: scout?.link_instagram ?? "", tiktok: scout?.link_tiktok ?? "",
    discord: scout?.link_discord ?? "", whatsapp: scout?.link_whatsapp ?? "", telegram: scout?.link_telegram ?? "",
  });
  const [views, setViews] = useState<Record<string, number>>({
    twitch: scout?.views_twitch ?? 0, youtube: scout?.views_youtube ?? 0, kick: scout?.views_kick ?? 0,
    instagram: scout?.views_instagram ?? 0, tiktok: scout?.views_tiktok ?? 0,
    discord: scout?.views_discord ?? 0, whatsapp: scout?.views_whatsapp ?? 0, telegram: scout?.views_telegram ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [criandoUsuario, setCriandoUsuario] = useState(false);

  useEffect(() => {
    if (scout) {
      setNomeArtistico(scout.nome_artistico ?? "");
      setStatus(scout.status ?? "visualizado");
      setTipoContato(scout.tipo_contato ?? "");
      setNomeAgente(scout.nome_agente ?? "");
      setTelefone(scout.telefone ?? "");
      setCacheNegociado(toCacheNumber(scout.cache_negociado));
      setLiveCassino(scout.live_cassino ?? "");
      setEmail(scout.email ?? "");
      setOperadoraSlug(scout.operadora_slug ?? "");
      setPlataformas(scout.plataformas ?? []);
      setCategorias(scout.categorias ?? []);
      setLinks({ twitch: scout.link_twitch ?? "", youtube: scout.link_youtube ?? "", kick: scout.link_kick ?? "", instagram: scout.link_instagram ?? "", tiktok: scout.link_tiktok ?? "", discord: scout.link_discord ?? "", whatsapp: scout.link_whatsapp ?? "", telegram: scout.link_telegram ?? "" });
      setViews({ twitch: scout.views_twitch ?? 0, youtube: scout.views_youtube ?? 0, kick: scout.views_kick ?? 0, instagram: scout.views_instagram ?? 0, tiktok: scout.views_tiktok ?? 0, discord: scout.views_discord ?? 0, whatsapp: scout.views_whatsapp ?? 0, telegram: scout.views_telegram ?? 0 });
    } else {
      setNomeArtistico("");
      setStatus("visualizado");
      setTipoContato("");
      setNomeAgente("");
      setTelefone("");
      setCacheNegociado(0);
      setLiveCassino("");
      setEmail("");
      setOperadoraSlug("");
      setPlataformas([]);
      setCategorias([]);
      setLinks({ twitch: "", youtube: "", kick: "", instagram: "", tiktok: "", discord: "", whatsapp: "", telegram: "" });
      setViews({ twitch: 0, youtube: 0, kick: 0, instagram: 0, tiktok: 0, discord: 0, whatsapp: 0, telegram: 0 });
    }
  }, [scout]);

  useEffect(() => {
    if (scout?.id) {
      supabase
        .from("scout_anotacoes")
        .select("id, scout_id, usuario_id, texto, created_at")
        .eq("scout_id", scout.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const lista = (data ?? []) as ScoutAnotacao[];
          if (lista.some((a) => a.usuario_id)) {
            const ids = [...new Set(lista.map((a) => a.usuario_id).filter(Boolean))] as string[];
            if (ids.length > 0) {
              supabase.from("profiles").select("id, name").in("id", ids).then(({ data: profs }) => {
                const map: Record<string, string> = {};
                (profs ?? []).forEach((p: { id: string; name: string }) => { map[p.id] = p.name ?? p.id; });
                setAnotacoes(lista.map((a) => ({ ...a, usuario_nome: a.usuario_id ? map[a.usuario_id] : "—" })));
              });
            } else setAnotacoes(lista);
          } else setAnotacoes(lista);
        });
    } else setAnotacoes([]);
  }, [scout?.id]);

  useEffect(() => { containerRef.current?.focus(); }, []);

  const togglePlataforma = (p: string) => {
    setPlataformas((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };
  const toggleCategoria = (c: string) => {
    setCategorias((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  function getScoutData(): Omit<ScoutInfluencer, "id"> & { id?: string } {
    return {
      ...(scout?.id ? { id: scout.id } : {}),
      nome_artistico: (nomeArtistico ?? "").trim(),
      status,
      tipo_contato: tipoContato || null,
      nome_agente: tipoContato === "agente" ? nomeAgente.trim() || null : null,
      telefone: (tipoContato === "agente" || tipoContato === "direto") ? telefone.trim() || null : null,
      cache_negociado: cacheNegociado || null,
      live_cassino: liveCassino || null,
      email: email.trim() || null,
      operadora_slug: operadoraSlug.trim() || null,
      plataformas,
      categorias,
      link_twitch: links.twitch?.trim() || null,
      link_youtube: links.youtube?.trim() || null,
      link_kick: links.kick?.trim() || null,
      link_instagram: links.instagram?.trim() || null,
      link_tiktok: links.tiktok?.trim() || null,
      link_discord: links.discord?.trim() || null,
      link_whatsapp: links.whatsapp?.trim() || null,
      link_telegram: links.telegram?.trim() || null,
      views_twitch: views.twitch || null,
      views_youtube: views.youtube || null,
      views_kick: views.kick || null,
      views_instagram: views.instagram || null,
      views_tiktok: views.tiktok || null,
      views_discord: views.discord || null,
      views_whatsapp: views.whatsapp || null,
      views_telegram: views.telegram || null,
    };
  }

  async function handleSave() {
    setError("");
    if (!nomeArtistico.trim()) return setError("Nome artístico é obrigatório.");
    if (status === "fechado") {
      const dadosParaValidar = {
        nome_artistico: nomeArtistico.trim(),
        email: email?.trim(),
        cache_negociado: cacheNegociado,
        plataformas,
        link_twitch: links.twitch,
        link_youtube: links.youtube,
        link_kick: links.kick,
        link_instagram: links.instagram,
        link_tiktok: links.tiktok,
        link_discord: links.discord,
        link_whatsapp: links.whatsapp,
        link_telegram: links.telegram,
        views_twitch: views.twitch,
        views_youtube: views.youtube,
        views_kick: views.kick,
        views_instagram: views.instagram,
        views_tiktok: views.tiktok,
        views_discord: views.discord,
        views_whatsapp: views.whatsapp,
        views_telegram: views.telegram,
        operadora_slug: operadoraSlug.trim() || null,
      };
      const val = validarParaFechado(dadosParaValidar);
      if (!val.ok) return setError(val.msg ?? "Dados incompletos para Fechado.");
    }
    const temCanalSemLink = plataformas.some((p) => !(links[p.toLowerCase()] ?? "").trim());
    if (temCanalSemLink) return setError("Preencha o link de cada plataforma selecionada.");

    setSaving(true);
    try {
      let userId: string | null = null;
      if (status === "fechado" && (!scout?.user_id || !scout)) {
        setCriandoUsuario(true);
        try {
          const scoutData = getScoutData();
          userId = await criarUsuarioFechado(scout?.id ? { ...scoutData, id: scout.id } : scoutData);
        } finally {
          setCriandoUsuario(false);
        }
        if (!userId) throw new Error("Falha ao criar usuário para ativação.");
      }

      const payload: Record<string, unknown> = {
        nome_artistico: nomeArtistico.trim(),
        status,
        tipo_contato: tipoContato || null,
        nome_agente: tipoContato === "agente" ? nomeAgente.trim() || null : null,
        telefone: (tipoContato === "agente" || tipoContato === "direto") ? telefone.trim() || null : null,
        cache_negociado: cacheNegociado || null,
        live_cassino: liveCassino || null,
        email: email.trim() || null,
        operadora_slug: operadoraSlug.trim() || null,
        plataformas,
        categorias,
        link_twitch: links.twitch?.trim() || null,
        link_youtube: links.youtube?.trim() || null,
        link_kick: links.kick?.trim() || null,
        link_instagram: links.instagram?.trim() || null,
        link_tiktok: links.tiktok?.trim() || null,
        link_discord: links.discord?.trim() || null,
        link_whatsapp: links.whatsapp?.trim() || null,
        link_telegram: links.telegram?.trim() || null,
        views_twitch: views.twitch || null,
        views_youtube: views.youtube || null,
        views_kick: views.kick || null,
        views_instagram: views.instagram || null,
        views_tiktok: views.tiktok || null,
        views_discord: views.discord || null,
        views_whatsapp: views.whatsapp || null,
        views_telegram: views.telegram || null,
        updated_at: new Date().toISOString(),
      };
      if (!scout) payload.created_by = user?.id;
      if (userId) payload.user_id = userId;

      if (scout) {
        const { error: err } = await supabase.from("scout_influencer").update(payload).eq("id", scout.id);
        if (err) throw new Error(err.message);
        // Sincronizar cache para influencer_perfil quando status fechado (userId = recém-criado, scout.user_id = já existia)
        const userIdParaSync = userId ?? scout.user_id;
        if (status === "fechado" && userIdParaSync) {
          const cacheHora = toCacheNumber(cacheNegociado);
          const { error: syncErr } = await supabase.from("influencer_perfil").update({ cache_hora: cacheHora }).eq("id", userIdParaSync);
          if (syncErr) console.warn("[Scout] Falha ao sincronizar cache para influencer_perfil:", syncErr.message);
          const op = operadoraSlug.trim();
          if (op) {
            try {
              await vincularOperadoraInfluencerViaApi(userIdParaSync, op, scout.id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erro ao vincular operadora.");
              setSaving(false);
              return;
            }
          }
        }
      } else {
        const { error: err } = await supabase.from("scout_influencer").insert(payload);
        if (err) throw new Error(err.message);
      }

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function criarUsuarioFechado(s: Partial<ScoutInfluencer> & Pick<ScoutInfluencer, "email" | "nome_artistico">): Promise<string | null> {
    const em = (s.email ?? "").trim();
    if (!em) return null;
    const nome = (s.nome_artistico ?? "").trim();
    if (!nome) return null;

    const res = await fetch("/api/criar-usuario-scout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Apikey": supabaseAnonKey,
      },
      body: JSON.stringify({
        email: em,
        nome_artistico: nome,
        telefone: (s.telefone ?? "").trim() || undefined,
        cache_negociado: toCacheNumber(s.cache_negociado),
        scout_id: s.id ?? undefined,
        plataformas: s.plataformas ?? [],
        link_twitch: s.link_twitch ?? "",
        link_youtube: s.link_youtube ?? "",
        link_kick: s.link_kick ?? "",
        link_instagram: s.link_instagram ?? "",
        link_tiktok: s.link_tiktok ?? "",
        link_discord: s.link_discord ?? "",
        link_whatsapp: s.link_whatsapp ?? "",
        link_telegram: s.link_telegram ?? "",
        operadora_slug: (s.operadora_slug ?? "").toString().trim() || undefined,
      }),
    });
    const fnData = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((fnData as { error?: string })?.error ?? `Erro ${res.status}`);
    const uid = (fnData as { userId?: string })?.userId;
    if (!uid) throw new Error("Usuário criado mas ID não retornado");
    return uid;
  }

  async function handleExcluir() {
    if (!scout?.id || !perm.canExcluirOk) return;
    if (perm.canExcluir === "proprios" && scout.created_by !== user?.id) return;
    if (!confirmExcluir) { setConfirmExcluir(true); return; }

    const { error } = await supabase.from("scout_anotacoes").delete().eq("scout_id", scout.id);
    if (error) { setError(error.message); setConfirmExcluir(false); return; }
    const { error: err2 } = await supabase.from("scout_influencer").delete().eq("id", scout.id);
    if (err2) { setError(err2.message); setConfirmExcluir(false); return; }
    onSaved();
  }

  async function handleAddAnotacao() {
    if (!novoTextoAnotacao.trim() || !scout?.id) return;
    const texto = novoTextoAnotacao.trim();
    const { data: inserted, error: err } = await supabase.from("scout_anotacoes").insert({
      scout_id: scout.id,
      usuario_id: user?.id,
      texto,
    }).select("id, scout_id, usuario_id, texto, created_at").single();
    if (!err && inserted) {
      setNovoTextoAnotacao("");
      setAnotacoes((prev) => [{ ...inserted, usuario_nome: user?.name } as ScoutAnotacao, ...prev]);
    }
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-scout-edit-title"
        style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <h2 id="modal-scout-edit-title" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.03em" }}>{scout ? "Editar" : "Novo"} Prospecto</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center", padding: 4 }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div style={row}>
          <label style={labelStyle}>Nome Artístico</label>
          <input value={nomeArtistico} onChange={(e) => setNomeArtistico(e.target.value)} style={inputStyle} placeholder="Ex: NeryXLS" />
        </div>
        <div style={row}>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusScout)} style={{ ...inputStyle, cursor: "pointer" }}>
            {[...STATUS_SCOUT_OPTS].sort((a, b) => STATUS_SCOUT_LABEL[a].localeCompare(STATUS_SCOUT_LABEL[b], "pt-BR")).map((s) => (
              <option key={s} value={s}>{STATUS_SCOUT_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {(["contato", "canais", "anotacoes"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              aria-pressed={tab === tb}
              onClick={() => setTab(tb)}
              style={{ padding: "7px 14px", borderRadius: 20, flexShrink: 0, border: `1px solid ${tab === tb ? brand.primary : t.cardBorder}`, background: tab === tb ? tabActiveBg : (t.inputBg ?? t.cardBg), color: tab === tb ? brand.primary : t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body }}
            >
              {tb === "contato" ? "Contato" : tb === "canais" ? "Canais" : "Anotações"}
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

        {tab === "contato" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Tipo de Contato</label>
              <select value={tipoContato} onChange={(e) => setTipoContato(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">—</option>
                {[...TIPO_CONTATO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {tipoContato === "agente" && (
              <div style={row}>
                <label style={labelStyle}>Nome do Agente</label>
                <input value={nomeAgente} onChange={(e) => setNomeAgente(e.target.value)} style={inputStyle} placeholder="Nome do agente" />
              </div>
            )}
            {(tipoContato === "agente" || tipoContato === "direto") && (
              <div style={row}>
                <label style={labelStyle}>Telefone</label>
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
              </div>
            )}
            <div style={row}>
              <label style={labelStyle}>Cachê Negociado (R$)</label>
              <CurrencyInput value={cacheNegociado} onChange={(v) => setCacheNegociado(Math.max(0, v))} style={inputStyle} ariaLabel="Cachê negociado por hora" />
            </div>
            <div style={row}>
              <label style={labelStyle}>Live Cassino</label>
              <select value={liveCassino} onChange={(e) => setLiveCassino(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {[...LIVE_CASSINO_OPTS].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div style={row}>
              <label style={labelStyle}>E-mail {status === "fechado" && <span style={{ color: BRAND.vermelho }}>*</span>}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} type="email" placeholder="email@exemplo.com" />
            </div>
            <div style={row}>
              <label style={labelStyle}>
                Operadora (parceria) {status === "fechado" && <span style={{ color: BRAND.vermelho }}>*</span>}
              </label>
              {operadorasList.length === 0 ? (
                <p style={{ fontSize: 12, color: t.textMuted, margin: 0, fontFamily: FONT.body }}>Cadastre operadoras em Gestão de Operadoras.</p>
              ) : (
                <select value={operadoraSlug} onChange={(e) => setOperadoraSlug(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">— {status === "fechado" ? "Obrigatória para Fechado" : "Selecione"}</option>
                  {[...operadorasList].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                    <option key={o.slug} value={o.slug}>{o.nome}</option>
                  ))}
                </select>
              )}
              <p style={{ fontSize: 11, color: t.textMuted, margin: "6px 0 0", fontFamily: FONT.body, lineHeight: 1.35 }}>
                Ao fechar o prospecto, esta operadora é gravada no perfil do influencer (aba Operadoras) e no escopo do usuário na Gestão de Usuários — o mesmo vínculo exigido ao criar um influencer pela Gestão.
              </p>
            </div>
          </>
        )}

        {tab === "canais" && (
          <>
            <div style={row}>
              <label style={labelStyle}>Plataformas</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATAFORMAS.map((p) => {
                  const ativo = plataformas.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => togglePlataforma(p)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 20, cursor: "pointer", border: `2px solid ${ativo ? PLAT_COLOR[p] : t.cardBorder}`, background: ativo ? `${PLAT_COLOR[p]}22` : (t.inputBg ?? t.cardBg), color: ativo ? PLAT_COLOR[p] : t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                      <PlatLogo plataforma={p} size={13} isDark={isDark ?? false} /> {p}
                    </button>
                  );
                })}
              </div>
            </div>
            {plataformas.map((p) => {
              const key = p.toLowerCase();
              const metrica = PLAT_METRICA[p] ?? "Views";
              return (
                <div key={p} style={row}>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    <PlatLogo plataforma={p} size={12} isDark={isDark ?? false} /> {p} — Link e {metrica}
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input value={links[key] ?? ""} onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))} style={{ ...inputStyle, flex: 2 }} placeholder={`Link ${p}`} />
                    <input type="number" value={views[key] || ""} onChange={(e) => setViews((v) => ({ ...v, [key]: Math.max(0, Number(e.target.value) || 0) }))} style={{ ...inputStyle, flex: 1, minWidth: 80 }} placeholder={metrica} min={0} />
                  </div>
                </div>
              );
            })}
            <div style={row}>
              <label style={labelStyle}>Categorias (multi-seleção)</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {CATEGORIAS.map((c) => {
                  const sel = categorias.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleCategoria(c)}
                      style={{ padding: "6px 12px", borderRadius: 16, cursor: "pointer", border: `1px solid ${sel ? brand.primary : t.cardBorder}`, background: sel ? tabActiveBg : (t.inputBg ?? t.cardBg), color: sel ? brand.primary : t.textMuted, fontSize: 12, fontWeight: 600, fontFamily: FONT.body }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === "anotacoes" && scout && (
          <>
            <div style={row}>
              <label style={labelStyle}>Nova Anotação</label>
              <textarea value={novoTextoAnotacao} onChange={(e) => setNovoTextoAnotacao(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Digite sua anotação..." />
              <button type="button" onClick={() => void handleAddAnotacao()} disabled={!novoTextoAnotacao.trim()} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10, border: "none", cursor: novoTextoAnotacao.trim() ? "pointer" : "not-allowed", background: "var(--brand-contrast, #1e36f8)", color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: FONT.body }}>
                Adicionar Anotação
              </button>
            </div>
            <div style={row}>
              <label style={labelStyle}>Histórico de Anotações</label>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {anotacoes.length === 0 ? (
                  <span style={{ fontSize: "13px", color: t.textMuted, fontFamily: FONT.body }}>Nenhuma anotação ainda.</span>
                ) : (
                  anotacoes.map((a) => (
                    <div key={a.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, fontSize: 12, fontFamily: FONT.body }}>
                      <div style={{ color: t.text }}>{a.texto}</div>
                      <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>{a.usuario_nome ?? "—"} • {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
          {scout && perm.canExcluirOk && (perm.canExcluir !== "proprios" || scout.created_by === user?.id) && (
            <button
              type="button"
              onClick={() => void handleExcluir()}
              disabled={saving}
              onBlur={() => setConfirmExcluir(false)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
                border: `1px solid ${confirmExcluir ? BRAND.vermelho : `${BRAND.vermelho}80`}`,
                background: confirmExcluir ? BRAND.vermelho : `${BRAND.vermelho}18`,
                color: confirmExcluir ? "#fff" : BRAND.vermelho,
                fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              {confirmExcluir ? "Confirmar exclusão?" : "Excluir"}
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }} />
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving}
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: CTA_GRADIENT, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && criandoUsuario ? (
              <><Loader2 size={14} className="app-lucide-spin" aria-hidden="true" /> Criando usuário...</>
            ) : saving ? (
              <><Loader2 size={14} className="app-lucide-spin" aria-hidden="true" /> Salvando...</>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
