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

  const persistirAvaliacao = useCallback(async (row: PerformanceHubAvaliacao) => {
    const salvo = await upsertPerformanceHubAvaliacao(row);
    if (!salvo) return row;
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
  }, []);

  return {
    avaliacoes,
    setAvaliacoes,
    loading,
    recarregar,
    persistirAvaliacao,
  };
}
