import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasGamePresenter } from "./gamePresenter/BoasVindasGamePresenter";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { MarketplaceAlertasStaffHome } from "./shared/MarketplaceAlertasStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { CentralAcademyStaffHome } from "./shared/CentralAcademyStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { AtalhosGamePresenter } from "./gamePresenter/AtalhosGamePresenter";

const HOME_GAME_PRESENTER_PREFIX = "home-game-presenter";

export default function HomeGamePresenter() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Game Presenter";

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
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <MarketplaceAlertasStaffHome sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <InformacoesStaffHome perfil="game_presenter" sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <CentralAcademyStaffHome sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_GAME_PRESENTER_PREFIX} />
      <AtalhosGamePresenter />
    </div>
  );
}
