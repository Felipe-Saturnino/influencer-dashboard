import type { RhCalendarioAcaoTipo } from "./rhCalendarioAcaoHelpers";

/** Tipos de ação no Marketplace / Solicitações (subset do calendário + «todos» na UI). */
export type EscalaAcaoFiltro =
  | RhCalendarioAcaoTipo
  | "oferta_spin_cobertura"
  | "oferta_spin_liberacao"
  | "todos";

/** Valor canónico da opção agregadora de tipo de ação. */
export const ESCALA_ACAO_FILTRO_TODAS_VALUE = "todos";

/** Rótulo visível da opção agregadora — Solicitações / filtros de ação. */
export const ESCALA_ACAO_FILTRO_TODAS_LABEL = "Todas Ações";

/** aria-label do controlo (nome do filtro). */
export const ESCALA_ACAO_FILTRO_ARIA_LABEL = "Tipo de ação";

export const ESCALA_ACAO_TIPO_OPCOES_TODAS: { value: EscalaAcaoFiltro; label: string }[] = [
  { value: "todos", label: ESCALA_ACAO_FILTRO_TODAS_LABEL },
  { value: "venda_turno", label: "Venda de Turno" },
  { value: "venda_folga", label: "Venda de Folga" },
  { value: "oferta_troca", label: "Oferta de Troca" },
];

/** Marketplace — aba Todas as Ofertas (P2P + Spin). Solicitações usa só `ESCALA_ACAO_TIPO_OPCOES_TODAS`. */
export const ESCALA_ACAO_TIPO_OPCOES_MARKETPLACE_TODAS: { value: EscalaAcaoFiltro; label: string }[] = [
  { value: "todos", label: ESCALA_ACAO_FILTRO_TODAS_LABEL },
  { value: "venda_turno", label: "Venda de Turno" },
  { value: "venda_folga", label: "Venda de Folga" },
  { value: "oferta_troca", label: "Oferta de Troca" },
  { value: "oferta_spin_cobertura", label: "Cobertura Spin" },
  { value: "oferta_spin_liberacao", label: "Liberação Spin" },
];

export const ESCALA_ACAO_TIPO_OPCOES_SPIN: { value: EscalaAcaoFiltro; label: string }[] = [
  { value: "todos", label: ESCALA_ACAO_FILTRO_TODAS_LABEL },
  { value: "oferta_spin_cobertura", label: "Cobertura Spin" },
  { value: "oferta_spin_liberacao", label: "Liberação Spin" },
];

export const ESCALA_ACAO_TIPO_OPCOES_MINHAS: { value: EscalaAcaoFiltro; label: string }[] = [
  { value: "todos", label: ESCALA_ACAO_FILTRO_TODAS_LABEL },
  { value: "venda_turno", label: "Venda de Turno" },
  { value: "venda_folga", label: "Venda de Folga" },
  { value: "oferta_troca", label: "Oferta de Troca" },
];

export type EscalaTimeFiltro =
  | "todos"
  | "service_manager"
  | "game_presenter"
  | "performance_coach"
  | "shift_leader"
  | "shuffler"
  | "treinamento";

/** Filtro Time do Marketplace: Liderança agrega Shift Leader + Service Manager. */
export type MarketplaceTimeFiltro = EscalaTimeFiltro | "lideranca";

export const ESCALA_TIME_OPCOES: { value: EscalaTimeFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "service_manager", label: "Service Manager" },
  { value: "game_presenter", label: "Game Presenter" },
  { value: "performance_coach", label: "Performance Coach" },
  { value: "shift_leader", label: "Shift Leader" },
  { value: "shuffler", label: "Shuffler" },
  { value: "treinamento", label: "Treinamento" },
];

/** Alinha o slug do filtro «Time» às strings do Calendário / `CALENDARIO_TIMES_FILTRO_ORDEM`. */
export const ESCALA_TIME_SLUG_PARA_ROTULO_CALENDARIO: Record<Exclude<EscalaTimeFiltro, "todos">, string> = {
  service_manager: "Service Manager",
  game_presenter: "Game Presenter",
  performance_coach: "Performance Coach",
  shift_leader: "Shift Leader",
  shuffler: "Shuffler",
  treinamento: "Treinamento",
};

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

export const RH_CALENDARIO_ACAO_LABEL_FORMAL: Record<
  RhCalendarioAcaoTipo | "oferta_spin_cobertura" | "oferta_spin_liberacao",
  string
> = {
  venda_turno: "Venda de Turno",
  venda_folga: "Venda de Folga",
  oferta_troca: "Oferta de Troca",
  agendamento_reuniao: "Agendamento de reunião",
  oferta_spin_cobertura: "Cobertura Spin",
  oferta_spin_liberacao: "Liberação Spin",
};

export type MarketplaceTipoLinha =
  | RhCalendarioAcaoTipo
  | "oferta_spin_cobertura"
  | "oferta_spin_liberacao";

export type LinhaOfertaMarketplace = {
  id: string;
  /** Data da oferta (marketplace / turno ofertado). */
  dataOfertaIso: string;
  /** Data de abertura da solicitação — filtro de período em Solicitações; se omitida, usa `dataOfertaIso`. */
  dataAberturaIso?: string;
  tipo: MarketplaceTipoLinha;
  turnoOferta: string;
  operadora: string;
  /** Marketplace: estúdio(s) do prestador ofertante (Gestão de Staff); sem valor cai no rótulo de operadora. */
  estudio?: string;
  ofertante: string;
  dataInteresseIso?: string;
  turnoInteresse?: string;
  timeKey: EscalaTimeFiltro;
  status?: OfertaStatusUi;
  comprador?: string;
  /** Para filtro de staff nas Solicitações (ligação futura a `rh_funcionarios`). */
  solicitanteStaffId?: string;
  /** Marketplace: id do interessado (quem aceitou). */
  interessadoStaffId?: string;
  observacao?: string;
  /** Marketplace: o prestador logado publicou esta oferta (P2P). */
  souOfertante?: boolean;
  /** Marketplace: o prestador logado aceitou esta oferta. */
  souInteressado?: boolean;
  /** Marketplace: a oferta é do mesmo grupo de negociação (mesmo time, ou Liderança = SL + SM). */
  mesmoTime?: boolean;
  /** Oferta operacional Spin Gaming (1 célula na grade). */
  ofertaSpin?: boolean;
  /** Oferta Spin criada pelo login (auditoria / cancelar). */
  souCriadorSpin?: boolean;
  /** Proposta de compra em nome da Spin Gaming (aguarda aprovação do ofertante). */
  propostaSpinGestao?: boolean;
};
