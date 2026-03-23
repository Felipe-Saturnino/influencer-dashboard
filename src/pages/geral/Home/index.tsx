import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { MENU } from "../../../constants/menu";
import { Role } from "../../../types";
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
  GiShare,
  GiTheaterCurtains,
} from "react-icons/gi";
import { ArrowRight } from "lucide-react";

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  ciano: "#70cae4",
  verde: "#22c55e",
} as const;

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
    subtitle: "Você tem acesso total à plataforma. Gerencie operadoras, usuários e visualize todos os dashboards.",
  },
  gestor: {
    title: "Visão geral",
    subtitle: "Acesse todos os dashboards e operações. Gerencie campanhas, influencers e acompanhe métricas.",
  },
  executivo: {
    title: "Dashboard executivo",
    subtitle: "Visualize métricas gerais, conversão e performance dos influencers nas suas operadoras.",
  },
  influencer: {
    title: "Seu dashboard",
    subtitle: "Acompanhe suas métricas, lives realizadas, FTDs e performance nas operadoras vinculadas.",
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
  casting_dealers: GiTheaterCurtains,
  roteiro_mesa: GiNotebook,
  gestao_usuarios: GiShield,
  gestao_operadoras: GiFactory,
  status_tecnico: GiRadarSweep,
};

export default function Home() {
  const { theme: t, user, permissions, operadoraBrand, setActivePage } = useApp();

  if (!user) return null;

  const role = user.role;
  const welcome = ROLE_WELCOME[role];
  const useBrand = role === "operador" && !!operadoraBrand;

  // Coleta itens do menu que o usuário pode acessar (sim ou proprios)
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

  // Para influencer/operador: prioriza itens mais relevantes
  const atalhosOrdenados = [...atalhos];
  if (role === "influencer" || role === "agencia") {
    // Overview Influencer primeiro
    const idxOverview = atalhosOrdenados.findIndex((a) => a.key === "dash_overview_influencer");
    if (idxOverview > 0) {
      const [item] = atalhosOrdenados.splice(idxOverview, 1);
      atalhosOrdenados.unshift(item);
    }
  }
  if (role === "operador") {
    // Overview e Agenda tendem a ser os principais
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

  return (
    <div style={{ padding: "32px 24px 48px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
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
              borderRadius: 14,
              background: useBrand
                ? "color-mix(in srgb, var(--brand-primary) 20%, transparent)"
                : "rgba(124, 58, 237, 0.2)",
              border: `1px solid ${useBrand ? "color-mix(in srgb, var(--brand-primary) 40%, transparent)" : "rgba(124, 58, 237, 0.4)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <GiHistogram size={26} color={accentColor} />
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

      {/* Informações padrão (todos os perfis) */}
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
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
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

      {/* Bloco informativo padrão */}
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
          Use o menu lateral para navegar entre as seções. Em caso de dúvidas, acesse{" "}
          <strong style={{ color: t.text }}>Ajuda</strong> pelo ícone do seu perfil no canto superior
          direito.
        </p>
      </div>
    </div>
  );
}
