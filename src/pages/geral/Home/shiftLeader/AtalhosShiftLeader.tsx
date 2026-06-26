import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_SHIFT_LEADER = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosShiftLeader() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-shift-leader"
      atalhos={ATALHOS_SHIFT_LEADER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
