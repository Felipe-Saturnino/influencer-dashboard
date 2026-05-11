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
  const { user, escoposVisiveis, podeVerInfluencer, podeVerOperadora } = useApp();

  const showFiltroInfluencer = useMemo(() => {
    if (!user) return false;
    if (ROLES_VISAO_OPERACAO_SPIN.includes(user.role)) return true;
    if (["operador", "agencia"].includes(user.role))
      return escoposVisiveis.influencersVisiveis.length >= 2;
    return false;
  }, [user, escoposVisiveis.influencersVisiveis.length]);

  const showFiltroOperadora = useMemo(() => {
    if (!user) return false;
    if (user.role === "operador" && escoposVisiveis.operadorasVisiveis.length > 0) return false;
    if (ROLES_VISAO_OPERACAO_SPIN.includes(user.role)) return true;
    if (roleParidadeInfluencer(user.role) || user.role === "agencia")
      return escoposVisiveis.operadorasVisiveis.length >= 2;
    return false;
  }, [user, escoposVisiveis.operadorasVisiveis.length]);

  /** Operador com operadora(s) no escopo: slugs forçados nos filtros. */
  const operadoraSlugsForcado = useMemo(() => {
    if (!user) return null;
    const slugs = escoposVisiveis.operadorasVisiveis;
    if (user.role === "operador" && slugs.length > 0) return slugs;
    return null;
  }, [user, escoposVisiveis.operadorasVisiveis]);

  return {
    showFiltroInfluencer,
    showFiltroOperadora,
    podeVerInfluencer,
    podeVerOperadora,
    escoposVisiveis,
    operadoraSlugsForcado,
  };
}
