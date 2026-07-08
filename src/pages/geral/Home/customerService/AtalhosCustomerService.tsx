import { HelpCircle, MessageSquare, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_CUSTOMER_SERVICE = [
  { key: "cs_atendimento" as const, icon: MessageSquare },
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosCustomerService() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-customer-service"
      atalhos={ATALHOS_CUSTOMER_SERVICE}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
