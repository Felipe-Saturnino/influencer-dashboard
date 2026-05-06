import type { Role } from "../types";

/**
 * Mesmo modelo de escopo que Executivo (operadoras opcionais em user_scopes + vê todos os influencers).
 * Usado em AppContext e ModalUsuario.
 */
export const ROLES_ESCOPO_TIPO_EXECUTIVO: readonly Role[] = [
  "executivo",
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];

/** Dashboards / filtros amplos / badge de pendentes como staff Spin. */
export const ROLES_VISAO_OPERACAO_SPIN: readonly Role[] = [
  "admin",
  "gestor",
  "prestador",
  "executivo",
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];

/** Overview Influencer liberado no mapa quando não há linha específica em role_permissions. */
export const ROLES_OVERVIEW_INFLUENCER_PADRAO_SIM: readonly Role[] = [
  "admin",
  "gestor",
  "prestador",
  "executivo",
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];

/** Alteração de status em Influencers / roteiro / mesas alinhado ao Gestor (finura via role_permissions). */
export const ROLES_STAFF_OPERACOES_LIVES: readonly Role[] = [
  "admin",
  "gestor",
  "executivo",
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];
