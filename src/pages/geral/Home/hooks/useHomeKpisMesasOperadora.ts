import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeKpiPeriodosComparativoMoM } from "../../../../lib/homeInvestidorMtd";
import type { RelatorioDailySummaryRow } from "../../../../lib/homeInvestidorKpisMesas";
import { somarKpisMesasMtd, type HomeKpiTotais } from "../../../../lib/homeKpisMesasComparativo";

export type HomeKpisMesasOperadoraData = {
  atual: HomeKpiTotais;
  anterior: HomeKpiTotais;
  operadoraSlugs: string[];
};

/** Mesma origem da aba Overview do Overview Spin: Dedicado + Network por operadora. */
async function fetchDailyDedicadoENetwork(
  inicio: string,
  fim: string,
  operadoraSlugs: string[],
): Promise<RelatorioDailySummaryRow[]> {
  const selectCols = "data, turnover, ggr, apostas, operadora_slug";
  const [ded, net] = await Promise.all([
    fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
      supabase
        .from("relatorio_daily_summary")
        .select(selectCols)
        .gte("data", inicio)
        .lte("data", fim)
        .in("operadora_slug", operadoraSlugs)
        .order("data", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
      supabase
        .from("relatorio_network_daily_summary")
        .select(selectCols)
        .gte("data", inicio)
        .lte("data", fim)
        .in("operadora_slug", operadoraSlugs)
        .order("data", { ascending: true })
        .range(from, to),
    ),
  ]);
  return [...ded, ...net];
}

export function useHomeKpisMesasOperadora() {
  const { escoposVisiveis } = useApp();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [data, setData] = useState<HomeKpisMesasOperadoraData | null>(null);

  const operadoraSlugs = useMemo(
    () => escoposVisiveis.operadorasVisiveis ?? [],
    [escoposVisiveis.operadorasVisiveis],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setErro(false);

      if (operadoraSlugs.length === 0) {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { atual: mtd, anterior: periodoAnterior } = getHomeKpiPeriodosComparativoMoM();

        const [rowsMtd, rowsAnterior] = await Promise.all([
          fetchDailyDedicadoENetwork(mtd.inicio, mtd.fim, operadoraSlugs),
          fetchDailyDedicadoENetwork(periodoAnterior.inicio, periodoAnterior.fim, operadoraSlugs),
        ]);

        if (cancelled) return;

        setData({
          atual: somarKpisMesasMtd(rowsMtd, operadoraSlugs),
          anterior: somarKpisMesasMtd(rowsAnterior, operadoraSlugs),
          operadoraSlugs,
        });
      } catch (e) {
        console.error("[HomeOperador] KPIs mesas:", e);
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
  }, [operadoraSlugs]);

  return { loading, erro, data, semOperadora: operadoraSlugs.length === 0 };
}
