import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_SHUFFLER = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosShuffler() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-shuffler"
      atalhos={ATALHOS_SHUFFLER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
