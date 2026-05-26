import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeInvestidorMtdPeriodo } from "../../../../lib/homeInvestidorMtd";
import { totaisSocialKpiFromRows, type KpiDailyRow } from "../../../../lib/socialKpiTotals";

export type HomeAquisicaoStreamers = {
  lives: number;
  horas: number;
  depositosTotal: number;
};

export type HomeAquisicaoSocial = {
  postagens: number;
  seguidores: number;
  impressoes: number;
};

export type HomeAquisicaoData = {
  streamers: HomeAquisicaoStreamers;
  social: HomeAquisicaoSocial;
};

export function useHomeInvestidorAquisicao() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [data, setData] = useState<HomeAquisicaoData | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { inicio, fim } = getHomeInvestidorMtdPeriodo();

        const [lives, metricasRows, kpiDaily] = await Promise.all([
          fetchAllPages<{ id: string }>(async (from, to) =>
            supabase
              .from("lives")
              .select("id")
              .eq("status", "realizada")
              .gte("data", inicio)
              .lte("data", fim)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages<{ deposit_total: number | null }>(async (from, to) =>
            supabase
              .from("influencer_metricas")
              .select("deposit_total")
              .gte("data", inicio)
              .lte("data", fim)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages<KpiDailyRow>(async (from, to) =>
            supabase
              .from("kpi_daily")
              .select("channel, date, followers, impressions, posts_published")
              .gte("date", inicio)
              .lte("date", fim)
              .order("date", { ascending: true })
              .range(from, to),
          ),
        ]);

        if (cancelled) return;

        const liveIds = lives.map((l) => l.id);
        let horas = 0;
        if (liveIds.length > 0) {
          const CHUNK = 200;
          for (let i = 0; i < liveIds.length; i += CHUNK) {
            const slice = liveIds.slice(i, i + CHUNK);
            const { data: resRows } = await supabase
              .from("live_resultados")
              .select("duracao_horas, duracao_min")
              .in("live_id", slice);
            for (const r of resRows ?? []) {
              const row = r as { duracao_horas: number | null; duracao_min: number | null };
              horas += (Number(row.duracao_horas) || 0) + (Number(row.duracao_min) || 0) / 60;
            }
            if (cancelled) return;
          }
        }

        const depositosTotal = metricasRows.reduce((acc, m) => acc + (Number(m.deposit_total) || 0), 0);
        const social = totaisSocialKpiFromRows(kpiDaily);

        setData({
          streamers: {
            lives: liveIds.length,
            horas,
            depositosTotal,
          },
          social,
        });
      } catch (e) {
        console.error("[HomeInvestidor] aquisição:", e);
        if (!cancelled) {
          setErro(true);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, erro, data };
}
