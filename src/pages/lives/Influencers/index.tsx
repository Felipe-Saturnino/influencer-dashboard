import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import type { Operadora, InfluencerOperadora, Role } from "../../../types";
import {
  Eye, Pencil, X, Loader2,
  Users, AlertCircle, CheckCircle, Coins, Building2, ExternalLink,
} from "lucide-react";
import OperadoraTag from "../../../components/OperadoraTag";
import {
  influencerElegivelQuadroPerfilIncompleto,
  isPerfilIncompleto,
} from "../../../lib/influencerPerfilCompleto";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { PlatLogo } from "../../../components/PlatLogo";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import {
  DashboardPageHeader,
  FiltroOperadoraSelect,
  FiltroPlataformaSemanticoPill,
  FiltroStatusSemanticoPill,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { ROLES_PARIDADE_INFLUENCER, ROLES_STAFF_OPERACOES_LIVES } from "../../../lib/staffRoles";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
  getPageKpiSectionGapStyle,
} from "../../../lib/pageContentBoxStyles";

// ─── LOGOS SVG DAS PLATAFORMAS ────────────────────────────────────────────────
import { PLATAFORMAS, PLAT_COLOR, type Plataforma } from "../../../constants/platforms";

import { StatusBadge } from "./influencerUiComponents";
import {
  emptyPerfil,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_OPTS,
  type Influencer,
  type Perfil,
  type StatusInfluencer,
} from "./influencerTypes";
import { ModalVisualizar } from "./ModalVisualizar";
import { ModalPerfil } from "./ModalPerfil";

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
  const podeAlterarStatus =
    !!user?.role && ROLES_STAFF_OPERACOES_LIVES.includes(user.role as Role);

  const [list,           setList]           = useState<Influencer[]>([]);
  const [operadorasList, setOperadorasList] = useState<Operadora[]>([]);

  const operadorasNoEscopo = operadorasList.filter((o) => podeVerOperadora(o.slug));
  const operadorasAtivasNoEscopo = operadorasNoEscopo.filter((o) => o.ativo);
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
    const { data: opsList } = await supabase
      .from("operadoras")
      .select("slug, nome, ativo, brand_action, brand_contrast, brand_bg, brand_text, logo_url, font_url")
      .order("nome");
    setOperadorasList(opsList ?? []);
    const opsMap = Object.fromEntries((opsList ?? []).map((o: Operadora) => [o.slug, o.nome]));

    const PERFIL_COLS =
      "id, nome_artistico, nome_completo, status, telefone, cpf, canais, link_twitch, link_youtube, link_kick, link_instagram, link_tiktok, link_discord, link_whatsapp, link_telegram, cache_hora, banco, agencia, conta, chave_pix, created_at, updated_at, status_alterado_em";
    const INF_OP_COLS = "influencer_id, operadora_slug, id_operadora, ativo, criado_em, atualizado_em";

    if (showManagementUI) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, name, email, ativo").in("role", [...ROLES_PARIDADE_INFLUENCER]).order("name");
      if (profiles) {
        const ids = profiles.map((p: { id: string }) => p.id);
        const [perfisRes, opsRes] = await Promise.all([
          ids.length > 0 ? supabase.from("influencer_perfil").select(PERFIL_COLS).in("id", ids) : { data: [] },
          ids.length > 0 ? supabase.from("influencer_operadoras").select(INF_OP_COLS).in("influencer_id", ids) : { data: [] },
        ]);
        const perfisMap: Record<string, Perfil> = {};
        (perfisRes.data ?? []).forEach((p: Perfil) => { perfisMap[p.id] = p; });
        const opsPorInf: Record<string, InfluencerOperadora[]> = {};
        (opsRes.data ?? []).forEach((o: InfluencerOperadora) => {
          if (!opsPorInf[o.influencer_id]) opsPorInf[o.influencer_id] = [];
          opsPorInf[o.influencer_id].push({ ...o, operadora_nome: opsMap[o.operadora_slug] ?? o.operadora_nome });
        });
        const mapped = profiles.map((p: { id: string; name?: string | null; email?: string | null; ativo?: boolean | null }) => ({
          id: p.id,
          name: p.name ?? p.email ?? "",
          email: p.email ?? "",
          ativo: p.ativo,
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
        supabase.from("influencer_perfil").select(PERFIL_COLS).eq("id", user.id).single(),
        supabase.from("influencer_operadoras").select(INF_OP_COLS).eq("influencer_id", user.id),
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
    const nomeExibicao = p?.nome_artistico?.trim() || inf.name || "";
    const searchTrim = search.trim();
    if (searchTrim && !textoContemBuscaEmAlgum(search, nomeExibicao, inf.name, inf.email)) return false;
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

  const incompletos = listNoEscopo.filter((i) =>
    influencerElegivelQuadroPerfilIncompleto(i.perfil, i.ativo) &&
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
  const ctaGradient = "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))";
  const sliderTrackGradient = "linear-gradient(90deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))";
  const sliderThumbGradient = "linear-gradient(135deg, var(--brand-primary, #4a2082), var(--brand-secondary, #1e36f8))";

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
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="influencers" />}
        title={getPageMenuLabel("influencers")}
        subtitle={showManagementUI ? "Gerencie o cadastro completo dos parceiros — perfil, canais e financeiro." : "Seu perfil completo na plataforma."}
        brand={brand}
        t={t}
      />

      {/* Quadros resumo (quem gerencia múltiplos) */}
      {showManagementUI && (
        <div className="app-grid-2" style={{ ...getPageKpiSectionGapStyle(), gap: "16px" }}>
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
        <div style={getPageFilterBoxStyle(brand, t)}>
            {/* Linha 1: Status / Operadora */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
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
                  <span style={{ width: 1, height: 16, background: t.cardBorder, margin: "0 4px", flexShrink: 0 }} />
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

            {/* Linha 2: Plataforma */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%", paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 4 }}>Plataforma</span>
              {PLATAFORMAS.map((plat) => (
                <FiltroPlataformaSemanticoPill
                  key={plat}
                  plataforma={plat}
                  semanticColor={PLAT_COLOR[plat as Plataforma] ?? "#94a3b8"}
                  active={filterPlat === plat}
                  isDark={isDark ?? false}
                  count={porPlat[plat] ?? 0}
                  onClick={() => setFilterPlat(filterPlat === plat ? "todas" : plat)}
                />
              ))}
            </div>

            {/* Linha 3: Filtro de Cachê */}
            {cacheMax > 0 && (
              <div style={{
                paddingTop: 12, marginTop: 12, borderTop: `1px solid ${t.cardBorder}`,
                paddingBottom: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: brand.secondary, fontFamily: FONT.body }}>
                    <Coins size={13} aria-hidden="true" style={{ color: brand.secondary }} /> Cachê por Hora
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
              <BarraPesquisaPagina
                value={search}
                onChange={setSearch}
                placeholder={PAGE_SEARCH.nomeEmail}
                aria-label="Buscar influencer por nome ou e-mail"
                wrapperStyle={{ width: "100%" }}
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
        <div
          role="status"
          aria-label="Carregando influencers"
          style={{ textAlign: "center", padding: "60px", color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Loader2 size={20} className="app-lucide-spin" style={{ color: "var(--brand-primary, #7c3aed)" }} aria-hidden="true" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...getPageContentBoxStyle(brand, t, { padding: 48, textAlign: "center" }), color: t.textMuted, fontFamily: FONT.body }}>
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
                            {link && <ExternalLink size={10} aria-hidden="true" style={{ opacity: 0.7 }} />}
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