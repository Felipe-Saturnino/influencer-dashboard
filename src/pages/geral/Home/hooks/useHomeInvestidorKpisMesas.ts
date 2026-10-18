import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeKpiPeriodo } from "../../../../lib/homeInvestidorMtd";
import {
  aggregateHomeKpisMesasPorCanal,
  type HomeKpisMesasAgregado,
  type RelatorioDailySummaryRow,
} from "../../../../lib/homeInvestidorKpisMesas";

const SELECT_COLS = "data, turnover, ggr, apostas, operadora_slug";

async function fetchDailyTable(
  table: "relatorio_daily_summary" | "relatorio_network_daily_summary",
  inicio: string,
  fim: string,
): Promise<RelatorioDailySummaryRow[]> {
  return fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
    supabase
      .from(table)
      .select(SELECT_COLS)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true })
      .range(from, to),
  );
}

export function useHomeInvestidorKpisMesas() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [data, setData] = useState<HomeKpisMesasAgregado | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);
      try {
        const { inicio, fim } = getHomeKpiPeriodo();
        const [dedicado, network] = await Promise.all([
          fetchDailyTable("relatorio_daily_summary", inicio, fim),
          fetchDailyTable("relatorio_network_daily_summary", inicio, fim),
        ]);

        if (cancelled) return;

        setData(aggregateHomeKpisMesasPorCanal(dedicado, network));
      } catch (e) {
        console.error("[HomeInvestidor] KPIs mesas:", e);
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
