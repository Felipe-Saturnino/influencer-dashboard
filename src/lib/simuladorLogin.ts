import type { GestorTipoSlug, PrestadorTipoSlug, Role } from "../types";
import type { EscoposVisiveis, PermissoesMapa } from "../context/AppContext";
import type { PermissoesAcoesMapa } from "./appRoutes";
import { ROLES_SEM_RESTRICAO_ESCOPO, roleParidadeInfluencer } from "./staffRoles";
import {
  GESTOR_TIPOS,
  PRESTADOR_TIPOS,
  FILTROS_PERFIL_LINHAS_SIMULADOR,
  ROLES_SIMULAVEIS,
  roleLabel,
} from "../pages/plataforma/GestaoUsuarios/constants";
import { supabase } from "./supabase";

export const SIMULADOR_LOGIN_SESSION_KEY = "simulador_login_ativo";

export { ROLES_SIMULAVEIS };

/** Linhas da página Simulador filtradas pelos perfis permitidos ao usuário logado. */
export function filtrarLinhasSimuladorPorRoles(
  rolesPermitidos: readonly Role[],
): { titulo: string; roles: Role[] }[] {
  const set = new Set(rolesPermitidos);
  return FILTROS_PERFIL_LINHAS_SIMULADOR.map(({ titulo, roles }) => ({
    titulo,
    roles: roles.filter((r) => set.has(r)),
  })).filter((l) => l.roles.length > 0);
}

/** Perfis simuláveis configurados para o perfil logado (Gestão de Usuários → Simulador de Login). */
export async function carregarRolesSimulaveisParaViewer(viewerRole: Role): Promise<Role[]> {
  if (viewerRole === "admin") {
    return [...ROLES_SIMULAVEIS];
  }
  const { data, error } = await supabase
    .from("simulador_login_roles")
    .select("simulavel_role")
    .eq("viewer_role", viewerRole);
  if (error) {
    console.error("Erro ao carregar simulador_login_roles:", error);
    return [];
  }
  const permitidos = new Set<Role>();
  (data ?? []).forEach((row: { simulavel_role: string }) => {
    const role = row.simulavel_role as Role;
    if (ROLES_SIMULAVEIS.includes(role)) permitidos.add(role);
  });
  return ROLES_SIMULAVEIS.filter((r) => permitidos.has(r));
}

export const SIMULADOR_LOGIN_PAGE_KEY = "simulador_login" as const;

export type SimulacaoLoginState = {
  role: Role;
  operadoraSlug?: string;
  operadoraNome?: string;
  gestorTipoSlug?: GestorTipoSlug;
  prestadorTipoSlug?: PrestadorTipoSlug;
  labelExibicao: string;
  startedAt: string;
};

export type IniciarSimulacaoInput = {
  role: Role;
  operadoraSlug?: string;
  gestorTipoSlug?: GestorTipoSlug;
  prestadorTipoSlug?: PrestadorTipoSlug;
};

export function roleExigeOperadoraNaSimulacao(role: Role): boolean {
  return role === "operador";
}

export function roleExigeGestorTipoNaSimulacao(role: Role): boolean {
  return role === "gestor";
}

export function roleExigePrestadorTipoNaSimulacao(role: Role): boolean {
  return role === "prestador";
}

export function gestorTipoLabel(slug: GestorTipoSlug): string {
  return GESTOR_TIPOS.find((t) => t.slug === slug)?.label ?? slug;
}

export function prestadorTipoLabel(slug: PrestadorTipoSlug): string {
  return PRESTADOR_TIPOS.find((t) => t.slug === slug)?.label ?? slug;
}

export function montarLabelSimulacao(input: IniciarSimulacaoInput, operadoraNome?: string): string {
  const perfil = roleLabel(input.role);
  if (input.role === "operador" && operadoraNome) {
    return `${perfil} — ${operadoraNome}`;
  }
  if (input.role === "gestor" && input.gestorTipoSlug) {
    return `${perfil} — ${gestorTipoLabel(input.gestorTipoSlug)}`;
  }
  if (input.role === "prestador" && input.prestadorTipoSlug) {
    return `${perfil} — ${prestadorTipoLabel(input.prestadorTipoSlug)}`;
  }
  return perfil;
}

