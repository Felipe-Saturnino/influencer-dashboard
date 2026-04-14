import { useState, useEffect, useMemo } from "react";
import { useStreamersFiltrosOptional } from "../StreamersFiltrosContext";
import { useApp } from "../../../../context/AppContext";
import { useDashboardFiltros } from "../../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { usePermission } from "../../../../hooks/usePermission";
import { FONT } from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../../lib/supabasePaginate";
import { buscarInvestimentoPago, filtrosInvestimentoPorEscopo } from "../../../../lib/investimentoPago";
import {
  BRAND,
  MSG_SEM_DADOS_FILTRO,
  STATUS_ORDEM,
  type StatusLabel,
} from "../../../../lib/dashboardConstants";
import {
  fmt,
  fmtBRL,
  fmtHorasTotal,
  getMesesDisponiveis,
  getPeriodoComparativoMoM,
  getStatusROI,
} from "../../../../lib/dashboardHelpers";
import {
  SectionTitle,
  KpiCard,
  KpiCardDepositos,
  FunilVisual,
  SelectComIcone,
} from "../../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe } from "../../../../lib/tableStyles";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
} from "lucide-react";
import {
  GiPokerHand,
  GiCoins,
  GiTrophy,
  GiFilmProjector,
  GiSandsOfTime,
  GiMicrophone,
  GiPlayerNext,
  GiReceiveMoney,
  GiPayMoney,
  GiCalendar,
  GiStarMedal,
  GiShield,
} from "react-icons/gi";

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
}

interface LiveData {
  id: string;
  influencer_id: string;
  status: string;
  plataforma: string;
  data: string;
}

async function fetchMetricasHistoricoPaginado(
  filtroOperadora: string,
  operadoraSlugsForcado: string[] | null | undefined
): Promise<Metrica[]> {
  const slugs = operadoraSlugsForcado ?? undefined;
  return fetchAllPages(async (from, to) => {
    let qM = supabase
      .from("influencer_metricas")
      .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data")
      .order("data", { ascending: true })
      .order("influencer_id", { ascending: true })
      .order("operadora_slug", { ascending: true })
      .range(from, to);
    if (slugs?.length) qM = qM.in("operadora_slug", slugs);
    else if (filtroOperadora !== "todas") qM = qM.eq("operadora_slug", filtroOperadora);
    return qM;
  });
}

async function fetchLivesHistoricoPaginado(operadoraSlugsForcado: string[] | null | undefined): Promise<LiveData[]> {
  const slugs = operadoraSlugsForcado ?? undefined;
  return fetchAllPages(async (from, to) => {
    let qL = supabase
      .from("lives")
      .select("id, influencer_id, status, plataforma, data")
      .eq("status", "realizada")
      .order("data", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (slugs?.length) qL = qL.in("operadora_slug", slugs);
    return qL;
  });
}

interface LiveResultado {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
}

type RankingSortCol = "ggr" | "investimento" | "roi" | "ftds" | "lives" | "horas";

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
}

