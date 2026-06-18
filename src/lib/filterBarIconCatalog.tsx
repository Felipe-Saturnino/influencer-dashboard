import type { ReactNode } from "react";
import {
  Building2,
  Calendar,
  CalendarHeart,
  CalendarRange,
  Clock,
  History,
  IdCard,
  ListChecks,
  Ruler,
  Shield,
  ShieldAlert,
  Tags,
  User,
  UsersRound,
} from "lucide-react";

/** Props Lucide partilhadas na barra de filtros (Brand §6). */
export const FILTRO_BAR_ICON_PROPS = {
  size: 15,
  strokeWidth: 2,
  "aria-hidden": true as const,
} as const;

/**
 * Ícones canónicos por tipo de controlo na barra — fonte de verdade com Brand §6 e `docs/PADRAO-FILTROS-DASHBOARD.md`.
 * Em código novo, importar daqui em vez de instanciar Lucide solto no JSX do filtro.
 */
export const FilterBarIcons = {
  operadora: <Shield {...FILTRO_BAR_ICON_PROPS} />,
  influencer: <User {...FILTRO_BAR_ICON_PROPS} />,
  /** Status em `<select>` pill (`FiltroBarCampoSelect`) — agregadora «Todos Status». */
  status: <ShieldAlert {...FILTRO_BAR_ICON_PROPS} />,
  time: <UsersRound {...FILTRO_BAR_ICON_PROPS} />,
  staff: <IdCard {...FILTRO_BAR_ICON_PROPS} />,
  turno: <Clock {...FILTRO_BAR_ICON_PROPS} />,
  historico: <Calendar {...FILTRO_BAR_ICON_PROPS} />,
  hoje: <History {...FILTRO_BAR_ICON_PROPS} />,
  modoVisualizacao: <CalendarRange {...FILTRO_BAR_ICON_PROPS} />,
  diretoria: <Building2 {...FILTRO_BAR_ICON_PROPS} />,
  /** Estúdio Spin — Gestão de Staff e filtros de estúdio na barra. */
  estudio: <Building2 {...FILTRO_BAR_ICON_PROPS} />,
  acaoSolicitacao: <ListChecks {...FILTRO_BAR_ICON_PROPS} />,
  figurinoCategoria: <Tags {...FILTRO_BAR_ICON_PROPS} />,
  figurinoTamanho: <Ruler {...FILTRO_BAR_ICON_PROPS} />,
  /** Tipo de compromisso — exclusivo do Calendário RH (Compromissos). */
  tipoCompromisso: <CalendarHeart {...FILTRO_BAR_ICON_PROPS} />,
} as const satisfies Record<string, ReactNode>;
