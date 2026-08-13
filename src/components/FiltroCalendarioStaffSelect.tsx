import { FilterBarIcons } from "../lib/filterBarIconCatalog";
import { FiltroEntidadeBarSelect, type FiltroEntidadeBarSelectProps } from "./FiltroEntidadeBarSelect";

export type FiltroCalendarioStaffSelectProps = Omit<
  FiltroEntidadeBarSelectProps,
  "icon" | "triggerEmptyLabel" | "ariaFilterPrefix" | "listboxAriaLabel" | "enableSearch"
> & {
  enableSearch?: boolean;
  /** Rótulo do trigger vazio. Default: Staff. Overview Prestador: «Todo o time». */
  triggerEmptyLabel?: string;
};

/** Filtro Staff no Calendário — pill padrão, ícone `IdCard`, busca no painel quando >5 itens. */
export function FiltroCalendarioStaffSelect({
  enableSearch = true,
  triggerEmptyLabel = "Staff",
  ...props
}: FiltroCalendarioStaffSelectProps) {
  return (
    <FiltroEntidadeBarSelect
      icon={FilterBarIcons.staff}
      triggerEmptyLabel={triggerEmptyLabel}
      ariaFilterPrefix="Filtrar por staff"
      listboxAriaLabel="Selecionar membro do staff"
      enableSearch={enableSearch}
      {...props}
    />
  );
}
