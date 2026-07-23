export type TurnoFiltroOption = { value: string; label: string };

/** Valor canónico da opção agregadora (todos os turnos no escopo). */
export const TURNO_FILTRO_TODOS_VALUE = "todos";

/** Rótulo visível da opção agregadora — padronizado em toda a plataforma. */
export const TURNO_FILTRO_TODOS_LABEL = "Todos Turnos";

/** aria-label do controlo `<select>` (nome do filtro, não o valor selecionado). */
export const TURNO_FILTRO_ARIA_LABEL = "Turnos";

/** Opções de turno na Gestão de Staff (após «Todos Turnos»). */
export const GESTAO_STAFF_TURNO_FILTRO_OPCOES: TurnoFiltroOption[] = [
  { value: "nenhum", label: "Nenhum" },
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "comercial", label: "Comercial" },
];

/** Manhã / Tarde / Noite (após «Todos Turnos») — Relatório de Turno e similares. */
export const TURNO_FILTRO_MANHA_TARDE_NOITE: TurnoFiltroOption[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];
