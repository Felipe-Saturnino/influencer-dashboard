import type { CSSProperties, ReactNode } from "react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import {
  FILTRO_BAR_PILL_GAP,
  FILTRO_BAR_PILL_PADDING,
  getFiltroBarPillStateStyle,
} from "../../lib/filterBarStyles";

export interface FiltroBarPillButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  "aria-label": string;
  style?: CSSProperties;
}

/** Pill na barra com ícone + texto — mesmo contrato visual que `FiltroHistoricoButton`. */
export function FiltroBarPillButton({
  active,
  onClick,
  icon,
  children,
  "aria-label": ariaLabel,
  style,
}: FiltroBarPillButtonProps) {
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
      {icon}
      {children}
    </button>
  );
}
