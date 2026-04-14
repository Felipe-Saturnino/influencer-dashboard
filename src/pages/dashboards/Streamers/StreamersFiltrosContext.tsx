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
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { getMesesDisponiveis } from "../../../lib/dashboardHelpers";
import { supabase } from "../../../lib/supabase";

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
  const { podeVerInfluencer } = useDashboardFiltros();
  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = useMemo(() => new Date(), []);
  const idxInicial = useMemo(() => {
    const i = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());
    return i >= 0 ? i : mesesDisponiveis.length - 1;
  }, [mesesDisponiveis, hoje]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [filtroInfluencer, setFiltroInfluencer] = useState("todos");
  const [filtroOperadora, setFiltroOperadora] = useState("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});
  const [influencerOptions, setInfluencerOptions] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [{ data: perfisData }, { data: opsData }, { data: infOpsData }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico").order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      if (cancel) return;
      const map: Record<string, string[]> = {};
      (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
        if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
        map[o.operadora_slug].push(o.influencer_id);
      });
      setOperadoraInfMap(map);
      setOperadorasList(opsData || []);
      const opts = (perfisData || [])
        .filter((p: { id: string }) => podeVerInfluencer(p.id))
        .map((p: { id: string; nome_artistico: string }) => ({ id: p.id, nome: p.nome_artistico }));
      setInfluencerOptions(opts.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    })();
    return () => {
      cancel = true;
    };
  }, [podeVerInfluencer]);

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
    ]
  );

  return <StreamersFiltrosCtx.Provider value={value}>{children}</StreamersFiltrosCtx.Provider>;
}
