import { BookOpen, CalendarRange, Gauge, HelpCircle, ListOrdered, Network, Users } from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_PERFORMANCE_COACH: HomeAtalhoCurado[] = [
  { key: "academy_performance_hub", icon: Gauge },
  { key: "academy_portal", icon: BookOpen },
  { key: "academy_cronograma", icon: ListOrdered },
  { key: "rh_calendario", icon: CalendarRange },
  { key: "rh_portal", icon: Users },
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosPerformanceCoach() {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix="home-performance-coach"
      atalhos={ATALHOS_PERFORMANCE_COACH}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
