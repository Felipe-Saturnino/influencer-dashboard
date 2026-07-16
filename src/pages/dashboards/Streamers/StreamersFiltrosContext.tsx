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
import { useQuery } from "@tanstack/react-query";
import { INFLUENCER_FILTRO_TODOS_VALUE } from "../../../components/FiltroInfluencerSelect";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getMesesDisponiveis, getIdxMesCarrosselPadrao } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";
import {
  buildInfluencerFilterOptions,
  fetchInfluencerIdsComDadosNoPeriodo,
  periodoStreamersFiltro,
  type PerfilInfluencerMin,
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

  const catalogosQuery = useQuery({
    queryKey: ["streamers", "catalogos-filtros"],
    queryFn: async () => {
      const [perfisRes, opsRes, infOpsRes] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico").order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      if (perfisRes.error) throw perfisRes.error;
      if (opsRes.error) throw opsRes.error;
      if (infOpsRes.error) throw infOpsRes.error;
      return {
        perfis: (perfisRes.data ?? []) as PerfilInfluencerMin[],
        operadoras: opsRes.data ?? [],
        vinculos: infOpsRes.data ?? [],
      };
    },
    staleTime: 10 * 60 * 1000,
  });
  const perfis = useMemo(() => catalogosQuery.data?.perfis ?? [], [catalogosQuery.data?.perfis]);
  const operadorasList = useMemo(
    () => catalogosQuery.data?.operadoras ?? [],
    [catalogosQuery.data?.operadoras],
  );
  const operadoraInfMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const o of catalogosQuery.data?.vinculos ?? []) {
      if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
      map[o.operadora_slug]!.push(o.influencer_id);
    }
    return map;
  }, [catalogosQuery.data?.vinculos]);

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
