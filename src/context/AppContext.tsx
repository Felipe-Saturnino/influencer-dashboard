/* eslint-disable react-refresh/only-export-components -- Provider + hook useApp no mesmo módulo (padrão do projeto). */
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { User, PageKey, PermissaoValor, Role } from "../types";
import { LIGHT_THEME, DARK_THEME, Theme } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { validarBrandguide, cssDerivadasBrand, type BrandValidated } from "../lib/brandguideValidation";
import {
  areAppPathsEqual,
  buildAppPath,
  buildLoginPath,
  buildParsedAppTarget,
  buildSemAcessoPath,
  parseAppPathname,
  resolveRouteAccess,
  PENDING_RETURN_PATH_KEY,
  SEM_ACESSO_REASON_KEY,
  type PermissaoAcoes,
  type PermissoesAcoesMapa,
} from "../lib/appRoutes";
import {
  ROLES_SEM_RESTRICAO_ESCOPO,
  ROLES_OVERVIEW_INFLUENCER_PADRAO_SIM,
  roleParidadeInfluencer,
} from "../lib/staffRoles";

// Todas as PageKeys existentes — usadas para liberar tudo ao admin
const ALL_PAGE_KEYS: PageKey[] = [
  "home",
  "mesas_spin", "streamers", "dash_overview_influencer", "dash_midias_sociais",
  "agenda", "resultados", "feedback",
  "influencers", "scout", "afiliados", "afiliados_network", "financeiro", "banca_jogo", "gestao_links", "campanhas", "gestao_dealers", "central_notificacoes",
  "gestao_usuarios", "gestao_operadoras", "gestao_mesas", "status_tecnico",
  "roteiro_mesa",
  "playbook_influencers",
  "links_materiais",
  "spin_na_rede",
  "rh_figurinos",
  "rh_funcionarios",
  "rh_dados_cadastro",
  "rh_organograma",
  "rh_vagas",
  "rh_gestao_escala",
  "rh_staff",
  "rh_calendario",
  "escala_marketplace_turnos",
  "escala_solicitacoes",
  "rh_central_denuncias",
  "rh_portal",
  "informativos",
  "configuracoes", "ajuda",
];

/** Home e páginas gerais: só `role_permissions`; sem interseção com `gestor_tipo_pages` nem `prestador_tipo_pages`. */
const PAGES_SEM_MATRIZ_ESCOPO_TIPO = new Set<PageKey>(["home", "configuracoes", "ajuda"]);

// Tipo do mapa de permissões de visualização
export type PermissoesMapa = Record<PageKey, PermissaoValor>;

// Escopos visíveis
// semRestricaoEscopo=true (admin): vê todos influencers e operadoras no produto
// semRestricaoEscopo=false: influencers/operadoras conforme listas; gestor vê todas as operadoras (como executivo), opcionalmente limita influencers
export interface EscoposVisiveis {
  influencersVisiveis: string[];  // UUIDs
  operadorasVisiveis:  string[];  // slugs
  semRestricaoEscopo?: boolean;   // true = só admin (dados globais)
  vêTodosInfluencers?: boolean;   // true = executivo, perfis em ROLES_STAFF_APENAS_PERMISSOES, ou gestor sem influencers explícitos em user_scopes
  /** Tipos de gestor (user_scopes gestor_tipo); usado para filtrar menu vs gestor_tipo_pages */
  gestorTiposVisiveis?: string[];
  /** Áreas de prestador (user_scopes prestador_tipo); menu vs prestador_tipo_pages */
  prestadorTiposVisiveis?: string[];
}

/** Brand da operadora (operador): logo, fonte, fundo e template de Home */
export interface OperadoraBrand {
  nome:           string | null;
  logo_url:       string | null;
  font_url:       string | null;
  brand_bg:       string | null;
  /** Chave do template de Home (`default` / null = Home Operador Padrão). */
  home_template:  string | null;
}

export type LayoutView = "app" | "sem_acesso";

