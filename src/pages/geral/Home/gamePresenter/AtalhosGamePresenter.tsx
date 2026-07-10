import { HelpCircle, Network } from "lucide-react";
import { AtalhosStaffHome } from "../shared/AtalhosStaffHome";

const ATALHOS_GAME_PRESENTER = [
  { key: "ajuda" as const, icon: HelpCircle },
  { key: "rh_organograma" as const, icon: Network },
];

export function AtalhosGamePresenter() {
  return (
    <AtalhosStaffHome
      sectionIdPrefix="home-game-presenter"
      atalhos={ATALHOS_GAME_PRESENTER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
