import { Suspense, lazy } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase, supabaseConfigOk } from "./lib/supabase";
// Layout (sempre carregados — usados em toda sessão)
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas de fluxo inicial (eager — Login e TrocarSenha bloqueiam antes do layout)
import Login                  from "./pages/geral/Login";
import TrocarSenhaObrigatorio from "./pages/geral/TrocarSenhaObrigatorio";

// Páginas do layout — lazy loading (carregadas sob demanda para reduzir bundle inicial)
const Home                   = lazy(() => import("./pages/geral/Home"));
const Configuracoes          = lazy(() => import("./pages/geral/Configuracoes"));
const Ajuda                  = lazy(() => import("./pages/geral/Ajuda"));
const DashboardOverview          = lazy(() => import("./pages/dashboards/DashboardOverview"));
const DashboardOverviewInfluencer = lazy(() => import("./pages/dashboards/DashboardOverviewInfluencer"));
const DashboardConversao         = lazy(() => import("./pages/dashboards/DashboardConversao"));
const DashboardFinanceiro        = lazy(() => import("./pages/dashboards/DashboardFinanceiro"));
const MesasSpin                 = lazy(() => import("./pages/dashboards/MesasSpin"));
const SocialMediaDashboard      = lazy(() => import("./pages/dashboards/SocialMediaDashboard"));
const Agenda     = lazy(() => import("./pages/lives/Agenda"));
const Resultados = lazy(() => import("./pages/lives/Resultados"));
const Feedback   = lazy(() => import("./pages/lives/Feedback"));
const Influencers = lazy(() => import("./pages/operacoes/Influencers"));
const Scout = lazy(() => import("./pages/operacoes/Scout"));
const Financeiro  = lazy(() => import("./pages/operacoes/Financeiro"));
const GestaoLinks = lazy(() => import("./pages/operacoes/GestaoLinks"));
const Campanhas = lazy(() => import("./pages/operacoes/Campanhas"));
const GestaoDealers = lazy(() => import("./pages/operacoes/GestaoDealers"));
const RoteiroMesa = lazy(() => import("./pages/conteudo/RoteiroMesa"));
const GestaoUsuarios = lazy(() => import("./pages/plataforma/GestaoUsuarios"));
const GestaoOperadoras = lazy(() => import("./pages/plataforma/GestaoOperadoras"));
const StatusTecnico = lazy(() => import("./pages/plataforma/StatusTecnico"));

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  home:                     Home,
  dash_overview:             DashboardOverview,
  dash_overview_influencer:  DashboardOverviewInfluencer,
  dash_conversao:            DashboardConversao,
  dash_financeiro:           DashboardFinanceiro,
  mesas_spin:               MesasSpin,
  dash_midias_sociais:      SocialMediaDashboard,
  agenda:           Agenda,
  resultados:       Resultados,
  feedback:         Feedback,
  influencers:      Influencers,
  scout:            Scout,
  financeiro:       Financeiro,
  gestao_links:     GestaoLinks,
  campanhas:        Campanhas,
  gestao_dealers:   GestaoDealers,
  roteiro_mesa:     RoteiroMesa,
  gestao_usuarios:  GestaoUsuarios,
  gestao_operadoras: GestaoOperadoras,
  status_tecnico:   StatusTecnico,
  configuracoes:    Configuracoes,
  ajuda:            Ajuda,
};

const PageLoadingFallback = () => (
  <div style={{
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background: "inherit", minHeight: 200,
    color: "#e5dce1", fontSize: 14, fontFamily: "Inter, sans-serif",
  }}>
    ⏳ Carregando...
  </div>
);

// ─── APP LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, theme: t, activePage, setActivePage } = useApp();
  if (!user) return null;
  const PageComponent = PAGE_MAP[activePage] ?? Home;
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: "240px", minHeight: "100vh" }}>
        <Header activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} />
        <div className="main-content" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <Suspense fallback={<PageLoadingFallback />}>
            <PageComponent />
          </Suspense>
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
  if (!user) return <Login onLogin={setUser} />;
  if (user.must_change_password) return <TrocarSenhaObrigatorio />;
  return <AppLayout onLogout={handleLogout} />;
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
