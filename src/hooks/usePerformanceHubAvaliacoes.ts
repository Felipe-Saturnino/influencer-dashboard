import { useCallback, useEffect, useState } from "react";
import type { PerformanceHubAvaliacao } from "../lib/academyPerformanceHubTypes";
import {
  fetchPerformanceHubAvaliacoes,
  upsertPerformanceHubAvaliacao,
} from "../lib/academyPerformanceHubAvaliacoesFetch";

export function usePerformanceHubAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<PerformanceHubAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const rows = await fetchPerformanceHubAvaliacoes();
    setAvaliacoes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const persistirAvaliacao = useCallback(
    async (row: PerformanceHubAvaliacao): Promise<PerformanceHubAvaliacao | null> => {
      const salvo = await upsertPerformanceHubAvaliacao(row);
      // Falha no upsert → null (não devolver o row em memória: histórico/UI não devem assumir persistência).
      if (!salvo) return null;
      setAvaliacoes((prev) => {
        const idx = prev.findIndex((item) => item.id === row.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = salvo;
          return next;
        }
        return [salvo, ...prev];
      });
      return salvo;
    },
    [],
  );

  return {
    avaliacoes,
    setAvaliacoes,
    loading,
    recarregar,
    persistirAvaliacao,
  };
}
