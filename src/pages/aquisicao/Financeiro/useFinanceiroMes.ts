import { useCallback, useEffect, useRef, useState } from "react";
import type { BlocoFiltros } from "./financeiroFiltros";
import { loadFinanceiroMesData, type FinanceiroMesData } from "./financeiroMesData";

const MES_DATA_VAZIO: FinanceiroMesData = {
  kpis: { totalPago: 0, pendente: 0, horas: 0 },
  consolidadoRows: [],
  agentesRow: null,
};

export function useFinanceiroMes(
  filtros: BlocoFiltros,
  podeVerInfluencer: (id: string) => boolean,
  userRole: string | undefined,
  /** Só consulta depois dos catálogos — senão a carga repete com os filtros já montados. */
  habilitado = true,
) {
  const [mesData, setMesData] = useState<FinanceiroMesData | null>(null);
  const [loadingMes, setLoadingMes] = useState(true);
  const [erroMes, setErroMes] = useState(false);
  const loadGenRef = useRef(0);

  const recarregarMes = useCallback(async () => {
    if (!habilitado) return;
    const gen = ++loadGenRef.current;
    setLoadingMes(true);
    setErroMes(false);
    try {
      const data = await loadFinanceiroMesData({ filtros, userRole, podeVerInfluencer });
      if (gen !== loadGenRef.current) return;
      setMesData(data);
    } catch (e) {
      console.error("[Financeiro] Erro ao carregar o mês:", e);
      if (gen !== loadGenRef.current) return;
      setMesData(MES_DATA_VAZIO);
      setErroMes(true);
    } finally {
      if (gen === loadGenRef.current) setLoadingMes(false);
    }
  }, [filtros, userRole, podeVerInfluencer, habilitado]);

  useEffect(() => {
    void recarregarMes();
  }, [recarregarMes]);

  return { mesData, loadingMes, erroMes, recarregarMes };
}
