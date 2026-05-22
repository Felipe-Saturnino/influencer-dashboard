import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  TURNO_FILTRO_ARIA_LABEL,
  TURNO_FILTRO_TODOS_LABEL,
  TURNO_FILTRO_TODOS_VALUE,
  type TurnoFiltroOption,
} from "../lib/filtroTurnoConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroTurnoSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly TurnoFiltroOption[];
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

/**
 * Filtro de turno padronizado: ícone Clock (Lucide) + select;
 * opção agregadora com rótulo «Todos Turnos».
 */
export function FiltroTurnoSelect({
  value,
  onChange,
  options,
  todasValue = TURNO_FILTRO_TODOS_VALUE,
  todasLabel = TURNO_FILTRO_TODOS_LABEL,
  showTodasOption = true,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = TURNO_FILTRO_ARIA_LABEL,
  style,
  id,
}: FiltroTurnoSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={<Clock size={15} aria-hidden="true" />}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && <option value={todasValue}>{todasLabel}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </SelectComIcone>
  );
}
