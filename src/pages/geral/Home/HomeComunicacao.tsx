import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasComunicacao } from "./comunicacao/BoasVindasComunicacao";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosComunicacao } from "./comunicacao/AtalhosComunicacao";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

const HOME_COMUNICACAO_PREFIX = "home-comunicacao";

export default function HomeComunicacao() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Comunicação";

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
      <BoasVindasComunicacao nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_COMUNICACAO_PREFIX} />
      <InformacoesStaffHome perfil="comunicacao" sectionIdPrefix={HOME_COMUNICACAO_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_COMUNICACAO_PREFIX} />
      <AtalhosComunicacao />
    </div>
  );
}
