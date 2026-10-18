import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { useStreamersFiltrosOptional } from "../StreamersFiltrosContext";
import { useApp } from "../../../../context/AppContext";
import { useDashboardFiltros } from "../../../../hooks/useDashboardFiltros";
import { useDashboardCatalogos } from "../../../../hooks/useDashboardCatalogos";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { usePermission } from "../../../../hooks/usePermission";
import { FONT } from "../../../../constants/theme";
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../../lib/carouselNavStyles";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../../lib/pageContentBoxStyles";
import { fetchInfluencerAnalyticsPeriodoCached } from "../../../../lib/influencerAnalyticsQuery";
import { fetchJogadoresRegistrosUnicos, fetchJogadoresUapSpin } from "../../../../lib/jogadoresAbaQuery";
import {
  aplicarRegistrosUnicosPorInfluencer,
  uapSpinJogadoresAba,
  type JogadorUapSpinFact,
} from "../../../../lib/jogadoresAbaMetrics";
import { buscarInvestimentoPago, filtrosInvestimentoPorEscopo } from "../../../../lib/investimentoPago";
import {
  BRAND,
  MSG_SEM_DADOS_FILTRO,
  MSG_SEM_DADOS_PERIODO,
  STATUS_ORDEM,
  type StatusLabel,
} from "../../../../lib/dashboardConstants";
import {
  fmtBRL,
  fmtHorasTotal,
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
  getStatusROI,
} from "../../../../lib/dashboardHelpers";
import {
  SectionTitle,
  KpiCard,
  KpiCardDuplo,
  KpiCardDepositos,
  FunilVisual,
  FiltroHistoricoButton,
  FiltroInfluencerSelect,
  FiltroOperadoraSelect,
  SkeletonKpiCard,
  SortTableTh,
  type SortDir,
} from "../../../../components/dashboard";
import { useDataTableBlock } from "../../../../hooks/useDataTableBlock";
import { getDataTableWrapStyle, getDataTableStyle } from "../../../../lib/dataTableStyles";
import { TabelaPaginacaoBar } from "../../../../components/TabelaPaginacaoBar";
import { slicePage, TABELA_PAGE_SIZE_STREAMERS } from "../../../../lib/tablePagination";
import { MSG_ERRO_STREAMERS, streamersInfluencerIdsQuery, streamersOperadoraSlugsQuery, travarRecortePropriosStreamers } from "../streamersInfluencerFilterHelpers";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Metrica {
  influencer_id: string;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  visit_count: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_total: number;
  ggr: number;
  data: string;
}

interface InfluencerPerfil {
  id: string;
  nome_artistico: string;
  cache_hora: number;
  status: string | null;
}

interface LiveData {
  id: string;
  influencer_id: string;
  status: string;
  plataforma: string;
  data: string;
}

interface LiveResultado {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
}

type RankingSortCol =
  | "nome"
  | "views"
  | "acessos"
  | "registros"
  | "ggr"
  | "investimento"
  | "roi"
  | "ftds"
  | "lives"
  | "horas";

interface RankingRow {
  influencer_id: string;
  nome: string;
  lives: number;
  horas: number;
  views: number;
  viewsTotal: number;
  liveComViews: number;
  acessos: number;
  registros: number;
  ftds: number;
  depositos_qtd: number;
  depositos_valor: number;
  ggr: number;
  investimento: number;
  roi: number | null;
  plataformas: string[];
  statusLabel: StatusLabel;
  perfilStatus: string | null;
}

interface TotaisData {
  ggr: number; investimento: number; roi: number;
  ftds: number; registros: number; acessos: number; views: number;
  custoPorFTD: number; custoPorRegistro: number;
  lives: number; horas: number; influencersAtivos: number; influencersInativos: number;
  depositos_qtd: number; depositos_valor: number;
}

const TOTAIS_VAZIOS: TotaisData = {
  ggr: 0,
  investimento: 0,
  roi: 0,
  ftds: 0,
  registros: 0,
  acessos: 0,
  views: 0,
  custoPorFTD: 0,
  custoPorRegistro: 0,
  lives: 0,
  horas: 0,
  influencersAtivos: 0,
  influencersInativos: 0,
  depositos_qtd: 0,
  depositos_valor: 0,
};

