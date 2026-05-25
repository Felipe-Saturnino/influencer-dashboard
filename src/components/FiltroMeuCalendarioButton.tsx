import type { CSSProperties, ReactNode } from "react";
import { CalendarCheck } from "lucide-react";
import { FiltroBarPillButton } from "./dashboard/FiltroBarPillButton";

export interface FiltroMeuCalendarioButtonProps {
  active: boolean;
  onClick: () => void;
  /** Rótulo visível; default «Meu Calendário». */
  children?: ReactNode;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
  style?: CSSProperties;
}

/**
 * Toggle pill (Histórico) com `CalendarCheck` — «Meu Calendário», «Meu Controle», etc.
 */
export function FiltroMeuCalendarioButton({
  active,
  onClick,
  children = "Meu Calendário",
  ariaLabelActive = "Mostrar calendário geral de todos os prestadores",
  ariaLabelInactive = "Filtrar calendário apenas para o meu registo de prestador",
  style,
}: FiltroMeuCalendarioButtonProps) {
  return (
    <FiltroBarPillButton
      active={active}
      onClick={onClick}
      icon={<CalendarCheck size={15} aria-hidden="true" />}
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      style={style}
    >
      {children}
    </FiltroBarPillButton>
  );
}
