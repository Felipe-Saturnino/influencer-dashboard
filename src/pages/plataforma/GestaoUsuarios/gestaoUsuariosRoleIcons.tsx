import type { ReactNode } from "react";
import {
  Building2,
  Crown,
  Handshake,
  Headphones,
  IdCard,
  LineChart,
  Mic,
  Network,
  ShieldCheck,
  Shirt,
  UserCog,
  Users,
  Flag,
} from "lucide-react";
import type { Role } from "../../../types";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";

/** Ícones de perfil — mesmo mapa da aba Permissões (`FiltroBarTabButton`). */
export const ROLE_PERM_TAB_ICONS: Partial<Record<Role, ReactNode>> = {
  admin: <ShieldCheck {...FILTRO_BAR_TAB_ICON_PROPS} />,
  executivo: <Crown {...FILTRO_BAR_TAB_ICON_PROPS} />,
  gestor: <UserCog {...FILTRO_BAR_TAB_ICON_PROPS} />,
  rh: <Users {...FILTRO_BAR_TAB_ICON_PROPS} />,
  figurino: <Shirt {...FILTRO_BAR_TAB_ICON_PROPS} />,
  service_manager: <Headphones {...FILTRO_BAR_TAB_ICON_PROPS} />,
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
