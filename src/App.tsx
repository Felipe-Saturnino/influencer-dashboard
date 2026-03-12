import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase, supabaseConfigOk } from "./lib/supabase";
// Layout
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas — geral
import Login         from "./pages/geral/Login";
import Configuracoes from "./pages/geral/Configuracoes";
import Ajuda         from "./pages/geral/Ajuda";
// Páginas — dashboards
import DashboardOverview          from "./pages/dashboards/DashboardOverview";
import DashboardOverviewInfluencer from "./pages/dashboards/DashboardOverviewInfluencer";
import DashboardConversao         from "./pages/dashboards/DashboardConversao";
import DashboardFinanceiro        from "./pages/dashboards/DashboardFinanceiro";
// Páginas — lives
import Agenda     from "./pages/lives/Agenda";
import Resultados from "./pages/lives/Resultados";
import Feedback   from "./pages/lives/Feedback";
// Páginas — operacoes
import Influencers from "./pages/operacoes/Influencers";
import Financeiro  from "./pages/operacoes/Financeiro";
import GestaoLinks from "./pages/operacoes/GestaoLinks";
// Páginas — plataforma
import GestaoUsuarios from "./pages/plataforma/GestaoUsuarios";
import GestaoOperadoras from "./pages/plataforma/GestaoOperadoras";

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, React.FC> = {
  dash_overview:             DashboardOverview,
  dash_overview_influencer:  DashboardOverviewInfluencer,
  dash_conversao:            DashboardConversao,
  dash_financeiro:           DashboardFinanceiro,
  agenda:           Agenda,
  resultados:       Resultados,
  feedback:         Feedback,
  influencers:      Influencers,
  financeiro:       Financeiro,
  gestao_links:     GestaoLinks,
  gestao_usuarios:  GestaoUsuarios,
  gestao_operadoras: GestaoOperadoras,
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
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: "240px", minHeight: "100vh" }}>
        <Header activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} />
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
  return user ? <AppLayout onLogout={handleLogout} /> : <Login onLogin={setUser} />;
}

function ConfigError() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Inter, sans-serif", color: "#e5dce1", textAlign: "center",
    }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 20, marginBottom: 12, color: "#fff" }}>Configuração incompleta</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 400 }}>
          As variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> não estão configuradas.
        </p>
        <p style={{ fontSize: 13, marginTop: 16, color: "#888" }}>
          No Cloudflare Pages, vá em <strong>Settings → Environment variables</strong> e adicione ambas.<br />
          Para o branch <em>Staging</em>, configure em <strong>Preview</strong>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigOk) return <ConfigError />;
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
