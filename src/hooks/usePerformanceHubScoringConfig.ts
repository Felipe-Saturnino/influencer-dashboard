import { useCallback, useEffect, useState } from "react";
import type {
  PerformanceHubDimensaoConfig,
  PerformanceHubScoringPorTime,
  PerformanceHubTimeSlug,
} from "../lib/academyPerformanceHubTypes";
import { cloneScoringPorTime } from "../lib/academyPerformanceHubScoring";
import {
  fetchPerformanceHubScoringConfig,
  salvarPerformanceHubScoringConfig,
} from "../lib/academyPerformanceHubScoringConfigDb";

export function usePerformanceHubScoringConfig() {
  const [scoringPorTime, setScoringPorTime] = useState<PerformanceHubScoringPorTime>(
    () => cloneScoringPorTime(),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const recarregar = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setLoadError(null);

    void fetchPerformanceHubScoringConfig().then((result) => {
      if (cancelado) return;
      setScoringPorTime(result.config);
      setLoadError(result.error);
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [reloadTick]);

  const salvar = useCallback(
    (
      time: PerformanceHubTimeSlug,
      config: Record<string, PerformanceHubDimensaoConfig>,
    ) => salvarPerformanceHubScoringConfig(time, config),
    [],
  );

  return {
    scoringPorTime,
    setScoringPorTime,
    loading,
    loadError,
    recarregar,
    salvar,
  };
}
