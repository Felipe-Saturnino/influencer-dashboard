import { BookOpen, CalendarRange, HelpCircle, Network, ShoppingCart, Users } from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_GAME_PRESENTER: HomeAtalhoCurado[] = [
  { key: "rh_calendario", icon: CalendarRange },
  { key: "escala_marketplace_turnos", icon: ShoppingCart },
  { key: "academy_portal", icon: BookOpen },
  { key: "rh_portal", icon: Users },
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosGamePresenter() {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix="home-game-presenter"
      atalhos={ATALHOS_GAME_PRESENTER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
