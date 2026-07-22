import { useEffect, useMemo, useState } from "react";
import { useDashboardFiltros } from "./useDashboardFiltros";
import { useDashboardAfiliadosCatalogo } from "./useDashboardAfiliadosCatalogo";
import { useDashboardCatalogos } from "./useDashboardCatalogos";
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
  montaDetalheDiarioAfiliados,
  montaDetalheMensalAfiliados,
  montaDetalhePorAfiliado,
  montaRankingAfiliados,
  type AfiliadoDiaRow,
  type AfiliadoRankingRow,
  type AfiliadoTotais,
} from "../lib/afiliadosAnalytics";
import { AFILIADO_FILTRO_TODOS_VALUE } from "../components/FiltroAfiliadoSelect";

export type UseAfiliadosDashboardDataParams = {
  historico: boolean;
  mesSelecionado: { ano: number; mes: number } | undefined;
  filtroAfiliado: string;
  filtroOperadora: string;
  /** Quando true, detalhe = tabela por afiliado (Overview Afiliado). Senão: dia/mês. */
  detalhePorAfiliado?: boolean;
};

/**
 * Métricas do canal afiliados (`influencer_metricas` filtrado a IDs com role afiliado).
 * Reutiliza o fetch de analytics dos influencers com escopo restrito.
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
  const { operadoraInfluencers } = useDashboardCatalogos();

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (catalogPending) return;
    if (catalogError) {
      console.error("[AfiliadosDashboard] catálogo:", catalogError);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function carregar() {
      setLoading(true);

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
      } else if (filtroOperadora !== "todas" && !operadoraSlugsForcado?.length) {
        const daOp = operadoraInfluencers[filtroOperadora] ?? [];
        idsEscopo = idsEscopo.filter((id) => daOp.includes(id));
      }

      if (idsEscopo.length === 0) {
        if (!cancelled) {
          setTotais(AFILIADO_TOTAIS_ZERO);
          setTotaisAnt(AFILIADO_TOTAIS_ZERO);
          setRanking([]);
          setDetalhe([]);
          setMetricasPorAfiliado({});
          setLoading(false);
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

      const analytics = await fetchInfluencerAnalyticsPeriodoCached({
        inicio,
        fim,
        operadoraSlugs: operadoraSlugsQuery,
        influencerIds: idsEscopo,
      });

      let metricas = analytics.metricas.filter((m) => podeVerInfluencer(m.influencer_id));
      if (historico) {
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          influencerIds: idsEscopo,
          dataInicio: inicio,
          dataFim: fim,
        });
        metricas = mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
      }

      const invest = await buscarInvestimentoPago(
        { inicio, fim },
        {
          influencerIds: idsEscopo,
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          includeAgentes: false,
        },
      );

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

      let detalheCalc: AfiliadoDiaRow[];
      if (detalhePorAfiliado) {
        detalheCalc = montaDetalhePorAfiliado(metricas, afiliadoNomeById, idsEscopo);
      } else if (historico) {
        detalheCalc = montaDetalheMensalAfiliados(metricas);
      } else if (mesSelecionado) {
        detalheCalc = montaDetalheDiarioAfiliados(metricas, mesSelecionado.ano, mesSelecionado.mes);
      } else {
        detalheCalc = [];
      }

      let totaisAntCalc = AFILIADO_TOTAIS_ZERO;
      if (mom) {
        const { inicio: iA, fim: fA } = mom.anterior;
        const [investAnt, analyticsAnt] = await Promise.all([
          buscarInvestimentoPago(
            { inicio: iA, fim: fA },
            {
              influencerIds: idsEscopo,
              operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
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
        const mA = analyticsAnt.metricas.filter((m) => podeVerInfluencer(m.influencer_id));
        totaisAntCalc = calcTotaisAfiliados(mA, investAnt.total);
      }

      if (!cancelled) {
        setTotais(totaisCalc);
        setTotaisAnt(totaisAntCalc);
        setRanking(rankingCalc);
        setDetalhe(detalheCalc);
        setMetricasPorAfiliado(porAf);
        setLoading(false);
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
    operadoraInfluencers,
  ]);

  return {
    loading,
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
