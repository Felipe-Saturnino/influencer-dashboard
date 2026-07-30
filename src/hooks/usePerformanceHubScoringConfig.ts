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

  useEffect(() => {
    let cancelado = false;

    void fetchPerformanceHubScoringConfig().then((result) => {
      if (cancelado) return;
      setScoringPorTime(result.config);
      setLoadError(result.error);
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, []);

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
    salvar,
  };
}
