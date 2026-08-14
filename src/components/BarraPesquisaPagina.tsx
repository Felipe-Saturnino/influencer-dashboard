import type { CSSProperties, KeyboardEventHandler, Ref } from "react";
import { Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getBarraPesquisaPaginaIconStyle, getBarraPesquisaPaginaInputStyle } from "../lib/searchBarStyles";

export type BarraPesquisaPaginaProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
  disabled?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  "aria-activedescendant"?: string;
  wrapperStyle?: CSSProperties;
  inputStyle?: CSSProperties;
};

/**
 * Barra de pesquisa de lista na página: ícone Search à esquerda, borda e fundo alinhados ao padrão Scout.
 */
export function BarraPesquisaPagina({
  id,
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  disabled,
  autoComplete = "off",
  inputRef,
  onKeyDown,
  "aria-activedescendant": ariaActiveDescendant,
  wrapperStyle,
  inputStyle,
}: BarraPesquisaPaginaProps) {
  const { theme: t } = useApp();

  return (
    <div
      style={{
        position: "relative",
        minWidth: 0,
        boxSizing: "border-box",
        ...wrapperStyle,
      }}
    >
      <Search size={16} strokeWidth={2} aria-hidden="true" style={getBarraPesquisaPaginaIconStyle(t)} />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-activedescendant={ariaActiveDescendant}
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoComplete={autoComplete}
        className="app-barra-pesquisa-pagina-input"
        style={{ ...getBarraPesquisaPaginaInputStyle(t), ...inputStyle }}
      />
    </div>
  );
}
