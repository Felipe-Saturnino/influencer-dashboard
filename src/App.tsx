import { Suspense, lazy, useState, type ComponentType, type LazyExoticComponent } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase, supabaseConfigOk } from "./lib/supabase";
import ErrorBoundary from "./components/ErrorBoundary";
// Layout (sempre carregados — usados em toda sessão)
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
// Páginas de fluxo inicial (eager — Login e TrocarSenha bloqueiam antes do layout)
import Login                  from "./pages/geral/Login";
import TrocarSenhaObrigatorio from "./pages/geral/TrocarSenhaObrigatorio";

// Helper: retry automático em falhas de carregamento de chunk (ex.: rede instável)
function lazyWithRetry<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 1000,
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await importFn();
      } catch (e) {
        lastErr = e;
        if (i < retries) await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
    throw lastErr;
  });
}

// Páginas do layout — lazy loading (carregadas sob demanda para reduzir bundle inicial)
const Home                   = lazyWithRetry(() => import("./pages/geral/Home"));
const Configuracoes          = lazyWithRetry(() => import("./pages/geral/Configuracoes"));
const Ajuda                  = lazyWithRetry(() => import("./pages/geral/Ajuda"));
const DashboardOverview          = lazyWithRetry(() => import("./pages/dashboards/DashboardOverview"));
const DashboardOverviewInfluencer = lazyWithRetry(() => import("./pages/dashboards/DashboardOverviewInfluencer"));
const DashboardConversao         = lazyWithRetry(() => import("./pages/dashboards/DashboardConversao"));
const DashboardFinanceiro        = lazyWithRetry(() => import("./pages/dashboards/DashboardFinanceiro"));
const MesasSpin                 = lazyWithRetry(() => import("./pages/dashboards/MesasSpin"));
const SocialMediaDashboard      = lazyWithRetry(() => import("./pages/dashboards/SocialMediaDashboard"));
const Agenda     = lazyWithRetry(() => import("./pages/lives/Agenda"));
const Resultados = lazyWithRetry(() => import("./pages/lives/Resultados"));
const Feedback   = lazyWithRetry(() => import("./pages/lives/Feedback"));
const Influencers = lazyWithRetry(() => import("./pages/operacoes/Influencers"));
const Scout = lazyWithRetry(() => import("./pages/operacoes/Scout"));
const Financeiro  = lazyWithRetry(() => import("./pages/operacoes/Financeiro"));
const GestaoLinks = lazyWithRetry(() => import("./pages/operacoes/GestaoLinks"));
const Campanhas = lazyWithRetry(() => import("./pages/operacoes/Campanhas"));
const GestaoDealers = lazyWithRetry(() => import("./pages/operacoes/GestaoDealers"));
const CastingDealers = lazyWithRetry(() => import("./pages/operacoes/CastingDealers"));
const RoteiroMesa = lazyWithRetry(() => import("./pages/conteudo/RoteiroMesa"));
const GestaoUsuarios = lazyWithRetry(() => import("./pages/plataforma/GestaoUsuarios"));
const GestaoOperadoras = lazyWithRetry(() => import("./pages/plataforma/GestaoOperadoras"));
const StatusTecnico = lazyWithRetry(() => import("./pages/plataforma/StatusTecnico"));

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, LazyExoticComponent<ComponentType>> = {
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
  casting_dealers:  CastingDealers,
  roteiro_mesa:     RoteiroMesa,
  gestao_usuarios:  GestaoUsuarios,
  gestao_operadoras: GestaoOperadoras,
  status_tecnico:   StatusTecnico,
  configuracoes:    Configuracoes,
  ajuda:            Ajuda,
};

const PageLoadingFallback = ({ background = "#0d0d12" }: { background?: string }) => (
  <div style={{
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    background, minHeight: 200,
    color: "#e5dce1", fontSize: 14, fontFamily: "Inter, sans-serif",
  }}>
    ⏳ Carregando...
  </div>
);

// ─── APP LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, theme: t, activePage, setActivePage } = useApp();
  const [retryKey, setRetryKey] = useState(0);
  if (!user) return null;
  const PageComponent = PAGE_MAP[activePage] ?? Home;
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.bg }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginLeft: "240px", minHeight: "100vh" }}>
        <Header activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} />
        <div className="main-content" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: t.bg }}>
          <ErrorBoundary background={t.bg} onReset={() => setRetryKey((k) => k + 1)}>
            <Suspense fallback={<PageLoadingFallback background={t.bg} />}>
              <PageComponent key={`${activePage}-${retryKey}`} />
            </Suspense>
          </ErrorBoundary>
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