interface AppContextValue {
  // Auth
  user:        User | null;
  setUser:     (u: User | null) => void;
  checking:    boolean;
  routeReady:  boolean;
  // Navegação (página ativa no layout)
  activePage:  string;
  activeTabSlug: string | null;
  layoutView: LayoutView;
  setActivePage: (page: string) => void;
  navigateTo: (pageKey: PageKey, tabSlug?: string | null, options?: { replace?: boolean }) => void;
  applyPathFromLocation: (options?: { replace?: boolean }) => void;
  goToSemAcesso: (reason: "not_found" | "forbidden", options?: { replace?: boolean }) => void;
  // Permissões de menu
  permissions: PermissoesMapa;
  permissionsAcoes: PermissoesAcoesMapa;
  setPermissions: (p: PermissoesMapa) => void;
  // Escopos para segregação de dados (Etapa 7)
  escoposVisiveis: EscoposVisiveis;
  /** [] = sem restrição. true se pode ver o influencer. */
  podeVerInfluencer: (id: string) => boolean;
  /** [] = sem restrição. true se pode ver a operadora. */
  podeVerOperadora: (slug: string) => boolean;
  /** Brand da operadora (operador): logo_url para Sidebar; cores via --brand-* */
  operadoraBrand: OperadoraBrand | null;
  /** Operador: true após carregar cadastro da operadora do escopo (template de Home + brand). */
  operadoraHomeReady: boolean;
  // Theme
  theme:    Theme;
  isDark:   boolean;
  setIsDark:(v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const ESCOPOS_VAZIOS: EscoposVisiveis = { influencersVisiveis: [], operadorasVisiveis: [], semRestricaoEscopo: false };

const DEFAULT_FONT_FAMILY = "'Inter', 'Helvetica Neue', Arial, sans-serif";

/** Cores extras de gráficos / semântica — não vêm da operadora. */
const CHART_SEMANTIC = {
  extra1: "#1e36f8",
  extra2: "#22c55e",
  extra3: "#f59e0b",
  extra4: "#e84025",
} as const;

/** Injeta tokens Opção C + aliases legados (`--brand-primary` = `--brand-action`, etc.). */
function injectBrandCss(validated: BrandValidated) {
  const root = document.documentElement.style;
  const der = cssDerivadasBrand(validated);
  Object.entries(der).forEach(([k, v]) => root.setProperty(k, v));
  root.setProperty("--brand-action", validated.action);
  root.setProperty("--brand-contrast", validated.contrast);
  root.setProperty("--brand-bg", validated.bg);
  root.setProperty("--brand-text", validated.text);
  root.setProperty("--brand-primary", validated.action);
  root.setProperty("--brand-secondary", validated.contrast);
  root.setProperty("--brand-accent", validated.contrast);
  root.setProperty("--brand-background", validated.bg);
  const iconMix = der["--brand-icon-color"]!;
  root.setProperty("--brand-icon-color", iconMix);
  root.setProperty("--brand-icon", iconMix);
  (Object.keys(CHART_SEMANTIC) as (keyof typeof CHART_SEMANTIC)[]).forEach((k) => {
    root.setProperty(`--brand-${k}`, CHART_SEMANTIC[k]);
  });
  root.setProperty("--brand-danger", CHART_SEMANTIC.extra4);
  root.setProperty("--brand-success", CHART_SEMANTIC.extra2);
}

/** Reseta para paleta Spin validada (usuário não operador ou sem brand). */
function aplicarBrandguideReset() {
  injectBrandCss(validarBrandguide({}));
}

type OperadoraBrandRow = {
  brand_action?: string | null;
  brand_contrast?: string | null;
  brand_bg?: string | null;
  brand_text?: string | null;
  logo_url?: string | null;
};

function aplicarBrandguideOperadora(data: OperadoraBrandRow | null | undefined) {
  const validated = validarBrandguide({
    action: data?.brand_action,
    contrast: data?.brand_contrast,
    bg: data?.brand_bg,
    text: data?.brand_text,
  });
  if (validated.warnings.length) console.warn("[brandguide]", validated.warnings);
  injectBrandCss(validated);
}

// ─── Carrega escopos visíveis por role e user_scopes (Etapa 7) ─────────────────
async function carregarEscoposVisiveis(
  userId: string,
  role: Role
): Promise<EscoposVisiveis> {
  if (role === "admin") {
    return { influencersVisiveis: [], operadorasVisiveis: [], semRestricaoEscopo: true };
  }

  if (role === "gestor") {
    const { data: scopes } = await supabase
      .from("user_scopes")
      .select("scope_type, scope_ref")
      .eq("user_id", userId);
    const lista = scopes ?? [];
    const gestorTiposVisiveis = lista
      .filter((s) => s.scope_type === "gestor_tipo")
      .map((s) => s.scope_ref)
      .filter(Boolean);
    const influencersVisiveis = lista
      .filter((s) => s.scope_type === "influencer")
      .map((s) => s.scope_ref)
      .filter(Boolean);
    return {
      influencersVisiveis,
      /** Gestor: mesma visão global de operadoras que executivo (sem segregação por escopo operadora). */
      operadorasVisiveis: [],
      semRestricaoEscopo: false,
      gestorTiposVisiveis,
      /** Sem influencers explícitos no cadastro: mantém visão ampla de influencers nos dashboards (com filtro por operadora). */
      vêTodosInfluencers: influencersVisiveis.length === 0,
    };
  }

  if (role === "prestador") {
    const { data: scopes } = await supabase
      .from("user_scopes")
      .select("scope_type, scope_ref")
      .eq("user_id", userId);
    const lista = scopes ?? [];
    const prestadorTiposVisiveis = lista
      .filter((s) => s.scope_type === "prestador_tipo")
      .map((s) => s.scope_ref)
      .filter(Boolean);
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: true,
      prestadorTiposVisiveis,
    };
  }

  const { data: scopes } = await supabase
    .from("user_scopes")
    .select("scope_type, scope_ref")
    .eq("user_id", userId);

  const lista = scopes ?? [];

  if (roleParidadeInfluencer(role)) {
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref);
    return { influencersVisiveis: [userId], operadorasVisiveis, semRestricaoEscopo: false };
  }

