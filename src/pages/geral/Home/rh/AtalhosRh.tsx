import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_RH = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosRh() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-rh"
      atalhos={ATALHOS_RH}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
