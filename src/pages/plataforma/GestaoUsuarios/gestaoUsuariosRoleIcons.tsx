import type { ReactNode } from "react";
import {
  Building2,
  Crown,
  GraduationCap,
  HandCoins,
  Handshake,
  Headphones,
  IdCard,
  LineChart,
  Megaphone,
  MessageCircle,
  Mic,
  MonitorPlay,
  Network,
  Settings,
  Shuffle,
  ShieldCheck,
  Shirt,
  Target,
  UserCog,
  Users,
  Flag,
  Cpu,
  Wrench,
} from "lucide-react";
import type { Role } from "../../../types";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";

/** Ícones de perfil — mesmo mapa da aba Permissões (`FiltroBarTabButton`). */
export const ROLE_PERM_TAB_ICONS: Partial<Record<Role, ReactNode>> = {
  admin: <ShieldCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
  executivo: <Crown {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_aquisicao: <HandCoins {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_marketing: <Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_operacoes: <Settings {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_tech_ops: <Cpu {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_academy: <GraduationCap {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor_rh: <Users {...FILTRO_BAR_TAB_ICON_PROPS} />,
  rh: <Users {...FILTRO_BAR_TAB_ICON_PROPS} />,
  figurino: <Shirt {...FILTRO_BAR_TAB_ICON_PROPS} />,
  comunicacao: <Megaphone {...FILTRO_BAR_TAB_ICON_PROPS} />,
  performance_coach: <Target {...FILTRO_BAR_TAB_ICON_PROPS} />,
  service_manager: <Headphones {...FILTRO_BAR_TAB_ICON_PROPS} />,
  customer_service: <MessageCircle {...FILTRO_BAR_TAB_ICON_PROPS} />,
  game_presenter: <MonitorPlay {...FILTRO_BAR_TAB_ICON_PROPS} />,
  shuffler: <Shuffle {...FILTRO_BAR_TAB_ICON_PROPS} />,
  tech_ops: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} />,
  shift_leader: <Flag {...FILTRO_BAR_TAB_ICON_PROPS} />,
  prestador: <IdCard {...FILTRO_BAR_TAB_ICON_PROPS} />,
  operador: <Building2 {...FILTRO_BAR_TAB_ICON_PROPS} />,
  agencia: <Network {...FILTRO_BAR_TAB_ICON_PROPS} />,
  influencer: <Mic {...FILTRO_BAR_TAB_ICON_PROPS} />,
  afiliado: <Handshake {...FILTRO_BAR_TAB_ICON_PROPS} />,
  investidor: <LineChart {...FILTRO_BAR_TAB_ICON_PROPS} />,
};

export function rolePermTabIcon(role: Role): ReactNode {
  return ROLE_PERM_TAB_ICONS[role] ?? <UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />;
}
