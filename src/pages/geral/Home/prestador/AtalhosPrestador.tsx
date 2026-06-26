import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_PRESTADOR = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosPrestador() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-prestador"
      atalhos={ATALHOS_PRESTADOR}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
