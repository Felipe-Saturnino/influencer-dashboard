import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  ClipboardList,
  Gauge,
  HelpCircle,
  Network,
  ShoppingCart,
  Users,
} from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_SHIFT_LEADER: HomeAtalhoCurado[] = [
  { key: "rh_calendario", icon: CalendarRange },
  { key: "escala_marketplace_turnos", icon: ShoppingCart },
  { key: "academy_performance_hub", icon: Gauge },
  { key: "escala_controle_turno", icon: ClipboardList },
  { key: "incidentes", icon: AlertTriangle },
  { key: "academy_portal", icon: BookOpen },
  { key: "rh_portal", icon: Users },
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosShiftLeader() {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix="home-shift-leader"
      atalhos={ATALHOS_SHIFT_LEADER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
