import { useState, useEffect, useMemo } from "react";
import { useStreamersFiltrosOptional } from "../StreamersFiltrosContext";
import { useApp } from "../../../../context/AppContext";
import { useDashboardFiltros } from "../../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../../hooks/useDashboardBrand";
import { usePermission } from "../../../../hooks/usePermission";
import { FONT } from "../../../../constants/theme";
import { BRAND, MSG_SEM_DADOS_FILTRO } from "../../../../lib/dashboardConstants";
import { SelectComIcone, SectionTitle, KpiCard } from "../../../../components/dashboard";
import { getThStyle, getTdStyle, zebraStripe } from "../../../../lib/tableStyles";
import { supabase } from "../../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../../lib/supabasePaginate";
import { buscarInvestimentoPago, filtrosInvestimentoPorEscopo } from "../../../../lib/investimentoPago";
import { getPeriodoComparativoMoM } from "../../../../lib/dashboardHelpers";
import {
  Award,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Gauge,
  ListOrdered,
  Percent,
  PlayCircle,
  Scale,
  Shield,
  User,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";

const PIE_COLORS = [
  "var(--brand-action, #7c3aed)",
  "var(--brand-contrast, #1e36f8)",
  "var(--brand-icon-color)",
  "#22c55e",
  "#e84025",
  "#e5755a",
  "#a78bfa",
  "#38bdf8",
  "#94a3b8",
];

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type PerfilJogador = "Whales" | "Core" | "Recreativos" | "Caçadores de Bônus";

/** Categorias analíticas — paleta semântica fixa (não segue brand da operadora). */
const PERFIL_CORES: Record<PerfilJogador, { cor: string; bg: string; border: string }> = {
  Whales: {
    cor: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.35)",
  },
  Core: {
    cor: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.35)",
  },
  Recreativos: {
    cor: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
  },
  "Caçadores de Bônus": {
    cor: "#e84025",
    bg: "rgba(232,64,37,0.12)",
    border: "rgba(232,64,37,0.35)",
  },
};

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface InfluencerPerfil { id: string; nome_artistico: string; cache_hora: number; }

interface MetricaRow {
  influencer_id: string;
  ftd_count: number; ftd_total: number;
  deposit_count: number; deposit_total: number;
  withdrawal_count: number; withdrawal_total: number;
  ggr: number;
}

interface FinanceiroRow {
  influencer_id: string; nome: string;
  investimento: number; ggr: number; roi: number;
  ftds: number; ftd_total: number; ftd_ticket_medio: number;
  depositos: number; deposit_count: number; deposito_ticket_medio: number;
  saques: number; saque_ticket_medio: number;
  ggr_por_jogador: number; wd_ratio: number; pvi: number;
  perfil_jogador: PerfilJogador;
}

interface TotaisFinanceiros {
  ftd_total: number; ftds: number; ftd_ticket_medio: number;
  depositos: number; deposit_count: number; deposito_ticket_medio: number;
  saques: number; saque_ticket_medio: number;
  ggr: number; ggr_por_jogador: number; wd_ratio: number; pvi: number; investimento: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let { ano, mes } = MES_INICIO;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++; if (mes > 11) { mes = 0; ano++; }
  }
  return lista;
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── PVI ──────────────────────────────────────────────────────────────────────
function scoreTicketMedioDeposito(v: number): number {
  if (v > 1000) return 100; if (v >= 600) return 80;
  if (v >= 200) return 60;  if (v >= 100) return 40;
  if (v > 0)   return 20;  return 0;
}
function scoreGgrPorJogador(v: number): number {
  if (v > 500) return 100; if (v >= 200) return 80;
  if (v >= 100) return 60; if (v >= 50)  return 40;
  if (v > 0)   return 20;  return 0;
}
function scoreWdRatio(pct: number): number {
  if (pct < 40)  return 100; if (pct <= 60) return 80;
  if (pct <= 75) return 60;  if (pct <= 90) return 40;
  return 20;
}
function calculaPVI(ticketMedioDep: number, ggrPorJogador: number, wdRatioPct: number): number {
  return Math.round(
    scoreTicketMedioDeposito(ticketMedioDep) * 0.4 +
    scoreGgrPorJogador(ggrPorJogador) * 0.4 +
    scoreWdRatio(wdRatioPct) * 0.2
  );
}
function getPerfilJogador(pvi: number): PerfilJogador {
  if (pvi >= 80) return "Whales";
  if (pvi >= 60) return "Core";
  if (pvi >= 15) return "Recreativos";
  return "Caçadores de Bônus";
}

function wdRatioColor(pct: number): string {
  if (pct < 60) return BRAND.verde;
  if (pct <= 80) return BRAND.amarelo;
  return BRAND.vermelho;
}

