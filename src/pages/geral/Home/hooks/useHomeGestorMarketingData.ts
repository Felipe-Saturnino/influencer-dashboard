import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { fmtBRL } from "../../../../lib/dashboardHelpers";
import { totaisFromKpiRows } from "../../../dashboards/SocialMediaDashboard/socialMediaBlocks";

type KpiDailyRow = {
  date: string;
  channel: string;
  followers?: number | null;
  followers_gained?: number | null;
  posts_published?: number | null;
  impressions?: number | null;
  engagements?: number | null;
  link_clicks?: number | null;
};

export type HomeGestorMarketingAlertas = {
  utmsPendentes: number;
};

export type HomeGestorMarketingKpis = {
  mesLabel: string;
  resultado: { ggrFmt: string; registros: number; ftds: number; depositosFmt: string };
  acoes: { postagens: number; novosSeguidores: number; impressoes: number; engajamentoFmt: string };
  erroKpis: boolean;
};

export function useHomeGestorMarketingData() {
  const [ready, setReady] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorMarketingAlertas>({ utmsPendentes: 0 });
  const [kpis, setKpis] = useState<HomeGestorMarketingKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      try {
        const { referencia, atual } = getHomeKpiPeriodosComparativoMoM();

        const [utmRes, analytics, kpiRows] = await Promise.all([
          supabase.from("utm_aliases").select("id", { count: "exact", head: true }).eq("status", "pendente"),
          fetchInfluencerAnalyticsPeriodoCached({ inicio: atual.inicio, fim: atual.fim }),
          fetchAllPages<KpiDailyRow>(async (from, to) =>
            supabase
              .from("kpi_daily")
              .select(
                "date, channel, followers, followers_gained, posts_published, impressions, engagements, link_clicks",
              )
              .gte("date", atual.inicio)
              .lte("date", atual.fim)
              .order("date")
              .range(from, to),
          ).catch(() => [] as KpiDailyRow[]),
        ]);

        if (cancelled) return;

        const ggr = analytics.metricas.reduce((a, m) => a + (Number(m.ggr) || 0), 0);
        const registros = analytics.metricas.reduce((a, m) => a + (Number(m.registration_count) || 0), 0);
        const ftds = analytics.metricas.reduce((a, m) => a + (Number(m.ftd_count) || 0), 0);
        const depositos = analytics.metricas.reduce((a, m) => a + (Number(m.deposit_total) || 0), 0);

        let erroKpis = false;
        let acoes = { postagens: 0, novosSeguidores: 0, impressoes: 0, engajamentoFmt: "—" };
        try {
          const totais = totaisFromKpiRows(kpiRows as Parameters<typeof totaisFromKpiRows>[0]);
          const novosSeg = kpiRows.reduce((a, r) => a + (Number(r.followers_gained) || 0), 0);
          const eng = totais.impressoes > 0 ? (totais.engagements / totais.impressoes) * 100 : 0;
          acoes = {
            postagens: totais.postagens ?? 0,
            novosSeguidores: novosSeg,
            impressoes: totais.impressoes ?? 0,
            engajamentoFmt: `${eng.toFixed(1)}%`,
          };
        } catch (e) {
          console.error("[HomeGestorMarketing] KPIs ações:", e);
          erroKpis = true;
        }

        setAlertas({ utmsPendentes: utmRes.count ?? 0 });
        setKpis({
          mesLabel: referencia.label,
          resultado: {
            ggrFmt: fmtBRL(ggr),
            registros,
            ftds,
            depositosFmt: fmtBRL(depositos),
          },
          acoes,
          erroKpis,
        });
      } catch (e) {
        console.error("[HomeGestorMarketing] carga:", e);
        if (!cancelled) {
          setKpis({
            mesLabel: "",
            resultado: { ggrFmt: "—", registros: 0, ftds: 0, depositosFmt: "—" },
            acoes: { postagens: 0, novosSeguidores: 0, impressoes: 0, engajamentoFmt: "—" },
            erroKpis: true,
          });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, alertas, kpis };
}
