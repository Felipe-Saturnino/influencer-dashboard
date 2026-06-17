import type { CSSProperties } from "react";
import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import { SelectComIcone } from "./dashboard/SelectComIcone";

/** Valor canónico da opção agregadora (todos os estúdios no escopo). */
export const ESTUDIO_FILTRO_TODOS_VALUE = "todos";

/** Rótulo visível da opção agregadora — padronizado na Gestão de Staff. */
export const ESTUDIO_FILTRO_TODOS_LABEL = "Todos Estúdios";

/** aria-label do controlo `<select>` (nome do filtro, não o valor selecionado). */
export const ESTUDIO_FILTRO_ARIA_LABEL = "Estúdios";

export type EstudioFiltroOption = { slug: string; nome: string };

export type FiltroEstudioExtraOption = { value: string; label: string };

export interface FiltroEstudioSelectProps {
  value: string;
  onChange: (value: string) => void;
  estudios: readonly EstudioFiltroOption[];
  todosValue?: string;
  todosLabel?: string;
  showTodosOption?: boolean;
  extraOptions?: readonly FiltroEstudioExtraOption[];
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  label?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * Filtro de estúdio padronizado: ícone Building2 (Lucide) + select;
 * opção agregadora «Todos Estúdios».
 */
export function FiltroEstudioSelect({
  value,
  onChange,
  estudios,
  todosValue = ESTUDIO_FILTRO_TODOS_VALUE,
  todosLabel = ESTUDIO_FILTRO_TODOS_LABEL,
  showTodosOption = true,
  extraOptions = [],
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = ESTUDIO_FILTRO_ARIA_LABEL,
  style,
  id,
}: FiltroEstudioSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todosValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  const list = [...estudios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={FilterBarIcons.estudio}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodosOption && <option value={todosValue}>{todosLabel}</option>}
      {extraOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {list.map((e) => (
        <option key={e.slug} value={e.slug}>
          {e.nome}
        </option>
      ))}
    </SelectComIcone>
  );
}
