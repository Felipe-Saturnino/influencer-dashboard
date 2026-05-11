import type { Role } from "../types";

/** Mesmo contrato de escopo que Influenciador: `user_scopes` operadora + `influencer_perfil` / `influencer_operadoras`. */
export const ROLES_PARIDADE_INFLUENCER: readonly Role[] = ["influencer", "afiliado"];

export function roleParidadeInfluencer(role: Role | undefined | null): boolean {
  return !!role && ROLES_PARIDADE_INFLUENCER.includes(role);
}

/**
 * Perfis staff Spin: sem escopo por operadora na Gestão nem na app — só `role_permissions` (aba Permissões).
 * Mesma visão ampla de operadoras/influencers nos filtros que Executivo (sem user_scopes).
 */
export const ROLES_STAFF_APENAS_PERMISSOES: readonly Role[] = [
  "shift_leader",
  "service_manager",
  "figurino",
  "rh",
];

/** @deprecated usar ROLES_STAFF_APENAS_PERMISSOES */
export const ROLES_ESCOPO_TIPO_EXECUTIVO = ROLES_STAFF_APENAS_PERMISSOES;

/** Dashboards / filtros amplos / badge de pendentes como staff Spin. */
export const ROLES_VISAO_OPERACAO_SPIN: readonly Role[] = [
  "admin",
  "gestor",
  "prestador",
  "executivo",
  "investidor",
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
  "investidor",
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
