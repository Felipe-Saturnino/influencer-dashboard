import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "../../../context/AppContext";
import { getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import type { OverviewSpinCanal } from "./overviewSpinCanal";
import {
  type MesaCadastroComparativoRow,
  buildSlugListForMesasQueries,
  getMesesDisponiveis,
} from "./overviewSpinLogic";
import {
  fetchOverviewSpinDadosEssenciais,
  fetchOverviewSpinDadosSecundarios,
  OVERVIEW_SPIN_ESSENCIAIS_VAZIO,
  OVERVIEW_SPIN_SECUNDARIOS_VAZIO,
} from "./overviewSpinDataFetch";

export const MSG_ERRO_OVERVIEW_SPIN =
  "Não foi possível carregar os dados. Se o problema persistir, entre em contato com o suporte.";

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
      const rows = await fetchAllPages(async (from, to) =>
        supabase
          .from("mesas_spin_cadastro")
          .select("operadora_slug, tipo_jogo, nome_mesa")
          .range(from, to),
      );
      return rows as MesaCadastroComparativoRow[];
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
  const queryKeyBase = [
    "overview-spin",
    "dados",
    canal,
    historico ? "historico-13m" : `${mesSelecionado?.ano ?? 0}-${mesSelecionado?.mes ?? 0}`,
    slugList == null ? "sem-restricao" : slugList.join("|"),
    modoAgregadoTodasOperadoras,
  ] as const;

  const fetchParams = {
    canal: canal!,
    slugList,
    historico,
    mesSelecionado,
    agregadoTodas: modoAgregadoTodasOperadoras,
  };

  const essenciaisQuery = useQuery({
    queryKey: [...queryKeyBase, "essencial"],
    enabled: canal != null && !semSlugsPermitidos,
    queryFn: () => fetchOverviewSpinDadosEssenciais(fetchParams),
    staleTime: historico ? 10 * 60 * 1000 : 5 * 60 * 1000,
  });

  const secundariosQuery = useQuery({
    queryKey: [...queryKeyBase, "secundario"],
    enabled: canal != null && !semSlugsPermitidos && essenciaisQuery.isSuccess,
    queryFn: () => fetchOverviewSpinDadosSecundarios(fetchParams),
    staleTime: historico ? 10 * 60 * 1000 : 5 * 60 * 1000,
  });

  useEffect(() => {
    if (essenciaisQuery.error) {
      console.error("[OverviewSpin] carregar dados essenciais:", essenciaisQuery.error);
    }
  }, [essenciaisQuery.error]);

  useEffect(() => {
    if (secundariosQuery.error) {
      console.error("[OverviewSpin] carregar dados de mesas:", secundariosQuery.error);
    }
  }, [secundariosQuery.error]);

  const essenciais = semSlugsPermitidos
    ? OVERVIEW_SPIN_ESSENCIAIS_VAZIO
    : (essenciaisQuery.data ?? OVERVIEW_SPIN_ESSENCIAIS_VAZIO);
  const secundarios = semSlugsPermitidos
    ? OVERVIEW_SPIN_SECUNDARIOS_VAZIO
    : (secundariosQuery.data ?? OVERVIEW_SPIN_SECUNDARIOS_VAZIO);

  const loading = canal != null && !semSlugsPermitidos && essenciaisQuery.isPending;
  const loadingSecundario =
    canal != null && !semSlugsPermitidos && (essenciaisQuery.isPending || secundariosQuery.isPending);
  const erroCarga = essenciaisQuery.isError ? MSG_ERRO_OVERVIEW_SPIN : null;
  const erroSecundario = secundariosQuery.isError ? MSG_ERRO_OVERVIEW_SPIN : null;

  const recarregar = useCallback(() => {
    void essenciaisQuery.refetch();
    void secundariosQuery.refetch();
  }, [essenciaisQuery, secundariosQuery]);

  const recarregarSecundario = useCallback(() => {
    void secundariosQuery.refetch();
  }, [secundariosQuery]);

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
    loadingSecundario,
    erroCarga,
    erroSecundario,
    recarregar,
    recarregarSecundario,
    modoAgregadoTodasOperadoras,
    mesSelecionado,
    mesasCadastro: mesasCadastroQuery.data ?? [],
    dailyData: essenciais.dailyData,
    monthlyData: essenciais.monthlyData,
    porTabelaRows: secundarios.porTabelaRows,
    porTabelaHistAll: secundarios.porTabelaHistAll,
    monthlyUapArpuSel: essenciais.monthlyUapArpuSel,
    monthlyUapArpuPrev: essenciais.monthlyUapArpuPrev,
    dailyDataPrevMonth: essenciais.dailyDataPrevMonth,
    uapPorJogoRows: secundarios.uapPorJogoRows,
    dailyRawUnmerged: essenciais.dailyRawUnmerged,
    monthlyRawUnmerged: essenciais.monthlyRawUnmerged,
    irMesAnterior,
    irMesProximo,
    toggleHistorico,
    idxInicial,
  };
}
