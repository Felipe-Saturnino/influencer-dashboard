import type { PageKey, PermissaoValor, Role } from "../types";
import { getMenuItem } from "../constants/menu";

export type PermissaoAcoes = {
  criar: PermissaoValor;
  editar: PermissaoValor;
  excluir: PermissaoValor;
};

export type PermissoesAcoesMapa = Record<PageKey, PermissaoAcoes>;

/** Slugs de rotas especiais (fora do `PAGE_MAP`). */
export const ROUTE_SLUG_HOME = "Home";
export const ROUTE_SLUG_LOGIN = "Login";
export const ROUTE_SLUG_SEM_ACESSO = "SemAcesso";

/** Home, Configurações e Ajuda — acessíveis a qualquer perfil autenticado. */
export const PAGE_KEYS_UTILITY: PageKey[] = ["home", "configuracoes", "ajuda"];

export type AppRouteTabDef = {
  /** Chave interna do componente (ex.: `overview`, `conversao`). */
  tabId: string;
  /** Segmento URL — rótulo da aba sem espaços/acentos. */
  slug: string;
  label: string;
};

export type AppRouteTabAccess =
  | "always"
  | "portal_gerenciamento"
  | "informativos_gerenciamento"
  | "vagas_gerenciamento"
  | "vagas_candidaturas"
  | "galeria_upload"
  | "academy_gerenciamento"
  | "academy_configuracao";

export type AppRouteTabDefFull = AppRouteTabDef & {
  access: AppRouteTabAccess;
};

export type AppRouteDef = {
  pageKey: PageKey;
  pageSlug: string;
  label: string;
  tabs?: AppRouteTabDefFull[];
};

function page(label: string, pageKey: PageKey, pageSlug: string, tabs?: AppRouteTabDefFull[]): AppRouteDef {
  return { pageKey, pageSlug, label: label || (getMenuItem(pageKey)?.label ?? pageKey), tabs };
}

