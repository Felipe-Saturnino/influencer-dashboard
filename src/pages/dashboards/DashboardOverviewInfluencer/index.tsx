import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../lib/supabasePaginate";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import { buscarMetricasDeAliases, mesclarMetricasComAliases } from "../../../lib/metricasAliases";
import { BRAND } from "../../../lib/dashboardConstants";
import {
  fmt,
  fmtBRL,
  fmtHorasTotal,
  fmtDia,
  getMesesDisponiveis,
  getPeriodoComparativoMoM,
} from "../../../lib/dashboardHelpers";
import {
  SectionTitle,
  KpiCard,
  FunilVisual,
  SelectComIcone,
  RateCard,
} from "../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe, TOTAL_ROW_BG } from "../../../lib/tableStyles";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  GiPodiumWinner, GiFunnel, GiSpeedometer, GiCalendar,
  GiMoneyStack, GiTakeMyMoney, GiStarMedal, GiClapperboard,
  GiSandsOfTime, GiEyeball, GiPerson, GiTrophy,
  GiCash, GiShield, GiCardPlay,
} from "react-icons/gi";

const GiStarMedalFilter = GiStarMedal;
const fmtHoras = fmtHorasTotal;

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

function cel(v: number, isBRL = false) {
  if (v === 0 || (typeof v === "number" && isNaN(v))) return "—";
  return isBRL ? fmtBRL(v) : v.toLocaleString("pt-BR");
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverviewInfluencer() {
  const { theme: t, podeVerInfluencer, podeVerOperadora, escoposVisiveis } = useApp();
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

      // Bloco 5: Comparativo Diário (só quando período = mês)
      if (!historico && mesSelecionado) {
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
          const views = res.media_views || res.max_views || 0;
          if (views > 0) {
            if (!viewsPorDia[live.data]) viewsPorDia[live.data] = [];
            viewsPorDia[live.data].push(views);
            dias[live.data].max_views = Math.max(dias[live.data].max_views, views);
          }
        });
        Object.keys(viewsPorDia).forEach((ds) => {
          if (dias[ds]) {
            const arr = viewsPorDia[ds];
            dias[ds].media_views = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
          }
        });
        setDiasData(Object.values(dias).sort((a, b) => a.data.localeCompare(b.data)));
      } else {
        setDiasData([]);
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, filtroInfluencer, filtroOperadora, podeVerInfluencer, influencersVisiveis, escoposVisiveis.operadorasVisiveis, mesSelecionado]);

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
          Filtro de influencer removido — sem dados no período selecionado.
        </div>
      )}

      {/* ─── BLOCO 2: KPIs Executivos ─────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiPodiumWinner size={14} aria-hidden />} sub={!historico ? "· comparativo MTD vs mesmo período do mês anterior" : undefined}>KPIs Executivos</SectionTitle>
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
        <SectionTitle icon={<GiFunnel size={14} />}>Funil de Conversão</SectionTitle>
        <FunilVisual values={[totais.views, totais.acessos, totais.registros, totais.ftds]} taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]} />
      </div>

      {/* ─── BLOCO 4: Eficiência ──────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiSpeedometer size={14} aria-hidden />}>Eficiência</SectionTitle>
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

      {historico && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionTitle icon={<GiCalendar size={14} aria-hidden />}>Comparativo Diário</SectionTitle>
          <div style={{ padding: "24px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
            O comparativo diário está disponível apenas para meses específicos.
            <br />
            <span style={{ fontSize: 11 }}>Selecione um mês no navegador acima para ver o detalhamento dia a dia.</span>
          </div>
        </div>
      )}

      {/* ─── BLOCO 5: Comparativo Diário ──────────────────────────────────────── */}
      {!historico && mesSelecionado && diasData.length > 0 && (
        <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 0 }}>
          <div style={{ padding: "20px 20px 16px" }}>
            <SectionTitle icon={<GiCalendar size={14} aria-hidden />}>Comparativo Diário</SectionTitle>
          </div>
          <div className="app-table-wrap">
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
              <caption style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                Comparativo diário — {mesSelecionado?.label ?? ""}
              </caption>
              <thead>
                <tr>
                  {["Data","Duração Live","Média Views","Máx Views","Acessos","Registros","# FTDs","R$ FTDs","# Depósitos","R$ Depósitos","# Saques","R$ Saques","R$ GGR"].map((h) => (
                    <th key={h} scope="col" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diasData.map((d, i) => (
                  <tr key={d.data} style={{ background: zebraStripe(i) }}>
                    <td style={tdStyle}>{fmtDia(d.data)}</td>
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
                    <td style={tdStyle}>{cel(d.ggr, true)}</td>
                  </tr>
                ))}
                {diasData.length > 0 && (() => {
                  const tot = diasData.reduce((acc, d) => ({
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
                  }), { duracao: 0, acessos: 0, registros: 0, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 });
                  return (
                    <tr key="total" style={{ background: TOTAL_ROW_BG, fontWeight: 700, borderTop: `2px solid ${t.cardBorder}` }}>
                      <td style={{ ...tdStyle, fontWeight: 700, fontSize: 14, color: brand.primary }}>∑ Total</td>
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
                      <td style={tdStyle}>{cel(tot.ggr, true)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
