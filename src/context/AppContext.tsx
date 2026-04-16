import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User, PageKey, PermissaoValor, Role } from "../types";
import { LIGHT_THEME, DARK_THEME, Theme } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { validarBrandguide, cssDerivadasBrand, type BrandValidated } from "../lib/brandguideValidation";

// Todas as PageKeys existentes — usadas para liberar tudo ao admin
const ALL_PAGE_KEYS: PageKey[] = [
  "home",
  "mesas_spin", "streamers", "dash_overview_influencer", "dash_midias_sociais",
  "agenda", "resultados", "feedback",
  "influencers", "scout", "financeiro", "banca_jogo", "gestao_links", "campanhas", "gestao_dealers", "central_notificacoes",
  "gestao_usuarios", "gestao_operadoras", "status_tecnico",
  "roteiro_mesa",
  "playbook_influencers",
  "links_materiais",
  "rh_figurinos",
  "configuracoes", "ajuda",
];

// Tipo do mapa de permissões de visualização
export type PermissoesMapa = Record<PageKey, PermissaoValor>;

// Escopos visíveis
// semRestricaoEscopo=true (admin/gestor): vê tudo, ignora arrays
// semRestricaoEscopo=false ou undefined: só vê o que está em influencersVisiveis/operadorasVisiveis
export interface EscoposVisiveis {
  influencersVisiveis: string[];  // UUIDs
  operadorasVisiveis:  string[];  // slugs
  semRestricaoEscopo?: boolean;   // true = admin/gestor, vê tudo (dados)
  vêTodosInfluencers?: boolean;   // true = executivo, vê todos os influencers
  /** Tipos de gestor (user_scopes gestor_tipo); usado para filtrar menu vs gestor_tipo_pages */
  gestorTiposVisiveis?: string[];
}

/** Brand da operadora (operador): logo, fonte e fundo (hex); demais cores via CSS vars --brand-* */
export interface OperadoraBrand {
  nome:      string | null;
  logo_url:  string | null;
  font_url:  string | null;
  brand_bg:  string | null;
}

