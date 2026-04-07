import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { MENU } from "../../../constants/menu";
import { Role, Live, LiveResultado } from "../../../types";
import { supabase } from "../../../lib/supabase";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { PLAYBOOK_ITENS_OBRIGATORIOS } from "../../../constants/playbookGuia";
import { PLAT_LOGO, PLAT_LOGO_DARK } from "../../../constants/platforms";
import {
  GiHistogram,
  GiMicrophone,
  GiConvergenceTarget,
  GiMoneyStack,
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
  GiPerson,
  GiShare,
} from "react-icons/gi";
import { ArrowRight, AlertTriangle } from "lucide-react";

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
  gestor: "Gestor",
  executivo: "Executivo",
  influencer: "Influencer",
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
  gestor: {
    title: "Visão geral",
    subtitle:
      "Acesse todos os dashboards e operações. Gerencie campanhas, influencers e acompanhe métricas.",
  },
  executivo: {
    title: "Dashboard executivo",
    subtitle:
      "Visualize métricas gerais, conversão e performance dos influencers nas suas operadoras.",
  },
  influencer: {
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
};

/** Mapa page_key -> ícone para os atalhos */
const PAGE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  dash_overview: GiHistogram,
  dash_overview_influencer: GiMicrophone,
  dash_conversao: GiConvergenceTarget,
  dash_financeiro: GiMoneyStack,
  mesas_spin: GiDiceSixFacesFour,
  jogadores_spin: GiPerson,
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
  const { theme: t, user, permissions, operadoraBrand, setActivePage, isDark } = useApp();

  const [influencerHomeReady, setInfluencerHomeReady] = useState(false);
  const [perfilRow, setPerfilRow] = useState<PerfilRow | null>(null);
  const [playbookPendente, setPlaybookPendente] = useState(false);
  const [livesFuturas, setLivesFuturas] = useState<Live[]>([]);
  const [livesRealizadasRecentes, setLivesRealizadasRecentes] = useState<Live[]>([]);
  const [resultadosPorLive, setResultadosPorLive] = useState<Record<string, LiveResultado>>({});

  useEffect(() => {
    if (!user || user.role !== "influencer") {
      setInfluencerHomeReady(true);
      return;
    }

    let cancelled = false;
    const uid = user.id;

    async function loadInfluencerHome() {
      setInfluencerHomeReady(false);
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
          .select("*")
          .eq("influencer_id", uid)
          .eq("status", "agendada")
          .order("data", { ascending: true })
          .order("horario", { ascending: true }),
        supabase
          .from("lives")
          .select("*")
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
        const { data: resRows } = await supabase.from("live_resultados").select("*").in("live_id", ids);
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
  }, [user?.id, user?.role]);

  if (!user) return null;

  const role = user.role;
  const welcome = ROLE_WELCOME[role];
  const useBrand = role === "operador" && !!operadoraBrand;

  const atalhos: { key: string; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [];
  for (const sec of MENU) {
    for (const item of sec.items) {
      if (permissions[item.key] === "sim" || permissions[item.key] === "proprios") {
        atalhos.push({
          key: item.key,
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
  if (role === "operador") {
    const preferidos = ["dash_overview", "dash_overview_influencer", "agenda", "influencers"];
    atalhosOrdenados.sort((a, b) => {
      const ia = preferidos.indexOf(a.key);
      const ib = preferidos.indexOf(b.key);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.label.localeCompare(b.label);
    });
  }

  const accentColor = useBrand ? "var(--brand-primary)" : BRAND.roxoVivo;
  const cardBg = useBrand && operadoraBrand?.cor_background ? operadoraBrand.cor_background : t.cardBg;

  const nomePerfil = perfilRow?.nome_artistico?.trim() || user.name;
  const welcomeAvatarLabel = perfilRow?.nome_artistico?.trim() || user.name || user.email || "?";
  const welcomeInitial = welcomeAvatarLabel[0]?.toUpperCase() ?? "?";

  const showPerfilIncompleto =
    role === "influencer" &&
    influencerHomeReady &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(perfilRow, nomePerfil);

  const showPlaybookAlert =
    role === "influencer" && influencerHomeReady && playbookPendente;

  const showProximasLives =
    role === "influencer" && influencerHomeReady && livesFuturas.length > 0;

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
              Olá, {user.name}!
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: t.textMuted, marginBottom: 8 }}>
              {ROLE_LABELS[role]}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.5 }}>
              {welcome.subtitle}
            </p>
          </div>
        </div>
      </div>

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
              Você ainda não concluiu o seu cadastro, isso impede o pagamento das lives realizadas. Acesse a página
              Influencers e preencha todos os itens pendentes das suas informações.
            </p>
            <button
              type="button"
              onClick={() => setActivePage("influencers")}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: `1px solid ${BRAND.vermelho}`,
                background: `${BRAND.vermelho}18`,
                color: BRAND.vermelho,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              Ir para Influencers
            </button>
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
              Você ainda não confirmou todos os itens obrigatórios do Playbook. Acesse as abas{" "}
              <strong>Dealers</strong>, <strong>Agendamento</strong> e <strong>Jogos</strong> na página Playbook para dar
              sua ciência.
            </p>
            <button
              type="button"
              onClick={() => setActivePage("playbook_influencers")}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: `1px solid ${BRAND.vermelho}`,
                background: `${BRAND.vermelho}18`,
                color: BRAND.vermelho,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: FONT.body,
              }}
            >
              Ir para Playbook
            </button>
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

        {atalhosOrdenados.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>
            Nenhuma página disponível no momento.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
              gap: 12,
            }}
          >
            {atalhosOrdenados.map((atalho) => {
              const Icon = atalho.icon;
              return (
                <button
                  key={atalho.key}
                  onClick={() => setActivePage(atalho.key)}
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
                </button>
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
          <button
            type="button"
            onClick={() => setActivePage("ajuda")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              fontWeight: 700,
              color: accentColor,
              textDecoration: "underline",
              cursor: "pointer",
              display: "inline",
            }}
          >
            AJUDA
          </button>{" "}
          da plataforma ou pelo ícone do seu perfil no canto superior direito.
        </p>
      </div>
    </div>
  );
}
