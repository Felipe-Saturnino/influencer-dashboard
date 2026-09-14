import { useEffect, useMemo, useState } from "react";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { buscarInvestimentoPago } from "../../../../lib/investimentoPago";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";
import {
  type HomeCanalKpisTotais,
  ZERO_HOME_CANAL_KPIS,
  agregarHomeCanalPeriodo,
} from "./homeCanalKpisAgregar";

export type { HomeCanalKpisTotais };

async function carregarPeriodoEscopo(
  influencerIds: string[],
  inicio: string,
  fim: string,
  comInvestimento: boolean,
): Promise<HomeCanalKpisTotais> {
  if (influencerIds.length === 0) return ZERO_HOME_CANAL_KPIS;

  const analytics = await fetchInfluencerAnalyticsPeriodoCached({
    inicio,
    fim,
    influencerIds,
  });
  let investimento = 0;
  if (comInvestimento) {
    const invest = await buscarInvestimentoPago(
      { inicio, fim },
      { influencerIds, includeAgentes: false },
    );
    investimento = invest.total;
  }
  return agregarHomeCanalPeriodo(analytics, investimento);
}

/**
 * KPIs de canal agregados por lista de influencers (Home Agência / gestores).
 * Mês D-1 + MoM — mesmo contrato de `useHomeCanalKpisProprios`.
 */
export function useHomeCanalKpisEscopo(
  influencerIds: string[] | undefined,
  opts?: { comInvestimento?: boolean },
) {
  const comInvestimento = opts?.comInvestimento === true;
  const idsKey = useMemo(
    () => (influencerIds && influencerIds.length > 0 ? [...influencerIds].sort().join("|") : ""),
    [influencerIds],
  );

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [atual, setAtual] = useState<HomeCanalKpisTotais | null>(null);
  const [anterior, setAnterior] = useState<HomeCanalKpisTotais | null>(null);
  const [mesLabel, setMesLabel] = useState("");

  useEffect(() => {
    if (!idsKey) {
      setLoading(false);
      setErro(false);
      setAtual(ZERO_HOME_CANAL_KPIS);
      setAnterior(ZERO_HOME_CANAL_KPIS);
      setMesLabel(getHomeKpiPeriodosComparativoMoM().referencia.label);
      return;
    }

    const ids = idsKey.split("|");
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { referencia, atual: perAtual, anterior: perAnt } = getHomeKpiPeriodosComparativoMoM();
        const [totAtual, totAnt] = await Promise.all([
          carregarPeriodoEscopo(ids, perAtual.inicio, perAtual.fim, comInvestimento),
          carregarPeriodoEscopo(ids, perAnt.inicio, perAnt.fim, comInvestimento),
        ]);
        if (cancelled) return;
        setAtual(totAtual);
        setAnterior(totAnt);
        setMesLabel(referencia.label);
      } catch (e) {
        console.error("useHomeCanalKpisEscopo:", e);
        if (!cancelled) {
          setErro(true);
          setAtual(null);
          setAnterior(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, comInvestimento]);

  return { loading, erro, atual, anterior, mesLabel, zero: ZERO_HOME_CANAL_KPIS };
}
