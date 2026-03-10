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
}

const CACHE: Record<string, Permissoes> = {};

export function usePermission(pageKey: PageKey): Permissoes {
  const { user } = useApp();
  const cacheKey = `${user?.role ?? "none"}:${pageKey}`;

  const [perm, setPerm] = useState<Permissoes>(
    CACHE[cacheKey] ?? { canView: null, canCriar: null, canEditar: null, canExcluir: null, loading: true }
  );

  useEffect(() => {
    if (!user) {
      setPerm({ canView: "nao", canCriar: null, canEditar: null, canExcluir: null, loading: false });
      return;
    }

    // Admin tem tudo sempre
    if (user.role === "admin") {
      const full: Permissoes = { canView: "sim", canCriar: "sim", canEditar: "sim", canExcluir: "sim", loading: false };
      CACHE[cacheKey] = full;
      setPerm(full);
      return;
    }

    if (CACHE[cacheKey]) {
      setPerm(CACHE[cacheKey]);
      return;
    }

    supabase
      .from("role_permissions")
      .select("can_view, can_criar, can_editar, can_excluir")
      .eq("role", user.role)
      .eq("page_key", pageKey)
      .single()
      .then(({ data }) => {
        const result: Permissoes = {
          canView:    (data?.can_view    as PermissaoValor) ?? "nao",
          canCriar:   (data?.can_criar   as PermissaoValor) ?? null,
          canEditar:  (data?.can_editar  as PermissaoValor) ?? null,
          canExcluir: (data?.can_excluir as PermissaoValor) ?? null,
          loading:    false,
        };
        CACHE[cacheKey] = result;
        setPerm(result);
      });
  }, [user, pageKey, cacheKey]);

  return perm;
}
