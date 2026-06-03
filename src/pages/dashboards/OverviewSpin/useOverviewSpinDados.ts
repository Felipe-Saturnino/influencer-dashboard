import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getIdxMesCarrosselPadrao, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import type { OverviewSpinTab } from "./overviewSpinTabs";
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

export function useOverviewSpinDados(aba: OverviewSpinTab) {
  const { escoposVisiveis } = useApp();
  const { operadoraSlugsForcado } = useDashboardFiltros();

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
  const [operadorasOcr, setOperadorasOcr] = useState<{ slug: string; nome: string }[]>([]);
  const [mesasCadastro, setMesasCadastro] = useState<MesaCadastroComparativoRow[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
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
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasOcr(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

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
      const slugList = buildSlugListForMesasQueries({
        operadoraSlugsForcado,
        filtroOperadora,
        semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
        operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
      });
      const agregadoTodas =
        filtroOperadora === "todas" && (operadoraSlugsForcado == null || operadoraSlugsForcado.length === 0);
      if (historico) {
        const [monthlyRaw, dailyRaw, porAllRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_monthly_summary")
                .select("mes, uap, arpu, operadora_slug")
                .order("mes", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_daily_summary")
                .select("data, turnover, ggr, apostas, uap, operadora_slug")
                .order("data", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_por_tabela")
                .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
                .order("dia", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(true, undefined, from, to, slugList)),
        ]);
        setMonthlyRawUnmerged(monthlyRaw as MonthlyRawRow[]);
        setDailyRawUnmerged(dailyRaw as DailyRawRow[]);
        setMonthlyData(
          agregadoTodas
            ? mergeMonthlyHistoricoAgregadoTodas(monthlyRaw as MonthlyRawRow[])
            : mergeMonthlyHistoricoRows(monthlyRaw as MonthlyRawRow[]),
        );
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyRaw as DailyRawRow[]),
        );
        setPorTabelaHistAll((porAllRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw as UapRawRow[]));
      } else if (mesSelecionado) {
        const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
        const { inicio, fim } = atual;
        const { inicio: pi, fim: pf } = anterior;

        const [dailyRaw, dailyPrevRaw, mesasMesRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_daily_summary")
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
                .from("relatorio_daily_summary")
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
                .from("relatorio_por_tabela")
                .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
                .gte("dia", inicio)
                .lte("dia", fim)
                .order("dia", { ascending: true })
                .order("mesa", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(false, mesSelecionado, from, to, slugList)),
        ]);

        setDailyRawUnmerged(dailyRaw as DailyRawRow[]);
        setMonthlyRawUnmerged([]);
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyRaw as DailyRawRow[]),
        );
        setMonthlyData([]);
        setDailyDataPrevMonth(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyPrevRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyPrevRaw as DailyRawRow[]),
        );
        setPorTabelaRows((mesasMesRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw as UapRawRow[]));

        const { data: mSelRows } = await applyMesasOperadoraSlugFilter(
          supabase.from("relatorio_monthly_summary").select("uap, arpu, operadora_slug").eq("mes", inicio),
          slugList,
        );
        setMonthlyUapArpuSel(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mSelRows ?? [])
            : mergeMonthlyUapArpuSingleMonth(mSelRows ?? []),
        );

        const { data: mPrevRows } = await applyMesasOperadoraSlugFilter(
          supabase.from("relatorio_monthly_summary").select("uap, arpu, operadora_slug").eq("mes", pi),
          slugList,
        );
        setMonthlyUapArpuPrev(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mPrevRows ?? [])
            : mergeMonthlyUapArpuSingleMonth(mPrevRows ?? []),
        );
      }
    } catch {
      setUapPorJogoRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    historico,
    mesSelecionado,
    operadoraSlugsForcado,
    filtroOperadora,
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.operadorasVisiveis,
  ]);

  useEffect(() => {
    if (aba !== "overview") return;
    void carregar();
  }, [carregar, aba]);

  useEffect(() => {
    if (!operadoraSlugsForcado?.length) return;
    if (operadoraSlugsForcado.length === 1 && filtroOperadora === "todas") {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [operadoraSlugsForcado, filtroOperadora]);

  return {
    mesesDisponiveis,
    idxMes,
    setIdxMes,
    historico,
    setHistorico,
    loading,
    filtroOperadora,
    setFiltroOperadora,
    modoAgregadoTodasOperadoras,
    mesSelecionado,
    operadorasOcr,
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
