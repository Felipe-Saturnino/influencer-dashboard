import type { CSSProperties } from "react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  FIGURINO_TAMANHO_ARIA_LABEL,
  FIGURINO_TAMANHO_TODAS_LABEL,
  FIGURINO_TAMANHO_TODAS_VALUE,
} from "../lib/filtroFigurinosConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroFigurinosTamanhoSelectProps {
  value: string;
  onChange: (value: string) => void;
  tamanhos: readonly string[];
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

/** Filtro de tamanho (Figurinos): ícone Ruler + select pill; agregadora «Todos Tamanhos». */
export function FiltroFigurinosTamanhoSelect({
  value,
  onChange,
  tamanhos,
  todasValue = FIGURINO_TAMANHO_TODAS_VALUE,
  todasLabel = FIGURINO_TAMANHO_TODAS_LABEL,
  showTodasOption = true,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = FIGURINO_TAMANHO_ARIA_LABEL,
  style,
  id,
}: FiltroFigurinosTamanhoSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={FilterBarIcons.figurinoTamanho}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && <option value={todasValue}>{todasLabel}</option>}
      {tamanhos.map((tam) => (
        <option key={tam} value={tam}>
          {tam}
        </option>
      ))}
    </SelectComIcone>
  );
}
