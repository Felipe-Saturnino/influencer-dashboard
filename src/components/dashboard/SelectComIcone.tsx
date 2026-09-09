import { useMemo, type CSSProperties, type ReactNode } from "react";
import { extractSelectOptionsFromChildren } from "../../lib/selectListaComBuscaOptions";
import { SelectListaComBusca } from "../SelectListaComBusca";

export interface SelectComIconeProps {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  /** Rótulo acessível (aria-label) — obrigatório. */
  label: string;
  minWidth?: number;
  /** true: mesmo visual pill do Overview Influencer (border-radius 999). */
  pill?: boolean;
  style?: CSSProperties;
  id?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

/**
 * Select da barra / formulário com painel pesquisável (padrão Staff/Time do Calendário).
 * Os filhos continuam a ser `<option>` / `<optgroup>` por compatibilidade.
 */
export function SelectComIcone({
  icon,
  value,
  onChange,
  children,
  label,
  minWidth = 160,
  pill = true,
  style,
  id,
  disabled = false,
  searchPlaceholder,
}: SelectComIconeProps) {
  const options = useMemo(() => extractSelectOptionsFromChildren(children), [children]);

  return (
    <SelectListaComBusca
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      label={label}
      searchPlaceholder={searchPlaceholder}
      icon={icon}
      variant={pill ? "pill" : "campo"}
      minWidth={minWidth}
      disabled={disabled}
      style={style}
    />
  );
}
