import type { CSSProperties } from "react";
import { Shield } from "lucide-react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import { SelectComIcone } from "./dashboard/SelectComIcone";

/** Valor canónico da opção agregadora (todas as operadoras no escopo). */
export const OPERADORA_FILTRO_TODAS_VALUE = "todas";

/** Rótulo visível da opção agregadora — padronizado em toda a plataforma. */
export const OPERADORA_FILTRO_TODAS_LABEL = "Todas Operadoras";

/** aria-label do controlo `<select>` (nome do filtro, não o valor selecionado). */
export const OPERADORA_FILTRO_ARIA_LABEL = "Operadoras";

export type OperadoraFiltroOption = { slug: string; nome: string };

export type FiltroOperadoraExtraOption = { value: string; label: string };

export interface FiltroOperadoraSelectProps {
  value: string;
  onChange: (value: string) => void;
  operadoras: readonly OperadoraFiltroOption[];
  todasValue?: string;
  todasLabel?: string;
  showTodasOption?: boolean;
  /** Opções extras após a agregadora e antes da lista (ex.: Nenhuma). */
  extraOptions?: readonly FiltroOperadoraExtraOption[];
  podeVerOperadora?: (slug: string) => boolean;
  pill?: boolean;
  minWidth?: number;
  highlightWhenFiltered?: boolean;
  disabled?: boolean;
  /** aria-label do select (default: Operadoras). */
  label?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * Filtro de operadora padronizado: ícone Shield (Lucide) + select;
 * opção agregadora com rótulo "Todas Operadoras" + ícone Shield.
 */
export function FiltroOperadoraSelect({
  value,
  onChange,
  operadoras,
  todasValue = OPERADORA_FILTRO_TODAS_VALUE,
  todasLabel = OPERADORA_FILTRO_TODAS_LABEL,
  showTodasOption = true,
  extraOptions = [],
  podeVerOperadora,
  pill = true,
  minWidth = 200,
  highlightWhenFiltered = true,
  disabled = false,
  label = OPERADORA_FILTRO_ARIA_LABEL,
  style,
  id,
}: FiltroOperadoraSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== todasValue;

  const filteredStyle: CSSProperties | undefined =
    highlightWhenFiltered && isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  const list = [...operadoras]
    .filter((o) => (podeVerOperadora ? podeVerOperadora(o.slug) : true))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={<Shield size={15} aria-hidden="true" />}
      label={label}
      value={value}
      onChange={onChange}
      pill={pill}
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {showTodasOption && (
        <option value={todasValue}>{todasLabel}</option>
      )}
      {extraOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {list.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.nome}
        </option>
      ))}
    </SelectComIcone>
  );
}
