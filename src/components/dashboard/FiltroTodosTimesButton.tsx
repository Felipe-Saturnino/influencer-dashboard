import type { CSSProperties } from "react";
import { FilterBarIcons } from "../../lib/filterBarIconCatalog";
import { FiltroBarPillButton } from "./FiltroBarPillButton";

export interface FiltroTodosTimesButtonProps {
  active: boolean;
  onClick: () => void;
  /** Rótulo visível (default: «Todos os Times»). */
  label?: string;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
  style?: CSSProperties;
}

const LABEL_DEFAULT = "Todos os Times";

/**
 * Toggle «Todos os Times» na Gestão de Staff — pill igual ao Histórico, ícone `UsersRound`.
 */
export function FiltroTodosTimesButton({
  active,
  onClick,
  label = LABEL_DEFAULT,
  ariaLabelActive = "Ver todos os times",
  ariaLabelInactive = "Filtrar por um time",
  style,
}: FiltroTodosTimesButtonProps) {
  return (
    <FiltroBarPillButton
      active={active}
      onClick={onClick}
      icon={FilterBarIcons.time}
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      style={style}
    >
      {label}
    </FiltroBarPillButton>
  );
}
