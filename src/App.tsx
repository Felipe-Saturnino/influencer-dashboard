import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabase";
// Layout
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas
import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import Agenda         from "./pages/Agenda";
import ResultadoLives from "./pages/ResultadoLives";
import Feedback       from "./pages/Feedback";
import Influencers    from "./pages/Influencers";
import Configuracoes  from "./pages/Configuracoes";
import Ajuda          from "./pages/Ajuda";

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, React.FC> = {
  dashboard:       Dashboard,
  agenda:          Agenda,
  resultado_lives: ResultadoLives,
  feedback:        Feedback,
  influencers:     Influencers,
  configuracoes:   Configuracoes,
  ajuda:           Ajuda,
};

// ─── APP LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, theme: t } = useApp();
  const [activePage, setActivePage] = useState("dashboard");
  if (!user) return null;
  const PageComponent = PAGE_MAP[activePage] ?? Dashboard;
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={onLogout}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header activePage={activePage} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <PageComponent />
        </div>
      </main>
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
function Root() {
  const { user, setUser, checking } = useApp();

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#e5dce1", fontFamily: "Inter, sans-serif" }}>
        ⏳ Carregando...
      </div>
    );
  }

  return user
    ? <AppLayout onLogout={handleLogout} />
    : <Login onLogin={setUser} />;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