/** Catálogo canónico — ordem das abas = default quando a URL só traz a página. */
export const APP_ROUTE_CATALOG: AppRouteDef[] = [
  page("Home", "home", ROUTE_SLUG_HOME),
  page("Overview Influencer", "dash_overview_influencer", "OverviewInfluencer"),
  page("Overview Prestador", "dash_overview_prestador", "OverviewPrestador", [
    { tabId: "escala", slug: "Escala", label: "Escala", access: "always" },
    { tabId: "performance", slug: "Performance", label: "Performance", access: "always" },
  ]),
  page("Agenda", "agenda", "Agenda"),
  page("Resultados", "resultados", "Resultados"),
  page("Feedback", "feedback", "Feedback"),
  page("Influencers", "influencers", "Influencers"),
  page("Scout", "scout", "Scout"),
  page("Afiliados", "afiliados", "Afiliados"),
  page("Network", "afiliados_network", "Network"),
  page("Financeiro", "financeiro", "Financeiro"),
  page("Banca de Jogo", "banca_jogo", "BancaDeJogo"),
  page("Campanhas", "campanhas", "Campanhas"),
  page("Galeria de Fotos", "galeria_fotos", "GaleriaDeFotos", [
    { tabId: "galeria", slug: "Galeria", label: "Galeria", access: "always" },
    { tabId: "upload", slug: "Upload", label: "Upload", access: "galeria_upload" },
  ]),
  page("Overview Comercial", "comercial_overview", "OverviewComercial"),
  page("Pipeline B2B", "comercial_pipeline_b2b", "PipelineB2B", [
    { tabId: "todos", slug: "Todos", label: "Todos", access: "always" },
    { tabId: "disponiveis", slug: "Disponiveis", label: "Disponíveis", access: "always" },
    { tabId: "conexao", slug: "Conexao", label: "Conexão", access: "always" },
    { tabId: "negociacao", slug: "Negociacao", label: "Negociação", access: "always" },
    { tabId: "fechado", slug: "Fechado", label: "Fechado", access: "always" },
  ]),
  page("Gestão de Dealers", "gestao_dealers", "GestaoDeDealers"),
  page("Roteiro de Mesa", "roteiro_mesa", "RoteiroDeMesa"),
  page("Gestão de Escala", "rh_gestao_escala", "GestaoDeEscala"),
  page("Gestão de Staff", "rh_staff", "GestaoDeStaff"),
  page("Central de Denúncias", "rh_central_denuncias", "CentralDeDenuncias"),
  page("Solicitações", "rh_solicitacoes", "RhSolicitacoes"),
  page("Links e Materiais", "links_materiais", "LinksEMateriais"),
  page("Spin na Rede", "spin_na_rede", "SpinNaRede"),
  page("Gestão de Operadoras", "gestao_operadoras", "GestaoDeOperadoras"),
  page("Gestão de Estúdios", "gestao_mesas", "GestaoDeMesas"),
  page("Status Técnico", "status_tecnico", "StatusTecnico"),
  page("Configurações", "configuracoes", "Configuracoes"),
  page("Overview Spin", "mesas_spin", "OverviewSpin", [
    { tabId: "overview", slug: "Overview", label: "Overview", access: "always" },
    { tabId: "posicionamento", slug: "Posicionamento", label: "Posicionamento", access: "always" },
  ]),
  page("Streamers", "streamers", "Streamers", [
    { tabId: "overview", slug: "Overview", label: "Overview", access: "always" },
    { tabId: "conversao", slug: "Conversao", label: "Conversão", access: "always" },
    { tabId: "financeiro", slug: "Financeiro", label: "Financeiro", access: "always" },
  ]),
  page("Mídias Sociais", "dash_midias_sociais", "MidiasSociais", [
    { tabId: "overview", slug: "Overview", label: "Overview", access: "always" },
    { tabId: "conversao", slug: "Conversao", label: "Conversão", access: "always" },
    { tabId: "impulsionamento", slug: "Impulsionamento", label: "Impulsionamento", access: "always" },
    { tabId: "alcance", slug: "Alcance", label: "Alcance", access: "always" },
  ]),
  page("Gestão de Links", "gestao_links", "GestaoDeLinks", [
    { tabId: "pendentes", slug: "Pendentes", label: "Pendentes", access: "always" },
    { tabId: "mapeados", slug: "Mapeados", label: "Mapeados", access: "always" },
    { tabId: "ignorados", slug: "Ignorados", label: "Ignorados", access: "always" },
  ]),
  page("Central de Notificações", "central_notificacoes", "CentralDeNotificacoes", [
    { tabId: "troca", slug: "TrocaDeDealer", label: "Troca de dealer", access: "always" },
    { tabId: "feedback", slug: "Feedbacks", label: "Feedbacks", access: "always" },
    { tabId: "campanha_roteiro", slug: "Campanhas", label: "Campanhas", access: "always" },
    { tabId: "roteiro_mesa", slug: "Roteiros", label: "Roteiros", access: "always" },
  ]),
  page("Figurinos", "rh_figurinos", "Figurinos", [
    { tabId: "available", slug: "Disponiveis", label: "Disponíveis", access: "always" },
    { tabId: "borrowed", slug: "Emprestada", label: "Emprestada", access: "always" },
    { tabId: "maintenance", slug: "Manutencao", label: "Manutenção", access: "always" },
    { tabId: "discarded", slug: "Descartada", label: "Descartada", access: "always" },
  ]),
  page("Calendário", "rh_calendario", "Calendario", [
    { tabId: "compromissos", slug: "Compromissos", label: "Compromissos", access: "always" },
    { tabId: "presenca", slug: "ControleDePresenca", label: "Controle de Presença", access: "always" },
  ]),
  page("Marketplace", "escala_marketplace_turnos", "Marketplace", [
    { tabId: "todas", slug: "TodasAsOfertas", label: "Todas as Ofertas", access: "always" },
    { tabId: "minhas", slug: "MinhasOfertas", label: "Minhas Ofertas", access: "always" },
  ]),
  page("Solicitações", "escala_solicitacoes", "Solicitacoes", [
    { tabId: "aberto", slug: "SolicitacoesEmAberto", label: "Solicitações em Aberto", access: "always" },
    { tabId: "arquivadas", slug: "SolicitacoesArquivadas", label: "Solicitações Arquivadas", access: "always" },
  ]),
  page("Gestão de Prestadores", "rh_funcionarios", "GestaoDePrestadores", [
    { tabId: "headcount", slug: "HeadCount", label: "Head Count", access: "always" },
    { tabId: "acoes_rh", slug: "AcoesDeRH", label: "Ações de RH", access: "always" },
    { tabId: "anotacoes", slug: "AnotacoesRH", label: "Anotações RH", access: "always" },
  ]),
  page("Dados de Cadastro", "rh_dados_cadastro", "DadosDeCadastro", [
    { tabId: "trabalho", slug: "HistoricoDeTrabalho", label: "Histórico de trabalho", access: "always" },
    { tabId: "cadastral", slug: "DadosCadastrais", label: "Dados cadastrais", access: "always" },
    { tabId: "documentos", slug: "Documentos", label: "Documentos", access: "always" },
    { tabId: "formacao", slug: "FormacaoCompetencias", label: "Formação e Competências", access: "always" },
    { tabId: "experiencia", slug: "ExperienciaProfissional", label: "Experiência Profissional", access: "always" },
    { tabId: "historico", slug: "Historico", label: "Histórico", access: "always" },
  ]),
  page("Organograma", "rh_organograma", "Organograma", [
    { tabId: "visual", slug: "Visualizacao", label: "Visualização", access: "always" },
    { tabId: "gerenciar", slug: "Gerenciamento", label: "Gerenciamento", access: "always" },
  ]),
  page("Vagas", "rh_vagas", "Vagas", [
    { tabId: "abertas", slug: "VagasAbertas", label: "Vagas Abertas", access: "always" },
    { tabId: "em_andamento", slug: "VagasEmAndamento", label: "Vagas em Andamento", access: "always" },
    {
      tabId: "gerenciamento",
      slug: "GerenciamentoDeVagas",
      label: "Gerenciamento de Vagas",
      access: "vagas_gerenciamento",
    },
    { tabId: "candidaturas", slug: "Candidaturas", label: "Candidaturas", access: "vagas_candidaturas" },
  ]),
  page("Playbook Influencers", "playbook_influencers", "PlaybookInfluencers", [
    { tabId: "posicionamento", slug: "Posicionamento", label: "Posicionamento", access: "always" },
    { tabId: "dealers", slug: "Dealers", label: "Dealers", access: "always" },
    { tabId: "agendamento", slug: "Agendamento", label: "Agendamento", access: "always" },
    { tabId: "jogos", slug: "Jogos", label: "Jogos", access: "always" },
    { tabId: "blackjack", slug: "SideBets", label: "Side Bets", access: "always" },
    { tabId: "tecnico", slug: "SituacoesTecnicas", label: "Situações Técnicas", access: "always" },
    { tabId: "funfacts", slug: "FunFacts", label: "Fun Facts", access: "always" },
    { tabId: "acesso", slug: "AcessoAosJogos", label: "Acesso aos Jogos", access: "always" },
  ]),
  page("Portal de RH", "rh_portal", "PortalDeRH", [
    { tabId: "comunicados", slug: "Comunicados", label: "Comunicados", access: "always" },
    { tabId: "politicas", slug: "PoliticasENormativas", label: "Políticas e normativas", access: "always" },
    { tabId: "rhtalks", slug: "RHTalks", label: "RH Talks", access: "always" },
    {
      tabId: "gerenciamento",
      slug: "GerenciamentoDePostagens",
      label: "Gerenciamento de Postagens",
      access: "portal_gerenciamento",
    },
  ]),
  page("Performance Hub", "academy_performance_hub", "PerformanceHub", [
    { tabId: "avaliacoes", slug: "Avaliacoes", label: "Avaliações", access: "always" },
    {
      tabId: "gerenciamento",
      slug: "Gerenciamento",
      label: "Gerenciamento",
      access: "academy_gerenciamento",
    },
    {
      tabId: "configuracao",
      slug: "Configuracao",
      label: "Configuração",
      access: "academy_configuracao",
    },
  ]),
  page("Informativos", "informativos", "Informativos", [
    { tabId: "informativos", slug: "Informativos", label: "Informativos", access: "always" },
    {
      tabId: "gerenciamento",
      slug: "GerenciamentoDeInformativos",
      label: "Gerenciamento de Informativos",
      access: "informativos_gerenciamento",
    },
  ]),
  page("Gestão de Usuários", "gestao_usuarios", "GestaoDeUsuarios", [
    { tabId: "usuarios", slug: "Usuarios", label: "Usuários", access: "always" },
    { tabId: "permissoes", slug: "Permissoes", label: "Permissões", access: "always" },
    { tabId: "escopos", slug: "Escopos", label: "Escopos", access: "always" },
  ]),
  page("Ajuda", "ajuda", "Ajuda", [
    { tabId: "conheca", slug: "ConhecaAPlataforma", label: "Conheça a Plataforma", access: "always" },
    { tabId: "troubleshooting", slug: "Troubleshooting", label: "Troubleshooting", access: "always" },
    { tabId: "glossario", slug: "Glossario", label: "Glossário", access: "always" },
  ]),
];

