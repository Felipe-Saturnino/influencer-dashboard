import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { useHomeInfluencerData } from "./hooks/useHomeInfluencerData";
import { BoasVindasInfluencer } from "./influencer/BoasVindasInfluencer";
import { AlertasInfluencerHome } from "./influencer/AlertasInfluencerHome";
import { KpisInfluencerHome } from "./influencer/KpisInfluencerHome";
import { ProximasLivesInfluencer } from "./influencer/ProximasLivesInfluencer";
import { FeedbacksRecentesInfluencer } from "./influencer/FeedbacksRecentesInfluencer";
import { InformacoesInfluencerHome } from "./influencer/InformacoesInfluencerHome";
import { AtalhosInfluencer } from "./influencer/AtalhosInfluencer";

const HOME_INFLUENCER_PREFIX = "home-influencer";

export default function HomeInfluencer() {
  const {
    theme: t,
    user,
    simulacaoLogin,
    simulacaoSomenteLeitura,
    dadosUsuarioEfetivo,
  } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const uid = dadosUsuarioEfetivo?.id ?? user?.id;
  const {
    ready,
    perfilRow,
    playbookPendente,
    horasPendentes,
    livesFuturas,
    livesRealizadasRecentes,
    resultadosPorLive,
  } = useHomeInfluencerData(uid);

  if (!user) return null;

  const nomeExibicao = nomeEfetivo?.trim() || user.name || "Influenciador";
  const nomePerfil = perfilRow?.nome_artistico?.trim() || nomeExibicao;
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (perfilRow?.nome_artistico?.trim() || user.name || user.email || "?");

  const showCadastroIncompleto =
    ready &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(perfilRow, nomePerfil);

  const showPlaybook = ready && playbookPendente;

  const showHorasPendentes =
    ready &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    livesFuturas.length === 0 &&
    horasPendentes != null &&
    horasPendentes > 0;

  const simulacaoNota = simulacaoLogin
    ? `Sua conta não muda — você continua como ${user.name}. Visualização: ${simulacaoLogin.labelExibicao}.`
    : null;

  if (!ready) {
    return (
      <div
        className="app-page-shell"
        style={{
          background: t.bg,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

  return (
    <div
      className="app-page-shell"
      style={{
        background: t.bg,
        minHeight: "100vh",
        fontFamily: FONT.body,
        display: "flex",
        flexDirection: "column",
        gap: PAGE_CONTENT_BOX_GAP,
      }}
    >
      <BoasVindasInfluencer
        nome={nomeExibicao}
        avatarLabel={welcomeAvatarLabel}
        simulacaoNota={simulacaoNota}
      />
      <AlertasInfluencerHome
        showCadastroIncompleto={showCadastroIncompleto}
        showPlaybook={showPlaybook}
        showHorasPendentes={showHorasPendentes}
        horasPendentes={horasPendentes ?? 0}
        simulacaoLogin={simulacaoLogin}
      />
      <KpisInfluencerHome userId={uid} sectionIdPrefix={HOME_INFLUENCER_PREFIX} />
      <ProximasLivesInfluencer lives={livesFuturas} sectionIdPrefix={HOME_INFLUENCER_PREFIX} />
      <FeedbacksRecentesInfluencer
        lives={livesRealizadasRecentes}
        resultadosPorLive={resultadosPorLive}
        sectionIdPrefix={HOME_INFLUENCER_PREFIX}
      />
      <InformacoesInfluencerHome sectionIdPrefix={HOME_INFLUENCER_PREFIX} />
      <AtalhosInfluencer sectionIdPrefix={HOME_INFLUENCER_PREFIX} />
    </div>
  );
}