// ─── HELPERS (calculaTotais específico do Overview) ───────────────────────────
function calculaTotais(rows: RankingRow[], totalInvestimento?: number): TotaisData {
  const ggr           = rows.reduce((s, r) => s + r.ggr, 0);
  const invest        = totalInvestimento ?? rows.reduce((s, r) => s + r.investimento, 0);
  const ftds          = rows.reduce((s, r) => s + r.ftds, 0);
  const registros     = rows.reduce((s, r) => s + r.registros, 0);
  const acessos       = rows.reduce((s, r) => s + r.acessos, 0);
  const views         = rows.reduce((s, r) => s + r.views, 0);
  const lives         = rows.reduce((s, r) => s + r.lives, 0);
  const horas         = rows.reduce((s, r) => s + r.horas, 0);
  const depositos_qtd   = rows.reduce((s, r) => s + r.depositos_qtd, 0);
  const depositos_valor = rows.reduce((s, r) => s + r.depositos_valor, 0);
  const influencersComLive = rows.filter((r) => r.lives > 0);
  const influencersInativos = influencersComLive.filter((r) => {
    const status = (r.perfilStatus ?? "ativo").toLowerCase();
    return status === "inativo" || status === "cancelado";
  }).length;
  const influencersAtivos = influencersComLive.length - influencersInativos;
  return {
    ggr, investimento: invest, roi: invest > 0 ? ((ggr - invest) / invest) * 100 : 0,
    ftds, registros, acessos, views, lives, horas, influencersAtivos, influencersInativos,
    depositos_qtd, depositos_valor,
    custoPorFTD: ftds > 0 ? invest / ftds : 0,
    custoPorRegistro: registros > 0 ? invest / registros : 0,
  };
}

/** Chave numérica para ordenar a coluna Performance em todas as linhas (não só quem tem investimento e ROI%). */
function performanceSortValue(row: RankingRow): number {
  if (row.roi !== null) return row.roi;
  if (row.investimento === 0) {
    if (row.ggr > 0) return 1e9;
    if (row.ggr < 0) return row.ggr;
    return -1e9;
  }
  return 0;
}

