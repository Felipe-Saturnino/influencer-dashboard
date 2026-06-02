import { Fragment, useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { FONT } from "../../../constants/theme";
import { CAROUSEL_NAV_BTN_PX, getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { fmtBRL, getIdxMesCarrosselPadrao, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
import { TooltipComparativoJogo, TooltipDetalheOperadoras } from "./overviewSpinChartTooltips";
import { OverviewSpinAbaNav } from "./OverviewSpinAbaNav";
import type { OverviewSpinTab } from "./overviewSpinTabs";
import { labelCarrosselPos } from "../../../lib/lobbyMonitorHelpers";
import {
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles";
import {
  GAME_IDENTITY_HEX,
  getGameMesaTituloMix,
  getGameMesaTituloStripStyle,
} from "../../../lib/gameIdentityColors";
import {
  JOGOS_COMPARATIVO,
  KPIS_DISPONIVEIS,
  KPI_UAP_VS_LEGENDA,
  LABEL_FUTEBOL_BRASILEIRO,
  PALETA_OPERADORAS_DETALHE,
  UAP_JOGO_MAP,
  aggDailyMesKpi,
  aggregateCellFromPorTabelaRows,
  agregaDailyRawPorOperadoraNoDia,
  agregaDailyRawPorOperadoraNoMes,
  agregarLinhasComparativoJogo,
  applyMesasOperadoraSlugFilter,
  arpuComparativoFromGgrUap,
  buildPorTabelaGameBuckets,
  buildSlugListForMesasQueries,
  buildUapPorJogoQuery,
  calcularPctComparativoOficial,
  filtrarPorEscopoOperadora,
  fmtDiaMesPtBr,
  fmtMesAnoCurtoFromYm,
  fmtPct,
  getMesesDisponiveis,
  isMesaBlackjackComparativo,
  isMesaFutebolBrasileiro,
  jogoComparativoKeysFromCadastroMesa,
  labelMesaCda,
  linhaComparativoJogoAgregadaMes,
  linhaMesaPorDiaFromRow,
  linhasMesaAgregadasPorMes,
  mapPorTabelaV2,
  mergeDailyRowsAgregadoTodasOperadoras,
  mergeDailyRowsPorData,
  mergeMonthlyHistoricoAgregadoTodas,
  mergeMonthlyHistoricoRows,
  mergeMonthlyUapArpuAgregadoTodas,
  mergeMonthlyUapArpuSingleMonth,
  mergeUapPorJogoRows,
  nKpi,
  normalizeMesasYmd,
  pickKpiMetricaDetalhe,
  pickPorTabelaOperDayShift,
  renderValorKpiComparativo,
  totaisLinhasMesaPorDia,
  totaisOficiaisFromDailyRow,
  totaisOficiaisHistoricoMes,
  type CelulaJogoMetricas,
  type DailyRawRow,
  type DailyRow,
  type JogoComparativoKey,
  type KpiJogoKey,
  type LinhaComparativoJogoTab,
  type LinhaDetalheTab,
  type LinhaMesaPorDia,
  type MesaCadastroComparativoRow,
  type MonthlyRawRow,
  type MonthlyRow,
  type PorTabelaRow,
  type TotaisOficiaisComparativo,
  type UapPorJogoPlanRow,
  type UapRawRow,
} from "./overviewSpinLogic";



const DashboardPosicionamento = lazy(() => import("./DashboardPosicionamento"));

import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Hash,
  Loader2,
  Table2,
  TrendingUp,
  Percent,
  ChartColumnBig,
  Users,
} from "lucide-react";
import KpiCard from "../../../components/dashboard/KpiCard";
import SectionTitle from "../../../components/dashboard/SectionTitle";
import {
  MarginBadge,
  FiltroHistoricoButton,
  FiltroOperadoraSelect,
  SkeletonKpiCard,
  DashboardPageHeader,
} from "../../../components/dashboard";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import {
  createDataTableBlockStyles,
  getDataTableStyle,
  getDataTableWrapStyle,
} from "../../../lib/dataTableStyles";
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

export default function OverviewSpin() {
  const { theme: t, escoposVisiveis } = useApp();
  const { showFiltroOperadora, podeVerOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("mesas_spin");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);

  const [idxMes, setIdxMes] = useState(idxInicial);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uapPorJogoRows, setUapPorJogoRows] = useState<UapPorJogoPlanRow[]>([]);

  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [porTabelaRows, setPorTabelaRows] = useState<PorTabelaRow[]>([]);
  const [porTabelaHistAll, setPorTabelaHistAll] = useState<PorTabelaRow[]>([]);
  /** UAP/ARPU mensais oficiais (tabela monthly); quando null, KPI mostra "—". */
  const [monthlyUapArpuSel, setMonthlyUapArpuSel] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  const [monthlyUapArpuPrev, setMonthlyUapArpuPrev] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  /** Só para comparação MoM no carrossel: totais do mês anterior a partir do daily. */
  const [dailyDataPrevMonth, setDailyDataPrevMonth] = useState<DailyRow[]>([]);
  const [operadorasOcr, setOperadorasOcr] = useState<{ slug: string; nome: string }[]>([]);
  const [mesasCadastro, setMesasCadastro] = useState<MesaCadastroComparativoRow[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [compMesaA, setCompMesaA] = useState("");
  const [compMesaB, setCompMesaB] = useState("");
  const [kpisSelecionados, setKpisSelecionados] = useState<Set<KpiJogoKey>>(
    () => new Set<KpiJogoKey>(["ggr", "turnover", "uap"]),
  );
  const [kpiGrafico, setKpiGrafico] = useState<KpiJogoKey>("ggr");
  const [dailyRawUnmerged, setDailyRawUnmerged] = useState<DailyRawRow[]>([]);
  const [monthlyRawUnmerged, setMonthlyRawUnmerged] = useState<MonthlyRawRow[]>([]);
  const [expandedDetalhe, setExpandedDetalhe] = useState<Set<string>>(() => new Set());
  const [modoVisualizacao, setModoVisualizacao] = useState<"tabela" | "grafico">("tabela");
  const [modoVisualizacaoDetalhe, setModoVisualizacaoDetalhe] = useState<"tabela" | "grafico">("tabela");
  const [kpiGraficoDetalhe, setKpiGraficoDetalhe] = useState<KpiJogoKey>("ggr");
  const [aba, setAba] = useRouteTab("mesas_spin", "overview", ["overview", "posicionamento"] as const);

  const mesSelecionado = mesesDisponiveis[idxMes];

  const modoAgregadoTodasOperadoras =
    filtroOperadora === "todas" && (operadoraSlugsForcado == null || operadoraSlugsForcado.length === 0);

  function irMesAnterior() {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }
  function irMesProximo() {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial);
    } else setHistorico(true);
  }

  useEffect(() => {
    let alive = true;
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasOcr(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("mesas_spin_cadastro")
      .select("operadora_slug, tipo_jogo, nome_mesa")
      .then(({ data }) => {
        if (!alive) return;
        setMesasCadastro((data ?? []) as MesaCadastroComparativoRow[]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setPorTabelaRows([]);
    setPorTabelaHistAll([]);
    setMonthlyUapArpuSel(null);
    setMonthlyUapArpuPrev(null);
    setDailyDataPrevMonth([]);
    setUapPorJogoRows([]);
    setDailyRawUnmerged([]);
    setMonthlyRawUnmerged([]);

    try {
      const slugList = buildSlugListForMesasQueries({
        operadoraSlugsForcado,
        filtroOperadora,
        semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
        operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
      });
      const agregadoTodas =
        filtroOperadora === "todas" && (operadoraSlugsForcado == null || operadoraSlugsForcado.length === 0);
      if (historico) {
        const [monthlyRaw, dailyRaw, porAllRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_monthly_summary")
                .select("mes, uap, arpu, operadora_slug")
                .order("mes", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_daily_summary")
                .select("data, turnover, ggr, apostas, uap, operadora_slug")
                .order("data", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_por_tabela")
                .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
                .order("dia", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(true, undefined, from, to, slugList)),
        ]);
        setMonthlyRawUnmerged(monthlyRaw as MonthlyRawRow[]);
        setDailyRawUnmerged(dailyRaw as DailyRawRow[]);
        setMonthlyData(
          agregadoTodas
            ? mergeMonthlyHistoricoAgregadoTodas(monthlyRaw as MonthlyRawRow[])
            : mergeMonthlyHistoricoRows(monthlyRaw as MonthlyRawRow[]),
        );
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyRaw as DailyRawRow[]),
        );
        setPorTabelaHistAll((porAllRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw as UapRawRow[]));
      } else if (mesSelecionado) {
        const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
        const { inicio, fim } = atual;
        const { inicio: pi, fim: pf } = anterior;

        const [dailyRaw, dailyPrevRaw, mesasMesRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_daily_summary")
                .select("data, turnover, ggr, apostas, uap, operadora_slug")
                .gte("data", inicio)
                .lte("data", fim)
                .order("data", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_daily_summary")
                .select("data, turnover, ggr, apostas, uap, operadora_slug")
                .gte("data", pi)
                .lte("data", pf)
                .order("data", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) =>
            applyMesasOperadoraSlugFilter(
              supabase
                .from("relatorio_por_tabela")
                .select("dia, operadora, operadora_slug, mesa, ggr, turnover, apostas")
                .gte("dia", inicio)
                .lte("dia", fim)
                .order("dia", { ascending: true })
                .order("mesa", { ascending: true })
                .range(from, to),
              slugList,
            ),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(false, mesSelecionado, from, to, slugList)),
        ]);

        setDailyRawUnmerged(dailyRaw as DailyRawRow[]);
        setMonthlyRawUnmerged([]);
        setDailyData(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyRaw as DailyRawRow[]),
        );
        setMonthlyData([]);
        setDailyDataPrevMonth(
          agregadoTodas
            ? mergeDailyRowsAgregadoTodasOperadoras(dailyPrevRaw as DailyRawRow[])
            : mergeDailyRowsPorData(dailyPrevRaw as DailyRawRow[]),
        );
        setPorTabelaRows((mesasMesRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(mergeUapPorJogoRows(uapRaw as UapRawRow[]));

        const { data: mSelRows } = await applyMesasOperadoraSlugFilter(
          supabase.from("relatorio_monthly_summary").select("uap, arpu, operadora_slug").eq("mes", inicio),
          slugList,
        );
        setMonthlyUapArpuSel(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mSelRows ?? [])
            : mergeMonthlyUapArpuSingleMonth(mSelRows ?? []),
        );

        const { data: mPrevRows } = await applyMesasOperadoraSlugFilter(
          supabase.from("relatorio_monthly_summary").select("uap, arpu, operadora_slug").eq("mes", pi),
          slugList,
        );
        setMonthlyUapArpuPrev(
          agregadoTodas
            ? mergeMonthlyUapArpuAgregadoTodas(mPrevRows ?? [])
            : mergeMonthlyUapArpuSingleMonth(mPrevRows ?? []),
        );
      }
    } catch {
      setUapPorJogoRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    historico,
    mesSelecionado,
    operadoraSlugsForcado,
    filtroOperadora,
    escoposVisiveis.semRestricaoEscopo,
    escoposVisiveis.operadorasVisiveis,
  ]);

  useEffect(() => {
    if (aba !== "overview") return;
    void carregar();
  }, [carregar, aba]);

  useEffect(() => {
    if (!operadoraSlugsForcado?.length) return;
    if (operadoraSlugsForcado.length === 1 && filtroOperadora === "todas") {
      setFiltroOperadora(operadoraSlugsForcado[0]);
    }
  }, [operadoraSlugsForcado, filtroOperadora]);

  useEffect(() => {
    setExpandedDetalhe(new Set());
  }, [historico, filtroOperadora, operadoraSlugsForcado, idxMes]);

  useEffect(() => {
    if (!modoAgregadoTodasOperadoras) return;
    setKpisSelecionados((prev) => {
      if (prev.has("arpu")) return prev;
      const next = new Set(prev);
      next.add("arpu");
      return next;
    });
  }, [modoAgregadoTodasOperadoras]);

  const operadorasListFmt = operadorasOcr;

  const slugToNome = useCallback(
    (slug: string) => operadorasOcr.find((o) => o.slug === slug)?.nome ?? slug,
    [operadorasOcr],
  );

  const porTabelaFiltradas = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaRows,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaRows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  const porTabelaFiltradasHist = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaHistAll,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaHistAll, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  const tabelaRows = useMemo(() => {
    const enrich = (
      base: Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & { label: string },
      periodoIso: string,
    ): LinhaDetalheTab => {
      const t = base.turnover;
      const g = base.ggr;
      const b = base.bets;
      const u = base.uap;
      const margin_pct = t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
      const bet_size =
        b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
      const arpu = u != null && Number(u) !== 0 && g != null ? Number(g) / Number(u) : null;
      return { ...base, margin_pct, bet_size, arpu, periodoIso };
    };
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));
      const allYm = new Set<string>([...dailyByYm.keys(), ...monthlyByYm.keys()]);
      return [...allYm]
        .sort((a, b) => b.localeCompare(a))
        .map((ym) => {
          const dias = dailyByYm.get(ym) ?? [];
          const agg = dias.length > 0 ? aggDailyMesKpi(dias) : null;
          const m = monthlyByYm.get(ym);
          if (modoAgregadoTodasOperadoras) {
            const turnover = agg?.turnover ?? null;
            const ggr = agg?.ggr ?? null;
            const bets = agg?.bets ?? null;
            const margin_pct =
              turnover != null && turnover !== 0 && ggr != null ? (ggr / turnover) * 100 : null;
            const bet_size =
              bets != null && bets !== 0 && turnover != null ? turnover / bets : null;
            const uap = m?.uap != null ? Number(m.uap) : null;
            const arpu = arpuComparativoFromGgrUap(ggr, uap);
            return {
              label: fmtMesAnoCurtoFromYm(ym),
              turnover,
              ggr,
              bets,
              uap,
              margin_pct,
              bet_size,
              arpu,
              drillId: ym,
              periodoIso: `${ym}-01`,
            };
          }
          return enrich(
            {
              label: fmtMesAnoCurtoFromYm(ym),
              turnover: agg?.turnover ?? null,
              ggr: agg?.ggr ?? null,
              bets: agg?.bets ?? null,
              uap: m?.uap != null ? Number(m.uap) : agg?.uap ?? null,
            },
            `${ym}-01`,
          );
        });
    }
    if (modoAgregadoTodasOperadoras) {
      return [...dailyData]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((r) => ({
          label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          turnover: r.turnover,
          ggr: r.ggr,
          bets: r.bets,
          uap: r.uap,
          margin_pct: r.margin_pct,
          bet_size: r.bet_size,
          arpu: arpuComparativoFromGgrUap(r.ggr, r.uap),
          drillId: r.data,
          periodoIso: normalizeMesasYmd(r.data),
        }));
    }
    return [...dailyData]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((r) =>
        enrich(
          {
            label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            }),
            turnover: r.turnover,
            ggr: r.ggr,
            bets: r.bets,
            uap: r.uap,
          },
          normalizeMesasYmd(r.data),
        ),
      );
  }, [historico, dailyData, monthlyData, modoAgregadoTodasOperadoras]);

  const kpiExibir = useMemo(() => {
    if (historico) {
      if (tabelaRows.length === 0) return null;
      let turnover = 0;
      let ggr = 0;
      let bets = 0;
      const uapMeses: number[] = [];
      for (const r of tabelaRows) {
        turnover += Number(r.turnover ?? 0);
        ggr += Number(r.ggr ?? 0);
        bets += Number(r.bets ?? 0);
        if (r.uap != null) uapMeses.push(Number(r.uap));
      }
      const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
      const bet_size = bets !== 0 ? turnover / bets : null;
      if (modoAgregadoTodasOperadoras) {
        /** UAP = média dos totais mensais (somando operadoras no mês) — relatorio_monthly_summary. */
        const somaUapMeses = uapMeses.reduce((a, b) => a + b, 0);
        const mediaUapMesesHist =
          uapMeses.length > 0 ? somaUapMeses / uapMeses.length : null;
        return {
          turnover,
          ggr,
          margin_pct,
          bets,
          uap: mediaUapMesesHist,
          bet_size,
          arpu: arpuComparativoFromGgrUap(ggr, mediaUapMesesHist),
        };
      }
      const somaUap = uapMeses.reduce((a, b) => a + b, 0);
      const mediaUap = uapMeses.length > 0 ? somaUap / uapMeses.length : null;
      return {
        turnover,
        ggr,
        margin_pct,
        bets,
        uap: mediaUap,
        bet_size,
        arpu: arpuComparativoFromGgrUap(ggr, mediaUap),
      };
    }
    const base = dailyData.length === 0 ? null : aggDailyMesKpi(dailyData);
    if (!base) return null;
    const u = monthlyUapArpuSel?.uap ?? null;
    return {
      ...base,
      uap: u,
      /** ARPU do quadro: GGR agregado do período ÷ UAP oficial mensal relatorio_monthly_summary. */
      arpu: arpuComparativoFromGgrUap(base.ggr, u),
    };
  }, [historico, tabelaRows, dailyData, monthlyUapArpuSel, modoAgregadoTodasOperadoras]);

  const kpiAntExibir = useMemo(() => {
    const base =
      historico || dailyDataPrevMonth.length === 0 ? null : aggDailyMesKpi(dailyDataPrevMonth);
    if (!base) return null;
    if (historico) return base;
    const u = monthlyUapArpuPrev?.uap ?? null;
    return {
      ...base,
      uap: u,
      arpu: arpuComparativoFromGgrUap(base.ggr, u),
    };
  }, [historico, dailyDataPrevMonth, monthlyUapArpuPrev]);

  /** Só Blackjack 1 / 2 / VIP — comparativo lateral. */
  const mesasOpcoesBlackjack = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    const seen = new Map<string, PorTabelaRow>();
    for (const r of src) {
      if (!isMesaBlackjackComparativo(r, operadorasListFmt)) continue;
      const k = r.nome_tabela.trim();
      if (!k) continue;
      if (!seen.has(k)) seen.set(k, r);
    }
    const list = [...seen.entries()].map(([key, sample]) => ({
      key,
      label: labelMesaCda(sample, operadorasListFmt),
    }));
    list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return list;
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasSpeedBaccarat = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(
        src,
        (r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat",
      );
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat")
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasRoleta = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => labelMesaCda(r, operadorasListFmt) === "Roleta");
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Roleta")
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasFutebolBrasileiro = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => isMesaFutebolBrasileiro(r, operadorasListFmt));
    }
    return src
      .filter((r) => isMesaFutebolBrasileiro(r, operadorasListFmt))
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const slugListEscopoComparativo = useMemo(
    () =>
      buildSlugListForMesasQueries({
        operadoraSlugsForcado,
        filtroOperadora,
        semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo === true,
        operadorasVisiveis: escoposVisiveis.operadorasVisiveis,
      }),
    [
      operadoraSlugsForcado,
      filtroOperadora,
      escoposVisiveis.semRestricaoEscopo,
      escoposVisiveis.operadorasVisiveis,
    ],
  );

  /** Jogos exibidos no Comparativo de Jogo conforme catálogo de mesas das operadoras no escopo do filtro. */
  const jogosComparativoAtivos = useMemo(() => {
    const keys = new Set<JogoComparativoKey>();
    const rowsCadastro =
      slugListEscopoComparativo != null && slugListEscopoComparativo.length > 0
        ? mesasCadastro.filter((m) => slugListEscopoComparativo.includes(m.operadora_slug))
        : mesasCadastro.filter((m) => podeVerOperadora(m.operadora_slug));

    for (const m of rowsCadastro) {
      for (const k of jogoComparativoKeysFromCadastroMesa(m.tipo_jogo, m.nome_mesa)) {
        keys.add(k);
      }
    }

    const fromCadastro = JOGOS_COMPARATIVO.filter((j) => keys.has(j.key));
    if (fromCadastro.length > 0) return fromCadastro;

    // Fallback: perfil sem escopo e catálogo vazio (RLS legado) — exibir colunas por jogo quando houver dados.
    if (escoposVisiveis.semRestricaoEscopo === true) {
      const withData = new Set<JogoComparativoKey>();
      const srcRows = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
      for (const r of srcRows) {
        const lbl = labelMesaCda(r, operadorasListFmt);
        if (isMesaBlackjackComparativo(r, operadorasListFmt)) withData.add("blackjack");
        if (lbl === "Roleta") withData.add("roleta");
        if (lbl === "Speed Baccarat") withData.add("baccarat");
        if (isMesaFutebolBrasileiro(r, operadorasListFmt)) withData.add("futebol_brasileiro");
      }
      if (withData.size > 0) return JOGOS_COMPARATIVO.filter((j) => withData.has(j.key));
    }

    return fromCadastro;
  }, [
    mesasCadastro,
    slugListEscopoComparativo,
    podeVerOperadora,
    escoposVisiveis.semRestricaoEscopo,
    historico,
    porTabelaFiltradasHist,
    porTabelaFiltradas,
    operadorasListFmt,
  ]);

  const exibirBlocoDadosPorMesaFutebol = useMemo(() => {
    if (modoAgregadoTodasOperadoras) return false;
    return jogosComparativoAtivos.some((j) => j.key === "futebol_brasileiro");
  }, [modoAgregadoTodasOperadoras, jogosComparativoAtivos]);

  const qtdColunasJogoComparativo = 1 + jogosComparativoAtivos.length;

  /** Dia a dia (mês selecionado) ou mês a mês (histórico). */
  const linhasComparativoJogo = useMemo((): LinhaComparativoJogoTab[] => {
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));

      const byYm = new Map<string, PorTabelaRow[]>();
      for (const r of porTabelaFiltradasHist) {
        const ym = r.data_relatorio.slice(0, 7);
        if (!byYm.has(ym)) byYm.set(ym, []);
        byYm.get(ym)!.push(r);
      }
      return [...byYm.keys()]
        .sort((a, b) => b.localeCompare(a))
        .map((ym) =>
          linhaComparativoJogoAgregadaMes(
            ym,
            byYm.get(ym)!,
            operadorasListFmt,
            uapPorJogoRows,
            totaisOficiaisHistoricoMes(ym, dailyByYm, monthlyByYm),
          ),
        );
    }
    const shiftOper = pickPorTabelaOperDayShift(dailyData, porTabelaFiltradas, operadorasListFmt);
    const byDate = buildPorTabelaGameBuckets(porTabelaFiltradas, operadorasListFmt, shiftOper);

    const uapByDateJogo = new Map<
      string,
      Partial<Record<"blackjack" | "roleta" | "baccarat" | "futebol_brasileiro", number>>
    >();
    for (const r of uapPorJogoRows) {
      if (r.uap == null) continue;
      const dk = normalizeMesasYmd(r.data);
      if (!uapByDateJogo.has(dk)) uapByDateJogo.set(dk, {});
      const jogoKey = UAP_JOGO_MAP[r.jogo];
      if (jogoKey) uapByDateJogo.get(dk)![jogoKey] = Number(r.uap);
    }

    return [...dailyData]
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((dr) => {
        const dataIso = normalizeMesasYmd(dr.data);
        const b = byDate.get(dataIso) ?? { bj: [], roleta: [], baccarat: [], futebolBrasileiro: [] };
        const uapDia = uapByDateJogo.get(dataIso) ?? {};
        const bjCell = aggregateCellFromPorTabelaRows(b.bj);
        const rlCell = aggregateCellFromPorTabelaRows(b.roleta);
        const bcCell = aggregateCellFromPorTabelaRows(b.baccarat);
        const fbCell = aggregateCellFromPorTabelaRows(b.futebolBrasileiro);
        const uapBj = uapDia.blackjack ?? null;
        const uapRl = uapDia.roleta ?? null;
        const uapBc = uapDia.baccarat ?? null;
        const uapFb = uapDia.futebol_brasileiro ?? null;
        return {
          dataIso,
          labelData: fmtDiaMesPtBr(dataIso),
          blackjack: {
            ...bjCell,
            uap: uapBj,
            arpu: arpuComparativoFromGgrUap(bjCell.ggr, uapBj),
          },
          roleta: {
            ...rlCell,
            uap: uapRl,
            arpu: arpuComparativoFromGgrUap(rlCell.ggr, uapRl),
          },
          baccarat: {
            ...bcCell,
            uap: uapBc,
            arpu: arpuComparativoFromGgrUap(bcCell.ggr, uapBc),
          },
          futebol_brasileiro: {
            ...fbCell,
            uap: uapFb,
            arpu: arpuComparativoFromGgrUap(fbCell.ggr, uapFb),
          },
          totaisOficiais: totaisOficiaisFromDailyRow(dr),
        };
      });
  }, [
    historico,
    dailyData,
    monthlyData,
    porTabelaFiltradasHist,
    porTabelaFiltradas,
    operadorasListFmt,
    uapPorJogoRows,
  ]);

  const linhaTotaisComparativoJogo = useMemo(
    () =>
      linhasComparativoJogo.length === 0 ? null : agregarLinhasComparativoJogo(linhasComparativoJogo),
    [linhasComparativoJogo],
  );

  const kpisAtivosComparativo = useMemo(
    () => KPIS_DISPONIVEIS.filter((k) => kpisSelecionados.has(k.key)),
    [kpisSelecionados],
  );

  const kpiGraficoConfig = useMemo(
    () => KPIS_DISPONIVEIS.find((k) => k.key === kpiGrafico) ?? KPIS_DISPONIVEIS[0]!,
    [kpiGrafico],
  );

  const dadosGraficoComparativoJogo = useMemo(() => {
    // Gráfico: ordem cronológica (antigo → novo); tabela usa `linhasComparativoJogo` mais recente primeiro.
    return [...linhasComparativoJogo].reverse().map((row) => {
      const val = (jogoKey: "blackjack" | "roleta" | "baccarat" | "futebol_brasileiro") => {
        const v = row[jogoKey][kpiGrafico as keyof CelulaJogoMetricas];
        return v != null ? Number(v) : null;
      };
      const totalOficial =
        row.totaisOficiais[kpiGrafico as keyof TotaisOficiaisComparativo] ?? null;
      return {
        label: row.labelData,
        dataIso: row.dataIso,
        Blackjack: val("blackjack"),
        Roleta: val("roleta"),
        Baccarat: val("baccarat"),
        [LABEL_FUTEBOL_BRASILEIRO]: val("futebol_brasileiro"),
        Total: totalOficial != null ? Number(totalOficial) : null,
      };
    });
  }, [linhasComparativoJogo, kpiGrafico]);

  const isBRLKpiGrafico = ["ggr", "turnover", "bet_size", "arpu"].includes(kpiGrafico);

  const kpiGraficoDetalheConfig = useMemo(
    () => KPIS_DISPONIVEIS.find((k) => k.key === kpiGraficoDetalhe) ?? KPIS_DISPONIVEIS[0]!,
    [kpiGraficoDetalhe],
  );

  const isBRLKpiGraficoDetalhe = ["ggr", "turnover", "bet_size", "arpu"].includes(kpiGraficoDetalhe);

  const { dadosGraficoDetalheOperadoras, slugsGraficoDetalhe } = useMemo(() => {
    const k = kpiGraficoDetalhe;
    if (tabelaRows.length === 0) return { dadosGraficoDetalheOperadoras: [] as Record<string, unknown>[], slugsGraficoDetalhe: [] as string[] };

    const chrono = [...tabelaRows].reverse();
    const slugSet = new Set<string>();

    const rowsOut = chrono.map((r) => {
      const total = pickKpiMetricaDetalhe(r, k);
      const base: Record<string, unknown> = {
        label: r.label,
        dataIso: r.periodoIso,
        Total: total,
      };

      if (modoAgregadoTodasOperadoras && r.drillId != null) {
        const subs = historico
          ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, r.drillId, monthlyRawUnmerged)
          : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, normalizeMesasYmd(r.drillId));
        for (const sub of subs) {
          if (!podeVerOperadora(sub.operadora_slug)) continue;
          base[sub.operadora_slug] = pickKpiMetricaDetalhe(sub, k);
          slugSet.add(sub.operadora_slug);
        }
      } else if (filtroOperadora !== "todas") {
        base[filtroOperadora] = pickKpiMetricaDetalhe(r, k);
        slugSet.add(filtroOperadora);
      } else if (operadoraSlugsForcado != null && operadoraSlugsForcado.length > 0) {
        /** "Todas" no UI mas escopo fixo (ex.: operador) — mesmo breakdown por slug que no modo agregado. */
        const ym = historico
          ? r.drillId != null
            ? String(r.drillId).slice(0, 7)
            : r.periodoIso.slice(0, 7)
          : null;
        const dia = !historico
          ? normalizeMesasYmd(r.drillId != null ? String(r.drillId) : r.periodoIso)
          : null;
        const subs = historico
          ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, ym!, monthlyRawUnmerged)
          : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, dia!);
        for (const sub of subs) {
          if (!operadoraSlugsForcado.includes(sub.operadora_slug)) continue;
          if (!podeVerOperadora(sub.operadora_slug)) continue;
          base[sub.operadora_slug] = pickKpiMetricaDetalhe(sub, k);
          slugSet.add(sub.operadora_slug);
        }
      }
      return base;
    });

    return {
      dadosGraficoDetalheOperadoras: rowsOut,
      slugsGraficoDetalhe: [...slugSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }, [
    tabelaRows,
    kpiGraficoDetalhe,
    modoAgregadoTodasOperadoras,
    historico,
    dailyRawUnmerged,
    monthlyRawUnmerged,
    podeVerOperadora,
    filtroOperadora,
    operadoraSlugsForcado,
  ]);

  const coresOperadorasDetalhe = useMemo(() => {
    const m = new Map<string, string>();
    slugsGraficoDetalhe.forEach((slug, i) => {
      m.set(slug, PALETA_OPERADORAS_DETALHE[i % PALETA_OPERADORAS_DETALHE.length]!);
    });
    return m;
  }, [slugsGraficoDetalhe]);

  const minWidthTabelaComparativoJogo =
    120 + kpisAtivosComparativo.length * (100 + jogosComparativoAtivos.length * 90);

  const linhasMesaA = useMemo(() => {
    if (!compMesaA) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaA);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaA)
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaA]);

  const linhasMesaB = useMemo(() => {
    if (!compMesaB) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaB);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaB)
      .sort((a, b) => b.data_relatorio.localeCompare(a.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaB]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) {
      setCompMesaA("");
      setCompMesaB("");
      return;
    }
    setCompMesaA((prev) =>
      prev && mesasOpcoesBlackjack.some((x) => x.key === prev) ? prev : mesasOpcoesBlackjack[0]!.key,
    );
  }, [mesasOpcoesBlackjack]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) return;
    setCompMesaB((prev) => {
      if (prev && mesasOpcoesBlackjack.some((x) => x.key === prev) && prev !== compMesaA) return prev;
      const alt = mesasOpcoesBlackjack.find((x) => x.key !== compMesaA);
      return alt?.key ?? mesasOpcoesBlackjack[0]!.key;
    });
  }, [mesasOpcoesBlackjack, compMesaA]);

  const isHistoricoKpi = historico || dailyDataPrevMonth.length === 0;

  const brand = useDashboardBrand();

  const corTituloBlackjack = useMemo(
    () => getGameMesaTituloMix(GAME_IDENTITY_HEX.blackjack),
    [],
  );

  const vsBadgeStyle: React.CSSProperties = {
    padding: "5px 12px",
    borderRadius: 999,
    border: brand.useBrand
      ? "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 30%, transparent)"
      : "1px solid rgba(74,32,130,0.35)",
    background: brand.useBrand
      ? "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)"
      : "rgba(74,32,130,0.10)",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--brand-action, #7c3aed)",
    fontFamily: FONT.body,
    letterSpacing: "0.05em",
    textAlign: "center",
  };

  const contentBox = getPageContentBoxStyle(brand, t);

  const tituloMesaSpeedBaccarat = useMemo(
    () => getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.baccarat, { fontFamily: FONT.body }),
    [],
  );
  const tituloMesaRoleta = useMemo(
    () => getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.roleta, { fontFamily: FONT.body }),
    [],
  );
  const tituloMesaFutebolBrasileiro = useMemo(
    () =>
      getGameMesaTituloStripStyle(GAME_IDENTITY_HEX.futebol_brasileiro, {
        fontFamily: FONT.body,
        marginTop: 14,
      }),
    [],
  );

  const dataTable = useMemo(() => createDataTableBlockStyles(t, brand), [t, brand]);

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const refDatePosicionamento = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const carrosselAnteriorDisabled = useMemo(() => {
    if (aba === "posicionamento") return true;
    return historico || isPrimeiro;
  }, [aba, historico, isPrimeiro]);

  const carrosselProximoDisabled = useMemo(() => {
    if (aba === "posicionamento") return true;
    return historico || isUltimo;
  }, [aba, historico, isUltimo]);

  const labelCarrosselCentral =
    aba === "overview"
      ? historico
        ? "Todo o período"
        : (mesSelecionado?.label ?? "")
      : labelCarrosselPos("dia", refDatePosicionamento);

  const operadoraSlugPosicionamento = useMemo(() => {
    if (filtroOperadora !== "todas") return filtroOperadora;
    if (operadoraSlugsForcado?.length === 1) return operadoraSlugsForcado[0];
    if (escoposVisiveis.operadorasVisiveis.length === 1) {
      return escoposVisiveis.operadorasVisiveis[0];
    }
    if (showFiltroOperadora) return "todas";
    return operadoraSlugsForcado?.[0] ?? escoposVisiveis.operadorasVisiveis[0] ?? "blaze";
  }, [
    filtroOperadora,
    operadoraSlugsForcado,
    escoposVisiveis.operadorasVisiveis,
    showFiltroOperadora,
  ]);

  function irCarrosselAnterior() {
    if (aba === "posicionamento") return;
    irMesAnterior();
  }

  function irCarrosselProximo() {
    if (aba === "posicionamento") return;
    irMesProximo();
  }

  function selecionarAbaSpin(key: OverviewSpinTab) {
    setAba(key);
    if (key === "posicionamento") setHistorico(false);
  }

  const selectStyle: React.CSSProperties = {
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  const selectStyleSimple: React.CSSProperties = {
    ...selectStyle,
    padding: "7px 12px",
  };

  const labelMesaComparativoA = mesasOpcoesBlackjack.find((m) => m.key === compMesaA)?.label ?? "—";
  const labelMesaComparativoB = mesasOpcoesBlackjack.find((m) => m.key === compMesaB)?.label ?? "—";

  const chartTooltipTheme = useMemo(
    () => ({ cardBg: t.cardBg, cardBorder: t.cardBorder, text: t.text }),
    [t.cardBg, t.cardBorder, t.text],
  );

  const renderMesaDiaTabela = (
    linhas: LinhaMesaPorDia[],
    colTempo: "Data" | "Mês" = "Data",
    tituloTabela = "Mesa",
  ) => (
    <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
      <table style={getDataTableStyle({ minWidth: 560 })}>
        <caption style={{ display: "none" }}>
          {`Resultados de ${tituloTabela} — ${colTempo === "Mês" ? "histórico" : mesSelecionado?.label ?? ""}`}
        </caption>
        <thead>
          <tr>
            <th scope="col" style={dataTable.thHeaderSticky}>
              {colTempo}
            </th>
            <th scope="col" style={dataTable.thHeader}>
              GGR
            </th>
            <th scope="col" style={dataTable.thHeader}>
              Turnover
            </th>
            <th scope="col" style={dataTable.thHeader}>
              Apostas
            </th>
            <th scope="col" style={dataTable.thHeader}>
              Margem
            </th>
            <th scope="col" style={dataTable.thHeader}>
              Aposta média
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...dataTable.tdCenter, color: t.textMuted }}>
                {MSG_SEM_DADOS_FILTRO}
              </td>
            </tr>
          ) : (
            <>
              {(() => {
                const tot = totaisLinhasMesaPorDia(linhas);
                if (!tot) return null;
                const ggrT = tot.ggr ?? 0;
                return (
                  <tr
                    key={tot.dataIso}
                    style={{
                      background: dataTable.totalRowBgStrong,
                      borderBottom: `2px solid ${t.cardBorder}`,
                    }}
                  >
                    <td
                      style={{
                        ...dataTable.tdTotalSticky(),
                        color: brand.primary,
                        fontFamily: FONT.body,
                      }}
                    >
                      {tot.labelData}
                    </td>
                    <td
                      style={{
                        ...dataTable.tdTotal,
                        color: ggrT > 0 ? BRAND.verde : ggrT < 0 ? BRAND.vermelho : t.text,
                      }}
                    >
                      {tot.ggr != null ? fmtBRL(tot.ggr) : "—"}
                    </td>
                    <td style={dataTable.tdTotal}>
                      {tot.turnover != null ? fmtBRL(tot.turnover) : "—"}
                    </td>
                    <td style={dataTable.tdTotal}>
                      {tot.bets != null ? tot.bets.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td style={dataTable.tdTotal}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <MarginBadge value={tot.margin_pct} />
                      </div>
                    </td>
                    <td style={dataTable.tdTotal}>
                      {tot.bet_size != null ? fmtBRL(Number(tot.bet_size)) : "—"}
                    </td>
                  </tr>
                );
              })()}
              {linhas.map((row, i) => {
                const ggr = row.ggr ?? 0;
                return (
                  <tr key={row.dataIso} style={{ background: dataTable.zebraRow(i) }}>
                    <td style={dataTable.tdSticky({ rowIndex: i })}>{row.labelData}</td>
                    <td
                      style={{
                        ...dataTable.tdCenter,
                        color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                        fontWeight: 600,
                      }}
                    >
                      {row.ggr != null ? fmtBRL(row.ggr) : "—"}
                    </td>
                    <td style={dataTable.tdCenter}>
                      {row.turnover != null ? fmtBRL(row.turnover) : "—"}
                    </td>
                    <td style={dataTable.tdCenter}>
                      {row.bets != null ? row.bets.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td style={dataTable.tdCenter}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <MarginBadge value={row.margin_pct} />
                      </div>
                    </td>
                    <td style={dataTable.tdCenter}>
                      {row.bet_size != null ? fmtBRL(Number(row.bet_size)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderDetalhamentoInterativo = (colTempoLabel: "Data" | "Mês") => (
    <>
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
          {modoVisualizacaoDetalhe === "grafico" && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {KPIS_DISPONIVEIS.map((kpi) => {
                  const ativo = kpiGraficoDetalhe === kpi.key;
                  return (
                    <button
                      type="button"
                      key={kpi.key}
                      role="button"
                      aria-pressed={ativo}
                      aria-label={`KPI do gráfico: ${kpi.label}`}
                      onClick={() => setKpiGraficoDetalhe(kpi.key)}
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
                        border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                        background: ativo ? `color-mix(in srgb, ${brand.accent} 12%, transparent)` : "transparent",
                        color: ativo ? brand.accent : t.textMuted,
                        transition: "all 0.15s",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: ativo ? brand.accent : t.cardBorder,
                          flexShrink: 0,
                          transition: "background 0.15s",
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
              aria-pressed={modoVisualizacaoDetalhe === modo}
              onClick={() => setModoVisualizacaoDetalhe(modo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 11,
                fontWeight: modoVisualizacaoDetalhe === modo ? 700 : 400,
                background:
                  modoVisualizacaoDetalhe === modo
                    ? `color-mix(in srgb, ${brand.accent} 12%, transparent)`
                    : "transparent",
                color: modoVisualizacaoDetalhe === modo ? brand.accent : t.textMuted,
                transition: "all 0.15s",
                borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {modoVisualizacaoDetalhe === "tabela" ? (
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
          <table style={getDataTableStyle({ minWidth: 720 })}>
            <caption style={{ display: "none" }}>
              {historico ? "Detalhamento mensal consolidado" : "Detalhamento diário consolidado"}
            </caption>
            <thead>
              <tr>
                <th scope="col" style={dataTable.thHeaderSticky}>
                  {colTempoLabel}
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  GGR
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Turnover
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Apostas
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Margem
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  Aposta média
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  UAP
                </th>
                <th scope="col" style={dataTable.thHeader}>
                  ARPU
                </th>
              </tr>
            </thead>
            <tbody>
              {tabelaRows.map((r, i) => {
                const ggr = r.ggr ?? 0;
                const drillId = r.drillId;
                const isDrillParent = modoAgregadoTodasOperadoras && drillId != null;
                const aberto = drillId != null && expandedDetalhe.has(drillId);
                const subLinhas =
                  isDrillParent && aberto
                    ? (
                        historico
                          ? agregaDailyRawPorOperadoraNoMes(dailyRawUnmerged, drillId, monthlyRawUnmerged)
                          : agregaDailyRawPorOperadoraNoDia(dailyRawUnmerged, normalizeMesasYmd(drillId))
                      ).filter((sl) => podeVerOperadora(sl.operadora_slug))
                    : [];
                const rowKey = drillId ?? `${r.label}-${i}`;
                return (
                  <Fragment key={rowKey}>
                    <tr style={{ background: dataTable.zebraRow(i) }}>
                      <td style={dataTable.tdSticky({ rowIndex: i })}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          {isDrillParent ? (
                            <button
                              type="button"
                              aria-expanded={aberto}
                              aria-label={
                                aberto
                                  ? `Recolher detalhe por operadora — ${r.label}`
                                  : `Expandir detalhe por operadora — ${r.label}`
                              }
                              onClick={() => {
                                setExpandedDetalhe((prev) => {
                                  const n = new Set(prev);
                                  if (n.has(drillId)) n.delete(drillId);
                                  else n.add(drillId);
                                  return n;
                                });
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: t.text,
                                fontFamily: FONT.body,
                                fontWeight: 600,
                                padding: 0,
                                textAlign: "center",
                              }}
                            >
                              <ChevronDown
                                size={16}
                                aria-hidden
                                style={{
                                  transform: aberto ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 0.15s ease",
                                  flexShrink: 0,
                                }}
                              />
                              {r.label}
                            </button>
                          ) : (
                            r.label
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          ...dataTable.tdCenter,
                          color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                          fontWeight: 600,
                        }}
                      >
                        {r.ggr != null ? fmtBRL(r.ggr) : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.turnover != null ? fmtBRL(r.turnover) : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <MarginBadge value={r.margin_pct} />
                        </div>
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.bet_size != null ? fmtBRL(Number(r.bet_size)) : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}
                      </td>
                      <td style={dataTable.tdCenter}>
                        {r.arpu != null ? fmtBRL(Number(r.arpu)) : "—"}
                      </td>
                    </tr>
                    {isDrillParent &&
                      aberto &&
                      subLinhas.map((sl, j) => {
                        const gg = sl.ggr ?? 0;
                        return (
                          <tr
                            key={`${rowKey}-${sl.operadora_slug}`}
                            style={{
                              background: dataTable.zebraRow(i + j + 1, "action"),
                              borderTop: j === 0 ? `1px solid ${t.cardBorder}` : undefined,
                            }}
                          >
                            <th
                              scope="row"
                              style={{
                                ...dataTable.tdSticky({
                                  rowIndex: i + j + 1,
                                  paddingLeft: 32,
                                  stripeAccent: "action",
                                }),
                                boxShadow: `${dataTable.shadow}, inset 3px 0 0 color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)`,
                                textAlign: "center",
                              }}
                            >
                              {slugToNome(sl.operadora_slug)}
                            </th>
                            <td
                              style={{
                                ...dataTable.tdCenter,
                                color: gg > 0 ? BRAND.verde : gg < 0 ? BRAND.vermelho : t.text,
                                fontWeight: 600,
                              }}
                            >
                              {sl.ggr != null ? fmtBRL(sl.ggr) : "—"}
                            </td>
                            <td style={dataTable.tdCenter}>
                              {sl.turnover != null ? fmtBRL(sl.turnover) : "—"}
                            </td>
                            <td style={dataTable.tdCenter}>
                              {sl.bets != null ? sl.bets.toLocaleString("pt-BR") : "—"}
                            </td>
                            <td style={dataTable.tdCenter}>
                              <div style={{ display: "flex", justifyContent: "center" }}>
                                <MarginBadge value={sl.margin_pct} />
                              </div>
                            </td>
                            <td style={dataTable.tdCenter}>
                              {sl.bet_size != null ? fmtBRL(sl.bet_size) : "—"}
                            </td>
                            <td style={dataTable.tdCenter}>
                              {sl.uap != null ? sl.uap.toLocaleString("pt-BR") : "—"}
                            </td>
                            <td style={dataTable.tdCenter}>
                              {sl.arpu != null ? fmtBRL(sl.arpu) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : dadosGraficoDetalheOperadoras.length === 0 || slugsGraficoDetalhe.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          {MSG_SEM_DADOS_FILTRO}
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: 11,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            Exibindo <strong style={{ color: t.text }}>{kpiGraficoDetalheConfig.label}</strong> por operadora
          </p>
          <div
            role="img"
            aria-label={`Gráfico de ${kpiGraficoDetalheConfig.label} por operadora — ${historico ? "todo o período" : mesSelecionado?.label ?? ""}`}
            style={{ width: "100%", height: "clamp(220px, 35vh, 420px)", minHeight: 220 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {kpiGraficoDetalheConfig.tipoGrafico === "barra" ? (
                <BarChart
                  data={dadosGraficoDetalheOperadoras as Record<string, string | number | null>[]}
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
                    width={isBRLKpiGraficoDetalhe ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGraficoDetalhe ? `R$${(v / 1000).toFixed(0)}K` : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <TooltipDetalheOperadoras
                        theme={chartTooltipTheme}
                        kpiGraficoDetalhe={kpiGraficoDetalhe}
                        somavel={kpiGraficoDetalheConfig.somavel}
                        isBRL={isBRLKpiGraficoDetalhe}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  {slugsGraficoDetalhe.map((slug) => (
                    <Bar
                      key={slug}
                      dataKey={slug}
                      name={slugToNome(slug)}
                      fill={coresOperadorasDetalhe.get(slug) ?? "var(--brand-action, #7c3aed)"}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart
                  data={dadosGraficoDetalheOperadoras as Record<string, string | number | null>[]}
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
                    width={isBRLKpiGraficoDetalhe ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGraficoDetalhe
                        ? `R$${(v / 1000).toFixed(0)}K`
                        : kpiGraficoDetalhe === "margin_pct"
                          ? `${v.toFixed(0)}%`
                          : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <TooltipDetalheOperadoras
                        theme={chartTooltipTheme}
                        kpiGraficoDetalhe={kpiGraficoDetalhe}
                        somavel={kpiGraficoDetalheConfig.somavel}
                        isBRL={isBRLKpiGraficoDetalhe}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  {slugsGraficoDetalhe.map((slug) => (
                    <Line
                      key={slug}
                      type="monotone"
                      name={slugToNome(slug)}
                      dataKey={slug}
                      stroke={coresOperadorasDetalhe.get(slug) ?? "var(--brand-action, #7c3aed)"}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );

  const renderComparativoJogoInterativo = (colTempoLabel: "Data" | "Mês") => (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                marginRight: 2,
              }}
            >
              KPIs visíveis:
            </span>
            {KPIS_DISPONIVEIS.map((kpi) => {
              const ativo =
                modoVisualizacao === "tabela"
                  ? kpisSelecionados.has(kpi.key)
                  : kpiGrafico === kpi.key;
              return (
                <button
                  type="button"
                  role="button"
                  key={kpi.key}
                  aria-pressed={ativo}
                  aria-label={
                    modoVisualizacao === "tabela"
                      ? `${ativo ? "Desativar" : "Ativar"} KPI ${kpi.label}`
                      : `KPI do gráfico: ${kpi.label}`
                  }
                  onClick={() => {
                    if (modoVisualizacao === "tabela") {
                      setKpisSelecionados((prev) => {
                        const next = new Set(prev);
                        if (next.has(kpi.key) && next.size === 1) return prev;
                        if (next.has(kpi.key)) next.delete(kpi.key);
                        else next.add(kpi.key);
                        return next;
                      });
                    } else {
                      setKpiGrafico(kpi.key);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 14px",
                    minHeight: 40,
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 12,
                    fontWeight: ativo ? 700 : 500,
                    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                    background: ativo
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                        : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                      : (t.inputBg ?? t.cardBg),
                    color: ativo ? brand.accent : t.textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ativo ? brand.accent : t.cardBorder,
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  />
                  {kpi.label}
                </button>
              );
            })}
          </div>
          {modoVisualizacao === "grafico" && (
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
              Selecione um KPI para o gráfico
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            overflow: "hidden",
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
              aria-pressed={modoVisualizacao === modo}
              onClick={() => setModoVisualizacao(modo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 11,
                fontWeight: modoVisualizacao === modo ? 700 : 400,
                background:
                  modoVisualizacao === modo ? `color-mix(in srgb, ${brand.accent} 12%, transparent)` : "transparent",
                color: modoVisualizacao === modo ? brand.accent : t.textMuted,
                transition: "all 0.15s",
                borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {modoVisualizacao === "tabela" ? (
        <div className="app-table-wrap app-table-wrap--sticky-col" style={getDataTableWrapStyle()}>
            <table style={getDataTableStyle({ minWidth: minWidthTabelaComparativoJogo })}>
              <caption style={{ display: "none" }}>
                Comparativo de jogo {colTempoLabel === "Mês" ? "histórico" : (mesSelecionado?.label ?? "")}
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" style={dataTable.thHeaderSticky}>
                    {colTempoLabel}
                  </th>
                  {kpisAtivosComparativo.map((kpi) => (
                    <th
                      key={kpi.key}
                      colSpan={qtdColunasJogoComparativo}
                      scope="colgroup"
                      style={{
                        ...dataTable.thHeader,
                        borderLeft: `2px solid ${t.cardBorder}`,
                        borderBottom: "none",
                      }}
                    >
                      {kpi.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {kpisAtivosComparativo.map((kpi) => (
                    <Fragment key={`sub-${kpi.key}`}>
                      <th
                        scope="col"
                        style={{
                          ...dataTable.thHeaderSub,
                          borderLeft: `2px solid ${t.cardBorder}`,
                          color: t.text,
                        }}
                      >
                        Total
                      </th>
                      {jogosComparativoAtivos.map((jogo) => (
                        <th
                          key={jogo.key}
                          scope="col"
                          style={{
                            ...dataTable.thHeaderSub,
                            color: jogo.cor,
                          }}
                        >
                          {jogo.label}
                        </th>
                      ))}
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhaTotaisComparativoJogo != null && (() => {
                  const row = linhaTotaisComparativoJogo;
                  const totaisOficiais = row.totaisOficiais;
                  return (
                    <tr
                      key="__totais-comparativo-jogo__"
                      style={{
                        background: dataTable.totalRowBgStrong,
                        borderBottom: `2px solid ${t.cardBorder}`,
                      }}
                    >
                      <th
                        scope="row"
                        style={{
                          ...dataTable.tdTotalSticky(),
                          color: brand.primary,
                          fontFamily: FONT.body,
                        }}
                      >
                        Total
                      </th>
                      {kpisAtivosComparativo.map((kpi) => (
                        <Fragment key={`tot-${kpi.key}`}>
                          <td
                            style={{
                              ...dataTable.tdTotal,
                              borderLeft: `2px solid ${t.cardBorder}`,
                              color: t.text,
                            }}
                          >
                            {renderValorKpiComparativo(kpi, totaisOficiais[kpi.key])}
                          </td>
                          {jogosComparativoAtivos.map((jogo) => {
                            const cel = row[jogo.key];
                            const valorJogo = cel[kpi.key] as number | null;
                            const pct = calcularPctComparativoOficial(valorJogo, row, kpi);
                            return (
                              <td
                                key={jogo.key}
                                style={{
                                  ...dataTable.tdTotal,
                                  color: jogo.cor,
                                }}
                              >
                                {valorJogo != null ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <span>{renderValorKpiComparativo(kpi, valorJogo)}</span>
                                    {kpi.somavel && pct != null && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: t.textMuted,
                                          fontWeight: 700,
                                          opacity: 0.75,
                                        }}
                                      >
                                        {pct.toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tr>
                  );
                })()}
                {linhasComparativoJogo.map((row, i) => {
                  const totaisOficiais = row.totaisOficiais;
                  return (
                    <tr key={row.dataIso} style={{ background: dataTable.zebraRow(i) }}>
                      <th scope="row" style={dataTable.tdSticky({ rowIndex: i })}>
                        {row.labelData}
                      </th>
                      {kpisAtivosComparativo.map((kpi) => (
                        <Fragment key={`${row.dataIso}-${kpi.key}`}>
                          <td
                            style={{
                              ...dataTable.tdCenter,
                              borderLeft: `2px solid ${t.cardBorder}`,
                              fontWeight: 700,
                              color: t.text,
                            }}
                          >
                            {renderValorKpiComparativo(kpi, totaisOficiais[kpi.key])}
                          </td>
                          {jogosComparativoAtivos.map((jogo) => {
                            const cel = row[jogo.key];
                            const valorJogo = cel[kpi.key] as number | null;
                            const pct = calcularPctComparativoOficial(valorJogo, row, kpi);
                            return (
                              <td
                                key={jogo.key}
                                style={{
                                  ...dataTable.tdCenter,
                                  color: jogo.cor,
                                  fontWeight: 600,
                                }}
                              >
                                {valorJogo != null ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <span>{renderValorKpiComparativo(kpi, valorJogo)}</span>
                                    {kpi.somavel && pct != null && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: t.textMuted,
                                          fontWeight: 700,
                                          opacity: 0.75,
                                        }}
                                      >
                                        {pct.toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
      ) : linhasComparativoJogo.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          {MSG_SEM_DADOS_FILTRO}
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: 11,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            Exibindo <strong style={{ color: t.text }}>{kpiGraficoConfig.label}</strong> por jogo
          </p>
          <div
            role="img"
            aria-label={`Gráfico de ${kpiGraficoConfig.label} por jogo — ${historico ? "todo o período" : mesSelecionado?.label ?? ""}`}
            style={{ width: "100%", height: "clamp(220px, 35vh, 420px)", minHeight: 220 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {kpiGraficoConfig.tipoGrafico === "barra" ? (
                <BarChart
                  data={dadosGraficoComparativoJogo}
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
                    width={isBRLKpiGrafico ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGrafico ? `R$${(v / 1000).toFixed(0)}K` : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <TooltipComparativoJogo
                        theme={chartTooltipTheme}
                        kpiGrafico={kpiGrafico}
                        somavel={kpiGraficoConfig.somavel}
                        isBRL={isBRLKpiGrafico}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  {jogosComparativoAtivos.map((jogo) => (
                    <Bar
                      key={jogo.key}
                      dataKey={jogo.label}
                      fill={jogo.cor}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart
                  data={dadosGraficoComparativoJogo}
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
                    width={isBRLKpiGrafico ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGrafico
                        ? `R$${(v / 1000).toFixed(0)}K`
                        : kpiGrafico === "margin_pct"
                          ? `${v.toFixed(0)}%`
                          : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <TooltipComparativoJogo
                        theme={chartTooltipTheme}
                        kpiGrafico={kpiGrafico}
                        somavel={kpiGraficoConfig.somavel}
                        isBRL={isBRLKpiGrafico}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  {jogosComparativoAtivos.map((jogo) => (
                    <Line
                      key={jogo.key}
                      type="monotone"
                      name={jogo.label}
                      dataKey={jogo.label}
                      stroke={jogo.cor}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="mesas_spin" />}
        title={getPageMenuLabel("mesas_spin")}
        subtitle={getPageCanonicalSubtitle("mesas_spin")}
        brand={brand}
        t={t}
      />

      <div style={getPageFilterBoxStyle(brand, t)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {aba !== "posicionamento" ? (
              <button
                type="button"
                aria-label="Mês anterior"
                style={getCarouselBtnNavStyle(t, carrosselAnteriorDisabled)}
                onClick={irCarrosselAnterior}
                disabled={carrosselAnteriorDisabled}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
            ) : (
              <span style={{ width: CAROUSEL_NAV_BTN_PX, flexShrink: 0 }} aria-hidden />
            )}
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: "min(100%, 180px)" })}>
              {labelCarrosselCentral}
            </span>
            {aba !== "posicionamento" ? (
              <button
                type="button"
                aria-label="Próximo mês"
                style={getCarouselBtnNavStyle(t, carrosselProximoDisabled)}
                onClick={irCarrosselProximo}
                disabled={carrosselProximoDisabled}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <span style={{ width: CAROUSEL_NAV_BTN_PX, flexShrink: 0 }} aria-hidden />
            )}

            {aba === "overview" ? (
              <FiltroHistoricoButton active={historico} onClick={toggleHistorico} />
            ) : null}

            {showFiltroOperadora && (
              <FiltroOperadoraSelect
                value={filtroOperadora}
                onChange={setFiltroOperadora}
                operadoras={operadorasOcr}
                podeVerOperadora={podeVerOperadora}
              />
            )}

            {aba === "overview" && loading && (
              <span
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Clock size={12} aria-hidden />
                Carregando…
              </span>
            )}
          </div>

          <OverviewSpinAbaNav aba={aba} onSelectAba={selecionarAbaSpin} />
      </div>

      <div role="tabpanel" id={`panel-overview-spin-${aba}`} aria-labelledby={`tab-overview-spin-${aba}`}>
      {aba === "overview" && (
      <>
      <div style={contentBox}>
          <SectionTitle
            sub={
              historico
                ? "acumulado"
                : "comparativo MTD vs mesmo período do mês anterior"
            }
          >
            KPIs Consolidados
          </SectionTitle>
          {loading ? (
            modoAgregadoTodasOperadoras ? (
              <>
                <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <SkeletonKpiCard key={`a-${i}`} />
                  ))}
                </div>
                <div className="app-grid-kpi-4" style={{ gap: 12 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonKpiCard key={`b-${i}`} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonKpiCard key={i} />
                  ))}
                </div>
                <div className="app-grid-kpi-3" style={{ gap: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <SkeletonKpiCard key={i} />
                  ))}
                </div>
              </>
            )
          ) : modoAgregadoTodasOperadoras ? (
            <>
              <div className="app-grid-kpi-3" style={{ gap: 12, marginBottom: 12 }}>
                <KpiCard
                  label="GGR"
                  value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
                  icon={<TrendingUp size={16} />}
                  accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
                  atual={nKpi(kpiExibir?.ggr)}
                  anterior={nKpi(kpiAntExibir?.ggr)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Turnover"
                  value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
                  icon={<ArrowUpDown size={16} />}
                  accentVar="--brand-contrast"
                  accentColor={BRAND.roxoVivo}
                  atual={nKpi(kpiExibir?.turnover)}
                  anterior={nKpi(kpiAntExibir?.turnover)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Margem"
                  value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
                  icon={<Percent size={16} />}
                  accentColor={BRAND.amarelo}
                  atual={nKpi(kpiExibir?.margin_pct)}
                  anterior={nKpi(kpiAntExibir?.margin_pct)}
                  isHistorico={isHistoricoKpi}
                />
              </div>
              <div className="app-grid-kpi-4" style={{ gap: 12 }}>
                <KpiCard
                  label="Apostas"
                  value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
                  icon={<Hash size={16} aria-hidden />}
                  accentVar="--brand-action"
                  accentColor={BRAND.azul}
                  atual={nKpi(kpiExibir?.bets)}
                  anterior={nKpi(kpiAntExibir?.bets)}
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Aposta média"
                  value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
                  icon={<ChartColumnBig size={16} />}
                  accentVar="--brand-contrast"
                  accentColor={BRAND.ciano}
                  atual={nKpi(kpiExibir?.bet_size)}
                  anterior={nKpi(kpiAntExibir?.bet_size)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="UAP"
                  value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
                  icon={<Users size={16} />}
                  accentVar="--brand-icon-color"
                  accentColor={BRAND.roxo}
                  atual={nKpi(kpiExibir?.uap)}
                  anterior={nKpi(kpiAntExibir?.uap)}
                  isHistorico={isHistoricoKpi}
                  vsLegendaSuffix={KPI_UAP_VS_LEGENDA}
                />
                <KpiCard
                  label="ARPU"
                  value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
                  icon={<CircleDollarSign size={16} />}
                  accentVar="--brand-icon-color"
                  accentColor={BRAND.roxoVivo}
                  atual={nKpi(kpiExibir?.arpu)}
                  anterior={nKpi(kpiAntExibir?.arpu)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
              </div>
            </>
          ) : (
            <>
              <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
                <KpiCard
                  label="GGR"
                  value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
                  icon={<TrendingUp size={16} />}
                  accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
                  atual={nKpi(kpiExibir?.ggr)}
                  anterior={nKpi(kpiAntExibir?.ggr)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Turnover"
                  value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
                  icon={<ArrowUpDown size={16} />}
                  accentVar="--brand-contrast"
                  accentColor={BRAND.roxoVivo}
                  atual={nKpi(kpiExibir?.turnover)}
                  anterior={nKpi(kpiAntExibir?.turnover)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Apostas"
                  value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
                  icon={<Hash size={16} aria-hidden />}
                  accentVar="--brand-action"
                  accentColor={BRAND.azul}
                  atual={nKpi(kpiExibir?.bets)}
                  anterior={nKpi(kpiAntExibir?.bets)}
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="Margem"
                  value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
                  icon={<Percent size={16} />}
                  accentColor={BRAND.amarelo}
                  atual={nKpi(kpiExibir?.margin_pct)}
                  anterior={nKpi(kpiAntExibir?.margin_pct)}
                  isHistorico={isHistoricoKpi}
                />
              </div>
              <div className="app-grid-kpi-3" style={{ gap: 12 }}>
                <KpiCard
                  label="Aposta média"
                  value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
                  icon={<ChartColumnBig size={16} />}
                  accentVar="--brand-contrast"
                  accentColor={BRAND.ciano}
                  atual={nKpi(kpiExibir?.bet_size)}
                  anterior={nKpi(kpiAntExibir?.bet_size)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
                <KpiCard
                  label="UAP"
                  value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
                  icon={<Users size={16} />}
                  accentVar="--brand-icon-color"
                  accentColor={BRAND.roxo}
                  atual={nKpi(kpiExibir?.uap)}
                  anterior={nKpi(kpiAntExibir?.uap)}
                  isHistorico={isHistoricoKpi}
                  vsLegendaSuffix={KPI_UAP_VS_LEGENDA}
                />
                <KpiCard
                  label="ARPU"
                  value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
                  icon={<CircleDollarSign size={16} />}
                  accentVar="--brand-icon-color"
                  accentColor={BRAND.roxoVivo}
                  atual={nKpi(kpiExibir?.arpu)}
                  anterior={nKpi(kpiAntExibir?.arpu)}
                  isBRL
                  isHistorico={isHistoricoKpi}
                />
              </div>
            </>
          )}
        </div>

      <div style={contentBox}>
        <SectionTitle sub={historico ? "mês a mês" : "dia a dia"}>
          {historico ? "Detalhamento Mensal" : "Detalhamento Diário"}
        </SectionTitle>

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: t.textMuted,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
            <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
          </div>
        ) : tabelaRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          renderDetalhamentoInterativo(historico ? "Mês" : "Data")
        )}
      </div>

      {!historico && (
        <>
          {loading ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: t.textMuted,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                  <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : porTabelaRows.length === 0 ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={contentBox}>
                <SectionTitle sub={mesSelecionado?.label}>
                  Comparativo de Jogo
                </SectionTitle>
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  renderComparativoJogoInterativo("Data")
                )}
              </div>

              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>

                    {mesasOpcoesBlackjack.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <>
                    <div className="app-conversao-vs-row">
                      <select
                        value={compMesaA}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaA(v);
                          if (v && v === compMesaB) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaB(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaA ? corTituloBlackjack.borderMix : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                      <div style={vsBadgeStyle}>VS</div>
                      <select
                        value={compMesaB}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaB(v);
                          if (v && v === compMesaA) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaA(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaB ? corTituloBlackjack.borderMix : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {(compMesaA || compMesaB) && (
                      <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: corTituloBlackjack.bg,
                            border: corTituloBlackjack.border,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: corTituloBlackjack.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoA}
                        </div>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: corTituloBlackjack.bg,
                            border: corTituloBlackjack.border,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: corTituloBlackjack.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoB}
                        </div>
                      </div>
                    )}

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaA, "Data", labelMesaComparativoA)}
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaB, "Data", labelMesaComparativoB)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={contentBox}>
                <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                  Dados por mesa
                </SectionTitle>

                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={tituloMesaSpeedBaccarat}>
                      Speed Baccarat
                    </div>
                    {renderMesaDiaTabela(linhasSpeedBaccarat, "Data", "Speed Baccarat")}
                  </div>
                  <div
                    className="app-conversao-funil-divider"
                    style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={tituloMesaRoleta}>
                      Roleta
                    </div>
                    {renderMesaDiaTabela(linhasRoleta, "Data", "Roleta")}
                  </div>
                </div>
                {exibirBlocoDadosPorMesaFutebol && (
                  <div style={{ marginTop: 4 }}>
                    <div style={tituloMesaFutebolBrasileiro}>{LABEL_FUTEBOL_BRASILEIRO}</div>
                    {renderMesaDiaTabela(linhasFutebolBrasileiro, "Data", LABEL_FUTEBOL_BRASILEIRO)}
                  </div>
                )}
              </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {historico && (
        <>
          {loading ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: t.textMuted,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                  <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: t.textMuted,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 size={18} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                      <span style={{ fontSize: 12, fontFamily: FONT.body }}>Carregando…</span>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : porTabelaHistAll.length === 0 ? (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>
                    <div
                      style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                    >
                      {MSG_SEM_DADOS_FILTRO}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={contentBox}>
                <SectionTitle sub="mês a mês">
                  Comparativo de Jogo
                </SectionTitle>
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  renderComparativoJogoInterativo("Mês")
                )}
              </div>

              {!modoAgregadoTodasOperadoras && (
                <>
                  <div style={contentBox}>
                    <SectionTitle sub="Escolha duas mesas de Blackjack para ver os resultados">
                      Comparativo de mesa
                    </SectionTitle>

                    {mesasOpcoesBlackjack.length === 0 ? (
                      <div
                        style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}
                      >
                        {MSG_SEM_DADOS_FILTRO}
                      </div>
                    ) : (
                      <>
                        <div className="app-conversao-vs-row">
                          <select
                            value={compMesaA}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCompMesaA(v);
                              if (v && v === compMesaB) {
                                const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                                if (o) setCompMesaB(o.key);
                              }
                            }}
                            style={{
                              ...selectStyleSimple,
                              borderColor: compMesaA ? corTituloBlackjack.borderMix : undefined,
                              width: "100%",
                            }}
                          >
                            {mesasOpcoesBlackjack
                              .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                              .map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                          <div style={vsBadgeStyle}>VS</div>
                          <select
                            value={compMesaB}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCompMesaB(v);
                              if (v && v === compMesaA) {
                                const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                                if (o) setCompMesaA(o.key);
                              }
                            }}
                            style={{
                              ...selectStyleSimple,
                              borderColor: compMesaB ? corTituloBlackjack.borderMix : undefined,
                              width: "100%",
                            }}
                          >
                            {mesasOpcoesBlackjack
                              .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                              .map((m) => (
                                <option key={m.key} value={m.key}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {(compMesaA || compMesaB) && (
                          <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                            <div
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                background: corTituloBlackjack.bg,
                                border: corTituloBlackjack.border,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                color: corTituloBlackjack.accent,
                                fontFamily: FONT.body,
                              }}
                            >
                              {labelMesaComparativoA}
                            </div>
                            <div
                              style={{
                                padding: "6px 12px",
                                borderRadius: 10,
                                background: corTituloBlackjack.bg,
                                border: corTituloBlackjack.border,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                color: corTituloBlackjack.accent,
                                fontFamily: FONT.body,
                              }}
                            >
                              {labelMesaComparativoB}
                            </div>
                          </div>
                        )}

                        <div className="app-conversao-funil-duo">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {renderMesaDiaTabela(linhasMesaA, "Mês", labelMesaComparativoA)}
                          </div>
                          <div
                            className="app-conversao-funil-divider"
                            style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {renderMesaDiaTabela(linhasMesaB, "Mês", labelMesaComparativoB)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={contentBox}>
                    <SectionTitle sub="Baccarat, Roleta e Futebol Brasileiro">
                      Dados por mesa
                    </SectionTitle>

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={tituloMesaSpeedBaccarat}>
                          Speed Baccarat
                        </div>
                        {renderMesaDiaTabela(linhasSpeedBaccarat, "Mês", "Speed Baccarat")}
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={tituloMesaRoleta}>
                          Roleta
                        </div>
                        {renderMesaDiaTabela(linhasRoleta, "Mês", "Roleta")}
                      </div>
                    </div>
                    {exibirBlocoDadosPorMesaFutebol && (
                      <div style={{ marginTop: 4 }}>
                        <div style={tituloMesaFutebolBrasileiro}>{LABEL_FUTEBOL_BRASILEIRO}</div>
                        {renderMesaDiaTabela(linhasFutebolBrasileiro, "Mês", LABEL_FUTEBOL_BRASILEIRO)}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      </>
      )}
      {aba === "posicionamento" && (
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
                color: t.textMuted,
                gap: 8,
                fontFamily: FONT.body,
                fontSize: 13,
              }}
            >
              <Loader2
                size={20}
                className="app-lucide-spin"
                color="var(--brand-action, #7c3aed)"
                aria-hidden="true"
              />
              Carregando…
            </div>
          }
        >
          <DashboardPosicionamento
            operadoraSlug={operadoraSlugPosicionamento}
            refDate={refDatePosicionamento}
            slugToNome={slugToNome}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}
