import { Suspense, lazy, useState, useEffect, useCallback, type ComponentType, type LazyExoticComponent } from "react";
import { Loader2 } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { supabase, supabaseConfigOk } from "./lib/supabase";
import { queryClient } from "./lib/queryClient";
import ErrorBoundary from "./components/ErrorBoundary";
import type { PageKey } from "./types";
import { useMediaQuery, MEDIA_MAX_NAV_DRAWER } from "./hooks/useMediaQuery";
import { useRevisaoCadastralGate } from "./hooks/useRevisaoCadastralGate";
import { useIdleSessionTimeout } from "./hooks/useIdleSessionTimeout";
// Layout (sempre carregados — usados em toda sessão)
import Sidebar from "./components/Sidebar";
import Header  from "./components/Header";
import SimuladorLoginBanner from "./components/SimuladorLoginBanner";
import { RevisaoCadastralGateModal } from "./components/RevisaoCadastralGateModal";
// Páginas de fluxo inicial (eager — Login e TrocarSenha bloqueiam antes do layout)
import Login                  from "./pages/geral/Login";
import TrocarSenhaObrigatorio from "./pages/geral/TrocarSenhaObrigatorio";
import CanalDenunciasSpinPage from "./pages/public/CanalDenunciasSpinPage";
import PainelNoticiasPage from "./pages/public/PainelNoticiasPage";
import { detectPublicUnauthenticatedRoute } from "./lib/publicRoutes";
import {
  buildLoginPath,
  parseAppPathname,
  PENDING_RETURN_PATH_KEY,
} from "./lib/appRoutes";

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
const SimuladorLogin         = lazyWithRetry(() => import("./pages/geral/SimuladorLogin"));
const Ajuda                  = lazyWithRetry(() => import("./pages/geral/Ajuda"));
const Streamers                  = lazyWithRetry(() => import("./pages/dashboards/Streamers"));
const AfiliadosDash              = lazyWithRetry(() => import("./pages/dashboards/AfiliadosDash"));
const DashboardOverviewInfluencer = lazyWithRetry(() => import("./pages/dashboards/DashboardOverviewInfluencer"));
const DashboardOverviewAfiliado  = lazyWithRetry(() => import("./pages/dashboards/DashboardOverviewAfiliado"));
const Headcount                   = lazyWithRetry(() => import("./pages/dashboards/Headcount"));
const OverviewPrestador           = lazyWithRetry(() => import("./pages/dashboards/OverviewPrestador"));
const OverviewSpin              = lazyWithRetry(() => import("./pages/dashboards/OverviewSpin"));
const SocialMediaDashboard      = lazyWithRetry(() => import("./pages/dashboards/SocialMediaDashboard"));
const Agenda     = lazyWithRetry(() => import("./pages/lives/Agenda"));
const Resultados = lazyWithRetry(() => import("./pages/lives/Resultados"));
const Feedback   = lazyWithRetry(() => import("./pages/lives/Feedback"));
const Influencers = lazyWithRetry(() => import("./pages/lives/Influencers"));
const Scout = lazyWithRetry(() => import("./pages/lives/Scout"));
const Financeiro  = lazyWithRetry(() => import("./pages/aquisicao/Financeiro"));
const BancaJogo   = lazyWithRetry(() => import("./pages/aquisicao/BancaJogo"));
const GestaoLinks = lazyWithRetry(() => import("./pages/marketing/GestaoLinks"));
const Campanhas = lazyWithRetry(() => import("./pages/marketing/Campanhas"));
const GaleriaFotos = lazyWithRetry(() => import("./pages/marketing/GaleriaFotos"));
const PipelineB2B = lazyWithRetry(() => import("./pages/comercial/PipelineB2B"));
const PipelineAgregadoras = lazyWithRetry(() => import("./pages/comercial/PipelineAgregadoras"));
const OverviewComercial = lazyWithRetry(() => import("./pages/comercial/OverviewComercial"));
const ComercialIntegracao = lazyWithRetry(() => import("./pages/comercial/Integracao"));
const CsAtendimento = lazyWithRetry(() => import("./pages/customerSuccess/Atendimento"));
const AfiliadosLista = lazyWithRetry(() => import("./pages/afiliados/Afiliados"));
const AfiliadosNetwork = lazyWithRetry(() => import("./pages/afiliados/Network"));
const GestaoDealers = lazyWithRetry(() => import("./pages/estudio/GestaoDealers"));
const CentralNotificacoes = lazyWithRetry(() => import("./pages/estudio/CentralNotificacoes"));
const RoteiroMesa = lazyWithRetry(() => import("./pages/estudio/RoteiroMesa"));
const PlaybookInfluencers = lazyWithRetry(() => import("./pages/conteudo/PlaybookInfluencers"));
const LinksMateriais = lazyWithRetry(() => import("./pages/conteudo/LinksMateriais"));
const SpinNaRede = lazyWithRetry(() => import("./pages/conteudo/SpinNaRede"));
const GestaoUsuarios = lazyWithRetry(() => import("./pages/plataforma/GestaoUsuarios"));
const GestaoOperadoras = lazyWithRetry(() => import("./pages/plataforma/GestaoOperadoras"));
const GestaoMesas = lazyWithRetry(() => import("./pages/plataforma/GestaoMesas"));
const StatusTecnico = lazyWithRetry(() => import("./pages/plataforma/StatusTecnico"));
const Figurinos = lazyWithRetry(() => import("./pages/estudio/Figurinos"));
const RhPrestadores = lazyWithRetry(() => import("./pages/rh/GestaoPrestador"));
const RhDadosCadastro = lazyWithRetry(() => import("./pages/rh/DadosCadastro"));
const RhOrganograma = lazyWithRetry(() => import("./pages/rh/Organograma"));
const RhVagas = lazyWithRetry(() => import("./pages/rh/Vagas"));
const RhSolicitacoes = lazyWithRetry(() => import("./pages/rh/Solicitacoes"));
const RhGestaoEscala = lazyWithRetry(() => import("./pages/rh/GestaoEscala"));
const RhGestaoStaff = lazyWithRetry(() => import("./pages/rh/GestaoStaff"));
const RhCalendario = lazyWithRetry(() => import("./pages/rh/Calendario"));
const EscalaMarketplaceTurnos = lazyWithRetry(() => import("./pages/escala/MarketplaceTurnos"));
const EscalaSolicitacoes = lazyWithRetry(() => import("./pages/escala/Solicitacoes"));
const EscalaRelatorioTurno = lazyWithRetry(() => import("./pages/escala/RelatorioTurno"));
const EscalaRotacao = lazyWithRetry(() => import("./pages/escala/Rotacao"));
const RhCentralDenuncias = lazyWithRetry(() => import("./pages/rh/CentralDenunciasSpin"));
const RhPortal = lazyWithRetry(() => import("./pages/conteudo/PortalRh"));
const Informativos = lazyWithRetry(() => import("./pages/conteudo/Informativos"));
const TechOpsGestaoEstoque = lazyWithRetry(() => import("./pages/techOps/GestaoEstoque"));
const TechOpsOrdemSaida = lazyWithRetry(() => import("./pages/techOps/OrdemSaida"));
const PerformanceHub = lazyWithRetry(() => import("./pages/academy/PerformanceHub"));
const PortalAcademy = lazyWithRetry(() => import("./pages/academy/PortalAcademy"));
const SemAcesso = lazyWithRetry(() => import("./pages/geral/SemAcesso"));

