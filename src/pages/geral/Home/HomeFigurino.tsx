import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasFigurino } from "./figurino/BoasVindasFigurino";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosFigurino } from "./figurino/AtalhosFigurino";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

const HOME_FIGURINO_PREFIX = "home-figurino";

export default function HomeFigurino() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Figurino";

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
      <BoasVindasFigurino nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_FIGURINO_PREFIX} />
      <InformacoesStaffHome perfil="figurino" sectionIdPrefix={HOME_FIGURINO_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_FIGURINO_PREFIX} />
      <AtalhosFigurino />
    </div>
  );
}
