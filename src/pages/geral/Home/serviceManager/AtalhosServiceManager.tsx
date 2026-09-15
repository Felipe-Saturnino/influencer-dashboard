import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  ClipboardList,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Network,
  ShoppingCart,
  Users,
} from "lucide-react";
import { AtalhosCuradosHome, type HomeAtalhoCurado } from "../shared/AtalhosCuradosHome";

const ATALHOS_SERVICE_MANAGER: HomeAtalhoCurado[] = [
  { key: "rh_calendario", icon: CalendarRange },
  { key: "escala_marketplace_turnos", icon: ShoppingCart },
  { key: "dash_overview_prestador", icon: LayoutDashboard },
  { key: "academy_performance_hub", icon: Gauge },
  { key: "escala_controle_turno", icon: ClipboardList },
  { key: "incidentes", icon: AlertTriangle },
  { key: "academy_portal", icon: BookOpen },
  { key: "rh_portal", icon: Users },
  { key: "ajuda", icon: HelpCircle },
  { key: "rh_organograma", icon: Network },
];

export function AtalhosServiceManager() {
  return (
    <AtalhosCuradosHome
      sectionIdPrefix="home-service-manager"
      atalhos={ATALHOS_SERVICE_MANAGER}
      gridClassName="app-grid-atalhos-operador"
    />
  );
}
