import type { RhVagaStatus } from "../types/rhVaga";
import type { RhVagasCandidaturasFiltroTipo } from "../types/rhVagaCandidatura";
import type { FiltroBarCampoOption } from "../components/FiltroBarCampoSelect";

export const VAGA_FILTRO_TODOS_STATUS_VALUE = "todos" as const;
export const VAGA_FILTRO_TODOS_STATUS_LABEL = "Todos Status";
export const VAGA_FILTRO_STATUS_ARIA_LABEL = "Status da vaga";

export const VAGA_STATUS_FILTRO_OPCOES: readonly FiltroBarCampoOption[] = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

export const VAGA_FILTRO_TODOS_TIPOS_VALUE = "todos" as const;
export const VAGA_FILTRO_TODOS_TIPOS_LABEL = "Todos Tipos";
export const VAGA_FILTRO_TIPO_ARIA_LABEL = "Tipos de vaga";

export const VAGA_TIPO_FILTRO_OPCOES: readonly FiltroBarCampoOption[] = [
  { value: "externo", label: "Externo" },
  { value: "interno", label: "Interno" },
];

export const VAGA_FILTRO_TODAS_VAGAS_VALUE = "todas" as const;
export const VAGA_FILTRO_TODAS_VAGAS_LABEL = "Todas Vagas";
export const VAGA_FILTRO_VAGAS_ARIA_LABEL = "Vagas";

export type VagaFiltroStatusValue = RhVagaStatus | typeof VAGA_FILTRO_TODOS_STATUS_VALUE;
export type VagaFiltroTipoCandidaturasValue = RhVagasCandidaturasFiltroTipo;
