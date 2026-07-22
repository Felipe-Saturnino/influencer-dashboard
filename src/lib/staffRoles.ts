import type { Role } from "../types";

/** Mesmo contrato de escopo que Influenciador: `user_scopes` operadora + `influencer_perfil` / `influencer_operadoras`. */
export const ROLES_PARIDADE_INFLUENCER: readonly Role[] = ["influencer", "afiliado"];

export function roleParidadeInfluencer(role: Role | undefined | null): boolean {
  return !!role && ROLES_PARIDADE_INFLUENCER.includes(role);
}

export {
  linksMateriaisAbasVisiveis,
  linksMateriaisIsSelfMode,
  linksMateriaisPrecisaSelect,
  linksMateriaisFiltrarPorEscopoAgencia,
  linksMateriaisIsSelfCanal,
  type LinksMateriaisCanal,
} from "./linksMateriaisCanal";

/** Gestores de departamento — perfil próprio, atribuição manual, só `role_permissions` (sem `gestor_tipo`). */
export const ROLES_GESTOR_DEPARTAMENTO: readonly Role[] = [
  "gestor_aquisicao",
  "gestor_marketing",
  "gestor_operacoes",
  "gestor_tech_ops",
  "gestor_academy",
  "gestor_rh",
];

export function roleGestorDepartamento(role: Role | undefined | null): boolean {
  return !!role && ROLES_GESTOR_DEPARTAMENTO.includes(role);
}

/**
 * Perfis sem escopo operadora/influencer na Gestão nem na app — só `role_permissions` (aba Permissões).
 * Visão global de dados quando Ver = sim; ações conforme Criar/Editar/Excluir.
 */
export const ROLES_SEM_RESTRICAO_ESCOPO: readonly Role[] = [
  "executivo",
  "investidor",
  ...ROLES_GESTOR_DEPARTAMENTO,
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];

/**
 * @deprecated preferir ROLES_SEM_RESTRICAO_ESCOPO — subset staff Spin (sem executivo/investidor).
 * Perfis staff Spin: sem escopo por operadora na Gestão nem na app — só `role_permissions` (aba Permissões).
 */
export const ROLES_STAFF_APENAS_PERMISSOES: readonly Role[] = [
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];

/** @deprecated usar ROLES_STAFF_APENAS_PERMISSOES */
export const ROLES_ESCOPO_TIPO_EXECUTIVO = ROLES_STAFF_APENAS_PERMISSOES;

/** Dashboards / filtros amplos / badge de pendentes como staff Spin. */
export const ROLES_VISAO_OPERACAO_SPIN: readonly Role[] = [
  "admin",
  ...ROLES_GESTOR_DEPARTAMENTO,
  "prestador",
  "executivo",
  "investidor",
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];

/** Overview Influencer liberado no mapa quando não há linha específica em role_permissions. */
export const ROLES_OVERVIEW_INFLUENCER_PADRAO_SIM: readonly Role[] = [
  "admin",
  ...ROLES_GESTOR_DEPARTAMENTO,
  "prestador",
  "executivo",
  "investidor",
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];

/** Alteração de status em Influencers / roteiro / mesas alinhado ao Gestor (finura via role_permissions). */
export const ROLES_STAFF_OPERACOES_LIVES: readonly Role[] = [
  "admin",
  ...ROLES_GESTOR_DEPARTAMENTO,
  "executivo",
  "shift_leader",
  "service_manager",
  "customer_service",
  "game_presenter",
  "shuffler",
  "tech_ops",
  "figurino",
  "comunicacao",
  "performance_coach",
  "rh",
];
