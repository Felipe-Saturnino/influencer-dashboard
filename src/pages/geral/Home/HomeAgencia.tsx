import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { HOME_AGENCIA_ROLE, HOME_AGENCIA_SUB } from "../../../lib/homePerfisCopy";
import { BoasVindasPerfilHome } from "./shared/BoasVindasPerfilHome";
import { InformativosHome } from "./shared/InformativosHome";
import { useHomeAgenciaData } from "./hooks/useHomeAgenciaData";
import { AlertasAgenciaHome } from "./agencia/AlertasAgenciaHome";
import { KpisAgenciaHome } from "./agencia/KpisAgenciaHome";
import { ProximasLivesAgencia } from "./agencia/ProximasLivesAgencia";
import { AtalhosAgencia } from "./agencia/AtalhosAgencia";

const HOME_AGENCIA_PREFIX = "home-agencia";

export default function HomeAgencia() {
  const {
    theme: t,
    user,
    simulacaoLogin,
    simulacaoSomenteLeitura,
    escoposVisiveis,
  } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const influencerIds = escoposVisiveis.influencersVisiveis ?? [];
  const {
    ready,
    cadastrosIncompletosCount,
    cadastrosIncompletosNomes,
    horasPendentesCount,
    horasPendentesTotal,
    horasPendentesNomes,
    livesFuturas,
  } = useHomeAgenciaData(influencerIds);

  if (!user) return null;

  const nomeExibicao = nomeEfetivo?.trim() || user.name || "Agência";
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (user.name || user.email || "?");

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
      <BoasVindasPerfilHome
        nome={nomeExibicao}
        roleLabel={HOME_AGENCIA_ROLE}
        subtitulo={HOME_AGENCIA_SUB}
        avatarLabel={welcomeAvatarLabel}
        simulacaoNota={simulacaoNota}
      />
      <AlertasAgenciaHome
        cadastrosIncompletosCount={cadastrosIncompletosCount}
        cadastrosIncompletosNomes={cadastrosIncompletosNomes}
        horasPendentesCount={horasPendentesCount}
        horasPendentesTotal={horasPendentesTotal}
        horasPendentesNomes={horasPendentesNomes}
      />
      <KpisAgenciaHome influencerIds={influencerIds} sectionIdPrefix={HOME_AGENCIA_PREFIX} />
      <ProximasLivesAgencia lives={livesFuturas} sectionIdPrefix={HOME_AGENCIA_PREFIX} />
      <InformativosHome perfil="agencia" sectionIdPrefix={HOME_AGENCIA_PREFIX} />
      <AtalhosAgencia sectionIdPrefix={HOME_AGENCIA_PREFIX} />
    </div>
  );
}