// ─── MAPA DE PÁGINAS ─────────────────────────────────────────────────────────
const PAGE_MAP: Record<string, LazyExoticComponent<ComponentType>> = {
  home:                     Home,
  streamers:                 Streamers,
  dash_afiliados:            AfiliadosDash,
  dash_overview_influencer:  DashboardOverviewInfluencer,
  dash_overview_afiliado:    DashboardOverviewAfiliado,
  dash_headcount:            Headcount,
  dash_overview_prestador:   OverviewPrestador,
  mesas_spin:               OverviewSpin,
  dash_midias_sociais:      SocialMediaDashboard,
  agenda:           Agenda,
  resultados:       Resultados,
  feedback:         Feedback,
  influencers:      Influencers,
  scout:            Scout,
  afiliados:         AfiliadosLista,
  afiliados_network: AfiliadosNetwork,
  financeiro:       Financeiro,
  banca_jogo:       BancaJogo,
  gestao_links:     GestaoLinks,
  campanhas:        Campanhas,
  galeria_fotos:    GaleriaFotos,
  comercial_overview: OverviewComercial,
  comercial_integracao: ComercialIntegracao,
  comercial_pipeline_b2b: PipelineB2B,
  comercial_pipeline_agregadoras: PipelineAgregadoras,
  cs_atendimento: CsAtendimento,
  gestao_dealers:   GestaoDealers,
  central_notificacoes: CentralNotificacoes,
  roteiro_mesa:     RoteiroMesa,
  playbook_influencers: PlaybookInfluencers,
  links_materiais:  LinksMateriais,
  spin_na_rede:     SpinNaRede,
  gestao_usuarios:  GestaoUsuarios,
  gestao_operadoras: GestaoOperadoras,
  gestao_mesas:     GestaoMesas,
  status_tecnico:   StatusTecnico,
  rh_figurinos:     Figurinos,
  rh_funcionarios:  RhPrestadores,
  rh_dados_cadastro: RhDadosCadastro,
  rh_organograma:    RhOrganograma,
  rh_vagas:          RhVagas,
  rh_solicitacoes:   RhSolicitacoes,
  rh_gestao_escala:  RhGestaoEscala,
  rh_staff:          RhGestaoStaff,
  rh_calendario:     RhCalendario,
  escala_marketplace_turnos: EscalaMarketplaceTurnos,
  escala_solicitacoes: EscalaSolicitacoes,
  escala_relatorio_turno: EscalaRelatorioTurno,
  escala_rotacao: EscalaRotacao,
  rh_central_denuncias: RhCentralDenuncias,
  rh_portal:         RhPortal,
  informativos:      Informativos,
  tech_ops_estoque:  TechOpsGestaoEstoque,
  tech_ops_ordem_saida: TechOpsOrdemSaida,
  academy_performance_hub: PerformanceHub,
  academy_portal: PortalAcademy,
  configuracoes:    Configuracoes,
  simulador_login:  SimuladorLogin,
  ajuda:            Ajuda,
};

