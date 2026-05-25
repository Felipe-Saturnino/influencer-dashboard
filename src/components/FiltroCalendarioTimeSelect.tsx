import { UsersRound } from "lucide-react";
import { FiltroEntidadeBarSelect, type FiltroEntidadeBarSelectProps } from "./FiltroEntidadeBarSelect";

export type FiltroCalendarioTimeSelectProps = Omit<
  FiltroEntidadeBarSelectProps,
  "icon" | "triggerEmptyLabel" | "ariaFilterPrefix" | "listboxAriaLabel"
>;

/** Filtro Time no Calendário — pill padrão Influencer/Operadora, ícone `UsersRound` (igual Gestão de Staff). */
export function FiltroCalendarioTimeSelect(props: FiltroCalendarioTimeSelectProps) {
  return (
    <FiltroEntidadeBarSelect
      icon={<UsersRound size={15} strokeWidth={2} aria-hidden="true" />}
      triggerEmptyLabel="Time"
      ariaFilterPrefix="Filtrar por time"
      listboxAriaLabel="Selecionar time"
      {...props}
    />
  );
}
