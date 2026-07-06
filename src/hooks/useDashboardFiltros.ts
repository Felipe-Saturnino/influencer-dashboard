import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { ROLES_VISAO_OPERACAO_SPIN, roleParidadeInfluencer } from "../lib/staffRoles";

/**
 * Regras de exibição de filtros por role (Etapa 8):
 * - Filtro influencer: admin, gestor, executivo sempre; operador/agência se ≥2
 * - Filtro operadora: admin, gestor, executivo sempre; influencer/agência se ≥2
 * - Operador com uma operadora: filtro operadora FORÇADO pelo escopo
 */
export function useDashboardFiltros() {
  const { user, effectiveRole, escoposVisiveis, podeVerInfluencer, podeVerOperadora } = useApp();
  const role = effectiveRole ?? user?.role;

  const showFiltroInfluencer = useMemo(() => {
    if (!user || !role) return false;
    if (ROLES_VISAO_OPERACAO_SPIN.includes(role)) return true;
    if (["operador", "agencia"].includes(role))
      return escoposVisiveis.influencersVisiveis.length >= 2;
    return false;
  }, [user, role, escoposVisiveis.influencersVisiveis.length]);

  const showFiltroOperadora = useMemo(() => {
    if (!user || !role) return false;
    if (role === "operador" && escoposVisiveis.operadorasVisiveis.length > 0) return false;
    if (ROLES_VISAO_OPERACAO_SPIN.includes(role)) return true;
    if (roleParidadeInfluencer(role) || role === "agencia")
      return escoposVisiveis.operadorasVisiveis.length >= 2;
    return false;
  }, [user, role, escoposVisiveis.operadorasVisiveis.length]);

  /** Operador com operadora(s) no escopo: slugs forçados nos filtros. */
  const operadoraSlugsForcado = useMemo(() => {
    if (!user || !role) return null;
    const slugs = escoposVisiveis.operadorasVisiveis;
    if (role === "operador" && slugs.length > 0) return slugs;
    return null;
  }, [user, role, escoposVisiveis.operadorasVisiveis]);

  return {
    showFiltroInfluencer,
    showFiltroOperadora,
    podeVerInfluencer,
    podeVerOperadora,
    escoposVisiveis,
    operadoraSlugsForcado,
  };
}
