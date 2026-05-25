import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { FiltroEntidadeBarSelect, type FiltroEntidadeBarSelectProps } from "./FiltroEntidadeBarSelect";

export type FiltroCalendarioStaffSelectProps = Omit<
  FiltroEntidadeBarSelectProps,
  "icon" | "triggerEmptyLabel" | "ariaFilterPrefix" | "listboxAriaLabel" | "enableSearch"
> & {
  enableSearch?: boolean;
};

/** Filtro Staff no Calendário — pill padrão, ícone `IdCard`, busca no painel quando >5 itens. */
export function FiltroCalendarioStaffSelect({ enableSearch = true, ...props }: FiltroCalendarioStaffSelectProps) {
  return (
    <FiltroEntidadeBarSelect
      icon={FilterBarIcons.staff}
      triggerEmptyLabel="Staff"
      ariaFilterPrefix="Filtrar por staff"
      listboxAriaLabel="Selecionar membro do staff"
      enableSearch={enableSearch}
      {...props}
    />
  );
}
