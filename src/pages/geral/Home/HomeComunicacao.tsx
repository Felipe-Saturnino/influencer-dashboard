import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasComunicacao } from "./comunicacao/BoasVindasComunicacao";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosComunicacao } from "./comunicacao/AtalhosComunicacao";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_COMUNICACAO_PREFIX = "home-comunicacao";

export default function HomeComunicacao() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Comunicação";

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
      <CelebracoesStaffHome sectionIdPrefix={HOME_COMUNICACAO_PREFIX} />
      <InformacoesStaffHome
        perfil="comunicacao"
        sectionIdPrefix={HOME_COMUNICACAO_PREFIX}
        includeGaleriaNovidades={false}
      />
      <AtalhosComunicacao />
      <SpinNaRedeHome sectionIdPrefix={HOME_COMUNICACAO_PREFIX} />
    </div>
  );
}