  // Executivo, Investidor e staff Spin: só role_permissions — sem user_scopes operadora/influencer.
  if (ROLES_SEM_RESTRICAO_ESCOPO.includes(role)) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: true,
      vêTodosInfluencers: true,
    };
  }

  // Operador: vê TODOS os influencers, escopo só para operadoras
  if (role === "operador") {
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref)
      .sort((a, b) => (a ?? "").localeCompare(b ?? ""));
    return { influencersVisiveis: [], operadorasVisiveis, semRestricaoEscopo: false, vêTodosInfluencers: true };
  }

  if (role === "agencia") {
    const pares = lista.filter((s) => s.scope_type === "agencia_par");
    const infIds = new Set<string>();
    const opSlugs = new Set<string>();
    pares.forEach((s) => {
      const [infId, opSlug] = s.scope_ref.split(":");
      if (infId) infIds.add(infId);
      if (opSlug) opSlugs.add(opSlug);
    });
    return {
      influencersVisiveis: [...infIds],
      operadorasVisiveis: [...opSlugs],
      semRestricaoEscopo: false,
    };
  }

  return { ...ESCOPOS_VAZIOS, semRestricaoEscopo: false };
}

// ─── Carrega can_view de todas as páginas para o role do usuário ──────────────
// Para operador: intersecta com operadora_pages (páginas liberadas por operadora)
async function carregarPermissoes(
  role: User["role"],
  options?: {
    operadorasVisiveis?: string[];
    gestorTiposVisiveis?: string[];
    prestadorTiposVisiveis?: string[];
  }
): Promise<PermissoesMapa> {
  const operadorasVisiveis = options?.operadorasVisiveis;
  const gestorTiposVisiveis = options?.gestorTiposVisiveis;
  const prestadorTiposVisiveis = options?.prestadorTiposVisiveis;

  if (role === "admin") {
    return Object.fromEntries(
      ALL_PAGE_KEYS.map((k) => [k, "sim" as PermissaoValor])
    ) as PermissoesMapa;
  }

  const { data } = await supabase
    .from("role_permissions")
    .select("page_key, can_view")
    .eq("role", role);

  // Monta mapa — páginas sem registro ficam com null (= bloqueado no menu)
  const mapa = Object.fromEntries(
    ALL_PAGE_KEYS.map((k) => [k, null as PermissaoValor])
  ) as PermissoesMapa;

  (data || []).forEach((r) => {
    if (r.page_key in mapa) {
      mapa[r.page_key as PageKey] = r.can_view as PermissaoValor;
    }
  });

  // Overview Influencer: padrão "proprios" para influencer e agencia (único dash para eles)
  if (mapa.dash_overview_influencer === null && (roleParidadeInfluencer(role) || role === "agencia")) {
    mapa.dash_overview_influencer = "proprios";
  }
  if (mapa.dash_overview_influencer === null && ROLES_OVERVIEW_INFLUENCER_PADRAO_SIM.includes(role)) {
    mapa.dash_overview_influencer = "sim";
  }

  // Operador: só vê páginas que estão em operadora_pages para suas operadoras
  if (role === "operador") {
    if (!operadorasVisiveis || operadorasVisiveis.length === 0) {
      ALL_PAGE_KEYS.forEach((k) => { mapa[k] = "nao"; });
    } else {
      const { data: opPages } = await supabase
        .from("operadora_pages")
        .select("page_key")
        .in("operadora_slug", operadorasVisiveis);
      const pagesPermitidas = new Set((opPages ?? []).map((r) => r.page_key));
      ALL_PAGE_KEYS.forEach((k) => {
        const cv = mapa[k];
        if (cv === "sim" || cv === "proprios") {
          if (!pagesPermitidas.has(k)) mapa[k] = "nao";
        }
      });
    }
  }

  // Gestor: Ver efetivo = role_permissions ∩ união(gestor_tipo_pages dos tipos do utilizador).
  // Tipos de gestor são obrigatórios no cadastro; sem tipos, páginas operacionais ficam bloqueadas.
  // home / configuracoes / ajuda: só role_permissions (fora da matriz da aba Gestores — ver PAGES_SEM_MATRIZ_ESCOPO_TIPO).
  if (role === "gestor") {
    if (!gestorTiposVisiveis || gestorTiposVisiveis.length === 0) {
      ALL_PAGE_KEYS.forEach((k) => {
        if (!PAGES_SEM_MATRIZ_ESCOPO_TIPO.has(k)) mapa[k] = "nao";
      });
    } else {
      const { data: gtPages } = await supabase
        .from("gestor_tipo_pages")
        .select("page_key")
        .in("gestor_tipo_slug", gestorTiposVisiveis);
      const pagesPermitidas = new Set((gtPages ?? []).map((r) => r.page_key));
      ALL_PAGE_KEYS.forEach((k) => {
        if (PAGES_SEM_MATRIZ_ESCOPO_TIPO.has(k)) return;
        const cv = mapa[k];
        if (cv === "sim" || cv === "proprios") {
          if (!pagesPermitidas.has(k)) mapa[k] = "nao";
        }
      });
    }
  }

  // Prestador: Ver efetivo = role_permissions ∩ união(prestador_tipo_pages das áreas do utilizador).
  // Áreas obrigatórias no cadastro; sem áreas, páginas operacionais bloqueadas.
  // home / configuracoes / ajuda: só role_permissions (fora da aba Prestadores).
  if (role === "prestador") {
    if (!prestadorTiposVisiveis || prestadorTiposVisiveis.length === 0) {
      ALL_PAGE_KEYS.forEach((k) => {
        if (!PAGES_SEM_MATRIZ_ESCOPO_TIPO.has(k)) mapa[k] = "nao";
      });
    } else {
      const { data: ptPages } = await supabase
        .from("prestador_tipo_pages")
        .select("page_key")
        .in("prestador_tipo_slug", prestadorTiposVisiveis);
      const pagesPermitidas = new Set((ptPages ?? []).map((r) => r.page_key));
      ALL_PAGE_KEYS.forEach((k) => {
        if (PAGES_SEM_MATRIZ_ESCOPO_TIPO.has(k)) return;
        const cv = mapa[k];
        if (cv === "sim" || cv === "proprios") {
          if (!pagesPermitidas.has(k)) mapa[k] = "nao";
        }
      });
    }
  }

  return mapa;
}

