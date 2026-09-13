import { lazy, Suspense, useState, useEffect, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { MENU } from "../../../constants/menu";
import { Role, Live, LiveResultado, type PageKey } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { PLAYBOOK_ITENS_OBRIGATORIOS } from "../../../constants/playbookGuia";
import { PLAT_LOGO, PLAT_LOGO_DARK } from "../../../constants/platforms";
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

const LIVE_HOME_COLS = "id, data, horario, plataforma, titulo, observacao, status";
const LIVE_RESULTADO_HOME_COLS = "live_id, duracao_horas, duracao_min, media_views, max_views";

function dataLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

function parseLiveLocal(data: string, horario: string): Date {
  const [y, mo, d] = data.split("-").map((x) => parseInt(x, 10));
  const parts = (horario || "00:00").split(":");
  const hh = parseInt(parts[0] ?? "0", 10) || 0;
  const mm = parseInt(parts[1] ?? "0", 10) || 0;
  const ss = parseInt(parts[2] ?? "0", 10) || 0;
  return new Date(y, mo - 1, d, hh, mm, ss);
}

function fmtDataHoraLive(data: string, horario: string): string {
  const dt = parseLiveLocal(data, horario);
  return dt.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuracao(r: LiveResultado | undefined): string {
  if (!r) return "—";
  const h = r.duracao_horas ?? 0;
  const m = r.duracao_min ?? 0;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  if (m) return `${m}min`;
  return "—";
}

function PlatLogoHome({
  plataforma,
  size = 20,
  isDark,
}: {
  plataforma: string;
  size?: number;
  isDark: boolean;
}) {
  const [err, setErr] = useState(false);
  const src = isDark
    ? PLAT_LOGO_DARK[plataforma] ?? PLAT_LOGO[plataforma]
    : PLAT_LOGO[plataforma];
  if (err || !src) {
    return (
      <span style={{ fontSize: size * 0.65, opacity: 0.6 }} title={plataforma}>
        ●
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={plataforma}
      width={size}
      height={size}
      onError={() => setErr(true)}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gestor_aquisicao: "Gestor de Aquisição",
  gestor_marketing: "Gestor de Marketing",
  gestor_operacoes: "Gestor de Operações",
  gestor_tech_ops: "Gestor de Tech Ops",
  gestor_academy: "Gestor de Academy",
  gestor_rh: "Gestor de RH",
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

type PerfilRow = {
  nome_artistico?: string | null;
  nome_completo?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  cache_hora?: number | null;
  chave_pix?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  status?: string | null;
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
    dadosUsuarioEfetivo,
  } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const { propsFor } = useAppPageNav();

  const [influencerHomeReady, setInfluencerHomeReady] = useState(false);
  const [perfilRow, setPerfilRow] = useState<PerfilRow | null>(null);
  const [playbookPendente, setPlaybookPendente] = useState(false);
  const [livesFuturas, setLivesFuturas] = useState<Live[]>([]);
  const [livesRealizadasRecentes, setLivesRealizadasRecentes] = useState<Live[]>([]);
  const [resultadosPorLive, setResultadosPorLive] = useState<Record<string, LiveResultado>>({});
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

  useEffect(() => {
    const roleDados = effectiveRole ?? user?.role;
    if (!user || roleDados !== "influencer") {
      setInfluencerHomeReady(true);
      setPerfilRow(null);
      setPlaybookPendente(false);
      setLivesFuturas([]);
      setLivesRealizadasRecentes([]);
      return;
    }

    let cancelled = false;
    const uid = dadosUsuarioEfetivo?.id ?? user.id;

    async function loadInfluencerHome() {
      setInfluencerHomeReady(false);
      const hojeIso = dataLocalIso(new Date());
      const [perfilRes, confRes, agRes, realRes] = await Promise.all([
        supabase
          .from("influencer_perfil")
          .select(
            "nome_artistico, nome_completo, telefone, cpf, cache_hora, chave_pix, banco, agencia, conta, status"
          )
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("guia_confirmacoes").select("item_key").eq("influencer_id", uid),
        supabase
          .from("lives")
          .select(LIVE_HOME_COLS)
          .eq("influencer_id", uid)
          .eq("status", "agendada")
          .gte("data", hojeIso)
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
        supabase
          .from("lives")
          .select(LIVE_HOME_COLS)
          .eq("influencer_id", uid)
          .eq("status", "realizada")
          .order("data", { ascending: false })
          .order("horario", { ascending: false })
          .limit(4),
      ]);

      if (cancelled) return;

      setPerfilRow((perfilRes.data as PerfilRow) ?? null);

      const keysOk = new Set((confRes.data ?? []).map((r: { item_key: string }) => r.item_key));
      const faltaPlaybook = PLAYBOOK_ITENS_OBRIGATORIOS.some((k) => !keysOk.has(k));
      setPlaybookPendente(faltaPlaybook);

      const now = new Date();
      const agendadas = (agRes.data ?? []) as Live[];
      setLivesFuturas(
        agendadas.filter((l) => parseLiveLocal(l.data, l.horario).getTime() > now.getTime())
      );

      const realizadas = (realRes.data ?? []) as Live[];
      setLivesRealizadasRecentes(realizadas);

      const ids = realizadas.map((l) => l.id);
      const map: Record<string, LiveResultado> = {};
      if (ids.length > 0) {
        const { data: resRows } = await supabase
          .from("live_resultados")
          .select(LIVE_RESULTADO_HOME_COLS)
          .in("live_id", ids);
        if (resRows) {
          (resRows as LiveResultado[]).forEach((r) => {
            map[r.live_id] = r;
          });
        }
      }
      if (!cancelled) setResultadosPorLive(map);
      if (!cancelled) setInfluencerHomeReady(true);
    }

    void loadInfluencerHome();
    return () => {
      cancelled = true;
    };
  }, [user, effectiveRole, dadosUsuarioEfetivo?.id]);

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
  if (role === "influencer" || role === "agencia") {
    const idxOverview = atalhosOrdenados.findIndex((a) => a.key === "dash_overview_influencer");
    if (idxOverview > 0) {
      const [item] = atalhosOrdenados.splice(idxOverview, 1);
      atalhosOrdenados.unshift(item);
    }
  }
  const atalhosVisiveis = buscaAtalho.trim()
    ? atalhosOrdenados.filter((a) => textoContemBusca(a.label, buscaAtalho))
    : atalhosOrdenados;
  const accentColor = useBrand ? "var(--brand-primary)" : BRAND.roxoVivo;
  const cardBg = useBrand && operadoraBrand?.brand_bg ? operadoraBrand.brand_bg : t.cardBg;

  const nomePerfil = perfilRow?.nome_artistico?.trim() || dadosUsuarioEfetivo?.name || user.name;
  const nomeBoasVindas =
    (perfilRow?.nome_artistico || nomeEfetivo || user.name || "").trim() || "usuário";
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (perfilRow?.nome_artistico?.trim() || user.name || user.email || "?");
  const welcomeInitial = welcomeAvatarLabel[0]?.toUpperCase() ?? "?";

  const showPerfilIncompleto =
    role === "influencer" &&
    influencerHomeReady &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(perfilRow, nomePerfil);

  const showPlaybookAlert = role === "influencer" && influencerHomeReady && playbookPendente;

  const showRevisaoCadastralAlert =
    revisaoCadastralHomeReady && revisaoCadastralPendenteHome;

  const showProximasLives = role === "influencer" && influencerHomeReady && livesFuturas.length > 0;

  const showFeedbacksRecentes =
    role === "influencer" && influencerHomeReady && livesRealizadasRecentes.length > 0;

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

      {role === "influencer" && !influencerHomeReady ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 0 24px",
            color: t.textMuted,
            fontSize: 13,
            fontFamily: FONT.body,
          }}
          role="status"
        >
          <Loader2 className="app-lucide-spin" size={16} color="var(--brand-primary, #7c3aed)" aria-hidden />
          Carregando…
        </div>
      ) : null}

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

      {showPerfilIncompleto && (
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
              AÇÃO NECESSÁRIA
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.65, marginBottom: 12 }}>
              {simulacaoLogin
                ? `Cadastro incompleto no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. Na visualização, o menu segue esse perfil (somente leitura).`
                : "Você ainda não concluiu o seu cadastro, isso impede o pagamento das lives realizadas. Acesse a página Influencers e preencha todos os itens pendentes das suas informações."}
            </p>
            <a
              {...propsFor("influencers")}
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
              Ir para Influencers
            </a>
          </div>
        </div>
      )}

      {showPlaybookAlert && (
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
              AÇÃO NECESSÁRIA
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.65, marginBottom: 12 }}>
              {simulacaoLogin ? (
                `Playbook pendente no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. A visualização é somente leitura.`
              ) : (
                <>
                  Você ainda não confirmou todos os itens obrigatórios do Playbook. Acesse as abas{" "}
                  <strong>Game Presenters</strong>, <strong>Agendamento</strong> e <strong>Jogos</strong> na página Playbook para
                  dar sua ciência.
                </>
              )}
            </p>
            <a
              {...propsFor("playbook_influencers")}
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
              Ir para Playbook
            </a>
          </div>
        </div>
      )}

      {showProximasLives && (
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
              margin: "0 0 14px 0",
              fontSize: 13,
              fontWeight: 800,
              color: t.sectionTitle,
              fontFamily: FONT_TITLE,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Próximas lives
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
              gap: 12,
            }}
          >
            {livesFuturas.map((live) => (
              <div
                key={live.id}
                style={{
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: t.inputBg ?? t.cardBg,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10, lineHeight: 1.4 }}>
                  {fmtDataHoraLive(live.data, live.horario)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PlatLogoHome plataforma={live.plataforma} size={22} isDark={isDark} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted }}>{live.plataforma}</span>
                </div>
                {live.titulo ? (
                  <p style={{ margin: "10px 0 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
                    {live.titulo}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showFeedbacksRecentes && (
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
              margin: "0 0 14px 0",
              fontSize: 13,
              fontWeight: 800,
              color: t.sectionTitle,
              fontFamily: FONT_TITLE,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Feedbacks recentes
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
              gap: 12,
            }}
          >
            {livesRealizadasRecentes.map((live) => {
              const res = resultadosPorLive[live.id];
              const obs = live.observacao?.trim();
              return (
                <div
                  key={live.id}
                  style={{
                    border: `1px solid ${t.cardBorder}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    background: t.inputBg ?? t.cardBg,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 10, lineHeight: 1.4 }}>
                    {fmtDataHoraLive(live.data, live.horario)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <PlatLogoHome plataforma={live.plataforma} size={22} isDark={isDark} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textMuted }}>{live.plataforma}</span>
                  </div>
                  {obs ? (
                    <p style={{ margin: "0 0 10px 0", fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 700, color: t.text }}>Obs.: </span>
                      {obs}
                    </p>
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      fontSize: 12,
                      color: t.textMuted,
                      borderTop: `1px solid ${t.cardBorder}`,
                      paddingTop: 10,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: t.sectionTitle }}>Duração: </span>
                      {fmtDuracao(res)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: t.sectionTitle }}>Média de views: </span>
                      {res?.media_views != null ? res.media_views.toLocaleString("pt-BR") : "—"}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: t.sectionTitle }}>Pico de views: </span>
                      {res?.max_views != null ? res.max_views.toLocaleString("pt-BR") : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
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
