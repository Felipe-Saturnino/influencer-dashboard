import type { CSSProperties } from "react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  FIGURINO_GENERO_ARIA_LABEL,
  FIGURINO_GENERO_TODOS_LABEL,
  FIGURINO_GENERO_TODOS_VALUE,
} from "../lib/filtroFigurinosConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroFigurinosGeneroSelectProps {
  value: string;
  onChange: (value: string) => void;
  generos: readonly string[];
  todosValue?: string;
  todosLabel?: string;
  showTodosOption?: boolean;
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  label?: string;
  style?: CSSProperties;
  id?: string;
}

/** Filtro de gênero (Figurinos): ícone Shirt + select pill; agregadora «Todos Gêneros». */
export function FiltroFigurinosGeneroSelect({
  value,
  onChange,
  generos,
  todosValue = FIGURINO_GENERO_TODOS_VALUE,
  todosLabel = FIGURINO_GENERO_TODOS_LABEL,
  showTodosOption = true,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = FIGURINO_GENERO_ARIA_LABEL,
  style,
  id,
}: FiltroFigurinosGeneroSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todosValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={FilterBarIcons.figurinoGenero}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodosOption && <option value={todosValue}>{todosLabel}</option>}
      {generos.map((genero) => (
        <option key={genero} value={genero}>
          {genero}
        </option>
      ))}
    </SelectComIcone>
  );
}
