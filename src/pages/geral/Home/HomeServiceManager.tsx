import { useApp } from "../../../context/AppContext";
import { useIdentidadeEfetiva } from "../../../hooks/useIdentidadeEfetiva";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasServiceManager } from "./serviceManager/BoasVindasServiceManager";
import { HomeStaffAposBoasVindas } from "./shared/HomeStaffAposBoasVindas";
import { MarketplaceAlertasStaffHome } from "./shared/MarketplaceAlertasStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { CentralAcademyStaffHome } from "./shared/CentralAcademyStaffHome";
import { BlogueiroSpinStaffHome } from "./shared/BlogueiroSpinStaffHome";
import { AtalhosServiceManager } from "./serviceManager/AtalhosServiceManager";

const HOME_SERVICE_MANAGER_PREFIX = "home-service-manager";

export default function HomeServiceManager() {
  const { theme: t, user } = useApp();
  const { name: nomeEfetivo } = useIdentidadeEfetiva();

  if (!user) return null;

  const nome = nomeEfetivo?.trim() || "Service Manager";

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
      <BoasVindasServiceManager nome={nome} />
      <HomeStaffAposBoasVindas sectionIdPrefix={HOME_SERVICE_MANAGER_PREFIX} />
      <MarketplaceAlertasStaffHome sectionIdPrefix={HOME_SERVICE_MANAGER_PREFIX} />
      <InformacoesStaffHome perfil="service_manager" sectionIdPrefix={HOME_SERVICE_MANAGER_PREFIX} />
      <CentralAcademyStaffHome sectionIdPrefix={HOME_SERVICE_MANAGER_PREFIX} />
      <BlogueiroSpinStaffHome sectionIdPrefix={HOME_SERVICE_MANAGER_PREFIX} />
      <AtalhosServiceManager />
    </div>
  );
}
