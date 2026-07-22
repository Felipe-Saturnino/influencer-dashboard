/* eslint-disable react-refresh/only-export-components -- Provider + hooks de contexto no mesmo ficheiro. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AFILIADO_FILTRO_TODOS_VALUE } from "../../../components/FiltroAfiliadoSelect";
import { useDashboardCatalogos } from "../../../hooks/useDashboardCatalogos";
import { useAfiliadosDashboardData } from "../../../hooks/useAfiliadosDashboardData";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getMesesDisponiveis, getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";
import type {
  AfiliadoDiaRow,
  AfiliadoRankingRow,
  AfiliadoTotais,
} from "../../../lib/afiliadosAnalytics";

export type MesRef = { ano: number; mes: number; label: string };

export type AfiliadosFiltrosContextValue = {
  mesesDisponiveis: MesRef[];
  idxMes: number;
  setIdxMes: Dispatch<SetStateAction<number>>;
  historico: boolean;
  setHistorico: Dispatch<SetStateAction<boolean>>;
  filtroAfiliado: string;
  setFiltroAfiliado: Dispatch<SetStateAction<string>>;
  filtroOperadora: string;
  setFiltroOperadora: Dispatch<SetStateAction<string>>;
  operadorasList: { slug: string; nome: string }[];
  /** Afiliados cadastrados (role=afiliado) no escopo do usuário. */
  afiliadoOptions: { id: string; nome: string }[];
  idxInicial: number;
  mesSelecionado: MesRef | undefined;
  isPrimeiro: boolean;
  isUltimo: boolean;
  irMesAnterior: () => void;
  irMesProximo: () => void;
  toggleHistorico: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  totais: AfiliadoTotais;
  totaisAnt: AfiliadoTotais;
  ranking: AfiliadoRankingRow[];
  detalhe: AfiliadoDiaRow[];
  metricasPorAfiliado: Record<string, { acessos: number; registros: number; ftds: number }>;
};

const AfiliadosFiltrosCtx = createContext<AfiliadosFiltrosContextValue | null>(null);

export function useAfiliadosFiltrosOptional(): AfiliadosFiltrosContextValue | null {
  return useContext(AfiliadosFiltrosCtx);
}

export function useAfiliadosFiltros(): AfiliadosFiltrosContextValue {
  const v = useContext(AfiliadosFiltrosCtx);
  if (!v) throw new Error("useAfiliadosFiltros deve ser usado dentro de AfiliadosFiltrosProvider");
  return v;
}

export function AfiliadosFiltrosProvider({ children }: { children: ReactNode }) {
  const { podeVerOperadora } = useDashboardFiltros();
  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [filtroAfiliado, setFiltroAfiliado] = useState(AFILIADO_FILTRO_TODOS_VALUE);
  const [filtroOperadora, setFiltroOperadora] = useState("todas");
  const [isLoadingManual, setIsLoadingState] = useState(false);
  const setIsLoading = useCallback((v: boolean) => {
    setIsLoadingState(v);
  }, []);

  const { operadoras } = useDashboardCatalogos();
  const operadorasList = useMemo(
    () => operadoras.filter((o) => podeVerOperadora(o.slug)),
    [operadoras, podeVerOperadora],
  );

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const data = useAfiliadosDashboardData({
    historico,
    mesSelecionado,
    filtroAfiliado,
    filtroOperadora,
    detalhePorAfiliado: false,
  });

  useEffect(() => {
    setIsLoadingState(data.loading || data.catalogPending);
  }, [data.loading, data.catalogPending]);

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

  const value = useMemo(
    () => ({
      mesesDisponiveis,
      idxMes,
      setIdxMes,
      historico,
      setHistorico,
      filtroAfiliado,
      setFiltroAfiliado,
      filtroOperadora,
      setFiltroOperadora,
      operadorasList,
      afiliadoOptions: data.afiliadoOptions,
      idxInicial,
      mesSelecionado,
      isPrimeiro,
      isUltimo,
      irMesAnterior,
      irMesProximo,
      toggleHistorico,
      isLoading: isLoadingManual || data.loading || data.catalogPending,
      setIsLoading,
      totais: data.totais,
      totaisAnt: data.totaisAnt,
      ranking: data.ranking,
      detalhe: data.detalhe,
      metricasPorAfiliado: data.metricasPorAfiliado,
    }),
    [
      mesesDisponiveis,
      idxMes,
      historico,
      filtroAfiliado,
      filtroOperadora,
      operadorasList,
      data.afiliadoOptions,
      data.totais,
      data.totaisAnt,
      data.ranking,
      data.detalhe,
      data.metricasPorAfiliado,
      data.loading,
      data.catalogPending,
      idxInicial,
      mesSelecionado,
      isPrimeiro,
      isUltimo,
      irMesAnterior,
      irMesProximo,
      toggleHistorico,
      isLoadingManual,
      setIsLoading,
    ],
  );

  return <AfiliadosFiltrosCtx.Provider value={value}>{children}</AfiliadosFiltrosCtx.Provider>;
}
