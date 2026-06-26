import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_SERVICE_MANAGER = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosServiceManager() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-service-manager"
      atalhos={ATALHOS_SERVICE_MANAGER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
