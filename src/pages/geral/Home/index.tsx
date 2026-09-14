import { lazy, Suspense, useState, useEffect, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { MENU } from "../../../constants/menu";
import { Role, type PageKey } from "../../../types";
import {
  GiMicrophone,
  GiTv,
  GiCalendar,
  GiPodium,
  GiConversation,
  GiStarMedal,
  GiShield,
  GiFactory,
  GiRadarSweep,
  GiNotebook,
  GiMegaphone,
  GiLinkedRings,
  GiCardRandom,
  GiCash,
  GiSpyglass,
  GiDiceSixFacesFour,
  GiShare,
  GiRoundTable,
} from "react-icons/gi";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { roleParidadeInfluencer } from "../../../lib/staffRoles";
import { AppPageLink } from "../../../components/AppPageLink";
import { useAppPageNav } from "../../../hooks/useAppPageNav";
import { BarraPesquisaPagina } from "../../../components/BarraPesquisaPagina";
import { SEARCH_PLACEHOLDER_ELLIPSIS } from "../../../lib/searchBarConstants";
import { textoContemBusca } from "../../../lib/searchText";
import {
  buscarFuncionarioRevisaoCadastralPorEmail,
  revisaoCadastralPendenteParaFuncionario,
  usuarioSujeitoGateRevisaoCadastral,
  REVISAO_CADASTRO_GATE_MODAL_CTA,
  REVISAO_CADASTRO_HOME_MENSAGEM,
  tituloAtualizacaoCadastralPendente,
} from "../../../lib/rhCadastroRevisao";
import { extrairPrimeiroNome } from "../../../lib/aniversarioHoje";

const HomeInvestidor = lazy(() => import("./HomeInvestidor"));
const HomeExecutivo = lazy(() => import("./HomeExecutivo"));
const HomePrestador = lazy(() => import("./HomePrestador"));
const HomeFigurino = lazy(() => import("./HomeFigurino"));
const HomeComunicacao = lazy(() => import("./HomeComunicacao"));
const HomePerformanceCoach = lazy(() => import("./HomePerformanceCoach"));
const HomeServiceManager = lazy(() => import("./HomeServiceManager"));
const HomeCustomerService = lazy(() => import("./HomeCustomerService"));
const HomeGamePresenter = lazy(() => import("./HomeGamePresenter"));
const HomeShuffler = lazy(() => import("./HomeShuffler"));
const HomeTechOps = lazy(() => import("./HomeTechOps"));
const HomeShiftLeader = lazy(() => import("./HomeShiftLeader"));
const HomeRh = lazy(() => import("./HomeRh"));
const HomeOperadorRouter = lazy(() => import("./operador/HomeOperadorRouter"));
const HomeAfiliado = lazy(() => import("./HomeAfiliado"));
const HomeInfluencer = lazy(() => import("./HomeInfluencer"));
const HomeAgencia = lazy(() => import("./HomeAgencia"));
const HomeGestorAquisicao = lazy(() => import("./HomeGestorAquisicao"));
const HomeGestorMarketing = lazy(() => import("./HomeGestorMarketing"));
const HomeGestorOperacoes = lazy(() => import("./HomeGestorOperacoes"));
const HomeGestorTechOps = lazy(() => import("./HomeGestorTechOps"));
const HomeGestorAcademy = lazy(() => import("./HomeGestorAcademy"));
const HomeGestorRh = lazy(() => import("./HomeGestorRh"));
const HomeAdmin = lazy(() => import("./HomeAdmin"));

function HomeChunkFallback() {
  const { theme: t } = useApp();
  return (
    <div
      className="app-page-shell"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        fontFamily: FONT.body,
      }}
    >
      <div style={{ textAlign: "center", color: t.textMuted }}>
        <Loader2
          size={24}
          className="app-lucide-spin"
          color="var(--brand-primary, #7c3aed)"
          aria-hidden
          style={{ marginBottom: 12 }}
        />
        <div style={{ fontSize: 13 }}>Carregando…</div>
      </div>
    </div>
  );
}