function RankingThSort({
  col,
  label,
  sortRanking,
  setSortRanking,
  thStyle,
}: {
  col: RankingSortCol;
  label: string;
  sortRanking: { col: RankingSortCol; dir: SortDir };
  setSortRanking: Dispatch<SetStateAction<{ col: RankingSortCol; dir: SortDir }>>;
  thStyle: React.CSSProperties;
}) {
  return (
    <SortTableTh
      col={col}
      label={label}
      sortCol={sortRanking.col}
      sortDir={sortRanking.dir}
      thStyle={thStyle}
      align="center"
      onSort={(c) =>
        setSortRanking((s) => ({
          col: c,
          dir: s.col === c && s.dir === "desc" ? "asc" : "desc",
        }))
      }
    />
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("streamers");
  const sf = useStreamersFiltrosOptional();
  const embed = sf !== null;
  const {
    perfis,
    operadoras,
    isPending: catalogosPending,
    error: catalogosError,
  } = useDashboardCatalogos();
  const operadorasListStandalone = useMemo(
    () => operadoras.filter((o) => podeVerOperadora(o.slug)),
    [operadoras, podeVerOperadora],
  );

  const mesesDisponiveisLocal = useMemo(() => getMesesDisponiveis(), []);
  const idxStartLocal = getIdxMesCarrosselPadrao(mesesDisponiveisLocal);

  const [idxMesLocal, setIdxMesLocal] = useState(idxStartLocal);
  const [historicoLocal, setHistoricoLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [momPronto, setMomPronto] = useState(false);
  const [pageRanking, setPageRanking] = useState(0);

  const [filtroInfluencerLocal, setFiltroInfluencerLocal] = useState<string>("todos");
  const [filtroOperadoraLocal, setFiltroOperadoraLocal] = useState<string>("todas");

  const mesesDisponiveis = embed ? sf.mesesDisponiveis : mesesDisponiveisLocal;
  const idxMes = embed ? sf.idxMes : idxMesLocal;
  const setIdxMes = embed ? sf.setIdxMes : setIdxMesLocal;
  const historico = embed ? sf.historico : historicoLocal;
  const setHistorico = embed ? sf.setHistorico : setHistoricoLocal;
  const filtroInfluencer = embed ? sf.filtroInfluencer : filtroInfluencerLocal;
  const setFiltroInfluencer = embed ? sf.setFiltroInfluencer : setFiltroInfluencerLocal;
  const filtroOperadora = embed ? sf.filtroOperadora : filtroOperadoraLocal;
  const setFiltroOperadora = embed ? sf.setFiltroOperadora : setFiltroOperadoraLocal;
  const operadorasList = embed ? sf.operadorasList : operadorasListStandalone;
  const idxInicial = embed ? sf.idxInicial : idxStartLocal;

  const operadoraSlugParaApi = operadoraSlugsForcado?.[0] ?? (filtroOperadora !== "todas" ? filtroOperadora : undefined);
  const [statusFiltro, setStatusFiltro]         = useState<StatusLabel | null>(null);
  const [sortRanking, setSortRanking]           = useState<{ col: RankingSortCol; dir: "asc" | "desc" }>({ col: "ggr", dir: "desc" });

  const [ranking, setRanking]     = useState<RankingRow[]>([]);
  const [rankingAnt, setRankingAnt] = useState<RankingRow[]>([]);
  const [jogadoresUap, setJogadoresUap] = useState<JogadorUapSpinFact[]>([]);
  const [jogadoresUapAnt, setJogadoresUapAnt] = useState<JogadorUapSpinFact[]>([]);
  const [totais, setTotais]       = useState<TotaisData>(TOTAIS_VAZIOS);
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>(TOTAIS_VAZIOS);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial);
    } else setHistorico(true);
  }

  useEffect(() => {
    if (!embed || !sf) return;
    sf.setIsLoading(loading);
  }, [embed, sf, loading]);

  useEffect(() => {
    if (!embed || !sf) return;
    sf.setMomPronto(historico || momPronto);
  }, [embed, sf, historico, momPronto]);

  // ── BUSCA: fase 1 = período atual; fase 2 = MoM em background ────────────────
  useEffect(() => {
    if (catalogosPending) return;
    if (catalogosError) {
      console.error("[StreamersOverview] catálogos:", catalogosError);
      setErroCarga(MSG_ERRO_STREAMERS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function carregar() {
      setLoading(true);
      setErroCarga(null);
      setMomPronto(false);
      setRankingAnt([]);
      setJogadoresUapAnt([]);
      setTotaisAnt(TOTAIS_VAZIOS);

      const perfisLista: InfluencerPerfil[] = perfis;
      let operadoraSlugsQuery = streamersOperadoraSlugsQuery(filtroOperadora, escoposVisiveis, operadoraSlugsForcado);
      const catalogInfluencerIds = perfisLista.map((p) => p.id);
      let influencerIdsQuery = streamersInfluencerIdsQuery(filtroInfluencer, escoposVisiveis, catalogInfluencerIds);
      if (perm.canView === "proprios") {
        const travado = travarRecortePropriosStreamers(
          { influencerIds: influencerIdsQuery, operadoraSlugs: operadoraSlugsQuery },
          escoposVisiveis,
        );
        influencerIdsQuery = travado.influencerIds;
        operadoraSlugsQuery = travado.operadoraSlugs;
      }

      function montaRanking(m: Metrica[], l: LiveData[], r: LiveResultado[], investimentoPorInf: Record<string, number>): RankingRow[] {
        const mapa = new Map<string, RankingRow>();
        m.forEach((met) => {
          if (!mapa.has(met.influencer_id)) {
            const p = perfisLista.find((x) => x.id === met.influencer_id);
            if (!p) return;
            mapa.set(met.influencer_id, { influencer_id: met.influencer_id, nome: p.nome_artistico, lives: 0, horas: 0, views: 0, viewsTotal: 0, liveComViews: 0, acessos: 0, registros: 0, ftds: 0, depositos_qtd: 0, depositos_valor: 0, ggr: 0, investimento: 0, roi: null, plataformas: [], statusLabel: "Sem dados", perfilStatus: p.status });
          }
          const row = mapa.get(met.influencer_id)!;
          row.acessos        += met.visit_count || 0;
          row.registros      += met.registration_count || 0;
          row.ftds           += met.ftd_count || 0;
          row.depositos_qtd  += met.deposit_count || 0;
          row.depositos_valor += met.deposit_total || 0;
          row.ggr            += met.ggr || 0;
        });
        l.forEach((live) => {
          if (!mapa.has(live.influencer_id)) {
            const p = perfisLista.find((x) => x.id === live.influencer_id);
            if (!p) return;
            mapa.set(live.influencer_id, { influencer_id: live.influencer_id, nome: p.nome_artistico, lives: 0, horas: 0, views: 0, viewsTotal: 0, liveComViews: 0, acessos: 0, registros: 0, ftds: 0, depositos_qtd: 0, depositos_valor: 0, ggr: 0, investimento: 0, roi: null, plataformas: [], statusLabel: "Sem dados", perfilStatus: p.status });
          }
          const row = mapa.get(live.influencer_id)!;
          row.lives += 1;
          if (!row.plataformas.includes(live.plataforma)) row.plataformas.push(live.plataforma);
          const res = r.find((x) => x.live_id === live.id);
          if (res) {
            row.horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
            if (res.media_views) { row.viewsTotal += res.media_views; row.liveComViews += 1; }
          }
        });
        mapa.forEach((row) => {
          row.investimento = investimentoPorInf[row.influencer_id] ?? 0;
          row.roi = row.investimento > 0 ? ((row.ggr - row.investimento) / row.investimento) * 100 : null;
          row.statusLabel = getStatusROI(row.roi, row.ggr, row.investimento).label;
          row.views = row.liveComViews > 0 ? Math.round(row.viewsTotal / row.liveComViews) : 0;
        });
        return Array.from(mapa.values()).sort((a, b) => {
          const ia = STATUS_ORDEM.indexOf(a.statusLabel);
          const ib = STATUS_ORDEM.indexOf(b.statusLabel);
          if (ia !== ib) return ia - ib;
          return (b.roi ?? b.ggr) - (a.roi ?? a.ggr);
        });
      }

      try {
        let metricas: Metrica[] = [], lives: LiveData[] = [], resultados: LiveResultado[] = [];
        let periodo: { inicio: string; fim: string };
        let mom: ReturnType<typeof getPeriodoComparativoMoM> | null = null;
        if (historico) {
          periodo = getPeriodoHistoricoCompetencias();
        } else {
          mom = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
          periodo = mom.atual;
        }

        const filtrosInvest = {
          ...filtrosInvestimentoPorEscopo(
            {
              semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo,
              vêTodosInfluencers: escoposVisiveis.vêTodosInfluencers,
              influencersVisiveis: escoposVisiveis.influencersVisiveis,
            },
            { operadora_slug: operadoraSlugParaApi, filtroInfluencer }
          ),
          influencerIds: influencerIdsQuery,
        };

        const operadoraSlugParaAliases =
          operadoraSlugParaApi ?? undefined;
        const aliasesPromise = historico
          ? import("../../../../lib/metricasAliases").then(({ buscarMetricasDeAliases }) =>
              buscarMetricasDeAliases({
                operadora_slug: operadoraSlugParaAliases,
                influencerIds: influencerIdsQuery,
                dataInicio: periodo.inicio,
                dataFim: periodo.fim,
              }),
            )
          : Promise.resolve([]);

        const [analytics, investimentoPago, registrosUnicos, jogadoresDoPeriodo, aliasesSinteticas] =
          await Promise.all([
            fetchInfluencerAnalyticsPeriodoCached({
              inicio: periodo.inicio,
              fim: periodo.fim,
              operadoraSlugs: operadoraSlugsQuery,
              influencerIds: influencerIdsQuery,
            }),
            buscarInvestimentoPago(periodo, filtrosInvest),
            fetchJogadoresRegistrosUnicos({
              inicio: periodo.inicio,
              fim: periodo.fim,
              operadoraSlugs: operadoraSlugsQuery,
              influencerIds: influencerIdsQuery,
            }),
            fetchJogadoresUapSpin({
              inicio: periodo.inicio,
              fim: periodo.fim,
              operadoraSlugs: operadoraSlugsQuery,
              influencerIds: influencerIdsQuery,
            }),
            aliasesPromise,
          ]);

        if (historico) {
          const { mesclarMetricasComAliases } = await import("../../../../lib/metricasAliases");
          metricas = mesclarMetricasComAliases(
            analytics.metricas,
            aliasesSinteticas,
            periodo.fim,
            podeVerInfluencer,
          );
          lives = analytics.lives;
          resultados = analytics.resultados;
        } else {
          metricas = analytics.metricas;
          lives = analytics.lives;
          resultados = analytics.resultados;
        }
        if (cancelled) return;
        const rows = aplicarRegistrosUnicosPorInfluencer(
          montaRanking(metricas, lives, resultados, investimentoPago.porInfluencer),
          registrosUnicos.porInfluencer,
        );
        const rowsVisiveis = rows.filter((r) => podeVerInfluencer(r.influencer_id));
        setRanking(rowsVisiveis);
        setJogadoresUap(jogadoresDoPeriodo);
        setTotais(calculaTotais(rowsVisiveis, investimentoPago.total));
        setLoading(false);

        if (mom) {
          try {
            const periodoAnt = mom.anterior;
            const [investAnt, analyticsAnt, registrosUnicosAnt, jogadoresDoPeriodoAnt] = await Promise.all([
              buscarInvestimentoPago(periodoAnt, filtrosInvest),
              fetchInfluencerAnalyticsPeriodoCached({
                inicio: periodoAnt.inicio,
                fim: periodoAnt.fim,
                operadoraSlugs: operadoraSlugsQuery,
                influencerIds: influencerIdsQuery,
              }),
              fetchJogadoresRegistrosUnicos({
                inicio: periodoAnt.inicio,
                fim: periodoAnt.fim,
                operadoraSlugs: operadoraSlugsQuery,
                influencerIds: influencerIdsQuery,
              }),
              fetchJogadoresUapSpin({
                inicio: periodoAnt.inicio,
                fim: periodoAnt.fim,
                operadoraSlugs: operadoraSlugsQuery,
                influencerIds: influencerIdsQuery,
              }),
            ]);
            if (cancelled) return;
            const rowsAnt = aplicarRegistrosUnicosPorInfluencer(
              montaRanking(
                analyticsAnt.metricas,
                analyticsAnt.lives,
                analyticsAnt.resultados,
                investAnt.porInfluencer,
              ),
              registrosUnicosAnt.porInfluencer,
            ).filter((r) => podeVerInfluencer(r.influencer_id));
            setRankingAnt(rowsAnt);
            setJogadoresUapAnt(jogadoresDoPeriodoAnt);
            setTotaisAnt(calculaTotais(rowsAnt, investAnt.total));
            setMomPronto(true);
          } catch (errMom) {
            console.error("[StreamersOverview] MoM:", errMom);
            if (!cancelled) setMomPronto(false);
          }
        }
      } catch (err) {
        console.error("[StreamersOverview] carga:", err);
        if (!cancelled) {
          setErroCarga(MSG_ERRO_STREAMERS);
          setRanking([]);
          setJogadoresUap([]);
          setTotais(TOTAIS_VAZIOS);
          setLoading(false);
        }
      }
    }
    void carregar();
    return () => {
      cancelled = true;
    };
  }, [
    catalogosPending,
    catalogosError,
    escoposVisiveis,
    filtroInfluencer,
    historico,
    idxMes,
    mesSelecionado,
    podeVerInfluencer,
    perm.canView,
    filtroOperadora,
    operadoraSlugsForcado,
    operadoraSlugParaApi,
    perfis,
    reloadTick,
  ]);

  const rankingBaseFiltro = useMemo(() => {
    let r = ranking;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    // SQL já filtra por operadora_slug — não refiltrar pela junction.
    return r;
  }, [ranking, filtroInfluencer]);

  const rankingFiltrado = useMemo(() => {
    let r = rankingBaseFiltro;
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [rankingBaseFiltro, statusFiltro]);

  const rankingOrdenado = useMemo(() => {
    const list = [...rankingFiltrado];
    const { col, dir } = sortRanking;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let primary = 0;
      switch (col) {
        case "nome":
          primary = mul * a.nome.localeCompare(b.nome, "pt-BR");
          break;
        case "roi": {
          const va = performanceSortValue(a);
          const vb = performanceSortValue(b);
          primary = mul * (va - vb);
          break;
        }
        default: {
          const va = Number(a[col as keyof RankingRow]) || 0;
          const vb = Number(b[col as keyof RankingRow]) || 0;
          primary = mul * (va - vb);
        }
      }
      if (primary !== 0) return primary;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return list;
  }, [rankingFiltrado, sortRanking]);

  const rankingPaginado = useMemo(
    () => slicePage(rankingOrdenado, pageRanking, TABELA_PAGE_SIZE_STREAMERS),
    [rankingOrdenado, pageRanking],
  );

  useEffect(() => {
    setPageRanking(0);
  }, [rankingFiltrado, sortRanking, statusFiltro, historico, idxMes, filtroInfluencer, filtroOperadora]);

  const rankingAntFiltrado = useMemo(() => {
    let r = rankingAnt;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [rankingAnt, filtroInfluencer, statusFiltro]);

  // Totais exibidos nos KPIs e Funil (respeitam filtros de influencer/operadora/status)
  // Com filtro por influencer: desconsiderar Agentes (soma só das rows). Sem filtro: usar totais (inclui Agentes)
  const totaisExibidos = useMemo(() => {
    const totalInvest = filtroInfluencer === "todos" ? totais.investimento : undefined;
    return calculaTotais(rankingFiltrado, totalInvest);
  }, [rankingFiltrado, filtroInfluencer, totais.investimento]);
  const totaisAntExibidos = useMemo(() => {
    const totalAnt = filtroInfluencer === "todos" ? totaisAnt.investimento : undefined;
    return calculaTotais(rankingAntFiltrado, totalAnt);
  }, [rankingAntFiltrado, filtroInfluencer, totaisAnt.investimento]);
  const uapSpinExibido = useMemo(() => {
    const ids = statusFiltro
      ? new Set(rankingFiltrado.map((row) => row.influencer_id))
      : null;
    return uapSpinJogadoresAba(jogadoresUap, ids);
  }, [jogadoresUap, rankingFiltrado, statusFiltro]);
  const uapSpinAntExibido = useMemo(() => {
    const ids = statusFiltro
      ? new Set(rankingAntFiltrado.map((row) => row.influencer_id))
      : null;
    return uapSpinJogadoresAba(jogadoresUapAnt, ids);
  }, [jogadoresUapAnt, rankingAntFiltrado, statusFiltro]);

  const semDadosPeriodo = !loading && !erroCarga && rankingBaseFiltro.length === 0;

  // ── TAXAS DO FUNIL ────────────────────────────────────────────────────────────
  const pctViewAcesso  = totaisExibidos.views > 0    ? ((totaisExibidos.acessos   / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg   = totaisExibidos.acessos > 0  ? ((totaisExibidos.registros / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctRegFTD      = totaisExibidos.registros > 0? ((totaisExibidos.ftds      / totaisExibidos.registros)* 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD   = totaisExibidos.acessos > 0  ? ((totaisExibidos.ftds      / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctViewFTD     = totaisExibidos.views > 0    ? ((totaisExibidos.ftds      / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";

  const brand = useDashboardBrand();

  // ── ESTILOS BASE ──────────────────────────────────────────────────────────────
  const card = getPageContentBoxStyle(brand, t);

  const dataTable = useDataTableBlock();

  // ── STATUS BADGES ─────────────────────────────────────────────────────────────
  const statusBadges = [
    { label: "Rentável"    as StatusLabel, cor: BRAND.verde,    bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.28)"    },
    { label: "Atenção"     as StatusLabel, cor: BRAND.amarelo,  bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.28)"   },
    { label: "Não Rentável"as StatusLabel, cor: BRAND.vermelho, bg: "rgba(232,64,37,0.10)",   border: "rgba(232,64,37,0.28)"    },
    { label: "Bônus"       as StatusLabel, cor: "#a855f7",      bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.28)"   },
    { label: "Sem dados"   as StatusLabel, cor: "#6b7280",      bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)"  },
  ];

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar esta página.
      </div>
    );
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {!embed && (
      <div style={getPageFilterBoxStyle(brand, t)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label="Mês anterior"
              style={getCarouselBtnNavStyle(t, historico || idxMes === 0)}
              onClick={irMesAnterior}
              disabled={historico || idxMes === 0}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>

            <span style={getCarouselPeriodLabelStyle(t)}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>

            <button
              type="button"
              aria-label="Próximo mês"
              style={getCarouselBtnNavStyle(t, historico || idxMes === mesesDisponiveis.length - 1)}
              onClick={irMesProximo}
              disabled={historico || idxMes === mesesDisponiveis.length - 1}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <FiltroHistoricoButton active={historico} onClick={toggleHistorico} />

            {showFiltroInfluencer && (
              <FiltroInfluencerSelect
                mode="single"
                value={filtroInfluencer}
                onChange={setFiltroInfluencer}
                influencers={[...ranking]
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((r) => ({ id: r.influencer_id, name: r.nome }))}
              />
            )}

            {showFiltroOperadora && (
              <FiltroOperadoraSelect
                value={filtroOperadora}
                onChange={setFiltroOperadora}
                operadoras={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} aria-hidden />
                Carregando…
              </span>
            )}
          </div>
      </div>
      )}

      {erroCarga ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            ...card,
            color: "#e84025",
            fontSize: 13,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{erroCarga}</span>
          <button
            type="button"
            onClick={() => setReloadTick((n) => n + 1)}
            style={{
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "transparent",
              color: "#e84025",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      ) : (
      <>
      {/* ══ BLOCO 2: KPIs EXECUTIVOS ══════════════════════════════════════════ */}
      <div style={card}>
        <SectionTitle
          sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Executivos
        </SectionTitle>

        {loading ? (
          <>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              {[0, 1, 2].map((i) => <SkeletonKpiCard key={i} />)}
            </div>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              {[0, 1, 2].map((i) => <SkeletonKpiCard key={`op-${i}`} />)}
            </div>
            <div className="app-grid-kpi-3">
              {[0, 1, 2].map((i) => <SkeletonKpiCard key={`cv-${i}`} />)}
            </div>
          </>
        ) : semDadosPeriodo ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>{MSG_SEM_DADOS_PERIODO}</div>
        ) : (
          <>
            <div
              style={{
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Financeiro
            </div>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              <KpiCard label="GGR" value={fmtBRL(totaisExibidos.ggr)} icon={<TrendingUp size={16} aria-hidden />} accentColor={totaisExibidos.ggr >= 0 ? BRAND.verde : BRAND.vermelho} atual={totaisExibidos.ggr} anterior={totaisAntExibidos.ggr} isBRL isHistorico={historico || !momPronto} />
              <KpiCard label="Investimento" value={fmtBRL(totaisExibidos.investimento)} icon={<Coins size={16} aria-hidden />} accentVar="--brand-contrast" accentColor={BRAND.custo} atual={totaisExibidos.investimento} anterior={totaisAntExibidos.investimento} isBRL isHistorico={historico || !momPronto} />
              <KpiCard label="ROI" value={totaisExibidos.investimento > 0 ? `${totaisExibidos.roi >= 0 ? "+" : ""}${totaisExibidos.roi.toFixed(1)}%` : "—"} icon={<BarChart2 size={16} aria-hidden />} accentColor={totaisExibidos.investimento > 0 ? (totaisExibidos.roi >= 0 ? BRAND.verde : BRAND.vermelho) : BRAND.verde} atual={totaisExibidos.roi} anterior={totaisAntExibidos.roi} isHistorico={historico || !momPronto} />
            </div>

            <div
              style={{
                borderTop: `1px solid ${t.cardBorder}`,
                margin: "16px 0 12px",
                paddingTop: 12,
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Operação
            </div>
            <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
              <KpiCardDuplo
                label="Influencers"
                icon={<Users size={16} aria-hidden />}
                accentVar="--brand-icon-color"
                accentColor={BRAND.operacao}
                esquerdo={{
                  label: "Ativos",
                  valor: totaisExibidos.influencersAtivos,
                  anterior: totaisAntExibidos.influencersAtivos,
                  exibicao: totaisExibidos.influencersAtivos.toLocaleString("pt-BR"),
                }}
                direito={{
                  label: "Inativos",
                  valor: totaisExibidos.influencersInativos,
                  anterior: totaisAntExibidos.influencersInativos,
                  exibicao: totaisExibidos.influencersInativos.toLocaleString("pt-BR"),
                  isInverso: true,
                }}
                isHistorico={historico || !momPronto}
              />
              <KpiCardDuplo
                label="Lives"
                icon={<Video size={16} aria-hidden />}
                accentVar="--brand-contrast"
                accentColor={BRAND.operacao}
                esquerdo={{
                  label: "Qtd",
                  valor: totaisExibidos.lives,
                  anterior: totaisAntExibidos.lives,
                  exibicao: totaisExibidos.lives.toLocaleString("pt-BR"),
                }}
                direito={{
                  label: "Horas",
                  valor: totaisExibidos.horas,
                  anterior: totaisAntExibidos.horas,
                  exibicao: fmtHorasTotal(totaisExibidos.horas),
                }}
                isHistorico={historico || !momPronto}
              />
              <KpiCardDepositos atual={{ qtd: totaisExibidos.depositos_qtd, valor: totaisExibidos.depositos_valor }} anterior={{ qtd: totaisAntExibidos.depositos_qtd, valor: totaisAntExibidos.depositos_valor }} isHistorico={historico || !momPronto} />
            </div>

            <div
              style={{
                borderTop: `1px solid ${t.cardBorder}`,
                margin: "16px 0 12px",
                paddingTop: 12,
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Conversão
            </div>
            <div className="app-grid-kpi-3">
              <KpiCardDuplo
                label="Registros"
                icon={<UserPlus size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.transacao}
                esquerdo={{
                  label: "Qtd",
                  valor: totaisExibidos.registros,
                  anterior: totaisAntExibidos.registros,
                  exibicao: totaisExibidos.registros.toLocaleString("pt-BR"),
                }}
                direito={{
                  label: "Custo Médio",
                  valor: totaisExibidos.custoPorRegistro,
                  anterior: totaisAntExibidos.custoPorRegistro,
                  exibicao: totaisExibidos.registros > 0 ? fmtBRL(totaisExibidos.custoPorRegistro) : "—",
                  isInverso: true,
                }}
                isHistorico={historico || !momPronto}
              />
              <KpiCardDuplo
                label="FTDs"
                icon={<Trophy size={16} aria-hidden />}
                accentVar="--brand-action"
                accentColor={BRAND.transacao}
                esquerdo={{
                  label: "Qtd",
                  valor: totaisExibidos.ftds,
                  anterior: totaisAntExibidos.ftds,
                  exibicao: totaisExibidos.ftds.toLocaleString("pt-BR"),
                }}
                direito={{
                  label: "Custo Médio",
                  valor: totaisExibidos.custoPorFTD,
                  anterior: totaisAntExibidos.custoPorFTD,
                  exibicao: totaisExibidos.ftds > 0 ? fmtBRL(totaisExibidos.custoPorFTD) : "—",
                  isInverso: true,
                }}
                isHistorico={historico || !momPronto}
              />
              <KpiCardDuplo
                label="UAP Spin"
                icon={<Users size={16} aria-hidden />}
                accentColor={BRAND.verde}
                esquerdo={{
                  label: "Qtd",
                  valor: uapSpinExibido.uap,
                  anterior: uapSpinAntExibido.uap,
                  exibicao: uapSpinExibido.uap.toLocaleString("pt-BR"),
                }}
                direito={{
                  label: "Rodadas",
                  valor: uapSpinExibido.rodadas,
                  anterior: uapSpinAntExibido.rodadas,
                  exibicao: uapSpinExibido.rodadas.toLocaleString("pt-BR"),
                }}
                isHistorico={historico || !momPronto}
              />
            </div>
          </>
        )}
      </div>

      {/* ══ BLOCO 3: Funil de Conversão ════════════════════════════════════ */}
      <div style={card}>
        <SectionTitle sub={historico ? "acumulado" : undefined}>
          Funil de Conversão
        </SectionTitle>
        {semDadosPeriodo ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted }}>{MSG_SEM_DADOS_PERIODO}</div>
        ) : (
          <FunilVisual
            values={[totaisExibidos.views, totaisExibidos.acessos, totaisExibidos.registros, totaisExibidos.ftds]}
            taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]}
          />
        )}
      </div>

      {/* ══ BLOCO 4: RANKING ═════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <SectionTitle sub={historico ? "acumulado" : undefined}>
            Ranking de Influencers
          </SectionTitle>

          {/* Filtros de status */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {statusBadges.map((s) => {
              const ativo = statusFiltro === s.label;
              const qtd = rankingBaseFiltro.filter((r) => r.statusLabel === s.label).length;
              return (
                <button
                  type="button"
                  key={s.label}
                  aria-pressed={ativo}
                  onClick={() => setStatusFiltro(ativo ? null : s.label)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                    fontFamily: FONT.body,
                    border: `1px solid ${ativo ? s.cor : s.border}`,
                    background: ativo ? s.bg : "transparent",
                    color: ativo ? s.cor : t.textMuted,
                    fontSize: 11, fontWeight: ativo ? 700 : 400,
                    transition: "all 0.15s",
                    opacity: qtd === 0 ? 0.35 : 1,
                  }}
                >
                  {s.label} {qtd > 0 && <span style={{ opacity: 0.7 }}>({qtd})</span>}
                </button>
              );
            })}
            {statusFiltro && (
              <button
                type="button"
                aria-label="Limpar filtro de status"
                onClick={() => setStatusFiltro(null)}
                style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}
              >
                <X size={11} aria-hidden /> Limpar
              </button>
            )}
          </div>
        </div>

        {statusFiltro && (
          <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Exibindo <strong style={{ color: t.text }}>{rankingFiltrado.length}</strong> influencer{rankingFiltrado.length !== 1 ? "s" : ""} com status <strong style={{ color: t.text }}>{statusFiltro}</strong>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando…</div>
        ) : rankingFiltrado.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>
            {rankingBaseFiltro.length === 0 ? MSG_SEM_DADOS_PERIODO : MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <>
          <div className="app-table-wrap" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: 640 })}>
              <caption style={{ display: "none" }}>
                Ranking de influencers — {historico ? "Todo o período" : (mesSelecionado?.label ?? "Período")}
              </caption>
              <thead>
                <tr>
                  <RankingThSort col="nome" label="Influencer" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="lives" label="Lives" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="horas" label="Horas" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="views" label="Views" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="acessos" label="Acessos" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="registros" label="Registros" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ftds" label="FTDs" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="ggr" label="GGR" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="investimento" label="Investimento" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                  <RankingThSort col="roi" label="Performance" sortRanking={sortRanking} setSortRanking={setSortRanking} thStyle={dataTable.thHeader} />
                </tr>
              </thead>
              <tbody>
                {rankingPaginado.map((r, i) => {
                  const st = getStatusROI(r.roi, r.ggr, r.investimento);
                  const hT = Math.floor(r.horas);
                  const mT = Math.round((r.horas - hT) * 60);
                  return (
                    <tr
                      key={r.influencer_id}
                      style={{ background: dataTable.zebraRow(i) }}
                    >
                      <td
                        style={{
                          ...dataTable.tdCenter,
                          fontWeight: 600,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.nome}
                      >
                        {r.nome}
                      </td>
                      <td style={dataTable.tdCenter}>{r.lives}</td>
                      <td style={dataTable.tdCenter}>{r.horas > 0 ? `${String(hT).padStart(2,"0")}:${String(mT).padStart(2,"0")}` : "—"}</td>
                      <td style={dataTable.tdCenter}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={dataTable.tdCenter}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={dataTable.tdCenter}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={{ ...dataTable.tdCenter, color: r.ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(r.ggr)}</td>
                      <td style={dataTable.tdCenter}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={dataTable.tdCenter}>
                        <span style={{
                          padding: "4px 10px", borderRadius: 999,
                          border: `1px solid ${st.border}`,
                          background: st.bg, color: st.cor,
                          fontSize: 11, fontFamily: FONT.body, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}>
                          {st.label}
                          {r.roi !== null && (
                            <span style={{ opacity: 0.8 }}>
                              ({r.roi >= 0 ? "+" : ""}{r.roi.toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TabelaPaginacaoBar
            t={t}
            page={pageRanking}
            pageSize={TABELA_PAGE_SIZE_STREAMERS}
            totalItems={rankingOrdenado.length}
            onPageChange={setPageRanking}
          />
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
}
