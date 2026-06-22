import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import type { PermissoesAcoesMapa } from "../lib/appRoutes";
import type { PermissaoValor, PageKey, User } from "../types";
import type { PermissoesMapa } from "../context/AppContext";

export interface Permissoes {
  canView: PermissaoValor;
  canCriar: PermissaoValor;
  canEditar: PermissaoValor;
  canExcluir: PermissaoValor;
  loading: boolean;
  /** true se pode criar (sim ou proprios) */
  canCriarOk: boolean;
  /** true se pode editar (sim ou proprios) */
  canEditarOk: boolean;
  /** true se pode excluir (sim ou proprios) */
  canExcluirOk: boolean;
}

const SEM_PERMISSAO: Permissoes = {
  canView: "nao",
  canCriar: null,
  canEditar: null,
  canExcluir: null,
  loading: false,
  canCriarOk: false,
  canEditarOk: false,
  canExcluirOk: false,
};

const ADMIN_PERMISSAO: Permissoes = {
  canView: "sim",
  canCriar: "sim",
  canEditar: "sim",
  canExcluir: "sim",
  loading: false,
  canCriarOk: true,
  canEditarOk: true,
  canExcluirOk: true,
};

function podeExecutar(val: PermissaoValor): boolean {
  return val === "sim" || val === "proprios";
}

function acoesEfetivas(
  podeVerPagina: boolean,
  acoes: { criar: PermissaoValor; editar: PermissaoValor; excluir: PermissaoValor },
): Pick<Permissoes, "canCriar" | "canEditar" | "canExcluir" | "canCriarOk" | "canEditarOk" | "canExcluirOk"> {
  if (!podeVerPagina) {
    return {
      canCriar: null,
      canEditar: null,
      canExcluir: null,
      canCriarOk: false,
      canEditarOk: false,
      canExcluirOk: false,
    };
  }
  const cc = acoes.criar ?? null;
  const ce = acoes.editar ?? null;
  const cx = acoes.excluir ?? null;
  return {
    canCriar: cc,
    canEditar: ce,
    canExcluir: cx,
    canCriarOk: podeExecutar(cc),
    canEditarOk: podeExecutar(ce),
    canExcluirOk: podeExecutar(cx),
  };
}

function canViewEfetivo(cv: PermissaoValor | null | undefined): PermissaoValor {
  if (cv === "sim" || cv === "proprios") return cv;
  return "nao";
}

/** Deriva permissões da página a partir do boot do AppContext (sem Supabase por navegação). */
export function permissoesFromContext(
  pageKey: PageKey,
  user: User | null,
  permissions: PermissoesMapa,
  permissionsAcoes: PermissoesAcoesMapa,
  routeReady: boolean,
): Permissoes {
  if (!user) return SEM_PERMISSAO;
  if (!routeReady) {
    return {
      canView: null,
      canCriar: null,
      canEditar: null,
      canExcluir: null,
      loading: true,
      canCriarOk: false,
      canEditarOk: false,
      canExcluirOk: false,
    };
  }

  if (user.role === "admin") return ADMIN_PERMISSAO;

  const acoes = permissionsAcoes[pageKey] ?? { criar: null, editar: null, excluir: null };
  const cvFromContext = permissions[pageKey];

  if (user.role === "operador" || user.role === "gestor" || user.role === "prestador") {
    const canView = canViewEfetivo(cvFromContext);
    return {
      canView,
      loading: false,
      ...acoesEfetivas(canView !== "nao", acoes),
    };
  }

  const canView = canViewEfetivo(cvFromContext);
  return {
    canView,
    loading: false,
    ...acoesEfetivas(true, acoes),
  };
}

export function usePermission(pageKey: PageKey): Permissoes {
  const { user, permissions, permissionsAcoes, routeReady } = useApp();

  return useMemo(
    () => permissoesFromContext(pageKey, user, permissions, permissionsAcoes, routeReady),
    [pageKey, user, permissions, permissionsAcoes, routeReady],
  );
}
