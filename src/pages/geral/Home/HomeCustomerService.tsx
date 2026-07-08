import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { PAGE_CONTENT_BOX_GAP } from "../../../lib/pageContentBoxStyles";
import { BoasVindasCustomerService } from "./customerService/BoasVindasCustomerService";
import { CelebracoesStaffHome } from "./shared/CelebracoesStaffHome";
import { InformacoesStaffHome } from "./shared/InformacoesStaffHome";
import { AtalhosCustomerService } from "./customerService/AtalhosCustomerService";
import { SpinNaRedeHome } from "./shared/SpinNaRedeHome";

const HOME_CUSTOMER_SERVICE_PREFIX = "home-customer-service";

export default function HomeCustomerService() {
  const { theme: t, user } = useApp();

  if (!user) return null;

  const nome = user.name?.trim() || "Customer Service";

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
      <BoasVindasCustomerService nome={nome} />
      <CelebracoesStaffHome sectionIdPrefix={HOME_CUSTOMER_SERVICE_PREFIX} />
      <InformacoesStaffHome perfil="customer_service" sectionIdPrefix={HOME_CUSTOMER_SERVICE_PREFIX} />
      <AtalhosCustomerService />
      <SpinNaRedeHome sectionIdPrefix={HOME_CUSTOMER_SERVICE_PREFIX} />
    </div>
  );
}
