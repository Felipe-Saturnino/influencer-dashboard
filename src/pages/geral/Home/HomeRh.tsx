import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasRh } from "./rh/BoasVindasRh";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosRh } from "./rh/AtalhosRh";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

const HOME_RH_PREFIX = "home-rh";

export default function HomeRh() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "RH";

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
      <BoasVindasRh nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_RH_PREFIX} />
      <InformacoesStaffHome perfil="rh" sectionIdPrefix={HOME_RH_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_RH_PREFIX} />
      <AtalhosRh />
    </div>
  );
}
