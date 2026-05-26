import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../../context/AppContext";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getPeriodoComparativoMoM } from "../../../../lib/dashboardHelpers";
import { getHomeInvestidorMtdPeriodo } from "../../../../lib/homeInvestidorMtd";
import type { RelatorioDailySummaryRow } from "../../../../lib/homeInvestidorKpisMesas";
import { somarKpisMesasMtd, type HomeKpiTotais } from "../../../../lib/homeKpisMesasComparativo";

export type HomeKpisMesasOperadoraData = {
  atual: HomeKpiTotais;
  anterior: HomeKpiTotais;
  operadoraSlugs: string[];
};

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
        const hoje = new Date();
        const mtd = getHomeInvestidorMtdPeriodo(hoje);
        const { anterior: periodoAnterior } = getPeriodoComparativoMoM(hoje.getFullYear(), hoje.getMonth());

        const [rowsMtd, rowsAnterior] = await Promise.all([
          fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, operadora_slug")
              .gte("data", mtd.inicio)
              .lte("data", mtd.fim)
              .in("operadora_slug", operadoraSlugs)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, operadora_slug")
              .gte("data", periodoAnterior.inicio)
              .lte("data", periodoAnterior.fim)
              .in("operadora_slug", operadoraSlugs)
              .order("data", { ascending: true })
              .range(from, to),
          ),
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
