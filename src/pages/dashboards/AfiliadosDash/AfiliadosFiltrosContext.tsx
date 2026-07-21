/* eslint-disable react-refresh/only-export-components -- Provider + hooks de contexto no mesmo ficheiro. */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AFILIADO_FILTRO_TODOS_VALUE } from "../../../components/FiltroAfiliadoSelect";
import { useDashboardCatalogos } from "../../../hooks/useDashboardCatalogos";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getMesesDisponiveis, getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";

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
  /** Catálogo de afiliados — vazio até integração de dados. */
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
  const [isLoading, setIsLoadingState] = useState(false);
  const setIsLoading = useCallback((v: boolean) => {
    setIsLoadingState(v);
  }, []);

  const { operadoras } = useDashboardCatalogos();
  const operadorasList = useMemo(
    () => operadoras.filter((o) => podeVerOperadora(o.slug)),
    [operadoras, podeVerOperadora],
  );

  /** Placeholder até a integração de métricas de afiliados. */
  const afiliadoOptions = useMemo(() => [] as { id: string; nome: string }[], []);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

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
      afiliadoOptions,
      idxInicial,
      mesSelecionado,
      isPrimeiro,
      isUltimo,
      irMesAnterior,
      irMesProximo,
      toggleHistorico,
      isLoading,
      setIsLoading,
    }),
    [
      mesesDisponiveis,
      idxMes,
      historico,
      filtroAfiliado,
      filtroOperadora,
      operadorasList,
      afiliadoOptions,
      idxInicial,
      mesSelecionado,
      isPrimeiro,
      isUltimo,
      irMesAnterior,
      irMesProximo,
      toggleHistorico,
      isLoading,
      setIsLoading,
    ],
  );

  return <AfiliadosFiltrosCtx.Provider value={value}>{children}</AfiliadosFiltrosCtx.Provider>;
}