const BY_PAGE_KEY = new Map<PageKey, AppRouteDef>(
  APP_ROUTE_CATALOG.map((r) => [r.pageKey, r]),
);
const BY_PAGE_SLUG = new Map<string, AppRouteDef>(
  APP_ROUTE_CATALOG.map((r) => [r.pageSlug.toLowerCase(), r]),
);

export function getAppRouteByPageKey(pageKey: PageKey): AppRouteDef | undefined {
  return BY_PAGE_KEY.get(pageKey);
}

export function getAppRouteByPageSlug(pageSlug: string): AppRouteDef | undefined {
  return BY_PAGE_SLUG.get(pageSlug.trim().toLowerCase());
}

/** Destino de navegação interna a partir de `PageKey` + slug opcional de aba. */
export function buildParsedAppTarget(pageKey: PageKey, tabSlug?: string | null): ParsedAppPath {
  const route = getAppRouteByPageKey(pageKey);
  if (!route) return { kind: "not_found" };
  if (!route.tabs?.length) {
    return { kind: "app", pageKey, tabId: null, tabSlug: null };
  }
  if (tabSlug) {
    const tab = route.tabs.find((t) => t.slug.toLowerCase() === tabSlug.trim().toLowerCase());
    if (!tab) return { kind: "not_found" };
    return { kind: "app", pageKey, tabId: tab.tabId, tabSlug: tab.slug };
  }
  const first = route.tabs[0];
  return { kind: "app", pageKey, tabId: first.tabId, tabSlug: first.slug };
}

