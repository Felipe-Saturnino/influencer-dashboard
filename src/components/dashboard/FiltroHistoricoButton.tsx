import type { CSSProperties } from "react";
import { Calendar } from "lucide-react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

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
 * Botão Histórico da barra de filtros — padrão Overview Influencer:
 * pill 999, Calendar 15px, fundo ativo com --brand-action 15%, borda/texto ativo brand.accent.
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

  return (
    <button
      type="button"
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: FONT.body,
        fontSize: 13,
        border: active ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
        background: active
          ? "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
          : "transparent",
        color: active ? brand.accent : t.textMuted,
        fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
        ...style,
      }}
    >
      <Calendar size={15} aria-hidden="true" /> Histórico
    </button>
  );
}
