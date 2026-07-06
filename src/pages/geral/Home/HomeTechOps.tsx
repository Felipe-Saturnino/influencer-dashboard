import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasTechOps } from "./techOps/BoasVindasTechOps";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosTechOps } from "./techOps/AtalhosTechOps";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_TECH_OPS_PREFIX = "home-tech-ops";

export default function HomeTechOps() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Tech Ops";

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
      <BoasVindasTechOps nome={nome} />
      <CelebracoesStaffHome sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
      <InformacoesStaffHome perfil="tech_ops" sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
      <AtalhosTechOps />
      <SpinNaRedeHome sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
    </div>
  );
}
