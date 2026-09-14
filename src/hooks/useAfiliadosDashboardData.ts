import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardFiltros } from "./useDashboardFiltros";
import { useDashboardAfiliadosCatalogo } from "./useDashboardAfiliadosCatalogo";
import { fetchInfluencerAnalyticsPeriodoCached } from "../lib/influencerAnalyticsQuery";
import { buscarInvestimentoPago } from "../lib/investimentoPago";
import { buscarMetricasDeAliases, mesclarMetricasComAliases } from "../lib/metricasAliases";
import {
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
} from "../lib/dashboardHelpers";
import {
  AFILIADO_TOTAIS_ZERO,
  calcTotaisAfiliados,
  montaDetalhePorAfiliado,
  montaRankingAfiliados,
  type AfiliadoDiaRow,
  type AfiliadoRankingRow,
  type AfiliadoTotais,
} from "../lib/afiliadosAnalytics";
import { AFILIADO_FILTRO_TODOS_VALUE } from "../components/FiltroAfiliadoSelect";

export const MSG_ERRO_AFILIADOS =
  "Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.";

export type UseAfiliadosDashboardDataParams = {
  historico: boolean;
  mesSelecionado: { ano: number; mes: number } | undefined;
  filtroAfiliado: string;
  filtroOperadora: string;
  /** Quando true, detalhe = tabela por afiliado (Overview Afiliado). Senão: não monta série (AfiliadosDash). */
  detalhePorAfiliado?: boolean;
};

/**
 * Métricas do canal afiliados (`influencer_metricas` filtrado a IDs com role afiliado).
 * Reutiliza o fetch de analytics dos influencers com escopo restrito.
 *
 * Fase 1: período atual (libera paint). Fase 2: MoM em background (`momPronto`).
 */
