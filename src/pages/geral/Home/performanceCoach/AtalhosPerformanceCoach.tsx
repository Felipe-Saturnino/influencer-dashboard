import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_PERFORMANCE_COACH = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosPerformanceCoach() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-performance-coach"
      atalhos={ATALHOS_PERFORMANCE_COACH}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
