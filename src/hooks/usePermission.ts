import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { PermissaoValor, PageKey } from "../types";

export interface Permissoes {
  canView:    PermissaoValor;
  canCriar:   PermissaoValor;
  canEditar:  PermissaoValor;
  canExcluir: PermissaoValor;
  loading:    boolean;
  /** true se pode criar (sim ou proprios) */
  canCriarOk:   boolean;
  /** true se pode editar (sim ou proprios) */
  canEditarOk:  boolean;
  /** true se pode excluir (sim ou proprios) */
  canExcluirOk: boolean;
}

function podeExecutar(val: PermissaoValor): boolean {
  return val === "sim" || val === "proprios";
}

const CACHE: Record<string, Permissoes> = {};

export function usePermission(pageKey: PageKey): Permissoes {
  const { user, permissions } = useApp();
  const cvFromContext = permissions[pageKey];
  const cacheKey =
    user?.role === "operador"
      ? `operador:${user.id}:${pageKey}:${cvFromContext ?? "null"}`
      : user?.role === "gestor"
        ? `gestor:${user.id}:${pageKey}:${cvFromContext ?? "null"}`
        : `${user?.role ?? "none"}:${pageKey}`;

  const [perm, setPerm] = useState<Permissoes>(
    CACHE[cacheKey] ?? { canView: null, canCriar: null, canEditar: null, canExcluir: null, loading: true, canCriarOk: false, canEditarOk: false, canExcluirOk: false }
  );

  useEffect(() => {
    if (!user) {
      setPerm({ canView: "nao", canCriar: null, canEditar: null, canExcluir: null, loading: false, canCriarOk: false, canEditarOk: false, canExcluirOk: false });
      return;
    }

    const cvFromContextVal = permissions[pageKey];
    const operadorCanView = user.role === "operador" && (cvFromContextVal === "sim" || cvFromContextVal === "proprios");
    const gestorCanView = user.role === "gestor" && (cvFromContextVal === "sim" || cvFromContextVal === "proprios");

    if (user.role === "operador") {
      const cv = cvFromContextVal === "sim" || cvFromContextVal === "proprios" ? cvFromContextVal : "nao";
      const cached = CACHE[cacheKey];
      if (cached && cached.canView === cv) {
        setPerm(cached);
        return;
      }
      supabase
        .from("role_permissions")
        .select("can_criar, can_editar, can_excluir")
        .eq("role", "operador")
        .eq("page_key", pageKey)
        .single()
        .then(({ data }) => {
          const cc = (operadorCanView ? (data?.can_criar as PermissaoValor) : null) ?? null;
          const ce = (operadorCanView ? (data?.can_editar as PermissaoValor) : null) ?? null;
          const cx = (operadorCanView ? (data?.can_excluir as PermissaoValor) : null) ?? null;
          const result: Permissoes = {
            canView: cv,
            canCriar: cc,
            canEditar: ce,
            canExcluir: cx,
            loading: false,
            canCriarOk: podeExecutar(cc),
            canEditarOk: podeExecutar(ce),
            canExcluirOk: podeExecutar(cx),
          };
          CACHE[cacheKey] = result;
          setPerm(result);
        });
      return;
    }

    // Gestor: can_view efetivo vem do AppContext (role_permissions + aba Gestores / gestor_tipo_pages)
    if (user.role === "gestor") {
      const cv =
        cvFromContextVal === "sim" || cvFromContextVal === "proprios" ? cvFromContextVal : "nao";
      const cached = CACHE[cacheKey];
      if (cached && cached.canView === cv) {
        setPerm(cached);
        return;
      }
      supabase
        .from("role_permissions")
        .select("can_criar, can_editar, can_excluir")
        .eq("role", "gestor")
        .eq("page_key", pageKey)
        .single()
        .then(({ data }) => {
          const cc = (gestorCanView ? (data?.can_criar as PermissaoValor) : null) ?? null;
          const ce = (gestorCanView ? (data?.can_editar as PermissaoValor) : null) ?? null;
          const cx = (gestorCanView ? (data?.can_excluir as PermissaoValor) : null) ?? null;
          const result: Permissoes = {
            canView: cv,
            canCriar: cc,
            canEditar: ce,
            canExcluir: cx,
            loading: false,
            canCriarOk: podeExecutar(cc),
            canEditarOk: podeExecutar(ce),
            canExcluirOk: podeExecutar(cx),
          };
          CACHE[cacheKey] = result;
          setPerm(result);
        });
      return;
    }

    // Demais roles: o que está em Gestão de Usuários (role_permissions)
    supabase
      .from("role_permissions")
      .select("can_view, can_criar, can_editar, can_excluir")
      .eq("role", user.role)
      .eq("page_key", pageKey)
      .single()
      .then(({ data }) => {
        const cv = (data?.can_view as PermissaoValor) ?? "nao";
        const cc = (data?.can_criar as PermissaoValor) ?? null;
        const ce = (data?.can_editar as PermissaoValor) ?? null;
        const cx = (data?.can_excluir as PermissaoValor) ?? null;
        const result: Permissoes = {
          canView: cv,
          canCriar: cc,
          canEditar: ce,
          canExcluir: cx,
          loading: false,
          canCriarOk: podeExecutar(cc),
          canEditarOk: podeExecutar(ce),
          canExcluirOk: podeExecutar(cx),
        };
        CACHE[cacheKey] = result;
        setPerm(result);
      });
  }, [user, pageKey, cacheKey, permissions]);

  return perm;
}
