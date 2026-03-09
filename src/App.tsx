import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase } from "./lib/supabase";
// Layout
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas — geral
import Login         from "./pages/geral/Login";
import Configuracoes from "./pages/geral/Configuracoes";
import Ajuda         from "./pages/geral/Ajuda";
// Páginas — dashboards
import DashboardOverview   from "./pages/dashboards/DashboardOverview";
import DashboardConversao  from "./pages/dashboards/DashboardConversao";
import DashboardFinanceiro from "./pages/dashboards/DashboardFinanceiro";
// Páginas — lives
import Agenda        from "./pages/lives/Agenda";
import Resultados    from "./pages/lives/Resultados";
import Feedback      from "./pages/lives/Feedback";
// Páginas — operacoes
import Influencers   from "./pages/operacoes/Influencers";
import Financeiro    from "./pages/operacoes/Financeiro";
import GestaoLinks   from "./pages/operacoes/GestaoLinks";

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, React.FC> = {
  dash_overview:    DashboardOverview,
  dash_conversao:   DashboardConversao,
  dash_financeiro:  DashboardFinanceiro,
  agenda:           Agenda,
  resultados:       Resultados,
  feedback:         Feedback,
  influencers:      Influencers,
  financeiro:       Financeiro,
  gestao_links:     GestaoLinks,
  configuracoes:    Configuracoes,
  ajuda:            Ajuda,
};

// ─── APP LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, theme: t } = useApp();
  const [activePage, setActivePage] = useState("dash_overview");
  if (!user) return null;
  const PageComponent = PAGE_MAP[activePage] ?? DashboardOverview;
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: "240px", minHeight: "100vh" }}>
        <Header
          activePage={activePage}
          onNavigate={setActivePage}
          onLogout={onLogout}
        />
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
