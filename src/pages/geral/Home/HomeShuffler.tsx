import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasShuffler } from "./shuffler/BoasVindasShuffler";
import { AtalhosShuffler } from "./shuffler/AtalhosShuffler";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { MarketplaceAlertasStaffHome } from "./shared/MarketplaceAlertasStaffHome";
import { KpisEstudioGpShufflerHome } from "./shared/KpisEstudioGpShufflerHome";
import { ProximosTurnosStaffHome } from "./shared/ProximosTurnosStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { CentralAcademyStaffHome } from "./shared/CentralAcademyStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";

const HOME_SHUFFLER_PREFIX = "home-shuffler";

export default function HomeShuffler() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Shuffler";

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
      <BoasVindasShuffler nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <MarketplaceAlertasStaffHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <KpisEstudioGpShufflerHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <ProximosTurnosStaffHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} showMarketplacePill />
      <InformacoesStaffHome perfil="shuffler" sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <CentralAcademyStaffHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_SHUFFLER_PREFIX} />
      <AtalhosShuffler />
    </div>
  );
}
