import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "../../../context/AppContext";
import { getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import type { OverviewSpinCanal } from "./overviewSpinCanal";
import {
  type MesaCadastroComparativoRow,
  buildSlugListForMesasQueries,
  getMesesDisponiveis,
} from "./overviewSpinLogic";
import {
  fetchOverviewSpinDados,
  OVERVIEW_SPIN_DADOS_VAZIO,
} from "./overviewSpinDataFetch";

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

  const mesasCadastroQuery = useQuery({
    queryKey: ["overview-spin", "mesas-cadastro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mesas_spin_cadastro")
        .select("operadora_slug, tipo_jogo, nome_mesa");
      if (error) throw error;
      return (data ?? []) as MesaCadastroComparativoRow[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const slugList = useMemo(() => {
    let list = buildSlugListForMesasQueries({
      operadoraSlugsForcado,
      filtroOperadora,
      semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
      operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
    });
    if (slugsPermitidosPelaAba != null) {
      if (list == null) {
        list = [...slugsPermitidosPelaAba];
      } else {
        const permitidos = new Set(slugsPermitidosPelaAba);
        list = list.filter((slug) => permitidos.has(slug));
      }
    }
    return list == null ? null : [...new Set(list)].sort();
  }, [
    operadoraSlugsForcado,
    filtroOperadora,
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.operadorasVisiveis,
    slugsPermitidosPelaAba,
  ]);

  const semSlugsPermitidos = slugList != null && slugList.length === 0;
  const dadosQuery = useQuery({
    queryKey: [
      "overview-spin",
      "dados",
      canal,
      historico ? "historico-13m" : `${mesSelecionado?.ano ?? 0}-${mesSelecionado?.mes ?? 0}`,
      slugList == null ? "sem-restricao" : slugList.join("|"),
      modoAgregadoTodasOperadoras,
    ],
    enabled: canal != null && !semSlugsPermitidos,
    queryFn: () =>
      fetchOverviewSpinDados({
        canal: canal!,
        slugList,
        historico,
        mesSelecionado,
        agregadoTodas: modoAgregadoTodasOperadoras,
      }),
    staleTime: historico ? 10 * 60 * 1000 : 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dadosQuery.error) {
      console.error("[OverviewSpin] carregar dados:", dadosQuery.error);
    }
  }, [dadosQuery.error]);

  const dados = semSlugsPermitidos ? OVERVIEW_SPIN_DADOS_VAZIO : (dadosQuery.data ?? OVERVIEW_SPIN_DADOS_VAZIO);
  const loading = canal != null && !semSlugsPermitidos && dadosQuery.isPending;

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
    mesasCadastro: mesasCadastroQuery.data ?? [],
    dailyData: dados.dailyData,
    monthlyData: dados.monthlyData,
    porTabelaRows: dados.porTabelaRows,
    porTabelaHistAll: dados.porTabelaHistAll,
    monthlyUapArpuSel: dados.monthlyUapArpuSel,
    monthlyUapArpuPrev: dados.monthlyUapArpuPrev,
    dailyDataPrevMonth: dados.dailyDataPrevMonth,
    uapPorJogoRows: dados.uapPorJogoRows,
    dailyRawUnmerged: dados.dailyRawUnmerged,
    monthlyRawUnmerged: dados.monthlyRawUnmerged,
    irMesAnterior,
    irMesProximo,
    toggleHistorico,
    idxInicial,
  };
}
