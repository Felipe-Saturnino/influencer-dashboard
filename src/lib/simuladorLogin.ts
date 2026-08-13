import type { PrestadorTipoSlug, Role } from "../types";
import type { EscoposVisiveis, PermissoesMapa } from "../context/AppContext";
import type { PermissoesAcoesMapa } from "./appRoutes";
import { ROLES_SEM_RESTRICAO_ESCOPO, roleParidadeInfluencer } from "./staffRoles";
import {
  PRESTADOR_TIPOS,
  FILTROS_PERFIL_LINHAS_SIMULADOR,
  ROLES_SIMULAVEIS,
  roleLabel,
} from "../pages/plataforma/GestaoUsuarios/constants";
import { supabase } from "./supabase";
import { fetchAllPages, fetchInBatched } from "./supabasePaginate";
import { compareLocaleTexto } from "./classificacaoSort";

export const SIMULADOR_LOGIN_SESSION_KEY = "simulador_login_ativo";

export { ROLES_SIMULAVEIS };

export const MSG_ERRO_CARREGAR_USUARIOS_SIMULADOR =
  "Não foi possível carregar os usuários. Se o problema persistir, entre em contato com o suporte.";
export const MSG_ERRO_CARREGAR_OPERADORAS_SIMULADOR =
  "Não foi possível carregar as operadoras. Se o problema persistir, entre em contato com o suporte.";
export const MSG_NENHUM_USUARIO_ATIVO_PERFIL = "Nenhum usuário ativo com este perfil.";
export const MSG_NENHUM_USUARIO_ATIVO_OPERADORA = "Nenhum usuário ativo nesta operadora.";
export const MSG_NENHUM_USUARIO_ATIVO_AREA = "Nenhum usuário ativo nesta área.";
export const MSG_NENHUMA_OPERADORA_ENCONTRADA = "Nenhuma operadora encontrada.";
export const MSG_USUARIO_INATIVO_SIMULACAO =
  "Este usuário não está mais ativo. Escolha outro usuário ativo.";

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
  userId: string;
  userName: string;
  userEmail: string;
  operadoraSlug?: string;
  operadoraNome?: string;
  prestadorTipoSlug?: PrestadorTipoSlug;
  labelExibicao: string;
  startedAt: string;
};

export type IniciarSimulacaoInput = {
  role: Role;
  userId: string;
  operadoraSlug?: string;
  prestadorTipoSlug?: PrestadorTipoSlug;
};

export type UsuarioSimulavelOpt = {
  id: string;
  name: string;
  email: string;
  lastSignInAt: string | null;
};

export type OperadoraSimulacaoOpt = { slug: string; nome: string; ativo: boolean };

export function roleExigeOperadoraNaSimulacao(role: Role): boolean {
  return role === "operador";
}

export function roleExigePrestadorTipoNaSimulacao(role: Role): boolean {
  return role === "prestador";
}

export function prestadorTipoLabel(slug: PrestadorTipoSlug): string {
  return PRESTADOR_TIPOS.find((t) => t.slug === slug)?.label ?? slug;
}

export function montarLabelSimulacao(
  input: IniciarSimulacaoInput,
  extras?: { operadoraNome?: string; userName?: string },
): string {
  const perfil = roleLabel(input.role);
  const pessoa = extras?.userName?.trim();
  if (input.role === "operador" && extras?.operadoraNome) {
    return pessoa ? `${perfil} — ${extras.operadoraNome} — ${pessoa}` : `${perfil} — ${extras.operadoraNome}`;
  }
  if (input.role === "prestador" && input.prestadorTipoSlug) {
    const area = prestadorTipoLabel(input.prestadorTipoSlug);
    return pessoa ? `${perfil} — ${area} — ${pessoa}` : `${perfil} — ${area}`;
  }
  return pessoa ? `${perfil} — ${pessoa}` : perfil;
}

export function mensagemVazioUsuariosSimulacao(input: {
  operadoraSlug?: string;
  prestadorTipoSlug?: string;
}): string {
  if (input.operadoraSlug) return MSG_NENHUM_USUARIO_ATIVO_OPERADORA;
  if (input.prestadorTipoSlug) return MSG_NENHUM_USUARIO_ATIVO_AREA;
  return MSG_NENHUM_USUARIO_ATIVO_PERFIL;
}

/** Recorte o escopo real do usuário ao que foi escolhido no modal (operadora / área). */
export function recortarEscoposSimulacao(
  escopos: EscoposVisiveis,
  state: Pick<SimulacaoLoginState, "role" | "operadoraSlug" | "prestadorTipoSlug">,
): EscoposVisiveis {
  if (state.role === "operador" && state.operadoraSlug) {
    return {
      ...escopos,
      operadorasVisiveis: [state.operadoraSlug],
      semRestricaoEscopo: false,
      vêTodosInfluencers: true,
    };
  }
  if (state.role === "prestador" && state.prestadorTipoSlug) {
    return {
      ...escopos,
      prestadorTiposVisiveis: [state.prestadorTipoSlug],
    };
  }
  return escopos;
}

