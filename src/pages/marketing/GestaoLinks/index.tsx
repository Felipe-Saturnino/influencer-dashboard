import { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { UtmAlias } from "../../../types";
import { nomeExibicaoLinksEntidade } from "../../../lib/linksMateriaisCanal";
import { Ban, CheckCircle2, Link2, EyeOff, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { AjudaContextualAcoes } from "../../../components/AjudaContextualAcoes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { CampoObrigatorioMark } from "../../../components/CampoObrigatorioMark";
import { ModalBase, ModalHeader, ModalConfirmDelete } from "../../../components/OperacoesModal";
import {
  FiltroBarTabButton,
  FILTRO_BAR_TAB_ICON_PROPS,
  FiltroOperadoraSelect,
  SortTableTh,
  onFiltroBarTabsKeyDown,
  type SortDir,
} from "../../../components/dashboard";
import { compareLocaleTexto, compareNumber, comparePerfilStatusNullable } from "../../../lib/classificacaoSort";
import { fmtBRL } from "../../../lib/dashboardHelpers";
import { textoContemBusca } from "../../../lib/searchText";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { useDataTableBlock } from "../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import { getFilterBarRowStyle } from "../../../lib/filterBarStyles";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";

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
  "Não foi possível mapear o link. Se o problema persistir, entre em contato com o suporte.";

/** Rótulo da coluna Proprietário — mesmo nome exibido no select do modal Mapear. */
function labelProprietarioAlias(
  alias: UtmAlias,
  nomePorInfluencerId: Map<string, string>,
  nomePorCampanhaId: Map<string, string>,
): string {
  if (alias.influencer_id) {
    const doCatalogo = nomePorInfluencerId.get(alias.influencer_id)?.trim();
    if (doCatalogo) return doCatalogo;
    const doAlias = (alias.influencer_name ?? "").trim();
    if (doAlias && doAlias !== "—") return doAlias;
    return "—";
  }
  if (alias.campanha_id) {
    const doCatalogo = nomePorCampanhaId.get(alias.campanha_id)?.trim();
    if (doCatalogo) return doCatalogo;
    const doAlias = (alias.campanha_nome ?? "").trim();
    if (doAlias && doAlias !== "—") return doAlias;
    return "—";
  }
  return "—";
}

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

interface InfluencerOpcao {
  id: string;
  nome: string;
  status: string;
  role: "influencer" | "afiliado";
}
interface CampanhaOpcao { id: string; nome: string; ativo: boolean; }
type Aba = "pendentes" | "mapeados" | "ignorados";
type TipoMapeamento = "influencer" | "campanha" | "afiliado";

function labelOrigemCda(conta: UtmAlias["cda_conta"]): string {
  if (conta === "afiliados") return "TAP Afiliados";
  if (conta === "influencers") return "TAP Influencers";
  return "—";
}

function colunasPorAba(aba: Aba): number {
  if (aba === "pendentes") return 6;
  return 7;
}

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

  const [aba, setAba] = useRouteTab("gestao_links", "pendentes", ["pendentes", "mapeados", "ignorados"] as const);
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [aliases, setAliases] = useState<UtmAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<InfluencerOpcao[]>([]);
  const [afiliados, setAfiliados] = useState<InfluencerOpcao[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(true);
  const [erroEntidades, setErroEntidades] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [aliasSelecionado, setAliasSelecionado] = useState<UtmAlias | null>(null);
  const [influencerSelecionado, setInfluencerSelecionado] = useState("");
  const [afiliadoSelecionado, setAfiliadoSelecionado] = useState("");
  const [campanhaSelecionada, setCampanhaSelecionada] = useState("");
  const [tipoMapeamento, setTipoMapeamento] = useState<TipoMapeamento>("influencer");
  const [campanhas, setCampanhas] = useState<CampanhaOpcao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [confirmFechar, setConfirmFechar] = useState(false);
  type LinkSortCol =
    | "utm"
    | "operadora"
    | "origem"
    | "primeiro"
    | "acao"
    | "proprietario"
    | "status"
    | "visitas"
    | "registros";
  const [sortLinks, setSortLinks] = useState<{ col: LinkSortCol; dir: SortDir }>({ col: "visitas", dir: "desc" });
  const [buscaUtm, setBuscaUtm] = useState("");

  function fecharModalLimpo() {
    setModalAberto(false);
    setConfirmFechar(false);
    setAliasSelecionado(null);
    setInfluencerSelecionado("");
    setAfiliadoSelecionado("");
    setCampanhaSelecionada("");
    setErroModal(null);
  }

  function solicitarFecharModal() {
    if (salvando) return;
    const dirty =
      influencerSelecionado !== "" || afiliadoSelecionado !== "" || campanhaSelecionada !== "";
    if (dirty) setConfirmFechar(true);
    else fecharModalLimpo();
  }

  const carregar = useCallback(async () => {
    setLoading(true);
    const statusFiltro: Record<Aba, string> = { pendentes: "pendente", mapeados: "mapeado", ignorados: "ignorado" };
    let query = supabase
      .from("utm_aliases")
      .select("*")
      .eq("status", statusFiltro[aba])
      .order(aba === "pendentes" ? "total_visits" : "total_ftds", { ascending: false })
      .limit(500);
    if (operadoraFiltro !== "todas") query = query.eq("operadora_slug", operadoraFiltro);
    const { data, error } = await query;
    if (error) { console.error("Erro ao carregar utm_aliases:", error.message); setAliases([]); setLoading(false); return; }
    const aliasData = data ?? [];
    let infNomeMap = new Map<string, string>();
    let campanhaNomeMap = new Map<string, string>();
    if (aba === "mapeados") {
      const influencerIds = [
        ...new Set(aliasData.map((r: UtmAlias) => r.influencer_id).filter(Boolean) as string[]),
      ];
      if (influencerIds.length > 0) {
        // Fonte canónica do nome (igual Links/Materiais e sync CDA): influencer_perfil.id = profiles.id
        const [{ data: perfilData, error: perfilErr }, { data: profData, error: profErr }] =
          await Promise.all([
            supabase
              .from("influencer_perfil")
              .select("id, nome_artistico, nome_completo")
              .in("id", influencerIds),
            supabase.from("profiles").select("id, name, role").in("id", influencerIds),
          ]);
        if (perfilErr) console.error("[GestaoLinks] nomes influencer_perfil:", perfilErr.message);
        if (profErr) console.error("[GestaoLinks] nomes profiles:", profErr.message);

        type PerfilRow = {
          id: string;
          nome_artistico: string | null;
          nome_completo: string | null;
        };
        type ProfRow = { id: string; name: string | null; role: string };
        const perfilById = new Map(((perfilData ?? []) as PerfilRow[]).map((p) => [p.id, p]));
        const profById = new Map(((profData ?? []) as ProfRow[]).map((p) => [p.id, p]));

        infNomeMap = new Map();
        for (const id of influencerIds) {
          const perfil = perfilById.get(id);
          const prof = profById.get(id);
          infNomeMap.set(
            id,
            nomeExibicaoLinksEntidade({
              role: prof?.role,
              nome_artistico: perfil?.nome_artistico,
              nome_completo: perfil?.nome_completo,
              name: prof?.name,
            }),
          );
        }
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
  useEffect(() => { supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome").then(({ data }) => setOperadorasList(data ?? [])); }, []);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingEntidades(true);
      setErroEntidades(false);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, role")
        .in("role", ["influencer", "afiliado"]);
      if (profilesError) {
        console.error("[GestaoLinks] lista profiles:", profilesError.message);
        if (cancelled) return;
        setInfluencers([]);
        setAfiliados([]);
        setErroEntidades(true);
        setLoadingEntidades(false);
        return;
      }

      type ProfileRow = {
        id: string;
        name: string | null;
        role: "influencer" | "afiliado";
      };
      type PerfilRow = {
        id: string;
        nome_artistico: string | null;
        nome_completo: string | null;
        status: string | null;
      };
      const profiles = (profilesData ?? []) as ProfileRow[];
      const ids = profiles.map((profile) => profile.id);
      const perfilRes =
        ids.length > 0
          ? await supabase
              .from("influencer_perfil")
              .select("id, nome_artistico, nome_completo, status")
              .in("id", ids)
          : { data: [] as PerfilRow[], error: null };
      if (perfilRes.error) {
        console.error("[GestaoLinks] lista influencer_perfil:", perfilRes.error.message);
        if (cancelled) return;
        setInfluencers([]);
        setAfiliados([]);
        setErroEntidades(true);
        setLoadingEntidades(false);
        return;
      }

      const perfilById = new Map(
        ((perfilRes.data ?? []) as PerfilRow[]).map((perfil) => [perfil.id, perfil] as const),
      );
      const mapped = profiles.map((r) => {
        const perfil = perfilById.get(r.id);
        return {
          id: r.id,
          role: r.role,
          status: (perfil?.status ?? "ativo").toString(),
          nome: nomeExibicaoLinksEntidade({
            role: r.role,
            nome_artistico: perfil?.nome_artistico,
            nome_completo: perfil?.nome_completo,
            name: r.name,
          }),
        } satisfies InfluencerOpcao;
      });
      if (cancelled) return;
      setInfluencers(mapped.filter((m) => m.role === "influencer"));
      setAfiliados(mapped.filter((m) => m.role === "afiliado"));
      setLoadingEntidades(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
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
    setAfiliadoSelecionado("");
    setCampanhaSelecionada("");
    setTipoMapeamento(alias.cda_conta === "afiliados" ? "afiliado" : "influencer");
    setErroModal(null);
    setConfirmFechar(false);
    setModalAberto(true);
  }

  async function confirmarMapeamento() {
    if (!aliasSelecionado) return;
    const isCampanha = tipoMapeamento === "campanha";
    const idSelecionado = isCampanha
      ? campanhaSelecionada
      : tipoMapeamento === "afiliado"
        ? afiliadoSelecionado
        : influencerSelecionado;
    if (!idSelecionado) return;
    if (!isCampanha && perm.canEditar === "proprios" && !podeVerInfluencer(idSelecionado)) return;

    setSalvando(true); setErroModal(null);

    const updatePayload = isCampanha
      ? { campanha_id: idSelecionado, influencer_id: null, status: "mapeado", mapeado_por: user?.id ?? null, mapeado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }
      : { influencer_id: idSelecionado, campanha_id: null, status: "mapeado", mapeado_por: user?.id ?? null, mapeado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };

    const { error } = await supabase.from("utm_aliases").update(updatePayload).eq("id", aliasSelecionado.id);
    if (error) {
      console.error("[GestaoLinks] Erro ao salvar mapeamento:", error);
      setSalvando(false);
      setErroModal(MSG_ERRO_MAPEAR);
      return;
    }

    // RPC: copia utm_metricas_diarias → influencer_metricas (influencer ou afiliado)
    let linhasCopiadas = 0;
    if (!isCampanha) {
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
            body: {
              data_inicio: dataInicio,
              data_fim: dataFim,
              utm_source: aliasSelecionado.utm_source,
              skip_orfaos: true,
              conta: tipoMapeamento === "afiliado" ? "afiliados" : "influencers",
            },
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

  const dataTable = useDataTableBlock();
  const tdMuted: React.CSSProperties = { ...dataTable.tdCenter, color: t.textMuted, fontSize: 12, whiteSpace: "nowrap" };
  const tdUtm: React.CSSProperties = {
    ...dataTable.tdCenter,
    whiteSpace: "normal",
    wordBreak: "break-all",
    maxWidth: 220,
  };

  const emptyMessages: Record<Aba, string> = {
    pendentes:
      "Nenhum link pendente. UTMs detectados nas contas TAP Influencers e TAP Afiliados aparecem aqui após o sync.",
    mapeados: "Nenhum link mapeado ainda.",
    ignorados: "Nenhum link ignorado.",
  };
  const MSG_VAZIO_BUSCA = "Nenhum link encontrado para a busca.";

  const statusInfluencerPorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of influencers) m.set(i.id, i.status);
    for (const i of afiliados) m.set(i.id, i.status);
    return m;
  }, [influencers, afiliados]);

  /** Mesmos nomes do select do modal Mapear (Influencer / Afiliado / Campanha). */
  const nomePorInfluencerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of influencers) m.set(i.id, i.nome);
    for (const i of afiliados) m.set(i.id, i.nome);
    return m;
  }, [influencers, afiliados]);

  const nomePorCampanhaId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of campanhas) m.set(c.id, c.nome);
    return m;
  }, [campanhas]);

  const statusDoLink = useCallback(
    (a: UtmAlias): string | null => {
      if (a.influencer_id) return statusInfluencerPorId.get(a.influencer_id) ?? "ativo";
      if (a.campanha_id) return a.campanha_ativo === false ? "inativo" : "ativo";
      return null;
    },
    [statusInfluencerPorId],
  );

  const aliasesOrdenados = useMemo(() => {
    const arr = aliases.filter((a) => textoContemBusca(a.utm_source, buscaUtm));
    const { col, dir } = sortLinks;
    const nomeOp = (a: UtmAlias) =>
      (operadorasList.find((o) => o.slug === a.operadora_slug)?.nome ?? a.operadora_slug ?? "").toLowerCase();
    const proprietarioLabel = (a: UtmAlias) =>
      labelProprietarioAlias(a, nomePorInfluencerId, nomePorCampanhaId).trim().toLowerCase();
    arr.sort((a, b) => {
      let c = 0;
      switch (col) {
        case "utm":
          c = compareLocaleTexto(a.utm_source, b.utm_source, dir);
          break;
        case "operadora":
          c = compareLocaleTexto(nomeOp(a), nomeOp(b), dir);
          break;
        case "origem":
          c = compareLocaleTexto(labelOrigemCda(a.cda_conta), labelOrigemCda(b.cda_conta), dir);
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
  }, [
    aliases,
    buscaUtm,
    sortLinks,
    operadorasList,
    aba,
    statusDoLink,
    nomePorInfluencerId,
    nomePorCampanhaId,
  ]);

  const mensagemVazia =
    aliases.length === 0
      ? emptyMessages[aba]
      : aliasesOrdenados.length === 0 && buscaUtm.trim()
        ? MSG_VAZIO_BUSCA
        : emptyMessages[aba];

  useEffect(() => {
    const defaults: Record<Aba, { col: LinkSortCol; dir: SortDir }> = {
      pendentes: { col: "visitas", dir: "desc" },
      mapeados: { col: "acao", dir: "desc" },
      ignorados: { col: "visitas", dir: "desc" },
    };
    setSortLinks(defaults[aba]);
  }, [aba]);

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
        icon={<PageMenuIcon pageKey="gestao_links" />}
        title={getPageMenuLabel("gestao_links")}
        subtitle="Mapeie UTMs detectados a influencers, afiliados ou campanhas e alimente os relatórios."
        actions={
          totalPendentes > 0 ? (
            <span style={{ background: COR.vermelho, color: "#fff", borderRadius: 10, padding: "2px 9px", fontSize: 11, fontWeight: 700, fontFamily: FONT.body }}>
              {totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
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
                onKeyDown={(e) => onFiltroBarTabsKeyDown(e, ABAS_LIST, setAba, (k) => `tab-links-${k}`)}
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
                  const labels: Record<Aba, string> = {
                    pendentes: "Pendentes",
                    mapeados: "Mapeados",
                    ignorados: "Ignorados",
                  };
                  const icons: Record<Aba, React.ReactNode> = {
                    pendentes: <Link2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
                    mapeados: <CheckCircle2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
                    ignorados: <Ban {...FILTRO_BAR_TAB_ICON_PROPS} />,
                  };
                  return (
                    <FiltroBarTabButton
                      key={a}
                      id={`tab-links-${a}`}
                      active={ativa}
                      aria-controls={`painel-${a}`}
                      onClick={() => setAba(a)}
                      icon={icons[a]}
                    >
                      {labels[a]}
                      {a === "pendentes" && totalPendentes > 0 ? (
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
                      ) : null}
                    </FiltroBarTabButton>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {showFiltroOperadora && operadorasList.length > 0 && (
                  <FiltroOperadoraSelect
                    pill
                    minWidth={200}
                    value={operadoraFiltro}
                    onChange={setOperadoraFiltro}
                    operadoras={operadorasList}
                  />
                )}
                <AjudaContextualAcoes pageKey="gestao_links" />
              </div>
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

          <div style={{ ...getFilterBarRowStyle(), width: "100%", marginTop: 12 }}>
            <BarraPesquisaPagina
              value={buscaUtm}
              onChange={setBuscaUtm}
              placeholder={PAGE_SEARCH.utmSource}
              aria-label="Buscar por UTM Source"
              wrapperStyle={{ width: "100%", maxWidth: 480 }}
            />
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
        <div style={getPageContentBoxStyle(brand, t, {
          padding: 60,
          textAlign: "center",
          color: t.textMuted,
          fontSize: 14,
        })}>
          {emptyMessages[aba]}
        </div>
      ) : (
        <div style={getPageContentBoxStyle(brand, t, { padding: 0 })}>
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ fontSize: 13, tableLayout: "fixed" })}>
            <caption style={{ display: "none" }}>Links por status</caption>
            <colgroup>
              <col style={{ width: aba === "pendentes" ? "28%" : "22%" }} />
              <col style={{ width: "12%" }} />
              {aba === "pendentes" && (
                <>
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                </>
              )}
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
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={onSortLinks}
                />
                <SortTableTh<LinkSortCol>
                  label="Operadora"
                  col="operadora"
                  sortCol={sortLinks.col}
                  sortDir={sortLinks.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={onSortLinks}
                />
                {aba === "pendentes" && (
                  <>
                    <SortTableTh<LinkSortCol>
                      label="Origem"
                      col="origem"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSortLinks}
                    />
                    <SortTableTh<LinkSortCol>
                      label="Visitas"
                      col="visitas"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSortLinks}
                    />
                  </>
                )}
                <SortTableTh<LinkSortCol>
                  label="1 Visto"
                  col="primeiro"
                  sortCol={sortLinks.col}
                  sortDir={sortLinks.dir}
                  thStyle={dataTable.thHeader}
                  align="center"
                  onSort={onSortLinks}
                />
                {aba !== "pendentes" && (
                  <SortTableTh<LinkSortCol>
                    label="Data da Ação"
                    col="acao"
                    sortCol={sortLinks.col}
                    sortDir={sortLinks.dir}
                    thStyle={dataTable.thHeader}
                    align="center"
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
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSortLinks}
                    />
                    <SortTableTh<LinkSortCol>
                      label="Status"
                      col="status"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
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
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSortLinks}
                    />
                    <SortTableTh<LinkSortCol>
                      label="Registros"
                      col="registros"
                      sortCol={sortLinks.col}
                      sortDir={sortLinks.dir}
                      thStyle={dataTable.thHeader}
                      align="center"
                      onSort={onSortLinks}
                    />
                  </>
                )}
                <th scope="col" style={dataTable.thHeader}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {aliasesOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={colunasPorAba(aba)} style={{ ...dataTable.tdCenter, color: t.textMuted, padding: 40, whiteSpace: "normal" }}>
                    {mensagemVazia}
                  </td>
                </tr>
              ) : aliasesOrdenados.map((alias, idx) => {
                const zebraBg = dataTable.zebraRow(idx);
                const utmAccent = brand.accent;
                const nomeOperadora =
                  operadorasList.find((o) => o.slug === alias.operadora_slug)?.nome ?? alias.operadora_slug ?? "—";
                const proprietario = labelProprietarioAlias(
                  alias,
                  nomePorInfluencerId,
                  nomePorCampanhaId,
                );
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
                    <td style={dataTable.tdCenter} title={nomeOperadora}>{nomeOperadora}</td>
                    {aba === "pendentes" && (
                      <>
                        <td style={dataTable.tdCenter}>{labelOrigemCda(alias.cda_conta)}</td>
                        <td style={dataTable.tdCenter}>{(alias.total_visits ?? 0).toLocaleString("pt-BR")}</td>
                      </>
                    )}
                    <td style={tdMuted}>{fmtData(alias.primeiro_visto)}</td>
                    {aba !== "pendentes" && (
                      <td style={tdMuted}>{fmtData(dataAcaoIso(aba, alias))}</td>
                    )}
                    {aba === "mapeados" && (
                      <>
                        <td style={{ ...dataTable.tdCenter, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={proprietario}>
                          {proprietario}
                        </td>
                        <td style={dataTable.tdCenter}>{renderStatusBadge(alias)}</td>
                      </>
                    )}
                    {aba === "ignorados" && (
                      <>
                        <td style={dataTable.tdCenter}>{(alias.total_visits ?? 0).toLocaleString("pt-BR")}</td>
                        <td style={dataTable.tdCenter}>{(alias.total_registrations ?? 0).toLocaleString("pt-BR")}</td>
                      </>
                    )}
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
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
              Associe o UTM <strong style={{ color: brand.accent }}>{aliasSelecionado.utm_source}</strong> a um influencer, afiliado ou campanha.
              {aliasSelecionado.cda_conta ? (
                <>
                  {" "}
                  Origem: <strong style={{ color: t.text }}>{labelOrigemCda(aliasSelecionado.cda_conta)}</strong>.
                </>
              ) : null}
            </p>

            <div className="app-grid-3" style={{ background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
              {[
                { label: "Visitas", value: String(aliasSelecionado.total_visits ?? 0) },
                { label: "FTDs", value: String(aliasSelecionado.total_ftds) },
                { label: "GGR", value: fmtBRL(calcGgr(aliasSelecionado)) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT.body }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {(
                [
                  { key: "influencer" as const, label: "Influencer" },
                  { key: "afiliado" as const, label: "Afiliado" },
                  { key: "campanha" as const, label: "Campanha" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tipoMapeamento === key}
                  onClick={() => {
                    setTipoMapeamento(key);
                    setInfluencerSelecionado("");
                    setAfiliadoSelecionado("");
                    setCampanhaSelecionada("");
                  }}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${tipoMapeamento === key ? brand.accent : t.cardBorder}`,
                    background:
                      tipoMapeamento === key
                        ? `color-mix(in srgb, ${brand.accent} 15%, transparent)`
                        : "transparent",
                    color: tipoMapeamento === key ? brand.accent : t.textMuted,
                    fontSize: 13,
                    fontWeight: tipoMapeamento === key ? 700 : 400,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {erroEntidades && tipoMapeamento !== "campanha" ? (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  color: COR.vermelho,
                  fontSize: 12,
                  fontFamily: FONT.body,
                  marginBottom: 14,
                }}
              >
                Não foi possível carregar os membros. Se o problema persistir, entre em contato com o suporte.
              </div>
            ) : null}

            {tipoMapeamento === "influencer" ? (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 6, fontFamily: FONT.body }}>
                  Influencer
                  <CampoObrigatorioMark />
                </label>
                <select value={influencerSelecionado} onChange={(e) => setInfluencerSelecionado(e.target.value)}
                  disabled={loadingEntidades || erroEntidades}
                  style={{ width: "100%", padding: "10px 12px", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.text, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: FONT.body, cursor: "pointer" }}>
                  <option value="">
                    {loadingEntidades
                      ? "Carregando…"
                      : erroEntidades
                        ? "Membros indisponíveis"
                        : "Selecione o influencer..."}
                  </option>
                  {[...(perm.canEditar === "proprios" ? influencers.filter((inf) => podeVerInfluencer(inf.id)) : influencers)]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((inf) => (
                      <option key={inf.id} value={inf.id}>{inf.nome}{inf.status !== "ativo" ? ` (${inf.status})` : ""}</option>
                    ))}
                </select>
              </>
            ) : tipoMapeamento === "afiliado" ? (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 6, fontFamily: FONT.body }}>
                  Afiliado
                  <CampoObrigatorioMark />
                </label>
                <select value={afiliadoSelecionado} onChange={(e) => setAfiliadoSelecionado(e.target.value)}
                  disabled={loadingEntidades || erroEntidades}
                  style={{ width: "100%", padding: "10px 12px", background: t.inputBg ?? t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 10, color: t.text, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: FONT.body, cursor: "pointer" }}>
                  <option value="">
                    {loadingEntidades
                      ? "Carregando…"
                      : erroEntidades
                        ? "Membros indisponíveis"
                        : "Selecione o afiliado..."}
                  </option>
                  {[...(perm.canEditar === "proprios" ? afiliados.filter((af) => podeVerInfluencer(af.id)) : afiliados)]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((af) => (
                      <option key={af.id} value={af.id}>{af.nome}{af.status !== "ativo" ? ` (${af.status})` : ""}</option>
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
              
              <button
                type="button"
                onClick={() => void confirmarMapeamento()}
                disabled={
                  (tipoMapeamento === "influencer"
                    ? !influencerSelecionado
                    : tipoMapeamento === "afiliado"
                      ? !afiliadoSelecionado
                      : !campanhaSelecionada) || salvando
                }
                aria-disabled={
                  (tipoMapeamento === "influencer"
                    ? !influencerSelecionado
                    : tipoMapeamento === "afiliado"
                      ? !afiliadoSelecionado
                      : !campanhaSelecionada) || salvando
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: ctaGradient(brand.useBrand),
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  cursor:
                    (tipoMapeamento === "influencer"
                      ? influencerSelecionado
                      : tipoMapeamento === "afiliado"
                        ? afiliadoSelecionado
                        : campanhaSelecionada) && !salvando
                      ? "pointer"
                      : "not-allowed",
                  opacity:
                    (tipoMapeamento === "influencer"
                      ? influencerSelecionado
                      : tipoMapeamento === "afiliado"
                        ? afiliadoSelecionado
                        : campanhaSelecionada) && !salvando
                      ? 1
                      : 0.5,
                }}
              >
                <Link2 size={13} aria-hidden />{salvando ? "Salvando…" : "Confirmar mapeamento"}
              </button>
            </div>
        </ModalBase>
      )}
      {confirmFechar ? (
        <ModalConfirmDelete
          zIndex={1100}
          title="Fechar sem mapear?"
          texto="Existe uma seleção pendente (influencer, afiliado ou campanha). Deseja fechar sem concluir o mapeamento?"
          confirmLabel="Fechar"
          destructive={false}
          onCancel={() => setConfirmFechar(false)}
          onConfirm={fecharModalLimpo}
        />
      ) : null}
    </div>
  );
}