function syncHistory(path: string, replace: boolean) {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
}

function emptyAcoesMapa(): PermissoesAcoesMapa {
  return Object.fromEntries(
    ALL_PAGE_KEYS.map((k) => [k, { criar: null, editar: null, excluir: null } satisfies PermissaoAcoes]),
  ) as PermissoesAcoesMapa;
}

async function carregarPermissoesAcoes(role: User["role"]): Promise<PermissoesAcoesMapa> {
  if (role === "admin") {
    return Object.fromEntries(
      ALL_PAGE_KEYS.map((k) => [k, { criar: "sim", editar: "sim", excluir: "sim" } satisfies PermissaoAcoes]),
    ) as PermissoesAcoesMapa;
  }

  const mapa = emptyAcoesMapa();
  const { data } = await supabase
    .from("role_permissions")
    .select("page_key, can_criar, can_editar, can_excluir")
    .eq("role", role);

  (data || []).forEach((r) => {
    if (r.page_key in mapa) {
      mapa[r.page_key as PageKey] = {
        criar: (r.can_criar as PermissaoValor) ?? null,
        editar: (r.can_editar as PermissaoValor) ?? null,
        excluir: (r.can_excluir as PermissaoValor) ?? null,
      };
    }
  });

  return mapa;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,           setUserState]    = useState<User | null>(null);
  const [checking,       setChecking]    = useState(true);
  const [routeReady,     setRouteReady]   = useState(false);
  const [isDark,         setIsDark]      = useState(false);
  const [activePage,     setActivePageState]   = useState("home");
  const [activeTabSlug,  setActiveTabSlug] = useState<string | null>(null);
  const [layoutView,     setLayoutView]   = useState<LayoutView>("app");
  const [permissions,    setPermissions]  = useState<PermissoesMapa>(
    Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
  );
  const [permissionsAcoes, setPermissionsAcoes] = useState<PermissoesAcoesMapa>(emptyAcoesMapa);
  const [escoposVisiveis, setEscoposVisiveis] = useState<EscoposVisiveis>(ESCOPOS_VAZIOS);

  /** Refs síncronos — evitam checar permissões stale logo após `setPermissions` (antes do re-render). */
  const userRef = useRef<User | null>(null);
  const permissionsRef = useRef(permissions);
  const permissionsAcoesRef = useRef(permissionsAcoes);
  const activePageRef = useRef(activePage);
  const activeTabSlugRef = useRef(activeTabSlug);
  const layoutViewRef = useRef(layoutView);
  userRef.current = user;
  permissionsRef.current = permissions;
  permissionsAcoesRef.current = permissionsAcoes;
  activePageRef.current = activePage;
  activeTabSlugRef.current = activeTabSlug;
  layoutViewRef.current = layoutView;

  function syncAuthRefs(
    u: User | null,
    perms: PermissoesMapa,
    acoes: PermissoesAcoesMapa,
  ) {
    userRef.current = u;
    permissionsRef.current = perms;
    permissionsAcoesRef.current = acoes;
  }

  const goToSemAcesso = useCallback((reason: "not_found" | "forbidden", options?: { replace?: boolean }) => {
    sessionStorage.setItem(SEM_ACESSO_REASON_KEY, reason);
    setLayoutView("sem_acesso");
    syncHistory(buildSemAcessoPath(), options?.replace ?? false);
  }, []);

  const navigateTo = useCallback(
    (pageKey: PageKey, tabSlug?: string | null, options?: { replace?: boolean }) => {
      const u = userRef.current;
      if (!u) return;
      const parsed = buildParsedAppTarget(pageKey, tabSlug);
      const access = resolveRouteAccess(
        parsed,
        u.role,
        permissionsRef.current,
        permissionsAcoesRef.current,
      );
      if (!access.ok) {
        goToSemAcesso(access.reason, options);
        return;
      }
      const nextPath = buildAppPath(access.pageKey, access.tabSlug);
      if (
        layoutViewRef.current === "app" &&
        activePageRef.current === access.pageKey &&
        (activeTabSlugRef.current ?? null) === (access.tabSlug ?? null) &&
        areAppPathsEqual(window.location.pathname, nextPath)
      ) {
        return;
      }
      layoutViewRef.current = "app";
      activePageRef.current = access.pageKey;
      activeTabSlugRef.current = access.tabSlug;
      setLayoutView("app");
      setActivePageState(access.pageKey);
      setActiveTabSlug(access.tabSlug);
      syncHistory(nextPath, options?.replace ?? false);
    },
    [goToSemAcesso],
  );

  const applyPathFromLocation = useCallback(
    (options?: { replace?: boolean }) => {
      const parsed = parseAppPathname(window.location.pathname);
      const u = userRef.current;

      if (parsed.kind === "empty") {
        if (u) navigateTo("home", null, { replace: true });
        return;
      }

      if (parsed.kind === "special") {
        if (parsed.special === "sem_acesso") {
          setLayoutView("sem_acesso");
          return;
        }
        if (parsed.special === "login") {
          if (u) navigateTo("home", null, { replace: true });
          return;
        }
        if (parsed.special === "home" && u) {
          navigateTo("home", null, options);
        }
        return;
      }

      if (!u) return;

      const access = resolveRouteAccess(
        parsed,
        u.role,
        permissionsRef.current,
        permissionsAcoesRef.current,
      );
      if (!access.ok) {
        goToSemAcesso(access.reason, options);
        return;
      }

      const path = buildAppPath(access.pageKey, access.tabSlug);
      if (
        layoutViewRef.current === "app" &&
        activePageRef.current === access.pageKey &&
        (activeTabSlugRef.current ?? null) === (access.tabSlug ?? null) &&
        areAppPathsEqual(window.location.pathname, path)
      ) {
        return;
      }

      layoutViewRef.current = "app";
      activePageRef.current = access.pageKey;
      activeTabSlugRef.current = access.tabSlug;
      setLayoutView("app");
      setActivePageState(access.pageKey);
      setActiveTabSlug(access.tabSlug);
      syncHistory(path, options?.replace ?? true);
    },
    [navigateTo, goToSemAcesso],
  );

  const setActivePage = useCallback(
    (page: string) => {
      navigateTo(page as PageKey, null);
    },
    [navigateTo],
  );
  const [operadoraBrand, setOperadoraBrand] = useState<OperadoraBrand | null>(null);
  const [operadoraHomeReady, setOperadoraHomeReady] = useState(true);
  const [brandRefreshKey, setBrandRefreshKey] = useState(0);

  // Refetch brand ao voltar para a aba (ex.: admin atualizou operadora em outra aba)
  useEffect(() => {
    if (user?.role !== "operador") return;
    const onFocus = () => setBrandRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.role]);

  // Operador: sempre modo Dark (brand da operadora); demais roles escolhem tema
  const effectiveIsDark = user?.role === "operador" ? true : isDark;
  const theme = effectiveIsDark ? DARK_THEME : LIGHT_THEME;

  // data-theme no html para background full-viewport e scrollbar (evita linhas brancas)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveIsDark ? "dark" : "light");
  }, [effectiveIsDark]);

  // Brandguide + template de Home: operador vê identidade da operadora do escopo
  useEffect(() => {
    if (!user || user.role !== "operador" || !escoposVisiveis.operadorasVisiveis?.length) {
      aplicarBrandguideReset();
      setOperadoraBrand(null);
      setOperadoraHomeReady(true);
      return;
    }
    const slug = escoposVisiveis.operadorasVisiveis[0];
    let cancelled = false;
    setOperadoraHomeReady(false);
    void (async () => {
      try {
        const { data } = await supabase.from("operadoras").select(
          "nome, brand_action, brand_contrast, brand_bg, brand_text, logo_url, font_url, home_template"
        ).eq("slug", slug).single();
        if (cancelled) return;
        const hasBrand = !!(
          data?.brand_action || data?.brand_contrast || data?.brand_bg || data?.brand_text
          || (data?.logo_url ?? "").trim()
        );
        if (hasBrand) {
          aplicarBrandguideOperadora(data as OperadoraBrandRow);
        } else {
          aplicarBrandguideReset();
        }
        const nome = (data?.nome ?? "").trim() || null;
        const logo = (data?.logo_url ?? "").trim() || null;
        const font = (data?.font_url ?? "").trim() || null;
        const bg = (data?.brand_bg ?? "").trim() || null;
        const homeTemplate = (data?.home_template ?? "").trim() || null;
        setOperadoraBrand({ nome, logo_url: logo, font_url: font, brand_bg: bg, home_template: homeTemplate });
      } catch {
        if (!cancelled) {
          aplicarBrandguideReset();
          setOperadoraBrand(null);
        }
      } finally {
        if (!cancelled) setOperadoraHomeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, escoposVisiveis.operadorasVisiveis, brandRefreshKey]);

  // Fonte customizada: injeta @font-face e aplica --brand-fontFamily quando operador tem font_url
  useEffect(() => {
    const id = "operadora-brand-font";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const root = document.documentElement.style;
    if (!operadoraBrand?.font_url) {
      root.setProperty("--brand-fontFamily", DEFAULT_FONT_FAMILY);
      return;
    }
    const url = operadoraBrand.font_url;
    const ext = url.split(".").pop()?.toLowerCase().split("?")[0] ?? "woff2";
    const format = ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : "truetype";
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@font-face{font-family:"OperadoraBrandFont";src:url("${url}") format("${format}");font-display:swap;}`;
    document.head.appendChild(style);
    root.setProperty("--brand-fontFamily", '"OperadoraBrandFont", "Inter", sans-serif');
    return () => {
      document.getElementById(id)?.remove();
      root.setProperty("--brand-fontFamily", DEFAULT_FONT_FAMILY);
    };
  }, [operadoraBrand?.font_url]);

  // Wrapper de setUser que também carrega permissões e escopos
  async function setUser(u: User | null) {
    setUserState(u);
    userRef.current = u;
    if (u) {
      try {
        const escopos = await carregarEscoposVisiveis(u.id, u.role);
        setEscoposVisiveis(escopos);
        const [perms, acoes] = await Promise.all([
          carregarPermissoes(u.role, {
            operadorasVisiveis: u.role === "operador" ? escopos.operadorasVisiveis : undefined,
            gestorTiposVisiveis: u.role === "gestor" ? escopos.gestorTiposVisiveis : undefined,
            prestadorTiposVisiveis: u.role === "prestador" ? escopos.prestadorTiposVisiveis : undefined,
          }),
          carregarPermissoesAcoes(u.role),
        ]);
        setPermissions(perms);
        setPermissionsAcoes(acoes);
        syncAuthRefs(u, perms, acoes);

        const pendingReturn = sessionStorage.getItem(PENDING_RETURN_PATH_KEY);
        if (pendingReturn) {
          sessionStorage.removeItem(PENDING_RETURN_PATH_KEY);
          try {
            const url = new URL(pendingReturn, window.location.origin);
            syncHistory(`${url.pathname}${url.search}`, true);
          } catch {
            syncHistory(pendingReturn, true);
          }
        }

        const params = new URLSearchParams(window.location.search);
        const afterLogin = params.get("after_login")?.trim();
        if (afterLogin === "rh_dados_cadastro") {
          syncHistory(buildAppPath("rh_dados_cadastro"), true);
        } else if (params.toString()) {
          syncHistory(window.location.pathname, true);
        }
      } catch (err) {
        console.error("Erro ao carregar permissões/escopos após login:", err);
        const emptyPerms = Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa;
        const emptyAcoes = emptyAcoesMapa();
        setPermissions(emptyPerms);
        setPermissionsAcoes(emptyAcoes);
        setEscoposVisiveis(ESCOPOS_VAZIOS);
        syncAuthRefs(u, emptyPerms, emptyAcoes);
      }
      setRouteReady(true);
      applyPathFromLocation({ replace: true });
    } else {
      const emptyPerms = Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa;
      const emptyAcoes = emptyAcoesMapa();
      setPermissions(emptyPerms);
      setPermissionsAcoes(emptyAcoes);
      setEscoposVisiveis(ESCOPOS_VAZIOS);
      syncAuthRefs(null, emptyPerms, emptyAcoes);
      setLayoutView("app");
      setRouteReady(true);
      syncHistory(buildLoginPath(), true);
    }
  }

  useEffect(() => {
    // Carrega fontes
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    // Restaura sessão ativa (mount único — applyPathFromLocation usa refs, não closure stale)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, role, email, ativo, must_change_password")
            .eq("id", session.user.id)
            .single();
          if (profile) {
            if (profile.ativo === false) {
              await supabase.auth.signOut();
              setUserState(null);
              setChecking(false);
              return;
            }
            const u = profile as User;
            setUserState(u);
            userRef.current = u;
            try {
              const escopos = await carregarEscoposVisiveis(u.id, u.role);
              setEscoposVisiveis(escopos);
              const [perms, acoes] = await Promise.all([
                carregarPermissoes(u.role, {
                  operadorasVisiveis: u.role === "operador" ? escopos.operadorasVisiveis : undefined,
                  gestorTiposVisiveis: u.role === "gestor" ? escopos.gestorTiposVisiveis : undefined,
                  prestadorTiposVisiveis: u.role === "prestador" ? escopos.prestadorTiposVisiveis : undefined,
                }),
                carregarPermissoesAcoes(u.role),
              ]);
              setPermissions(perms);
              setPermissionsAcoes(acoes);
              syncAuthRefs(u, perms, acoes);
            } catch (err) {
              console.error("Erro ao carregar permissões/escopos:", err);
              const emptyPerms = Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa;
              const emptyAcoes = emptyAcoesMapa();
              setPermissions(emptyPerms);
              setPermissionsAcoes(emptyAcoes);
              setEscoposVisiveis(ESCOPOS_VAZIOS);
              syncAuthRefs(u, emptyPerms, emptyAcoes);
            }
            setRouteReady(true);
            applyPathFromLocation({ replace: true });
          }
        } else {
          setRouteReady(true);
        }
      } catch (err) {
        console.error("Erro ao restaurar sessão:", err);
        setRouteReady(true);
      } finally {
        setChecking(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap de sessão só no mount
  }, []);

  // Mantém o estado React alinhado ao Auth quando a sessão é limpa (ex.: tokens inválidos em Edge Function).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;
      setUserState(null);
      setEscoposVisiveis(ESCOPOS_VAZIOS);
      setPermissions(Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa);
      setOperadoraBrand(null);
      setOperadoraHomeReady(true);
      setPermissionsAcoes(emptyAcoesMapa());
      syncAuthRefs(
        null,
        Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa,
        emptyAcoesMapa(),
      );
      setActivePageState("home");
      setActiveTabSlug(null);
      setLayoutView("app");
      setRouteReady(true);
      syncHistory(buildLoginPath(), true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const podeVerInfluencer = useCallback(
    (id: string) =>
      escoposVisiveis.semRestricaoEscopo === true ||
      escoposVisiveis.vêTodosInfluencers === true ||
      escoposVisiveis.influencersVisiveis.includes(id),
    [escoposVisiveis],
  );
  const podeVerOperadora = useCallback(
    (slug: string) =>
      escoposVisiveis.semRestricaoEscopo === true ||
      user?.role === "gestor" ||
      escoposVisiveis.operadorasVisiveis.includes(slug),
    [escoposVisiveis, user?.role],
  );

  const setTheme = (v: boolean) => {
    if (user?.role === "operador") return; // Operador travado em Dark
    setIsDark(v);
  };

  return (
    <AppContext.Provider value={{
      user, setUser, checking, routeReady,
      activePage, activeTabSlug, layoutView, setActivePage, navigateTo, applyPathFromLocation, goToSemAcesso,
      permissions, permissionsAcoes, setPermissions,
      escoposVisiveis, podeVerInfluencer, podeVerOperadora,
      operadoraBrand,
      operadoraHomeReady,
      theme, isDark: effectiveIsDark, setIsDark: setTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
