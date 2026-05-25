import type { CSSProperties, ReactNode } from "react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export type FiltroBarCampoOption = { value: string; label: string };

export interface FiltroBarCampoSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly FiltroBarCampoOption[];
  icon: ReactNode;
  /** aria-label do `<select>`. */
  ariaLabel: string;
  todasValue?: string;
  todasLabel?: string;
  showTodasOption?: boolean;
  /** Opções após a agregadora (ex.: status específicos). */
  extraOptions?: readonly FiltroBarCampoOption[];
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  id?: string;
}

/**
 * Select pill na barra de filtros — mesmo contrato visual que `FiltroOperadoraSelect`.
 */
export function FiltroBarCampoSelect({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
  todasValue = "",
  todasLabel = "Todos",
  showTodasOption = true,
  extraOptions = [],
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  style,
  id,
}: FiltroBarCampoSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;
  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  const list = [...options].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={icon}
      label={ariaLabel}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && <option value={todasValue}>{todasLabel}</option>}
      {extraOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {list.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectComIcone>
  );
}
