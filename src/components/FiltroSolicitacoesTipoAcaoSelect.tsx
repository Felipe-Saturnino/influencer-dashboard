import type { CSSProperties } from "react";
import { ListChecks } from "lucide-react";
import { useDashboardBrand } from "../hooks/useDashboardBrand";
import { getFiltroCampoAtivoStyle } from "../lib/filterBarStyles";
import {
  ESCALA_ACAO_FILTRO_ARIA_LABEL,
  ESCALA_ACAO_TIPO_OPCOES_TODAS,
  type EscalaAcaoFiltro,
} from "../lib/escalaTurnosUiConstants";
import { SelectComIcone } from "./dashboard/SelectComIcone";

export interface FiltroSolicitacoesTipoAcaoSelectProps {
  value: EscalaAcaoFiltro;
  onChange: (value: EscalaAcaoFiltro) => void;
  minWidth?: number;
  disabled?: boolean;
  style?: CSSProperties;
  id?: string;
}

/**
 * Filtro «Tipo de ação» — pill como Operadora/Influencer, ícone `ListChecks`, agregadora «Todas Ações».
 */
export function FiltroSolicitacoesTipoAcaoSelect({
  value,
  onChange,
  minWidth = 200,
  disabled = false,
  style,
  id,
}: FiltroSolicitacoesTipoAcaoSelectProps) {
  const brand = useDashboardBrand();
  const isFiltered = value !== "todos";
  const filteredStyle: CSSProperties | undefined = isFiltered ? getFiltroCampoAtivoStyle(brand) : undefined;

  return (
    <SelectComIcone
      id={id}
      disabled={disabled}
      icon={<ListChecks size={15} aria-hidden="true" />}
      label={ESCALA_ACAO_FILTRO_ARIA_LABEL}
      value={value}
      onChange={(v) => onChange(v as EscalaAcaoFiltro)}
      pill
      minWidth={minWidth}
      style={{ ...filteredStyle, ...style }}
    >
      {ESCALA_ACAO_TIPO_OPCOES_TODAS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </SelectComIcone>
  );
}
