import { useMemo } from "react";
import {
  aggDailyMesKpi,
  arpuComparativoFromGgrUap,
  montarKpiAnteriorMoM,
  type DailyRow,
  type LinhaDetalheTab,
  type MonthlyKpiSnapshot,
} from "./overviewSpinLogic";

export type KpiExibirSnapshot = MonthlyKpiSnapshot;

type Params = {
  historico: boolean;
  modoAgregadoTodasOperadoras: boolean;
  tabelaRows: LinhaDetalheTab[];
  dailyData: DailyRow[];
  dailyDataPrevMonth: DailyRow[];
  monthlyUapArpuSel: { uap: number | null; arpu: number | null } | null;
  monthlyUapArpuPrev: { uap: number | null; arpu: number | null } | null;
};

export function useOverviewSpinKpiExibir({
  historico,
  modoAgregadoTodasOperadoras,
  tabelaRows,
  dailyData,
  dailyDataPrevMonth,
  monthlyUapArpuSel,
  monthlyUapArpuPrev,
}: Params) {
  const kpiExibir = useMemo((): KpiExibirSnapshot | null => {
    if (historico) {
      if (tabelaRows.length === 0) return null;
      let turnover = 0;
      let ggr = 0;
      let bets = 0;
      const uapMeses: number[] = [];
      for (const r of tabelaRows) {
        turnover += Number(r.turnover ?? 0);
        ggr += Number(r.ggr ?? 0);
        bets += Number(r.bets ?? 0);
        if (r.uap != null) uapMeses.push(Number(r.uap));
      }
      const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
      const bet_size = bets !== 0 ? turnover / bets : null;
      if (modoAgregadoTodasOperadoras) {
        const somaUapMeses = uapMeses.reduce((a, b) => a + b, 0);
        const mediaUapMesesHist =
          uapMeses.length > 0 ? somaUapMeses / uapMeses.length : null;
        return {
          turnover,
          ggr,
          margin_pct,
          bets,
          uap: mediaUapMesesHist,
          bet_size,
          arpu: arpuComparativoFromGgrUap(ggr, mediaUapMesesHist),
        };
      }
      const somaUap = uapMeses.reduce((a, b) => a + b, 0);
      const mediaUap = uapMeses.length > 0 ? somaUap / uapMeses.length : null;
      return {
        turnover,
        ggr,
        margin_pct,
        bets,
        uap: mediaUap,
        bet_size,
        arpu: arpuComparativoFromGgrUap(ggr, mediaUap),
      };
    }
    const base = dailyData.length === 0 ? null : aggDailyMesKpi(dailyData);
    if (!base) return null;
    const u = monthlyUapArpuSel?.uap ?? null;
    return {
      ...base,
      uap: u,
      arpu: arpuComparativoFromGgrUap(base.ggr, u),
    };
  }, [historico, tabelaRows, dailyData, monthlyUapArpuSel, modoAgregadoTodasOperadoras]);

  const kpiAntExibir = useMemo(
    (): KpiExibirSnapshot | null =>
      montarKpiAnteriorMoM({
        historico,
        dailyDataPrevMonth,
        monthlyUapArpuPrev,
      }),
    [historico, dailyDataPrevMonth, monthlyUapArpuPrev],
  );

  const isHistoricoKpi = historico || dailyDataPrevMonth.length === 0;

  return { kpiExibir, kpiAntExibir, isHistoricoKpi };
}
