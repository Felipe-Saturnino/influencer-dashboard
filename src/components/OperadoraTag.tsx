import { FONT } from "../constants/theme";
import { BRAND } from "../lib/dashboardConstants";

const FALLBACK_COLOR = BRAND.roxoVivo;

/**
 * Retorna bg, color e border para uma tag baseada na cor primária da operadora.
 */
function getOperadoraTagStyles(corPrimaria: string | null | undefined, _dark: boolean) {
  const cor = corPrimaria?.trim() || FALLBACK_COLOR;
  return {
    bg: `${cor}18`,
    color: cor,
    border: `${cor}44`,
  };
}

export interface OperadoraTagProps {
  label: string;
  corPrimaria?: string | null;
  dark?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Tag de operadora usando a cor primária da operadora.
 * Quando corPrimaria não está definida, usa roxo como fallback.
 */
export default function OperadoraTag({ label, corPrimaria, dark = false, icon, style }: OperadoraTagProps) {
  const { bg, color, border } = getOperadoraTagStyles(corPrimaria, dark);

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
        border: `1px solid ${border}`,
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
