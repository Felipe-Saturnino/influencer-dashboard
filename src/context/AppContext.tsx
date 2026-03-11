import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, PageKey, PermissaoValor } from "../types";
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

interface AppContextValue {
  // Auth
  user:        User | null;
  setUser:     (u: User | null) => void;
  checking:    boolean;
  // Permissões de menu
  permissions: PermissoesMapa;
  setPermissions: (p: PermissoesMapa) => void;
  // Theme
  theme:    Theme;
  isDark:   boolean;
  setIsDark:(v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

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
  const [user,        setUserState]   = useState<User | null>(null);
  const [checking,    setChecking]    = useState(true);
  const [isDark,      setIsDark]      = useState(false);
  const [permissions, setPermissions] = useState<PermissoesMapa>(
    Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
  );

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Wrapper de setUser que também carrega permissões
  async function setUser(u: User | null) {
    setUserState(u);
    if (u) {
      const perms = await carregarPermissoes(u.role);
      setPermissions(perms);
    } else {
      // Logout: zera permissões
      setPermissions(
        Object.fromEntries(ALL_PAGE_KEYS.map((k) => [k, null])) as PermissoesMapa
      );
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
          const perms = await carregarPermissoes(u.role);
          setPermissions(perms);
        }
      }
      setChecking(false);
    });
  }, []);

  return (
    <AppContext.Provider value={{
      user, setUser, checking,
      permissions, setPermissions,
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