export function useAfiliadosDashboardData(params: UseAfiliadosDashboardDataParams) {
  const {
    historico,
    mesSelecionado,
    filtroAfiliado,
    filtroOperadora,
    detalhePorAfiliado = false,
  } = params;

  const { podeVerInfluencer, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const { afiliados, afiliadoNomeById, afiliadoIds, isPending: catalogPending, error: catalogError } =
    useDashboardAfiliadosCatalogo();

  const [loading, setLoading] = useState(true);
  const [momPronto, setMomPronto] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [totais, setTotais] = useState<AfiliadoTotais>(AFILIADO_TOTAIS_ZERO);
  const [totaisAnt, setTotaisAnt] = useState<AfiliadoTotais>(AFILIADO_TOTAIS_ZERO);
  const [ranking, setRanking] = useState<AfiliadoRankingRow[]>([]);
  const [detalhe, setDetalhe] = useState<AfiliadoDiaRow[]>([]);
  const [metricasPorAfiliado, setMetricasPorAfiliado] = useState<
    Record<string, { acessos: number; registros: number; ftds: number }>
  >({});

  const afiliadoOptions = useMemo(
    () => afiliados.map((a) => ({ id: a.id, nome: a.nome })),
    [afiliados],
  );

  const recarregar = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (catalogPending) return;
    if (catalogError) {
      console.error("[AfiliadosDashboard] catálogo:", catalogError);
      setErroCarga(MSG_ERRO_AFILIADOS);
      setLoading(false);
      setMomPronto(true);
      return;
    }

    let cancelled = false;

    async function carregar() {
      setLoading(true);
      setErroCarga(null);
      setMomPronto(historico);
      setTotaisAnt(AFILIADO_TOTAIS_ZERO);

      try {
        const mom =
          !historico && mesSelecionado
            ? getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes)
            : null;
        const { inicio, fim } = historico
          ? getPeriodoHistoricoCompetencias()
          : mom!.atual;

        let idsEscopo = [...afiliadoIds];
        if (filtroAfiliado !== AFILIADO_FILTRO_TODOS_VALUE) {
          idsEscopo = idsEscopo.filter((id) => id === filtroAfiliado);
        }
        // SQL já filtra por operadora_slug — não refiltrar pela junction influencer_operadoras.

        if (idsEscopo.length === 0) {
          if (!cancelled) {
            setTotais(AFILIADO_TOTAIS_ZERO);
            setTotaisAnt(AFILIADO_TOTAIS_ZERO);
            setRanking([]);
            setDetalhe([]);
            setMetricasPorAfiliado({});
            setLoading(false);
            setMomPronto(true);
          }
          return;
        }

        const operadoraSlugsQuery = operadoraSlugsForcado?.length
          ? operadoraSlugsForcado
          : filtroOperadora !== "todas"
            ? [filtroOperadora]
            : escoposVisiveis.semRestricaoEscopo
              ? null
              : escoposVisiveis.operadorasVisiveis.length > 0
                ? escoposVisiveis.operadorasVisiveis
                : null;

        const operadoraSlugInvest =
          filtroOperadora !== "todas" ? filtroOperadora : undefined;

        const [analytics, invest] = await Promise.all([
          fetchInfluencerAnalyticsPeriodoCached({
            inicio,
            fim,
            operadoraSlugs: operadoraSlugsQuery,
            influencerIds: idsEscopo,
          }),
          buscarInvestimentoPago(
            { inicio, fim },
            {
              influencerIds: idsEscopo,
              operadora_slug: operadoraSlugInvest,
              includeAgentes: false,
            },
          ),
        ]);

        if (cancelled) return;

        let metricas = analytics.metricas.filter((m) => podeVerInfluencer(m.influencer_id));
        if (historico) {
          const aliasesSinteticas = await buscarMetricasDeAliases({
            operadora_slug: operadoraSlugInvest,
            influencerIds: idsEscopo,
            dataInicio: inicio,
            dataFim: fim,
          });
          if (cancelled) return;
          metricas = mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
        }

        const totaisCalc = calcTotaisAfiliados(metricas, invest.total);
        const rankingCalc = montaRankingAfiliados(
          metricas,
          invest.porInfluencer,
          afiliadoNomeById,
          idsEscopo,
        );

        const porAf: Record<string, { acessos: number; registros: number; ftds: number }> = {};
        for (const r of rankingCalc) {
          porAf[r.afiliado_id] = {
            acessos: r.acessos,
            registros: r.registros,
            ftds: r.ftds,
          };
        }

        // O3: série dia/mês só no Overview Afiliado (detalhePorAfiliado).
        const detalheCalc: AfiliadoDiaRow[] = detalhePorAfiliado
          ? montaDetalhePorAfiliado(metricas, afiliadoNomeById, idsEscopo)
          : [];

        if (!cancelled) {
          setTotais(totaisCalc);
          setRanking(rankingCalc);
          setDetalhe(detalheCalc);
          setMetricasPorAfiliado(porAf);
          setLoading(false);
        }

        if (mom) {
          try {
            const { inicio: iA, fim: fA } = mom.anterior;
            const [investAnt, analyticsAnt] = await Promise.all([
              buscarInvestimentoPago(
                { inicio: iA, fim: fA },
                {
                  influencerIds: idsEscopo,
                  operadora_slug: operadoraSlugInvest,
                  includeAgentes: false,
                },
              ),
              fetchInfluencerAnalyticsPeriodoCached({
                inicio: iA,
                fim: fA,
                operadoraSlugs: operadoraSlugsQuery,
                influencerIds: idsEscopo,
              }),
            ]);
            if (cancelled) return;
            const mA = analyticsAnt.metricas.filter((m) => podeVerInfluencer(m.influencer_id));
            setTotaisAnt(calcTotaisAfiliados(mA, investAnt.total));
            setMomPronto(true);
          } catch (err) {
            console.error("[AfiliadosDashboard] MoM:", err);
            if (!cancelled) setMomPronto(true);
          }
        }
      } catch (err) {
        console.error("[AfiliadosDashboard] carga:", err);
        if (!cancelled) {
          setErroCarga(MSG_ERRO_AFILIADOS);
          setLoading(false);
          setMomPronto(true);
        }
      }
    }

    void carregar();
    return () => {
      cancelled = true;
    };
  }, [
    catalogPending,
    catalogError,
    historico,
    mesSelecionado,
    filtroAfiliado,
    filtroOperadora,
    detalhePorAfiliado,
    afiliadoIds,
    afiliadoNomeById,
    podeVerInfluencer,
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.operadorasVisiveis,
    operadoraSlugsForcado,
    reloadTick,
  ]);

  return {
    loading,
    momPronto,
    erroCarga,
    recarregar,
    totais,
    totaisAnt,
    ranking,
    detalhe,
    metricasPorAfiliado,
    afiliadoOptions,
    afiliados,
    catalogPending,
  };
}