// ─── TOOLTIP CUSTOMIZADO DA PIZZA ─────────────────────────────────────────────
function PieTooltip({ active, payload, total }: {
  active?: boolean; payload?: { name: string; value: number; payload: { color: string; nomeCompleto: string } }[];
  total: number;
}) {
  const { theme: tt, isDark } = useApp();
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
  return (
    <div style={{
      background: tt.cardBg,
      border: `1px solid ${tt.cardBorder}`,
      borderRadius: 10,
      padding: "8px 12px",
      fontSize: 12,
      color: tt.text,
      boxShadow: isDark ? "0 6px 20px rgba(0,0,0,0.35)" : "0 4px 16px rgba(0,0,0,0.12)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.payload.color, display: "inline-block" }} />
        <span style={{ fontWeight: 700 }}>{p.payload.nomeCompleto}</span>
      </div>
      <div>{fmtBRL(p.value)} <span style={{ color: tt.textMuted }}>· {pct}%</span></div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardFinanceiro() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("streamers");
  const sf = useStreamersFiltrosOptional();
  const embed = sf !== null;

  const mesesDisponiveisLocal = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicialLocal = mesesDisponiveisLocal.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());
  const idxStartLocal = idxInicialLocal >= 0 ? idxInicialLocal : mesesDisponiveisLocal.length - 1;

  const [idxMesLocal, setIdxMesLocal] = useState(idxStartLocal);
  const [historicoLocal, setHistoricoLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroInfluencerLocal, setFiltroInfluencerLocal] = useState("todos");
  const [operadoraFiltroLocal, setOperadoraFiltroLocal] = useState("todas");

  const mesesDisponiveis = embed ? sf.mesesDisponiveis : mesesDisponiveisLocal;
  const idxMes = embed ? sf.idxMes : idxMesLocal;
  const setIdxMes = embed ? sf.setIdxMes : setIdxMesLocal;
  const historico = embed ? sf.historico : historicoLocal;
  const setHistorico = embed ? sf.setHistorico : setHistoricoLocal;
  const filtroInfluencer = embed ? sf.filtroInfluencer : filtroInfluencerLocal;
  const setFiltroInfluencer = embed ? sf.setFiltroInfluencer : setFiltroInfluencerLocal;
  const operadoraFiltro = embed ? sf.filtroOperadora : operadoraFiltroLocal;
  const setOperadoraFiltro = embed ? sf.setFiltroOperadora : setOperadoraFiltroLocal;
  const operadoraForApi = operadoraSlugsForcado?.[0] ?? (operadoraFiltro !== "todas" ? operadoraFiltro : null);
  const [rows, setRows]             = useState<FinanceiroRow[]>([]);
  const [totais, setTotais]         = useState<TotaisFinanceiros>({ ftd_total: 0, ftds: 0, ftd_ticket_medio: 0, depositos: 0, deposit_count: 0, deposito_ticket_medio: 0, saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0, wd_ratio: 0, pvi: 0, investimento: 0 });
  const [totaisAnt, setTotaisAnt]   = useState<TotaisFinanceiros>({ ftd_total: 0, ftds: 0, ftd_ticket_medio: 0, depositos: 0, deposit_count: 0, deposito_ticket_medio: 0, saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0, wd_ratio: 0, pvi: 0, investimento: 0 });
  const [investimentoAgentes, setInvestimentoAgentes] = useState(0);
  const [operadorasListLocal, setOperadorasListLocal] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMapLocal, setOperadoraInfMapLocal] = useState<Record<string, string[]>>({});
  const operadorasList = embed ? sf.operadorasList : operadorasListLocal;
  const operadoraInfMap = embed ? sf.operadoraInfMap : operadoraInfMapLocal;
  const idxInicial = embed ? sf.idxInicial : idxStartLocal;

  useEffect(() => {
    if (!embed || !sf) return;
    sf.setIsLoading(loading);
  }, [embed, sf, loading]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial);
    } else setHistorico(true);
  }

  // ── BUSCA DE DADOS (lógica 100% idêntica ao original) ────────────────────────
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
      }

      const hojeNow = new Date();
      const isMesAtual = !historico && mesSelecionado && mesSelecionado.ano === hojeNow.getFullYear() && mesSelecionado.mes === hojeNow.getMonth();
      const { inicio: periodoInicio, fim: periodoFim } = historico || !mesSelecionado
        ? { inicio: "2020-01-01", fim: hojeNow.toISOString().split("T")[0] }
        : getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes).atual;

      let metricas: { influencer_id: string; ftd_count: number; ftd_total: number; deposit_count: number; deposit_total: number; withdrawal_count: number; withdrawal_total: number; ggr: number }[] = [];
      try {
        if (isMesAtual) throw new Error("Usar fallback para MTD");
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_metricas_financeiro", {
          p_ano: historico ? null : mesSelecionado?.ano ?? null,
          p_mes: historico ? null : mesSelecionado?.mes ?? null,
          p_influencer_id: filtroInfluencer === "todos" ? null : filtroInfluencer,
          p_historico: historico,
          p_operadora_slug: operadoraForApi,
        });
        if (!rpcErr && rpcData) {
          metricas = rpcData;
          if (historico) {
            const { buscarMetricasDeAliases } = await import("../../../../lib/metricasAliases");
            const aliasesSinteticas = await buscarMetricasDeAliases({
              operadora_slug: operadoraForApi ?? undefined,
              influencerIds: filtroInfluencer !== "todos" ? [filtroInfluencer] : undefined,
              dataInicio: periodoInicio,
              dataFim: periodoFim,
            });
            const idsNaRpc = new Set(metricas.map((m) => m.influencer_id));
            for (const a of aliasesSinteticas) {
              if (!idsNaRpc.has(a.influencer_id) && podeVerInfluencer(a.influencer_id)) {
                metricas = [...metricas, { influencer_id: a.influencer_id, ftd_count: a.ftd_count, ftd_total: a.ftd_total, deposit_count: a.deposit_count, deposit_total: a.deposit_total, withdrawal_count: a.withdrawal_count, withdrawal_total: a.withdrawal_total, ggr: a.ggr, ano: mesSelecionado?.ano, mes: mesSelecionado?.mes } as (typeof metricas)[0]];
              }
            }
          }
        } else { throw new Error("RPC vazia ou erro"); }
      } catch {
        const raw = await fetchAllPages<{ influencer_id: string; ftd_count: number; ftd_total: number; deposit_count: number; deposit_total: number; withdrawal_count: number; withdrawal_total: number; ggr: number }>(
          async (from, to) => {
            let qMetricas = supabase.from("influencer_metricas")
              .select("influencer_id, ftd_count, ftd_total, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data, operadora_slug")
              .order("data", { ascending: true })
              .order("influencer_id", { ascending: true })
              .order("operadora_slug", { ascending: true })
              .range(from, to);
            if (!historico && mesSelecionado) {
              const { inicio, fim } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes).atual;
              qMetricas = qMetricas.gte("data", inicio).lte("data", fim);
            }
            if (filtroInfluencer !== "todos") qMetricas = qMetricas.eq("influencer_id", filtroInfluencer);
            if (operadoraSlugsForcado?.length) qMetricas = qMetricas.in("operadora_slug", operadoraSlugsForcado);
            else if (operadoraFiltro !== "todas") qMetricas = qMetricas.eq("operadora_slug", operadoraFiltro);
            return qMetricas;
          }
        );
        const mapaAgreg = new Map<string, MetricaRow>();
        raw.forEach((m) => {
          if (!mapaAgreg.has(m.influencer_id)) mapaAgreg.set(m.influencer_id, { influencer_id: m.influencer_id, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 });
          const r = mapaAgreg.get(m.influencer_id)!;
          r.ftd_count += m.ftd_count || 0; r.ftd_total += m.ftd_total ?? 0;
          r.deposit_count += m.deposit_count || 0; r.deposit_total += m.deposit_total || 0;
          r.withdrawal_count += m.withdrawal_count || 0; r.withdrawal_total += m.withdrawal_total || 0;
          r.ggr += m.ggr || 0;
        });
        if (historico) {
          const { buscarMetricasDeAliases } = await import("../../../../lib/metricasAliases");
          const aliasesSinteticas = await buscarMetricasDeAliases({
            operadora_slug: operadoraForApi ?? undefined,
            influencerIds: filtroInfluencer !== "todos" ? [filtroInfluencer] : undefined,
            dataInicio: periodoInicio,
            dataFim: periodoFim,
          });
          for (const a of aliasesSinteticas) {
            if (!mapaAgreg.has(a.influencer_id) && podeVerInfluencer(a.influencer_id)) {
              mapaAgreg.set(a.influencer_id, {
                influencer_id: a.influencer_id,
                ftd_count: a.ftd_count,
                ftd_total: a.ftd_total,
                deposit_count: a.deposit_count,
                deposit_total: a.deposit_total,
                withdrawal_count: a.withdrawal_count,
                withdrawal_total: a.withdrawal_total,
                ggr: a.ggr,
              });
            }
          }
        }
        metricas = Array.from(mapaAgreg.entries()).map(([id, r]) => ({ ...r, influencer_id: id, ano: mesSelecionado?.ano, mes: mesSelecionado?.mes })) as typeof metricas;
      }

      const lives = await fetchAllPages<{ id: string; influencer_id: string; status: string; data: string; operadora_slug: string }>(
        async (from, to) => {
          let qLives = supabase.from("lives").select("id, influencer_id, status, data, operadora_slug").eq("status", "realizada")
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);
          if (!historico && mesSelecionado) {
            const { inicio, fim } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes).atual;
            qLives = qLives.gte("data", inicio).lte("data", fim);
          }
          if (filtroInfluencer !== "todos") qLives = qLives.eq("influencer_id", filtroInfluencer);
          if (operadoraSlugsForcado?.length) qLives = qLives.in("operadora_slug", operadoraSlugsForcado);
          else if (operadoraFiltro !== "todas") qLives = qLives.eq("operadora_slug", operadoraFiltro);
          return qLives;
        }
      );
      const liveIds = lives.map((l) => l.id);
      const resultados = await fetchLiveResultadosBatched<{ live_id: string; duracao_horas: number; duracao_min: number }>(
        liveIds,
        async (slice) => await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", slice)
      );
      const horasMap = new Map<string, number>();
      lives.forEach((live: { influencer_id: string; id: string }) => {
        const res = resultados.find((r) => r.live_id === live.id);
        if (res) { const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60; horasMap.set(live.influencer_id, (horasMap.get(live.influencer_id) || 0) + h); }
      });

      const { total: investimentoTotal, porInfluencer: investimentoPorInf, agentes: investimentoAgentes } = await buscarInvestimentoPago(
        { inicio: periodoInicio, fim: periodoFim },
        filtrosInvestimentoPorEscopo(
          {
            semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo,
            vêTodosInfluencers: escoposVisiveis.vêTodosInfluencers,
            influencersVisiveis: escoposVisiveis.influencersVisiveis,
          },
          { operadora_slug: operadoraForApi, filtroInfluencer }
        )
      );

      const mapa = new Map<string, Record<string, unknown>>();
      metricas.forEach((m) => mapa.set(m.influencer_id, { ...m, ftd_count: Number(m.ftd_count)||0, ftd_total: Number(m.ftd_total)||0, deposit_count: Number(m.deposit_count)||0, deposit_total: Number(m.deposit_total)||0, withdrawal_count: Number(m.withdrawal_count)||0, withdrawal_total: Number(m.withdrawal_total)||0, ggr: Number(m.ggr)||0 }));

      const resultado: FinanceiroRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const investimento = investimentoPorInf[id] ?? 0;
        const d = data as Record<string, number>;
        const ftd_ticket_medio = (d.ftd_ticket_medio as number) ?? (d.ftd_count > 0 ? d.ftd_total / d.ftd_count : 0);
        const deposito_ticket_medio = (d.deposito_ticket_medio as number) ?? (d.deposit_count > 0 ? d.deposit_total / d.deposit_count : 0);
        const saque_ticket_medio = (d.saque_ticket_medio as number) ?? ((d.withdrawal_count||0) > 0 ? d.withdrawal_total / (d.withdrawal_count||1) : 0);
        const ggr_por_jogador = (d.ggr_por_jogador as number) ?? (d.ftd_count > 0 ? d.ggr / d.ftd_count : 0);
        const wd_ratio_pct = (d.wd_ratio as number) ?? (d.deposit_total > 0 ? (d.withdrawal_total / d.deposit_total) * 100 : 0);
        const pvi = (d.pvi as number) ?? calculaPVI(deposito_ticket_medio, ggr_por_jogador, wd_ratio_pct);
        const perfilJogadorVal = d.perfil_jogador;
        const perfil_jogador: PerfilJogador = (typeof perfilJogadorVal === "string" && ["Whales","Core","Recreativos","Caçadores de Bônus"].includes(perfilJogadorVal))
          ? (perfilJogadorVal as PerfilJogador)
          : getPerfilJogador(pvi);
        resultado.push({ influencer_id: id, nome: perfil.nome_artistico, investimento, ggr: d.ggr, roi: 0, ftds: d.ftd_count, ftd_total: d.ftd_total, ftd_ticket_medio, depositos: d.deposit_total, deposit_count: d.deposit_count, deposito_ticket_medio, saques: d.withdrawal_total, saque_ticket_medio, ggr_por_jogador, wd_ratio: wd_ratio_pct, pvi, perfil_jogador });
      });

      resultado.sort((a, b) => b.pvi - a.pvi);
      const rowsVisiveis = resultado.filter((r) => podeVerInfluencer(r.influencer_id));
      setRows(rowsVisiveis);

      function calcTotais(arr: FinanceiroRow[], totalInvestimento?: number): TotaisFinanceiros {
        const tFTDs = arr.reduce((s,r) => s+r.ftds, 0);
        const tFtdTotal = arr.reduce((s,r) => s+r.ftd_total, 0);
        const tDep = arr.reduce((s,r) => s+r.depositos, 0);
        const tDepCount = arr.reduce((s,r) => s+r.deposit_count, 0);
        const tSaq = arr.reduce((s,r) => s+r.saques, 0);
        const tGGR = arr.reduce((s,r) => s+r.ggr, 0);
        const tInvest = totalInvestimento ?? arr.reduce((s,r) => s+r.investimento, 0);
        const depTM = tDepCount > 0 ? tDep/tDepCount : 0;
        const ggrPJ = tFTDs > 0 ? tGGR/tFTDs : 0;
        const wdPct = tDep > 0 ? (tSaq/tDep)*100 : 0;
        const saqCount = arr.reduce((s,r) => s + (r.saque_ticket_medio > 0 ? Math.round(r.saques/r.saque_ticket_medio) : 0), 0);
        return { ftd_total: tFtdTotal, ftds: tFTDs, ftd_ticket_medio: tFTDs>0?tFtdTotal/tFTDs:0, depositos: tDep, deposit_count: tDepCount, deposito_ticket_medio: depTM, saques: tSaq, saque_ticket_medio: saqCount>0?tSaq/saqCount:0, ggr: tGGR, ggr_por_jogador: ggrPJ, wd_ratio: wdPct, pvi: calculaPVI(depTM, ggrPJ, wdPct), investimento: tInvest };
      }

      setTotais(calcTotais(rowsVisiveis, investimentoTotal));
      setInvestimentoAgentes(investimentoAgentes ?? 0);

      if (!historico && mesSelecionado) {
        const periodoAnt = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes).anterior;
        const [investAnt, mA] = await Promise.all([
          buscarInvestimentoPago(
            { inicio: periodoAnt.inicio, fim: periodoAnt.fim },
            filtrosInvestimentoPorEscopo(
              {
                semRestricaoEscopo: escoposVisiveis.semRestricaoEscopo,
                vêTodosInfluencers: escoposVisiveis.vêTodosInfluencers,
                influencersVisiveis: escoposVisiveis.influencersVisiveis,
              },
              { operadora_slug: operadoraForApi, filtroInfluencer }
            )
          ),
          (async () =>
            fetchAllPages(async (from, to) => {
              let qA = supabase.from("influencer_metricas").select("influencer_id, ftd_count, ftd_total, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data, operadora_slug")
                .gte("data", periodoAnt.inicio).lte("data", periodoAnt.fim)
                .order("data", { ascending: true })
                .order("influencer_id", { ascending: true })
                .order("operadora_slug", { ascending: true })
                .range(from, to);
              if (filtroInfluencer !== "todos") qA = qA.eq("influencer_id", filtroInfluencer);
              if (operadoraSlugsForcado?.length) qA = qA.in("operadora_slug", operadoraSlugsForcado);
              else if (operadoraFiltro !== "todas") qA = qA.eq("operadora_slug", operadoraFiltro);
              return qA;
            }))(),
        ]);
        const mapaA = new Map<string, MetricaRow>();
        (mA as Record<string, unknown>[]).forEach((m: Record<string, unknown>) => {
          const mid = m.influencer_id as string;
          if (!mapaA.has(mid)) mapaA.set(mid, { influencer_id: mid, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 });
          const r = mapaA.get(mid)!;
          r.ftd_count += (m.ftd_count as number)||0; r.ftd_total += (m.ftd_total as number)??0;
          r.deposit_count += (m.deposit_count as number)||0; r.deposit_total += (m.deposit_total as number)||0;
          r.withdrawal_count += (m.withdrawal_count as number)||0; r.withdrawal_total += (m.withdrawal_total as number)||0;
          r.ggr += (m.ggr as number)||0;
        });
        const rowsAnt: FinanceiroRow[] = [];
        mapaA.forEach((data, id) => {
          const perfil = perfisLista.find((p) => p.id === id);
          if (!perfil) return;
          const investimento = investAnt.porInfluencer[id] ?? 0;
          const deposito_ticket_medio = data.deposit_count>0?data.deposit_total/data.deposit_count:0;
          const ggr_por_jogador = data.ftd_count>0?data.ggr/data.ftd_count:0;
          const wd_ratio_pct = data.deposit_total>0?(data.withdrawal_total/data.deposit_total)*100:0;
          const pvi = calculaPVI(deposito_ticket_medio, ggr_por_jogador, wd_ratio_pct);
          rowsAnt.push({ influencer_id: id, nome: perfil.nome_artistico, investimento, ggr: data.ggr, roi: 0, ftds: data.ftd_count, ftd_total: data.ftd_total, ftd_ticket_medio: data.ftd_count>0?data.ftd_total/data.ftd_count:0, depositos: data.deposit_total, deposit_count: data.deposit_count, deposito_ticket_medio, saques: data.withdrawal_total, saque_ticket_medio: (data.withdrawal_count||0)>0?data.withdrawal_total/(data.withdrawal_count||1):0, ggr_por_jogador, wd_ratio: wd_ratio_pct, pvi, perfil_jogador: getPerfilJogador(pvi) });
        });
        setTotaisAnt(calcTotais(rowsAnt.filter((r) => podeVerInfluencer(r.influencer_id)), investAnt.total));
      } else {
        setTotaisAnt({ ftd_total: 0, ftds: 0, ftd_ticket_medio: 0, depositos: 0, deposit_count: 0, deposito_ticket_medio: 0, saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0, wd_ratio: 0, pvi: 0, investimento: 0 });
      }

      setLoading(false);
    }
    carregar();
  }, [embed, escoposVisiveis, historico, idxMes, filtroInfluencer, operadoraFiltro, mesSelecionado, podeVerInfluencer, operadoraSlugsForcado, operadoraForApi]);

  // ── DADOS FILTRADOS ───────────────────────────────────────────────────────────
  const rowsParaExibir = useMemo(() => {
    if (operadoraSlugsForcado?.length) {
      const ids = new Set<string>();
      operadoraSlugsForcado.forEach((slug) => (operadoraInfMap[slug] ?? []).forEach((id) => ids.add(id)));
      return rows.filter((r) => ids.has(r.influencer_id));
    }
    if (operadoraFiltro === "todas") return rows;
    const ids = operadoraInfMap[operadoraFiltro] ?? [];
    return rows.filter((r) => ids.includes(r.influencer_id));
  }, [rows, operadoraFiltro, operadoraInfMap, operadoraSlugsForcado]);

  const totaisExibir = useMemo(() => {
    const tFTDs = rowsParaExibir.reduce((s,r) => s+r.ftds, 0);
    const tFtdTotal = rowsParaExibir.reduce((s,r) => s+r.ftd_total, 0);
    const tDep = rowsParaExibir.reduce((s,r) => s+r.depositos, 0);
    const tDepCount = rowsParaExibir.reduce((s,r) => s+r.deposit_count, 0);
    const tSaq = rowsParaExibir.reduce((s,r) => s+r.saques, 0);
    const tGGR = rowsParaExibir.reduce((s,r) => s+r.ggr, 0);
    const depTM = tDepCount>0?tDep/tDepCount:0;
    const ggrPJ = tFTDs>0?tGGR/tFTDs:0;
    const wdPct = tDep>0?(tSaq/tDep)*100:0;
    const saqCount = rowsParaExibir.reduce((s,r) => s+(r.saque_ticket_medio>0?Math.round(r.saques/r.saque_ticket_medio):0), 0);
    // investimento vem de totais (visão global inclui Agentes; escopo agência/influencer não)
    return { ...totais, ftd_total: tFtdTotal, ftds: tFTDs, ftd_ticket_medio: tFTDs>0?tFtdTotal/tFTDs:0, depositos: tDep, deposit_count: tDepCount, deposito_ticket_medio: depTM, saques: tSaq, saque_ticket_medio: saqCount>0?tSaq/saqCount:0, ggr: tGGR, ggr_por_jogador: ggrPJ, wd_ratio: wdPct, pvi: calculaPVI(depTM,ggrPJ,wdPct) };
  }, [rowsParaExibir, totais]);

  // Pizza: top 9 influencers individuais; Agentes sempre em Outros (quando filtroInfluencer === "todos")
  const pieInvestimento = useMemo(() => {
    const raw = rowsParaExibir
      .filter((r) => Math.round(r.investimento) > 0)
      .sort((a, b) => b.investimento - a.investimento)
      .map((r, i) => ({ name: r.nome.split(" ")[0], nomeCompleto: r.nome, value: Math.round(r.investimento), color: PIE_COLORS[i % PIE_COLORS.length] }));
    const agentesVal = Math.round(investimentoAgentes);
    const top9 = raw.slice(0, 9);
    const resto = raw.slice(9);
    const valorOutros = resto.reduce((s, o) => s + o.value, 0) + agentesVal;
    if (valorOutros <= 0) return top9;
    const qtdResto = resto.length;
    const labelOutros = agentesVal > 0
      ? (qtdResto > 0 ? `Outros (${qtdResto} influencers + Agentes)` : "Outros (Agentes)")
      : `Outros (${qtdResto} influencers)`;
    return [...top9, { name: "Outros", nomeCompleto: labelOutros, value: valorOutros, color: "#94a3b8" }];
  }, [rowsParaExibir, investimentoAgentes]);

  const pieTotal = useMemo(() => pieInvestimento.reduce((s, d) => s + d.value, 0), [pieInvestimento]);

  const brand = useDashboardBrand();

  // ── ESTILOS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: brand.blockBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 18, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const thStyle = getThStyle(t);
  const thGroup = getThStyle(t, { textAlign: "center", borderBottom: "none" });
  const thSub = getThStyle(t, { fontSize: 9, fontWeight: 500, letterSpacing: "0.06em" });
  const tdStyle = getTdStyle(t);

  const btnNavStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`, background: "transparent",
    color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

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
            <button type="button" aria-label="Mês anterior" style={{ ...btnNavStyle, opacity: historico||idxMes===0?0.35:1, cursor: historico||idxMes===0?"not-allowed":"pointer" }}
              onClick={irMesAnterior} disabled={historico||idxMes===0}>
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button type="button" aria-label="Próximo mês" style={{ ...btnNavStyle, opacity: historico||idxMes===mesesDisponiveis.length-1?0.35:1, cursor: historico||idxMes===mesesDisponiveis.length-1?"not-allowed":"pointer" }}
              onClick={irMesProximo} disabled={historico||idxMes===mesesDisponiveis.length-1}>
              <ChevronRight size={14} aria-hidden />
            </button>
            <button type="button" aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"} aria-pressed={historico} onClick={toggleHistorico} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              fontFamily: FONT.body, fontSize: 13,
              border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
              background: historico ? (brand.useBrand ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)" : "rgba(124,58,237,0.15)") : "transparent",
              color: historico ? brand.accent : t.textMuted,
              fontWeight: historico ? 700 : 400, transition: "all 0.15s",
            }}>
              <Calendar size={14} aria-hidden /> Histórico
            </button>
            {showFiltroInfluencer && (
              <SelectComIcone
                icon={<User size={14} aria-hidden />}
                label="Filtrar por influencer"
                value={filtroInfluencer}
                onChange={setFiltroInfluencer}
              >
                <option value="todos">Todos os influencers</option>
                {[...rows].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((r) => (
                  <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                ))}
              </SelectComIcone>
            )}
            {showFiltroOperadora && (
              <SelectComIcone
                icon={<Shield size={14} aria-hidden />}
                label="Filtrar por operadora"
                value={operadoraFiltro}
                onChange={setOperadoraFiltro}
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

      {/* ══ BLOCO 2: KPIs FINANCEIROS ═══════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle
          icon={<BarChart2 size={14} aria-hidden />}
          sub={historico ? "acumulado" : "· comparativo MTD vs mesmo período do mês anterior"}
        >
          KPIs Financeiros
        </SectionTitle>

        {/* Linha 1: FTD / Depósitos / Saques */}
        <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
          <KpiCard
            label="FTD" value={fmtBRL(totaisExibir.ftd_total)}
            subValue={{ label: "ticket médio", value: totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.ftd_ticket_medio) : "—" }}
            icon={<Award size={14} aria-hidden />} accentVar="--brand-action" accentColor={BRAND.roxo}
            atual={totaisExibir.ftd_total} anterior={totaisAnt.ftd_total}
            isHistorico={historico} isBRL
          />
          <KpiCard
            label="Depósitos" value={fmtBRL(totaisExibir.depositos)}
            subValue={{ label: "ticket médio", value: totaisExibir.deposit_count > 0 ? fmtBRL(totaisExibir.deposito_ticket_medio) : "—" }}
            icon={<PlayCircle size={14} aria-hidden />} accentVar="--brand-icon-color" accentColor={BRAND.ciano}
            atual={totaisExibir.depositos} anterior={totaisAnt.depositos}
            isHistorico={historico} isBRL
          />
          <KpiCard
            label="Saques" value={fmtBRL(totaisExibir.saques)}
            subValue={{ label: "ticket médio", value: totaisExibir.saque_ticket_medio > 0 ? fmtBRL(totaisExibir.saque_ticket_medio) : "—" }}
            icon={<CreditCard size={14} aria-hidden />} accentColor={BRAND.vermelho}
            atual={totaisExibir.saques} anterior={totaisAnt.saques}
            isHistorico={historico} isBRL isInverso
          />
        </div>

        {/* Linha 2: WD Ratio / GGR por Jogador / PVI */}
        <div className="app-grid-kpi-3">
          <KpiCard
            label="WD Ratio"
            value={totaisExibir.depositos > 0 ? `${totaisExibir.wd_ratio.toFixed(1)}%` : "—"}
            icon={<Scale size={14} aria-hidden />} accentColor={BRAND.vermelho}
            atual={totaisExibir.wd_ratio} anterior={totaisAnt.wd_ratio}
            isHistorico={historico} isInverso
          />
          <KpiCard
            label="GGR por Jogador"
            value={totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.ggr_por_jogador) : "—"}
            icon={<Percent size={14} aria-hidden />} accentColor={BRAND.roxo}
            atual={totaisExibir.ggr_por_jogador} anterior={totaisAnt.ggr_por_jogador}
            isHistorico={historico} isBRL
          />
          <KpiCard
            label="PVI"
            value={totaisExibir.pvi > 0 ? `${totaisExibir.pvi} pts` : "—"}
            subValue={{ label: "Player Value Index (0–100)", value: "" }}
            icon={<Gauge size={14} aria-hidden />} accentVar="--brand-contrast" accentColor={BRAND.verde}
            atual={totaisExibir.pvi} anterior={totaisAnt.pvi}
            isHistorico={historico}
          />
        </div>
      </div>

      {/* ══ BLOCO 3: INVESTIMENTO POR INFLUENCER ════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<Coins size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
          Investimento por Influencer
        </SectionTitle>

        {loading || pieInvestimento.length === 0 ? (
          <div style={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>
            {loading ? "Carregando..." : MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
            {/* Gráfico */}
            <div
              role="img"
              aria-label={`Distribuição de investimento por influencer — ${historico ? "todo o período" : (mesSelecionado?.label ?? "")}`}
              style={{ flex: "0 0 320px", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              <ResponsiveContainer width={320} height={320}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie data={pieInvestimento} cx="50%" cy="50%" outerRadius={130} innerRadius={50} dataKey="value" paddingAngle={2}>
                    {pieInvestimento.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip total={pieTotal} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda com percentual + barra */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pieInvestimento.map((entry, i) => {
                  const pct = pieTotal > 0 ? (entry.value / pieTotal) * 100 : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: t.text, fontFamily: FONT.body }}>{entry.nomeCompleto}</span>
                        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginRight: 4 }}>{pct.toFixed(1)}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: FONT.body }}>{fmtBRL(entry.value)}</span>
                      </div>
                      {/* Barra de proporção */}
                      <div style={{ height: 3, background: t.cardBorder, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: entry.color, borderRadius: 999, opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ BLOCO 4: RANKING FINANCEIRO ══════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <SectionTitle icon={<ListOrdered size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
            Ranking Financeiro
          </SectionTitle>
          {/* Legenda de perfis */}
          <div style={{ display: "flex", gap: 6, fontSize: 11, flexWrap: "wrap" }}>
            {(["Whales","Core","Recreativos","Caçadores de Bônus"] as PerfilJogador[]).map((p) => {
              const st = PERFIL_CORES[p];
              return (
                <span key={p} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontFamily: FONT.body }}>
                  <User size={11} aria-hidden /> {p}
                </span>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rowsParaExibir.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>{MSG_SEM_DADOS_FILTRO}</div>
        ) : (
          <div className="app-table-wrap">
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <caption style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                Ranking financeiro de influencers — {historico ? "Todo o período" : (mesSelecionado?.label ?? "")}
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" style={thStyle}>Influencer</th>
                  <th colSpan={2} scope="colgroup" style={thGroup}>FTD</th>
                  <th colSpan={2} scope="colgroup" style={{ ...thGroup, borderLeft: `1px solid ${t.cardBorder}` }}>Depósitos</th>
                  <th colSpan={2} scope="colgroup" style={{ ...thGroup, borderLeft: `1px solid ${t.cardBorder}` }}>Saques</th>
                  <th rowSpan={2} scope="col" style={thStyle}>R$ GGR</th>
                  <th rowSpan={2} scope="col" style={thStyle}>GGR/Jogador</th>
                  <th rowSpan={2} scope="col" style={thStyle}>WD Ratio</th>
                  <th rowSpan={2} scope="col" style={thStyle}>PVI</th>
                  <th rowSpan={2} scope="col" style={thStyle}>Perfil</th>
                </tr>
                <tr>
                  <th scope="col" style={thSub}>R$ Total</th>
                  <th scope="col" style={thSub}>Ticket Médio</th>
                  <th scope="col" style={{ ...thSub, borderLeft: `1px solid ${t.cardBorder}` }}>R$ Total</th>
                  <th scope="col" style={thSub}>Ticket Médio</th>
                  <th scope="col" style={{ ...thSub, borderLeft: `1px solid ${t.cardBorder}` }}>R$ Total</th>
                  <th scope="col" style={thSub}>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {rowsParaExibir.map((r, i) => {
                  const st = PERFIL_CORES[r.perfil_jogador];
                  return (
                    <tr key={r.influencer_id} style={{ background: zebraStripe(i) }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{fmtBRL(r.ftd_total)}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.ftd_ticket_medio) : "—"}</td>
                      <td style={tdStyle}>{fmtBRL(r.depositos)}</td>
                      <td style={tdStyle}>{r.deposit_count > 0 ? fmtBRL(r.deposito_ticket_medio) : "—"}</td>
                      <td style={tdStyle}>{fmtBRL(r.saques)}</td>
                      <td style={tdStyle}>{r.saque_ticket_medio > 0 ? fmtBRL(r.saque_ticket_medio) : "—"}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.ggr_por_jogador) : "—"}</td>
                      <td style={{
                        ...tdStyle,
                        color: r.depositos > 0 ? wdRatioColor(r.wd_ratio) : t.text,
                        fontWeight: r.depositos > 0 ? 700 : 400,
                      }}>
                        {r.depositos > 0 ? `${r.wd_ratio.toFixed(1)}%` : "—"}
                      </td>
                      <td style={tdStyle}>{r.pvi} pts</td>
                      <td style={tdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body, whiteSpace: "nowrap" }}>
                          <User size={11} aria-hidden /> {r.perfil_jogador}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
