import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Banknote,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  Gift,
  LayoutGrid,
  Loader2,
  Megaphone,
  MessagesSquare,
  Pin,
  Scale,
  Shield,
  SlidersHorizontal,
  TriangleAlert,
  UsersRound,
  Wallet,
} from "lucide-react";
import { stripHtmlText, type RhPostagemStatus, type RhPostagemTipoUi } from "../../../lib/portalRhWorkflow";
import { normalizarTextoBusca } from "../../../lib/searchText";
import {
  getPeriodoHistoricoCompetencias,
  isDataNoPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { autorIdPostagem, carregarMetaAutoresPortalRh, type PortalRhAutorInfo } from "../../../lib/portalRhAutorMeta";
import { GerenciamentoPostagens, GerenciamentoPostagensFiltrosTipoStatus } from "./GerenciamentoPostagens";
import { buildMesesCarrossel, itemNoMesCarrossel, type MesCarrosselEntry } from "./portalRhCarrossel";
import { PortalRhBlocoFiltros } from "./PortalRhBlocoFiltros";
import { ComunicadoCard, RhTalkCard } from "./PortalRhCards";
import { BarraReacaoConteudoLigada } from "../../../components/conteudo/BarraReacaoConteudo";
import { ModalLidosPostagem, type ModalLidosContentType } from "./ModalLidosPostagem";
import { ModalLerPolitica, ModalVerAta } from "./PortalRhModaisLeitura";
import { ModalVisualizarDocumento } from "./ModalVisualizarDocumento";
import { PortalRhDocumentosCards } from "./PortalRhDocumentosCards";
import type { AjudaContextualTutorial } from "../../../components/AjudaContextualAcoes";
import { TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS } from "../../geral/Ajuda/tutoriais/portalRhCienciaPoliticas";
import { TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS } from "../../geral/Ajuda/tutoriais/portalRhComunicadosLidos";
import { TUTORIAL_PORTAL_RH_GERENCIAMENTO } from "../../geral/Ajuda/tutoriais/portalRhGerenciamento";
import {
  RH_DOCUMENTO_FILTRO_SUBTABS,
  documentoExigeCienciaDoUsuario,
  documentoUsaModeloNormativo,
  documentoVisivelPorPermissaoPortalRh,
  itemNoFiltroDocumento,
  perfilPortalRhParticipaCiencia,
  podeGerenciarPostagensPortalRh,
  setoresAplicavelDoUsuario,
  tagTipoDocumentoCor,
  type RhDocumentoClassificacao,
  type RhDocumentoTipo,
} from "../../../lib/portalRhDocumentoNormativo";
import { buscarRhFuncionarioAtivoPorEmailLogin } from "../../../lib/rhFuncionarioLoginMatch";
import { carregarOpcoesTimesOrganograma } from "../../../lib/rhOrganogramaFetch";
import { flattenVinculosDeGrupos } from "../../../lib/rhOrganogramaTree";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages, fetchInBatched } from "../../../lib/supabasePaginate";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { useConteudoReacoes } from "../../../hooks/useConteudoReacoes";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { PAGE_SEARCH } from "../../../lib/searchBarConstants";
import { CtaCriarButton } from "../../../components/CtaCriarButton";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { FiltroBarTabButton, onFiltroBarTabsKeyDown } from "../../../components/dashboard";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../lib/filterBarStyles";
import { getPageContentBoxShadow } from "../../../lib/pageContentBoxStyles";

const TUTORIAL_CTX_GERENCIAMENTO: AjudaContextualTutorial = {
  id: TUTORIAL_PORTAL_RH_GERENCIAMENTO.id,
  urlSlug: TUTORIAL_PORTAL_RH_GERENCIAMENTO.urlSlug,
};

const TUTORIAL_CTX_COMUNICADOS_LIDOS: AjudaContextualTutorial = {
  id: TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS.id,
  urlSlug: TUTORIAL_PORTAL_RH_COMUNICADOS_LIDOS.urlSlug,
};

const TUTORIAL_CTX_CIENCIA_POLITICAS: AjudaContextualTutorial = {
  id: TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS.id,
  urlSlug: TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS.urlSlug,
  titulo: TUTORIAL_PORTAL_RH_CIENCIA_POLITICAS.titulo,
  descricao: "Registrar ciência em políticas e normativas publicadas.",
};

type AbaPortal = "comunicados" | "politicas" | "rhtalks" | "gerenciamento";

function isPostagemPublica(status: RhPostagemStatus | string | null | undefined): boolean {
  return !status || status === "publicado";
}

type RhPortalCategoria = {
  id: string;
  slug: string;
  label: string;
  scope: "comunicado" | "politica";
  accent_hex: string;
  sort_order: number;
};

type RhPortalComunicado = {
  id: string;
  titulo: string;
  corpo: string;
  categoria_id: string;
  is_pinned: boolean;
  requires_acknowledgment: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by?: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  status?: RhPostagemStatus | null;
  categoria?: RhPortalCategoria | null;
};

type RhPortalDocumento = {
  id: string;
  titulo: string;
  corpo: string | null;
  categoria_id: string | null;
  paginas: number | null;
  requires_acknowledgment: boolean;
  storage_path: string | null;
  updated_at: string;
  status?: RhPostagemStatus | null;
  published_at?: string | null;
  introducao?: string | null;
  resumo?: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  created_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  codigo?: string | null;
  versao?: string | null;
  tipo_documento?: RhDocumentoTipo | null;
  area_responsavel?: string | null;
  classificacao?: RhDocumentoClassificacao | null;
  aplicavel_a?: string[] | null;
  data_emissao?: string | null;
  elaborado_por?: string | null;
  revisado_por?: string | null;
  aprovado_por_doc?: string | null;
  categoria?: RhPortalCategoria | null;
};

