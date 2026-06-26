import { HelpCircle, Images, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_COMUNICACAO = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
  { key: "galeria_fotos" as const, icon: Images },
];

export function AtalhosComunicacao() {
  return <AtalhosStaffHome sectionIdPrefix="home-comunicacao" atalhos={ATALHOS_COMUNICACAO} />;
}
