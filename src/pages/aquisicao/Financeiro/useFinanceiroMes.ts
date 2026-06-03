import { useCallback, useEffect, useState } from "react";
import type { BlocoFiltros } from "./financeiroFiltros";
import { loadFinanceiroMesData, type FinanceiroMesData } from "./financeiroMesData";

export function useFinanceiroMes(
  filtros: BlocoFiltros,
  podeVerInfluencer: (id: string) => boolean,
  userRole: string | undefined,
) {
  const [mesData, setMesData] = useState<FinanceiroMesData | null>(null);
  const [loadingMes, setLoadingMes] = useState(true);

  const recarregarMes = useCallback(async () => {
    setLoadingMes(true);
    try {
      const data = await loadFinanceiroMesData({ filtros, userRole, podeVerInfluencer });
      setMesData(data);
    } catch (e) {
      console.error(e);
      setMesData({
        kpis: { totalPago: 0, pendente: 0, horas: 0 },
        consolidadoRows: [],
        agentesRow: null,
      });
    } finally {
      setLoadingMes(false);
    }
  }, [filtros, userRole, podeVerInfluencer]);

  useEffect(() => {
    void recarregarMes();
  }, [recarregarMes]);

  return { mesData, loadingMes, recarregarMes };
}
