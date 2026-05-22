import type { Ref } from "react";
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
};

/** Campo de busca no painel aberto de um filtro (dropdown). Placeholder: `Pesquisar [Nome do filtro]...` */
export function BarraPesquisaFiltroPainel({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel = "Pesquisar na lista",
  inputRef,
}: BarraPesquisaFiltroPainelProps) {
  const { theme: t } = useApp();

  return (
    <div style={{ position: "relative", marginBottom: 0 }}>
      <Search size={14} strokeWidth={2} aria-hidden="true" style={getBarraPesquisaFiltroPainelIconStyle(t)} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="app-barra-pesquisa-pagina-input"
        style={getBarraPesquisaFiltroPainelInputStyle(t)}
      />
    </div>
  );
}