export function buildSemAcessoPath(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${prefix}/${ROUTE_SLUG_SEM_ACESSO}`;
}

export function buildLoginPath(): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${prefix}/${ROUTE_SLUG_LOGIN}`;
}

export type ParsedAppPath =
  | { kind: "empty" }
  | { kind: "special"; special: "home" | "login" | "sem_acesso" }
  | { kind: "app"; pageKey: PageKey; tabId: string | null; tabSlug: string | null }
  | { kind: "not_found" };

function normalizePathname(pathname: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") || "";
  let p = pathname.replace(/\/+$/, "") || "/";
  if (base && base !== "/" && p.startsWith(base)) {
    p = p.slice(base.length) || "/";
  }
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

/** Compara caminhos da app ignorando barra final e prefixo `BASE_URL`. */
export function areAppPathsEqual(a: string, b: string): boolean {
  return normalizePathname(a) === normalizePathname(b);
}

export function parseAppPathname(pathname: string): ParsedAppPath {
  const p = normalizePathname(pathname);
  if (p === "/" || p === "") return { kind: "empty" };

  const segments = p.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "empty" };

  const [seg1, seg2] = segments;
  const s1 = seg1 ?? "";

  if (s1.toLowerCase() === ROUTE_SLUG_HOME.toLowerCase()) {
    return segments.length === 1 ? { kind: "special", special: "home" } : { kind: "not_found" };
  }
  if (s1.toLowerCase() === ROUTE_SLUG_LOGIN.toLowerCase()) {
    return segments.length === 1 ? { kind: "special", special: "login" } : { kind: "not_found" };
  }
  if (s1.toLowerCase() === ROUTE_SLUG_SEM_ACESSO.toLowerCase()) {
    return segments.length === 1 ? { kind: "special", special: "sem_acesso" } : { kind: "not_found" };
  }

  const route = getAppRouteByPageSlug(s1);
  if (!route) return { kind: "not_found" };

  if (!route.tabs?.length) {
    return segments.length === 1
      ? { kind: "app", pageKey: route.pageKey, tabId: null, tabSlug: null }
      : { kind: "not_found" };
  }

  if (segments.length === 1) {
    const first = route.tabs[0];
    return {
      kind: "app",
      pageKey: route.pageKey,
      tabId: first.tabId,
      tabSlug: first.slug,
    };
  }

  if (segments.length === 2 && seg2) {
    const tab = route.tabs.find((t) => t.slug.toLowerCase() === seg2.toLowerCase());
    if (!tab) return { kind: "not_found" };
    return { kind: "app", pageKey: route.pageKey, tabId: tab.tabId, tabSlug: tab.slug };
  }

  return { kind: "not_found" };
}

export function buildAppPath(pageKey: PageKey, tabSlug?: string | null): string {
  const route = getAppRouteByPageKey(pageKey);
  if (!route) return `/${ROUTE_SLUG_HOME}`;

  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");

  if (!route.tabs?.length) {
    return `${prefix}/${route.pageSlug}`;
  }

  const tab =
    (tabSlug
      ? route.tabs.find((t) => t.slug === tabSlug) ??
        route.tabs.find((t) => t.slug.toLowerCase() === tabSlug.toLowerCase())
      : undefined) ?? route.tabs[0];

  if (!tab) return `${prefix}/${route.pageSlug}`;
  return `${prefix}/${route.pageSlug}/${tab.slug}`;
}

