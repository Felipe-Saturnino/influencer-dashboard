import { useState, useEffect, useMemo, type ReactNode } from "react"
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { useDashboardCatalogos } from "../../../hooks/useDashboardCatalogos"
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros"
import { usePermission } from "../../../hooks/usePermission"
import { FONT } from "../../../constants/theme"
import { getCarouselBtnNavStyle, getCarouselPeriodLabelStyle } from "../../../lib/carouselNavStyles"
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants"
import {
  fmtBRL,
  getIdxMesCarrosselPadrao,
  getMesesDisponiveis,
  getOntemIsoLocal,
  getPeriodoComparativoMoM,
  isCarrosselMesCivilAtual,
} from "../../../lib/dashboardHelpers"
import { useDataTableBlock } from "../../../hooks/useDataTableBlock"
import { useRouteTab } from "../../../hooks/useRouteTab"
import { getDataTableWrapStyle, getDataTableStyle } from "../../../lib/dataTableStyles"
import {
  DashboardPageHeader,
  FiltroHistoricoButton,
  FiltroOperadoraSelect,
  SectionTitle,
  SkeletonKpiCard,
  KpiCardDepositos,
  SortTableTh,
  FiltroBarTabButton,
  type SortDir,
} from "../../../components/dashboard"
import { PageMenuIcon } from "../../../components/PageMenuIcon"
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu"
import {
  PAGE_CONTENT_BOX_GAP,
  getPageContentBoxStyle,
  getPageFilterBoxStyle,
} from "../../../lib/pageContentBoxStyles"
import { FILTRO_BAR_TAB_ICON_SIZE, handleFiltroBarTabsArrowKeyDown } from "../../../lib/filterBarStyles"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/supabasePaginate"
import { ArrowDownToLine, ArrowUpFromLine, Bookmark, Clock, Heart, MessageCircle, Mic, Megaphone, MousePointerClick, Percent, Play, Sparkles, ChevronLeft, ChevronRight, Trophy, TrendingUp, CircleDollarSign, UserPlus, Eye } from "lucide-react"
import {
  COR_FUNIL_A,
  COR_FUNIL_B,
  FunilSocialTresNiveis,
  PostCarouselThumb,
  SocialKpiCard,
  TAB_ICONS,
  TAB_LABELS,
  cmpNullableNum,
  fmtComparativoMoM,
  fmtNum,
  fmtPct,
  fmtPctCamp,
  fmtPeriodoSerieCell,
  fmtPostPublicacao,
  ggrCampanha,
  ordenarPostsRecentes,
  pctCamp,
  postStatPill,
  sumCampanhasPerf,
  aggregateBoostedPostsByAd,
  totaisFromMetaAdsRows,
  totaisFromKpiRows,
  youtubeEngagementFromVideoSnapshots,
  type YoutubeVideoRowLite,
  type MetaAdsDaily,
  type MetaBoostedPost,
  type BoostSortCol,
  MES_INICIO,
  type CampCmpSortCol,
  type CampanhaPerfRow,
  type FunilSerieRow,
  type KpiDaily,
  type PostUnificado,
  type SocialMediaTab,
  type TaxCmpSortCol,
} from "./socialMediaBlocks";

