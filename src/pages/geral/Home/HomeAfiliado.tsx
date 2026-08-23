import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { MENU } from "../../../constants/menu";
import type { PageKey } from "../../../types";
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
import { ArrowRight, AlertTriangle, Handshake, Users, Network, BookOpen } from "lucide-react";
import { AppPageLink } from "../../../components/AppPageLink";
import { useAppPageNav } from "../../../hooks/useAppPageNav";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import {
  AFILIADO_HOME_CADASTRO_INCOMPLETO_CTA,
  AFILIADO_HOME_CADASTRO_INCOMPLETO_MENSAGEM,
} from "../../../lib/homeAfiliadoCopy";
import { useHomeAfiliadoData } from "./hooks/useHomeAfiliadoData";

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
} as const;

const ROLE_LABEL_AFILIADO = "Afiliado";

const WELCOME_SUBTITLE = "Spin. Play. Win. Acompanhe cada passo da sua jornada.";

/** Mapa page_key -> ícone para os atalhos (legado Home). */
const PAGE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  streamers: GiTv,
  dash_overview_influencer: GiMicrophone,
  dash_overview_afiliado: Users,
  mesas_spin: GiDiceSixFacesFour,
  dash_midias_sociais: GiShare,
  agenda: GiCalendar,
  resultados: GiPodium,
  feedback: GiConversation,
  influencers: GiStarMedal,
  scout: GiSpyglass,
  afiliados: Handshake,
  afiliados_network: Network,
  financeiro: GiCash,
  gestao_links: GiLinkedRings,
  campanhas: GiMegaphone,
  gestao_dealers: GiCardRandom,
  roteiro_mesa: GiNotebook,
  gestao_usuarios: GiShield,
  gestao_operadoras: GiFactory,
  gestao_mesas: GiRoundTable,
  status_tecnico: GiRadarSweep,
  playbook_influencers: BookOpen,
};

export default function HomeAfiliado() {
  const {
    theme: t,
    user,
    permissions,
    isDark,
    simulacaoLogin,
    simulacaoSomenteLeitura,
    dadosUsuarioEfetivo,
  } = useApp();
  const { propsFor } = useAppPageNav();

  const uid = dadosUsuarioEfetivo?.id ?? user?.id;
  const { ready, perfilRow, playbookPendente } = useHomeAfiliadoData(uid);

  if (!user) return null;

  const atalhos: { key: PageKey; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] =
    [];
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
  const idxOverview = atalhosOrdenados.findIndex((a) => a.key === "dash_overview_afiliado");
  if (idxOverview > 0) {
    const [item] = atalhosOrdenados.splice(idxOverview, 1);
    atalhosOrdenados.unshift(item);
  }

  const accentColor = BRAND.roxoVivo;
  const cardBg = t.cardBg;

  const nomePerfil = perfilRow?.nome_artistico?.trim() || dadosUsuarioEfetivo?.name || user.name;
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (perfilRow?.nome_artistico?.trim() || user.name || user.email || "?");
  const welcomeInitial = welcomeAvatarLabel[0]?.toUpperCase() ?? "?";

  const showPerfilIncompleto =
    ready &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(perfilRow, nomePerfil);

  const showPlaybookAlert = ready && playbookPendente;

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

  const alertCtaStyle: React.CSSProperties = {
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
  };

  const alertTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: isDark ? "#ff9980" : "#b02a14",
    letterSpacing: "0.06em",
    marginBottom: 8,
    fontFamily: FONT_TITLE,
  };

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
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
            background: `linear-gradient(90deg, ${BRAND.roxoVivo}, ${BRAND.azul})`,
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              flexShrink: 0,
              background: `linear-gradient(135deg, ${BRAND.roxo}, ${BRAND.azul})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 20,
              fontFamily: FONT.body,
              border: "2px solid rgba(124, 58, 237, 0.45)",
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
            <p style={{ margin: 0, fontSize: 12, color: t.textMuted, marginBottom: 8 }}>{ROLE_LABEL_AFILIADO}</p>
            <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.5 }}>{WELCOME_SUBTITLE}</p>
            {simulacaoLogin ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
                Sua conta não muda — você continua como {user.name}. Visualização: {simulacaoLogin.labelExibicao}.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {showPerfilIncompleto ? (
        <div style={alertBoxStyle}>
          <AlertTriangle size={20} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={alertTitleStyle}>AÇÃO NECESSÁRIA</div>
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.65, marginBottom: 12 }}>
              {simulacaoLogin
                ? `Cadastro incompleto no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. Na visualização, o menu segue esse perfil (somente leitura).`
                : AFILIADO_HOME_CADASTRO_INCOMPLETO_MENSAGEM}
            </p>
            <a {...propsFor("afiliados")} style={alertCtaStyle}>
              {AFILIADO_HOME_CADASTRO_INCOMPLETO_CTA}
            </a>
          </div>
        </div>
      ) : null}

      {showPlaybookAlert ? (
        <div style={alertBoxStyle}>
          <AlertTriangle size={20} color={BRAND.vermelho} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={alertTitleStyle}>AÇÃO NECESSÁRIA</div>
            <p style={{ margin: 0, fontSize: 13, color: t.text, lineHeight: 1.65, marginBottom: 12 }}>
              {simulacaoLogin ? (
                `Playbook pendente no usuário visualizado${simulacaoLogin.userName ? ` (${simulacaoLogin.userName})` : ""}. A visualização é somente leitura.`
              ) : (
                <>
                  Você ainda não confirmou todos os itens obrigatórios do Playbook. Acesse as abas{" "}
                  <strong>Dealers</strong>, <strong>Agendamento</strong> e <strong>Jogos</strong> na página Playbook para
                  dar sua ciência.
                </>
              )}
            </p>
            <a {...propsFor("playbook_influencers")} style={alertCtaStyle}>
              Ir para Playbook
            </a>
          </div>
        </div>
      ) : null}

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
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>Nenhuma página disponível no momento.</p>
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
                    e.currentTarget.style.background = "rgba(124, 58, 237, 0.12)";
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
                      background: "rgba(74, 32, 130, 0.2)",
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
