import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import {
  CTA_CRIAR_ICON_SIZE,
  getCtaCriarButtonStyle,
  type CtaCriarBrand,
} from "../lib/ctaCriarStyles";

export interface CtaCriarButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** Substitui o rótulo durante loading (ex.: "Verificando..."). */
  loading?: boolean;
  loadingLabel?: ReactNode;
  /** Fundo quando `disabled` (ex.: Status Técnico — cinza). */
  disabledBackground?: string;
  style?: CSSProperties;
  /** Brand explícito (testes); default: `useDashboardBrand()`. */
  brand?: CtaCriarBrand;
}

/**
 * CTA primário de criação (+ label) — pill 999, gradiente Scout ou whitelabel action→contrast.
 */
export function CtaCriarButton({
  children,
  loading = false,
  loadingLabel,
  disabled,
  disabledBackground,
  style,
  brand: brandProp,
  type = "button",
  ...rest
}: CtaCriarButtonProps) {
  const brandHook = useDashboardBrand();
  const brand = brandProp ?? brandHook;
  const isDisabled = disabled || loading;

  const baseStyle = getCtaCriarButtonStyle(
    brand,
    {
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.75 : 1,
      ...style,
    },
    { disabled: !!disabled && !loading, disabledBackground },
  );

  return (
    <button
      type={type}
      disabled={isDisabled}
      style={baseStyle}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2
            size={CTA_CRIAR_ICON_SIZE}
            className="app-lucide-spin"
            color="#fff"
            aria-hidden="true"
          />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          <Plus size={CTA_CRIAR_ICON_SIZE} aria-hidden="true" />
          {children}
        </>
      )}
    </button>
  );
}
