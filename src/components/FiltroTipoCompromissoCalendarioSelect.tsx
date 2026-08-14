import type { CSSProperties } from "react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import { SelectComIcone } from "./dashboard/SelectComIcone";

/** Valor agregador — todos os tipos visíveis. */
export const TIPO_COMPROMISSO_CAL_TODOS_VALUE = "todos";

/** Rótulo visível da opção agregadora (Calendário → Compromissos). */
export const TIPO_COMPROMISSO_CAL_TODOS_LABEL = "Todos Compromissos";

/** aria-label do `<select>` (nome do controlo). */
export const TIPO_COMPROMISSO_CAL_ARIA_LABEL = "Compromissos";

export type TipoCompromissoCalFiltroValue =
  | typeof TIPO_COMPROMISSO_CAL_TODOS_VALUE
  | "reunioes"
  | "turnos";

const OPCOES_TIPO: { value: Exclude<TipoCompromissoCalFiltroValue, "todos">; label: string }[] = [
  { value: "reunioes", label: "Reuniões" },
  { value: "turnos", label: "Turnos" },
];

export interface FiltroTipoCompromissoCalendarioSelectProps {
  value: TipoCompromissoCalFiltroValue;
  onChange: (value: TipoCompromissoCalFiltroValue) => void;
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  id?: string;
}

/**
 * Filtro de tipo de compromisso no Calendário RH — pill com ícone (padrão Operadora/Influencer).
 */
export function FiltroTipoCompromissoCalendarioSelect({
  value,
  onChange,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  style,
  id,
}: FiltroTipoCompromissoCalendarioSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== TIPO_COMPROMISSO_CAL_TODOS_VALUE;
  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={FilterBarIcons.tipoCompromisso}
      label={TIPO_COMPROMISSO_CAL_ARIA_LABEL}
      value={value}
      onChange={(v) => onChange(v as TipoCompromissoCalFiltroValue)}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      <option value={TIPO_COMPROMISSO_CAL_TODOS_VALUE}>{TIPO_COMPROMISSO_CAL_TODOS_LABEL}</option>
      {OPCOES_TIPO.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectComIcone>
  );
}
