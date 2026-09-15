import { BookOpen, CalendarRange, HelpCircle, Headphones, Network, Users } from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_CUSTOMER_SERVICE: HomeAtalhoCurado[] = [
  { key: "cs_atendimento", icon: Headphones },
  { key: "rh_calendario", icon: CalendarRange },
  { key: "academy_portal", icon: BookOpen },
  { key: "rh_portal", icon: Users },
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosCustomerService() {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix="home-customer-service"
      atalhos={ATALHOS_CUSTOMER_SERVICE}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
