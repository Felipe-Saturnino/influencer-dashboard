import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { FONT, FONT_TITLE } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import {
  FILTRO_STATUS_SEMANTICO_PILL,
  getFiltroStatusSemanticoPillStyle,
} from "../../../lib/filterBarStyles";
import type { Role } from "../../../types";
import { roleBadgeColor, roleLabel } from "./constants";
import { rolePermTabIcon } from "./gestaoUsuariosRoleIcons";

export interface GestaoUsuariosPerfilPillProps {
  role: Role;
  active: boolean;
  onClick: () => void;
  count?: number;
  showCount?: boolean;
  showClearIcon?: boolean;
  "aria-label"?: string;
  style?: CSSProperties;
}

/** Pill de perfil — visual alinhado a `FiltroPlataformaSemanticoPill` (Influencers). */
export function GestaoUsuariosPerfilPill({
  role,
  active,
  onClick,
  count,
  showCount = true,
  showClearIcon = false,
  "aria-label": ariaLabel,
  style,
}: GestaoUsuariosPerfilPillProps) {
  const { theme: t } = useApp();
  const label = roleLabel(role);
  const semanticColor = roleBadgeColor(role);
  const state = getFiltroStatusSemanticoPillStyle(t, active, semanticColor);
  const exibirCount = showCount && count !== undefined;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        ariaLabel ??
        (active ? `Remover filtro ${label}` : `Filtrar por perfil ${label}`)
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
      {rolePermTabIcon(role)}
      <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
        {label}
      </span>
      {exibirCount ? (
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
