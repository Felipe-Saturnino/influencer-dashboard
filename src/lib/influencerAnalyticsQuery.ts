import { queryClient } from "./queryClient";
import { supabase } from "./supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "./supabasePaginate";

export type InfluencerAnalyticsMetrica = {
  influencer_id: string;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  visit_count: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  ggr: number;
  data: string;
  operadora_slug: string | null;
};

export type InfluencerAnalyticsLive = {
  id: string;
  influencer_id: string;
  status: string;
  plataforma: string;
  data: string;
  operadora_slug: string | null;
};

export type InfluencerAnalyticsResultado = {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
  max_views: number | null;
};

export type InfluencerAnalyticsPeriodo = {
  metricas: InfluencerAnalyticsMetrica[];
  lives: InfluencerAnalyticsLive[];
  resultados: InfluencerAnalyticsResultado[];
};

function canonical(values: string[] | null | undefined): string[] | null {
  if (!values?.length) return null;
  return [...new Set(values)].sort();
}

export async function fetchInfluencerAnalyticsPeriodoCached(params: {
  inicio: string;
  fim: string;
  operadoraSlugs?: string[] | null;
  influencerIds?: string[] | null;
}): Promise<InfluencerAnalyticsPeriodo> {
  const operadoraSlugs = canonical(params.operadoraSlugs);
  const influencerIds = canonical(params.influencerIds);

  return queryClient.fetchQuery({
    queryKey: [
      "influencer-analytics",
      "periodo",
      params.inicio,
      params.fim,
      operadoraSlugs?.join("|") ?? "todas",
      influencerIds?.join("|") ?? "todos",
    ],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [metricas, lives] = await Promise.all([
        fetchAllPages<InfluencerAnalyticsMetrica>(async (from, to) => {
          let q = supabase
            .from("influencer_metricas")
            .select(
              "influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data, operadora_slug",
            )
            .gte("data", params.inicio)
            .lte("data", params.fim)
            .order("data", { ascending: true })
            .order("influencer_id", { ascending: true })
            .order("operadora_slug", { ascending: true })
            .range(from, to);
          if (operadoraSlugs) q = q.in("operadora_slug", operadoraSlugs);
          if (influencerIds) q = q.in("influencer_id", influencerIds);
          return q;
        }),
        fetchAllPages<InfluencerAnalyticsLive>(async (from, to) => {
          let q = supabase
            .from("lives")
            .select("id, influencer_id, status, plataforma, data, operadora_slug")
            .eq("status", "realizada")
            .gte("data", params.inicio)
            .lte("data", params.fim)
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);
          if (operadoraSlugs) q = q.in("operadora_slug", operadoraSlugs);
          if (influencerIds) q = q.in("influencer_id", influencerIds);
          return q;
        }),
      ]);

      const resultados = await fetchLiveResultadosBatched<InfluencerAnalyticsResultado>(
        lives.map((live) => live.id),
        async (ids) =>
          await supabase
            .from("live_resultados")
            .select("live_id, duracao_horas, duracao_min, media_views, max_views")
            .in("live_id", ids),
      );

      return { metricas, lives, resultados };
    },
  });
}
