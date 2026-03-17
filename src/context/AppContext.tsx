import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, PageKey, PermissaoValor, Role } from "../types";
import { LIGHT_THEME, DARK_THEME, Theme } from "../constants/theme";
import { supabase } from "../lib/supabase";

// Todas as PageKeys existentes — usadas para liberar tudo ao admin
const ALL_PAGE_KEYS: PageKey[] = [
  "dash_overview", "dash_overview_influencer", "dash_conversao", "dash_financeiro", "mesas_spin",
  "agenda", "resultados", "feedback",
  "influencers", "scout", "financeiro", "gestao_links", "gestao_dealers",
  "gestao_usuarios", "gestao_operadoras", "upload_arquivos", "status_tecnico",
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
  semRestricaoEscopo?: boolean;   // true = admin/gestor, vê tudo
  vêTodosInfluencers?: boolean;   // true = executivo, vê todos os influencers
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

const ESCOPOS_VAZIOS: EscoposVisiveis = { influencersVisiveis: [], operadorasVisiveis: [], semRestricaoEscopo: false };

// ─── Carrega escopos visíveis por role e user_scopes (Etapa 7) ─────────────────
async function carregarEscoposVisiveis(
  userId: string,
  role: Role
): Promise<EscoposVisiveis> {
  // Admin e Gestor: sempre vê tudo (sem restrição de escopo)
  if (role === "admin" || role === "gestor") {
    return { influencersVisiveis: [], operadorasVisiveis: [], semRestricaoEscopo: true };
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
      .map((s) => s.scope_ref);
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
async function carregarPermissoes(role: User["role"]): Promise<PermissoesMapa> {
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
      try {
        const [perms, escopos] = await Promise.all([
          carregarPermissoes(u.role),
          carregarEscoposVisiveis(u.id, u.role),
        ]);
        setPermissions(perms);
        setEscoposVisiveis(escopos);
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
              const [perms, escopos] = await Promise.all([
                carregarPermissoes(u.role),
                carregarEscoposVisiveis(u.id, u.role),
              ]);
              setPermissions(perms);
              setEscoposVisiveis(escopos);
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

  const podeVerInfluencer = (id: string) =>
    escoposVisiveis.semRestricaoEscopo === true ||
    escoposVisiveis.vêTodosInfluencers === true ||
    escoposVisiveis.influencersVisiveis.includes(id);
  const podeVerOperadora = (slug: string) =>
    escoposVisiveis.semRestricaoEscopo === true || escoposVisiveis.operadorasVisiveis.includes(slug);

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
