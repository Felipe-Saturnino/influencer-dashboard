import { useEffect, useState } from "react";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { buscarInvestimentoPago } from "../../../../lib/investimentoPago";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";
import { fetchJogadoresUapSpin } from "../../../../lib/jogadoresAbaQuery";
import { uapSpinJogadoresAba } from "../../../../lib/jogadoresAbaMetrics";
import {
  type HomeCanalKpisTotais,
  ZERO_HOME_CANAL_KPIS,
  agregarHomeCanalPeriodo,
} from "./homeCanalKpisAgregar";

export type { HomeCanalKpisTotais };

async function carregarPeriodo(
  influencerIds: string[],
  inicio: string,
  fim: string,
  comInvestimento: boolean,
  comUapSpin: boolean,
): Promise<HomeCanalKpisTotais> {
  if (influencerIds.length === 0) return { ...ZERO_HOME_CANAL_KPIS };
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
  const base = agregarHomeCanalPeriodo(analytics, investimento);
  if (!comUapSpin) return base;
  const uapRows = await fetchJogadoresUapSpin({
    inicio,
    fim,
    influencerIds,
    operadoraSlugs: null,
  });
  const uap = uapSpinJogadoresAba(uapRows);
  return { ...base, uap_spin: uap.uap, uap_spin_rodadas: uap.rodadas };
}

function useHomeCanalKpisBase(
  influencerIds: string[] | undefined,
  opts: { comInvestimento: boolean; comUapSpin: boolean; logTag: string },
) {
  const { comInvestimento, comUapSpin, logTag } = opts;
  const idsKey = (influencerIds ?? []).slice().sort().join("|");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [atual, setAtual] = useState<HomeCanalKpisTotais | null>(null);
  const [anterior, setAnterior] = useState<HomeCanalKpisTotais | null>(null);
  const [mesLabel, setMesLabel] = useState("");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|").filter(Boolean) : [];
    if (ids.length === 0) {
      setLoading(false);
      setErro(false);
      setAtual(null);
      setAnterior(null);
      setMesLabel("");
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { referencia, atual: perAtual, anterior: perAnt } = getHomeKpiPeriodosComparativoMoM();
        const [totAtual, totAnt] = await Promise.all([
          carregarPeriodo(ids, perAtual.inicio, perAtual.fim, comInvestimento, comUapSpin),
          carregarPeriodo(ids, perAnt.inicio, perAnt.fim, comInvestimento, comUapSpin),
        ]);
        if (cancelled) return;
        setAtual(totAtual);
        setAnterior(totAnt);
        setMesLabel(referencia.label);
      } catch (e) {
        console.error(`${logTag}:`, e);
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
  }, [idsKey, comInvestimento, comUapSpin, logTag]);

  return { loading, erro, atual, anterior, mesLabel, zero: ZERO_HOME_CANAL_KPIS };
}

/**
 * KPIs do Overview (próprios) para Home Influencer / Afiliado — mês D-1 + MoM.
 * `comInvestimento`: true para Afiliado (GGR/ROI); Influencer Home não precisa.
 */
export function useHomeCanalKpisProprios(userId: string | undefined, opts?: { comInvestimento?: boolean }) {
  return useHomeCanalKpisBase(userId ? [userId] : undefined, {
    comInvestimento: opts?.comInvestimento === true,
    comUapSpin: false,
    logTag: "useHomeCanalKpisProprios",
  });
}

/**
 * KPIs agregados do escopo (ex.: Agência) — soma analytics + investimento pago
 * com `includeAgentes: false`. IDs vazios → sem fetch (atual/anterior null).
 */
export function useHomeCanalKpisEscopo(
  influencerIds: string[] | undefined,
  opts?: { comInvestimento?: boolean; comUapSpin?: boolean },
) {
  return useHomeCanalKpisBase(influencerIds, {
    comInvestimento: opts?.comInvestimento !== false,
    comUapSpin: opts?.comUapSpin === true,
    logTag: "useHomeCanalKpisEscopo",
  });
}
