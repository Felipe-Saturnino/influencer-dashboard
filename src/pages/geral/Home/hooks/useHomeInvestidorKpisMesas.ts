import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages } from "../../../../lib/supabasePaginate";
import { getHomeInvestidorMtdPeriodo } from "../../../../lib/homeInvestidorMtd";
import {
  aggregateHomeKpisMesasMtd,
  type HomeKpisMesasAgregado,
  type RelatorioDailySummaryRow,
} from "../../../../lib/homeInvestidorKpisMesas";

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
        const { inicio, fim } = getHomeInvestidorMtdPeriodo();
        const [dailyRows, operadorasRes] = await Promise.all([
          fetchAllPages<RelatorioDailySummaryRow>(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, operadora_slug")
              .gte("data", inicio)
              .lte("data", fim)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          supabase.from("operadoras").select("slug, nome").order("nome"),
        ]);

        if (cancelled) return;

        const slugToNome = new Map<string, string>();
        for (const o of operadorasRes.data ?? []) {
          const row = o as { slug: string; nome: string };
          slugToNome.set(row.slug, row.nome);
        }

        setData(aggregateHomeKpisMesasMtd(dailyRows, slugToNome));
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