export default function SocialMediaDashboard() {
  const { theme: t, isDark } = useApp();
  const perm = usePermission("dash_midias_sociais");
  const {
    showFiltroOperadora,
    podeVerOperadora,
    operadoraSlugsForcado,
  } = useDashboardFiltros();
  const [filtroOperadora, setFiltroOperadora] = useState("todas");
  const { operadoras: operadorasList } = useDashboardCatalogos();

  const operadoraParaRpc =
    operadoraSlugsForcado?.[0] ??
    (filtroOperadora !== "todas" ? filtroOperadora : null);
  const showColunaOperadora = showFiltroOperadora && filtroOperadora === "todas";

  const operadoraNomePorSlug = useMemo(() => {
    const map = new Map<string, string>();
    operadorasList.forEach((o) => map.set(o.slug, o.nome));
    return map;
  }, [operadorasList]);

  // ── Navegação por meses (padrão Overview) ─────────────────────────────────
  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(MES_INICIO), []);
  const idxInicial = useMemo(() => getIdxMesCarrosselPadrao(mesesDisponiveis), [mesesDisponiveis]);
  const [idxMes, setIdxMes]       = useState(idxInicial);
  const [historico, setHistorico] = useState(false);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { if (!historico && !isPrimeiro) setIdxMes((i) => i - 1); }
  function irMesProximo()  { if (!historico && !isUltimo)  setIdxMes((i) => i + 1); }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial);
    } else {
      setHistorico(true);
    }
  }

  // Datas do período selecionado (atual + janela do mês anterior alinhada ao MTD)
  const { start, end, startPrev, endPrev } = useMemo(() => {
    const agora = new Date();
    if (historico) {
      return {
        start: `${MES_INICIO.ano}-${String(MES_INICIO.mes + 1).padStart(2, "0")}-01`,
        end: agora.toISOString().slice(0, 10),
        startPrev: null as string | null,
        endPrev: null as string | null,
      };
    }
    if (!mesSelecionado) {
      return {
        start: "2026-01-01",
        end: agora.toISOString().slice(0, 10),
        startPrev: null,
        endPrev: null,
      };
    }
    const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
    return {
      start: atual.inicio,
      end: atual.fim,
      startPrev: anterior.inicio,
      endPrev: anterior.fim,
    };
  }, [historico, mesSelecionado]);

  /** Texto central da navegação de período — alinhado às outras páginas de dashboard. */
  const label = historico ? "Todo o período" : (mesSelecionado?.label ?? "");

  // ── Estados de dados ──────────────────────────────────────────────────────────
  const [carIdx,   setCarIdx]   = useState(0);
  const [loadingAlcance, setLoadingAlcance] = useState(false);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);
  const [kpiData,  setKpiData]  = useState<KpiDaily[]>([]);
  const [kpiAntRows, setKpiAntRows] = useState<KpiDaily[]>([]);
  const [posts,    setPosts]    = useState<PostUnificado[]>([]);
  const [youtubeVideoRows, setYoutubeVideoRows] = useState<YoutubeVideoRowLite[]>([]);
  const [formatos, setFormatos] = useState<{ tipo: string; total: number }[]>([]);
  const [funilTotais, setFunilTotais] = useState<{
    visitas: number; registros: number; ftds: number; ftd_total: number;
  } | null>(null);
  const [campanhasPerf, setCampanhasPerf] = useState<CampanhaPerfRow[]>([]);
  const [campanhasPerfPrev, setCampanhasPerfPrev] = useState<CampanhaPerfRow[]>([]);
  const [serieFunil, setSerieFunil] = useState<FunilSerieRow[]>([]);
  const [aba, setAba] = useRouteTab("dash_midias_sociais", "overview", ["overview", "conversao", "impulsionamento", "alcance"] as const);
  const [compCampA, setCompCampA] = useState<string>("");
  const [compCampB, setCompCampB] = useState<string>("");
  const [sortCampCmp, setSortCampCmp] = useState<{ col: CampCmpSortCol; dir: SortDir }>({ col: "ggr", dir: "desc" });
  const [sortTaxCmp, setSortTaxCmp] = useState<{ col: TaxCmpSortCol; dir: SortDir }>({ col: "ftds", dir: "desc" });
  const [sortBoost, setSortBoost] = useState<{ col: BoostSortCol; dir: SortDir }>({ col: "spend", dir: "desc" });
  const [loadingImpulsionamento, setLoadingImpulsionamento] = useState(false);
  const [metaAdsDaily, setMetaAdsDaily] = useState<MetaAdsDaily[]>([]);
  const [metaAdsDailyPrev, setMetaAdsDailyPrev] = useState<MetaAdsDaily[]>([]);
  const [metaBoostedPosts, setMetaBoostedPosts] = useState<MetaBoostedPost[]>([]);

  useEffect(() => {
    const withData = campanhasPerf.filter((c) => (Number(c.visitas) || 0) > 0 || (Number(c.ftds) || 0) > 0);
    if (withData.length >= 1) {
      setCompCampA(withData[0].campanha_id);
      setCompCampB(withData.length >= 2 ? withData[1].campanha_id : "");
    } else {
      setCompCampA("");
      setCompCampB("");
    }
  }, [campanhasPerf]);

  useEffect(() => {
    setCarIdx(0);
  }, [posts]);

  // ── Alcance (redes sociais) — sem filtro operadora ───────────────────────────
  useEffect(() => {
    if (aba !== "alcance") return;
    let cancelled = false;
    async function loadAlcance() {
      setLoadingAlcance(true);
      setCarIdx(0);

      const kpi = await fetchAllPages<KpiDaily>(async (from, to) =>
        supabase
          .from("kpi_daily")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true })
          .order("channel", { ascending: true })
          .range(from, to)
      );

      if (cancelled) return;
      setKpiData(kpi);

      if (startPrev && endPrev) {
        const kpiPrev = await fetchAllPages<KpiDaily>(async (from, to) =>
          supabase
            .from("kpi_daily")
            .select("*")
            .gte("date", startPrev)
            .lte("date", endPrev)
            .order("date", { ascending: true })
            .order("channel", { ascending: true })
            .range(from, to)
        );
        if (cancelled) return;
        setKpiAntRows(kpiPrev);
      } else {
        setKpiAntRows([]);
      }

      const [igRes, fbRes, ytRes] = await Promise.all([
        supabase.from("instagram_posts")
          .select("date,published_at,type,caption,likes,comments,saves,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
        supabase.from("facebook_posts")
          .select("date,published_at,type,message,reactions,comments,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
        supabase.from("youtube_videos")
          .select("date,published_at,type,title,views,likes,comments,video_id")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
      ]);

      if (cancelled) return;

      const ig = (igRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; caption: string | null;
        likes: number | null; comments: number | null; saves: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const fb = (fbRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; message: string | null;
        reactions: number | null; comments: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const yt = (ytRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; title: string | null;
        views: number | null; likes: number | null; comments: number | null; video_id: string;
      }>;

      const tipoMap: Record<string, string> = {
        REELS: "Reels", VIDEO: "Vídeo", CAROUSEL_ALBUM: "Carrossel",
        IMAGE: "Foto", photo: "Foto", video: "Vídeo", link: "Link",
        status: "Status", short: "Short", live: "Live", upload: "Upload",
      };

      const formatoCount: Record<string, number> = {};

      const unificar = <T extends { date: string; type: string; published_at?: string | null }>(
        arr: T[], canal: string, cor: string, tag: string,
        getResumo: (r: T) => string,
        getStats: (r: T) => ReactNode[],
        getUrl: (r: T) => string | null,
        getThumbnail: (r: T) => string | null
      ): PostUnificado[] =>
        arr.map((r) => {
          const tipo = tipoMap[r.type] ?? r.type ?? "Post";
          formatoCount[tipo] = (formatoCount[tipo] ?? 0) + 1;
          return {
            canal, tipo, cor, tag, resumo: getResumo(r), stats: getStats(r),
            date: r.date, publishedAt: r.published_at ?? null, url: getUrl(r), thumbnailUrl: getThumbnail(r),
          };
        });

      const postsUnif: PostUnificado[] = [
        ...unificar(ig, "Instagram", "#E1306C", "IG",
          (r) => (r.caption ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.likes)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
            ...(r.saves != null ? [postStatPill(<Bookmark size={15} strokeWidth={2} aria-hidden />, fmtNum(r.saves))] : []),
          ],
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(fb, "Facebook", "#1877F2", "FB",
          (r) => (r.message ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.reactions)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
          ],
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(yt, "YouTube", "#FF0000", "YT",
          (r) => (r.title ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Play size={15} strokeWidth={2} aria-hidden />, fmtNum(r.views)),
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.likes)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
          ],
          (r) => (r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null),
          (r) => (r.video_id ? `https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg` : null)),
      ].sort(ordenarPostsRecentes);

      setPosts(postsUnif);
      setYoutubeVideoRows(
        yt.map((r) => ({
          video_id: r.video_id,
          date: r.date,
          likes: r.likes,
          comments: r.comments,
        }))
      );
      setFormatos(
        Object.entries(formatoCount)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
      );
      setLoadingAlcance(false);
    }
    loadAlcance();
    return () => { cancelled = true; };
  }, [aba, start, end, startPrev, endPrev, historico]);

  // ── Impulsionamento (Meta Ads) — global, sem operadora ───────────────────────
  useEffect(() => {
    if (aba !== "impulsionamento") return;
    let cancelled = false;
    async function loadImpulsionamento() {
      setLoadingImpulsionamento(true);
      const daily = await fetchAllPages<MetaAdsDaily>(async (from, to) =>
        supabase
          .from("meta_ads_daily")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true })
          .range(from, to)
      );
      if (cancelled) return;
      setMetaAdsDaily(daily);

      const postsRes = await supabase
        .from("meta_boosted_posts")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("spend", { ascending: false })
        .limit(500);
      if (cancelled) return;
      setMetaBoostedPosts((postsRes.data ?? []) as MetaBoostedPost[]);

      if (startPrev && endPrev) {
        const dailyPrev = await fetchAllPages<MetaAdsDaily>(async (from, to) =>
          supabase
            .from("meta_ads_daily")
            .select("*")
            .gte("date", startPrev)
            .lte("date", endPrev)
            .order("date", { ascending: true })
            .range(from, to)
        );
        if (cancelled) return;
        setMetaAdsDailyPrev(dailyPrev);
      } else {
        setMetaAdsDailyPrev([]);
      }
      setLoadingImpulsionamento(false);
    }
    loadImpulsionamento();
    return () => { cancelled = true; };
  }, [aba, start, end, startPrev, endPrev, historico]);

  // ── Conversão (campanhas / UTMs) — filtro operadora ──────────────────────────
  useEffect(() => {
    if (aba !== "overview" && aba !== "conversao") return;
    let cancelled = false;
    async function loadCampanhas() {
      setLoadingCampanhas(true);

      const agregacaoSerie = historico ? "month" : "day";
      const [funilRes, campRes, serieRes, campPrevRes] = await Promise.all([
        supabase.rpc("get_campanha_funil_totais", {
          p_data_inicio: start,
          p_data_fim: end,
          p_operadora_slug: operadoraParaRpc,
        }),
        supabase.rpc("get_campanhas_performance", {
          p_data_inicio: start,
          p_data_fim: end,
          p_operadora_slug: operadoraParaRpc,
          p_modo_historico: historico,
        }),
        supabase.rpc("get_campanha_funil_serie_temporal", {
          p_data_inicio: start,
          p_data_fim: end,
          p_agregacao: agregacaoSerie,
          p_operadora_slug: operadoraParaRpc,
        }),
        startPrev && endPrev
          ? supabase.rpc("get_campanhas_performance", {
              p_data_inicio: startPrev,
              p_data_fim: endPrev,
              p_operadora_slug: operadoraParaRpc,
              p_modo_historico: false,
            })
          : Promise.resolve({ data: null as CampanhaPerfRow[] | null, error: null }),
      ]);

      if (!cancelled) {
        const fr = funilRes.data as Array<{ visitas: number; registros: number; ftds: number; ftd_total: number }> | null;
        setFunilTotais(fr && fr.length > 0 ? fr[0] : null);
        setCampanhasPerf((campRes.data as CampanhaPerfRow[]) ?? []);
        if (serieRes.error) {
          console.error("[SocialMediaDashboard] get_campanha_funil_serie_temporal:", serieRes.error);
          setSerieFunil([]);
        } else {
          const raw = (serieRes.data ?? []) as Array<Record<string, unknown>>;
          setSerieFunil(
            raw.map((r) => ({
              periodo: String(r.periodo),
              visitas: Number(r.visitas) || 0,
              registros: Number(r.registros) || 0,
              ftds: Number(r.ftds) || 0,
              ftd_total: Number(r.ftd_total) || 0,
              deposit_count: Number(r.deposit_count) || 0,
              deposit_total: Number(r.deposit_total) || 0,
              withdrawal_count: Number(r.withdrawal_count) || 0,
              withdrawal_total: Number(r.withdrawal_total) || 0,
            }))
          );
        }
        setCampanhasPerfPrev((campPrevRes.data as CampanhaPerfRow[] | null) ?? []);
        setLoadingCampanhas(false);
      }
    }
    loadCampanhas();
    return () => { cancelled = true; };
  }, [aba, start, end, startPrev, endPrev, historico, operadoraParaRpc]);

  // ── Totais agregados ──────────────────────────────────────────────────────────
  const youtubeEngFallback = useMemo(
    () => youtubeEngagementFromVideoSnapshots(youtubeVideoRows),
    [youtubeVideoRows]
  );

  const totais = useMemo(() => {
    const base = totaisFromKpiRows(kpiData);
    const ytKpiEng = (base.byChannel["youtube"] ?? []).reduce(
      (a, r) => a + (Number(r.engagements) || 0),
      0
    );
    const ytEng = Math.max(ytKpiEng, youtubeEngFallback);
    const delta = ytEng - ytKpiEng;
    if (delta <= 0) return base;
    return { ...base, engagements: base.engagements + delta };
  }, [kpiData, youtubeEngFallback]);
  const totaisAntMom = useMemo(() => totaisFromKpiRows(kpiAntRows), [kpiAntRows]);

  const totalImpr = totais.impressoes || 1;
  const engMedio  = totalImpr > 0 && totais.engagements != null
    ? (totais.engagements / totalImpr) * 100
    : null;

  const totalImprAnt = totaisAntMom.impressoes || 1;
  const engMedioAnt =
    !historico && totalImprAnt > 0 && totaisAntMom.engagements != null
      ? (totaisAntMom.engagements / totalImprAnt) * 100
      : null;

  const cmpSeguidores = !historico ? fmtComparativoMoM(totais.seguidores, totaisAntMom.seguidores) : null;
  const cmpImpressoes = !historico ? fmtComparativoMoM(totais.impressoes, totaisAntMom.impressoes) : null;
  const cmpEngMedio =
    !historico && engMedio != null && engMedioAnt != null ? fmtComparativoMoM(engMedio, engMedioAnt) : null;
  const cmpPostagens = !historico ? fmtComparativoMoM(totais.postagens, totaisAntMom.postagens) : null;

  const totaisImp = useMemo(
    () => totaisFromMetaAdsRows(metaAdsDaily, metaBoostedPosts),
    [metaAdsDaily, metaBoostedPosts]
  );
  const totaisImpAnt = useMemo(
    () => totaisFromMetaAdsRows(metaAdsDailyPrev, []),
    [metaAdsDailyPrev]
  );
  const cmpBoostPosts = !historico
    ? fmtComparativoMoM(totaisImp.boosted_posts_count, totaisImpAnt.boosted_posts_count)
    : null;
  const cmpSpend = !historico ? fmtComparativoMoM(totaisImp.spend, totaisImpAnt.spend) : null;
  const cmpImpEng = !historico
    ? fmtComparativoMoM(totaisImp.engagements, totaisImpAnt.engagements)
    : null;
  const cpmImp = totaisImp.impressions > 0 ? (totaisImp.spend / totaisImp.impressions) * 1000 : null;
  const custoPorEng =
    totaisImp.engagements > 0 ? totaisImp.spend / totaisImp.engagements : null;

  const consolidado = useMemo(() => sumCampanhasPerf(campanhasPerf), [campanhasPerf]);
  const consolidadoPrev = useMemo(() => sumCampanhasPerf(campanhasPerfPrev), [campanhasPerfPrev]);
  const ggrPorJogador = consolidado.deposit_count > 0 ? consolidado.ggr / consolidado.deposit_count : null;
  const ggrPorJogadorPrev = consolidadoPrev.deposit_count > 0 ? consolidadoPrev.ggr / consolidadoPrev.deposit_count : null;

  const cmpGgr = !historico ? fmtComparativoMoM(consolidado.ggr, consolidadoPrev.ggr) : null;
  const cmpRegs = !historico ? fmtComparativoMoM(consolidado.registros, consolidadoPrev.registros) : null;
  const cmpGgrJog =
    !historico && ggrPorJogador != null && ggrPorJogadorPrev != null
      ? fmtComparativoMoM(ggrPorJogador, ggrPorJogadorPrev)
      : null;

  const campanhaA = campanhasPerf.find((c) => c.campanha_id === compCampA) ?? null;
  const campanhaB = campanhasPerf.find((c) => c.campanha_id === compCampB) ?? null;

  /** Detalhamento: mais recente primeiro; no mês atual, só até ontem (ETL diário fecha o dia anterior). */
  const serieFunilOrdenado = useMemo(() => {
    let rows = serieFunil;
    if (
      !historico &&
      mesSelecionado &&
      isCarrosselMesCivilAtual(mesSelecionado.ano, mesSelecionado.mes)
    ) {
      const limite = getOntemIsoLocal();
      rows = rows.filter((r) => r.periodo.slice(0, 10) <= limite);
    }
    return [...rows].sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [serieFunil, historico, mesSelecionado]);

  const lastVal = (arr: KpiDaily[], f: keyof KpiDaily): number | null => {
    const v = arr[arr.length - 1]?.[f]; return v != null ? Number(v) : null;
  };
  const sumVal = (arr: KpiDaily[], f: keyof KpiDaily): number =>
    arr.reduce((a, r) => a + (Number(r[f]) || 0), 0);

  const youtubeEngagements = (byCh: KpiDaily[]) =>
    Math.max(sumVal(byCh, "engagements"), youtubeEngFallback);

  /** Taxa de engajamento agregada no período (evita depender de engagement_rate null no banco). */
  const calcEngRate = (byCh: KpiDaily[], channel?: string): string => {
    const eng = channel === "youtube" ? youtubeEngagements(byCh) : sumVal(byCh, "engagements");
    const impr = sumVal(byCh, "impressions");
    if (impr > 0) return fmtPct(eng / impr);
    const views = sumVal(byCh, "video_views");
    if (views > 0) return fmtPct(eng / views);
    return "—";
  };

  const calcEngBadge = (byCh: KpiDaily[], channel?: string): number => {
    const eng = channel === "youtube" ? youtubeEngagements(byCh) : sumVal(byCh, "engagements");
    const impr = sumVal(byCh, "impressions");
    if (impr > 0) return (eng / impr) * 100;
    const views = sumVal(byCh, "video_views");
    if (views > 0) return (eng / views) * 100;
    return 0;
  };

  const channelConfig = [
    {
      channel: "instagram", nome: "Instagram", cor: "#E1306C",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))  },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "reach"))       },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Engajamento", val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Taxa eng.",   val: calcEngRate(byCh) },
      ],
    },
    {
      channel: "facebook", nome: "Facebook", cor: "#1877F2",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))  },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "reach"))       },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Reações",     val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Cliques",     val: fmtNum(sumVal(byCh, "link_clicks")) },
      ],
    },
    {
      channel: "youtube", nome: "YouTube", cor: "#FF0000",
      stats: (byCh: KpiDaily[]) => [
        { label: "Inscritos",     val: fmtNum(lastVal(byCh, "followers"))    },
        { label: "Visualizações", val: fmtNum(sumVal(byCh, "video_views"))   },
        // ETL não grava impressions no kpi_daily do YouTube (Analytics day não expõe); evitar "0" falso
        { label: "Impressões",    val: "—" },
        { label: "Engajamento",   val: fmtNum(youtubeEngagements(byCh))   },
        { label: "Taxa eng.",     val: calcEngRate(byCh, "youtube") },
      ],
    },
  ];

  const POST_W = 520;
  const POST_GAP = 20;
  const CAR_WINDOW = 5;
  const carMaxStart = Math.max(0, posts.length - CAR_WINDOW);
  const totalFormatos = formatos.reduce((a, f) => a + f.total, 0);

  const brand = useDashboardBrand();
  const loadingOverviewConversao = loadingCampanhas;
  const loadingAbaAtiva =
    aba === "alcance"
      ? loadingAlcance
      : aba === "impulsionamento"
        ? loadingImpulsionamento
        : loadingCampanhas;

  const labelOperadoraCampanha = (slug: string | null | undefined) =>
    slug ? (operadoraNomePorSlug.get(slug) ?? slug) : "—";

  const onSortCampCmp = (col: CampCmpSortCol) => {
    setSortCampCmp((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };
  const onSortTaxCmp = (col: TaxCmpSortCol) => {
    setSortTaxCmp((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };

  const campanhasCmpOrdenadas = useMemo(() => {
    const list = [...campanhasPerf];
    const { col, dir } = sortCampCmp;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let primary = 0;
      if (col === "nome") {
        primary = mul * a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
      } else if (col === "ggr") {
        primary = mul * (ggrCampanha(a) - ggrCampanha(b));
      } else {
        const va = Number(a[col as keyof CampanhaPerfRow]) || 0;
        const vb = Number(b[col as keyof CampanhaPerfRow]) || 0;
        primary = mul * (va - vb);
      }
      if (primary !== 0) return primary;
      return a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
    });
    return list;
  }, [campanhasPerf, sortCampCmp]);

  const campanhasTaxasOrdenadas = useMemo(() => {
    const list = [...campanhasPerf];
    const { col, dir } = sortTaxCmp;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let primary = 0;
      switch (col) {
        case "nome":
          primary = mul * a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
          break;
        case "visitas":
          primary = mul * (a.visitas - b.visitas);
          break;
        case "registros":
          primary = mul * (a.registros - b.registros);
          break;
        case "ftds":
          primary = mul * (a.ftds - b.ftds);
          break;
        case "pctVR":
          primary = cmpNullableNum(pctCamp(a.registros, a.visitas), pctCamp(b.registros, b.visitas), mul);
          break;
        case "pctRF":
          primary = cmpNullableNum(pctCamp(a.ftds, a.registros), pctCamp(b.ftds, b.registros), mul);
          break;
        case "pctVF":
          primary = cmpNullableNum(pctCamp(a.ftds, a.visitas), pctCamp(b.ftds, b.visitas), mul);
          break;
        default:
          primary = 0;
      }
      if (primary !== 0) return primary;
      return a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
    });
    return list;
  }, [campanhasPerf, sortTaxCmp]);

  // ── Estilos base ─────────────────────────────────────────────────────────────
  const card = getPageContentBoxStyle(brand, t);

  const onSortBoost = (col: BoostSortCol) => {
    setSortBoost((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };

  const boostedPostsAgregados = useMemo(
    () => aggregateBoostedPostsByAd(metaBoostedPosts),
    [metaBoostedPosts]
  );

  const boostedPostsOrdenados = useMemo(() => {
    const list = [...boostedPostsAgregados];
    const { col, dir } = sortBoost;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      if (col === "nome") {
        const na = (a.campaign_name || "—").toLowerCase();
        const nb = (b.campaign_name || "—").toLowerCase();
        return na.localeCompare(nb, "pt-BR") * mul;
      }
      if (col === "platform") {
        return a.platform.localeCompare(b.platform, "pt-BR") * mul;
      }
      const va = Number(a[col]) || 0;
      const vb = Number(b[col]) || 0;
      return (va - vb) * mul;
    });
    return list;
  }, [boostedPostsAgregados, sortBoost]);

  const dataTable = useDataTableBlock();
  const corFunilComparativoCampanhaA = brand.useBrand ? COR_FUNIL_B : COR_FUNIL_A;
  const corFunilComparativoCampanhaB = COR_FUNIL_B;
  const selectCampStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 120,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
  };

  const skeletonBloco = (
    <>
      <div style={card}>
        <SectionTitle>Carregando…</SectionTitle>
        <div className="app-grid-kpi-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>
      </div>
      <div style={{ ...card, marginTop: PAGE_CONTENT_BOX_GAP }}>
        <div style={{ height: 200, borderRadius: 12, animation: "skeleton-pulse 1.5s ease-in-out infinite", background: "rgba(124,58,237,0.08)" }} />
      </div>
    </>
  );

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const tabIds: SocialMediaTab[] = ["overview", "conversao", "impulsionamento", "alcance"];

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, color: t.text, paddingBottom: 12 }}>

      <DashboardPageHeader
        icon={<PageMenuIcon pageKey="dash_midias_sociais" />}
        title={getPageMenuLabel("dash_midias_sociais")}
        subtitle="Monitore alcance orgânico, impulsionamento Meta e a conversão das campanhas rastreadas."
        brand={brand}
        t={t}
      />

      {/* Período + abas */}
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
            <button
              type="button"
              aria-label="Mês anterior"
              style={getCarouselBtnNavStyle(t, historico || isPrimeiro)}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span style={getCarouselPeriodLabelStyle(t, { minWidth: 220 })}>{label}</span>
            <button
              type="button"
              aria-label="Próximo mês"
              style={getCarouselBtnNavStyle(t, historico || isUltimo)}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <FiltroHistoricoButton active={historico} onClick={toggleHistorico} />

            {showFiltroOperadora && aba !== "alcance" && aba !== "impulsionamento" && (
              <FiltroOperadoraSelect
                pill
                value={filtroOperadora}
                onChange={setFiltroOperadora}
                operadoras={operadorasList}
                podeVerOperadora={podeVerOperadora}
              />
            )}

            {loadingAbaAtiva && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} aria-hidden />
                Carregando…
              </span>
            )}
          </div>

          <div role="tablist" aria-label="Seções Mídias sociais" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {tabIds.map((key) => {
              const TabIcon = TAB_ICONS[key];
              return (
                <FiltroBarTabButton
                  key={key}
                  id={`tab-midias-${key}`}
                  active={aba === key}
                  aria-controls={`panel-midias-${key}`}
                  onClick={() => setAba(key)}
                  onKeyDown={(e) => handleFiltroBarTabsArrowKeyDown(e, tabIds, key, setAba, "tab-midias-")}
                  icon={<TabIcon size={FILTRO_BAR_TAB_ICON_SIZE} strokeWidth={2} aria-hidden="true" />}
                >
                  {TAB_LABELS[key]}
                </FiltroBarTabButton>
              );
            })}
          </div>
      </div>

      <div role="tabpanel" id={`panel-midias-${aba}`} aria-labelledby={`tab-midias-${aba}`}>

      {aba === "overview" && (
        loadingOverviewConversao ? skeletonBloco : (
            <>
              <div style={card}>
                <SectionTitle
                  sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
                >
                  KPIs Consolidados
                </SectionTitle>
                <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
                  <SocialKpiCard
                    label="GGR"
                    valor={fmtBRL(consolidado.ggr)}
                    accentCor={BRAND.verde}
                    icon={<TrendingUp size={15} aria-hidden />}
                    momComparativo={
                      cmpGgr
                        ? {
                            pctLabel: cmpGgr.pctLabel,
                            up: cmpGgr.up,
                            refLine: `vs ${fmtBRL(consolidadoPrev.ggr)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <SocialKpiCard
                    label="Registros"
                    valor={fmtNum(consolidado.registros)}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxoVivo}
                    icon={<UserPlus size={15} aria-hidden />}
                    momComparativo={
                      cmpRegs
                        ? {
                            pctLabel: cmpRegs.pctLabel,
                            up: cmpRegs.up,
                            refLine: `vs ${fmtNum(consolidadoPrev.registros)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <SocialKpiCard
                    label="GGR por Jogador"
                    valor={ggrPorJogador != null ? fmtBRL(ggrPorJogador) : "—"}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxo}
                    icon={<CircleDollarSign size={15} aria-hidden />}
                    momComparativo={
                      cmpGgrJog && ggrPorJogadorPrev != null
                        ? {
                            pctLabel: cmpGgrJog.pctLabel,
                            up: cmpGgrJog.up,
                            refLine: `vs ${fmtBRL(ggrPorJogadorPrev)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                </div>
                <div className="app-grid-kpi-3">
                  <KpiCardDepositos
                    label="FTDs"
                    icon={<Trophy size={16} aria-hidden />}
                    atual={{ qtd: consolidado.ftds, valor: consolidado.ftd_total }}
                    anterior={{ qtd: consolidadoPrev.ftds, valor: consolidadoPrev.ftd_total }}
                    isHistorico={historico}
                  />
                  <KpiCardDepositos
                    label="Depósitos"
                    icon={<ArrowDownToLine size={16} aria-hidden />}
                    atual={{ qtd: consolidado.deposit_count, valor: consolidado.deposit_total }}
                    anterior={{ qtd: consolidadoPrev.deposit_count, valor: consolidadoPrev.deposit_total }}
                    isHistorico={historico}
                  />
                  <KpiCardDepositos
                    label="Saques"
                    icon={<ArrowUpFromLine size={16} aria-hidden />}
                    atual={{ qtd: consolidado.withdrawal_count, valor: consolidado.withdrawal_total }}
                    anterior={{ qtd: consolidadoPrev.withdrawal_count, valor: consolidadoPrev.withdrawal_total }}
                    isHistorico={historico}
                  />
                </div>
              </div>

              <div style={card}>
                <SectionTitle
                  sub={historico ? "mês a mês" : "dia a dia"}
                >
                  Detalhamento {historico ? "mensal" : "diário"}
                </SectionTitle>
                {serieFunilOrdenado.length > 0 ? (
                  <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                    <table style={getDataTableStyle({ minWidth: 900 })}>
                      <caption style={{ display: "none" }}>
                        Detalhamento de visitas, conversões e GGR por {historico ? "mês" : "dia"} no período selecionado.
                      </caption>
                      <thead>
                        <tr>
                          {[
                            "Período",
                            "# Visitas",
                            "# Registros",
                            "# FTD",
                            "R$ FTD",
                            "# Depósito",
                            "R$ Depósito",
                            "# Saque",
                            "R$ Saque",
                            "R$ GGR",
                          ].map((label) => (
                            <th key={label} scope="col" style={dataTable.thHeader}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {serieFunilOrdenado.map((row, i) => {
                          const ggr = (row.deposit_total ?? 0) - (row.withdrawal_total ?? 0);
                          return (
                            <tr key={row.periodo} style={{ background: dataTable.zebraRow(i) }}>
                              <td
                                style={{ ...dataTable.tdCenter, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
                                title={row.periodo}
                              >
                                {fmtPeriodoSerieCell(row.periodo, historico)}
                              </td>
                              <td style={dataTable.tdCenter}>{fmtNum(row.visitas)}</td>
                              <td style={dataTable.tdCenter}>{fmtNum(row.registros)}</td>
                              <td style={dataTable.tdCenter}>{fmtNum(row.ftds)}</td>
                              <td style={dataTable.tdCenter}>{fmtBRL(row.ftd_total)}</td>
                              <td style={dataTable.tdCenter}>{fmtNum(row.deposit_count)}</td>
                              <td style={dataTable.tdCenter}>{fmtBRL(row.deposit_total)}</td>
                              <td style={dataTable.tdCenter}>{fmtNum(row.withdrawal_count)}</td>
                              <td style={dataTable.tdCenter}>{fmtBRL(row.withdrawal_total)}</td>
                              <td style={{ ...dataTable.tdCenter, color: ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(ggr)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem dados para o período selecionado.
                  </div>
                )}
              </div>

              <div style={card}>
                <SectionTitle sub={historico ? "acumulado" : undefined}>
                  Comparativo de campanha
                </SectionTitle>
                {campanhasPerf.length > 0 ? (
                  <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                    <table style={getDataTableStyle({ minWidth: 960 })}>
                      <caption style={{ display: "none" }}>
                        Performance por campanha com UTMs mapeadas no período selecionado.
                      </caption>
                      <thead>
                        <tr>
                          <SortTableTh<CampCmpSortCol>
                            label="Campanha"
                            col="nome"
                            sortCol={sortCampCmp.col}
                            sortDir={sortCampCmp.dir}
                            onSort={onSortCampCmp}
                            thStyle={dataTable.thHeader}
                            align="center"
                          />
                          {showColunaOperadora && (
                            <th scope="col" style={dataTable.thHeader}>Operadora</th>
                          )}
                          <SortTableTh label="Acessos" col="visitas" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="Registros" col="registros" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="# FTDs" col="ftds" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="R$ FTDs" col="ftd_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="# Depósitos" col="deposit_count" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="R$ Depósitos" col="deposit_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="# Saques" col="withdrawal_count" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="R$ Saques" col="withdrawal_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="R$ GGR" col="ggr" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={dataTable.thHeader} align="center" />
                        </tr>
                      </thead>
                      <tbody>
                        {campanhasCmpOrdenadas.map((c, i) => {
                            const ggr = (c.deposit_total ?? 0) - (c.withdrawal_total ?? 0);
                            return (
                              <tr key={c.campanha_id} style={{ background: dataTable.zebraRow(i) }}>
                                <td
                                  style={{ ...dataTable.tdCenter, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}
                                  title={c.campanha_nome}
                                >
                                  {c.campanha_nome}
                                </td>
                                {showColunaOperadora && (
                                  <td style={dataTable.tdCenter}>
                                    {labelOperadoraCampanha(c.operadora_slug)}
                                  </td>
                                )}
                                <td style={dataTable.tdCenter}>{fmtNum(c.visitas)}</td>
                                <td style={dataTable.tdCenter}>{fmtNum(c.registros)}</td>
                                <td style={dataTable.tdCenter}>{fmtNum(c.ftds)}</td>
                                <td style={dataTable.tdCenter}>{fmtBRL(c.ftd_total)}</td>
                                <td style={dataTable.tdCenter}>{fmtNum(c.deposit_count ?? 0)}</td>
                                <td style={dataTable.tdCenter}>{fmtBRL(c.deposit_total)}</td>
                                <td style={dataTable.tdCenter}>{fmtNum(c.withdrawal_count ?? 0)}</td>
                                <td style={dataTable.tdCenter}>{fmtBRL(c.withdrawal_total)}</td>
                                <td style={{ ...dataTable.tdCenter, color: ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(ggr)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 12, padding: "24px 0", fontFamily: FONT.body }}>
                    Nenhuma campanha com UTMs mapeadas no período. Cadastre campanhas e mapeie UTMs na Gestão de Links.
                  </div>
                )}
              </div>
            </>
        )
      )}

      {aba === "conversao" && (
        loadingOverviewConversao ? skeletonBloco : (
            <>
              <div style={card}>
                <SectionTitle sub={historico ? "acumulado" : undefined}>
                  Funil de conversão
                </SectionTitle>
                {(funilTotais?.visitas ?? 0) + (funilTotais?.registros ?? 0) + (funilTotais?.ftds ?? 0) > 0 ? (
                  <FunilSocialTresNiveis
                    visitas={funilTotais?.visitas ?? 0}
                    registros={funilTotais?.registros ?? 0}
                    ftds={funilTotais?.ftds ?? 0}
                    accentBorder={COR_FUNIL_A.border}
                    accentStep={COR_FUNIL_A.step}
                    accentColor={COR_FUNIL_A.accent}
                    idPrefix="agg"
                  />
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem dados para o período selecionado.
                  </div>
                )}
              </div>

              <div style={card}>
                <SectionTitle sub={historico ? "acumulado" : undefined}>
                  Comparativo de funil
                </SectionTitle>
                <div className="app-conversao-vs-row" style={{ marginBottom: 14 }}>
                  <select
                    aria-label="Campanha A no comparativo de funil"
                    value={compCampA}
                    onChange={(e) => setCompCampA(e.target.value)}
                    style={{
                      ...selectCampStyle,
                      borderColor: compCampA ? corFunilComparativoCampanhaA.border : undefined,
                    }}
                  >
                    <option value="">— Selecione —</option>
                    {campanhasPerf
                      .filter((c) => c.campanha_id !== compCampB)
                      .sort((a, b) => a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR"))
                      .map((c) => (
                        <option key={c.campanha_id} value={c.campanha_id}>
                          {c.campanha_nome}
                        </option>
                      ))}
                  </select>
                  <div
                    style={{
                      padding: "5px 12px",
                      borderRadius: 999,
                      border: brand.useBrand
                        ? `1px solid ${COR_FUNIL_B.border}`
                        : "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
                      background: brand.useBrand ? COR_FUNIL_B.step : "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
                      fontSize: 12,
                      fontWeight: 800,
                      color: brand.useBrand ? COR_FUNIL_B.accent : "var(--brand-action, #7c3aed)",
                      fontFamily: FONT.body,
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    VS
                  </div>
                  <select
                    aria-label="Campanha B no comparativo de funil"
                    value={compCampB}
                    onChange={(e) => setCompCampB(e.target.value)}
                    style={{
                      ...selectCampStyle,
                      borderColor: compCampB ? corFunilComparativoCampanhaB.border : undefined,
                    }}
                  >
                    <option value="">— Selecione —</option>
                    {campanhasPerf
                      .filter((c) => c.campanha_id !== compCampA)
                      .sort((a, b) => a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR"))
                      .map((c) => (
                        <option key={c.campanha_id} value={c.campanha_id}>
                          {c.campanha_nome}
                        </option>
                      ))}
                  </select>
                </div>
                {(campanhaA || campanhaB) && (
                  <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 10,
                        background: corFunilComparativoCampanhaA.step,
                        border: `1px solid ${corFunilComparativoCampanhaA.border}`,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: corFunilComparativoCampanhaA.accent,
                        fontFamily: FONT.body,
                      }}
                    >
                      {campanhaA?.campanha_nome ?? "—"}
                    </div>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 10,
                        background: corFunilComparativoCampanhaB.step,
                        border: `1px solid ${corFunilComparativoCampanhaB.border}`,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: corFunilComparativoCampanhaB.accent,
                        fontFamily: FONT.body,
                      }}
                    >
                      {campanhaB?.campanha_nome ?? "—"}
                    </div>
                  </div>
                )}
                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {campanhaA ? (
                      <FunilSocialTresNiveis
                        visitas={campanhaA.visitas}
                        registros={campanhaA.registros}
                        ftds={campanhaA.ftds}
                        accentBorder={corFunilComparativoCampanhaA.border}
                        accentStep={corFunilComparativoCampanhaA.step}
                        accentColor={corFunilComparativoCampanhaA.accent}
                        idPrefix="ca"
                      />
                    ) : (
                      <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
                        Selecione a campanha A.
                      </div>
                    )}
                  </div>
                  <div className="app-conversao-funil-divider" style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {campanhaB ? (
                      <FunilSocialTresNiveis
                        visitas={campanhaB.visitas}
                        registros={campanhaB.registros}
                        ftds={campanhaB.ftds}
                        accentBorder={corFunilComparativoCampanhaB.border}
                        accentStep={corFunilComparativoCampanhaB.step}
                        accentColor={corFunilComparativoCampanhaB.accent}
                        idPrefix="cb"
                      />
                    ) : (
                      <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
                        Selecione a campanha B.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={card}>
                <SectionTitle sub={historico ? "acumulado" : undefined}>
                  Comparativo de taxas
                </SectionTitle>
                {campanhasPerf.length > 0 ? (
                  <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                    <table style={getDataTableStyle({ minWidth: 800 })}>
                      <caption style={{ display: "none" }}>Taxas de conversão por campanha no período.</caption>
                      <thead>
                        <tr>
                          <SortTableTh<TaxCmpSortCol>
                            label="Campanha"
                            col="nome"
                            sortCol={sortTaxCmp.col}
                            sortDir={sortTaxCmp.dir}
                            onSort={onSortTaxCmp}
                            thStyle={dataTable.thHeader}
                            align="center"
                          />
                          {showColunaOperadora && (
                            <th scope="col" style={dataTable.thHeader}>Operadora</th>
                          )}
                          <SortTableTh label="Visitas" col="visitas" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="Visita → Registro" col="pctVR" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="Registros" col="registros" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="Registro → FTD" col="pctRF" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="FTDs" col="ftds" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                          <SortTableTh label="Visita → FTD" col="pctVF" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={dataTable.thHeader} align="center" />
                        </tr>
                      </thead>
                      <tbody>
                        {campanhasTaxasOrdenadas.map((c, i) => (
                          <tr key={c.campanha_id} style={{ background: dataTable.zebraRow(i) }}>
                            <td
                              style={{ ...dataTable.tdCenter, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                              title={c.campanha_nome}
                            >
                              {c.campanha_nome}
                            </td>
                            {showColunaOperadora && (
                              <td style={dataTable.tdCenter}>
                                {labelOperadoraCampanha(c.operadora_slug)}
                              </td>
                            )}
                            <td style={dataTable.tdCenter}>{fmtNum(c.visitas)}</td>
                            <td style={dataTable.tdCenter}>{fmtPctCamp(pctCamp(c.registros, c.visitas))}</td>
                            <td style={dataTable.tdCenter}>{fmtNum(c.registros)}</td>
                            <td style={dataTable.tdCenter}>{fmtPctCamp(pctCamp(c.ftds, c.registros))}</td>
                            <td style={{ ...dataTable.tdCenter, color: BRAND.verde, fontWeight: 600 }}>{fmtNum(c.ftds)}</td>
                            <td style={dataTable.tdCenter}>{fmtPctCamp(pctCamp(c.ftds, c.visitas))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 12, padding: "24px 0", fontFamily: FONT.body }}>
                    Nenhuma campanha com UTMs mapeadas no período. Cadastre campanhas e mapeie UTMs na Gestão de Links.
                  </div>
                )}
              </div>
            </>
        )
      )}

      {aba === "impulsionamento" && (
        loadingImpulsionamento ? skeletonBloco : (
          <>
            <div style={card}>
              <SectionTitle
                sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
              >
                KPIs de Impulsionamento
              </SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: PAGE_CONTENT_BOX_GAP }}>
                <div className="app-grid-kpi-3">
                  <SocialKpiCard
                    label="Posts impulsionados"
                    valor={fmtNum(totaisImp.boosted_posts_count)}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxoVivo}
                    icon={<Megaphone size={15} aria-hidden />}
                    momComparativo={
                      cmpBoostPosts
                        ? {
                            pctLabel: cmpBoostPosts.pctLabel,
                            up: cmpBoostPosts.up,
                            refLine: `vs ${fmtNum(totaisImpAnt.boosted_posts_count)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <SocialKpiCard
                    label="Investimento"
                    valor={fmtBRL(totaisImp.spend)}
                    accentVar="--brand-action"
                    accentCor={BRAND.ciano}
                    icon={<CircleDollarSign size={15} aria-hidden />}
                    momComparativo={
                      cmpSpend
                        ? {
                            pctLabel: cmpSpend.pctLabel,
                            up: cmpSpend.up,
                            refLine: `vs ${fmtBRL(totaisImpAnt.spend)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <SocialKpiCard
                    label="Interações"
                    valor={fmtNum(totaisImp.engagements)}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxo}
                    icon={<Sparkles size={15} aria-hidden />}
                    momComparativo={
                      cmpImpEng
                        ? {
                            pctLabel: cmpImpEng.pctLabel,
                            up: cmpImpEng.up,
                            refLine: `vs ${fmtNum(totaisImpAnt.engagements)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                </div>
                <div className="app-grid-kpi-4">
                  <SocialKpiCard
                    label="Alcance pago"
                    valor={fmtNum(totaisImp.reach)}
                    accentVar="--brand-contrast"
                    accentCor="#1877F2"
                    icon={<Eye size={15} aria-hidden />}
                  />
                  <SocialKpiCard
                    label="Impressões pagas"
                    valor={fmtNum(totaisImp.impressions)}
                    accentVar="--brand-contrast"
                    accentCor="#E1306C"
                    icon={<Bookmark size={15} aria-hidden />}
                  />
                  <SocialKpiCard
                    label="CPM (custo / mil imp.)"
                    valor={cpmImp != null ? fmtBRL(cpmImp) : "—"}
                    accentVar="--brand-action"
                    accentCor={BRAND.ciano}
                    icon={<Percent size={15} aria-hidden />}
                  />
                  <SocialKpiCard
                    label="Custo por interação"
                    valor={custoPorEng != null ? fmtBRL(custoPorEng) : "—"}
                    accentVar="--brand-action"
                    accentCor={BRAND.roxoVivo}
                    icon={<MousePointerClick size={15} aria-hidden />}
                  />
                </div>
              </div>
            </div>

            <div style={card}>
              <SectionTitle sub="anúncios com investimento no período">
                Detalhamento por anúncio
              </SectionTitle>
              {boostedPostsOrdenados.length > 0 ? (
                <div className="app-table-wrap" style={getDataTableWrapStyle()}>
                  <table style={getDataTableStyle({ minWidth: 920 })}>
                    <caption style={{ display: "none" }}>Anúncios impulsionados no período.</caption>
                    <thead>
                      <tr>
                        <SortTableTh<BoostSortCol>
                          label="Campanha"
                          col="nome"
                          sortCol={sortBoost.col}
                          sortDir={sortBoost.dir}
                          onSort={onSortBoost}
                          thStyle={dataTable.thHeader}
                          align="center"
                        />
                        <SortTableTh label="Plataforma" col="platform" sortCol={sortBoost.col} sortDir={sortBoost.dir} onSort={onSortBoost} thStyle={dataTable.thHeader} align="center" />
                        <SortTableTh label="Investimento" col="spend" sortCol={sortBoost.col} sortDir={sortBoost.dir} onSort={onSortBoost} thStyle={dataTable.thHeader} align="center" />
                        <SortTableTh label="Impressões" col="impressions" sortCol={sortBoost.col} sortDir={sortBoost.dir} onSort={onSortBoost} thStyle={dataTable.thHeader} align="center" />
                        <SortTableTh label="Interações" col="engagements" sortCol={sortBoost.col} sortDir={sortBoost.dir} onSort={onSortBoost} thStyle={dataTable.thHeader} align="center" />
                        <SortTableTh label="Cliques" col="link_clicks" sortCol={sortBoost.col} sortDir={sortBoost.dir} onSort={onSortBoost} thStyle={dataTable.thHeader} align="center" />
                      </tr>
                    </thead>
                    <tbody>
                      {boostedPostsOrdenados.map((row, i) => {
                        const campanha = row.campaign_name || "—";
                        const platLabel = row.platform === "instagram" ? "Instagram" : "Facebook";
                        return (
                          <tr key={row.ad_id} style={{ background: dataTable.zebraRow(i) }}>
                            <td
                              style={{ ...dataTable.tdCenter, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                              title={campanha}
                            >
                              {campanha}
                            </td>
                            <td style={dataTable.tdCenter}>{platLabel}</td>
                            <td style={dataTable.tdCenter}>{fmtBRL(Number(row.spend) || 0)}</td>
                            <td style={dataTable.tdCenter}>{fmtNum(row.impressions)}</td>
                            <td style={dataTable.tdCenter}>{fmtNum(row.engagements)}</td>
                            <td style={dataTable.tdCenter}>{fmtNum(row.link_clicks)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                  Nenhum impulsionamento registrado no período.
                </div>
              )}
            </div>
          </>
        )
      )}

      {aba === "alcance" && (
        loadingAlcance ? skeletonBloco : (
          <>
          {/* KPIs GERAIS */}
          <div style={card}>
            <SectionTitle
              sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
            >
              KPIs de Mídias Sociais
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: PAGE_CONTENT_BOX_GAP }}>
            <div className="app-grid-kpi-4">
              <SocialKpiCard
                label="Postagens"
                valor={fmtNum(totais.postagens)}
                accentVar="--brand-contrast"
                accentCor={BRAND.roxoVivo}
                icon={<Bookmark size={15} aria-hidden />}
                momComparativo={
                  cmpPostagens
                    ? {
                        pctLabel: cmpPostagens.pctLabel,
                        up: cmpPostagens.up,
                        refLine: `vs ${fmtNum(totaisAntMom.postagens)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <SocialKpiCard
                label="Novos Seguidores"
                valor={fmtNum(totais.seguidores)}
                accentVar="--brand-contrast"
                accentCor={BRAND.roxo}
                icon={<Mic size={15} aria-hidden />}
                momComparativo={
                  cmpSeguidores
                    ? {
                        pctLabel: cmpSeguidores.pctLabel,
                        up: cmpSeguidores.up,
                        refLine: `vs ${fmtNum(totaisAntMom.seguidores)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <SocialKpiCard
                label="Impressões totais"
                valor={fmtNum(totais.impressoes)}
                accentVar="--brand-contrast"
                accentCor={BRAND.azul}
                icon={<Sparkles size={15} aria-hidden />}
                momComparativo={
                  cmpImpressoes
                    ? {
                        pctLabel: cmpImpressoes.pctLabel,
                        up: cmpImpressoes.up,
                        refLine: `vs ${fmtNum(totaisAntMom.impressoes)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <SocialKpiCard
                label="Engajamento médio"
                valor={engMedio != null ? `${engMedio.toFixed(1)}%` : "—"}
                accentVar="--brand-action"
                accentCor={BRAND.ciano}
                icon={<Percent size={15} aria-hidden />}
                momComparativo={
                  cmpEngMedio && engMedioAnt != null
                    ? {
                        pctLabel: cmpEngMedio.pctLabel,
                        up: cmpEngMedio.up,
                        refLine: `vs ${engMedioAnt.toFixed(1)}% · mesmo período mês ant.`,
                      }
                    : null
                }
              />
            </div>

            <div className="app-grid-kpi-3">
              {channelConfig.map((cfg) => {
                const byCh   = totais.byChannel[cfg.channel] ?? [];
                const stats  = cfg.stats(byCh);
                const engVal = calcEngBadge(byCh, cfg.channel);
                return (
                  <section
                    key={cfg.channel}
                    aria-label={`Métricas de ${cfg.nome}`}
                    style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: brand.blockBg, overflow: "hidden" }}
                  >
                    <div style={{ height: 3, background: cfg.cor }} />
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${t.cardBorder}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.cor, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: t.text, letterSpacing: "0.04em", fontFamily: FONT_TITLE }}>{cfg.nome}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${cfg.cor}22`, border: `1px solid ${cfg.cor}44`, color: cfg.cor }}>
                          Eng. {engVal.toFixed(1)}%
                        </span>
                      </div>
                      {stats.map((s, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: i === stats.length - 1 ? "none" : `1px solid ${t.cardBorder}` }}>
                          <span style={{ color: t.textMuted }}>{s.label}</span>
                          <span style={{ fontWeight: 600, color: t.text }}>{s.val}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            </div>
          </div>

          {/* Engajamento por formato */}
          <div style={card}>
            <SectionTitle>Engajamento por formato</SectionTitle>
            {formatos.length > 0 ? (
              formatos.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: i === formatos.length - 1 ? "none" : `1px solid ${t.cardBorder}` }}>
                  <span style={{ color: t.textMuted, flex: 1 }}>{f.tipo}</span>
                  <div style={{ width: 90, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 3, height: 7, flexShrink: 0 }}>
                    <div
                      style={{
                        width: `${totalFormatos > 0 ? (f.total / totalFormatos) * 100 : 0}%`,
                        height: 7,
                        borderRadius: 3,
                        background: [
                          "var(--brand-action, #4a2082)",
                          "var(--brand-contrast, #1e36f8)",
                          "var(--brand-icon-color)",
                          "#6b7280",
                        ][i % 4],
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, color: t.text, minWidth: 52, textAlign: "right" }}>{f.total} posts</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Sem dados para o período selecionado.
              </div>
            )}
          </div>

          {/* Carrossel postagens */}
          <div style={card}>
            <SectionTitle>Postagens recentes</SectionTitle>
            {posts.length > 0 ? (
              <>
                <div
                  style={{
                    overflowX: "auto",
                    overflowY: "hidden",
                    width: "100%",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehaviorX: "contain",
                    paddingBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: POST_GAP,
                      width: "100%",
                      minWidth: 0,
                      paddingRight: POST_GAP,
                    }}
                  >
                    {posts.slice(carIdx, carIdx + CAR_WINDOW).map((p, i) => (
                      <article
                        key={`${carIdx}-${i}`}
                        aria-label={`${p.canal} · ${p.tipo}`}
                        style={{
                          flex: "1 1 0",
                          minWidth: 180,
                          maxWidth: POST_W,
                          borderRadius: 18,
                          border: `1px solid ${t.cardBorder}`,
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          overflow: "hidden",
                        }}
                      >
                        <PostCarouselThumb p={p} />
                        <div style={{ padding: 24 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 6, color: p.cor }}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: "inherit", textDecoration: "none", borderBottom: "1px dotted currentColor" }}>
                                {p.canal} · {p.tipo}
                              </a>
                            ) : <>{p.canal} · {p.tipo}</>}
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: 500, color: t.textMuted, fontFamily: FONT.body,
                            marginBottom: 10, letterSpacing: "0.02em",
                          }}>
                            {fmtPostPublicacao(p.publishedAt, p.date)}
                          </div>
                          <div style={{
                            fontSize: 16, color: t.textMuted, lineHeight: 1.55, marginBottom: 14,
                            display: "-webkit-box", WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical" as const, overflow: "hidden", fontFamily: FONT.body,
                          }}>
                            {p.resumo || `Post de ${p.date}`}
                          </div>
                          <div style={{
                            display: "flex", alignItems: "center", flexWrap: "wrap" as const,
                            gap: "10px 18px", fontSize: 14, color: t.textMuted, fontFamily: FONT.body,
                          }}>
                            {p.stats.map((s: ReactNode, j: number) => <span key={j}>{s}</span>)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    aria-label="Postagens anteriores"
                    onClick={() => setCarIdx((i) => Math.max(0, i - 1))}
                    disabled={carIdx === 0}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: `1px solid ${t.cardBorder}`, background: "transparent",
                      color: t.text, cursor: carIdx === 0 ? "not-allowed" : "pointer",
                      opacity: carIdx === 0 ? 0.35 : 1,
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.15s",
                    }}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximas postagens"
                    onClick={() => setCarIdx((i) => Math.min(carMaxStart, i + 1))}
                    disabled={carIdx >= carMaxStart}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: `1px solid ${t.cardBorder}`, background: "transparent",
                      color: t.text, cursor: carIdx >= carMaxStart ? "not-allowed" : "pointer",
                      opacity: carIdx >= carMaxStart ? 0.35 : 1,
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.15s",
                    }}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                  <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                    {posts.length > 0 ? `${carIdx + 1}–${Math.min(carIdx + CAR_WINDOW, posts.length)} / ${posts.length}` : "0 / 0"}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {posts.slice(0, Math.min(posts.length, 8)).map((_, i) => {
                      const ativo = i === Math.min(carIdx, 7);
                      return (
                        <button
                          type="button"
                          key={i}
                          aria-label={`Ir para janela ${i + 1}`}
                          onClick={() => setCarIdx(Math.min(i, carMaxStart))}
                          style={{
                            width: ativo ? 18 : 6,
                            height: 6,
                            padding: 0,
                            border: "none",
                            borderRadius: 999,
                            background: ativo ? brand.accent : t.cardBorder,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        />
                      );
                    })}
                    {posts.length > 8 && (
                      <span style={{ fontSize: 11, color: t.textMuted }}>…</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Sem dados para o período selecionado.
              </div>
            )}
          </div>
          </>
        )
      )}
      </div>
    </div>
  );
}