export function buildEscoposSimulacao(state: SimulacaoLoginState): EscoposVisiveis {
  const { role, operadoraSlug, gestorTipoSlug, prestadorTipoSlug } = state;

  if (role === "operador" && operadoraSlug) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [operadoraSlug],
      semRestricaoEscopo: false,
      vêTodosInfluencers: true,
    };
  }

  if (role === "gestor" && gestorTipoSlug) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: false,
      gestorTiposVisiveis: [gestorTipoSlug],
      vêTodosInfluencers: true,
    };
  }

  if (role === "prestador" && prestadorTipoSlug) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: true,
      prestadorTiposVisiveis: [prestadorTipoSlug],
    };
  }

  if (roleParidadeInfluencer(role)) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: false,
    };
  }

  if (ROLES_SEM_RESTRICAO_ESCOPO.includes(role)) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: true,
      vêTodosInfluencers: true,
    };
  }

  if (role === "agencia") {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [],
      semRestricaoEscopo: false,
    };
  }

  return { influencersVisiveis: [], operadorasVisiveis: [], semRestricaoEscopo: false };
}

export function aplicarOverridesPermissoesSimulacao(
  perms: PermissoesMapa,
  permsReais: PermissoesMapa,
): PermissoesMapa {
  const next = { ...perms };
  next.gestao_usuarios = "nao";
  next.gestao_operadoras = "nao";
  next.status_tecnico = "nao";
  if (permsReais.simulador_login === "sim" || permsReais.simulador_login === "proprios") {
    next.simulador_login = permsReais.simulador_login;
  } else {
    next.simulador_login = "nao";
  }
  return next;
}

export function aplicarSomenteLeituraAcoes(acoes: PermissoesAcoesMapa): PermissoesAcoesMapa {
  const next = { ...acoes } as PermissoesAcoesMapa;
  for (const key of Object.keys(next) as (keyof PermissoesAcoesMapa)[]) {
    next[key] = { criar: "nao", editar: "nao", excluir: "nao" };
  }
  return next;
}

export function readSimulacaoSession(rolesPermitidos?: readonly Role[]): SimulacaoLoginState | null {
  try {
    const raw = sessionStorage.getItem(SIMULADOR_LOGIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulacaoLoginState;
    if (!parsed?.role || !parsed.labelExibicao) return null;
    const catalogo = rolesPermitidos ?? ROLES_SIMULAVEIS;
    if (!catalogo.includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSimulacaoSession(state: SimulacaoLoginState | null): void {
  try {
    if (!state) {
      sessionStorage.removeItem(SIMULADOR_LOGIN_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SIMULADOR_LOGIN_SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export async function resolverOperadoraNome(slug: string): Promise<string | null> {
  const { data } = await supabase.from("operadoras").select("nome").eq("slug", slug).maybeSingle();
  return data?.nome ?? null;
}

export function validarInputSimulacao(
  input: IniciarSimulacaoInput,
  rolesPermitidos: readonly Role[] = ROLES_SIMULAVEIS,
): string | null {
  if (!rolesPermitidos.includes(input.role)) {
    return "Perfil inválido para visualização.";
  }
  if (roleExigeOperadoraNaSimulacao(input.role) && !input.operadoraSlug?.trim()) {
    return "Selecione uma operadora.";
  }
  if (roleExigeGestorTipoNaSimulacao(input.role) && !input.gestorTipoSlug) {
    return "Selecione um tipo de gestor.";
  }
  if (roleExigePrestadorTipoNaSimulacao(input.role) && !input.prestadorTipoSlug) {
    return "Selecione uma área de prestador.";
  }
  return null;
}

export function toSimulacaoState(
  input: IniciarSimulacaoInput,
  labelExibicao: string,
): SimulacaoLoginState {
  return {
    role: input.role,
    operadoraSlug: input.operadoraSlug,
    gestorTipoSlug: input.gestorTipoSlug,
    prestadorTipoSlug: input.prestadorTipoSlug,
    labelExibicao,
    startedAt: new Date().toISOString(),
  };
}