function withHomeSuspense(node: ReactNode) {
  return <Suspense fallback={<HomeChunkFallback />}>{node}</Suspense>;
}

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  ciano: "#70cae4",
  verde: "#22c55e",
  vermelho: "#e84025",
} as const;

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gestor_aquisicao: "Gestor de Aquisição",
  gestor_marketing: "Gestor de Marketing",
  gestor_operacoes: "Gestor de Operações",
  gestor_tech_ops: "Gestor de Tech Ops",
  gestor_academy: "Gestor de Academy",
  gestor_rh: "Gestor de RH",
  gestor_facilities: "Gestor de Facilities",
  gestor_ti: "Gestor de TI",
  prestador: "Prestadores",
  executivo: "Executivo",
  shift_leader: "Shift Leader",
  service_manager: "Service Manager",
  customer_service: "Customer Service",
  game_presenter: "Game Presenter",
  shuffler: "Shuffler",
  tech_ops: "Tech Ops",
  figurino: "Figurino",
  comunicacao: "Comunicação",
  facilities: "Facilities",
  ti: "TI",
  performance_coach: "Performance Coach",
  rh: "RH",
  influencer: "Influencer",
  afiliado: "Afiliado",
  investidor: "Investidor",
  operador: "Operador",
  agencia: "Agência",
};

/** Mensagens de boas-vindas por perfil */
const ROLE_WELCOME: Record<Role, { title: string; subtitle: string }> = {
  admin: {
    title: "Painel completo",
    subtitle:
      "Você tem acesso total à plataforma. Gerencie operadoras, usuários e visualize todos os dashboards.",
  },
  gestor_aquisicao: {
    title: "Gestão de Aquisição",
    subtitle:
      "Financeiro, banca de jogo e páginas liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_marketing: {
    title: "Gestão de Marketing",
    subtitle:
      "Campanhas, mídias e páginas liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_operacoes: {
    title: "Gestão de Operações",
    subtitle:
      "Estúdio, escala e páginas operacionais liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_tech_ops: {
    title: "Gestão de Tech Ops",
    subtitle:
      "Status técnico, estoque e páginas de Tech Ops liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_academy: {
    title: "Gestão de Academy",
    subtitle:
      "Performance Hub, portal da Academy e páginas liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_rh: {
    title: "Gestão de RH",
    subtitle:
      "Prestadores, escala e ferramentas de RH liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_facilities: {
    title: "Gestão de Facilities",
    subtitle:
      "Facilities e páginas liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  gestor_ti: {
    title: "Gestão de TI",
    subtitle:
      "TI e páginas liberadas ao seu perfil — ajuste fino em Gestão de Usuários.",
  },
  prestador: {
    title: "Área de atuação",
    subtitle:
      "Seu menu reflete as áreas atribuídas ao seu perfil. Em caso de dúvida sobre acessos, fale com o suporte.",
  },
  executivo: {
    title: "Dashboard executivo",
    subtitle:
      "Visualize métricas e páginas liberadas ao seu perfil em Gestão de Usuários — dados de todas as operadoras onde houver permissão de visualização.",
  },
  shift_leader: {
    title: "Shift Leader",
    subtitle:
      "Acompanhe operações e ferramentas liberadas para o seu perfil. Operadoras opcionais podem refinar o escopo de dados.",
  },
  service_manager: {
    title: "Service Manager",
    subtitle:
      "Gerencie fluxos de serviço e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  customer_service: {
    title: "Customer Service",
    subtitle:
      "Atendimento ao jogador e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  game_presenter: {
    title: "Game Presenter",
    subtitle:
      "Operação de mesa ao vivo e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  shuffler: {
    title: "Shuffler",
    subtitle:
      "Procedimentos de mesa e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  tech_ops: {
    title: "Tech Ops",
    subtitle:
      "Operação técnica do estúdio e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  figurino: {
    title: "Figurino",
    subtitle:
      "Foco em figurinos e fluxos de estúdio liberados ao seu perfil.",
  },
  comunicacao: {
    title: "Comunicação",
    subtitle:
      "Conteúdo, informativos e ferramentas de comunicação liberadas ao seu perfil.",
  },
  facilities: {
    title: "Facilities",
    subtitle:
      "Operação de Facilities e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  ti: {
    title: "TI",
    subtitle:
      "Operação de TI e páginas liberadas ao seu perfil. Ajuste fino em Gestão de Usuários.",
  },
  performance_coach: {
    title: "Performance Coach",
    subtitle:
      "Acompanhamento de performance e ferramentas liberadas ao seu perfil.",
  },
  rh: {
    title: "RH",
    subtitle:
      "Foco em prestadores, escala e ferramentas de RH liberadas ao seu perfil.",
  },
  influencer: {
    title: "Seu dashboard",
    subtitle: "Spin. Play. Win. Acompanhe cada passo da sua jornada.",
  },
  afiliado: {
    title: "Seu dashboard",
    subtitle: "Spin. Play. Win. Acompanhe cada passo da sua jornada.",
  },
  operador: {
    title: "Área da operadora",
    subtitle: "Acesse os dashboards e ferramentas liberados para sua operadora.",
  },
  agencia: {
    title: "Gestão de parceiros",
    subtitle: "Acompanhe os influencers e operadoras vinculados à sua agência.",
  },
  investidor: {
    title: "Visão de investimento",
    subtitle:
      "Acompanhe métricas e páginas liberadas ao seu perfil — sem escopo fixo de operadora ou influencer; o acesso é definido na aba Permissões.",
  },
};

