import { useMemo } from "react";
import { useApp } from "../context/AppContext";

/**
 * Regras de exibição de filtros por role (Etapa 8):
 * - Filtro influencer: admin, gestor, executivo sempre; operador/agência se ≥2
 * - Filtro operadora: admin, gestor, executivo sempre; influencer/agência se ≥2
 */
export function useDashboardFiltros() {
  const { user, escoposVisiveis, podeVerInfluencer, podeVerOperadora } = useApp();

  const showFiltroInfluencer = useMemo(() => {
    if (!user) return false;
    if (["admin", "gestor", "executivo"].includes(user.role)) return true;
    if (["operador", "agencia"].includes(user.role))
      return escoposVisiveis.influencersVisiveis.length >= 2;
    return false;
  }, [user, escoposVisiveis.influencersVisiveis.length]);

  const showFiltroOperadora = useMemo(() => {
    if (!user) return false;
    if (["admin", "gestor", "executivo"].includes(user.role)) return true;
    if (["influencer", "agencia"].includes(user.role))
      return escoposVisiveis.operadorasVisiveis.length >= 2;
    return false;
  }, [user, escoposVisiveis.operadorasVisiveis.length]);

  return {
    showFiltroInfluencer,
    showFiltroOperadora,
    podeVerInfluencer,
    podeVerOperadora,
    escoposVisiveis,
  };
}
