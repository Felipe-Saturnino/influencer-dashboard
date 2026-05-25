import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { FONT } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useDashboardBrand } from "../../hooks/useDashboardBrand";
import { getFiltroBarTabButtonStyle } from "../../lib/filterBarStyles";

export interface FiltroBarTabButtonProps {
  active: boolean;
  onClick: () => void;
  /** Ícone Lucide 16px — obrigatório por aba (Brand § abas). */
  icon: ReactNode;
  children: ReactNode;
  id: string;
  "aria-controls"?: string;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  /** Cor ativa (borda/fundo/texto) — ex.: abas de perfil em Permissões. */
  activeColor?: string;
  disabled?: boolean;
  /** Quando o rótulo visível não basta (ex.: contagem de erros na aba). */
  "aria-label"?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Botão de aba canónico — mesmo layout do Organograma (Visualização / Gerenciamento):
 * 10×18, minHeight 44, radius 10, ícone 16px à esquerda.
 */
export function FiltroBarTabButton({
  active,
  onClick,
  icon,
  children,
  id,
  "aria-controls": ariaControls,
  tabIndex = active ? 0 : -1,
  onKeyDown,
  activeColor,
  disabled,
  "aria-label": ariaLabel,
  style,
  className,
}: FiltroBarTabButtonProps) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const tabStyle = getFiltroBarTabButtonStyle(t, brand, active, activeColor);

  return (
    <button
      type="button"
      role="tab"
      id={id}
      tabIndex={tabIndex}
      aria-selected={active}
      aria-controls={ariaControls}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        ...tabStyle,
        fontFamily: FONT.body,
        transition: "all 0.15s",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

