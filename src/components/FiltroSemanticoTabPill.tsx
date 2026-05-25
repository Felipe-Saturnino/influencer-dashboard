import type { CSSProperties } from "react";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import {
  FILTRO_STATUS_SEMANTICO_PILL,
  getFiltroStatusSemanticoPillStyle,
} from "../lib/filterBarStyles";

export interface FiltroSemanticoTabPillProps {
  label: string;
  /** Cor do domínio no estado ativo (ex.: tag de jogo/tipo no Roteiro de Mesa). */
  semanticColor: string;
  active: boolean;
  onClick: () => void;
  "aria-label"?: string;
  style?: CSSProperties;
}

/**
 * Botão de filtro com cor semântica — mesmo formato das abas Overview Spin
 * (sem bolinha; ativo na cor do domínio, não brand.accent).
 */
export function FiltroSemanticoTabPill({
  label,
  semanticColor,
  active,
  onClick,
  "aria-label": ariaLabel,
  style,
}: FiltroSemanticoTabPillProps) {
  const { theme: t } = useApp();
  const state = getFiltroStatusSemanticoPillStyle(t, active, semanticColor);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? `${label} selecionado` : `Filtrar por ${label}`)}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: FILTRO_STATUS_SEMANTICO_PILL.gap,
        padding: FILTRO_STATUS_SEMANTICO_PILL.padding,
        minHeight: FILTRO_STATUS_SEMANTICO_PILL.minHeight,
        borderRadius: FILTRO_STATUS_SEMANTICO_PILL.borderRadius,
        fontSize: FILTRO_STATUS_SEMANTICO_PILL.fontSize,
        fontFamily: FONT.body,
        cursor: "pointer",
        transition: "all 0.15s",
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...state,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
