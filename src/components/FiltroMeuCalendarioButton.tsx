import type { CSSProperties } from "react";
import { CalendarCheck } from "lucide-react";
import { FiltroBarPillButton } from "./dashboard/FiltroBarPillButton";

export interface FiltroMeuCalendarioButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
  style?: CSSProperties;
}

/**
 * Toggle «Meu Calendário» — pill igual ao Histórico, ícone `CalendarCheck` (distinto de `Calendar` do Histórico).
 */
export function FiltroMeuCalendarioButton({
  active,
  onClick,
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
      Meu Calendário
    </FiltroBarPillButton>
  );
}
