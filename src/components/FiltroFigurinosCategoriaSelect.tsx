import type { CSSProperties } from "react";
import { Tags } from "lucide-react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  FIGURINO_CATEGORIA_ARIA_LABEL,
  FIGURINO_CATEGORIA_TODAS_LABEL,
  FIGURINO_CATEGORIA_TODAS_VALUE,
} from "../lib/filtroFigurinosConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroFigurinosCategoriaSelectProps {
  value: string;
  onChange: (value: string) => void;
  categorias: readonly string[];
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

/** Filtro de categoria (Figurinos): ícone Tags + select pill; agregadora «Todas Categorias». */
export function FiltroFigurinosCategoriaSelect({
  value,
  onChange,
  categorias,
  todasValue = FIGURINO_CATEGORIA_TODAS_VALUE,
  todasLabel = FIGURINO_CATEGORIA_TODAS_LABEL,
  showTodasOption = true,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = FIGURINO_CATEGORIA_ARIA_LABEL,
  style,
  id,
}: FiltroFigurinosCategoriaSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={<Tags size={15} aria-hidden="true" />}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && <option value={todasValue}>{todasLabel}</option>}
      {categorias.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </SelectComIcone>
  );
}
