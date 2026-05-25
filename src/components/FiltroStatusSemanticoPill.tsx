import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { FONT } from "../constants/theme";
import { useApp } from "../context/AppContext";
import {
  FILTRO_STATUS_SEMANTICO_PILL,
  getFiltroStatusSemanticoPillStyle,
} from "../lib/filterBarStyles";

export interface FiltroStatusSemanticoPillProps {
  label: string;
  /** Cor da bolinha e do estado ativo (verde/vermelho/amarelo do domínio). */
  semanticColor: string;
  active: boolean;
  onClick: () => void;
  /** Exibe X quando ativo (padrão Lives/Afiliados). */
  showClearIcon?: boolean;
  "aria-label"?: string;
  style?: CSSProperties;
}

/** Botão de filtro por status — visual das abas Overview Spin + bolinha semântica. */
export function FiltroStatusSemanticoPill({
  label,
  semanticColor,
  active,
  onClick,
  showClearIcon = true,
  "aria-label": ariaLabel,
  style,
}: FiltroStatusSemanticoPillProps) {
  const { theme: t } = useApp();
  const state = getFiltroStatusSemanticoPillStyle(t, active, semanticColor);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? `Remover filtro ${label}` : `Filtrar por ${label}`)}
      onClick={onClick}
      style={{
        display: "flex",
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
        ...state,
        ...style,
      }}
    >
      <span
        style={{
          width: FILTRO_STATUS_SEMANTICO_PILL.dotSize,
          height: FILTRO_STATUS_SEMANTICO_PILL.dotSize,
          borderRadius: "50%",
          background: semanticColor,
          flexShrink: 0,
          alignSelf: "center",
        }}
        aria-hidden="true"
      />
      <span style={{ display: "inline-flex", alignItems: "center" }}>{label}</span>
      {showClearIcon && active ? (
        <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
          <X size={9} aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
