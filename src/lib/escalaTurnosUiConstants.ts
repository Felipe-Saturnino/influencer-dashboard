import type { RhCalendarioAcaoTipo } from "./rhCalendarioAcaoHelpers";

/** Tipos de ação no Marketplace / Solicitações (subset do calendário + «todos» na UI). */
export type EscalaAcaoFiltro = RhCalendarioAcaoTipo | "todos";

export const ESCALA_ACAO_TIPO_OPCOES_TODAS: { value: EscalaAcaoFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "venda_turno", label: "Venda de Turno" },
  { value: "venda_folga", label: "Venda de Folga" },
  { value: "oferta_troca", label: "Oferta de Troca" },
  { value: "troca_cassada", label: "Troca Casada" },
];

export const ESCALA_ACAO_TIPO_OPCOES_MINHAS: { value: Exclude<EscalaAcaoFiltro, "todos">; label: string }[] = [
  { value: "venda_turno", label: "Venda de Turno" },
  { value: "venda_folga", label: "Venda de Folga" },
  { value: "oferta_troca", label: "Oferta de Troca" },
  { value: "troca_cassada", label: "Troca Casada" },
];

export type EscalaTimeFiltro =
  | "todos"
  | "customer_service"
  | "service_manager"
  | "game_presenter"
  | "performance_coach"
  | "shift_leader"
  | "shuffler"
  | "treinamento";

export const ESCALA_TIME_OPCOES: { value: EscalaTimeFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "customer_service", label: "Customer Service" },
  { value: "service_manager", label: "Service Manager" },
  { value: "game_presenter", label: "Game Presenter" },
  { value: "performance_coach", label: "Performance Coach" },
  { value: "shift_leader", label: "Shift Leader" },
  { value: "shuffler", label: "Shuffler" },
  { value: "treinamento", label: "Treinamento" },
];

export type OfertaStatusUi =
  | "interessado"
  | "em_analise"
  | "aberto"
  | "aprovada"
  | "recusada"
  | "cancelada";

export const OFERTA_STATUS_LABEL: Record<OfertaStatusUi, string> = {
  interessado: "Interessado",
  em_analise: "Em análise",
  aberto: "Aberto",
  aprovada: "Aprovada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const RH_CALENDARIO_ACAO_LABEL_FORMAL: Record<RhCalendarioAcaoTipo, string> = {
  venda_turno: "Venda de Turno",
  venda_folga: "Venda de Folga",
  oferta_troca: "Oferta de Troca",
  troca_cassada: "Troca Casada",
  agendamento_reuniao: "Agendamento de reunião",
};

export type LinhaOfertaMarketplace = {
  id: string;
  dataOfertaIso: string;
  tipo: RhCalendarioAcaoTipo;
  turnoOferta: string;
  operadora: string;
  ofertante: string;
  dataInteresseIso?: string;
  turnoInteresse?: string;
  timeKey: EscalaTimeFiltro;
  status?: OfertaStatusUi;
  comprador?: string;
  /** Para filtro de staff nas Solicitações (ligação futura a `rh_funcionarios`). */
  solicitanteStaffId?: string;
};
