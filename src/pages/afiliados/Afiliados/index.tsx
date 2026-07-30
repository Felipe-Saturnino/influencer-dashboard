import { useState, useEffect, useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useModalEscape } from "../../../hooks/useModalEscape";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { Operadora, InfluencerOperadora, Role } from "../../../types";
import { Eye, EyeOff, Pencil, X, ChevronDown, Loader2, Users, AlertCircle, CheckCircle, Building2, Contact, Briefcase, Coins, History } from "lucide-react";
import { FiltroBarTabButton, FILTRO_BAR_TAB_ICON_PROPS, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import OperadoraTag from "../../../components/OperadoraTag";
import { isAfiliadoPerfilIncompleto } from "../../../lib/afiliadoPerfilCompleto";
import { influencerElegivelQuadroPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { DashboardPageHeader, FiltroOperadoraSelect, FiltroStatusSemanticoPill } from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import {
  getPageFilterBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../lib/pageContentBoxStyles";

function SensitiveField({
  value, label, labelStyle, textStyle, editMode = false,
}: {
  value?: string; label?: string; labelStyle?: CSSProperties;
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
        <span style={{ ...textStyle, filter: visible ? "none" : "blur(5px)", userSelect: visible ? "auto" : "none", transition: "filter 0.2s", cursor: visible ? "text" : "default" }}>{display}</span>
        <button type="button" onClick={() => visible ? setVisible(false) : reveal()} aria-label={visible ? `Ocultar ${label ?? "dado sensível"}` : `Revelar ${label ?? "dado sensível"}`} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 2, flexShrink: 0, display: "flex", alignItems: "center", opacity: 0.7 }}>
          {visible ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

type StatusAfiliado = "ativo" | "inativo" | "cancelado";
const STATUS_OPTS: StatusAfiliado[] = ["ativo", "inativo", "cancelado"];
const STATUS_COLOR: Record<StatusAfiliado, string> = { ativo: BRAND.verde, inativo: BRAND.amarelo, cancelado: BRAND.vermelho };
const STATUS_LABEL: Record<StatusAfiliado, string> = { ativo: "Ativo", inativo: "Inativo", cancelado: "Cancelado" };

interface Perfil {
  id: string;
  nome_artistico?: string | null;
  nome_completo?: string | null;
  status?: StatusAfiliado;
  telefone?: string | null;
  cpf?: string | null;
  operacao?: string | null;
  cache_hora?: number | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  created_at?: string;
  updated_at?: string;
  status_alterado_em?: string | null;
}

interface AfiliadoRow {
  id: string;
  name: string;
  email: string;
  perfil: Perfil | null;
  operadoras: InfluencerOperadora[];
}

const emptyPerfil = (id: string): Perfil => ({
  id, nome_artistico: "", nome_completo: "", status: "ativo", telefone: "", cpf: "", operacao: "",
  cache_hora: 0, banco: "", agencia: "", conta: "", chave_pix: "",
});

function StatusBadge({ value, onChange, readonly }: { value: StatusAfiliado; onChange: (v: StatusAfiliado) => void; readonly?: boolean }) {
  const { theme: t } = useApp();
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[value] ?? "#888";
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => { if (!readonly) setOpen((o) => !o); }} {...(!readonly ? { "aria-haspopup": "menu" as const, "aria-expanded": open } : {})} aria-label={`Status: ${STATUS_LABEL[value]}`} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${color}`, background: `${color}18`, color, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: readonly ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
        {STATUS_LABEL[value]}
        {!readonly && <ChevronDown size={9} style={{ opacity: 0.7 }} aria-hidden="true" />}
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200, minWidth: 140, overflow: "hidden" }}>
          {STATUS_OPTS.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => { onChange(s); setOpen(false); }} style={{ display: "block", width: "100%", padding: "9px 14px", border: "none", background: s === value ? `${STATUS_COLOR[s]}18` : "transparent", color: STATUS_COLOR[s], fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", fontFamily: FONT.body }}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type AfiliadoModalTab = "cadastral" | "operacao" | "financeiro" | "operadoras" | "historico";

const AFILIADO_TAB_ICONS: Record<AfiliadoModalTab, ReactNode> = {
  cadastral: <Contact {...FILTRO_BAR_TAB_ICON_PROPS} />,
  operacao: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
  financeiro: <Coins {...FILTRO_BAR_TAB_ICON_PROPS} />,
  operadoras: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  historico: <History {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function AfiliadoModalTabs({
  tabs,
  tab,
  setTab,
  tabIdPrefix,
  panelIdPrefix,
}: {
  tabs: { key: AfiliadoModalTab; label: string }[];
  tab: AfiliadoModalTab;
  setTab: (k: AfiliadoModalTab) => void;
  tabIdPrefix: string;
  panelIdPrefix: string;
}) {
  const tabKeys = tabs.map((tb) => tb.key);
  return (
    <div
      role="tablist"
      aria-label="Seções"
      style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, setTab, (k) => `${tabIdPrefix}${k}`)}
    >
      {tabs.map((tb) => (
        <FiltroBarTabButton
          key={tb.key}
          id={`${tabIdPrefix}${tb.key}`}
          active={tab === tb.key}
          aria-controls={`${panelIdPrefix}${tb.key}`}
          onClick={() => setTab(tb.key)}
          icon={AFILIADO_TAB_ICONS[tb.key]}
        >
          {tb.label}
        </FiltroBarTabButton>
      ))}
    </div>
  );
}

export default function Afiliados() {
  const { theme: t, user, podeVerInfluencer, podeVerOperadora } = useApp();
  const brand = useDashboardBrand();
  const ctaGradient = brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
  const { operadoraSlugsForcado, showFiltroOperadora } = useDashboardFiltros();
  const perm = usePermission("afiliados");
  const showManagementUI = user?.role !== "afiliado";

  const podeEditarAf = (id: string) => perm.canEditarOk && (perm.canEditar !== "proprios" || podeVerInfluencer(id));
  const podeAlterarStatus = !!user?.role && ROLES_STAFF_OPERACOES_LIVES.includes(user.role as Role);

  const [list, setList] = useState<AfiliadoRow[]>([]);
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);
  const operadorasNoEscopo = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const operadorasAtivasNoEscopo = operadorasNoEscopo.filter((o) => o.ativo);
  const opsColorMap = Object.fromEntries(operadorasList.map((o) => [o.slug, o.brand_action?.trim() || undefined]));
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "visualizar" | "editar"; row?: AfiliadoRow } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterOp, setFilterOp] = useState<string>("todas");
  const [statusError, setStatusError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: opsList } = await supabase.from("operadoras").select("*").order("nome");
    setOperadorasList(opsList ?? []);
    const opsMap = Object.fromEntries((opsList ?? []).map((o: Operadora) => [o.slug, o.nome]));

    if (showManagementUI) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", "afiliado")
        .or("ativo.is.null,ativo.eq.true")
        .order("name");
      if (profiles) {
        const ids = profiles.map((p: { id: string }) => p.id);
        const [perfisRes, opsRes] = await Promise.all([
          ids.length > 0 ? supabase.from("influencer_perfil").select("*").in("id", ids) : { data: [] as Perfil[] },
          ids.length > 0 ? supabase.from("influencer_operadoras").select("*").in("influencer_id", ids) : { data: [] as InfluencerOperadora[] },
        ]);
        const perfisMap: Record<string, Perfil> = {};
        (perfisRes.data ?? []).forEach((p: Perfil) => { perfisMap[p.id] = p; });
        const opsPor: Record<string, InfluencerOperadora[]> = {};
        (opsRes.data ?? []).forEach((o: InfluencerOperadora) => {
          if (!opsPor[o.influencer_id]) opsPor[o.influencer_id] = [];
          opsPor[o.influencer_id].push({ ...o, operadora_nome: opsMap[o.operadora_slug] ?? o.operadora_nome });
        });
        setList(profiles.map((p: { id: string; name?: string | null; email?: string | null }) => ({
          id: p.id,
          name: p.name ?? p.email ?? "",
          email: p.email ?? "",
          perfil: perfisMap[p.id] ?? null,
          operadoras: opsPor[p.id] ?? [],
        })));
      }
    } else if (user) {
      const [perfilRes, opsRes] = await Promise.all([
        supabase.from("influencer_perfil").select("*").eq("id", user.id).single(),
        supabase.from("influencer_operadoras").select("*").eq("influencer_id", user.id),
      ]);
      const operadoras = ((opsRes.data ?? []) as InfluencerOperadora[]).map((o) => ({ ...o, operadora_nome: opsMap[o.operadora_slug] ?? o.operadora_nome }));
      setList([{ id: user.id, name: user.name, email: user.email, perfil: perfilRes.data ?? null, operadoras }]);
    }
    setLoading(false);
  }, [showManagementUI, user]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleStatusChange(id: string, newStatus: StatusAfiliado) {
    if (!podeAlterarStatus) return;
    const previousStatus = list.find((i) => i.id === id)?.perfil?.status;
    const agoraIso = new Date().toISOString();
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(id)), status: newStatus, ...(previousStatus !== newStatus ? { status_alterado_em: agoraIso } : {}) } } : i)));
    const upsertPatch: Record<string, unknown> = { id, status: newStatus };
    if (previousStatus !== newStatus) upsertPatch.status_alterado_em = agoraIso;
    const { error } = await supabase.from("influencer_perfil").upsert(upsertPatch, { onConflict: "id" });
    if (error) {
      setList((prev) => prev.map((i) => (i.id === id ? { ...i, perfil: { ...(i.perfil ?? emptyPerfil(id)), status: previousStatus ?? "ativo" } } : i)));
      setStatusError("Erro ao salvar status. Tente novamente.");
    }
  }

  const filtered = list.filter((inf) => {
    if (!podeVerInfluencer(inf.id)) return false;
    const p = inf.perfil;
    const nomeEx = p?.nome_artistico?.trim() || inf.name || "";
    if (search.trim() && !textoContemBuscaEmAlgum(search, nomeEx, inf.name, inf.email)) return false;
    if (filterStatus !== "todos" && (p?.status ?? "ativo") !== filterStatus) return false;
    if (operadoraSlugsForcado?.length) {
      if (!inf.operadoras?.some((o) => operadoraSlugsForcado.includes(o.operadora_slug))) return false;
    } else if (filterOp !== "todas") {
      if (!inf.operadoras?.some((o) => o.operadora_slug === filterOp)) return false;
    }
    return true;
  });

  const listNoEscopo = list.filter((i) => {
    if (!podeVerInfluencer(i.id)) return false;
    if (operadoraSlugsForcado?.length) {
      if (!i.operadoras?.some((o) => operadoraSlugsForcado.includes(o.operadora_slug))) return false;
    }
    return true;
  });

  const incompletos = listNoEscopo.filter((i) =>
    influencerElegivelQuadroPerfilIncompleto(i.perfil, true) &&
    isAfiliadoPerfilIncompleto(i.perfil, i.perfil?.nome_artistico ?? i.name ?? "", i.email),
  );

  const porStatus: Record<StatusAfiliado, number> = { ativo: 0, inativo: 0, cancelado: 0 };
  listNoEscopo.forEach((inf) => { porStatus[inf.perfil?.status ?? "ativo"]++; });

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";
  const cardStyle: CSSProperties = {
    background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: "18px 20px", marginBottom: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", boxShadow: cardShadow,
  };

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar esta página.</div>;
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <DashboardPageHeader icon={<PageMenuIcon pageKey="afiliados" />} title={getPageMenuLabel("afiliados")} subtitle={showManagementUI ? "Gerencie o cadastro de parceiros afiliados com perfil, financeiro e operadoras." : "Seu perfil de afiliado na plataforma."} brand={brand} t={t} right={showManagementUI ? undefined : <AjudaContextualAcoes pageKey="afiliados" />} />

      {showManagementUI && (
        <div className="app-grid-2" style={{ ...getPageKpiSectionGapStyle(), gap: 16 }}>
          <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: brand.secondary, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <Users size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Total de Afiliados
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: t.text, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>{listNoEscopo.length}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {STATUS_OPTS.map((s) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{STATUS_LABEL[s]}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[s], fontFamily: FONT.body }}>{porStatus[s]}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: brand.blockBg, border: `1px solid ${BRAND.vermelho}33`, borderRadius: 18, padding: 20, boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: BRAND.vermelho, letterSpacing: "1px", textTransform: "uppercase", fontFamily: FONT.body, marginBottom: 6 }}>
              <AlertCircle size={13} aria-hidden="true" /> Perfis Incompletos
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: BRAND.vermelho, fontFamily: FONT_TITLE, marginBottom: 12, lineHeight: 1 }}>{incompletos.length}</div>
            {incompletos.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: BRAND.verde, fontFamily: FONT.body }}>
                <CheckCircle size={14} aria-hidden="true" /> Todos os perfis ativos estão completos!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {incompletos.map((inf) => {
                  const nomeInf = inf.perfil?.nome_artistico || inf.name;
                  return podeEditarAf(inf.id) ? (
                    <button type="button" key={inf.id} onClick={() => setModal({ mode: "editar", row: inf })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontSize: 13, color: BRAND.azul, fontFamily: FONT.body, textDecoration: "underline", fontWeight: 500 }}>
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

      {showManagementUI && (
        <div style={getPageFilterBoxStyle(brand, t)}>
            {/* Linha 1: Status + Operadora */}
            <div className="app-filter-bar-tabs-cta">
            <span className="app-filter-bar-tabs-cta__spacer" aria-hidden />
            <div className="app-filter-bar-tabs-cta__tabs" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Status</span>
              {STATUS_OPTS.map((s) => (
                <FiltroStatusSemanticoPill
                  key={s}
                  label={STATUS_LABEL[s]}
                  semanticColor={STATUS_COLOR[s]}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(filterStatus === s ? "todos" : s)}
                />
              ))}
              {showFiltroOperadora && operadorasAtivasNoEscopo.length > 0 && (
                <>
                  <span style={{ width: 1, height: 16, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} aria-hidden="true" />
                  <FiltroOperadoraSelect
                    pill
                    minWidth={200}
                    value={filterOp}
                    onChange={setFilterOp}
                    operadoras={operadorasAtivasNoEscopo}
                  />
                </>
              )}
            </div>
            <div className="app-filter-bar-tabs-cta__actions">
              <AjudaContextualAcoes pageKey="afiliados" />
            </div>
            </div>

            {/* Linha 2: Busca */}
            <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`, width: "100%" }}>
              <BarraPesquisaPagina
                value={search}
                onChange={setSearch}
                placeholder={PAGE_SEARCH.nomeEmail}
                aria-label="Buscar por nome ou e-mail"
                wrapperStyle={{ width: "100%" }}
              />
            </div>
            {(filterStatus !== "todos" || filterOp !== "todas" || search) && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                <button type="button" onClick={() => { setFilterStatus("todos"); setFilterOp("todas"); setSearch(""); }} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${BRAND.vermelho}44`, background: `${BRAND.vermelho}11`, color: BRAND.vermelho, fontSize: 12, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <X size={12} aria-hidden="true" /> Limpar filtros
                </button>
              </div>
            )}
        </div>
      )}

      {statusError && (
        <div role="alert" aria-live="polite" style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {statusError}
          <button type="button" onClick={() => setStatusError("")} aria-label="Fechar erro" style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho }}><X size={14} aria-hidden="true" /></button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={16} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-label="Carregando…" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, justifyContent: "center", padding: 48 }}>Nenhum afiliado encontrado.</div>
      ) : (
        filtered.map((inf) => {
          const p = inf.perfil;
          const status: StatusAfiliado = p?.status ?? "ativo";
          const opsAtivas = (inf.operadoras ?? []).filter((o) => o.ativo);
          const incompleto = isAfiliadoPerfilIncompleto(p, p?.nome_artistico ?? inf.name ?? "", inf.email);
          return (
            <div key={inf.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: ctaGradient, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FONT.body }}>
                  {((p?.nome_artistico || inf.name) || inf.email)[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{p?.nome_artistico || inf.name}</span>
                    <StatusBadge value={status} onChange={(v) => void handleStatusChange(inf.id, v)} readonly={!podeAlterarStatus} />
                    {incompleto && status === "ativo" && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 9px", borderRadius: 20, background: `${BRAND.vermelho}22`, color: BRAND.vermelho, fontWeight: 600, fontFamily: FONT.body }}>
                        <AlertCircle size={10} aria-hidden="true" /> Perfil incompleto
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {opsAtivas.length === 0 ? (
                      <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>—</span>
                    ) : (
                      opsAtivas.map((o) => (
                        <OperadoraTag key={o.operadora_slug} label={o.operadora_nome ?? o.operadora_slug} corPrimaria={opsColorMap[o.operadora_slug]} icon={<Building2 size={11} aria-hidden="true" />} />
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => setModal({ mode: "visualizar", row: inf })} aria-label={`Ver ${p?.nome_artistico || inf.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.textMuted, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer" }}>
                  <Eye size={13} aria-hidden="true" /> Ver
                </button>
                {podeEditarAf(inf.id) && (
                  <button type="button" onClick={() => setModal({ mode: "editar", row: inf })} aria-label={`Editar ${p?.nome_artistico || inf.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: ctaGradient, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body }}>
                    <Pencil size={13} aria-hidden="true" /> Editar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {modal?.mode === "visualizar" && modal.row && (
        <ModalVer row={modal.row} operadorasList={operadorasNoEscopo} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "editar" && modal.row && (
        <ModalEditar row={modal.row} operadorasList={operadorasNoEscopo} onClose={() => setModal(null)} onSaved={() => { setModal(null); void loadData(); }} podeAlterarStatus={podeAlterarStatus} />
      )}
    </div>
  );
}

type OpForm = Record<string, { ativo: boolean; id_operadora: string }>;

function fmtTs(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch { return "—"; }
}

function ModalVer({ row, operadorasList, onClose }: { row: AfiliadoRow; operadorasList: Operadora[]; onClose: () => void }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"cadastral" | "operacao" | "financeiro" | "operadoras" | "historico">("cadastral");
  const p = row.perfil;
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body };
  const rowS: CSSProperties = { marginBottom: 14 };
  const val = (v?: string | number | null) => <span style={{ fontSize: 13, color: v ? t.text : t.textMuted, fontFamily: FONT.body }}>{v || "—"}</span>;
  useModalEscape(onClose, true);
  useEffect(() => { const id = window.setTimeout(() => ref.current?.focus(), 50); return () => window.clearTimeout(id); }, []);
  const tabs = [
    { key: "cadastral" as const, label: "Cadastral" },
    { key: "operacao" as const, label: "Operação" },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "operadoras" as const, label: "Operadoras" },
    { key: "historico" as const, label: "Histórico" },
  ];
  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="af-mod-v-t" style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "min(92vh, 90dvh)", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 id="af-mod-v-t" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{p?.nome_artistico || row.name}</h2>
              {p?.status && <StatusBadge value={p.status} onChange={() => {}} readonly />}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{row.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4 }}><X size={18} aria-hidden="true" /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 8%, transparent)" : `${BRAND.azul}0d`, border: brand.useBrand ? `1px solid color-mix(in srgb, var(--brand-accent) 30%, transparent)` : `1px solid ${BRAND.azul}30`, fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 18 }}>
          <Eye size={13} aria-hidden="true" style={{ color: brand.primary }} /> Modo visualização — somente leitura. Dados sensíveis protegidos.
        </div>
        <AfiliadoModalTabs tabs={tabs} tab={tab} setTab={setTab} tabIdPrefix="tab-af-ver-" panelIdPrefix="panel-af-ver-" />
        {tab === "cadastral" && (
          <div role="tabpanel" id="panel-af-ver-cadastral" aria-labelledby="tab-af-ver-cadastral">
            <div style={rowS}><label style={labelStyle}>E-mail</label>{val(row.email)}</div>
            <div style={rowS}><label style={labelStyle}>Telefone</label>{val(p?.telefone)}</div>
            <div style={rowS}><SensitiveField value={p?.cpf ?? undefined} label="CPF" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} /></div>
          </div>
        )}
        {tab === "operacao" && (
          <div role="tabpanel" id="panel-af-ver-operacao" aria-labelledby="tab-af-ver-operacao">
            <div style={rowS}><label style={labelStyle}>Operação</label><div style={{ fontSize: 13, color: (p?.operacao ?? "").trim() ? t.text : t.textMuted, fontFamily: FONT.body, whiteSpace: "pre-wrap" }}>{(p?.operacao ?? "").trim() || "—"}</div></div>
          </div>
        )}
        {tab === "financeiro" && (
          <div role="tabpanel" id="panel-af-ver-financeiro" aria-labelledby="tab-af-ver-financeiro">
            <div style={rowS}><SensitiveField value={p?.chave_pix ?? undefined} label="Chave PIX" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} /></div>
            <div style={rowS}><SensitiveField value={p?.banco ?? undefined} label="Banco" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} /></div>
            <div className="app-grid-2-tight" style={{ ...rowS, gap: 12 }}>
              <SensitiveField value={p?.agencia ?? undefined} label="Agência" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
              <SensitiveField value={p?.conta ?? undefined} label="Conta" labelStyle={labelStyle} textStyle={{ fontSize: 13, color: t.text, fontFamily: FONT.body }} />
            </div>
          </div>
        )}
        {tab === "operadoras" && (
          <div role="tabpanel" id="panel-af-ver-operadoras" aria-labelledby="tab-af-ver-operadoras">
          {operadorasList.length === 0 ? <p style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT.body }}>Nenhuma operadora cadastrada na plataforma.</p> : operadorasList.map((op) => {
            const v = row.operadoras?.find((o) => o.operadora_slug === op.slug);
            const ativo = !!v?.ativo;
            const id = v?.id_operadora;
            const opColor = op.brand_action?.trim() || "var(--brand-primary, #7c3aed)";
            return (
              <div key={op.slug} style={{ marginBottom: 14, padding: 14, borderRadius: 12, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}><Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}</span>
                  <span style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>{ativo ? "Ativo" : "Inativo"}</span>
                </div>
                {ativo && id && <div style={{ marginTop: 8, fontSize: 13, color: t.text, fontFamily: FONT.body }}>ID: {id}</div>}
              </div>
            );
          })}
          </div>
        )}
        {tab === "historico" && (
          <div role="tabpanel" id="panel-af-ver-historico" aria-labelledby="tab-af-ver-historico">
            <div style={rowS}><label style={labelStyle}>Data de criação (cadastro)</label>{val(fmtTs(p?.created_at))}</div>
            <div style={rowS}><label style={labelStyle}>Data da última atualização</label>{val(fmtTs(p?.updated_at))}</div>
            <div style={rowS}><label style={labelStyle}>Data da última alteração de status</label>{val(fmtTs(p?.status_alterado_em))}</div>
            <p style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, margin: 0, lineHeight: 1.45 }}>As datas vêm do cadastro do afiliado. A alteração de status é registrada a partir desta versão do sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalEditar({
  row, operadorasList, onClose, onSaved, podeAlterarStatus,
}: {
  row: AfiliadoRow;
  operadorasList: Operadora[];
  onClose: () => void;
  onSaved: () => void;
  podeAlterarStatus: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const ref = useRef<HTMLDivElement>(null);
  const existing = row.perfil;
  const ctaSalvar = brand.useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
  useModalEscape(onClose, true);

  const [editNomeCompleto, setEditNomeCompleto] = useState(existing?.nome_completo ?? "");
  const [form, setForm] = useState<Perfil>(existing ?? emptyPerfil(row.id));
  const [opForm, setOpForm] = useState<OpForm>(() => {
    const m: OpForm = {};
    operadorasList.forEach((o) => {
      const v = row.operadoras?.find((x) => x.operadora_slug === o.slug);
      m[o.slug] = v ? { ativo: !!v.ativo, id_operadora: v.id_operadora ?? "" } : { ativo: false, id_operadora: "" };
    });
    return m;
  });
  const [tab, setTab] = useState<AfiliadoModalTab>("cadastral");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setEditNomeCompleto(row.perfil?.nome_completo ?? "");
    setForm(row.perfil ?? emptyPerfil(row.id));
    const next: OpForm = {};
    operadorasList.forEach((o) => {
      const v = row.operadoras?.find((x) => x.operadora_slug === o.slug);
      next[o.slug] = v ? { ativo: !!v.ativo, id_operadora: v.id_operadora ?? "" } : { ativo: false, id_operadora: "" };
    });
    setOpForm(next);
  }, [row.id, row.perfil, row.operadoras, operadorasList]);

  useEffect(() => { const id = window.setTimeout(() => ref.current?.focus(), 50); return () => window.clearTimeout(id); }, []);

  const set = (key: keyof Perfil, val: Perfil[keyof Perfil]) => setForm((f) => ({ ...f, [key]: val }));
  const setOp = (slug: string, patch: Partial<{ ativo: boolean; id_operadora: string }>) => {
    setOpForm((prev) => {
      const cur = prev[slug] ?? { ativo: false, id_operadora: "" };
      return { ...prev, [slug]: { ...cur, ...patch } };
    });
  };

  async function handleSave() {
    setError("");
    if (!(form.nome_artistico ?? "").trim()) return setError("Nome artístico é obrigatório.");
    if (!editNomeCompleto.trim()) return setError("Nome completo é obrigatório.");
    if (!(form.telefone ?? "").trim()) return setError("Telefone é obrigatório.");
    if (!(form.cpf ?? "").trim()) return setError("CPF é obrigatório.");
    if (!(form.chave_pix ?? "").trim()) return setError("Chave PIX é obrigatória.");
    if (!(form.banco ?? "").trim()) return setError("Banco é obrigatório.");
    if (!(form.agencia ?? "").trim()) return setError("Agência é obrigatória.");
    if (!(form.conta ?? "").trim()) return setError("Conta é obrigatória.");

    const opsAtivas = Object.entries(opForm).filter(([, st]) => st.ativo);
    if (opsAtivas.some(([, st]) => !st.id_operadora?.trim())) return setError("Preencha o ID de cada operadora ativa.");

    setSaving(true);
    if (form.nome_artistico?.trim()) await supabase.from("profiles").update({ name: form.nome_artistico.trim() }).eq("id", row.id);

    const payload: Record<string, unknown> = {
      ...form,
      nome_completo: editNomeCompleto.trim(),
      updated_at: new Date().toISOString(),
    };
    if (existing && podeAlterarStatus && form.status !== existing.status) {
      payload.status_alterado_em = new Date().toISOString();
    }
    if (!podeAlterarStatus && existing) {
      payload.status = existing.status ?? "ativo";
    }
    if (existing && (payload.cache_hora == null || Number.isNaN(Number(payload.cache_hora)))) payload.cache_hora = existing.cache_hora ?? 0;

    const insertPayload = { ...payload, id: row.id };
    const { error: err } = existing
      ? await supabase.from("influencer_perfil").update(payload).eq("id", row.id)
      : await supabase.from("influencer_perfil").insert(insertPayload);
    if (err) { setError(err.message); setSaving(false); return; }

    const slugs = new Set(operadorasList.map((o) => o.slug));
    for (const slug of slugs) {
      const st = opForm[slug] ?? { ativo: false, id_operadora: "" };
      await supabase.from("influencer_operadoras").delete().eq("influencer_id", row.id).eq("operadora_slug", slug);
      if (st.ativo && st.id_operadora?.trim()) {
        await supabase.from("influencer_operadoras").insert({ influencer_id: row.id, operadora_slug: slug, id_operadora: st.id_operadora.trim(), ativo: true });
      }
    }
    setSaving(false);
    onSaved();
  }

  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg ?? t.cardBg, color: t.text, fontSize: 13, fontFamily: FONT.body, outline: "none" };
  const labelStyle: CSSProperties = { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.1px", textTransform: "uppercase", color: t.textMuted, marginBottom: 5, fontFamily: FONT.body };
  const rowS: CSSProperties = { marginBottom: 14 };
  const tabs = [
    { key: "cadastral" as const, label: "Cadastral" },
    { key: "operacao" as const, label: "Operação" },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "operadoras" as const, label: "Operadoras" },
  ];

  return (
    <div className="app-modal-overlay-pad" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="af-mod-e-t" style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, maxHeight: "min(92vh, 90dvh)", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 id="af-mod-e-t" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE }}>{form.nome_artistico?.trim() || row.name}</h2>
              <StatusBadge value={form.status ?? "ativo"} onChange={(v) => set("status", v)} readonly={!podeAlterarStatus} />
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{row.email}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar modal" title="Fechar modal" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4 }}><X size={18} aria-hidden="true" /></button>
        </div>

        <AfiliadoModalTabs tabs={tabs} tab={tab} setTab={setTab} tabIdPrefix="tab-af-ed-" panelIdPrefix="panel-af-ed-" />

        {error && (
          <div role="alert" aria-live="polite" style={{ background: `${BRAND.vermelho}18`, border: `1px solid ${BRAND.vermelho}44`, color: BRAND.vermelho, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, fontFamily: FONT.body, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Fechar erro" style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.vermelho }}><X size={14} aria-hidden="true" /></button>
          </div>
        )}

        {tab === "cadastral" && (
          <div role="tabpanel" id="panel-af-ed-cadastral" aria-labelledby="tab-af-ed-cadastral">
            <div style={rowS}>
              <label style={labelStyle}>Nome Artístico <CampoObrigatorioMark /></label>
              <input value={form.nome_artistico ?? ""} onChange={(e) => set("nome_artistico", e.target.value)} style={inputStyle} />
            </div>
            <div style={rowS}>
              <label style={labelStyle}>Nome Completo <CampoObrigatorioMark /></label>
              <input value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} style={inputStyle} />
            </div>
            <div style={rowS}><label style={labelStyle}>E-mail</label><input value={row.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} /></div>
            <div style={rowS}><label style={labelStyle}>Telefone <CampoObrigatorioMark /></label><input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} style={inputStyle} /></div>
            <div style={rowS}><label style={labelStyle}>CPF <CampoObrigatorioMark /> <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label><input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.1em" }} /></div>
          </div>
        )}
        {tab === "operacao" && (
          <div role="tabpanel" id="panel-af-ed-operacao" aria-labelledby="tab-af-ed-operacao">
          <div style={rowS}>
            <label style={labelStyle}>Operação</label>
            <textarea value={form.operacao ?? ""} onChange={(e) => set("operacao", e.target.value)} style={{ ...inputStyle, minHeight: 160, resize: "vertical" }} />
          </div>
          </div>
        )}
        {tab === "financeiro" && (
          <div role="tabpanel" id="panel-af-ed-financeiro" aria-labelledby="tab-af-ed-financeiro">
            {([
              { key: "chave_pix" as const, label: "Chave PIX", ph: "CPF, e-mail, telefone ou chave aleatória" },
              { key: "banco" as const, label: "Banco", ph: "Ex: Nubank, Itaú" },
            ] as const).map(({ key, label, ph }) => (
              <div key={key} style={rowS}>
                <label style={labelStyle}>{label} <CampoObrigatorioMark /> <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(dado sensível)</span></label>
                <input value={(form[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} style={inputStyle} placeholder={ph} />
              </div>
            ))}
            <div className="app-grid-2-tight" style={{ ...rowS, gap: 12 }}>
              <div>
                <label style={labelStyle}>Agência <CampoObrigatorioMark /> <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(sensível)</span></label>
                <input value={form.agencia ?? ""} onChange={(e) => set("agencia", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Conta <CampoObrigatorioMark /> <span style={{ fontSize: 9, color: BRAND.vermelho, fontWeight: 400 }}>(sensível)</span></label>
                <input value={form.conta ?? ""} onChange={(e) => set("conta", e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        )}
        {tab === "operadoras" && (
          <div role="tabpanel" id="panel-af-ed-operadoras" aria-labelledby="tab-af-ed-operadoras">
          {operadorasList.length === 0 ? <p style={{ fontSize: 13, color: t.textMuted }}>Nenhuma operadora cadastrada.</p> : operadorasList.map((op) => {
            const st = opForm[op.slug] ?? { ativo: false, id_operadora: "" };
            const opColor = op.brand_action?.trim() || "var(--brand-primary, #7c3aed)";
            return (
              <div key={op.slug} style={{ ...rowS, padding: 14, borderRadius: 12, border: `1px solid ${st.ativo ? `color-mix(in srgb, ${opColor} 40%, transparent)` : t.cardBorder}`, background: st.ativo ? `color-mix(in srgb, ${opColor} 12%, transparent)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: st.ativo ? 12 : 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, fontFamily: FONT.body }}><Building2 size={13} aria-hidden="true" style={{ color: opColor }} /> {op.nome}</span>
                  <button type="button" onClick={() => setOp(op.slug, { ativo: !st.ativo })} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${st.ativo ? `color-mix(in srgb, ${opColor} 45%, transparent)` : t.cardBorder}`, background: st.ativo ? `color-mix(in srgb, ${opColor} 22%, transparent)` : (t.inputBg ?? t.cardBg), color: st.ativo ? opColor : t.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>{st.ativo ? "Ativo" : "Inativo"}</button>
                </div>
                {st.ativo && (
                  <div>
                    <label style={{ ...labelStyle, display: "block" }}>ID {op.nome} <CampoObrigatorioMark /></label>
                    <input value={st.id_operadora} onChange={(e) => setOp(op.slug, { id_operadora: e.target.value })} style={inputStyle} placeholder={`ID do afiliado na ${op.nome}`} />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>Cancelar</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, background: ctaSalvar, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <><Loader2 size={14} className="app-lucide-spin" aria-hidden="true" color="#fff" /> Salvando…</> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
