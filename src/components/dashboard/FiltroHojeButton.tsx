import type { CSSProperties } from "react";
import { FilterBarIcons } from "../../lib/filterBarIconCatalog";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../../lib/filterBarStyles";

/** aria-label padrão do botão Hoje (Agenda). */
export const HOJE_FILTRO_ARIA_LABEL = "Ir para o dia de hoje";

export interface FiltroHojeButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  style?: CSSProperties;
}

/**
 * Atalho “Hoje” na barra — pill 999, ícone History 15px; estados iguais a Histórico/Operadora/Influencer.
 */
export function FiltroHojeButton({
  active,
  onClick,
  ariaLabel = HOJE_FILTRO_ARIA_LABEL,
  style,
}: FiltroHojeButtonProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const stateStyle = getFiltroBarPillStateStyle(t, brand, active);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
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
      {FilterBarIcons.hoje} Hoje
    </button>
  );
}
