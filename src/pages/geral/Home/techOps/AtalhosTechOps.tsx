import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_TECH_OPS = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosTechOps() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-tech-ops"
      atalhos={ATALHOS_TECH_OPS}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
