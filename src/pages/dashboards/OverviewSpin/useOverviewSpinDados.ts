import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { getIdxMesCarrosselPadrao, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
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
  type MesaCadastroComparativoRow,
  type MonthlyRawRow,
  type MonthlyRow,
  type PorTabelaRow,
  type UapPorJogoPlanRow,
  type UapRawRow,
  applyMesasOperadoraSlugFilter,
  buildSlugListForMesasQueries,
  buildUapPorJogoQuery,
  getMesesDisponiveis,
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

async function fetchCanalHistorico(tabelas: ReturnType<typeof tabelasRelatorioDoCanal>, slugList: string[] | null) {
  const [monthlyRaw, dailyRaw, porAllRaw, uapRaw] = await Promise.all([
    fetchAllPages(async (from, to) =>
      applyMesasOperadoraSlugFilter(
        supabase
          .from(tabelas.monthly)
          .select("mes, uap, arpu, operadora_slug")
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
          .order("dia", { ascending: true })
          .range(from, to),
        slugList,
      ),
    ),
    fetchAllPages(async (from, to) => buildUapPorJogoQuery(true, undefined, from, to, slugList, tabelas.uapJogo)),
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

  const [dailyRaw, dailyPrevRaw, mesasMesRaw, uapRaw] = await Promise.all([
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
  ]);

  const { data: mSelRows } = await applyMesasOperadoraSlugFilter(
    supabase.from(tabelas.monthly).select("uap, arpu, operadora_slug").eq("mes", inicio),
    slugList,
  );
  const { data: mPrevRows } = await applyMesasOperadoraSlugFilter(
    supabase.from(tabelas.monthly).select("uap, arpu, operadora_slug").eq("mes", pi),
    slugList,
  );

  return {
    dailyRaw: dailyRaw as DailyRawRow[],
    dailyPrevRaw: dailyPrevRaw as DailyRawRow[],
    mesasMesRaw: mesasMesRaw as PorTabelaRaw[],
    uapRaw: uapRaw as UapRawRow[],
    mSelRows: (mSelRows ?? []) as Array<{ uap: number | null; arpu: number | null; operadora_slug: string }>,
    mPrevRows: (mPrevRows ?? []) as Array<{ uap: number | null; arpu: number | null; operadora_slug: string }>,
  };
}

export function useOverviewSpinDados(
  canal: OverviewSpinCanal | null,
  opts: {
    operadoraSlugsForcado: string[] | null;
    /** Quando definido (aba Dedicado/Network), limita queries a estas operadoras. */
    slugsPermitidosPelaAba: string[] | null;
    filtroOperadora: string;
    setFiltroOperadora: (v: string) => void;
  },
) {
  const { escoposVisiveis } = useApp();
  const { operadoraSlugsForcado, slugsPermitidosPelaAba, filtroOperadora, setFiltroOperadora } = opts;

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uapPorJogoRows, setUapPorJogoRows] = useState<UapPorJogoPlanRow[]>([]);

  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [porTabelaRows, setPorTabelaRows] = useState<PorTabelaRow[]>([]);
  const [porTabelaHistAll, setPorTabelaHistAll] = useState<PorTabelaRow[]>([]);
  const [monthlyUapArpuSel, setMonthlyUapArpuSel] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  const [monthlyUapArpuPrev, setMonthlyUapArpuPrev] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  const [dailyDataPrevMonth, setDailyDataPrevMonth] = useState<DailyRow[]>([]);
  const [mesasCadastro, setMesasCadastro] = useState<MesaCadastroComparativoRow[]>([]);
  const [dailyRawUnmerged, setDailyRawUnmerged] = useState<DailyRawRow[]>([]);
  const [monthlyRawUnmerged, setMonthlyRawUnmerged] = useState<MonthlyRawRow[]>([]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  const modoAgregadoTodasOperadoras =
    filtroOperadora === "todas" && (operadoraSlugsForcado == null || operadoraSlugsForcado.length === 0);

  const irMesAnterior = useCallback(() => {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }, []);

  const irMesProximo = useCallback(() => {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }, [mesesDisponiveis.length]);

  const toggleHistorico = useCallback(() => {
    setHistorico((h) => {
      if (h) {
        setIdxMes(idxInicial);
        return false;
      }
      return true;
    });
  }, [idxInicial]);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("mesas_spin_cadastro")
      .select("operadora_slug, tipo_jogo, nome_mesa")
      .then(({ data }) => {
        if (!alive) return;
        setMesasCadastro((data ?? []) as MesaCadastroComparativoRow[]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    if (!canal) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setPorTabelaRows([]);
    setPorTabelaHistAll([]);
    setMonthlyUapArpuSel(null);
    setMonthlyUapArpuPrev(null);
    setDailyDataPrevMonth([]);
    setUapPorJogoRows([]);
    setDailyRawUnmerged([]);
    setMonthlyRawUnmerged([]);

    try {
      let slugList = buildSlugListForMesasQueries({
        operadoraSlugsForcado,
        filtroOperadora,
        semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
        operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
      });
      if (slugsPermitidosPelaAba != null) {
        if (slugList == null) {
          slugList = [...slugsPermitidosPelaAba];
        } else {
          const allow = new Set(slugsPermitidosPelaAba);
          slugList = slugList.filter((s) => allow.has(s));
        }
        if (slugList.length === 0) {
          setDailyData([]);
          setMonthlyData([]);
          setLoading(false);
          return;
        }
      }
      const agregadoTodas =
        filtroOperadora === "todas" && (operadoraSlugsForcado == null || operadoraSlugsForcado.length === 0);

      const tabDed = tabelasRelatorioDoCanal("dedicado");
      const tabNet = tabelasRelatorioDoCanal("network");

      if (historico) {
        let monthlyRaw: MonthlyRawRow[];
        let dailyRaw: DailyRawRow[];
        let porAllRaw: PorTabelaRaw[];
        let uapRaw: UapRawRow[];

        if (canal === "consolidado") {
          const [d, n] = await Promise.all([
            fetchCanalHistorico(tabDed, slugList),
            fetchCanalHistorico(tabNet, slugList),
          ]);
          monthlyRaw = mergeMonthlyRawEntreCanais(d.monthlyRaw, n.monthlyRaw);
          dailyRaw = mergeDailyRawEntreCanais(d.dailyRaw, n.dailyRaw);
          porAllRaw = [...d.porAllRaw, ...n.porAllRaw];
          uapRaw = mergeUapRawEntreCanais(d.uapRaw, n.uapRaw);
        } else {
          const one = await fetchCanalHistorico(tabelasRelatorioDoCanal(canal), slugList);
          monthlyRaw = one.monthlyRaw;
          dailyRaw = one.dailyRaw;
          porAllRaw = one.porAllRaw;
          uapRaw = one.uapRaw;
        }

        setMonthlyRawUnmerged(monthlyRaw);
        setDailyRawUnmerged(dailyRaw);
        setMonthlyData(
          agregadoTodas
            ? mergeMonthlyHistoricoAgregadoTodas(monthlyRaw)
            : mergeMonthlyHistoricoRows(monthlyRaw),
        );
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
            : mergeDailyRowsPorData(dailyRaw),
        );
        setPorTabelaHistAll(porAllRaw.map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw));
      } else if (mesSelecionado) {
        let dailyRaw: DailyRawRow[];
        let dailyPrevRaw: DailyRawRow[];
        let mesasMesRaw: PorTabelaRaw[];
        let uapRaw: UapRawRow[];
        let mSelRows: Array<{ uap: number | null; arpu: number | null; operadora_slug: string }>;
        let mPrevRows: Array<{ uap: number | null; arpu: number | null; operadora_slug: string }>;

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

        setDailyRawUnmerged(dailyRaw);
        setMonthlyRawUnmerged([]);
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw)
            : mergeDailyRowsPorData(dailyRaw),
        );
        setMonthlyData([]);
        setDailyDataPrevMonth(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyPrevRaw)
            : mergeDailyRowsPorData(dailyPrevRaw),
        );
        setPorTabelaRows(mesasMesRaw.map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw));
        setMonthlyUapArpuSel(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mSelRows)
            : mergeMonthlyUapArpuSingleMonth(mSelRows),
        );
        setMonthlyUapArpuPrev(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mPrevRows)
            : mergeMonthlyUapArpuSingleMonth(mPrevRows),
        );
      }
    } catch {
      setUapPorJogoRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    canal,
    historico,
    mesSelecionado,
    operadoraSlugsForcado,
    slugsPermitidosPelaAba,
    filtroOperadora,
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.operadorasVisiveis,
  ]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!operadoraSlugsForcado?.length) return;
    if (operadoraSlugsForcado.length === 1 && filtroOperadora === "todas") {
      setFiltroOperadora(operadoraSlugsForcado[0]!);
    }
  }, [operadoraSlugsForcado, filtroOperadora, setFiltroOperadora]);

  return {
    mesesDisponiveis,
    idxMes,
    setIdxMes,
    historico,
    setHistorico,
    loading,
    modoAgregadoTodasOperadoras,
    mesSelecionado,
    mesasCadastro,
    dailyData,
    monthlyData,
    porTabelaRows,
    porTabelaHistAll,
    monthlyUapArpuSel,
    monthlyUapArpuPrev,
    dailyDataPrevMonth,
    uapPorJogoRows,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    irMesAnterior,
    irMesProximo,
    toggleHistorico,
    idxInicial,
  };
}
