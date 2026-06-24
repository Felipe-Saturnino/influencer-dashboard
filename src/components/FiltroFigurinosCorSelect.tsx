import type { CSSProperties } from "react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  FIGURINO_COR_ARIA_LABEL,
  FIGURINO_COR_TODAS_LABEL,
  FIGURINO_COR_TODAS_VALUE,
} from "../lib/filtroFigurinosConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroFigurinosCorSelectProps {
  value: string;
  onChange: (value: string) => void;
  cores: readonly string[];
  todasValue?: string;
  todasLabel?: string;
  showTodasOption?: boolean;
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  label?: string;
  style?: CSSProperties;
  id?: string;
}

/** Filtro de cor (Figurinos): ícone Palette + select pill; agregadora «Todas Cores». */
export function FiltroFigurinosCorSelect({
  value,
  onChange,
  cores,
  todasValue = FIGURINO_COR_TODAS_VALUE,
  todasLabel = FIGURINO_COR_TODAS_LABEL,
  showTodasOption = true,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = FIGURINO_COR_ARIA_LABEL,
  style,
  id,
}: FiltroFigurinosCorSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={FilterBarIcons.figurinoCor}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && <option value={todasValue}>{todasLabel}</option>}
      {cores.map((cor) => (
        <option key={cor} value={cor}>
          {cor}
        </option>
      ))}
    </SelectComIcone>
  );
}
