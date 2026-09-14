import { Loader2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { isPerfilIncompleto } from "../../../lib/influencerPerfilCompleto";
import { useHomeAfiliadoData } from "./hooks/useHomeAfiliadoData";
import { BoasVindasAfiliado } from "./afiliado/BoasVindasAfiliado";
import { AlertasAfiliadoHome } from "./afiliado/AlertasAfiliadoHome";
import { KpisAfiliadoHome } from "./afiliado/KpisAfiliadoHome";
import { InformacoesAfiliadoHome } from "./afiliado/InformacoesAfiliadoHome";
import { AtalhosAfiliado } from "./afiliado/AtalhosAfiliado";

const HOME_AFILIADO_PREFIX = "home-afiliado";

export default function HomeAfiliado() {
  const {
    theme: t,
    user,
    simulacaoLogin,
    simulacaoSomenteLeitura,
    dadosUsuarioEfetivo,
  } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();
  const uid = dadosUsuarioEfetivo?.id ?? user?.id;
  const { ready, perfilRow, playbookPendente } = useHomeAfiliadoData(uid);

  if (!user) return null;

  const nomeExibicao = nomeEfetivo?.trim() || user.name || "Afiliado";
  const nomePerfil = perfilRow?.nome_artistico?.trim() || nomeExibicao;
  const welcomeAvatarLabel = simulacaoSomenteLeitura
    ? (user.name || user.email || "?")
    : (perfilRow?.nome_artistico?.trim() || user.name || user.email || "?");

  const showCadastroIncompleto =
    ready &&
    (perfilRow?.status ?? "ativo") === "ativo" &&
    isPerfilIncompleto(perfilRow, nomePerfil);

  const showPlaybook = ready && playbookPendente;

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
      <BoasVindasAfiliado
        nome={nomeExibicao}
        avatarLabel={welcomeAvatarLabel}
        simulacaoNota={simulacaoNota}
      />
      <AlertasAfiliadoHome
        showCadastroIncompleto={showCadastroIncompleto}
        showPlaybook={showPlaybook}
        simulacaoLogin={simulacaoLogin}
      />
      <KpisAfiliadoHome userId={uid} sectionIdPrefix={HOME_AFILIADO_PREFIX} />
      <InformacoesAfiliadoHome sectionIdPrefix={HOME_AFILIADO_PREFIX} />
      <AtalhosAfiliado sectionIdPrefix={HOME_AFILIADO_PREFIX} />
    </div>
  );
}