const PageLoadingFallback = ({ background = "#0d0d12" }: { background?: string }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background,
      minHeight: 200,
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Loader2
        size={20}
        color="var(--brand-primary, #7c3aed)"
        strokeWidth={2}
        aria-hidden
        style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
      />
      <span style={{ fontSize: 14, color: "#e5dce1" }}>Carregando…</span>
    </div>
  </div>
);

// ─── APP LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { user, theme: t, activePage, layoutView, navigateTo, simulacaoLogin } = useApp();
  const [retryKey, setRetryKey] = useState(0);
  const navDrawer = useMediaQuery(MEDIA_MAX_NAV_DRAWER);
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    gateAtivo: revisaoGateAtivo,
    primeiroNome: revisaoPrimeiroNome,
    modalRevisaoAberto,
    fecharModalRevisao,
    irParaAtualizacaoCadastral,
  } = useRevisaoCadastralGate();

  useEffect(() => {
    if (!navDrawer) setMenuOpen(false);
  }, [navDrawer]);

  useEffect(() => {
    if (!navDrawer || !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navDrawer, menuOpen]);

  useEffect(() => {
    if (!navDrawer || !menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navDrawer, menuOpen]);

  if (!user || layoutView === "sem_acesso") return null;
  const PageComponent = PAGE_MAP[activePage] ?? Home;

  const go = (page: string) => {
    navigateTo(page as PageKey);
    setMenuOpen(false);
  };

  return (
    <div className="app-layout-shell" style={{ display: "flex", background: t.bg }}>
      {modalRevisaoAberto ? (
        <RevisaoCadastralGateModal
          primeiroNome={revisaoPrimeiroNome}
          onClose={fecharModalRevisao}
          onIrParaDadosCadastro={irParaAtualizacaoCadastral}
        />
      ) : null}
      {navDrawer && menuOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar
        activePage={activePage}
        onNavigate={go}
        isDrawer={navDrawer}
        drawerOpen={navDrawer && menuOpen}
      />
      <main
        className={`app-main-column${navDrawer ? " app-main-narrow" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginLeft: navDrawer ? 0 : 240,
        }}
      >
        <Header
          activePage={activePage}
          onNavigate={go}
          onLogout={onLogout}
          showMenuButton={navDrawer}
          onMenuClick={() => setMenuOpen((o) => !o)}
        />
        {simulacaoLogin ? <SimuladorLoginBanner /> : null}
        <div className="main-content" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", background: t.bg }}>
          {revisaoGateAtivo && activePage === "rh_dados_cadastro" ? (
            <div
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontFamily: "Inter, sans-serif",
                color: t.textMuted,
                borderBottom: `1px solid ${t.cardBorder}`,
                background: t.cardBg,
              }}
            >
              Conclua a atualização cadastral obrigatória nesta página para voltar a usar o restante do sistema.
            </div>
          ) : null}
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
  const {
    user,
    setUser,
    checking,
    routeReady,
    layoutView,
    operadoraHomeReady,
    operadoraBrand,
    effectiveRole,
    applyPathFromLocation,
    theme: t,
  } = useApp();
  const [, setNavEpoch] = useState(0);
  const publicRoute = detectPublicUnauthenticatedRoute();

  useEffect(() => {
    const onPop = () => {
      setNavEpoch((n) => n + 1);
      if (!detectPublicUnauthenticatedRoute()) applyPathFromLocation();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyPathFromLocation]);

  useEffect(() => {
    if (checking || !routeReady || user || publicRoute) return;
    const parsed = parseAppPathname(window.location.pathname);
    if (parsed.kind === "special" && parsed.special === "login") return;
    if (parsed.kind === "app") {
      const full = `${window.location.pathname}${window.location.search}`;
      sessionStorage.setItem(PENDING_RETURN_PATH_KEY, full);
    }
    const loginPath = buildLoginPath();
    if (window.location.pathname !== loginPath) {
      window.history.replaceState({}, "", loginPath);
    }
  }, [checking, routeReady, user, publicRoute]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setUser(null);
  }, [setUser]);

  useIdleSessionTimeout(!!user && routeReady && !checking, handleLogout);

  const aguardandoBrandOperador = effectiveRole === "operador" && !operadoraHomeReady;
  const bootBackground =
    effectiveRole === "operador"
      ? operadoraBrand?.brand_bg ?? "#0f0f1a"
      : "#0a0a0f";

  if (checking || !routeReady || aguardandoBrandOperador) {
    return (
      <div
        className="app-full-viewport-zoomed"
        style={{
          background: bootBackground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Loader2
            size={20}
            color="var(--brand-primary, #7c3aed)"
            strokeWidth={2}
            aria-hidden
            style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
          />
          <span style={{ fontSize: 14, color: effectiveRole === "operador" ? "var(--brand-text, #e5dce1)" : "#e5dce1" }}>
            Carregando…
          </span>
        </div>
      </div>
    );
  }
  if (publicRoute === "canal-denuncias") return <CanalDenunciasSpinPage />;
  if (publicRoute === "painel-noticias") return <PainelNoticiasPage />;
  if (!user) return <Login onLogin={setUser} />;
  if (user.must_change_password) return <TrocarSenhaObrigatorio />;
  if (layoutView === "sem_acesso") {
    return (
      <div
        className="app-full-viewport-zoomed"
        style={{
          minHeight: "100dvh",
          background: t.bg,
          overflowY: "auto",
        }}
      >
        <Suspense fallback={<PageLoadingFallback background={t.bg} />}>
          <SemAcesso />
        </Suspense>
      </div>
    );
  }
  return <AppLayout onLogout={handleLogout} />;
}

function ConfigError() {
  return (
    <div
      className="app-full-viewport-zoomed"
      style={{
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, sans-serif",
        color: "#e5dce1",
        textAlign: "center",
      }}
    >
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