/** @deprecated Preferir escopos reais do usuário escolhido + recortarEscoposSimulacao. */
export function buildEscoposSimulacao(state: SimulacaoLoginState): EscoposVisiveis {
  const { role, operadoraSlug, prestadorTipoSlug, userId } = state;

  if (role === "operador" && operadoraSlug) {
    return {
      influencersVisiveis: [],
      operadorasVisiveis: [operadoraSlug],
      semRestricaoEscopo: false,
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
      influencersVisiveis: userId ? [userId] : [],
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
    if (!parsed?.role || !parsed.labelExibicao || !parsed.userId) return null;
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
  if (!input.userId?.trim()) {
    return "Selecione um usuário ativo.";
  }
  if (roleExigeOperadoraNaSimulacao(input.role) && !input.operadoraSlug?.trim()) {
    return "Selecione uma operadora.";
  }
  if (roleExigePrestadorTipoNaSimulacao(input.role) && !input.prestadorTipoSlug) {
    return "Selecione uma área de prestador.";
  }
  return null;
}

export function toSimulacaoState(
  input: IniciarSimulacaoInput,
  extras: { labelExibicao: string; userName: string; userEmail: string; operadoraNome?: string },
): SimulacaoLoginState {
  return {
    role: input.role,
    userId: input.userId,
    userName: extras.userName,
    userEmail: extras.userEmail,
    operadoraSlug: input.operadoraSlug,
    prestadorTipoSlug: input.prestadorTipoSlug,
    labelExibicao: extras.labelExibicao,
    startedAt: new Date().toISOString(),
    ...(extras.operadoraNome ? { operadoraNome: extras.operadoraNome } : {}),
  };
}

type ProfileSimulacaoRow = {
  id: string;
  name: string | null;
  email: string | null;
  last_sign_in_at: string | null;
  ativo: boolean | null;
};

function mapUsuarioSimulavel(row: ProfileSimulacaoRow): UsuarioSimulavelOpt {
  return {
    id: row.id,
    name: row.name?.trim() || row.email?.trim() || row.id,
    email: row.email?.trim() || "",
    lastSignInAt: row.last_sign_in_at,
  };
}

function ordenarUsuariosSimulaveis(usuarios: UsuarioSimulavelOpt[]): UsuarioSimulavelOpt[] {
  return [...usuarios].sort((a, b) => {
    const ta = a.lastSignInAt ?? "";
    const tb = b.lastSignInAt ?? "";
    if (ta !== tb) return tb.localeCompare(ta);
    return compareLocaleTexto(a.name, b.name, "asc");
  });
}

async function idsComEscopo(
  scopeType: "operadora" | "prestador_tipo",
  scopeRef: string,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await fetchInBatched<{ user_id: string }>(userIds, 150, async (slice) => {
    const { data, error } = await supabase
      .from("user_scopes")
      .select("user_id")
      .eq("scope_type", scopeType)
      .eq("scope_ref", scopeRef)
      .in("user_id", slice);
    if (error) throw new Error(error.message);
    return (data ?? []) as { user_id: string }[];
  });
  return new Set(rows.map((r) => r.user_id));
}

/** Usuários ativos do perfil (lista atual — contas rotativas, sem pessoa fixa). */
export async function carregarUsuariosAtivosParaSimulacao(params: {
  role: Role;
  viewerUserId: string;
  operadoraSlug?: string;
  prestadorTipoSlug?: string;
}): Promise<{ usuarios: UsuarioSimulavelOpt[]; erro: string | null }> {
  try {
    const rows = await fetchAllPages<ProfileSimulacaoRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, last_sign_in_at, ativo")
        .eq("role", params.role)
        .neq("id", params.viewerUserId)
        .order("name", { ascending: true })
        .range(from, to);
      return { data: (data ?? null) as ProfileSimulacaoRow[] | null, error };
    });
    let usuarios = rows.filter((r) => r.ativo !== false).map(mapUsuarioSimulavel);

    if (params.operadoraSlug) {
      const ids = await idsComEscopo("operadora", params.operadoraSlug, usuarios.map((u) => u.id));
      usuarios = usuarios.filter((u) => ids.has(u.id));
    }
    if (params.prestadorTipoSlug) {
      const ids = await idsComEscopo("prestador_tipo", params.prestadorTipoSlug, usuarios.map((u) => u.id));
      usuarios = usuarios.filter((u) => ids.has(u.id));
    }

    return { usuarios: ordenarUsuariosSimulaveis(usuarios), erro: null };
  } catch (err) {
    console.error("Erro ao carregar usuários para o Simulador de Login:", err);
    return { usuarios: [], erro: MSG_ERRO_CARREGAR_USUARIOS_SIMULADOR };
  }
}

export async function carregarUsuarioAtivoSimulavel(
  userId: string,
  role: Role,
): Promise<UsuarioSimulavelOpt | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, last_sign_in_at, ativo")
    .eq("id", userId)
    .eq("role", role)
    .maybeSingle();
  if (error) {
    console.error("Erro ao validar usuário da simulação:", error);
    return null;
  }
  const row = data as ProfileSimulacaoRow | null;
  if (!row || row.ativo === false) return null;
  return mapUsuarioSimulavel(row);
}

export async function carregarOperadorasParaSimulacao(): Promise<{
  operadoras: OperadoraSimulacaoOpt[];
  erro: string | null;
}> {
  try {
    const rows = await fetchAllPages<OperadoraSimulacaoOpt>(async (from, to) => {
      const { data, error } = await supabase
        .from("operadoras")
        .select("slug, nome, ativo")
        .order("nome")
        .range(from, to);
      return { data: (data ?? null) as OperadoraSimulacaoOpt[] | null, error };
    });
    return { operadoras: rows, erro: null };
  } catch (err) {
    console.error("Erro ao carregar operadoras para o Simulador de Login:", err);
    return { operadoras: [], erro: MSG_ERRO_CARREGAR_OPERADORAS_SIMULADOR };
  }
}
