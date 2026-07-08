import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasGamePresenter } from "./gamePresenter/BoasVindasGamePresenter";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosGamePresenter } from "./gamePresenter/AtalhosGamePresenter";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_GAME_PRESENTER_PREFIX = "home-game-presenter";

export default function HomeGamePresenter() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Game Presenter";

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
      <BoasVindasGamePresenter nome={nome} />
      <CelebracoesStaffHome sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <InformacoesStaffHome perfil="game_presenter" sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <AtalhosGamePresenter />
      <SpinNaRedeHome sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
    </div>
  );
}
