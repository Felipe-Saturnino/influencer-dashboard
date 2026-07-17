import {
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
} from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  mergeDailyRawEntreCanais,
  mergeMonthlyRawEntreCanais,
  mergeUapRawEntreCanais,
  tabelasRelatorioDoCanal,
  type OverviewSpinCanal,
} from "./overviewSpinCanal";
import {
  type DailyRawRow,
  type DailyRow,
  type MonthlyRawRow,
  type MonthlyRow,
  type PorTabelaRow,
  type UapPorJogoPlanRow,
  type UapRawRow,
  applyMesasOperadoraSlugFilter,
  buildUapPorJogoQuery,
  mapPorTabelaV2,
  mergeDailyRowsAgregadoTodasOperadoras,
  mergeDailyRowsPorData,
  mergeMonthlyHistoricoAgregadoTodas,
  mergeMonthlyHistoricoRows,
  mergeMonthlyUapArpuAgregadoTodas,
  mergeMonthlyUapArpuSingleMonth,
  mergeUapPorJogoRows,
} from "./overviewSpinLogic";

type PorTabelaRaw = Parameters<typeof mapPorTabelaV2>[0];
type MonthlyUapArpu = { uap: number | null; arpu: number | null };
type MonthlyUapArpuRaw = MonthlyUapArpu & { operadora_slug: string };

export type OverviewSpinDadosSnapshot = {
  dailyData: DailyRow[];
  monthlyData: MonthlyRow[];
  porTabelaRows: PorTabelaRow[];
  porTabelaHistAll: PorTabelaRow[];
  monthlyUapArpuSel: MonthlyUapArpu | null;
  monthlyUapArpuPrev: MonthlyUapArpu | null;
  dailyDataPrevMonth: DailyRow[];
  uapPorJogoRows: UapPorJogoPlanRow[];
  dailyRawUnmerged: DailyRawRow[];
  monthlyRawUnmerged: MonthlyRawRow[];
};

export const OVERVIEW_SPIN_DADOS_VAZIO: OverviewSpinDadosSnapshot = {
  dailyData: [],
  monthlyData: [],
  porTabelaRows: [],
  porTabelaHistAll: [],
  monthlyUapArpuSel: null,
  monthlyUapArpuPrev: null,
  dailyDataPrevMonth: [],
  uapPorJogoRows: [],
  dailyRawUnmerged: [],
  monthlyRawUnmerged: [],
};

export function getOverviewSpinHistoricoPeriodo(ref = new Date()): { inicio: string; fim: string } {
  return getPeriodoHistoricoCompetencias(ref);
}

async function fetchCanalHistorico(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  periodo: { inicio: string; fim: string },
) {
  const [monthlyRaw, dailyRaw, porAllRaw, uapRaw] = await Promise.all([
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.monthly)
          .select("mes, uap, arpu, operadora_slug")
          .gte("mes", periodo.inicio)
          .lte("mes", periodo.fim)
          .order("mes", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.daily)
          .select("data, turnover, ggr, apostas, uap, operadora_slug")
          .gte("data", periodo.inicio)
          .lte("data", periodo.fim)
          .order("data", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.porTabela)
          .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
          .gte("dia", periodo.inicio)
          .lte("dia", periodo.fim)
          .order("dia", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      buildUapPorJogoQuery(true, undefined, from, to, slugList, tabelas.uapJogo)
        .gte("data", periodo.inicio)
        .lte("data", periodo.fim),
    ),
  ]);
  return {
    monthlyRaw: monthlyRaw as MonthlyRawRow[],
    dailyRaw: dailyRaw as DailyRawRow[],
    porAllRaw: porAllRaw as PorTabelaRaw[],
    uapRaw: uapRaw as UapRawRow[],
  };
}

async function fetchCanalMes(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  mesSelecionado: { ano: number; mes: number },
) {
  const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
  const { inicio, fim } = atual;
  const { inicio: pi, fim: pf } = anterior;

  const [dailyRaw, dailyPrevRaw, mesasMesRaw, uapRaw, mSelResult, mPrevResult] = await Promise.all([
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.daily)
          .select("data, turnover, ggr, apostas, uap, operadora_slug")
          .gte("data", inicio)
          .lte("data", fim)
          .order("data", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.daily)
          .select("data, turnover, ggr, apostas, uap, operadora_slug")
          .gte("data", pi)
          .lte("data", pf)
          .order("data", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.porTabela)
          .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
          .gte("dia", inicio)
          .lte("dia", fim)
          .order("dia", { ascending: true })
          .order("mesa", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) =>
      buildUapPorJogoQuery(false, mesSelecionado, from, to, slugList, tabelas.uapJogo),
    ),
    applyMesasOperadoraSlugFilter(
      supabase.from(tabelas.monthly).select("uap, arpu, operadora_slug").eq("mes", inicio),
      slugList,
    ),
    applyMesasOperadoraSlugFilter(
      supabase.from(tabelas.monthly).select("uap, arpu, operadora_slug").eq("mes", pi),
      slugList,
    ),
  ]);

  if (mSelResult.error) throw mSelResult.error;
  if (mPrevResult.error) throw mPrevResult.error;

  return {
    dailyRaw: dailyRaw as DailyRawRow[],
    dailyPrevRaw: dailyPrevRaw as DailyRawRow[],
    mesasMesRaw: mesasMesRaw as PorTabelaRaw[],
    uapRaw: uapRaw as UapRawRow[],
    mSelRows: (mSelResult.data ?? []) as MonthlyUapArpuRaw[],
    mPrevRows: (mPrevResult.data ?? []) as MonthlyUapArpuRaw[],
  };
}

