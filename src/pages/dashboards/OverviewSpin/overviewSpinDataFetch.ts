import {
  getPeriodoComparativoMoMDmenos1,
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

export type OverviewSpinDadosEssenciais = Pick<
  OverviewSpinDadosSnapshot,
  | "dailyData"
  | "monthlyData"
  | "monthlyUapArpuSel"
  | "monthlyUapArpuPrev"
  | "dailyDataPrevMonth"
  | "dailyRawUnmerged"
  | "monthlyRawUnmerged"
>;

export type OverviewSpinDadosSecundarios = Pick<
  OverviewSpinDadosSnapshot,
  "porTabelaRows" | "porTabelaHistAll" | "uapPorJogoRows"
>;

export const OVERVIEW_SPIN_ESSENCIAIS_VAZIO: OverviewSpinDadosEssenciais = {
  dailyData: [],
  monthlyData: [],
  monthlyUapArpuSel: null,
  monthlyUapArpuPrev: null,
  dailyDataPrevMonth: [],
  dailyRawUnmerged: [],
  monthlyRawUnmerged: [],
};

export const OVERVIEW_SPIN_SECUNDARIOS_VAZIO: OverviewSpinDadosSecundarios = {
  porTabelaRows: [],
  porTabelaHistAll: [],
  uapPorJogoRows: [],
};

export function getOverviewSpinHistoricoPeriodo(ref = new Date()): { inicio: string; fim: string } {
  return getPeriodoHistoricoCompetencias(ref);
}

async function fetchCanalHistoricoEssencial(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  periodo: { inicio: string; fim: string },
) {
  const [monthlyRaw, dailyRaw] = await Promise.all([
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
  ]);
  return {
    monthlyRaw: monthlyRaw as MonthlyRawRow[],
    dailyRaw: dailyRaw as DailyRawRow[],
  };
}

async function fetchCanalHistoricoSecundario(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  periodo: { inicio: string; fim: string },
) {
  const [porAllRaw, uapRaw] = await Promise.all([
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
    porAllRaw: porAllRaw as PorTabelaRaw[],
    uapRaw: uapRaw as UapRawRow[],
  };
}

async function fetchCanalMesEssencial(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  mesSelecionado: { ano: number; mes: number },
) {
  const { atual, anterior } = getPeriodoComparativoMoMDmenos1(mesSelecionado.ano, mesSelecionado.mes);
  const { inicio, fim } = atual;
  const { inicio: pi, fim: pf } = anterior;

  const [dailyRaw, dailyPrevRaw, mSelResult, mPrevResult] = await Promise.all([
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
    mSelRows: (mSelResult.data ?? []) as MonthlyUapArpuRaw[],
    mPrevRows: (mPrevResult.data ?? []) as MonthlyUapArpuRaw[],
  };
}

async function fetchCanalMesSecundario(
  tabelas: ReturnType<typeof tabelasRelatorioDoCanal>,
  slugList: string[] | null,
  mesSelecionado: { ano: number; mes: number },
) {
  const { atual } = getPeriodoComparativoMoMDmenos1(mesSelecionado.ano, mesSelecionado.mes);
  const { inicio, fim } = atual;

  const [mesasMesRaw, uapRaw] = await Promise.all([
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
  ]);

  return {
    mesasMesRaw: mesasMesRaw as PorTabelaRaw[],
    uapRaw: uapRaw as UapRawRow[],
  };
}

type FetchParams = {
  canal: OverviewSpinCanal;
  slugList: string[] | null;
  historico: boolean;
  mesSelecionado: { ano: number; mes: number } | undefined;
  agregadoTodas: boolean;
};

export async function fetchOverviewSpinDadosEssenciais(
  params: FetchParams,
): Promise<OverviewSpinDadosEssenciais> {
  const { canal, slugList, historico, mesSelecionado, agregadoTodas } = params;
  const tabDed = tabelasRelatorioDoCanal("dedicado");
  const tabNet = tabelasRelatorioDoCanal("network");

  if (historico) {
    const periodo = getOverviewSpinHistoricoPeriodo();
    let monthlyRaw: MonthlyRawRow[];
    let dailyRaw: DailyRawRow[];

    if (canal === "consolidado") {
      const [d, n] = await Promise.all([
        fetchCanalHistoricoEssencial(tabDed, slugList, periodo),
        fetchCanalHistoricoEssencial(tabNet, slugList, periodo),
      ]);
      monthlyRaw = mergeMonthlyRawEntreCanais(d.monthlyRaw, n.monthlyRaw);
      dailyRaw = mergeDailyRawEntreCanais(d.dailyRaw, n.dailyRaw);
    } else {
      const one = await fetchCanalHistoricoEssencial(
        tabelasRelatorioDoCanal(canal),
        slugList,
        periodo,
      );
      monthlyRaw = one.monthlyRaw;
      dailyRaw = one.dailyRaw;
    }

    return {
      ...OVERVIEW_SPIN_ESSENCIAIS_VAZIO,
      monthlyRawUnmerged: monthlyRaw,
      dailyRawUnmerged: dailyRaw,
      monthlyData: agregadoTodas
        ? mergeMonthlyHistoricoAgregadoTodas(monthlyRaw)
        : mergeMonthlyHistoricoRows(monthlyRaw),
      dailyData: agregadoTodas
        ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
        : mergeDailyRowsPorData(dailyRaw),
    };
  }

  if (!mesSelecionado) return OVERVIEW_SPIN_ESSENCIAIS_VAZIO;

  let dailyRaw: DailyRawRow[];
  let dailyPrevRaw: DailyRawRow[];
  let mSelRows: MonthlyUapArpuRaw[];
  let mPrevRows: MonthlyUapArpuRaw[];

  if (canal === "consolidado") {
    const [d, n] = await Promise.all([
      fetchCanalMesEssencial(tabDed, slugList, mesSelecionado),
      fetchCanalMesEssencial(tabNet, slugList, mesSelecionado),
    ]);
    dailyRaw = mergeDailyRawEntreCanais(d.dailyRaw, n.dailyRaw);
    dailyPrevRaw = mergeDailyRawEntreCanais(d.dailyPrevRaw, n.dailyPrevRaw);
    mSelRows = mergeMonthlyRawEntreCanais(
      d.mSelRows.map((r) => ({ ...r, mes: "" })),
      n.mSelRows.map((r) => ({ ...r, mes: "" })),
    ).map(({ uap, arpu, operadora_slug }) => ({ uap, arpu, operadora_slug }));
    mPrevRows = mergeMonthlyRawEntreCanais(
      d.mPrevRows.map((r) => ({ ...r, mes: "" })),
      n.mPrevRows.map((r) => ({ ...r, mes: "" })),
    ).map(({ uap, arpu, operadora_slug }) => ({ uap, arpu, operadora_slug }));
  } else {
    const one = await fetchCanalMesEssencial(
      tabelasRelatorioDoCanal(canal),
      slugList,
      mesSelecionado,
    );
    dailyRaw = one.dailyRaw;
    dailyPrevRaw = one.dailyPrevRaw;
    mSelRows = one.mSelRows;
    mPrevRows = one.mPrevRows;
  }

  return {
    ...OVERVIEW_SPIN_ESSENCIAIS_VAZIO,
    dailyRawUnmerged: dailyRaw,
    dailyData: agregadoTodas
      ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
      : mergeDailyRowsPorData(dailyRaw),
    dailyDataPrevMonth: agregadoTodas
      ? mergeDailyRowsAgregadoTodasOperadoras(dailyPrevRaw)
      : mergeDailyRowsPorData(dailyPrevRaw),
    monthlyUapArpuSel: agregadoTodas
      ? mergeMonthlyUapArpuAgregadoTodas(mSelRows)
      : mergeMonthlyUapArpuSingleMonth(mSelRows),
    monthlyUapArpuPrev: agregadoTodas
      ? mergeMonthlyUapArpuAgregadoTodas(mPrevRows)
      : mergeMonthlyUapArpuSingleMonth(mPrevRows),
  };
}

export async function fetchOverviewSpinDadosSecundarios(
  params: FetchParams,
): Promise<OverviewSpinDadosSecundarios> {
  const { canal, slugList, historico, mesSelecionado } = params;
  const tabDed = tabelasRelatorioDoCanal("dedicado");
  const tabNet = tabelasRelatorioDoCanal("network");

  if (historico) {
    const periodo = getOverviewSpinHistoricoPeriodo();
    let porAllRaw: PorTabelaRaw[];
    let uapRaw: UapRawRow[];

    if (canal === "consolidado") {
      const [d, n] = await Promise.all([
        fetchCanalHistoricoSecundario(tabDed, slugList, periodo),
        fetchCanalHistoricoSecundario(tabNet, slugList, periodo),
      ]);
      porAllRaw = [...d.porAllRaw, ...n.porAllRaw];
      uapRaw = mergeUapRawEntreCanais(d.uapRaw, n.uapRaw);
    } else {
      const one = await fetchCanalHistoricoSecundario(
        tabelasRelatorioDoCanal(canal),
        slugList,
        periodo,
      );
      porAllRaw = one.porAllRaw;
      uapRaw = one.uapRaw;
    }

    return {
      porTabelaRows: [],
      porTabelaHistAll: porAllRaw.map(mapPorTabelaV2),
      uapPorJogoRows: mergeUapPorJogoRows(uapRaw),
    };
  }

  if (!mesSelecionado) return OVERVIEW_SPIN_SECUNDARIOS_VAZIO;

  let mesasMesRaw: PorTabelaRaw[];
  let uapRaw: UapRawRow[];

  if (canal === "consolidado") {
    const [d, n] = await Promise.all([
      fetchCanalMesSecundario(tabDed, slugList, mesSelecionado),
      fetchCanalMesSecundario(tabNet, slugList, mesSelecionado),
    ]);
    mesasMesRaw = [...d.mesasMesRaw, ...n.mesasMesRaw];
    uapRaw = mergeUapRawEntreCanais(d.uapRaw, n.uapRaw);
  } else {
    const one = await fetchCanalMesSecundario(
      tabelasRelatorioDoCanal(canal),
      slugList,
      mesSelecionado,
    );
    mesasMesRaw = one.mesasMesRaw;
    uapRaw = one.uapRaw;
  }

  return {
    porTabelaRows: mesasMesRaw.map(mapPorTabelaV2),
    porTabelaHistAll: [],
    uapPorJogoRows: mergeUapPorJogoRows(uapRaw),
  };
}