type RhPortalRhTalk = {
  id: string;
  numero: number | null;
  titulo: string;
  data_reuniao: string | null;
  duracao_min: number;
  resumo: string | null;
  corpo?: string | null;
  introducao?: string | null;
  storage_path: string | null;
  imagem_storage_path?: string | null;
  anexo_storage_path?: string | null;
  anexo_nome?: string | null;
  created_by?: string | null;
  status?: RhPostagemStatus | null;
  published_at?: string | null;
  aplicavel_a?: string[] | null;
};

type ReadReceiptRow = {
  content_type: string;
  content_id: string;
  read_at: string | null;
  acknowledged_at: string | null;
};

type SubtabCategoriaConfig = {
  key: string;
  label: string;
  slugs: string[];
};

/** Ordem fixa das sub-abas de Comunicados (após «Todos»). */
const SUBTABS_COMUNICADO: SubtabCategoriaConfig[] = [
  { key: "urgente", label: "Urgente", slugs: ["urgente"] },
  { key: "geral", label: "Geral", slugs: ["geral"] },
  { key: "pagamento", label: "Pagamento", slugs: ["pagamento"] },
  { key: "eventos", label: "Eventos", slugs: ["eventos"] },
];

/** Ordem fixa dos filtros de documentos normativos (após «Todos»). */
const SUBTAB_DOC_ICON: Record<string, ReactNode> = {
  politica_rh: <UsersRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
  procedimento: <ClipboardList {...FILTRO_BAR_TAB_ICON_PROPS} />,
  codigo: <BookOpen {...FILTRO_BAR_TAB_ICON_PROPS} />,
  operacoes: <Briefcase {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function FiltroDocumentoTipoPills({
  filtroAtivo,
  onFiltro,
}: {
  filtroAtivo: string;
  onFiltro: (key: string) => void;
}) {
  const tabKeys = ["todos", ...RH_DOCUMENTO_FILTRO_SUBTABS.map((c) => c.key)] as const;

  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo de documento"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, onFiltro, (k) => `tab-rh-portal-doc-${k}`)}
    >
      <FiltroBarTabButton
        id="tab-rh-portal-doc-todos"
        active={filtroAtivo === "todos"}
        onClick={() => onFiltro("todos")}
        icon={<LayoutGrid {...FILTRO_BAR_TAB_ICON_PROPS} />}
      >
        Todos
      </FiltroBarTabButton>
      {RH_DOCUMENTO_FILTRO_SUBTABS.map((cfg) => {
        const ativo = filtroAtivo === cfg.key;
        const cor = cfg.tipos[0] ? tagTipoDocumentoCor(cfg.tipos[0]) : undefined;
        return (
          <FiltroBarTabButton
            key={cfg.key}
            id={`tab-rh-portal-doc-${cfg.key}`}
            active={ativo}
            onClick={() => onFiltro(cfg.key)}
            activeColor={cor}
            icon={SUBTAB_DOC_ICON[cfg.key] ?? <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {cfg.label}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}

function resolveCategoriaTab(
  cats: RhPortalCategoria[],
  config: SubtabCategoriaConfig,
): RhPortalCategoria | null {
  for (const slug of config.slugs) {
    const found = cats.find((c) => c.slug === slug);
    if (found) return found;
  }
  return cats.find((c) => c.label.toLowerCase() === config.label.toLowerCase()) ?? null;
}

function itemNaSubtabCategoria(
  categoria: RhPortalCategoria | null | undefined,
  config: SubtabCategoriaConfig,
): boolean {
  if (!categoria) return false;
  return config.slugs.includes(categoria.slug);
}

function receiptKey(ct: string, id: string): string {
  return `${ct}:${id}`;
}

const ERRO_CARREGAR_PORTAL =
  "Não foi possível carregar o portal. Se o problema persistir, entre em contato com o suporte.";

function tabsPortalRhKeys(podeGerenciarPostagens: boolean): AbaPortal[] {
  const keys: AbaPortal[] = ["comunicados", "politicas", "rhtalks"];
  if (podeGerenciarPostagens) keys.push("gerenciamento");
  return keys;
}

function onPortalRhTabsKeyDown(
  e: KeyboardEvent,
  abaAtiva: AbaPortal,
  setAba: (key: AbaPortal) => void,
  podeGerenciarPostagens: boolean,
) {
  const tabs = tabsPortalRhKeys(podeGerenciarPostagens);
  const idx = tabs.indexOf(abaAtiva);
  if (idx < 0) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    const next = tabs[(idx + 1) % tabs.length];
    setAba(next);
    document.getElementById(`tab-rh-portal-${next}`)?.focus();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    setAba(prev);
    document.getElementById(`tab-rh-portal-${prev}`)?.focus();
  }
}

const SUBTAB_ICONS: Record<string, ReactNode> = {
  todos: <LayoutGrid {...FILTRO_BAR_TAB_ICON_PROPS} />,
  urgente: <TriangleAlert {...FILTRO_BAR_TAB_ICON_PROPS} />,
  geral: <Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />,
  pagamento: <Wallet {...FILTRO_BAR_TAB_ICON_PROPS} />,
  eventos: <CalendarDays {...FILTRO_BAR_TAB_ICON_PROPS} />,
  conduta: <Scale {...FILTRO_BAR_TAB_ICON_PROPS} />,
  seguranca: <Shield {...FILTRO_BAR_TAB_ICON_PROPS} />,
  bonificacao: <Gift {...FILTRO_BAR_TAB_ICON_PROPS} />,
  folha_pagamento: <Banknote {...FILTRO_BAR_TAB_ICON_PROPS} />,
  rh: <UsersRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

function FiltroSubtabPills({
  filtroAtivo,
  onFiltro,
  configs,
  categorias,
}: {
  filtroAtivo: string;
  onFiltro: (key: string) => void;
  configs: SubtabCategoriaConfig[];
  categorias: RhPortalCategoria[];
}) {
  const tabKeys = ["todos", ...configs.map((c) => c.key)] as const;

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoria"
      style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}
      onKeyDown={(e) => onFiltroBarTabsKeyDown(e, tabKeys, onFiltro, (k) => `tab-rh-portal-cat-${k}`)}
    >
      <FiltroBarTabButton
        id="tab-rh-portal-cat-todos"
        active={filtroAtivo === "todos"}
        onClick={() => onFiltro("todos")}
        icon={SUBTAB_ICONS.todos}
      >
        Todos
      </FiltroBarTabButton>
      {configs.map((cfg) => {
        const cat = resolveCategoriaTab(categorias, cfg);
        const ativo = filtroAtivo === cfg.key;
        return (
          <FiltroBarTabButton
            key={cfg.key}
            id={`tab-rh-portal-cat-${cfg.key}`}
            active={ativo}
            onClick={() => onFiltro(cfg.key)}
            activeColor={cat?.accent_hex}
            icon={SUBTAB_ICONS[cfg.key] ?? <FileText {...FILTRO_BAR_TAB_ICON_PROPS} />}
          >
            {cfg.label}
          </FiltroBarTabButton>
        );
      })}
    </div>
  );
}

export default function PortalRhPage() {
  const { theme: t, user } = useApp();
  const { email: emailEfetivo, userId: userIdEfetivo, role: roleEfetivo } = useIdentidadeEfetiva();
  const perm = usePermission("rh_portal");
  const podeGerenciarPostagens = podeGerenciarPostagensPortalRh(perm.canEditar);

  const [aba, setAba] = useRouteTab(
    "rh_portal",
    "comunicados",
    ["comunicados", "politicas", "rhtalks", "gerenciamento"] as const,
  );
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [categoriasCom, setCategoriasCom] = useState<RhPortalCategoria[]>([]);
  const [categoriasPol, setCategoriasPol] = useState<RhPortalCategoria[]>([]);
  const [comunicados, setComunicados] = useState<RhPortalComunicado[]>([]);
  const [documentos, setDocumentos] = useState<RhPortalDocumento[]>([]);
  const [talks, setTalks] = useState<RhPortalRhTalk[]>([]);
  const [receipts, setReceipts] = useState<Map<string, ReadReceiptRow>>(new Map());
  const [metaAutores, setMetaAutores] = useState<Record<string, PortalRhAutorInfo>>({});

  const [filtroCatCom, setFiltroCatCom] = useState<string>("todos");
  const [filtroCatPol, setFiltroCatPol] = useState<string>("todos");
  const [idxMesCom, setIdxMesCom] = useState(0);
  const [idxMesPol, setIdxMesPol] = useState(0);
  const [idxMesTalk, setIdxMesTalk] = useState(0);
  const [idxMesGer, setIdxMesGer] = useState(0);
  const [mesesGer, setMesesGer] = useState<MesCarrosselEntry[]>(() => buildMesesCarrossel([]));
  const [filtroTipoGer, setFiltroTipoGer] = useState<"todos" | RhPostagemTipoUi>("todos");
  const [filtroStatusGer, setFiltroStatusGer] = useState<"todos" | RhPostagemStatus>("todos");
  const [modoHistorico, setModoHistorico] = useState(false);
  const abrirCriarGerenciamentoRef = useRef<(() => void) | null>(null);

  const [modalDoc, setModalDoc] = useState<RhPortalDocumento | null>(null);
  const [modalTalk, setModalTalk] = useState<RhPortalRhTalk | null>(null);
  const [modalLidos, setModalLidos] = useState<{
    id: string;
    titulo: string;
    contentType: ModalLidosContentType;
  } | null>(null);
  const [setoresUsuarioAplicavel, setSetoresUsuarioAplicavel] = useState<string[]>([]);

  const cardShadow = getPageContentBoxShadow(t.isDark);

  useEffect(() => {
    const id = window.setTimeout(() => setBuscaDeb(normalizarTextoBusca(busca)), 300);
    return () => window.clearTimeout(id);
  }, [busca]);

  useEffect(() => {
    if (!emailEfetivo?.trim()) {
      setSetoresUsuarioAplicavel([]);
      return;
    }
    let cancel = false;
    void (async () => {
      const [funcionario, org] = await Promise.all([
        buscarRhFuncionarioAtivoPorEmailLogin(emailEfetivo),
        carregarOpcoesTimesOrganograma(),
      ]);
      if (cancel) return;
      const vinculos = flattenVinculosDeGrupos(org.grupos);
      setSetoresUsuarioAplicavel(setoresAplicavelDoUsuario(funcionario, vinculos));
    })();
    return () => {
      cancel = true;
    };
  }, [emailEfetivo]);

  const carregar = useCallback(async () => {
    if (!userIdEfetivo) return;
    setLoading(true);
    setErro(null);
    try {

    const { inicio: histInicio } = getPeriodoHistoricoCompetencias();
    const catCols = "id, slug, label, scope, accent_hex, sort_order";
    const catJoin = "categoria:rh_portal_categoria(slug,label,accent_hex)";
    const comCols =
      "id, titulo, corpo, categoria_id, is_pinned, requires_acknowledgment, published_at, published_by, created_by, imagem_storage_path, anexo_storage_path, anexo_nome, approved_at, approved_by, status";
    const docCols =
      "id, titulo, corpo, categoria_id, paginas, requires_acknowledgment, storage_path, updated_at, status, published_at, introducao, resumo, imagem_storage_path, anexo_storage_path, anexo_nome, created_by, approved_at, approved_by, codigo, versao, tipo_documento, area_responsavel, classificacao, aplicavel_a, data_emissao, elaborado_por, revisado_por, aprovado_por_doc";
    const talkCols =
      "id, numero, titulo, data_reuniao, duracao_min, resumo, corpo, introducao, storage_path, imagem_storage_path, anexo_storage_path, anexo_nome, created_by, status, published_at, aplicavel_a";

    const [catRes, comData, docData, talkData] = await Promise.all([
      supabase.from("rh_portal_categoria").select(catCols).order("sort_order", { ascending: true }),
      fetchAllPages<RhPortalComunicado>(async (from, to) => {
        const { data, error } = await supabase
          .from("rh_portal_comunicado")
          .select(`${comCols}, ${catJoin}`)
          .eq("status", "publicado")
          .or(`is_pinned.eq.true,published_at.gte.${histInicio}`)
          .order("published_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: (data ?? []) as unknown as RhPortalComunicado[], error };
      }),
      fetchAllPages<RhPortalDocumento>(async (from, to) => {
        const { data, error } = await supabase
          .from("rh_portal_documento")
          .select(`${docCols}, ${catJoin}`)
          .eq("status", "publicado")
          .gte("published_at", histInicio)
          .order("updated_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: (data ?? []) as unknown as RhPortalDocumento[], error };
      }),
      fetchAllPages<RhPortalRhTalk>(async (from, to) => {
        const { data, error } = await supabase
          .from("rh_portal_rh_talk")
          .select(talkCols)
          .eq("status", "publicado")
          .gte("published_at", histInicio)
          .order("data_reuniao", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: (data ?? []) as unknown as RhPortalRhTalk[], error };
      }),
    ]);

    if (catRes.error) throw catRes.error;

    const cats = (catRes.data ?? []) as RhPortalCategoria[];
    setCategoriasCom(cats.filter((c) => c.scope === "comunicado"));
    setCategoriasPol(cats.filter((c) => c.scope === "politica"));

    /** Abas de leitura: nunca exibir arquivados — só conteúdo publicado. */
    const visivelPortal = (status: RhPostagemStatus | null | undefined) => isPostagemPublica(status);

    const comRows = comData.filter((c) => visivelPortal(c.status));
    setComunicados(comRows);
    const docRows = docData.filter((d) => visivelPortal(d.status));
    setDocumentos(docRows);
    const talkRows = talkData.filter((tk) => visivelPortal(tk.status));
    setTalks(talkRows);

    const userIds = new Set<string>();
    for (const c of comRows) {
      const aid = autorIdPostagem(c);
      if (aid) userIds.add(aid);
      if (c.approved_by) userIds.add(c.approved_by);
    }
    for (const d of docRows) {
      const aid = autorIdPostagem(d);
      if (aid) userIds.add(aid);
      if (d.approved_by) userIds.add(d.approved_by);
    }
    for (const tk of talkRows) {
      const aid = autorIdPostagem(tk);
      if (aid) userIds.add(aid);
    }

    const [recData, meta] = await Promise.all([
      (() => {
        const contentIds = [
          ...comRows.map((c) => c.id),
          ...docRows.map((d) => d.id),
          ...talkRows.map((t) => t.id),
        ];
        if (contentIds.length === 0) return Promise.resolve([] as ReadReceiptRow[]);
        return fetchInBatched(contentIds, 100, async (ids) => {
          const { data, error } = await supabase
            .from("rh_portal_read_receipt")
            .select("content_type, content_id, read_at, acknowledged_at")
            .eq("user_id", userIdEfetivo)
            .in("content_id", ids);
          if (error) throw error;
          return (data ?? []) as ReadReceiptRow[];
        }, 3);
      })(),
      carregarMetaAutoresPortalRh([...userIds]),
    ]);

    const map = new Map<string, ReadReceiptRow>();
    for (const row of recData) {
      map.set(receiptKey(row.content_type, row.content_id), row);
    }
    setReceipts(map);
    setMetaAutores(meta);

    } catch (error) {
      console.error("[PortalRh] carregar:", error);
      setErro(ERRO_CARREGAR_PORTAL);
    } finally {
      setLoading(false);
    }
  }, [userIdEfetivo]);

  useEffect(() => {
    if (perm.loading || perm.canView === "nao" || !userIdEfetivo) return;
    void carregar();
  }, [carregar, perm.loading, perm.canView, userIdEfetivo]);

  useEffect(() => {
    if (perm.loading) return;
    if (!podeGerenciarPostagens && aba === "gerenciamento") setAba("comunicados");
  }, [perm.loading, podeGerenciarPostagens, aba, setAba]);

  useEffect(() => {
    if (aba === "gerenciamento") return;
    setModoHistorico(false);
    setBusca("");
    setBuscaDeb("");
  }, [aba]);

  const hitBuscaTexto = useCallback(
    (s: string | null | undefined) => !buscaDeb || normalizarTextoBusca(s).includes(buscaDeb),
    [buscaDeb],
  );

  const hitBuscaCorpo = useCallback(
    (html: string | null | undefined) =>
      !buscaDeb || normalizarTextoBusca(stripHtmlText(html ?? "")).includes(buscaDeb),
    [buscaDeb],
  );

  const mesesCom = useMemo(
    () => buildMesesCarrossel(comunicados.map((c) => ({ iso: c.published_at }))),
    [comunicados],
  );
  const mesesPol = useMemo(
    () => buildMesesCarrossel(documentos.map((d) => ({ iso: d.published_at }))),
    [documentos],
  );
  const mesesTalksDisponiveis = useMemo(
    () => buildMesesCarrossel(talks.map((tk) => ({ iso: tk.published_at }))),
    [talks],
  );

  useEffect(() => {
    setIdxMesCom((i) => Math.min(i, Math.max(0, mesesCom.length - 1)));
  }, [mesesCom.length]);
  useEffect(() => {
    setIdxMesPol((i) => Math.min(i, Math.max(0, mesesPol.length - 1)));
  }, [mesesPol.length]);
  useEffect(() => {
    setIdxMesTalk((i) => Math.min(i, Math.max(0, mesesTalksDisponiveis.length - 1)));
  }, [mesesTalksDisponiveis.length]);

  const handleRegisterAbrirCriar = useCallback((fn: () => void) => {
    abrirCriarGerenciamentoRef.current = fn;
  }, []);

  const handleMesesGerChange = useCallback((meses: MesCarrosselEntry[]) => {
    setMesesGer(meses);
    setIdxMesGer(Math.max(0, meses.length - 1));
  }, []);

  const filtroCarrossel = useMemo(() => {
    switch (aba) {
      case "politicas":
        return { meses: mesesPol, idx: idxMesPol, setIdx: setIdxMesPol };
      case "rhtalks":
        return { meses: mesesTalksDisponiveis, idx: idxMesTalk, setIdx: setIdxMesTalk };
      case "gerenciamento":
        return { meses: mesesGer, idx: idxMesGer, setIdx: setIdxMesGer };
      default:
        return { meses: mesesCom, idx: idxMesCom, setIdx: setIdxMesCom };
    }
  }, [aba, mesesCom, mesesPol, mesesTalksDisponiveis, mesesGer, idxMesCom, idxMesPol, idxMesTalk, idxMesGer]);

  const buscaFiltroMeta = useMemo(() => {
    switch (aba) {
      case "politicas":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar documentos por código, título ou palavra-chave",
        };
      case "rhtalks":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar RH Talks por assunto ou descrição",
        };
      case "gerenciamento":
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar postagens por palavras-chave",
        };
      default:
        return {
          placeholder: PAGE_SEARCH.portalRh,
          ariaLabel: "Pesquisar comunicados por assunto ou descrição",
        };
    }
  }, [aba]);

  const linhaSubabasFiltro = useMemo(() => {
    if (aba === "comunicados") {
      return (
        <FiltroSubtabPills
          filtroAtivo={filtroCatCom}
          onFiltro={setFiltroCatCom}
          configs={SUBTABS_COMUNICADO}
          categorias={categoriasCom}
        />
      );
    }
    if (aba === "politicas") {
      return (
        <FiltroDocumentoTipoPills filtroAtivo={filtroCatPol} onFiltro={setFiltroCatPol} />
      );
    }
    if (aba === "gerenciamento" && podeGerenciarPostagens) {
      return (
        <>
          <GerenciamentoPostagensFiltrosTipoStatus
            filtroTipo={filtroTipoGer}
            onFiltroTipoChange={setFiltroTipoGer}
            filtroStatus={filtroStatusGer}
            onFiltroStatusChange={setFiltroStatusGer}
          />
          <CtaCriarButton type="button" onClick={() => abrirCriarGerenciamentoRef.current?.()}>
            Nova Postagem
          </CtaCriarButton>
        </>
      );
    }
    return null;
  }, [aba, filtroCatCom, filtroCatPol, categoriasCom, filtroTipoGer, filtroStatusGer, podeGerenciarPostagens]);

  useEffect(() => {
    if (comunicados.length > 0 && mesesCom.length > 0) setIdxMesCom(mesesCom.length - 1);
  }, [comunicados.length, mesesCom.length]);
  useEffect(() => {
    if (documentos.length > 0 && mesesPol.length > 0) setIdxMesPol(mesesPol.length - 1);
  }, [documentos.length, mesesPol.length]);
  useEffect(() => {
    if (talks.length > 0 && mesesTalksDisponiveis.length > 0) setIdxMesTalk(mesesTalksDisponiveis.length - 1);
  }, [talks.length, mesesTalksDisponiveis.length]);

  const comunicadoPinned = useMemo(() => {
    if (modoHistorico || buscaDeb) return null;
    const mesSel = mesesCom[idxMesCom];
    const pin = comunicados.find((c) => c.is_pinned && isPostagemPublica(c.status));
    if (!pin || !itemNoMesCarrossel(pin.published_at, mesSel)) return null;
    return pin;
  }, [comunicados, modoHistorico, buscaDeb, mesesCom, idxMesCom]);

  const comunicadosLista = useMemo(() => {
    let list = comunicados.filter((c) => !c.is_pinned);
    list = list.filter((c) => isPostagemPublica(c.status));
    if (!modoHistorico) {
      const mesSel = mesesCom[idxMesCom];
      list = list.filter((c) => itemNoMesCarrossel(c.published_at, mesSel));
    } else {
      list = list.filter((c) => isDataNoPeriodoHistoricoCompetencias(c.published_at));
    }
    if (filtroCatCom !== "todos") {
      const cfg = SUBTABS_COMUNICADO.find((x) => x.key === filtroCatCom);
      if (cfg) list = list.filter((c) => itemNaSubtabCategoria(c.categoria, cfg));
    }
    if (buscaDeb) {
      list = list.filter(
        (c) =>
          hitBuscaTexto(c.titulo) ||
          hitBuscaCorpo(c.corpo) ||
          hitBuscaTexto(c.categoria?.label) ||
          hitBuscaTexto(c.categoria?.slug),
      );
    }
    const recMap = receipts;
    const uid = userIdEfetivo;
    list = [...list].sort((a, b) => {
      const pendA =
        a.requires_acknowledgment &&
        uid &&
        !recMap.get(receiptKey("comunicado", a.id))?.acknowledged_at;
      const pendB =
        b.requires_acknowledgment &&
        uid &&
        !recMap.get(receiptKey("comunicado", b.id))?.acknowledged_at;
      if (pendA !== pendB) return pendA ? -1 : 1;
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    });
    return list;
  }, [
    comunicados,
    filtroCatCom,
    receipts,
    userIdEfetivo,
    modoHistorico,
    mesesCom,
    idxMesCom,
    buscaDeb,
    hitBuscaTexto,
    hitBuscaCorpo,
  ]);

  const chavesReacaoComunicado = useMemo(() => {
    const ids = comunicadosLista.map((c) => c.id);
    if (comunicadoPinned) ids.push(comunicadoPinned.id);
    return [...new Set(ids)].map((contentId) => ({
      origem: "rh_comunicado" as const,
      contentId,
    }));
  }, [comunicadosLista, comunicadoPinned]);
  const reacoesComunicado = useConteudoReacoes(chavesReacaoComunicado);

  const documentosFiltrados = useMemo(() => {
    let list = documentos.filter((d) => isPostagemPublica(d.status));
    list = list.filter((d) =>
      documentoVisivelPorPermissaoPortalRh(d, perm.canView, perm.canEditar, setoresUsuarioAplicavel),
    );
    if (!modoHistorico) {
      const mesSel = mesesPol[idxMesPol];
      list = list.filter((d) => itemNoMesCarrossel(d.published_at, mesSel));
    } else {
      list = list.filter((d) => isDataNoPeriodoHistoricoCompetencias(d.published_at));
    }
    if (filtroCatPol !== "todos") {
      list = list.filter((d) => itemNoFiltroDocumento(d, filtroCatPol));
    }
    if (buscaDeb) {
      list = list.filter(
        (d) =>
          hitBuscaTexto(d.titulo) ||
          hitBuscaTexto(d.codigo) ||
          hitBuscaTexto(d.resumo) ||
          hitBuscaCorpo(d.corpo) ||
          hitBuscaTexto(d.introducao) ||
          hitBuscaTexto(d.categoria?.label) ||
          hitBuscaTexto(d.categoria?.slug),
      );
    }
    list = [...list].sort((a, b) => {
      const codA = a.codigo ?? a.titulo;
      const codB = b.codigo ?? b.titulo;
      return codA.localeCompare(codB, "pt-BR", { numeric: true });
    });
    return list;
  }, [
    documentos,
    perm.canView,
    perm.canEditar,
    setoresUsuarioAplicavel,
    filtroCatPol,
    modoHistorico,
    mesesPol,
    idxMesPol,
    buscaDeb,
    hitBuscaTexto,
    hitBuscaCorpo,
  ]);

  const talksFiltrados = useMemo(() => {
    let list = talks.filter((tk) => isPostagemPublica(tk.status));
    list = list.filter((tk) =>
      documentoVisivelPorPermissaoPortalRh(tk, perm.canView, perm.canEditar, setoresUsuarioAplicavel),
    );
    if (!modoHistorico) {
      const mesSel = mesesTalksDisponiveis[idxMesTalk];
      list = list.filter((tk) => itemNoMesCarrossel(tk.published_at, mesSel));
    } else {
      list = list.filter((tk) => isDataNoPeriodoHistoricoCompetencias(tk.published_at));
    }
    if (buscaDeb) {
      list = list.filter(
        (x) =>
          hitBuscaTexto(x.titulo) ||
          hitBuscaTexto(x.resumo) ||
          hitBuscaCorpo(x.corpo) ||
          hitBuscaTexto(x.introducao) ||
          String(x.numero).includes(buscaDeb),
      );
    }
    return list;
  }, [
    talks,
    perm.canView,
    perm.canEditar,
    setoresUsuarioAplicavel,
    modoHistorico,
    mesesTalksDisponiveis,
    idxMesTalk,
    buscaDeb,
    hitBuscaTexto,
    hitBuscaCorpo,
  ]);

  async function marcarLidoComunicado(contentId: string) {
    if (!user?.id) return;
    const key = receiptKey("comunicado", contentId);
    const now = new Date().toISOString();
    const existing = receipts.get(key);
    if (existing?.read_at) return;
    if (existing) {
      const { error } = await supabase
        .from("rh_portal_read_receipt")
        .update({ read_at: now })
        .eq("content_type", "comunicado")
        .eq("content_id", contentId)
        .eq("user_id", user.id);
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { ...existing, read_at: now });
          return n;
        });
      }
    } else {
      const { error } = await supabase.from("rh_portal_read_receipt").insert({
        content_type: "comunicado",
        content_id: contentId,
        user_id: user.id,
        read_at: now,
      });
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { content_type: "comunicado", content_id: contentId, read_at: now, acknowledged_at: null });
          return n;
        });
      }
    }
  }

  async function marcarLidoECienteDocumento(contentId: string) {
    if (!user?.id) return;
    const key = receiptKey("documento", contentId);
    const now = new Date().toISOString();
    const existing = receipts.get(key);
    if (existing?.acknowledged_at) return;
    if (existing) {
      const { error } = await supabase
        .from("rh_portal_read_receipt")
        .update({ read_at: existing.read_at ?? now, acknowledged_at: now })
        .eq("content_type", "documento")
        .eq("content_id", contentId)
        .eq("user_id", user.id);
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { ...existing, read_at: existing.read_at ?? now, acknowledged_at: now });
          return n;
        });
      }
    } else {
      const { error } = await supabase.from("rh_portal_read_receipt").insert({
        content_type: "documento",
        content_id: contentId,
        user_id: user.id,
        read_at: now,
        acknowledged_at: now,
      });
      if (!error) {
        setReceipts((prev) => {
          const n = new Map(prev);
          n.set(key, { content_type: "documento", content_id: contentId, read_at: now, acknowledged_at: now });
          return n;
        });
      }
    }
  }

  function metaAutor(uid: string | null | undefined): PortalRhAutorInfo | undefined {
    if (!uid) return undefined;
    return metaAutores[uid];
  }

  const cienciaExigidaDocIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of documentosFiltrados) {
      if (documentoExigeCienciaDoUsuario(d, roleEfetivo)) {
        set.add(d.id);
      }
    }
    return set;
  }, [documentosFiltrados, roleEfetivo]);

  const usuarioVeColunaCiencia = perfilPortalRhParticipaCiencia(roleEfetivo);

  const cienciaPendenteDocIds = useMemo(() => {
    const set = new Set<string>();
    if (!userIdEfetivo) return set;
    for (const id of cienciaExigidaDocIds) {
      if (!receipts.get(receiptKey("documento", id))?.acknowledged_at) {
        set.add(id);
      }
    }
    return set;
  }, [cienciaExigidaDocIds, receipts, userIdEfetivo]);

  const cienciaRegistradaEm = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documentosFiltrados) {
      const rec = receipts.get(receiptKey("documento", d.id));
      if (rec?.acknowledged_at) map.set(d.id, rec.acknowledged_at);
    }
    return map;
  }, [documentosFiltrados, receipts]);

  function abrirDocumento(id: string) {
    const doc = documentos.find((d) => d.id === id);
    if (!doc) return;
    setModalDoc(doc);
  }

  if (perm.loading) {
    return (
      <div className="app-page-shell" style={{ background: t.bg, fontFamily: FONT.body, color: t.textMuted }}>
        <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ display: "block", margin: "48px auto" }} />
      </div>
    );
  }

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, paddingBottom: 32 }}>
      <PageHeader
        icon={<PageMenuIcon pageKey="rh_portal" />}
        title={getPageMenuLabel("rh_portal")}
        subtitle="Comunicados oficiais, políticas internas e atas das RH Talks."
      />

      <PortalRhBlocoFiltros
        meses={filtroCarrossel.meses}
        idxMes={filtroCarrossel.idx}
        onIdxMesChange={filtroCarrossel.setIdx}
        modoHistorico={modoHistorico}
        onModoHistoricoChange={setModoHistorico}
        busca={busca}
        onBuscaChange={setBusca}
        buscaPlaceholder={buscaFiltroMeta.placeholder}
        buscaAriaLabel={buscaFiltroMeta.ariaLabel}
        linhaAbas={
          <div
            role="tablist"
            aria-label="Seções do portal de RH"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
            onKeyDown={(e) => onPortalRhTabsKeyDown(e, aba, setAba, podeGerenciarPostagens)}
          >
            {(
              [
                { key: "comunicados" as const, label: "Comunicados", Icon: Megaphone },
                { key: "politicas" as const, label: "Políticas e normativas", Icon: FileText },
                { key: "rhtalks" as const, label: "RH Talks", Icon: MessagesSquare },
                ...(podeGerenciarPostagens
                  ? [{ key: "gerenciamento" as const, label: "Gerenciamento de Postagens", Icon: SlidersHorizontal }]
                  : []),
              ] as const
            ).map(({ key, label, Icon }) => (
              <FiltroBarTabButton
                key={key}
                id={`tab-rh-portal-${key}`}
                active={aba === key}
                aria-controls={`panel-rh-portal-${key}`}
                onClick={() => setAba(key)}
                icon={<Icon {...FILTRO_BAR_TAB_ICON_PROPS} />}
              >
                {label}
              </FiltroBarTabButton>
            ))}
          </div>
        }
        linhaSubabas={linhaSubabasFiltro ?? undefined}
        tutorial={
          aba === "gerenciamento"
            ? TUTORIAL_CTX_GERENCIAMENTO
            : aba === "comunicados"
              ? TUTORIAL_CTX_COMUNICADOS_LIDOS
              : aba === "politicas"
                ? TUTORIAL_CTX_CIENCIA_POLITICAS
                : null
        }
      />

      {erro ? (
        <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "rgba(232,64,37,0.12)", color: "#e84025", fontSize: 13 }}>
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
          <Loader2 className="app-lucide-spin" size={22} color="var(--brand-primary, #7c3aed)" aria-hidden style={{ verticalAlign: "middle", marginRight: 8 }} />
          Carregando…
        </div>
      ) : aba === "gerenciamento" && podeGerenciarPostagens ? (
        <GerenciamentoPostagens
          categoriasCom={categoriasCom}
          categoriasPol={categoriasPol}
          onDadosAlterados={() => void carregar()}
          buscaDeb={buscaDeb}
          modoHistorico={modoHistorico}
          idxMes={idxMesGer}
          mesesDisponiveis={mesesGer}
          filtroTipo={filtroTipoGer}
          filtroStatus={filtroStatusGer}
          onMesesCarrosselChange={handleMesesGerChange}
          onRegisterAbrirCriar={handleRegisterAbrirCriar}
        />
      ) : (
        <>
          <div
            role="tabpanel"
            id={`panel-rh-portal-${aba}`}
            aria-labelledby={`tab-rh-portal-${aba}`}
            tabIndex={0}
            style={{ marginTop: 4 }}
          >
            {aba === "comunicados" ? (
              <div>
                {comunicadoPinned ? (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Pin size={16} color="#b45309" aria-hidden />
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", fontFamily: FONT.body }}>Fixado</span>
                    </div>
                    <ComunicadoCard
                      titulo={comunicadoPinned.titulo}
                      corpo={comunicadoPinned.corpo}
                      categoria={comunicadoPinned.categoria}
                      imagemStoragePath={comunicadoPinned.imagem_storage_path}
                      anexoStoragePath={comunicadoPinned.anexo_storage_path}
                      anexoNome={comunicadoPinned.anexo_nome}
                      autorInfo={metaAutor(autorIdPostagem(comunicadoPinned))}
                      dataPublicacao={comunicadoPinned.published_at}
                      isNovo={!receipts.get(receiptKey("comunicado", comunicadoPinned.id))?.read_at}
                      onMarcarLido={() => void marcarLidoComunicado(comunicadoPinned.id)}
                      podeVerLidos={podeGerenciarPostagens}
                      onVerLidos={() =>
                        setModalLidos({
                          id: comunicadoPinned.id,
                          titulo: comunicadoPinned.titulo,
                          contentType: "comunicado",
                        })
                      }
                      cardShadow={cardShadow}
                      reacoes={
                        <BarraReacaoConteudoLigada
                          origem="rh_comunicado"
                          contentId={comunicadoPinned.id}
                          api={reacoesComunicado}
                        />
                      }
                    />
                  </div>
                ) : null}

                {comunicadosLista.length === 0 && !comunicadoPinned ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : comunicadosLista.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Nenhum outro comunicado neste filtro.
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {comunicadosLista.map((c) => {
                      const rec = userIdEfetivo ? receipts.get(receiptKey("comunicado", c.id)) : undefined;
                      const isNovoCard = !rec?.read_at;
                      return (
                        <li key={c.id}>
                          <ComunicadoCard
                            titulo={c.titulo}
                            corpo={c.corpo}
                            categoria={c.categoria}
                            imagemStoragePath={c.imagem_storage_path}
                            anexoStoragePath={c.anexo_storage_path}
                            anexoNome={c.anexo_nome}
                            autorInfo={metaAutor(autorIdPostagem(c))}
                            dataPublicacao={c.published_at}
                            isNovo={isNovoCard}
                            onMarcarLido={() => void marcarLidoComunicado(c.id)}
                            podeVerLidos={podeGerenciarPostagens}
                            onVerLidos={() =>
                              setModalLidos({ id: c.id, titulo: c.titulo, contentType: "comunicado" })
                            }
                            cardShadow={cardShadow}
                            reacoes={
                              <BarraReacaoConteudoLigada
                                origem="rh_comunicado"
                                contentId={c.id}
                                api={reacoesComunicado}
                              />
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : aba === "politicas" ? (
              <div>
                {documentosFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : (
                  <PortalRhDocumentosCards
                    rows={documentosFiltrados.map((d) => ({
                      id: d.id,
                      codigo: d.codigo ?? null,
                      versao: d.versao ?? null,
                      titulo: d.titulo,
                      tipo_documento: d.tipo_documento ?? null,
                      resumo: d.resumo ?? null,
                      aplicavel_a: d.aplicavel_a ?? null,
                      classificacao: d.classificacao ?? null,
                      published_at: d.published_at ?? null,
                      updated_at: d.updated_at,
                      requires_acknowledgment: d.requires_acknowledgment,
                      introducao: d.introducao,
                      categoriaLabel: d.categoria?.label ?? null,
                    }))}
                    cienciaPendenteIds={cienciaPendenteDocIds}
                    cienciaExigidaIds={cienciaExigidaDocIds}
                    cienciaRegistradaEm={cienciaRegistradaEm}
                    mostrarStatusCiencia={usuarioVeColunaCiencia}
                    podeVerCiencia={podeGerenciarPostagens}
                    onAbrir={(id) => void abrirDocumento(id)}
                    onVerCiencia={(row) =>
                      setModalLidos({ id: row.id, titulo: row.titulo, contentType: "documento" })
                    }
                  />
                )}
              </div>
            ) : (
              <div>
                {talksFiltrados.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    {buscaDeb
                      ? "Nenhum resultado para os termos pesquisados."
                      : "Sem dados para o período selecionado."}
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {talksFiltrados.map((tk) => {
                      const dataPub = tk.published_at;
                      return (
                        <li key={tk.id}>
                          <RhTalkCard
                            titulo={tk.titulo}
                            introducao={tk.introducao ?? tk.resumo}
                            numero={tk.numero}
                            autorInfo={metaAutor(autorIdPostagem(tk))}
                            dataPublicacao={dataPub}
                            onAbrirAta={() => setModalTalk(tk)}
                            cardShadow={cardShadow}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {modalDoc ? (
        documentoUsaModeloNormativo(modalDoc) ? (
          <ModalVisualizarDocumento
            codigo={modalDoc.codigo ?? null}
            versao={modalDoc.versao ?? null}
            titulo={modalDoc.titulo}
            tipoDocumento={modalDoc.tipo_documento ?? null}
            classificacao={modalDoc.classificacao ?? null}
            pdfPath={modalDoc.anexo_storage_path ?? modalDoc.storage_path}
            pdfNome={modalDoc.anexo_nome ?? null}
            exigeCiencia={documentoExigeCienciaDoUsuario(modalDoc, roleEfetivo)}
            jaCiente={Boolean(receipts.get(receiptKey("documento", modalDoc.id))?.acknowledged_at)}
            onClose={() => setModalDoc(null)}
            onCiente={() => void marcarLidoECienteDocumento(modalDoc.id)}
          />
        ) : (
          <ModalLerPolitica
            titulo={modalDoc.titulo}
            introducao={modalDoc.introducao}
            corpo={modalDoc.corpo}
            imagemPath={modalDoc.imagem_storage_path}
            anexoPath={modalDoc.anexo_storage_path ?? modalDoc.storage_path}
            anexoNome={modalDoc.anexo_nome}
            autorInfo={metaAutor(autorIdPostagem(modalDoc))}
            dataPublicacao={modalDoc.published_at ?? modalDoc.updated_at}
            aprovadorInfo={metaAutor(modalDoc.approved_by)}
            dataAprovacao={modalDoc.approved_at}
            temAprovador={Boolean(modalDoc.approved_by && modalDoc.approved_at)}
            exigeCiencia={documentoExigeCienciaDoUsuario(modalDoc, roleEfetivo)}
            jaCiente={Boolean(receipts.get(receiptKey("documento", modalDoc.id))?.acknowledged_at)}
            onClose={() => setModalDoc(null)}
            onLidoECiente={() => void marcarLidoECienteDocumento(modalDoc.id)}
          />
        )
      ) : null}

      {modalTalk ? (
        <ModalVerAta
          titulo={modalTalk.numero != null ? `RH Talk #${modalTalk.numero} — ${modalTalk.titulo}` : modalTalk.titulo}
          introducao={modalTalk.introducao ?? modalTalk.resumo}
          corpo={modalTalk.corpo ?? modalTalk.resumo}
          imagemPath={modalTalk.imagem_storage_path}
          anexoPath={modalTalk.anexo_storage_path ?? modalTalk.storage_path}
          anexoNome={modalTalk.anexo_nome}
          autorInfo={metaAutor(autorIdPostagem(modalTalk))}
          dataPublicacao={modalTalk.published_at ?? modalTalk.data_reuniao}
          onClose={() => setModalTalk(null)}
        />
      ) : null}

      {podeGerenciarPostagens ? (
        <ModalLidosPostagem
          open={Boolean(modalLidos)}
          titulo={modalLidos?.titulo ?? ""}
          contentType={modalLidos?.contentType ?? null}
          contentId={modalLidos?.id ?? null}
          onClose={() => setModalLidos(null)}
        />
      ) : null}

    </div>
  );
}
