import type { CSSProperties } from "react";
import { History } from "lucide-react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";

/** aria-label padrão do botão Hoje (Agenda de Lives). */
export const HOJE_FILTRO_ARIA_LABEL = "Ir para o dia de hoje";

export interface FiltroHojeButtonProps {
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
  style?: CSSProperties;
}

/**
 * Atalho “Hoje” na barra de filtros — pill 999, ícone History 15px (distinto do Histórico `Calendar`).
 * Uso actual: Agenda de Lives (força modo Dia + data corrente).
 */
export function FiltroHojeButton({
  active,
  onClick,
  ariaLabel = HOJE_FILTRO_ARIA_LABEL,
  style,
}: FiltroHojeButtonProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();

  return (
    <button
      type="button"
      aria-label={ariaLabel}
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
          : t.inputBg ?? t.cardBg,
        color: active ? brand.accent : t.textMuted,
        fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        lineHeight: 1.25,
        ...style,
      }}
    >
      <History size={15} aria-hidden="true" /> Hoje
    </button>
  );
}