/** Mapa page_key -> ícone para os atalhos */
const PAGE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  streamers: GiTv,
  dash_overview_influencer: GiMicrophone,
  mesas_spin: GiDiceSixFacesFour,
  dash_midias_sociais: GiShare,
  agenda: GiCalendar,
  resultados: GiPodium,
  feedback: GiConversation,
  influencers: GiStarMedal,
  scout: GiSpyglass,
  financeiro: GiCash,
  gestao_links: GiLinkedRings,
  campanhas: GiMegaphone,
  gestao_dealers: GiCardRandom,
  roteiro_mesa: GiNotebook,
  gestao_usuarios: GiShield,
  gestao_operadoras: GiFactory,
  gestao_mesas: GiRoundTable,
  status_tecnico: GiRadarSweep,
};

export default function Home() {
  const {
    theme: t,
    user,
    effectiveRole,
    permissions,
    permissionsAcoes,
    operadoraBrand,
    isDark,
    simulacaoLogin,
    simulacaoSomenteLeitura,
  } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { propsFor } = useAppPageNav();

  const [revisaoCadastralPendenteHome, setRevisaoCadastralPendenteHome] = useState(false);
  const [revisaoCadastralHomeReady, setRevisaoCadastralHomeReady] = useState(false);
  const [buscaAtalho, setBuscaAtalho] = useState("");

  useEffect(() => {
    const roleGate = effectiveRole ?? user?.role;
    const homesDedicadas: Role[] = [
      "investidor",
      "executivo",
      "prestador",
      "figurino",
      "comunicacao",
      "performance_coach",
      "service_manager",
      "customer_service",
      "game_presenter",
      "shuffler",
      "tech_ops",
      "shift_leader",
      "rh",
      "operador",
      "agencia",
    ];
    if (roleGate && (homesDedicadas.includes(roleGate) || roleParidadeInfluencer(roleGate))) {
      setRevisaoCadastralPendenteHome(false);
      setRevisaoCadastralHomeReady(true);
      return;
    }

    if (!user?.email?.trim()) {
      setRevisaoCadastralPendenteHome(false);
      setRevisaoCadastralHomeReady(true);
      return;
    }
    const permEditar = permissionsAcoes.rh_dados_cadastro?.editar ?? null;
    if (simulacaoSomenteLeitura || !usuarioSujeitoGateRevisaoCadastral(user.role, permEditar)) {
      setRevisaoCadastralPendenteHome(false);
      setRevisaoCadastralHomeReady(true);
      return;
    }
    let cancelled = false;
    setRevisaoCadastralHomeReady(false);
    void (async () => {
      const row = await buscarFuncionarioRevisaoCadastralPorEmail(user.email);
      if (!cancelled) {
        setRevisaoCadastralPendenteHome(revisaoCadastralPendenteParaFuncionario(row));
        setRevisaoCadastralHomeReady(true);
      }
    })();
    const onAtualizado = () => {
      void (async () => {
        const row = await buscarFuncionarioRevisaoCadastralPorEmail(user.email);
        if (!cancelled) setRevisaoCadastralPendenteHome(revisaoCadastralPendenteParaFuncionario(row));
      })();
    };
    window.addEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
    return () => {
      cancelled = true;
      window.removeEventListener("rh-cadastro-revisao-atualizada", onAtualizado);
    };
  }, [user, permissionsAcoes.rh_dados_cadastro?.editar, simulacaoSomenteLeitura, effectiveRole]);

  if (!user) return null;

  const roleHome = effectiveRole ?? user.role;

  if (roleHome === "investidor") {
    return withHomeSuspense(<HomeInvestidor />);
  }

  if (roleHome === "executivo") {
    return withHomeSuspense(<HomeExecutivo />);
  }

  if (roleHome === "prestador") {
    return withHomeSuspense(<HomePrestador />);
  }

  if (roleHome === "figurino") {
    return withHomeSuspense(<HomeFigurino />);
  }

  if (roleHome === "comunicacao") {
    return withHomeSuspense(<HomeComunicacao />);
  }

  if (roleHome === "performance_coach") {
    return withHomeSuspense(<HomePerformanceCoach />);
  }

  if (roleHome === "service_manager") {
    return withHomeSuspense(<HomeServiceManager />);
  }

  if (roleHome === "customer_service") {
    return withHomeSuspense(<HomeCustomerService />);
  }

  if (roleHome === "game_presenter") {
    return withHomeSuspense(<HomeGamePresenter />);
  }

  if (roleHome === "shuffler") {
    return withHomeSuspense(<HomeShuffler />);
  }

  if (roleHome === "tech_ops") {
    return withHomeSuspense(<HomeTechOps />);
  }

  if (roleHome === "shift_leader") {
    return withHomeSuspense(<HomeShiftLeader />);
  }

  if (roleHome === "rh") {
    return withHomeSuspense(<HomeRh />);
  }

  if (roleHome === "operador") {
    return withHomeSuspense(<HomeOperadorRouter />);
  }

  if (roleHome === "afiliado") {
    return withHomeSuspense(<HomeAfiliado />);
  }

  if (roleHome === "influencer") {
    return withHomeSuspense(<HomeInfluencer />);
  }

  if (roleHome === "agencia") {
    return withHomeSuspense(<HomeAgencia />);
  }

  if (roleHome === "gestor_aquisicao") {
    return withHomeSuspense(<HomeGestorAquisicao />);
  }

  if (roleHome === "gestor_marketing") {
    return withHomeSuspense(<HomeGestorMarketing />);
  }

  if (roleHome === "gestor_operacoes") {
    return withHomeSuspense(<HomeGestorOperacoes />);
  }

  if (roleHome === "gestor_tech_ops") {
    return withHomeSuspense(<HomeGestorTechOps />);
  }

  if (roleHome === "gestor_academy") {
    return withHomeSuspense(<HomeGestorAcademy />);
  }

  if (roleHome === "gestor_rh") {
    return withHomeSuspense(<HomeGestorRh />);
  }

  if (roleHome === "admin") {
    return withHomeSuspense(<HomeAdmin />);
  }

  const role = roleHome;
  const welcome = ROLE_WELCOME[role];
  const useBrand = false;

  const atalhos: { key: PageKey; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [];
  for (const sec of MENU) {
    for (const item of sec.items) {
      if (permissions[item.key] === "sim" || permissions[item.key] === "proprios") {
        atalhos.push({
          key: item.key as PageKey,
          label: item.label,
          icon: PAGE_ICONS[item.key] ?? item.icon,
        });
      }
    }
  }

  const atalhosOrdenados = [...atalhos];
  const atalhosVisiveis = buscaAtalho.trim()
    ? atalhosOrdenados.filter((a) => textoContemBusca(a.label, buscaAtalho))
    : atalhosOrdenados;
  const accentColor = useBrand ? "var(--brand-primary)" : BRAND.roxoVivo;
  const cardBg = useBrand && operadoraBrand?.brand_bg ? operadoraBrand.brand_bg : t.cardBg;

  const nomeBoasVindas = (nomeEfetivo || user.name || "").trim() || "usuário";
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (user.name || user.email || "?");
  const welcomeInitial = welcomeAvatarLabel[0]?.toUpperCase() ?? "?";

  const showRevisaoCadastralAlert =
    revisaoCadastralHomeReady && revisaoCadastralPendenteHome;

  const alertBoxStyle: React.CSSProperties = {
    display: "flex",
    gap: 14,
    padding: "16px 18px",
    borderRadius: 14,
    background: isDark ? "rgba(232,64,37,0.08)" : "rgba(232,64,37,0.05)",
    border: "1px solid rgba(232,64,37,0.28)",
    borderLeft: `4px solid ${BRAND.vermelho}`,
    marginBottom: 24,
  };

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      {/* Card de boas-vindas */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          padding: 28,
          marginBottom: 28,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: useBrand
              ? "linear-gradient(90deg, var(--brand-primary), var(--brand-accent))"
              : `linear-gradient(90deg, ${BRAND.roxoVivo}, ${BRAND.azul})`,
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              flexShrink: 0,
              background: useBrand
                ? "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
                : `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 20,
              fontFamily: FONT.body,
              border: `2px solid ${useBrand ? "color-mix(in srgb, var(--brand-primary) 50%, transparent)" : "rgba(124, 58, 237, 0.45)"}`,
            }}
            aria-hidden
          >
            {welcomeInitial}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT_TITLE,
                letterSpacing: "0.02em",
                marginBottom: 6,
              }}
            >
              Olá, {nomeBoasVindas}!
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
              {ROLE_LABELS[role]}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.5 }}>
              {welcome.subtitle}
            </p>
            {simulacaoLogin ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
                Sua conta não muda — você continua como {user.name}. Visualização: {simulacaoLogin.labelExibicao}.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {showRevisaoCadastralAlert && (
        <div style={alertBoxStyle}>
          <AlertTriangle size={20} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: isDark ? "#ff9980" : "#b02a14",
                letterSpacing: "0.06em",
                marginBottom: 8,
                fontFamily: FONT_TITLE,
              }}
            >
              {tituloAtualizacaoCadastralPendente(extrairPrimeiroNome(user.name?.trim() || "Colaborador"))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.65, marginBottom: 12 }}>
              {REVISAO_CADASTRO_HOME_MENSAGEM}
            </p>
            <a
              {...propsFor("rh_dados_cadastro")}
              style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 10,
                border: `1px solid ${BRAND.vermelho}`,
                background: `${BRAND.vermelho}18`,
                color: BRAND.vermelho,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT.body,
                textDecoration: "none",
              }}
            >
              {REVISAO_CADASTRO_GATE_MODAL_CTA}
            </a>
          </div>
        </div>
      )}

      {/* Acesso rápido */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: 13,
            fontWeight: 800,
            color: t.sectionTitle,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Acesso rápido
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
          Clique em um atalho abaixo para ir diretamente à página desejada.
        </p>

        {atalhosOrdenados.length > 8 ? (
          <div style={{ marginBottom: 14 }}>
            <BarraPesquisaPagina
              value={buscaAtalho}
              onChange={setBuscaAtalho}
              placeholder={`Pesquisar atalho${SEARCH_PLACEHOLDER_ELLIPSIS}`}
              aria-label="Pesquisar atalho no acesso rápido"
              wrapperStyle={{ width: "100%" }}
            />
          </div>
        ) : null}

        {atalhosOrdenados.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>
            Nenhuma página disponível no momento.
          </p>
        ) : atalhosVisiveis.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>
            Nenhum atalho encontrado para a busca.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
              gap: 12,
            }}
          >
            {atalhosVisiveis.map((atalho) => {
              const Icon = atalho.icon;
              return (
                <a
                  key={atalho.key}
                  {...propsFor(atalho.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `1px solid ${t.cardBorder}`,
                    background: t.inputBg ?? t.cardBg,
                    color: t.text,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = useBrand
                      ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)"
                      : "rgba(124, 58, 237, 0.12)";
                    e.currentTarget.style.borderColor = accentColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = t.inputBg ?? t.cardBg;
                    e.currentTarget.style.borderColor = t.cardBorder;
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: useBrand
                        ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)"
                        : "rgba(74, 32, 130, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={accentColor} />
                  </span>
                  <span style={{ flex: 1 }}>{atalho.label}</span>
                  <ArrowRight size={14} color={t.textMuted} />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Informações */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: 13,
            fontWeight: 800,
            color: t.sectionTitle,
            fontFamily: FONT_TITLE,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Informações
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
          Use o menu lateral para navegar entre as seções. Em caso de dúvidas, acesse a página de{" "}
          <AppPageLink
            pageKey="ajuda"
            style={{
              font: "inherit",
              fontWeight: 700,
              color: accentColor,
              display: "inline",
            }}
          >
            AJUDA
          </AppPageLink>{" "}
          da plataforma ou pelo ícone do seu perfil no canto superior direito.
        </p>
      </div>
    </div>
  );
}