export async function fetchOverviewSpinDados(params: {
  canal: OverviewSpinCanal;
  slugList: string[] | null;
  historico: boolean;
  mesSelecionado: { ano: number; mes: number } | undefined;
  agregadoTodas: boolean;
}): Promise<OverviewSpinDadosSnapshot> {
  const { canal, slugList, historico, mesSelecionado, agregadoTodas } = params;
  const tabDed = tabelasRelatorioDoCanal("dedicado");
  const tabNet = tabelasRelatorioDoCanal("network");

  if (historico) {
    const periodo = getOverviewSpinHistoricoPeriodo();
    let monthlyRaw: MonthlyRawRow[];
    let dailyRaw: DailyRawRow[];
    let porAllRaw: PorTabelaRaw[];
    let uapRaw: UapRawRow[];

    if (canal === "consolidado") {
      const [d, n] = await Promise.all([
        fetchCanalHistorico(tabDed, slugList, periodo),
        fetchCanalHistorico(tabNet, slugList, periodo),
      ]);
      monthlyRaw = mergeMonthlyRawEntreCanais(d.monthlyRaw, n.monthlyRaw);
      dailyRaw = mergeDailyRawEntreCanais(d.dailyRaw, n.dailyRaw);
      porAllRaw = [...d.porAllRaw, ...n.porAllRaw];
      uapRaw = mergeUapRawEntreCanais(d.uapRaw, n.uapRaw);
    } else {
      const one = await fetchCanalHistorico(tabelasRelatorioDoCanal(canal), slugList, periodo);
      monthlyRaw = one.monthlyRaw;
      dailyRaw = one.dailyRaw;
      porAllRaw = one.porAllRaw;
      uapRaw = one.uapRaw;
    }

    return {
      ...OVERVIEW_SPIN_DADOS_VAZIO,
      monthlyRawUnmerged: monthlyRaw,
      dailyRawUnmerged: dailyRaw,
      monthlyData: agregadoTodas
        ? mergeMonthlyHistoricoAgregadoTodas(monthlyRaw)
        : mergeMonthlyHistoricoRows(monthlyRaw),
      dailyData: agregadoTodas
        ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
        : mergeDailyRowsPorData(dailyRaw),
      porTabelaHistAll: porAllRaw.map(mapPorTabelaV2),
      uapPorJogoRows: mergeUapPorJogoRows(uapRaw),
    };
  }

  if (!mesSelecionado) return OVERVIEW_SPIN_DADOS_VAZIO;

  let dailyRaw: DailyRawRow[];
  let dailyPrevRaw: DailyRawRow[];
  let mesasMesRaw: PorTabelaRaw[];
  let uapRaw: UapRawRow[];
  let mSelRows: MonthlyUapArpuRaw[];
  let mPrevRows: MonthlyUapArpuRaw[];

  if (canal === "consolidado") {
    const [d, n] = await Promise.all([
      fetchCanalMes(tabDed, slugList, mesSelecionado),
      fetchCanalMes(tabNet, slugList, mesSelecionado),
    ]);
    dailyRaw = mergeDailyRawEntreCanais(d.dailyRaw, n.dailyRaw);
    dailyPrevRaw = mergeDailyRawEntreCanais(d.dailyPrevRaw, n.dailyPrevRaw);
    mesasMesRaw = [...d.mesasMesRaw, ...n.mesasMesRaw];
    uapRaw = mergeUapRawEntreCanais(d.uapRaw, n.uapRaw);
    mSelRows = mergeMonthlyRawEntreCanais(
      d.mSelRows.map((r) => ({ ...r, mes: "" })),
      n.mSelRows.map((r) => ({ ...r, mes: "" })),
    ).map(({ uap, arpu, operadora_slug }) => ({ uap, arpu, operadora_slug }));
    mPrevRows = mergeMonthlyRawEntreCanais(
      d.mPrevRows.map((r) => ({ ...r, mes: "" })),
      n.mPrevRows.map((r) => ({ ...r, mes: "" })),
    ).map(({ uap, arpu, operadora_slug }) => ({ uap, arpu, operadora_slug }));
  } else {
    const one = await fetchCanalMes(tabelasRelatorioDoCanal(canal), slugList, mesSelecionado);
    dailyRaw = one.dailyRaw;
    dailyPrevRaw = one.dailyPrevRaw;
    mesasMesRaw = one.mesasMesRaw;
    uapRaw = one.uapRaw;
    mSelRows = one.mSelRows;
    mPrevRows = one.mPrevRows;
  }

  return {
    ...OVERVIEW_SPIN_DADOS_VAZIO,
    dailyRawUnmerged: dailyRaw,
    dailyData: agregadoTodas
      ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
      : mergeDailyRowsPorData(dailyRaw),
    dailyDataPrevMonth: agregadoTodas
      ? mergeDailyRowsAgregadoTodasOperadoras(dailyPrevRaw)
      : mergeDailyRowsPorData(dailyPrevRaw),
    porTabelaRows: mesasMesRaw.map(mapPorTabelaV2),
    uapPorJogoRows: mergeUapPorJogoRows(uapRaw),
    monthlyUapArpuSel: agregadoTodas
      ? mergeMonthlyUapArpuAgregadoTodas(mSelRows)
      : mergeMonthlyUapArpuSingleMonth(mSelRows),
    monthlyUapArpuPrev: agregadoTodas
      ? mergeMonthlyUapArpuAgregadoTodas(mPrevRows)
      : mergeMonthlyUapArpuSingleMonth(mPrevRows),
  };
}
