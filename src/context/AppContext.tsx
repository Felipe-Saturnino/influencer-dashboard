import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Language } from "../types";
import { LIGHT_THEME, DARK_THEME, Theme } from "../constants/theme";
import { supabase } from "../lib/supabase";

interface AppContextValue {
  // Auth
  user:    User | null;
  setUser: (u: User | null) => void;
  checking: boolean;
  // Theme
  theme:    Theme;
  isDark:   boolean;
  setIsDark:(v: boolean) => void;
  // Language
  lang:    Language;
  setLang: (l: Language) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [isDark,   setIsDark]   = useState(false);
  const [lang,     setLang]     = useState<Language>("pt");

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Carrega fontes e sessão ativa ao iniciar
  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, role, email")
          .eq("id", session.user.id)
          .single();
        if (profile) setUser(profile as User);
      }
      setChecking(false);
    });
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, checking, theme, isDark, setIsDark, lang, setLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
