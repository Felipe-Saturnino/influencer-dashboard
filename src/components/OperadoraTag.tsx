/* eslint-disable react-refresh/only-export-components -- getOperadoraTagStyles exportado para reutilização. */
import { FONT } from "../constants/theme";

/**
 * Retorna bg, color e border para uma tag baseada na cor primária da operadora.
 * Sem cor salva: usa --brand-action via color-mix (evita concatenar sufixo hex em var()).
 */
function getOperadoraTagStyles(corPrimaria: string | null | undefined) {
  const trimmed = corPrimaria?.trim();
  if (!trimmed) {
    return {
      bg: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
      color: "var(--brand-action, #7c3aed)",
      borderProperty: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 27%, transparent)",
    };
  }
  return {
    bg: `${trimmed}18`,
    color: trimmed,
    borderProperty: `1px solid ${trimmed}44`,
  };
}

export interface OperadoraTagProps {
  label: string;
  corPrimaria?: string | null;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Tag de operadora usando a cor primária da operadora.
 * Quando corPrimaria não está definida, usa --brand-action como fallback.
 */
export default function OperadoraTag({ label, corPrimaria, icon, style }: OperadoraTagProps) {
  const { bg, color, borderProperty } = getOperadoraTagStyles(corPrimaria);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 20,
        background: bg,
        color,
        border: borderProperty,
        fontWeight: 600,
        fontFamily: FONT.body,
        ...style,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

export { getOperadoraTagStyles };