interface TotaisData {
  ggr: number; investimento: number; roi: number;
  ftds: number; registros: number; acessos: number; views: number;
  custoPorFTD: number; custoPorRegistro: number;
  lives: number; horas: number; influencers: number;
  depositos_qtd: number; depositos_valor: number;
}

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
  const influencers   = rows.filter((r) => r.lives > 0).length;
  return {
    ggr, investimento: invest, roi: invest > 0 ? ((ggr - invest) / invest) * 100 : 0,
    ftds, registros, acessos, views, lives, horas, influencers,
    depositos_qtd, depositos_valor,
    custoPorFTD: ftds > 0 ? invest / ftds : 0,
    custoPorRegistro: registros > 0 ? invest / registros : 0,
  };
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("streamers");
  const sf = useStreamersFiltrosOptional();
  const embed = sf !== null;

  const mesesDisponiveisLocal = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicialLocal =
    mesesDisponiveisLocal.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());
  const idxStartLocal = idxInicialLocal >= 0 ? idxInicialLocal : mesesDisponiveisLocal.length - 1;

  const [idxMesLocal, setIdxMesLocal] = useState(idxStartLocal);
  const [historicoLocal, setHistoricoLocal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filtroInfluencerLocal, setFiltroInfluencerLocal] = useState<string>("todos");
  const [filtroOperadoraLocal, setFiltroOperadoraLocal] = useState<string>("todas");
  const [operadorasListLocal, setOperadorasListLocal] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMapLocal, setOperadoraInfMapLocal] = useState<Record<string, string[]>>({});

  const mesesDisponiveis = embed ? sf.mesesDisponiveis : mesesDisponiveisLocal;
  const idxMes = embed ? sf.idxMes : idxMesLocal;
  const setIdxMes = embed ? sf.setIdxMes : setIdxMesLocal;
  const historico = embed ? sf.historico : historicoLocal;
  const setHistorico = embed ? sf.setHistorico : setHistoricoLocal;
  const filtroInfluencer = embed ? sf.filtroInfluencer : filtroInfluencerLocal;
  const setFiltroInfluencer = embed ? sf.setFiltroInfluencer : setFiltroInfluencerLocal;
  const filtroOperadora = embed ? sf.filtroOperadora : filtroOperadoraLocal;
  const setFiltroOperadora = embed ? sf.setFiltroOperadora : setFiltroOperadoraLocal;
  const operadorasList = embed ? sf.operadorasList : operadorasListLocal;
  const operadoraInfMap = embed ? sf.operadoraInfMap : operadoraInfMapLocal;
  const idxInicial = embed ? sf.idxInicial : idxStartLocal;

  const operadoraSlugParaApi = operadoraSlugsForcado?.[0] ?? (filtroOperadora !== "todas" ? filtroOperadora : undefined);
  const [statusFiltro, setStatusFiltro]         = useState<StatusLabel | null>(null);
  const [sortRanking, setSortRanking]           = useState<{ col: RankingSortCol; dir: "asc" | "desc" }>({ col: "ggr", dir: "desc" });

  const [, setPerfis]       = useState<InfluencerPerfil[]>([]);
  const [ranking, setRanking]     = useState<RankingRow[]>([]);
  const [rankingAnt, setRankingAnt] = useState<RankingRow[]>([]);
  const [totais, setTotais]       = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });

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

  // ── BUSCA DE DADOS (idêntica ao original) ────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      let perfisLista: InfluencerPerfil[] = [];

      if (!embed) {
        const [{ data: perfisData }, { data: opsData }, { data: infOpsData }] = await Promise.all([
          supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico"),
          supabase.from("operadoras").select("slug, nome").order("nome"),
          supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
        ]);
        perfisLista = perfisData || [];
        setPerfis(perfisLista);
        setOperadorasListLocal(opsData || []);
        const map: Record<string, string[]> = {};
        (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
          if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
          map[o.operadora_slug].push(o.influencer_id);
        });
        setOperadoraInfMapLocal(map);
      } else {
        const { data: perfisData } = await supabase
          .from("influencer_perfil")
          .select("id, nome_artistico, cache_hora")
          .order("nome_artistico");
        perfisLista = perfisData || [];
        setPerfis(perfisLista);
      }

      async function buscaMetricas(ini: string, fim: string, incluirAliases = false): Promise<Metrica[]> {
        let q = supabase.from("influencer_metricas")
          .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data")
          .gte("data", ini).lte("data", fim);
        if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
        else if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
        const { data } = await q;
        const metricas = data || [];
        if (!incluirAliases) return metricas;
        const { buscarMetricasDeAliases, mesclarMetricasComAliases } = await import("../../../../lib/metricasAliases");
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: operadoraSlugParaApi,
          dataInicio: ini,
          dataFim: fim,
        });
        return mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
      }

      async function buscaLives(ini: string, fim: string): Promise<LiveData[]> {
        let q = supabase.from("lives").select("id, influencer_id, status, plataforma, data").eq("status", "realizada").gte("data", ini).lte("data", fim);
        if (operadoraSlugsForcado?.length) q = q.in("operadora_slug", operadoraSlugsForcado);
        const { data } = await q;
        return data || [];
      }

      async function buscaResultados(lives: LiveData[]): Promise<LiveResultado[]> {
        const ids = lives.map((l) => l.id);
        return fetchLiveResultadosBatched<LiveResultado>(ids, async (slice) =>
          await supabase
            .from("live_resultados")
            .select("live_id, duracao_horas, duracao_min, media_views")
            .in("live_id", slice)
        );
      }

      function montaRanking(m: Metrica[], l: LiveData[], r: LiveResultado[], investimentoPorInf: Record<string, number>): RankingRow[] {
        const mapa = new Map<string, RankingRow>();
        m.forEach((met) => {
          if (!mapa.has(met.influencer_id)) {
            const p = perfisLista.find((x) => x.id === met.influencer_id);
            if (!p) return;
            mapa.set(met.influencer_id, { influencer_id: met.influencer_id, nome: p.nome_artistico, lives: 0, horas: 0, views: 0, viewsTotal: 0, liveComViews: 0, acessos: 0, registros: 0, ftds: 0, depositos_qtd: 0, depositos_valor: 0, ggr: 0, investimento: 0, roi: null, plataformas: [], statusLabel: "Sem dados" });
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
            mapa.set(live.influencer_id, { influencer_id: live.influencer_id, nome: p.nome_artistico, lives: 0, horas: 0, views: 0, viewsTotal: 0, liveComViews: 0, acessos: 0, registros: 0, ftds: 0, depositos_qtd: 0, depositos_valor: 0, ggr: 0, investimento: 0, roi: null, plataformas: [], statusLabel: "Sem dados" });
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

      let metricas: Metrica[] = [], lives: LiveData[] = [], resultados: LiveResultado[] = [];
      let periodo: { inicio: string; fim: string };
      let mom: ReturnType<typeof getPeriodoComparativoMoM> | null = null;
      if (historico) {
        periodo = { inicio: "2020-01-01", fim: fmt(new Date()) };
        const mRaw = await fetchMetricasHistoricoPaginado(filtroOperadora, operadoraSlugsForcado);
        const { buscarMetricasDeAliases, mesclarMetricasComAliases } = await import("../../../../lib/metricasAliases");
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: operadoraSlugParaApi,
          dataInicio: periodo.inicio,
          dataFim: periodo.fim,
        });
        metricas = mesclarMetricasComAliases(mRaw, aliasesSinteticas, periodo.fim, podeVerInfluencer);
        lives = await fetchLivesHistoricoPaginado(operadoraSlugsForcado);
        resultados = await buscaResultados(lives);
      } else {
        mom = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
        periodo = mom.atual;
        metricas   = await buscaMetricas(periodo.inicio, periodo.fim, false);
        lives      = await buscaLives(periodo.inicio, periodo.fim);
        resultados = await buscaResultados(lives);
      }

      const investimentoPago = await buscarInvestimentoPago(
        periodo,
        filtrosInvestimentoPorEscopo(
          {
            semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo,
            vêTodosInfluencers: escoposVisiveis.vêTodosInfluencers,
            influencersVisiveis: escoposVisiveis.influencersVisiveis,
          },
          { operadora_slug: operadoraSlugParaApi, filtroInfluencer }
        )
      );
      const rows = montaRanking(metricas, lives, resultados, investimentoPago.porInfluencer);
      const rowsVisiveis = rows.filter((r) => podeVerInfluencer(r.influencer_id));
      setRanking(rowsVisiveis);
      setTotais(calculaTotais(rowsVisiveis, investimentoPago.total));

      if (mom) {
        const periodoAnt = mom.anterior;
        const [investAnt, mA, lA] = await Promise.all([
          buscarInvestimentoPago(
            periodoAnt,
            filtrosInvestimentoPorEscopo(
              {
                semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo,
                vêTodosInfluencers: escoposVisiveis.vêTodosInfluencers,
                influencersVisiveis: escoposVisiveis.influencersVisiveis,
              },
              { operadora_slug: operadoraSlugParaApi, filtroInfluencer }
            )
          ),
          buscaMetricas(periodoAnt.inicio, periodoAnt.fim, false),
          buscaLives(periodoAnt.inicio, periodoAnt.fim),
        ]);
        const rA = await buscaResultados(lA);
        const rowsAnt = montaRanking(mA, lA, rA, investAnt.porInfluencer).filter((r) => podeVerInfluencer(r.influencer_id));
        setRankingAnt(rowsAnt);
        setTotaisAnt(calculaTotais(rowsAnt, investAnt.total));
      } else {
        setRankingAnt([]);
        setTotaisAnt({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
      }

      setLoading(false);
    }
    carregar();
  }, [embed, escoposVisiveis, filtroInfluencer, historico, idxMes, mesSelecionado, podeVerInfluencer, filtroOperadora, operadoraSlugsForcado, operadoraSlugParaApi]);

  const idsOperadoraEfetiva = useMemo(() => {
    if (operadoraSlugsForcado?.length) {
      const set = new Set<string>();
      operadoraSlugsForcado.forEach(slug => (operadoraInfMap[slug] ?? []).forEach(id => set.add(id)));
      return set;
    }
    if (filtroOperadora !== "todas") return new Set(operadoraInfMap[filtroOperadora] ?? []);
    return null;
  }, [operadoraSlugsForcado, filtroOperadora, operadoraInfMap]);

  const rankingBaseFiltro = useMemo(() => {
    let r = ranking;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (idsOperadoraEfetiva) r = r.filter((row) => idsOperadoraEfetiva.has(row.influencer_id));
    return r;
  }, [ranking, filtroInfluencer, idsOperadoraEfetiva]);

  const rankingFiltrado = useMemo(() => {
    let r = rankingBaseFiltro;
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [rankingBaseFiltro, statusFiltro]);

  const rankingOrdenado = useMemo(() => {
    const list = [...rankingFiltrado];
    const { col, dir } = sortRanking;
    list.sort((a, b) => {
      const va = (a[col] ?? 0) as number;
      const vb = (b[col] ?? 0) as number;
      const primary = dir === "desc" ? vb - va : va - vb;
      if (primary !== 0) return primary;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return list;
  }, [rankingFiltrado, sortRanking]);

  const rankingAntFiltrado = useMemo(() => {
    let r = rankingAnt;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (idsOperadoraEfetiva) r = r.filter((row) => idsOperadoraEfetiva.has(row.influencer_id));
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [rankingAnt, filtroInfluencer, idsOperadoraEfetiva, statusFiltro]);

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

  // ── TAXAS DO FUNIL ────────────────────────────────────────────────────────────
  const pctViewAcesso  = totaisExibidos.views > 0    ? ((totaisExibidos.acessos   / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg   = totaisExibidos.acessos > 0  ? ((totaisExibidos.registros / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctRegFTD      = totaisExibidos.registros > 0? ((totaisExibidos.ftds      / totaisExibidos.registros)* 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD   = totaisExibidos.acessos > 0  ? ((totaisExibidos.ftds      / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctViewFTD     = totaisExibidos.views > 0    ? ((totaisExibidos.ftds      / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";

  const brand = useDashboardBrand();

  // ── ESTILOS BASE ──────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const thStyle = getThStyle(t);
  const tdStyle = getTdStyle(t);

  function ThRankingSort({ col, label }: { col: RankingSortCol; label: string }) {
    const ativo = sortRanking.col === col;
    return (
      <th
        scope="col"
        onClick={() =>
          setSortRanking((s) => ({
            col,
            dir: s.col === col && s.dir === "desc" ? "asc" : "desc",
          }))
        }
        style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
        aria-sort={ativo ? (sortRanking.dir === "desc" ? "descending" : "ascending") : "none"}
      >
        {label}
        <span style={{ marginLeft: 4, display: "inline-flex", alignItems: "center", opacity: ativo ? 1 : 0.3 }} aria-hidden>
          {ativo
            ? sortRanking.dir === "desc"
              ? <ChevronDown size={11} aria-hidden />
              : <ChevronUp size={11} aria-hidden />
            : <ChevronsUpDown size={11} aria-hidden />}
        </span>
      </th>
    );
  }

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
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const btnNavStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {!embed && (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label="Mês anterior"
              style={{ ...btnNavStyle, opacity: historico || idxMes === 0 ? 0.35 : 1, cursor: historico || idxMes === 0 ? "not-allowed" : "pointer" }}
              onClick={irMesAnterior}
              disabled={historico || idxMes === 0}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>

            <span style={{
              fontSize: 18, fontWeight: 800,
              color: t.text,
              fontFamily: FONT.body,
              minWidth: 180, textAlign: "center",
            }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>

            <button
              type="button"
              aria-label="Próximo mês"
              style={{ ...btnNavStyle, opacity: historico || idxMes === mesesDisponiveis.length - 1 ? 0.35 : 1, cursor: historico || idxMes === mesesDisponiveis.length - 1 ? "not-allowed" : "pointer" }}
              onClick={irMesProximo}
              disabled={historico || idxMes === mesesDisponiveis.length - 1}
            >
              <ChevronRight size={14} aria-hidden />
            </button>

            <button
              type="button"
              aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"}
              aria-pressed={historico}
              onClick={toggleHistorico}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico
                  ? `1px solid ${brand.accent}`
                  : `1px solid ${t.cardBorder}`,
                background: historico
                  ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : "rgba(124,58,237,0.15)")
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} aria-hidden />
              Histórico
            </button>

            {showFiltroInfluencer && (
              <SelectComIcone
                icon={<GiStarMedal size={15} aria-hidden />}
                label="Filtrar por influencer"
                value={filtroInfluencer}
                onChange={setFiltroInfluencer}
              >
                <option value="todos">Todos os influencers</option>
                {[...ranking].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((r) => (
                  <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                ))}
              </SelectComIcone>
            )}

            {showFiltroOperadora && (
              <SelectComIcone
                icon={<GiShield size={15} aria-hidden />}
                label="Filtrar por operadora"
                value={filtroOperadora}
                onChange={setFiltroOperadora}
              >
                <option value="todas">Todas as operadoras</option>
                {operadorasList
                  .filter((o) => podeVerOperadora(o.slug))
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((o) => (
                    <option key={o.slug} value={o.slug}>{o.nome}</option>
                  ))}
              </SelectComIcone>
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} aria-hidden /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ══ BLOCO 2: KPIs EXECUTIVOS ══════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle
          icon={<GiPokerHand size={15} aria-hidden />}
          sub={historico ? "acumulado" : "· comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Executivos
        </SectionTitle>

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
          <KpiCard label="GGR Total" value={fmtBRL(totaisExibidos.ggr)} icon={<GiPokerHand size={16} aria-hidden />} accentVar="--brand-primary" accentColor={BRAND.receita} atual={totaisExibidos.ggr} anterior={totaisAntExibidos.ggr} isBRL isHistorico={historico} />
          <KpiCard label="Investimento" value={fmtBRL(totaisExibidos.investimento)} icon={<GiCoins size={16} aria-hidden />} accentColor={BRAND.custo} atual={totaisExibidos.investimento} anterior={totaisAntExibidos.investimento} isBRL isHistorico={historico} />
          <KpiCard label="ROI Geral" value={totaisExibidos.investimento > 0 ? `${totaisExibidos.roi >= 0 ? "+" : ""}${totaisExibidos.roi.toFixed(1)}%` : "—"} icon={<GiTrophy size={16} aria-hidden />} accentVar="--brand-primary" accentColor={BRAND.verde} atual={totaisExibidos.roi} anterior={totaisAntExibidos.roi} isHistorico={historico} />
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
        <div className="app-grid-kpi-4" style={{ marginBottom: 12 }}>
          <KpiCard label="Lives" value={totaisExibidos.lives.toLocaleString("pt-BR")} icon={<GiFilmProjector size={16} aria-hidden />} accentVar="--brand-icon" accentColor={BRAND.operacao} atual={totaisExibidos.lives} anterior={totaisAntExibidos.lives} isHistorico={historico} />
          <KpiCard label="Horas Realizadas" value={fmtHorasTotal(totaisExibidos.horas)} icon={<GiSandsOfTime size={16} aria-hidden />} accentVar="--brand-icon" accentColor={BRAND.operacao} atual={totaisExibidos.horas} anterior={totaisAntExibidos.horas} isHistorico={historico} />
          <KpiCard label="Influencers Ativos" value={totaisExibidos.influencers.toLocaleString("pt-BR")} icon={<GiMicrophone size={16} aria-hidden />} accentVar="--brand-icon" accentColor={BRAND.operacao} atual={totaisExibidos.influencers} anterior={totaisAntExibidos.influencers} isHistorico={historico} />
          <KpiCardDepositos atual={{ qtd: totaisExibidos.depositos_qtd, valor: totaisExibidos.depositos_valor }} anterior={{ qtd: totaisAntExibidos.depositos_qtd, valor: totaisAntExibidos.depositos_valor }} isHistorico={historico} />
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
        <div className="app-grid-kpi-4">
          <KpiCard label="Registros" value={totaisExibidos.registros.toLocaleString("pt-BR")} icon={<GiPlayerNext size={16} aria-hidden />} accentVar="--brand-accent" accentColor={BRAND.transacao} atual={totaisExibidos.registros} anterior={totaisAntExibidos.registros} isHistorico={historico} />
          <KpiCard label="Custo por Registro" value={totaisExibidos.registros > 0 ? fmtBRL(totaisExibidos.custoPorRegistro) : "—"} icon={<GiReceiveMoney size={16} aria-hidden />} accentColor={BRAND.custo} atual={totaisExibidos.custoPorRegistro} anterior={totaisAntExibidos.custoPorRegistro} isBRL isHistorico={historico} />
          <KpiCard label="FTDs" value={totaisExibidos.ftds.toLocaleString("pt-BR")} icon={<GiTrophy size={16} aria-hidden />} accentVar="--brand-accent" accentColor={BRAND.transacao} atual={totaisExibidos.ftds} anterior={totaisAntExibidos.ftds} isHistorico={historico} />
          <KpiCard label="Custo por FTD" value={totaisExibidos.ftds > 0 ? fmtBRL(totaisExibidos.custoPorFTD) : "—"} icon={<GiPayMoney size={16} aria-hidden />} accentColor={BRAND.custo} atual={totaisExibidos.custoPorFTD} anterior={totaisAntExibidos.custoPorFTD} isBRL isHistorico={historico} />
        </div>
      </div>

      {/* ══ BLOCO 3: Funil de Conversão ════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiPlayerNext size={15} aria-hidden />} sub={historico ? "acumulado" : undefined}>
          Funil de Conversão
        </SectionTitle>
        <FunilVisual
          values={[totaisExibidos.views, totaisExibidos.acessos, totaisExibidos.registros, totaisExibidos.ftds]}
          taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]}
        />
      </div>

      {/* ══ BLOCO 4: RANKING ═════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <SectionTitle icon={<GiTrophy size={15} aria-hidden />} sub={historico ? "acumulado" : undefined}>
            Ranking de Influencers
          </SectionTitle>

          {/* Filtros de status */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {statusBadges.map((s) => {
              const ativo = statusFiltro === s.label;
              const qtd = ranking.filter((r) => r.statusLabel === s.label).length;
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
                aria-label="Remover filtro de status"
                onClick={() => setStatusFiltro(null)}
                style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}
              >
                ✕ Limpar
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
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rankingFiltrado.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>{MSG_SEM_DADOS_FILTRO}</div>
        ) : (
          <div className="app-table-wrap">
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <caption style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                Ranking de influencers — {historico ? "Todo o período" : (mesSelecionado?.label ?? "Período")}
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>Influencer</th>
                  <ThRankingSort col="lives" label="Lives" />
                  <ThRankingSort col="horas" label="Horas" />
                  <th scope="col" style={thStyle}>Views</th>
                  <th scope="col" style={thStyle}>Acessos</th>
                  <th scope="col" style={thStyle}>Registros</th>
                  <ThRankingSort col="ftds" label="FTDs" />
                  <ThRankingSort col="ggr" label="GGR" />
                  <ThRankingSort col="investimento" label="Invest." />
                  <ThRankingSort col="roi" label="Performance" />
                </tr>
              </thead>
              <tbody>
                {rankingOrdenado.map((r, i) => {
                  const st = getStatusROI(r.roi, r.ggr, r.investimento);
                  const hT = Math.floor(r.horas);
                  const mT = Math.round((r.horas - hT) * 60);
                  return (
                    <tr
                      key={r.influencer_id}
                      style={{ background: zebraStripe(i) }}
                    >
                      <td
                        style={{
                          ...tdStyle,
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
                      <td style={tdStyle}>{r.lives}</td>
                      <td style={tdStyle}>{r.horas > 0 ? `${String(hT).padStart(2,"0")}:${String(mT).padStart(2,"0")}` : "—"}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={tdStyle}>
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
        )}
      </div>
    </div>
  );
}