export function podeVerPaginaNasPermissoes(cv: PermissaoValor | null | undefined): boolean {
  return cv === "sim" || cv === "proprios";
}

function podeExecutarPerm(val: PermissaoValor | null | undefined): boolean {
  return val === "sim" || val === "proprios";
}

export function isTabAllowedForUser(
  pageKey: PageKey,
  tab: AppRouteTabDefFull,
  role: Role | undefined,
  acoes: PermissoesAcoesMapa,
): boolean {
  if (role === "admin") return true;
  switch (tab.access) {
    case "always":
      return true;
    case "portal_gerenciamento":
      return podeExecutarPerm(acoes.rh_portal?.editar ?? null);
    case "informativos_gerenciamento":
      return podeExecutarPerm(acoes.informativos?.editar ?? null);
    case "vagas_gerenciamento": {
      const v = acoes.rh_vagas;
      return podeExecutarPerm(v?.criar ?? null) || podeExecutarPerm(v?.excluir ?? null);
    }
    case "vagas_candidaturas":
      return podeExecutarPerm(acoes.rh_vagas?.criar ?? null);
    case "galeria_upload":
      return podeExecutarPerm(acoes.galeria_fotos?.criar ?? null);
    case "academy_gerenciamento":
      return podeExecutarPerm(acoes.academy_performance_hub?.editar ?? null);
    case "academy_configuracao":
      return podeExecutarPerm(acoes.academy_performance_hub?.criar ?? null);
    default:
      return true;
  }
}

export type RouteAccessResult =
  | { ok: true; pageKey: PageKey; tabId: string | null; tabSlug: string | null }
  | { ok: false; reason: "not_found" | "forbidden" };

export function resolveRouteAccess(
  parsed: ParsedAppPath,
  role: Role | undefined,
  permissions: Record<PageKey, PermissaoValor | null | undefined>,
  acoes: PermissoesAcoesMapa,
): RouteAccessResult {
  if (parsed.kind === "not_found" || parsed.kind === "empty") {
    return { ok: false, reason: "not_found" };
  }
  if (parsed.kind === "special") {
    if (parsed.special === "sem_acesso") return { ok: true, pageKey: "home", tabId: null, tabSlug: null };
    if (parsed.special === "home") {
      if (role) {
        return { ok: true, pageKey: "home", tabId: null, tabSlug: null };
      }
      return { ok: false, reason: "forbidden" };
    }
    return { ok: true, pageKey: "home", tabId: null, tabSlug: null };
  }

  const route = getAppRouteByPageKey(parsed.pageKey);

  if (role && PAGE_KEYS_UTILITY.includes(parsed.pageKey)) {
    if (parsed.tabId && route?.tabs) {
      const tabDef = route.tabs.find((t) => t.tabId === parsed.tabId);
      if (!tabDef) return { ok: false, reason: "not_found" };
      if (!isTabAllowedForUser(parsed.pageKey, tabDef, role, acoes)) {
        return { ok: false, reason: "forbidden" };
      }
    }
    return {
      ok: true,
      pageKey: parsed.pageKey,
      tabId: parsed.tabId,
      tabSlug: parsed.tabSlug,
    };
  }

  const cv = permissions[parsed.pageKey];
  if (role !== "admin" && !podeVerPaginaNasPermissoes(cv)) {
    return { ok: false, reason: "forbidden" };
  }

  if (parsed.tabId && route?.tabs) {
    const tabDef = route.tabs.find((t) => t.tabId === parsed.tabId);
    if (!tabDef) return { ok: false, reason: "not_found" };
    if (!isTabAllowedForUser(parsed.pageKey, tabDef, role, acoes)) {
      return { ok: false, reason: "forbidden" };
    }
  }

  return {
    ok: true,
    pageKey: parsed.pageKey,
    tabId: parsed.tabId,
    tabSlug: parsed.tabSlug,
  };
}

export const PENDING_RETURN_PATH_KEY = "app_pending_return_path";
export const SEM_ACESSO_REASON_KEY = "app_sem_acesso_reason";
export const REVISAO_GATE_BANNER_KEY = "app_revisao_gate_banner";

export type SemAcessoReason = "not_found" | "forbidden";
