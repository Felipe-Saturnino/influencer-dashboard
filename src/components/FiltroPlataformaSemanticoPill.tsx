import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { FONT, FONT_TITLE } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { PlatLogo } from "./PlatLogo";
import {
  FILTRO_STATUS_SEMANTICO_PILL,
  getFiltroStatusSemanticoPillStyle,
} from "../lib/filterBarStyles";

export interface FiltroPlataformaSemanticoPillProps {
  /** Chave da plataforma (Twitch, Kick, …) — usada no `PlatLogo`. */
  plataforma: string;
  /** Rótulo visível; default = `plataforma`. */
  label?: string;
  /** Cor da plataforma no estado ativo. */
  semanticColor: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  /** Contagem exibida após separador (Influencers / Scout). */
  count?: number;
  showClearIcon?: boolean;
  "aria-label"?: string;
  style?: CSSProperties;
}

/** Botão de filtro por plataforma — mesmo visual do Status semântico + logo da plataforma. */
export function FiltroPlataformaSemanticoPill({
  plataforma,
  label,
  semanticColor,
  active,
  onClick,
  isDark,
  count,
  showClearIcon = true,
  "aria-label": ariaLabel,
  style,
}: FiltroPlataformaSemanticoPillProps) {
  const { theme: t } = useApp();
  const displayLabel = label ?? plataforma;
  const state = getFiltroStatusSemanticoPillStyle(t, active, semanticColor);
  const showCount = count !== undefined;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        ariaLabel ??
        (active ? `Remover filtro ${displayLabel}` : `Filtrar por ${displayLabel}`)
      }
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
        ...state,
        ...style,
      }}
    >
      <PlatLogo plataforma={plataforma} size={13} isDark={isDark} />
      <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
        {displayLabel}
      </span>
      {showCount ? (
        <>
          <span
            style={{
              width: 1,
              height: 10,
              background: `${semanticColor}44`,
              flexShrink: 0,
              alignSelf: "center",
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: (count ?? 0) > 0 ? t.text : t.textMuted,
              fontFamily: FONT_TITLE,
              flexShrink: 0,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {count}
          </span>
        </>
      ) : null}
      {showClearIcon && active ? (
        <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}>
          <X size={9} aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
