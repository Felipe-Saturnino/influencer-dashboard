import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { UtmAlias } from "../../../types";
import { Link2, EyeOff, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import { FiltroOperadoraSelect, SortTableTh, type SortDir } from "../../../components/dashboard";
import { compareLocaleTexto, compareNumber, comparePerfilStatusNullable } from "../../../lib/classificacaoSort";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe } from "../../../lib/tableStyles";

const COR = {
  vermelho: "#e84025",
  verde: "#22c55e",
} as const;

function ctaGradient(useBrand: boolean): string {
  return useBrand
    ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
    : "linear-gradient(135deg, #4a2082, #1e36f8)";
}

const MSG_ERRO_MAPEAR =
  "Não foi possível mapear o link. Se o problema persistir, contate o suporte.";

function calcGgr(alias: { total_deposit?: number; total_withdrawal?: number; ggr?: number }): number {
  if (alias.ggr != null) return alias.ggr;
  return (alias.total_deposit ?? 0) - (alias.total_withdrawal ?? 0);
}

function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

function dataAcaoIso(aba: Aba, alias: UtmAlias): string | null | undefined {
  return aba === "mapeados" ? alias.mapeado_em : alias.atualizado_em;
}

function colunasPorAba(aba: Aba): number {
  if (aba === "pendentes") return 4;
  return 7;
}

interface InfluencerOpcao { id: string; nome_artistico: string; status: string; }
interface CampanhaOpcao { id: string; nome: string; ativo: boolean; }
type Aba = "pendentes" | "mapeados" | "ignorados";
type TipoMapeamento = "influencer" | "campanha";

const ABAS_LIST: Aba[] = ["pendentes", "mapeados", "ignorados"];

