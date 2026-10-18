import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { fmtBRL, getPeriodoComparativoMoM } from "../../../../lib/dashboardHelpers";
import { MESES_PT } from "../../../../lib/dashboardConstants";
import {
  fmtNum,
  sumCampanhasPerf,
  totaisFromKpiRows,
  youtubeEngagementFromVideoSnapshots,
  type CampanhaPerfRow,
  type KpiDaily,
  type YoutubeVideoRowLite,
} from "../../../dashboards/SocialMediaDashboard/socialMediaBlocks";

export type HomeGestorMarketingAlertas = {
  utmsPendentes: number;
};

export type HomeGestorMarketingKpis = {
  mesLabel: string;
  resultado: { ggrFmt: string; registrosFmt: string; ftdsFmt: string; depositosFmt: string };
  acoes: {
    postagensFmt: string;
    novosSeguidoresFmt: string;
    impressoesFmt: string;
    engajamentoFmt: string;
  };
  erroKpis: boolean;
};

function mesCivilAtual(): { ano: number; mes: number; label: string } {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = d.getMonth();
  return { ano, mes, label: `${MESES_PT[mes]} ${ano}` };
}

export function useHomeGestorMarketingData() {
  const [ready, setReady] = useState(false);
  const [alertas, setAlertas] = useState<HomeGestorMarketingAlertas>({ utmsPendentes: 0 });
  const [kpis, setKpis] = useState<HomeGestorMarketingKpis | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setReady(false);
      try {
        const { ano, mes, label } = mesCivilAtual();
        const { atual } = getPeriodoComparativoMoM(ano, mes);

        const [utmRes, campRes, kpiRows, ytRes] = await Promise.all([
          supabase.from("utm_aliases").select("id", { count: "exact", head: true }).eq("status", "pendente"),
          supabase.rpc("get_campanhas_performance", {
            p_data_inicio: atual.inicio,
            p_data_fim: atual.fim,
            p_operadora_slug: null,
            p_modo_historico: false,
          }),
          fetchAllPages<KpiDaily>(async (from, to) =>
            supabase
              .from("kpi_daily")
              .select(
                "channel, date, followers, impressions, reach, engagements, engagement_rate, posts_published, video_views, link_clicks",
              )
              .gte("date", atual.inicio)
              .lte("date", atual.fim)
              .order("date", { ascending: true })
              .order("channel", { ascending: true })
              .range(from, to),
          ),
          supabase
            .from("youtube_videos")
            .select("date, likes, comments, video_id")
            .gte("date", atual.inicio)
            .lte("date", atual.fim)
            .order("date", { ascending: false })
            .limit(500),
        ]);

        if (cancelled) return;

        if (campRes.error) {
          console.error("[HomeGestorMarketing] get_campanhas_performance:", campRes.error);
          throw campRes.error;
        }

        const consolidado = sumCampanhasPerf((campRes.data as CampanhaPerfRow[]) ?? []);

        const base = totaisFromKpiRows(kpiRows);
        const ytRows: YoutubeVideoRowLite[] = ((ytRes.data ?? []) as YoutubeVideoRowLite[]).map((r) => ({
          video_id: r.video_id,
          date: r.date,
          likes: r.likes,
          comments: r.comments,
        }));
        const ytKpiEng = (base.byChannel["youtube"] ?? []).reduce(
          (a, r) => a + (Number(r.engagements) || 0),
          0,
        );
        const ytEng = Math.max(ytKpiEng, youtubeEngagementFromVideoSnapshots(ytRows));
        const delta = ytEng - ytKpiEng;
        const totais = delta > 0 ? { ...base, engagements: base.engagements + delta } : base;

        const totalImpr = totais.impressoes || 1;
        const engMedio =
          totalImpr > 0 && totais.engagements != null
            ? (totais.engagements / totalImpr) * 100
            : null;

        setAlertas({ utmsPendentes: utmRes.count ?? 0 });
        setKpis({
          mesLabel: label,
          resultado: {
            ggrFmt: fmtBRL(consolidado.ggr),
            registrosFmt: fmtNum(consolidado.registros),
            ftdsFmt: consolidado.ftds.toLocaleString("pt-BR"),
            depositosFmt: fmtBRL(consolidado.deposit_total),
          },
          acoes: {
            postagensFmt: fmtNum(totais.postagens),
            novosSeguidoresFmt: fmtNum(totais.seguidores),
            impressoesFmt: fmtNum(totais.impressoes),
            engajamentoFmt: engMedio != null ? `${engMedio.toFixed(1)}%` : "—",
          },
          erroKpis: false,
        });
      } catch (e) {
        console.error("[HomeGestorMarketing] carga:", e);
        if (!cancelled) {
          setKpis({
            mesLabel: "",
            resultado: { ggrFmt: "—", registrosFmt: "—", ftdsFmt: "—", depositosFmt: "—" },
            acoes: {
              postagensFmt: "—",
              novosSeguidoresFmt: "—",
              impressoesFmt: "—",
              engajamentoFmt: "—",
            },
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
