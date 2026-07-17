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
import { INFLUENCER_FILTRO_TODOS_VALUE } from "../../../components/FiltroInfluencerSelect";
import { useDashboardCatalogos } from "../../../hooks/useDashboardCatalogos";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getMesesDisponiveis, getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";
import {
  buildInfluencerFilterOptions,
  fetchInfluencerIdsComDadosNoPeriodo,
  periodoStreamersFiltro,
} from "./streamersInfluencerFilterHelpers";

export type MesRef = { ano: number; mes: number; label: string };

export type StreamersFiltrosContextValue = {
  mesesDisponiveis: MesRef[];
  idxMes: number;
  setIdxMes: Dispatch<SetStateAction<number>>;
  historico: boolean;
  setHistorico: Dispatch<SetStateAction<boolean>>;
  filtroInfluencer: string;
  setFiltroInfluencer: Dispatch<SetStateAction<string>>;
  filtroOperadora: string;
  setFiltroOperadora: Dispatch<SetStateAction<string>>;
  operadorasList: { slug: string; nome: string }[];
  operadoraInfMap: Record<string, string[]>;
  influencerOptions: { id: string; nome: string }[];
  idxInicial: number;
  mesSelecionado: MesRef | undefined;
  isPrimeiro: boolean;
  isUltimo: boolean;
  irMesAnterior: () => void;
  irMesProximo: () => void;
  toggleHistorico: () => void;
  /** True enquanto a aba ativa (Overview / Conversão / Financeiro) está a carregar dados. */
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
};

const StreamersFiltrosCtx = createContext<StreamersFiltrosContextValue | null>(null);

export function useStreamersFiltrosOptional(): StreamersFiltrosContextValue | null {
  return useContext(StreamersFiltrosCtx);
}

export function useStreamersFiltros(): StreamersFiltrosContextValue {
  const v = useContext(StreamersFiltrosCtx);
  if (!v) throw new Error("useStreamersFiltros deve ser usado dentro de StreamersFiltrosProvider");
  return v;
}

export function StreamersFiltrosProvider({ children }: { children: ReactNode }) {
  const { podeVerInfluencer, operadoraSlugsForcado, escoposVisiveis } = useDashboardFiltros();
  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [filtroInfluencer, setFiltroInfluencer] = useState(INFLUENCER_FILTRO_TODOS_VALUE);
  const [filtroOperadora, setFiltroOperadora] = useState("todas");
  const [influencerOptions, setInfluencerOptions] = useState<{ id: string; nome: string }[]>([]);
  const [isLoading, setIsLoadingState] = useState(false);
  const setIsLoading = useCallback((v: boolean) => {
    setIsLoadingState(v);
  }, []);

  const {
    perfis,
    operadoras: operadorasList,
    operadoraInfluencers: operadoraInfMap,
  } = useDashboardCatalogos();

  const mesSelecionado = mesesDisponiveis[idxMes];

  useEffect(() => {
    let cancel = false;
    const periodo = periodoStreamersFiltro(historico, mesSelecionado);
    if (!periodo || perfis.length === 0) {
      setInfluencerOptions([]);
      return;
    }

    (async () => {
      try {
        const idsComDados = await fetchInfluencerIdsComDadosNoPeriodo({
          inicio: periodo.inicio,
          fim: periodo.fim,
          filtroOperadora,
          operadoraSlugsForcado,
          podeVerInfluencer,
        });
        if (cancel) return;
        setInfluencerOptions(buildInfluencerFilterOptions(perfis, idsComDados, podeVerInfluencer));
      } catch (err) {
        console.error("[StreamersFiltros] influencer options", err);
        if (!cancel) setInfluencerOptions([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [
    perfis,
    historico,
    mesSelecionado,
    filtroOperadora,
    operadoraSlugsForcado,
    podeVerInfluencer,
    escoposVisiveis.influencersVisiveis,
  ]);

  useEffect(() => {
    if (
      filtroInfluencer !== INFLUENCER_FILTRO_TODOS_VALUE &&
      influencerOptions.length > 0 &&
      !influencerOptions.some((o) => o.id === filtroInfluencer)
    ) {
      setFiltroInfluencer(INFLUENCER_FILTRO_TODOS_VALUE);
    }
  }, [filtroInfluencer, influencerOptions]);

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
      filtroInfluencer,
      setFiltroInfluencer,
      filtroOperadora,
      setFiltroOperadora,
      operadorasList,
      operadoraInfMap,
      influencerOptions,
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
      filtroInfluencer,
      filtroOperadora,
      operadorasList,
      operadoraInfMap,
      influencerOptions,
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

  return <StreamersFiltrosCtx.Provider value={value}>{children}</StreamersFiltrosCtx.Provider>;
}
