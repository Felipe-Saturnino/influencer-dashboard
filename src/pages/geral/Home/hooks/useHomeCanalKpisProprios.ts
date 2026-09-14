import { useEffect, useState } from "react";
import {
  fetchInfluencerAnalyticsPeriodoCached,
  type InfluencerAnalyticsPeriodo,
} from "../../../../lib/influencerAnalyticsQuery";
import { buscarInvestimentoPago } from "../../../../lib/investimentoPago";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";

export type HomeCanalKpisTotais = {
  ggr: number;
  investimento: number;
  roi: number;
  registros: number;
  acessos: number;
  ftds: number;
  ftd_total: number;
  depositos_qtd: number;
  depositos_valor: number;
  saques_qtd: number;
  saques_valor: number;
  lives: number;
  horas: number;
  views: number;
};

const ZERO: HomeCanalKpisTotais = {
  ggr: 0,
  investimento: 0,
  roi: 0,
  registros: 0,
  acessos: 0,
  ftds: 0,
  ftd_total: 0,
  depositos_qtd: 0,
  depositos_valor: 0,
  saques_qtd: 0,
  saques_valor: 0,
  lives: 0,
  horas: 0,
  views: 0,
};

function agregarPeriodo(analytics: InfluencerAnalyticsPeriodo, investimentoPago: number): HomeCanalKpisTotais {
  const m = analytics.metricas;
  const ggr = m.reduce((s, x) => s + (x.ggr || 0), 0);
  const ftds = m.reduce((s, x) => s + (x.ftd_count || 0), 0);
  const ftd_total = m.reduce((s, x) => s + (x.ftd_total || 0), 0);
  const registros = m.reduce((s, x) => s + (x.registration_count || 0), 0);
  const acessos = m.reduce((s, x) => s + (x.visit_count || 0), 0);
  const depositos_qtd = m.reduce((s, x) => s + (x.deposit_count || 0), 0);
  const depositos_valor = m.reduce((s, x) => s + (x.deposit_total || 0), 0);
  const saques_qtd = m.reduce((s, x) => s + (x.withdrawal_count || 0), 0);
  const saques_valor = m.reduce((s, x) => s + (x.withdrawal_total || 0), 0);

  let horas = 0;
  const viewsPorLive: number[] = [];
  for (const live of analytics.lives) {
    const res = analytics.resultados.find((r) => r.live_id === live.id);
    if (!res) continue;
    horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
    if (res.media_views) viewsPorLive.push(res.media_views);
  }
  const views =
    viewsPorLive.length > 0
      ? Math.round(viewsPorLive.reduce((a, b) => a + b, 0) / viewsPorLive.length)
      : 0;

  return {
    ggr,
    investimento: investimentoPago,
    roi: investimentoPago > 0 ? ((ggr - investimentoPago) / investimentoPago) * 100 : 0,
    registros,
    acessos,
    ftds,
    ftd_total,
    depositos_qtd,
    depositos_valor,
    saques_qtd,
    saques_valor,
    lives: analytics.lives.length,
    horas,
    views,
  };
}

async function carregarPeriodo(
  userId: string,
  inicio: string,
  fim: string,
  comInvestimento: boolean,
): Promise<HomeCanalKpisTotais> {
  const analytics = await fetchInfluencerAnalyticsPeriodoCached({
    inicio,
    fim,
    influencerIds: [userId],
  });
  let investimento = 0;
  if (comInvestimento) {
    const invest = await buscarInvestimentoPago(
      { inicio, fim },
      { influencerIds: [userId], includeAgentes: false },
    );
    investimento = invest.total;
  }
  return agregarPeriodo(analytics, investimento);
}

/**
 * KPIs do Overview (próprios) para Home Influencer / Afiliado — mês D-1 + MoM.
 * `comInvestimento`: true para Afiliado (GGR/ROI); Influencer Home não precisa.
 */
export function useHomeCanalKpisProprios(userId: string | undefined, opts?: { comInvestimento?: boolean }) {
  const comInvestimento = opts?.comInvestimento === true;
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [atual, setAtual] = useState<HomeCanalKpisTotais | null>(null);
  const [anterior, setAnterior] = useState<HomeCanalKpisTotais | null>(null);
  const [mesLabel, setMesLabel] = useState("");

  useEffect(() => {
    if (!userId) {
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
          carregarPeriodo(userId, perAtual.inicio, perAtual.fim, comInvestimento),
          carregarPeriodo(userId, perAnt.inicio, perAnt.fim, comInvestimento),
        ]);
        if (cancelled) return;
        setAtual(totAtual);
        setAnterior(totAnt);
        setMesLabel(referencia.label);
      } catch (e) {
        console.error("useHomeCanalKpisProprios:", e);
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
  }, [userId, comInvestimento]);

  return { loading, erro, atual, anterior, mesLabel, zero: ZERO };
}
