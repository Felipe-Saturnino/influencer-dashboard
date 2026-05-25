import type { CSSProperties } from "react";
import { FilterBarIcons } from "../../lib/filterBarIconCatalog";
import { FiltroBarPillButton } from "./FiltroBarPillButton";

/** aria-label quando o modo histórico está desligado (ativar). */
export const HISTORICO_FILTRO_ARIA_LABEL_INACTIVE =
  "Ativar modo histórico — ver todo o período";

/** aria-label quando o modo histórico está ligado (desativar). */
export const HISTORICO_FILTRO_ARIA_LABEL_ACTIVE = "Desativar modo histórico";

export interface FiltroHistoricoButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
  style?: CSSProperties;
}

/**
 * Botão Histórico na barra — mesmo pill/estados que Operadora e Influencer (Overview Influencer).
 */
export function FiltroHistoricoButton({
  active,
  onClick,
  ariaLabelActive = HISTORICO_FILTRO_ARIA_LABEL_ACTIVE,
  ariaLabelInactive = HISTORICO_FILTRO_ARIA_LABEL_INACTIVE,
  style,
}: FiltroHistoricoButtonProps) {
  return (
    <FiltroBarPillButton
      active={active}
      onClick={onClick}
      icon={FilterBarIcons.historico}
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      style={style}
    >
      Histórico
    </FiltroBarPillButton>
  );
}
