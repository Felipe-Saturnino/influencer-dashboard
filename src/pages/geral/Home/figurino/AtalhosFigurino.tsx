import { HelpCircle, Network, Shirt } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_FIGURINO = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
  { key: "rh_figurinos" as const, icon: Shirt },
];

export function AtalhosFigurino() {
  return <AtalhosStaffHome sectionIdPrefix="home-figurino" atalhos={ATALHOS_FIGURINO} />;
}
