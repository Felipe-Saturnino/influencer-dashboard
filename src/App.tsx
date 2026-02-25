import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabase";
// Layout
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas
import Login          from "./pages/geral/Login";
import Dashboard      from "./pages/dashboards/Dashboard";
import Agenda         from "./pages/lives/Agenda";
import Resultados     from "./pages/lives/Resultados";
import Feedback       from "./pages/lives/Feedback";
import Influencers    from "./pages/operacoes/Influencers";
import Configuracoes  from "./pages/geral/Configuracoes";
import Ajuda          from "./pages/geral/Ajuda";

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, React.FC> = {
  dashboard:       Dashboard,
  agenda:          Agenda,
  resultado_lives: Resultados,
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
        activePage={activePage as any}
        onNavigate={setActivePage}
        onLogout={onLogout}
        user={user}
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

// ─── ROOT ─────────────────────────────────────────────────────────────────────
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

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
