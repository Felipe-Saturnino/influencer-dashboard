import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasTechOps } from "./techOps/BoasVindasTechOps";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { AtalhosTechOps } from "./techOps/AtalhosTechOps";

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
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
      <InformacoesStaffHome perfil="tech_ops" sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_TECH_OPS_PREFIX} />
      <AtalhosTechOps />
    </div>
  );
}
