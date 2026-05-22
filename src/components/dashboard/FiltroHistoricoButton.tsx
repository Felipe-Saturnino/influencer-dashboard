import type { CSSProperties } from "react";
import { Calendar } from "lucide-react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../../lib/filterBarStyles";

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
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const stateStyle = getFiltroBarPillStateStyle(t, brand, active);

  return (
    <button
      type="button"
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: FILTRO_BAR_PILL_GAP,
        padding: FILTRO_BAR_PILL_PADDING,
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: FONT.body,
        fontSize: 13,
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        ...stateStyle,
        ...style,
      }}
    >
      <Calendar size={15} aria-hidden="true" /> Histórico
    </button>
  );
}
