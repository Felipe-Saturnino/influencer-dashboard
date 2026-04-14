import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../lib/supabasePaginate";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import { buscarMetricasDeAliases, mesclarMetricasComAliases } from "../../../lib/metricasAliases";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import {
  fmt,
  fmtBRL,
  fmtHorasTotal,
  fmtDia,
  getMesesDisponiveis,
  getPeriodoComparativoMoM,
  isCarrosselMesCivilAtual,
} from "../../../lib/dashboardHelpers";
import {
  SectionTitle,
  KpiCard,
  FunilVisual,
  SelectComIcone,
  RateCard,
} from "../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe, TOTAL_ROW_BG } from "../../../lib/tableStyles";
import { ChevronLeft, ChevronRight, Clock, Table2, ChartColumnBig } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  GiPodiumWinner, GiFunnel, GiSpeedometer, GiCalendar,
  GiMoneyStack, GiTakeMyMoney, GiStarMedal, GiClapperboard,
  GiSandsOfTime, GiEyeball, GiPerson, GiTrophy,
  GiCash, GiShield, GiCardPlay,
} from "react-icons/gi";

const GiStarMedalFilter = GiStarMedal;
const fmtHoras = fmtHorasTotal;

const MESES_CURTOS_TAB = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** `YYYY-MM` → Jan/2026 (igual Mesas Spin / Detalhamento mensal). */
function fmtMesAnoCurtoInfluencer(ym: string): string {
  const [ys, ms] = ym.split("-");
  const mo = Number(ms);
  const y = Number(ys);
  if (!ys || !Number.isFinite(mo) || mo < 1 || mo > 12) return ym;
  return `${MESES_CURTOS_TAB[mo - 1]}/${y}`;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Metrica {
  influencer_id: string;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  visit_count: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count?: number;
  withdrawal_total: number;
  ggr: number;
  data: string;
  operadora_slug?: string | null;
}

interface LiveData {
  id: string;
  influencer_id: string;
  data: string;
  plataforma: string;
}

interface LiveResultado {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
  max_views?: number;
}

interface InfluencerPerfil {
  id: string;
  nome_artistico: string;
  cache_hora: number;
}

interface TotaisData {
  ggr: number; investimento: number; roi: number;
  ftds: number; ftd_total: number; registros: number; acessos: number; views: number;
  depositos_qtd: number; depositos_valor: number;
  saques_qtd: number; saques_valor: number;
  lives: number; horas: number;
}

interface DiaData {
  data: string; duracao: number; media_views: number; max_views: number;
  acessos: number; registros: number; ftd_count: number; ftd_total: number;
  deposit_count: number; deposit_total: number; withdrawal_count: number;
  withdrawal_total: number; ggr: number;
}

const PALETA_INFLUENCER_GRAFICO = [
  "var(--brand-primary, #7c3aed)",
  "var(--brand-accent, #1e36f8)",
  "var(--brand-icon, #70cae4)",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#a78bfa",
  "#14b8a6",
] as const;

type KpiComparativoInflKey =
  | "ggr"
  | "acessos"
  | "registros"
  | "ftd_count"
  | "ftd_total"
  | "deposit_count"
  | "deposit_total"
  | "withdrawal_count"
  | "withdrawal_total"
  | "duracao"
  | "media_views"
  | "max_views";

type KpiComparativoInflDef = {
  key: KpiComparativoInflKey;
  label: string;
  somavel: boolean;
  tipoGrafico: "barra" | "linha";
};

const KPIS_COMPARATIVO_INFLUENCER: KpiComparativoInflDef[] = [
  { key: "ggr", label: "GGR", somavel: true, tipoGrafico: "barra" },
  { key: "ftd_total", label: "R$ FTDs", somavel: true, tipoGrafico: "barra" },
  { key: "deposit_total", label: "R$ Depósitos", somavel: true, tipoGrafico: "barra" },
  { key: "withdrawal_total", label: "R$ Saques", somavel: true, tipoGrafico: "barra" },
  { key: "acessos", label: "Acessos", somavel: true, tipoGrafico: "barra" },
  { key: "registros", label: "Registros", somavel: true, tipoGrafico: "barra" },
  { key: "ftd_count", label: "# FTDs", somavel: true, tipoGrafico: "barra" },
  { key: "deposit_count", label: "# Depósitos", somavel: true, tipoGrafico: "barra" },
  { key: "withdrawal_count", label: "# Saques", somavel: true, tipoGrafico: "barra" },
  { key: "duracao", label: "Duração Live", somavel: true, tipoGrafico: "barra" },
  { key: "media_views", label: "Média Views", somavel: false, tipoGrafico: "linha" },
  { key: "max_views", label: "Máx Views", somavel: false, tipoGrafico: "linha" },
];

function emptyDiaData(dataIso: string): DiaData {
  return {
    data: dataIso,
    duracao: 0,
    media_views: 0,
    max_views: 0,
    acessos: 0,
    registros: 0,
    ftd_count: 0,
    ftd_total: 0,
    deposit_count: 0,
    deposit_total: 0,
    withdrawal_count: 0,
    withdrawal_total: 0,
    ggr: 0,
  };
}

function mergeLivesEmDia(
  alvo: DiaData,
  lives: LiveData[],
  resultados: LiveResultado[],
  dateStr: string,
  influencerId: string | null,
  podeVer: (id: string) => boolean,
): void {
  const viewsArr: number[] = [];
  for (const live of lives) {
    if (live.data !== dateStr || !podeVer(live.influencer_id)) continue;
    if (influencerId != null && live.influencer_id !== influencerId) continue;
    const res = resultados.find((r) => r.live_id === live.id);
    if (!res) continue;
    const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
    alvo.duracao += h;
    const media = Number(res.media_views) || 0;
    const pico =
      res.max_views != null && Number(res.max_views) > 0
        ? Number(res.max_views)
        : media > 0
          ? media
          : 0;
    if (media > 0) viewsArr.push(media);
    if (pico > 0) alvo.max_views = Math.max(alvo.max_views, pico);
  }
  if (viewsArr.length > 0) {
    alvo.media_views = Math.round(viewsArr.reduce((a, b) => a + b, 0) / viewsArr.length);
  }
}

/** Agrega métricas + lives num único dia, opcionalmente só de um influencer. */
function diaAgregadoParaGrafico(
  dateStr: string,
  metricas: Metrica[],
  lives: LiveData[],
  resultados: LiveResultado[],
  influencerId: string | null,
  podeVer: (id: string) => boolean,
): DiaData {
  const d = emptyDiaData(dateStr);
  for (const m of metricas) {
    if (m.data !== dateStr || !podeVer(m.influencer_id)) continue;
    if (influencerId != null && m.influencer_id !== influencerId) continue;
    d.acessos += m.visit_count || 0;
    d.registros += m.registration_count || 0;
    d.ftd_count += m.ftd_count || 0;
    d.ftd_total += m.ftd_total || 0;
    d.deposit_count += m.deposit_count || 0;
    d.deposit_total += m.deposit_total || 0;
    d.withdrawal_count += m.withdrawal_count || 0;
    d.withdrawal_total += m.withdrawal_total || 0;
    d.ggr += m.ggr || 0;
  }
  mergeLivesEmDia(d, lives, resultados, dateStr, influencerId, podeVer);
  return d;
}

/** Agrega um mês (YYYY-MM) por influencer (histórico). */
function mesPorInfluencerMap(
  ym: string,
  metricas: Metrica[],
  lives: LiveData[],
  resultados: LiveResultado[],
  podeVer: (id: string) => boolean,
): Map<string, DiaData> {
  const stub = `${ym}-01`;
  const map = new Map<string, DiaData>();
  for (const m of metricas) {
    if (m.data.slice(0, 7) !== ym || !podeVer(m.influencer_id)) continue;
    if (!map.has(m.influencer_id)) map.set(m.influencer_id, emptyDiaData(stub));
    const d = map.get(m.influencer_id)!;
    d.acessos += m.visit_count || 0;
    d.registros += m.registration_count || 0;
    d.ftd_count += m.ftd_count || 0;
    d.ftd_total += m.ftd_total || 0;
    d.deposit_count += m.deposit_count || 0;
    d.deposit_total += m.deposit_total || 0;
    d.withdrawal_count += m.withdrawal_count || 0;
    d.withdrawal_total += m.withdrawal_total || 0;
    d.ggr += m.ggr || 0;
  }
  const viewsPorMesInf = new Map<string, number[]>();
  for (const live of lives) {
    if (live.data.slice(0, 7) !== ym || !podeVer(live.influencer_id)) continue;
    const res = resultados.find((r) => r.live_id === live.id);
    if (!res) continue;
    if (!map.has(live.influencer_id)) map.set(live.influencer_id, emptyDiaData(stub));
    const d = map.get(live.influencer_id)!;
    const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
    d.duracao += h;
    const media = Number(res.media_views) || 0;
    const pico =
      res.max_views != null && Number(res.max_views) > 0
        ? Number(res.max_views)
        : media > 0
          ? media
          : 0;
    if (media > 0) {
      if (!viewsPorMesInf.has(live.influencer_id)) viewsPorMesInf.set(live.influencer_id, []);
      viewsPorMesInf.get(live.influencer_id)!.push(media);
    }
    if (pico > 0) d.max_views = Math.max(d.max_views, pico);
  }
  for (const [infId, arr] of viewsPorMesInf) {
    const cell = map.get(infId);
    if (cell && arr.length > 0) cell.media_views = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return map;
}

function pickKpiDiaData(d: DiaData, k: KpiComparativoInflKey): number | null {
  switch (k) {
    case "ggr":
      return d.ggr;
    case "acessos":
      return d.acessos;
    case "registros":
      return d.registros;
    case "ftd_count":
      return d.ftd_count;
    case "ftd_total":
      return d.ftd_total;
    case "deposit_count":
      return d.deposit_count;
    case "deposit_total":
      return d.deposit_total;
    case "withdrawal_count":
      return d.withdrawal_count;
    case "withdrawal_total":
      return d.withdrawal_total;
    case "duracao":
      return d.duracao;
    case "media_views":
      return d.media_views > 0 ? d.media_views : null;
    case "max_views":
      return d.max_views > 0 ? d.max_views : null;
    default:
      return null;
  }
}

function cel(v: number, isBRL = false) {
  if (v === 0 || (typeof v === "number" && isNaN(v))) return "—";
  return isBRL ? fmtBRL(v) : v.toLocaleString("pt-BR");
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverviewInfluencer() {
  const { theme: t, isDark, podeVerInfluencer, podeVerOperadora, escoposVisiveis } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora } = useDashboardFiltros();
  const perm = usePermission("dash_overview_influencer");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  const [totais, setTotais] = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, ftd_total: 0, registros: 0, acessos: 0, views: 0, depositos_qtd: 0, depositos_valor: 0, saques_qtd: 0, saques_valor: 0, lives: 0, horas: 0 });
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>(totais);
  const [diasData, setDiasData] = useState<DiaData[]>([]);
  const [metricasComparativo, setMetricasComparativo] = useState<Metrica[]>([]);
  const [livesComparativo, setLivesComparativo] = useState<LiveData[]>([]);
  const [liveResultadosComparativo, setLiveResultadosComparativo] = useState<LiveResultado[]>([]);
  const [modoVisualizacaoComparativo, setModoVisualizacaoComparativo] = useState<"tabela" | "grafico">("tabela");
  const [kpiGraficoComparativo, setKpiGraficoComparativo] = useState<KpiComparativoInflKey>("ggr");
  const [perfis, setPerfis] = useState<InfluencerPerfil[]>([]);
  const [influencersComDadosIds, setInfluencersComDadosIds] = useState<string[]>([]);
  const [filtroResetado, setFiltroResetado] = useState(false);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo() { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  const influencersVisiveis = useMemo(() => escoposVisiveis.influencersVisiveis.length === 0 ? [] : escoposVisiveis.influencersVisiveis, [escoposVisiveis.influencersVisiveis]);

  useEffect(() => {
    if (filtroInfluencer !== "todos" && influencersComDadosIds.length > 0 && !influencersComDadosIds.includes(filtroInfluencer)) {
      setFiltroInfluencer("todos");
      setFiltroResetado(true);
      const id = window.setTimeout(() => setFiltroResetado(false), 4000);
      return () => window.clearTimeout(id);
    }
  }, [filtroInfluencer, influencersComDadosIds]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setMetricasComparativo([]);
      setLivesComparativo([]);
      setLiveResultadosComparativo([]);

      const [{ data: perfisData }, { data: opsData }, { data: infOpsData }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      setPerfis(perfisData || []);
      const opsFiltradas = (opsData || []).filter(
        (o: { slug: string }) => podeVerOperadora(o.slug)
      );
      setOperadorasList(opsFiltradas);
      const map: Record<string, string[]> = {};
      (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
        if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
        map[o.operadora_slug].push(o.influencer_id);
      });
      setOperadoraInfMap(map);

      const mom =
        !historico && mesSelecionado
          ? getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes)
          : null;
      const { inicio, fim } = historico
        ? { inicio: "2020-01-01", fim: fmt(new Date()) }
        : mom!.atual;

      const infIdsFiltro = influencersVisiveis.length === 0 ? [] : influencersVisiveis;
      const infIds = filtroInfluencer !== "todos"
        ? [filtroInfluencer]
        : filtroOperadora !== "todas"
          ? (map[filtroOperadora] || []).filter((id) => infIdsFiltro.length === 0 || infIdsFiltro.includes(id))
          : infIdsFiltro;

      const infIdsQuery = infIds.length > 0 ? infIds : (perfisData || []).map((p: InfluencerPerfil) => p.id);

      async function buscaMetricas(ini: string, fim: string): Promise<Metrica[]> {
        return fetchAllPages(async (from, to) => {
          let q = supabase.from("influencer_metricas")
            .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data")
            .gte("data", ini).lte("data", fim)
            .order("data", { ascending: true })
            .order("influencer_id", { ascending: true })
            .order("operadora_slug", { ascending: true })
            .range(from, to);
          if (infIdsQuery.length > 0) q = q.in("influencer_id", infIdsQuery);
          if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
          return q;
        });
      }

      async function buscaLives(ini: string, fim: string): Promise<LiveData[]> {
        return fetchAllPages(async (from, to) => {
          let q = supabase.from("lives")
            .select("id, influencer_id, data, plataforma")
            .eq("status", "realizada").gte("data", ini).lte("data", fim)
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);
          if (infIdsQuery.length > 0) q = q.in("influencer_id", infIdsQuery);
          return q;
        });
      }

      async function buscaResultados(lives: LiveData[]) {
        const ids = lives.map((l) => l.id);
        return fetchLiveResultadosBatched<LiveResultado>(ids, async (slice) =>
          await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min, media_views, max_views").in("live_id", slice)
        );
      }

      let metricas = await buscaMetricas(inicio, fim);
      if (historico) {
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
          dataInicio: inicio,
          dataFim: fim,
        });
        metricas = mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
      }

      const lives = await buscaLives(inicio, fim);
      const resultados = await buscaResultados(lives);

      const rows = metricas.filter((m) => podeVerInfluencer(m.influencer_id));
      const liveRows = lives.filter((l) => podeVerInfluencer(l.influencer_id));

      // Investimento apenas de pagamentos com status PAGO (valores revisados no Financeiro)
      const { total: investTotal } = await buscarInvestimentoPago(
        { inicio, fim },
        {
          influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          includeAgentes: false,
        }
      );

      // Incluir influencers com métricas, lives OU aliases mapeados (caso só tenham tráfego via Gestão de Links)
      let idsComDados = [...new Set([...rows.map((m) => m.influencer_id), ...liveRows.map((l) => l.influencer_id)])];
      const aliasesMapeados = await fetchAllPages<{ influencer_id: string }>(async (from, to) =>
        supabase
          .from("utm_aliases")
          .select("influencer_id")
          .eq("status", "mapeado")
          .not("influencer_id", "is", null)
          .order("influencer_id", { ascending: true })
          .range(from, to)
      );
      const idsAliases = [...new Set(aliasesMapeados.map((a) => a.influencer_id).filter((id) => podeVerInfluencer(id)))];
      idsComDados = [...new Set([...idsComDados, ...idsAliases])];
      setInfluencersComDadosIds(idsComDados);

      function calcTotais(m: Metrica[], l: LiveData[], r: LiveResultado[], investimentoPago: number): TotaisData {
        const ggr = m.reduce((s, x) => s + (x.ggr || 0), 0);
        const ftds = m.reduce((s, x) => s + (x.ftd_count || 0), 0);
        const ftd_total = m.reduce((s, x) => s + (x.ftd_total || 0), 0);
        const registros = m.reduce((s, x) => s + (x.registration_count || 0), 0);
        const acessos = m.reduce((s, x) => s + (x.visit_count || 0), 0);
        const depositos_qtd = m.reduce((s, x) => s + (x.deposit_count || 0), 0);
        const depositos_valor = m.reduce((s, x) => s + (x.deposit_total || 0), 0);
        const saques_qtd = m.reduce((s, x) => s + (x.withdrawal_count || 0), 0);
        const saques_valor = m.reduce((s, x) => s + (x.withdrawal_total || 0), 0);

        let horas = 0;
        const viewsPorLive: number[] = [];
        l.forEach((live) => {
          const res = r.find((x) => x.live_id === live.id);
          if (res) {
            horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
            if (res.media_views) viewsPorLive.push(res.media_views);
          }
        });
        const views = viewsPorLive.length > 0 ? Math.round(viewsPorLive.reduce((a, b) => a + b, 0) / viewsPorLive.length) : 0;

        return {
          ggr, investimento: investimentoPago, roi: investimentoPago > 0 ? ((ggr - investimentoPago) / investimentoPago) * 100 : 0,
          ftds, ftd_total, registros, acessos, views,
          depositos_qtd, depositos_valor, saques_qtd, saques_valor,
          lives: l.length, horas,
        };
      }

      setTotais(calcTotais(rows, liveRows, resultados, investTotal));

      if (mom) {
        const { inicio: iA, fim: fA } = mom.anterior;
        const [investAnt, mA, lA] = await Promise.all([
          buscarInvestimentoPago(
            { inicio: iA, fim: fA },
            {
              influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
              operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
              includeAgentes: false,
            }
          ),
          buscaMetricas(iA, fA),
          buscaLives(iA, fA),
        ]);
        const rA = await buscaResultados(lA);
        const rowsA = mA.filter((m) => podeVerInfluencer(m.influencer_id));
        const liveA = lA.filter((l) => podeVerInfluencer(l.influencer_id));
        setTotaisAnt(calcTotais(rowsA, liveA, rA, investAnt.total));
      } else {
        setTotaisAnt({ ggr: 0, investimento: 0, roi: 0, ftds: 0, ftd_total: 0, registros: 0, acessos: 0, views: 0, depositos_qtd: 0, depositos_valor: 0, saques_qtd: 0, saques_valor: 0, lives: 0, horas: 0 });
      }

      // Bloco 5: Comparativo Mensal (histórico) ou Comparativo Diário (mês no carrossel)
      if (historico) {
        const ymSet = new Set<string>();
        rows.forEach((m) => ymSet.add(m.data.slice(0, 7)));
        liveRows.forEach((l) => ymSet.add(l.data.slice(0, 7)));
        const byYm: Record<string, DiaData> = {};
        for (const ym of ymSet) {
          byYm[ym] = {
            data: `${ym}-01`,
            duracao: 0,
            media_views: 0,
            max_views: 0,
            acessos: 0,
            registros: 0,
            ftd_count: 0,
            ftd_total: 0,
            deposit_count: 0,
            deposit_total: 0,
            withdrawal_count: 0,
            withdrawal_total: 0,
            ggr: 0,
          };
        }
        rows.forEach((m) => {
          const ym = m.data.slice(0, 7);
          if (!byYm[ym]) return;
          byYm[ym].acessos += m.visit_count || 0;
          byYm[ym].registros += m.registration_count || 0;
          byYm[ym].ftd_count += m.ftd_count || 0;
          byYm[ym].ftd_total += m.ftd_total || 0;
          byYm[ym].deposit_count += m.deposit_count || 0;
          byYm[ym].deposit_total += m.deposit_total || 0;
          byYm[ym].withdrawal_count += m.withdrawal_count || 0;
          byYm[ym].withdrawal_total += m.withdrawal_total || 0;
          byYm[ym].ggr += m.ggr || 0;
        });
        const viewsPorMes: Record<string, number[]> = {};
        liveRows.forEach((live) => {
          const ym = live.data.slice(0, 7);
          const res = resultados.find((r) => r.live_id === live.id);
          if (!res || !byYm[ym]) return;
          const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          byYm[ym].duracao += h;
          const media = Number(res.media_views) || 0;
          const pico =
            res.max_views != null && Number(res.max_views) > 0
              ? Number(res.max_views)
              : media > 0
                ? media
                : 0;
          if (media > 0) {
            if (!viewsPorMes[ym]) viewsPorMes[ym] = [];
            viewsPorMes[ym].push(media);
          }
          if (pico > 0) {
            byYm[ym].max_views = Math.max(byYm[ym].max_views, pico);
          }
        });
        Object.keys(viewsPorMes).forEach((ym) => {
          if (byYm[ym]) {
            const arr = viewsPorMes[ym];
            byYm[ym].media_views = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
          }
        });
        setDiasData(Object.values(byYm).sort((a, b) => b.data.localeCompare(a.data)));
      } else if (mesSelecionado) {
        const dias: Record<string, DiaData> = {};
        for (let d = new Date(mesSelecionado.ano, mesSelecionado.mes, 1); d <= new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0); d.setDate(d.getDate() + 1)) {
          const ds = fmt(d);
          dias[ds] = { data: ds, duracao: 0, media_views: 0, max_views: 0, acessos: 0, registros: 0, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 };
        }
        rows.forEach((m) => {
          if (!dias[m.data]) return;
          dias[m.data].acessos += m.visit_count || 0;
          dias[m.data].registros += m.registration_count || 0;
          dias[m.data].ftd_count += m.ftd_count || 0;
          dias[m.data].ftd_total += m.ftd_total || 0;
          dias[m.data].deposit_count += m.deposit_count || 0;
          dias[m.data].deposit_total += m.deposit_total || 0;
          dias[m.data].withdrawal_count += m.withdrawal_count || 0;
          dias[m.data].withdrawal_total += m.withdrawal_total || 0;
          dias[m.data].ggr += m.ggr || 0;
        });
        const viewsPorDia: Record<string, number[]> = {};
        liveRows.forEach((live) => {
          const res = resultados.find((r) => r.live_id === live.id);
          if (!res || !dias[live.data]) return;
          const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          dias[live.data].duracao += h;
          const media = Number(res.media_views) || 0;
          const pico =
            res.max_views != null && Number(res.max_views) > 0
              ? Number(res.max_views)
              : media > 0
                ? media
                : 0;
          if (media > 0) {
            if (!viewsPorDia[live.data]) viewsPorDia[live.data] = [];
            viewsPorDia[live.data].push(media);
          }
          if (pico > 0) {
            dias[live.data].max_views = Math.max(dias[live.data].max_views, pico);
          }
        });
        Object.keys(viewsPorDia).forEach((ds) => {
          if (dias[ds]) {
            const arr = viewsPorDia[ds];
            dias[ds].media_views = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
          }
        });
        setDiasData(Object.values(dias).sort((a, b) => b.data.localeCompare(a.data)));
      } else {
        setDiasData([]);
      }

      setMetricasComparativo(rows);
      setLivesComparativo(liveRows);
      setLiveResultadosComparativo(resultados);

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, filtroInfluencer, filtroOperadora, podeVerInfluencer, influencersVisiveis, escoposVisiveis.operadorasVisiveis, mesSelecionado]);

  /** Mês civil atual: só exibe dias até ontem (MTD “fechado”); meses passados = mês inteiro. */
  const diasDataComparativoExibicao = useMemo(() => {
    if (historico || !mesSelecionado) return diasData;
    if (!isCarrosselMesCivilAtual(mesSelecionado.ano, mesSelecionado.mes)) return diasData;
    const ontem = new Date();
    ontem.setHours(0, 0, 0, 0);
    ontem.setDate(ontem.getDate() - 1);
    const limite = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, "0")}-${String(ontem.getDate()).padStart(2, "0")}`;
    return diasData.filter((d) => d.data <= limite);
  }, [diasData, historico, mesSelecionado]);

  useEffect(() => {
    setModoVisualizacaoComparativo("tabela");
  }, [historico, filtroInfluencer, filtroOperadora, idxMes]);

  const kpiGraficoCompConfig = useMemo(
    () =>
      KPIS_COMPARATIVO_INFLUENCER.find((x) => x.key === kpiGraficoComparativo) ??
      KPIS_COMPARATIVO_INFLUENCER[0]!,
    [kpiGraficoComparativo],
  );

  const isBrlKpiComp = ["ggr", "ftd_total", "deposit_total", "withdrawal_total"].includes(kpiGraficoComparativo);

  const nomeInfluencer = useCallback(
    (id: string) => perfis.find((p) => p.id === id)?.nome_artistico ?? id,
    [perfis],
  );

  const { dadosGraficoComparativo, idsSeriesComparativo } = useMemo(() => {
    const k = kpiGraficoComparativo;
    if (diasDataComparativoExibicao.length === 0) {
      return { dadosGraficoComparativo: [] as Record<string, unknown>[], idsSeriesComparativo: [] as string[] };
    }

    const chrono = [...diasDataComparativoExibicao].reverse();
    const idSet = new Set<string>();
    const chartRows: Record<string, unknown>[] = [];

    for (const d of chrono) {
      const label = historico ? fmtMesAnoCurtoInfluencer(d.data.slice(0, 7)) : fmtDia(d.data);
      const periodKey = d.data.slice(0, 7);
      const tot = pickKpiDiaData(d, k);
      const base: Record<string, unknown> = { label, dataIso: d.data, Total: tot };

      if (filtroInfluencer === "todos") {
        base.tot = tot;
      } else if (!podeVerInfluencer(filtroInfluencer)) {
        chartRows.push(base);
        continue;
      } else {
        const cell = historico
          ? mesPorInfluencerMap(
              periodKey,
              metricasComparativo,
              livesComparativo,
              liveResultadosComparativo,
              podeVerInfluencer,
            ).get(filtroInfluencer) ?? emptyDiaData(d.data)
          : diaAgregadoParaGrafico(
              d.data,
              metricasComparativo,
              livesComparativo,
              liveResultadosComparativo,
              filtroInfluencer,
              podeVerInfluencer,
            );
        base[filtroInfluencer] = pickKpiDiaData(cell, k);
        idSet.add(filtroInfluencer);
      }
      chartRows.push(base);
    }

    let idsSeriesComparativo: string[];
    if (filtroInfluencer === "todos") {
      idsSeriesComparativo = ["tot"];
    } else {
      idsSeriesComparativo = [...idSet].sort((a, b) =>
        nomeInfluencer(a).localeCompare(nomeInfluencer(b), "pt-BR"),
      );
      if (idsSeriesComparativo.length === 0 && chartRows.length > 0) {
        for (const row of chartRows) {
          row.tot = row.Total ?? null;
        }
        idsSeriesComparativo = ["tot"];
      }
    }

    return { dadosGraficoComparativo: chartRows, idsSeriesComparativo };
  }, [
    diasDataComparativoExibicao,
    historico,
    kpiGraficoComparativo,
    metricasComparativo,
    livesComparativo,
    liveResultadosComparativo,
    filtroInfluencer,
    podeVerInfluencer,
    nomeInfluencer,
  ]);

  const coresSeriesComparativo = useMemo(() => {
    const m = new Map<string, string>();
    idsSeriesComparativo.forEach((id, i) => {
      m.set(
        id,
        id === "tot"
          ? "var(--brand-secondary, #4a2082)"
          : PALETA_INFLUENCER_GRAFICO[i % PALETA_INFLUENCER_GRAFICO.length]!,
      );
    });
    return m;
  }, [idsSeriesComparativo]);

  const COR_TOTAL_COMP = isDark ? "#ffffff" : "#000000";

  function TooltipComparativoInflChart({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: {
      name?: string;
      value?: unknown;
      color?: string;
      payload?: Record<string, unknown>;
    }[];
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    const somavel = kpiGraficoCompConfig.somavel;
    const full = payload[0]?.payload as Record<string, unknown> | undefined;
    const totalOficial =
      full?.Total != null && Number.isFinite(Number(full.Total)) ? Number(full.Total) : null;
    const totalSomavelFallback = payload.reduce((s, p) => {
      const n = Number(p.value);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    const totalSomavel =
      totalOficial != null && Number.isFinite(Number(totalOficial)) ? totalOficial : totalSomavelFallback;
    const formatar = (v: number) => {
      if (isBrlKpiComp) return fmtBRL(v);
      if (kpiGraficoComparativo === "duracao") return fmtHoras(v);
      return v.toLocaleString("pt-BR");
    };
    const mostrarRodapeTotal =
      somavel ||
      kpiGraficoComparativo === "media_views" ||
      kpiGraficoComparativo === "max_views";
    const valorRodape = totalOficial;
    return (
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: t.text,
          fontFamily: FONT.body,
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: t.text }}>{label}</div>
        {payload.map((p) => (
          <div
            key={String(p.name)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 4,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                }}
              />
              {p.name}
            </span>
            <span style={{ fontWeight: 600 }}>
              {p.value != null && p.value !== ""
                ? formatar(Number(p.value))
                : "—"}
            </span>
          </div>
        ))}
        {mostrarRodapeTotal && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginTop: 6,
              paddingTop: 6,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <span style={{ fontWeight: 700, color: COR_TOTAL_COMP }}>Total</span>
            <span style={{ fontWeight: 700, color: COR_TOTAL_COMP }}>
              {somavel
                ? formatar(totalSomavel)
                : valorRodape != null
                  ? formatar(valorRodape)
                  : "—"}
            </span>
          </div>
        )}
      </div>
    );
  }

  const pctViewAcesso = totais.views > 0 ? ((totais.acessos / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg = totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—";
  const pctRegFTD = totais.registros > 0 ? ((totais.ftds / totais.registros) * 100).toFixed(1) + "%" : "—";
  const pctViewFTD = totais.views > 0 ? ((totais.ftds / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD = totais.acessos > 0 ? ((totais.ftds / totais.acessos) * 100).toFixed(1) + "%" : "—";

  const subValueReg = totais.acessos > 0 || totais.registros > 0
    ? { label: "acessos (conv.)", value: `${totais.acessos.toLocaleString("pt-BR")} (${totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—"})` }
    : { label: "", value: "—" };

  const ftdPorHora = totais.horas > 0 ? (totais.ftds / totais.horas).toFixed(1) : "—";
  const ticketFTD = totais.ftds > 0 ? fmtBRL(totais.ftd_total / totais.ftds) : "—";
  const ticketDep = totais.depositos_qtd > 0 ? fmtBRL(totais.depositos_valor / totais.depositos_qtd) : "—";
  const ticketSaque = totais.saques_qtd > 0 ? fmtBRL(totais.saques_valor / totais.saques_qtd) : "—";
  const ggrPorJogador = totais.ftds > 0 ? fmtBRL(totais.ggr / totais.ftds) : "—";

  const brand = useDashboardBrand();
  const card: React.CSSProperties = { background: brand.blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" };
  const btnNav: React.CSSProperties = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  const thStyle = getThStyle(t, {
    fontSize: 11,
    letterSpacing: "0.08em",
    fontWeight: 700,
  });
  const tdStyle = getTdStyle(t, { borderBottom: `1px solid ${t.cardBorder}` });

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar este dashboard.</div>;
  }

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ─── BLOCO 1: Filtros — primária transparente ───────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Navegação de mês */}
            <button type="button" aria-label="Mês anterior" style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button type="button" aria-label="Próximo mês" style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>
              <ChevronRight size={14} aria-hidden />
            </button>

            {/* Botão Histórico — padrão Overview */}
            <button
              type="button"
              aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"}
              aria-pressed={historico}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}18`) : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
              onClick={toggleHistorico}
            >
              <GiCalendar size={15} /> Histórico
            </button>

            {/* Filtro Influencer — ícone dentro do campo (mesmo padrão do Histórico) */}
            {showFiltroInfluencer && (
              <SelectComIcone
                icon={<GiStarMedalFilter size={15} />}
                label="Filtrar por influencer"
                pill
                value={filtroInfluencer}
                onChange={setFiltroInfluencer}
              >
                <option value="todos">Todos os influencers</option>
                {perfis
                  .filter((p) => influencersComDadosIds.includes(p.id) && podeVerInfluencer(p.id))
                  .sort((a, b) => (a.nome_artistico ?? "").localeCompare(b.nome_artistico ?? "", "pt-BR"))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.nome_artistico}</option>
                  ))}
              </SelectComIcone>
            )}

            {/* Filtro Operadora — ícone dentro do campo */}
            {showFiltroOperadora && (
              <SelectComIcone
                icon={<GiShield size={15} aria-hidden />}
                label="Filtrar por operadora"
                pill
                value={filtroOperadora}
                onChange={setFiltroOperadora}
              >
                <option value="todas">Todas as operadoras</option>
                {[...operadorasList].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                  <option key={o.slug} value={o.slug}>{o.nome}</option>
                ))}
              </SelectComIcone>
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} aria-hidden /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {filtroResetado && (
        <div
          style={{
            margin: "0 0 14px",
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.35)",
            color: BRAND.amarelo,
            fontSize: 12,
            fontFamily: FONT.body,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          role="status"
        >
          Filtro de influencer removido — {MSG_SEM_DADOS_FILTRO}.
        </div>
      )}

      {/* ─── BLOCO 2: KPIs Executivos ─────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle
          icon={<GiPodiumWinner size={14} aria-hidden />}
          sub={historico ? "acumulado" : "· comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Executivos
        </SectionTitle>
        <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
          <KpiCard label="GGR Total" value={fmtBRL(totais.ggr)} icon={<GiMoneyStack size={16} />} accentVar="--brand-extra1" accentColor={BRAND.roxo} atual={totais.ggr} anterior={totaisAnt.ggr} isBRL isHistorico={historico} />
          <KpiCard label="Investimento" value={fmtBRL(totais.investimento)} icon={<GiTakeMyMoney size={16} />} accentVar="--brand-extra4" accentColor={BRAND.azul} atual={totais.investimento} anterior={totaisAnt.investimento} isBRL isHistorico={historico} />
          <KpiCard label="ROI" value={totais.investimento > 0 ? `${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%` : "—"} icon={<GiStarMedal size={16} />} accentVar="--brand-extra2" accentColor={BRAND.verde} atual={totais.roi} anterior={totaisAnt.roi} isHistorico={historico} />
        </div>
        <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
          <KpiCard label="Qtd de Lives" value={totais.lives.toLocaleString("pt-BR")} icon={<GiClapperboard size={16} />} accentVar="--brand-extra2" accentColor={BRAND.azul} atual={totais.lives} anterior={totaisAnt.lives} isHistorico={historico} />
          <KpiCard label="Horas Realizadas" value={fmtHoras(totais.horas)} icon={<GiSandsOfTime size={16} />} accentVar="--brand-extra2" accentColor={BRAND.azul} atual={totais.horas} anterior={totaisAnt.horas} isHistorico={historico} />
          <KpiCard label="Média de Views" value={totais.views > 0 ? totais.views.toLocaleString("pt-BR") : "—"} icon={<GiEyeball size={16} />} accentVar="--brand-extra2" accentColor={BRAND.azul} atual={totais.views} anterior={totaisAnt.views} isHistorico={historico} />
        </div>
        <div className="app-grid-kpi-4">
          <KpiCard label="Registros" value={totais.registros.toLocaleString("pt-BR")} icon={<GiPerson size={16} />} accentVar="--brand-extra3" accentColor={BRAND.roxo} atual={totais.registros} anterior={totaisAnt.registros} isHistorico={historico} subValue={subValueReg} />
          <KpiCard label="FTDs" value={totais.ftds.toLocaleString("pt-BR")} icon={<GiTrophy size={16} />} accentVar="--brand-extra3" accentColor={BRAND.roxo} atual={totais.ftds} anterior={totaisAnt.ftds} isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.ftd_total) }} />
          <KpiCard label="Depósitos" value={totais.depositos_qtd.toLocaleString("pt-BR")} icon={<GiCardPlay size={16} />} accentVar="--brand-extra3" accentColor={BRAND.amarelo} atual={totais.depositos_qtd} anterior={totaisAnt.depositos_qtd} isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.depositos_valor) }} />
          <KpiCard label="Saques" value={totais.saques_qtd.toLocaleString("pt-BR")} icon={<GiCash size={16} />} accentVar="--brand-extra4" accentColor={BRAND.amarelo} atual={totais.saques_qtd} anterior={totaisAnt.saques_qtd} isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.saques_valor) }} />
        </div>
      </div>

      {/* ─── BLOCO 3: Funil de Conversão ───────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiFunnel size={14} />} sub={historico ? "acumulado" : undefined}>
          Funil de Conversão
        </SectionTitle>
        <FunilVisual values={[totais.views, totais.acessos, totais.registros, totais.ftds]} taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]} />
      </div>

      {/* ─── BLOCO 4: Eficiência ──────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiSpeedometer size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
          Eficiência
        </SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
        >
          <RateCard label="FTD/Hora" value={ftdPorHora} />
          <RateCard label="Ticket Médio FTD" value={ticketFTD} />
          <RateCard label="Ticket Médio Depósito" value={ticketDep} />
          <RateCard label="Ticket Médio Saque" value={ticketSaque} />
          <RateCard label="GGR por Jogador" value={ggrPorJogador} highlight={true} />
        </div>
      </div>

      {/* ─── BLOCO 5: Comparativo Mensal (histórico) / Comparativo Diário (mês) ─ */}
      {(historico || mesSelecionado) && diasData.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 0 }}>
          <div style={{ padding: "20px 20px 16px" }}>
            <SectionTitle
              icon={<GiCalendar size={14} aria-hidden />}
              sub={historico ? "mês a mês" : undefined}
            >
              {historico ? "Comparativo Mensal" : "Comparativo Diário"}
            </SectionTitle>
          </div>

          <div style={{ padding: "0 20px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px", minWidth: 0 }}>
                {modoVisualizacaoComparativo === "grafico" && (
                  <>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {KPIS_COMPARATIVO_INFLUENCER.map((kpi) => {
                        const ativo = kpiGraficoComparativo === kpi.key;
                        return (
                          <button
                            type="button"
                            key={kpi.key}
                            aria-pressed={ativo}
                            aria-label={`KPI do gráfico: ${kpi.label}`}
                            onClick={() => setKpiGraficoComparativo(kpi.key)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 12px",
                              borderRadius: 999,
                              cursor: "pointer",
                              fontFamily: FONT.body,
                              fontSize: 11,
                              fontWeight: ativo ? 700 : 400,
                              border: `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                              background: ativo ? "rgba(124,58,237,0.12)" : "transparent",
                              color: ativo ? BRAND.roxoVivo : t.textMuted,
                              transition: "all 0.15s",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: ativo ? BRAND.roxoVivo : t.cardBorder,
                                flexShrink: 0,
                              }}
                            />
                            {kpi.label}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
                      Selecione um KPI para o gráfico
                    </span>
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {(
                  [
                    { modo: "tabela" as const, icon: <Table2 size={14} aria-hidden />, label: "Tabela" },
                    { modo: "grafico" as const, icon: <ChartColumnBig size={14} aria-hidden />, label: "Gráfico" },
                  ] as const
                ).map(({ modo, icon, label }) => (
                  <button
                    type="button"
                    key={modo}
                    aria-label={`Ver em ${label}`}
                    aria-pressed={modoVisualizacaoComparativo === modo}
                    onClick={() => setModoVisualizacaoComparativo(modo)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: FONT.body,
                      fontSize: 11,
                      fontWeight: modoVisualizacaoComparativo === modo ? 700 : 400,
                      background:
                        modoVisualizacaoComparativo === modo ? "rgba(124,58,237,0.12)" : "transparent",
                      color: modoVisualizacaoComparativo === modo ? BRAND.roxoVivo : t.textMuted,
                      transition: "all 0.15s",
                      borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {modoVisualizacaoComparativo === "tabela" ? (
            <div className="app-table-wrap">
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
                <caption
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    border: 0,
                  }}
                >
                  {historico
                    ? "Comparativo mensal — todo o período"
                    : `Comparativo diário — ${mesSelecionado?.label ?? ""}`}
                </caption>
                <thead>
                  <tr>
                    {[
                      historico ? "Mês" : "Data",
                      "Duração Live",
                      "Média Views",
                      "Máx Views",
                      "Acessos",
                      "Registros",
                      "# FTDs",
                      "R$ FTDs",
                      "# Depósitos",
                      "R$ Depósitos",
                      "# Saques",
                      "R$ Saques",
                      "R$ GGR",
                    ].map((h) => (
                      <th key={h} scope="col" style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {diasDataComparativoExibicao.map((d, i) => (
                    <tr key={d.data} style={{ background: zebraStripe(i) }}>
                      <td style={tdStyle}>
                        {historico ? fmtMesAnoCurtoInfluencer(d.data.slice(0, 7)) : fmtDia(d.data)}
                      </td>
                      <td style={tdStyle}>{d.duracao > 0 ? fmtHoras(d.duracao) : "—"}</td>
                      <td style={tdStyle}>{cel(d.media_views)}</td>
                      <td style={tdStyle}>{cel(d.max_views)}</td>
                      <td style={tdStyle}>{cel(d.acessos)}</td>
                      <td style={tdStyle}>{cel(d.registros)}</td>
                      <td style={tdStyle}>{cel(d.ftd_count)}</td>
                      <td style={tdStyle}>{cel(d.ftd_total, true)}</td>
                      <td style={tdStyle}>{cel(d.deposit_count)}</td>
                      <td style={tdStyle}>{cel(d.deposit_total, true)}</td>
                      <td style={tdStyle}>{cel(d.withdrawal_count)}</td>
                      <td style={tdStyle}>{cel(d.withdrawal_total, true)}</td>
                      <td
                        style={{
                          ...tdStyle,
                          color: d.ggr > 0 ? BRAND.verde : d.ggr < 0 ? BRAND.vermelho : t.text,
                          fontWeight: d.ggr !== 0 ? 600 : undefined,
                        }}
                      >
                        {cel(d.ggr, true)}
                      </td>
                    </tr>
                  ))}
                  {diasData.length > 0 &&
                    (() => {
                      const tot = diasDataComparativoExibicao.reduce(
                        (acc, d) => ({
                          duracao: acc.duracao + d.duracao,
                          acessos: acc.acessos + d.acessos,
                          registros: acc.registros + d.registros,
                          ftd_count: acc.ftd_count + d.ftd_count,
                          ftd_total: acc.ftd_total + d.ftd_total,
                          deposit_count: acc.deposit_count + d.deposit_count,
                          deposit_total: acc.deposit_total + d.deposit_total,
                          withdrawal_count: acc.withdrawal_count + d.withdrawal_count,
                          withdrawal_total: acc.withdrawal_total + d.withdrawal_total,
                          ggr: acc.ggr + d.ggr,
                        }),
                        {
                          duracao: 0,
                          acessos: 0,
                          registros: 0,
                          ftd_count: 0,
                          ftd_total: 0,
                          deposit_count: 0,
                          deposit_total: 0,
                          withdrawal_count: 0,
                          withdrawal_total: 0,
                          ggr: 0,
                        },
                      );
                      return (
                        <tr
                          key="total"
                          style={{
                            background: TOTAL_ROW_BG,
                            fontWeight: 700,
                            borderTop: `2px solid ${t.cardBorder}`,
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 700, fontSize: 14, color: brand.primary }}>Total</td>
                          <td style={tdStyle}>{tot.duracao > 0 ? fmtHoras(tot.duracao) : "—"}</td>
                          <td style={tdStyle}>—</td>
                          <td style={tdStyle}>—</td>
                          <td style={tdStyle}>{cel(tot.acessos)}</td>
                          <td style={tdStyle}>{cel(tot.registros)}</td>
                          <td style={tdStyle}>{cel(tot.ftd_count)}</td>
                          <td style={tdStyle}>{cel(tot.ftd_total, true)}</td>
                          <td style={tdStyle}>{cel(tot.deposit_count)}</td>
                          <td style={tdStyle}>{cel(tot.deposit_total, true)}</td>
                          <td style={tdStyle}>{cel(tot.withdrawal_count)}</td>
                          <td style={tdStyle}>{cel(tot.withdrawal_total, true)}</td>
                          <td
                            style={{
                              ...tdStyle,
                              color: tot.ggr > 0 ? BRAND.verde : tot.ggr < 0 ? BRAND.vermelho : t.text,
                              fontWeight: 700,
                            }}
                          >
                            {cel(tot.ggr, true)}
                          </td>
                        </tr>
                      );
                    })()}
                </tbody>
              </table>
            </div>
          ) : dadosGraficoComparativo.length === 0 ? (
            <div
              style={{
                padding: "24px 20px 32px",
                textAlign: "center",
                color: t.textMuted,
                fontSize: 12,
                fontFamily: FONT.body,
              }}
            >
              {MSG_SEM_DADOS_FILTRO}
            </div>
          ) : (
            <div style={{ padding: "0 20px 24px" }}>
              <p
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  marginBottom: 8,
                  marginTop: 0,
                }}
              >
                Exibindo <strong style={{ color: t.text }}>{kpiGraficoCompConfig.label}</strong>
                {filtroInfluencer === "todos" ? " — consolidado" : ""}
              </p>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {kpiGraficoCompConfig.tipoGrafico === "barra" ? (
                    <BarChart
                      data={dadosGraficoComparativo as Record<string, string | number | null>[]}
                      margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                      barCategoryGap="30%"
                      barGap={3}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                        width={isBrlKpiComp ? 72 : kpiGraficoComparativo === "duracao" ? 52 : 44}
                        tickFormatter={(v) =>
                          isBrlKpiComp
                            ? `R$${(v / 1000).toFixed(0)}K`
                            : kpiGraficoComparativo === "duracao"
                              ? `${Number(v).toFixed(1)}h`
                              : v.toLocaleString("pt-BR")
                        }
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<TooltipComparativoInflChart />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                      {idsSeriesComparativo.map((id) => (
                        <Bar
                          key={id}
                          dataKey={id}
                          name={id === "tot" ? "Consolidado" : nomeInfluencer(id)}
                          fill={coresSeriesComparativo.get(id) ?? BRAND.roxoVivo}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart
                      data={dadosGraficoComparativo as Record<string, string | number | null>[]}
                      margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                        width={isBrlKpiComp ? 72 : kpiGraficoComparativo === "duracao" ? 52 : 44}
                        tickFormatter={(v) =>
                          isBrlKpiComp
                            ? `R$${(v / 1000).toFixed(0)}K`
                            : kpiGraficoComparativo === "duracao"
                              ? `${Number(v).toFixed(1)}h`
                              : v.toLocaleString("pt-BR")
                        }
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<TooltipComparativoInflChart />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                      {idsSeriesComparativo.map((id) => (
                        <Line
                          key={id}
                          type="monotone"
                          name={id === "tot" ? "Consolidado" : nomeInfluencer(id)}
                          dataKey={id}
                          stroke={coresSeriesComparativo.get(id) ?? BRAND.roxoVivo}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