interface AppContextValue {
  // Auth
  user:        User | null;
  setUser:     (u: User | null) => void;
  checking:    boolean;
  // Navegação (página ativa no layout)
  activePage:  string;
  setActivePage: (page: string) => void;
  // Permissões de menu
  permissions: PermissoesMapa;
  setPermissions: (p: PermissoesMapa) => void;
  // Escopos para segregação de dados (Etapa 7)
  escoposVisiveis: EscoposVisiveis;
  /** [] = sem restrição. true se pode ver o influencer. */
  podeVerInfluencer: (id: string) => boolean;
  /** [] = sem restrição. true se pode ver a operadora. */
  podeVerOperadora: (slug: string) => boolean;
  /** Brand da operadora (operador): logo_url para Sidebar; cores via --brand-* */
  operadoraBrand: OperadoraBrand | null;
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
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: true,
      gestorTiposVisiveis,
    };
  }

  const { data: scopes } = await supabase
    .from("user_scopes")
    .select("scope_type, scope_ref")
    .eq("user_id", userId);

  const lista = scopes ?? [];

  if (role === "influencer") {
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref);
    return { influencersVisiveis: [userId], operadorasVisiveis, semRestricaoEscopo: false };
  }

  // Executivo: vê TODOS os influencers, escopo só para operadoras
  if (role === "executivo") {
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref);
    return { influencersVisiveis: [], operadorasVisiveis, semRestricaoEscopo: false, vêTodosInfluencers: true };
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
  options?: { operadorasVisiveis?: string[]; gestorTiposVisiveis?: string[] }
): Promise<PermissoesMapa> {
  const operadorasVisiveis = options?.operadorasVisiveis;
  const gestorTiposVisiveis = options?.gestorTiposVisiveis;
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

  // Gestão de Usuários: APENAS admin tem acesso (gestores não podem alterar perfis)
  mapa.gestao_usuarios = role === "admin" ? "sim" : "nao";

  // Overview Influencer: padrão "proprios" para influencer e agencia (único dash para eles)
  if (mapa.dash_overview_influencer === null && ["influencer", "agencia"].includes(role)) {
    mapa.dash_overview_influencer = "proprios";
  }
  if (mapa.dash_overview_influencer === null && ["admin", "gestor", "executivo"].includes(role)) {
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

  // Gestor: união das páginas em gestor_tipo_pages para os tipos do usuário. Se não houver linhas na tabela
  // para esses tipos ainda, mantém só role_permissions (transição até a aba Gestores ser preenchida).
  if (role === "gestor" && gestorTiposVisiveis && gestorTiposVisiveis.length > 0) {
    const { data: gtPages } = await supabase
      .from("gestor_tipo_pages")
      .select("page_key")
      .in("gestor_tipo_slug", gestorTiposVisiveis);
    const rows = gtPages ?? [];
    if (rows.length > 0) {
      const pagesPermitidas = new Set(rows.map((r) => r.page_key));
      ALL_PAGE_KEYS.forEach((k) => {
        const cv = mapa[k];
        if (cv === "sim" || cv === "proprios") {
          if (!pagesPermitidas.has(k)) mapa[k] = "nao";
        }
      });
    }
  }

  return mapa;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,           setUserState]    = useState<User | null>(null);
  const [checking,       setChecking]    = useState(true);
  const [isDark,         setIsDark]      = useState(false);
  const [activePage,     setActivePage]   = useState("home");
  const [permissions,    setPermissions]  = useState<PermissoesMapa>(
    Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
  );
  const [escoposVisiveis, setEscoposVisiveis] = useState<EscoposVisiveis>(ESCOPOS_VAZIOS);
  const [operadoraBrand, setOperadoraBrand] = useState<OperadoraBrand | null>(null);
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

  // Brandguide: operador vê cores e logo da operadora; demais roles usam default
  useEffect(() => {
    if (!user || user.role !== "operador" || !escoposVisiveis.operadorasVisiveis?.length) {
      aplicarBrandguideReset();
      setOperadoraBrand(null);
      return;
    }
    const slug = escoposVisiveis.operadorasVisiveis[0];
    void (async () => {
      try {
        const { data } = await supabase.from("operadoras").select(
          "nome, brand_action, brand_contrast, brand_bg, brand_text, logo_url, font_url"
        ).eq("slug", slug).single();
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
        setOperadoraBrand({ nome, logo_url: logo, font_url: font, brand_bg: bg });
      } catch {
        aplicarBrandguideReset();
        setOperadoraBrand(null);
      }
    })();
  }, [user?.id, user?.role, escoposVisiveis.operadorasVisiveis, brandRefreshKey]);

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
    if (u) setActivePage("home"); // Ao fazer login, volta para a página Home
    if (u) {
      try {
        const escopos = await carregarEscoposVisiveis(u.id, u.role);
        setEscoposVisiveis(escopos);
        const perms = await carregarPermissoes(u.role, {
          operadorasVisiveis: u.role === "operador" ? escopos.operadorasVisiveis : undefined,
          gestorTiposVisiveis: u.role === "gestor" ? escopos.gestorTiposVisiveis : undefined,
        });
        setPermissions(perms);
      } catch (err) {
        console.error("Erro ao carregar permissões/escopos após login:", err);
        setPermissions(Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa);
        setEscoposVisiveis(ESCOPOS_VAZIOS);
      }
    } else {
      setPermissions(
        Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
      );
      setEscoposVisiveis(ESCOPOS_VAZIOS);
    }
  }

  useEffect(() => {
    // Carrega fontes
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    // Restaura sessão ativa
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
            try {
              const escopos = await carregarEscoposVisiveis(u.id, u.role);
              setEscoposVisiveis(escopos);
              const perms = await carregarPermissoes(u.role, {
                operadorasVisiveis: u.role === "operador" ? escopos.operadorasVisiveis : undefined,
                gestorTiposVisiveis: u.role === "gestor" ? escopos.gestorTiposVisiveis : undefined,
              });
              setPermissions(perms);
            } catch (err) {
              console.error("Erro ao carregar permissões/escopos:", err);
              setPermissions(Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa);
              setEscoposVisiveis(ESCOPOS_VAZIOS);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao restaurar sessão:", err);
      } finally {
        setChecking(false);
      }
    });
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
      escoposVisiveis.semRestricaoEscopo === true || escoposVisiveis.operadorasVisiveis.includes(slug),
    [escoposVisiveis],
  );

  const setTheme = (v: boolean) => {
    if (user?.role === "operador") return; // Operador travado em Dark
    setIsDark(v);
  };

  return (
    <AppContext.Provider value={{
      user, setUser, checking,
      activePage, setActivePage,
      permissions, setPermissions,
      escoposVisiveis, podeVerInfluencer, podeVerOperadora,
      operadoraBrand,
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
