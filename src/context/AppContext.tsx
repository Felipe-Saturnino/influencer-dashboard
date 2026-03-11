import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, PageKey, PermissaoValor, Role } from "../types";
import { LIGHT_THEME, DARK_THEME, Theme } from "../constants/theme";
import { supabase } from "../lib/supabase";

// Todas as PageKeys existentes — usadas para liberar tudo ao admin
const ALL_PAGE_KEYS: PageKey[] = [
  "dash_overview", "dash_conversao", "dash_financeiro",
  "agenda", "resultados", "feedback",
  "influencers", "financeiro", "gestao_links",
  "gestao_usuarios", "gestao_operadoras",
  "configuracoes", "ajuda",
];

// Tipo do mapa de permissões de visualização
export type PermissoesMapa = Record<PageKey, PermissaoValor>;

// Escopos visíveis — [] = sem restrição (admin/gestor)
export interface EscoposVisiveis {
  influencersVisiveis: string[];  // UUIDs
  operadorasVisiveis:  string[];  // slugs
}

interface AppContextValue {
  // Auth
  user:        User | null;
  setUser:     (u: User | null) => void;
  checking:    boolean;
  // Permissões de menu
  permissions: PermissoesMapa;
  setPermissions: (p: PermissoesMapa) => void;
  // Escopos para segregação de dados (Etapa 7)
  escoposVisiveis: EscoposVisiveis;
  /** [] = sem restrição. true se pode ver o influencer. */
  podeVerInfluencer: (id: string) => boolean;
  /** [] = sem restrição. true se pode ver a operadora. */
  podeVerOperadora: (slug: string) => boolean;
  // Theme
  theme:    Theme;
  isDark:   boolean;
  setIsDark:(v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const ESCOPOS_VAZIOS: EscoposVisiveis = { influencersVisiveis: [], operadorasVisiveis: [] };

// ─── Carrega escopos visíveis por role e user_scopes (Etapa 7) ─────────────────
async function carregarEscoposVisiveis(
  userId: string,
  role: Role
): Promise<EscoposVisiveis> {
  if (role === "admin" || role === "gestor") {
    return ESCOPOS_VAZIOS; // [] = sem restrição
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
    return { influencersVisiveis: [userId], operadorasVisiveis };
  }

  if (role === "executivo") {
    if (lista.length === 0) return ESCOPOS_VAZIOS; // sem escopo = vê tudo
    const influencersVisiveis = lista
      .filter((s) => s.scope_type === "influencer")
      .map((s) => s.scope_ref);
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref);
    return { influencersVisiveis, operadorasVisiveis };
  }

  if (role === "operador") {
    const influencersVisiveis = lista
      .filter((s) => s.scope_type === "influencer")
      .map((s) => s.scope_ref);
    const operadorasVisiveis = lista
      .filter((s) => s.scope_type === "operadora")
      .map((s) => s.scope_ref);
    return { influencersVisiveis, operadorasVisiveis };
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
    };
  }

  return ESCOPOS_VAZIOS;
}

// ─── Carrega can_view de todas as páginas para o role do usuário ──────────────
async function carregarPermissoes(role: User["role"]): Promise<PermissoesMapa> {
  // Admin: libera tudo sem consultar o banco
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

  return mapa;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,           setUserState]    = useState<User | null>(null);
  const [checking,       setChecking]    = useState(true);
  const [isDark,         setIsDark]      = useState(false);
  const [permissions,    setPermissions]  = useState<PermissoesMapa>(
    Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
  );
  const [escoposVisiveis, setEscoposVisiveis] = useState<EscoposVisiveis>(ESCOPOS_VAZIOS);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Wrapper de setUser que também carrega permissões e escopos
  async function setUser(u: User | null) {
    setUserState(u);
    if (u) {
      const [perms, escopos] = await Promise.all([
        carregarPermissoes(u.role),
        carregarEscoposVisiveis(u.id, u.role),
      ]);
      setPermissions(perms);
      setEscoposVisiveis(escopos);
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
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, name, role, email")
          .eq("id", session.user.id)
          .single();
        if (profile) {
          const u = profile as User;
          setUserState(u);
          const [perms, escopos] = await Promise.all([
            carregarPermissoes(u.role),
            carregarEscoposVisiveis(u.id, u.role),
          ]);
          setPermissions(perms);
          setEscoposVisiveis(escopos);
        }
      }
      setChecking(false);
    });
  }, []);

  const podeVerInfluencer = (id: string) =>
    escoposVisiveis.influencersVisiveis.length === 0 || escoposVisiveis.influencersVisiveis.includes(id);
  const podeVerOperadora = (slug: string) =>
    escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(slug);

  return (
    <AppContext.Provider value={{
      user, setUser, checking,
      permissions, setPermissions,
      escoposVisiveis, podeVerInfluencer, podeVerOperadora,
      theme, isDark, setIsDark,
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
