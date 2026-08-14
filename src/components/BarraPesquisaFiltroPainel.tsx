import {
  useEffect,
  useRef,
  type KeyboardEventHandler,
  type Ref,
  type RefCallback,
} from "react";
import { Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  getBarraPesquisaFiltroPainelIconStyle,
  getBarraPesquisaFiltroPainelInputStyle,
} from "../lib/searchBarStyles";

export type BarraPesquisaFiltroPainelProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  "aria-activedescendant"?: string;
  /**
   * Ao montar, foca o input para digitar sem clique extra.
   * Default `true` — obrigatório em painéis de filtro/select com busca.
   * Use `false` só se a barra for permanente e o foco inicial for outro campo.
   */
  autoFocusOnMount?: boolean;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    (ref as RefCallback<T>)(value);
  } else {
    (ref as { current: T | null }).current = value;
  }
}

/** Campo de busca no painel aberto de um filtro (dropdown). Placeholder: `Pesquisar [Nome do filtro]...` */
export function BarraPesquisaFiltroPainel({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel = "Pesquisar na lista",
  inputRef,
  onKeyDown,
  "aria-activedescendant": ariaActiveDescendant,
  autoFocusOnMount = true,
}: BarraPesquisaFiltroPainelProps) {
  const { theme: t } = useApp();
  const localRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocusOnMount) return;
    const id = requestAnimationFrame(() => localRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocusOnMount]);

  return (
    <div style={{ position: "relative", marginBottom: 0 }}>
      <Search size={14} strokeWidth={2} aria-hidden="true" style={getBarraPesquisaFiltroPainelIconStyle(t)} />
      <input
        ref={(node) => {
          localRef.current = node;
          assignRef(inputRef, node);
        }}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-activedescendant={ariaActiveDescendant}
        onKeyDown={onKeyDown}
        autoComplete="off"
        className="app-barra-pesquisa-pagina-input"
        style={getBarraPesquisaFiltroPainelInputStyle(t)}
      />
    </div>
  );
}
