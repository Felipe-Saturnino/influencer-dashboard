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
  const { user } = useApp();
  const cacheKey = `${user?.role ?? "none"}:${pageKey}`;

  const [perm, setPerm] = useState<Permissoes>(
    CACHE[cacheKey] ?? { canView: null, canCriar: null, canEditar: null, canExcluir: null, loading: true, canCriarOk: false, canEditarOk: false, canExcluirOk: false }
  );

  useEffect(() => {
    if (!user) {
      setPerm({ canView: "nao", canCriar: null, canEditar: null, canExcluir: null, loading: false, canCriarOk: false, canEditarOk: false, canExcluirOk: false });
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
  }, [user, pageKey, cacheKey]);

  return perm;
}