export default function GestaoLinks() {
  const { theme: t, user, podeVerInfluencer } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission("gestao_links");
  const narrowMobile = useMediaQuery("(max-width: 479px)");
  const { showFiltroOperadora } = useDashboardFiltros();

  const podeMapearAlias   = () => perm.canEditarOk;
  const podeReativarAlias = (alias: UtmAlias) =>
    perm.canEditarOk && (
      perm.canEditar !== "proprios" ||
      (alias.campanha_id ? true : !alias.influencer_id || podeVerInfluencer(alias.influencer_id!))
    );

  const [aba, setAba] = useState<Aba>("pendentes");
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [aliases, setAliases] = useState<UtmAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<InfluencerOpcao[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [aliasSelecionado, setAliasSelecionado] = useState<UtmAlias | null>(null);
  const [influencerSelecionado, setInfluencerSelecionado] = useState("");
  const [campanhaSelecionada, setCampanhaSelecionada] = useState("");
  const [tipoMapeamento, setTipoMapeamento] = useState<TipoMapeamento>("influencer");
  const [campanhas, setCampanhas] = useState<CampanhaOpcao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [confirmFechar, setConfirmFechar] = useState(false);
  type LinkSortCol =
    | "utm"
    | "operadora"
    | "primeiro"
    | "acao"
    | "proprietario"
    | "status"
    | "visitas"
    | "registros";
  const [sortLinks, setSortLinks] = useState<{ col: LinkSortCol; dir: SortDir }>({ col: "primeiro", dir: "desc" });

  const cardShadow = t.isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.07)";

  function fecharModalLimpo() {
    setModalAberto(false);
    setConfirmFechar(false);
    setAliasSelecionado(null);
    setInfluencerSelecionado("");
    setCampanhaSelecionada("");
    setErroModal(null);
  }

  function solicitarFecharModal() {
    if (salvando) return;
    const dirty = influencerSelecionado !== "" || campanhaSelecionada !== "";
    if (dirty) setConfirmFechar(true);
    else fecharModalLimpo();
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    const statusFiltro: Record<Aba, string> = { pendentes: "pendente", mapeados: "mapeado", ignorados: "ignorado" };
    let query = supabase.from("utm_aliases").select("*").eq("status", statusFiltro[aba]).order("total_ftds", { ascending: false });
    if (operadoraFiltro !== "todas") query = query.eq("operadora_slug", operadoraFiltro);
    const { data, error } = await query;
    if (error) { console.error("Erro ao carregar utm_aliases:", error.message); setAliases([]); setLoading(false); return; }
    const aliasData = data ?? [];
    let infNomeMap = new Map<string, string>();
    let campanhaNomeMap = new Map<string, string>();
    if (aba === "mapeados") {
      const influencerIds = aliasData.map((r: UtmAlias) => r.influencer_id).filter(Boolean) as string[];
      if (influencerIds.length > 0) {
        const { data: infData } = await supabase.from("influencer_perfil").select("id, nome_artistico").in("id", influencerIds);
        infNomeMap = new Map((infData ?? []).map((i: { id: string; nome_artistico: string | null }) => [i.id, i.nome_artistico ?? ""]));
      }
      const campanhaIds = aliasData.map((r: UtmAlias) => r.campanha_id).filter(Boolean) as string[];
      let campanhaAtivoMap = new Map<string, boolean>();
      if (campanhaIds.length > 0) {
        const { data: campData } = await supabase.from("campanhas").select("id, nome, ativo").in("id", campanhaIds);
        campanhaNomeMap = new Map((campData ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
        campanhaAtivoMap = new Map((campData ?? []).map((c: { id: string; ativo: boolean }) => [c.id, c.ativo]));
      }
      setAliases(aliasData.map((r: UtmAlias) => ({
        ...r,
        influencer_name: r.influencer_id ? (infNomeMap.get(r.influencer_id) || "—") : undefined,
        campanha_nome: r.campanha_id ? (campanhaNomeMap.get(r.campanha_id) || "—") : undefined,
        campanha_ativo: r.campanha_id ? campanhaAtivoMap.get(r.campanha_id) : undefined,
      })));
      setLoading(false);
      return;
    }
    setAliases(aliasData.map((r: UtmAlias) => ({ ...r })));
    setLoading(false);
  }, [aba, operadoraFiltro]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { supabase.from("operadoras").select("slug, nome").order("nome").then(({ data }) => setOperadorasList(data ?? [])); }, []);
  useEffect(() => { supabase.from("influencer_perfil").select("id, nome_artistico, status").order("nome_artistico").then(({ data }) => setInfluencers(data ?? [])); }, []);
  useEffect(() => { supabase.from("campanhas").select("id, nome, ativo").eq("ativo", true).order("nome").then(({ data }) => setCampanhas(data ?? [])); }, []);

  const [totalPendentes, setTotalPendentes] = useState(0);
  useEffect(() => {
    let q = supabase.from("utm_aliases").select("id", { count: "exact", head: true }).eq("status", "pendente");
    if (operadoraFiltro !== "todas") q = q.eq("operadora_slug", operadoraFiltro);
    q.then(({ count }) => setTotalPendentes(count ?? 0));
  }, [aliases, operadoraFiltro]);

  function abrirModal(alias: UtmAlias) {
    setAliasSelecionado(alias);
    setInfluencerSelecionado("");
    setCampanhaSelecionada("");
    setTipoMapeamento("influencer");
    setErroModal(null);
    setConfirmFechar(false);
    setModalAberto(true);
  }

  async function confirmarMapeamento() {
    if (!aliasSelecionado) return;
    const isInfluencer = tipoMapeamento === "influencer";
    const idSelecionado = isInfluencer ? influencerSelecionado : campanhaSelecionada;
    if (!idSelecionado) return;
    if (isInfluencer && perm.canEditar === "proprios" && !podeVerInfluencer(idSelecionado)) return;

    setSalvando(true); setErroModal(null);

    const updatePayload = isInfluencer
      ? { influencer_id: idSelecionado, campanha_id: null, status: "mapeado", mapeado_por: user?.id ?? null, mapeado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }
      : { campanha_id: idSelecionado, influencer_id: null, status: "mapeado", mapeado_por: user?.id ?? null, mapeado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };

    const { error } = await supabase.from("utm_aliases").update(updatePayload).eq("id", aliasSelecionado.id);
    if (error) {
      console.error("[GestaoLinks] Erro ao salvar mapeamento:", error);
      setSalvando(false);
      setErroModal(MSG_ERRO_MAPEAR);
      return;
    }

    // RPC: copia utm_metricas_diarias → influencer_metricas (apenas para mapeamento influencer)
    let linhasCopiadas = 0;
    if (isInfluencer) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("aplicar_mapeamento_utm", {
          p_utm_source: aliasSelecionado.utm_source,
          p_influencer_id: idSelecionado,
        });
        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          const row = rpcData[0] as { linhas_copiadas?: number };
          linhasCopiadas = Number(row?.linhas_copiadas ?? 0);
        }
      } catch (_e) { /* RPC pode não existir ainda */ }

      // Se utm_metricas_diarias estava vazio, dispara sync (fallback)
      if (linhasCopiadas === 0) {
        const dataInicio = (aliasSelecionado.primeiro_visto ?? "2025-12-01").split("T")[0];
        const dataFim = (aliasSelecionado.ultimo_visto ?? new Date().toISOString().split("T")[0]).split("T")[0];
        try {
          await supabase.functions.invoke("sync-metricas-cda", {
            body: { data_inicio: dataInicio, data_fim: dataFim, utm_source: aliasSelecionado.utm_source, skip_orfaos: true },
          });
        } catch (e) {
          console.warn("[GestaoLinks] Sync fallback:", e);
        }
      }
    }

    setSalvando(false);
    fecharModalLimpo();
    carregar();
  }

  async function ignorar(alias: UtmAlias) {
    const { error } = await supabase.from("utm_aliases").update({ status: "ignorado", atualizado_em: new Date().toISOString() }).eq("id", alias.id);
    if (!error) carregar();
  }

  async function reativar(alias: UtmAlias) {
    const { error } = await supabase.from("utm_aliases").update({
      status: "pendente",
      influencer_id: null,
      campanha_id: null,
      mapeado_por: null,
      mapeado_em: null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", alias.id);
    if (!error) carregar();
  }

  const th = getThStyle(t);
  const td = getTdStyle(t);
  const tdMuted: React.CSSProperties = { ...td, color: t.textMuted, fontSize: 12, whiteSpace: "nowrap" };
  // coluna UTM Source: permite quebra, tem maxWidth
  const tdUtm: React.CSSProperties = {
    ...td,
    whiteSpace: "normal",
    wordBreak: "break-all",
    maxWidth: 220,
  };

  const emptyMessages: Record<Aba, string> = {
    pendentes: "Nenhum link pendente. Tudo mapeado!",
    mapeados:  "Nenhum link mapeado ainda.",
    ignorados: "Nenhum link ignorado.",
  };

  const statusInfluencerPorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of influencers) m.set(i.id, i.status);
    return m;
  }, [influencers]);

  const statusDoLink = useCallback(
    (a: UtmAlias): string | null => {
      if (a.influencer_id) return statusInfluencerPorId.get(a.influencer_id) ?? "ativo";
      if (a.campanha_id) return a.campanha_ativo === false ? "inativo" : "ativo";
      return null;
    },
    [statusInfluencerPorId],
  );

  const aliasesOrdenados = useMemo(() => {
    const arr = [...aliases];
    const { col, dir } = sortLinks;
    const nomeOp = (a: UtmAlias) =>
      (operadorasList.find((o) => o.slug === a.operadora_slug)?.nome ?? a.operadora_slug ?? "").toLowerCase();
    const proprietarioLabel = (a: UtmAlias) =>
      (a.influencer_id ? (a.influencer_name ?? "") : (a.campanha_nome ?? "")).trim().toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "utm":
          c = compareLocaleTexto(a.utm_source, b.utm_source, dir);
          break;
        case "operadora":
          c = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "primeiro":
          c = compareLocaleTexto(a.primeiro_visto, b.primeiro_visto, dir);
          break;
        case "acao":
          c = compareLocaleTexto(dataAcaoIso(aba, a) ?? "", dataAcaoIso(aba, b) ?? "", dir);
          break;
        case "proprietario":
          c = compareLocaleTexto(proprietarioLabel(a), proprietarioLabel(b), dir);
          break;
        case "status":
          c = comparePerfilStatusNullable(statusDoLink(a), statusDoLink(b), dir);
          break;
        case "visitas":
          c = compareNumber(a.total_visits ?? 0, b.total_visits ?? 0, dir);
          break;
        case "registros":
          c = compareNumber(a.total_registrations ?? 0, b.total_registrations ?? 0, dir);
          break;
        default:
          c = 0;
      }
      if (c !== 0) return c;
      return compareLocaleTexto(a.primeiro_visto, b.primeiro_visto, "desc");
    });
    return arr;
  }, [aliases, sortLinks, statusDoLink, operadorasList, aba]);

  useEffect(() => {
    const defaults: Record<Aba, { col: LinkSortCol; dir: SortDir }> = {
      pendentes: { col: "primeiro", dir: "desc" },
      mapeados: { col: "acao", dir: "desc" },
      ignorados: { col: "visitas", dir: "desc" },
    };
    setSortLinks(defaults[aba]);
  }, [aba]);

  const thNum = { ...th, textAlign: "right" as const };
  const tdNum = getTdNumStyle(t);

  const onSortLinks = (c: LinkSortCol) =>
    setSortLinks((s) => ({
      col: c,
      dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
    }));

  function renderStatusBadge(alias: UtmAlias) {
    const st = statusDoLink(alias);
    if (st == null) {
      return <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>;
    }
    const sk = st.toLowerCase();
    const isCampanha = Boolean(alias.campanha_id && !alias.influencer_id);
    const sl =
      sk === "inativo"
        ? { label: isCampanha ? "Inativa" : "Inativo", color: "#94a3b8" }
        : sk === "cancelado"
          ? { label: "Cancelado", color: "#ef4444" }
          : { label: isCampanha ? "Ativa" : "Ativo", color: "#10b981" };
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: 20,
          background: `${sl.color}22`,
          color: sl.color,
          border: `1px solid ${String(sl.color)}44`,
        }}
      >
        {sl.label}
      </span>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell">

      <PageHeader
        icon={<Link2 size={14} aria-hidden />}
        title="Gestão de Links"
        subtitle="Mapeie UTMs detectados a influencers, afiliados ou campanhas e alimente os relatórios."
        actions={
          totalPendentes > 0 ? (
            <span style={{ background: COR.vermelho, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
              {totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      <div style={{ marginBottom: 14 }}>
        <div style={{ borderRadius: 14, border: brand.primaryTransparentBorder, background: brand.primaryTransparentBg, padding: "12px 20px" }}>
          <div style={{ position: "relative", ...(narrowMobile ? { overflow: "hidden" } : {}) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: narrowMobile ? "nowrap" : "wrap",
                overflowX: narrowMobile ? "auto" : undefined,
                paddingBottom: narrowMobile ? 4 : 0,
                scrollbarWidth: "none",
              }}
            >
              <div
                role="tablist"
                aria-label="Status dos links"
                onKeyDown={(e) => {
                  const idx = ABAS_LIST.indexOf(aba);
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = ABAS_LIST[(idx + 1) % ABAS_LIST.length];
                    setAba(next);
                    (e.currentTarget.querySelector(`[data-aba="${next}"]`) as HTMLElement)?.focus();
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prev = ABAS_LIST[(idx - 1 + ABAS_LIST.length) % ABAS_LIST.length];
                    setAba(prev);
                    (e.currentTarget.querySelector(`[data-aba="${prev}"]`) as HTMLElement)?.focus();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: narrowMobile ? "nowrap" : "wrap",
                  flex: 1,
                  justifyContent: "center",
                  minWidth: narrowMobile ? "max-content" : undefined,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, flexShrink: 0 }}>
                  Status
                </span>
                {ABAS_LIST.map((a) => {
                  const ativa = aba === a;
                  const tabBgAtiva = brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : "color-mix(in srgb, var(--brand-primary, #7c3aed) 15%, transparent)";
                  return (
                    <button
                      key={a}
                      id={`tab-${a}`}
                      type="button"
                      data-aba={a}
                      role="tab"
                      aria-selected={ativa}
                      aria-controls={`painel-${a}`}
                      tabIndex={ativa ? 0 : -1}
                      onClick={() => setAba(a)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: `1px solid ${ativa ? brand.accent : t.cardBorder}`,
                        background: ativa ? tabBgAtiva : (t.inputBg ?? t.cardBg),
                        color: ativa ? brand.accent : t.textMuted,
                        fontSize: 13,
                        fontWeight: ativa ? 700 : 400,
                        fontFamily: FONT.body,
                        transition: "all 0.15s",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                      {a === "pendentes" && totalPendentes > 0 && (
                        <span
                          aria-label={`${totalPendentes} pendente${totalPendentes !== 1 ? "s" : ""}`}
                          style={{
                            background: COR.vermelho,
                            color: "#fff",
                            borderRadius: 10,
                            padding: "0px 6px",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {totalPendentes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {showFiltroOperadora && operadorasList.length > 0 && (
                <FiltroOperadoraSelect
                  pill
                  minWidth={200}
                  value={operadoraFiltro}
                  onChange={setOperadoraFiltro}
                  operadoras={operadorasList}
                />
              )}
            </div>
            {narrowMobile ? (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 4,
                  width: 28,
                  pointerEvents: "none",
                  background: `linear-gradient(to left, ${t.bg}, transparent)`,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`painel-${aba}`}
        aria-labelledby={`tab-${aba}`}
        tabIndex={0}
      >
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "60px 0",
            color: t.textMuted,
            fontFamily: FONT.body,
          }}
        >
          <Loader2 size={22} className="app-lucide-spin" color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando links...
        </div>
      ) : aliases.length === 0 ? (
        <div style={{
          background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: 18, padding: 60,
          textAlign: "center", color: t.textMuted,
          fontFamily: FONT.body, fontSize: 14,
          boxShadow: cardShadow,
        }}>
          {emptyMessages[aba]}
        </div>
      ) : (
        <div style={{ background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, boxShadow: cardShadow, overflow: "hidden" }}>
          <div className="app-table-wrap">
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, tableLayout: "fixed" }}>
            <caption
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Links por status
            </caption>
            <colgroup>
              <col style={{ width: aba === "pendentes" ? "32%" : "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              {aba !== "pendentes" && <col style={{ width: "11%" }} />}
              {aba === "mapeados" && (
                <>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                </>
              )}
              {aba === "ignorados" && (
                <>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                </>
              )}
              <col />
            </colgroup>
            <thead>
              <tr>
                <SortTableTh<LinkSortCol>
                  label="UTM Source"
                  col="utm"
                  sortCol={sortLinks.col}
                  sortDir={sortLinks.dir}
                  thStyle={th}
                  align="left"
                  onSort={onSortLinks}
                />
                <SortTableTh<LinkSortCol>
                  label="Operadora"
                  col="operadora"
                  sortCol={sortLinks.col}
                  sortDir={sortLinks.dir}
                  thStyle={th}
                  align="left"
                  onSort={onSortLinks}
                />
                <SortTableTh<LinkSortCol>
                  label="1 Visto"
                  col="primeiro"
                  sortCol={sortLinks.col}
                  sortDir={sortLinks.dir}
                  thStyle={th}
                  align="left"
                  onSort={onSortLinks}
                />
                {aba !== "pendentes" && (
                  <SortTableTh<LinkSortCol>
                    label="Data da Ação"
                    col="acao"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={th}
                    align="left"
                    onSort={onSortLinks}
                  />
                )}
                {aba === "mapeados" && (
                  <>
                    <SortTableTh<LinkSortCol>
                      label="Proprietário"
                      col="proprietario"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={th}
                      align="left"
                      onSort={onSortLinks}
                    />
                    <SortTableTh<LinkSortCol>
                      label="Status"
                      col="status"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={th}
                      align="left"
                      onSort={onSortLinks}
                    />
                  </>
                )}
                {aba === "ignorados" && (
                  <>
                    <SortTableTh<LinkSortCol>
                      label="Visitas"
                      col="visitas"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={thNum}
                      align="right"
                      onSort={onSortLinks}
                    />
                    <SortTableTh<LinkSortCol>
                      label="Registros"
                      col="registros"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={thNum}
                      align="right"
                      onSort={onSortLinks}
                    />
                  </>
                )}
                <th scope="col" style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {aliasesOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={colunasPorAba(aba)} style={{ ...td, textAlign: "center", color: t.textMuted, padding: 40, whiteSpace: "normal" }}>
                    {emptyMessages[aba]}
                  </td>
                </tr>
              ) : aliasesOrdenados.map((alias, idx) => {
                const zebraBg = zebraStripe(idx);
                const utmAccent = brand.accent;
                const nomeOperadora =
                  operadorasList.find((o) => o.slug === alias.operadora_slug)?.nome ?? alias.operadora_slug ?? "—";
                const proprietario =
                  alias.influencer_id ? (alias.influencer_name ?? "—") : (alias.campanha_nome ?? "—");
                return (
                  <tr
                    key={alias.id}
                    style={{ background: zebraBg }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = zebraBg;
                    }}
                  >
                    <td style={tdUtm}>
                      <span style={{
                        display: "inline-flex", alignItems: "flex-start", gap: 5,
                        background: `color-mix(in srgb, ${utmAccent} 15%, transparent)`,
                        color: utmAccent,
                        border: `1px solid color-mix(in srgb, ${utmAccent} 30%, transparent)`,
                        borderRadius: 6, padding: "3px 9px",
                        fontSize: 12, fontWeight: 600, fontFamily: "monospace",
                        wordBreak: "break-all", maxWidth: "100%",
                      }}>
                        <Link2 size={11} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                        <span>{alias.utm_source}</span>
                      </span>
                    </td>
                    <td style={td} title={nomeOperadora}>{nomeOperadora}</td>
                    <td style={tdMuted}>{fmtData(alias.primeiro_visto)}</td>
                    {aba !== "pendentes" && (
                      <td style={tdMuted}>{fmtData(dataAcaoIso(aba, alias))}</td>
                    )}
                    {aba === "mapeados" && (
                      <>
                        <td style={{ ...td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={proprietario}>
                          {proprietario}
                        </td>
                        <td style={td}>{renderStatusBadge(alias)}</td>
                      </>
                    )}
                    {aba === "ignorados" && (
                      <>
                        <td style={tdNum}>{(alias.total_visits ?? 0).toLocaleString("pt-BR")}</td>
                        <td style={tdNum}>{(alias.total_registrations ?? 0).toLocaleString("pt-BR")}</td>
                      </>
                    )}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {aba === "pendentes" && podeMapearAlias() && (
                          <>
                            <button type="button" onClick={() => abrirModal(alias)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: "none", background: ctaGradient(brand.useBrand), color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                              <Link2 size={12} aria-hidden /> Mapear
                            </button>
                            <button type="button" onClick={() => ignorar(alias)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 12, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                              <EyeOff size={12} aria-hidden /> Ignorar
                            </button>
                          </>
                        )}
                        {(aba === "mapeados" || aba === "ignorados") && podeReativarAlias(alias) && (
                          <button type="button" onClick={() => reativar(alias)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, fontSize: 12, fontFamily: FONT.body, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <RotateCcw size={12} aria-hidden /> Reabrir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
      </div>

      {/* ─── Modal ───────────────────────────────────────────────────────────── */}
      {modalAberto && aliasSelecionado && (
        <ModalBase onClose={solicitarFecharModal} maxWidth={440}>
          <ModalHeader title="Mapear link órfão" onClose={solicitarFecharModal} />
            <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 22, fontFamily: FONT.body }}>
              Associe o UTM <strong style={{ color: brand.accent }}>{aliasSelecionado.utm_source}</strong> a um influencer ou campanha.
            </p>

            <div className="app-grid-3" style={{ background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
              {[
                { label: "FTDs",      value: String(aliasSelecionado.total_ftds) },
                { label: "Depósitos", value: fmtBRL(aliasSelecionado.total_deposit ?? 0) },
                { label: "GGR",       value: fmtBRL(calcGgr(aliasSelecionado)) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT.body }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                aria-pressed={tipoMapeamento === "influencer"}
                onClick={() => { setTipoMapeamento("influencer"); setCampanhaSelecionada(""); }}
                style={{
                  flex: 1, padding: "8px 14px", borderRadius: 10, border: `1px solid ${tipoMapeamento === "influencer" ? brand.accent : t.cardBorder}`,
                  background: tipoMapeamento === "influencer" ? `color-mix(in srgb, ${brand.accent} 15%, transparent)` : "transparent",
                  color: tipoMapeamento === "influencer" ? brand.accent : t.textMuted,
                  fontSize: 13, fontWeight: tipoMapeamento === "influencer" ? 700 : 400, fontFamily: FONT.body, cursor: "pointer",
                }}
              >
                Influencer
              </button>
              <button
                type="button"
                aria-pressed={tipoMapeamento === "campanha"}
                onClick={() => { setTipoMapeamento("campanha"); setInfluencerSelecionado(""); }}
                style={{
                  flex: 1, padding: "8px 14px", borderRadius: 10, border: `1px solid ${tipoMapeamento === "campanha" ? brand.accent : t.cardBorder}`,
                  background: tipoMapeamento === "campanha" ? `color-mix(in srgb, ${brand.accent} 15%, transparent)` : "transparent",
                  color: tipoMapeamento === "campanha" ? brand.accent : t.textMuted,
                  fontSize: 13, fontWeight: tipoMapeamento === "campanha" ? 700 : 400, fontFamily: FONT.body, cursor: "pointer",
                }}
              >
                Campanha
              </button>
            </div>

            {tipoMapeamento === "influencer" ? (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 6, fontFamily: FONT.body }}>
                  Influencer
                  <CampoObrigatorioMark />
                </label>
                <select value={influencerSelecionado} onChange={(e) => setInfluencerSelecionado(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.text, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: FONT.body, cursor: "pointer" }}>
                  <option value="">Selecione o influencer...</option>
                  {(perm.canEditar === "proprios" ? influencers.filter((inf) => podeVerInfluencer(inf.id)) : influencers)
                    .sort((a, b) => (a.nome_artistico ?? "").localeCompare(b.nome_artistico ?? "", "pt-BR"))
                    .map((inf) => (
                      <option key={inf.id} value={inf.id}>{inf.nome_artistico}{inf.status !== "ativo" ? ` (${inf.status})` : ""}</option>
                    ))}
                </select>
              </>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 6, fontFamily: FONT.body }}>
                  Campanha
                  <CampoObrigatorioMark />
                </label>
                <select value={campanhaSelecionada} onChange={(e) => setCampanhaSelecionada(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.text, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: FONT.body, cursor: "pointer" }}>
                  <option value="">Selecione a campanha...</option>
                  {[...campanhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </>
            )}

            {erroModal ? (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: `${COR.vermelho}18`,
                  border: `1px solid ${COR.vermelho}44`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: COR.vermelho,
                  marginBottom: 16,
                  fontFamily: FONT.body,
                }}
              >
                <AlertCircle size={14} aria-hidden /> {erroModal}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={solicitarFecharModal}
                style={{ padding: "9px 20px", background: "transparent", border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.text, fontSize: 13, fontFamily: FONT.body, cursor: salvando ? "not-allowed" : "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={() => void confirmarMapeamento()} disabled={(tipoMapeamento === "influencer" ? !influencerSelecionado : !campanhaSelecionada) || salvando}
                aria-disabled={(tipoMapeamento === "influencer" ? !influencerSelecionado : !campanhaSelecionada) || salvando}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, border: "none", background: ctaGradient(brand.useBrand), color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.body, cursor: (tipoMapeamento === "influencer" ? influencerSelecionado : campanhaSelecionada) && !salvando ? "pointer" : "not-allowed", opacity: (tipoMapeamento === "influencer" ? influencerSelecionado : campanhaSelecionada) && !salvando ? 1 : 0.5 }}>
                <Link2 size={13} aria-hidden />{salvando ? "Salvando..." : "Confirmar mapeamento"}
              </button>
            </div>
        </ModalBase>
      )}
      {confirmFechar ? (
        <ModalConfirmDelete
          zIndex={1100}
          title="Fechar sem mapear?"
          texto="Existe uma seleção pendente (influencer ou campanha). Deseja fechar sem concluir o mapeamento?"
          confirmLabel="Fechar"
          destructive={false}
          onCancel={() => setConfirmFechar(false)}
          onConfirm={fecharModalLimpo}
        />
      ) : null}
    </div>
  );
}
