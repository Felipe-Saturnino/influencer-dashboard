import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const PIE_COLORS = ["#7c3aed","#2563eb","#059669","#f59e0b","#ef4444","#a855f7","#06b6d4","#ec4899"];

interface InfluencerPerfil { id: string; nome_artistico: string; cache_hora: number; }

interface MetricaRow {
  influencer_id: string;
  ftd_count: number;
  ftd_total: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
  ggr: number;
}

interface FinanceiroRow {
  influencer_id: string;
  nome: string;
  investimento: number;
  ggr: number;
  roi: number;
  ftds: number;
  ftd_total: number;
  ftd_ticket_medio: number;
  depositos: number;
  deposit_count: number;
  deposito_ticket_medio: number;
  saques: number;
  saque_ticket_medio: number;
  ggr_por_jogador: number;
  wd_ratio: number;
  pvi: number;
  perfil_jogador: "Whales" | "Core" | "Recreativos" | "Caçadores de Bônus";
}

type PerfilJogador = FinanceiroRow["perfil_jogador"];

interface TotaisFinanceiros {
  ftd_total: number;
  ftds: number;
  ftd_ticket_medio: number;
  depositos: number;
  deposit_count: number;
  deposito_ticket_medio: number;
  saques: number;
  saque_ticket_medio: number;
  ggr: number;
  ggr_por_jogador: number;
  wd_ratio: number;
  pvi: number;
  investimento: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

function getDatasDoMes(ano: number, mes: number) {
  return { inicio: fmt(new Date(ano, mes, 1)), fim: fmt(new Date(ano, mes + 1, 0)) };
}

function getDatasDoMesOuMtd(ano: number, mes: number) {
  const hoje = new Date();
  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();
  const { inicio, fim } = getDatasDoMes(ano, mes);
  const fimEfetivo = isMesAtual ? fmt(hoje) : fim;
  return { inicio, fim: fimEfetivo };
}

function getDatasDoMesMtd(ano: number, mes: number) {
  let anoAnt = ano, mesAnt = mes - 1;
  if (mesAnt < 0) { mesAnt = 11; anoAnt--; }
  const ultimoDia = new Date(anoAnt, mesAnt + 1, 0).getDate();
  const hoje = new Date();
  const dia = anoAnt === hoje.getFullYear() && mesAnt === hoje.getMonth()
    ? Math.min(hoje.getDate(), ultimoDia)
    : ultimoDia;
  return { inicio: fmt(new Date(anoAnt, mesAnt, 1)), fim: fmt(new Date(anoAnt, mesAnt, dia)) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── PVI: Ticket Médio Depósito (Peso 40%) ────────────────────────────────────
function scoreTicketMedioDeposito(v: number): number {
  if (v > 1000) return 100;
  if (v >= 600) return 80;
  if (v >= 200) return 60;
  if (v >= 100) return 40;
  if (v > 0) return 20;
  return 0;
}

// ─── PVI: GGR por Jogador (Peso 40%) ──────────────────────────────────────────
function scoreGgrPorJogador(v: number): number {
  if (v > 500) return 100;
  if (v >= 200) return 80;
  if (v >= 100) return 60;
  if (v >= 50) return 40;
  if (v > 0) return 20;
  return 0;
}

// ─── PVI: WD Ratio (Peso 20%) — menor é melhor ─────────────────────────────────
function scoreWdRatio(pct: number): number {
  if (pct < 40) return 100;
  if (pct <= 60) return 80;
  if (pct <= 75) return 60;
  if (pct <= 90) return 40;
  return 20;
}

function calculaPVI(
  ticketMedioDep: number,
  ggrPorJogador: number,
  wdRatioPct: number
): number {
  const s1 = scoreTicketMedioDeposito(ticketMedioDep) * 0.4;
  const s2 = scoreGgrPorJogador(ggrPorJogador) * 0.4;
  const s3 = scoreWdRatio(wdRatioPct) * 0.2;
  return Math.round(s1 + s2 + s3);
}

function getPerfilJogador(pvi: number): PerfilJogador {
  if (pvi >= 80) return "Whales";
  if (pvi >= 60) return "Core";
  if (pvi >= 15) return "Recreativos";
  return "Caçadores de Bônus"; // PVI abaixo de 15%
}

const PERFIL_CORES: Record<PerfilJogador, { cor: string; bg: string; border: string }> = {
  "Whales":             { cor: "#7c3aed", bg: "rgba(124,58,237,0.12)",  border: "rgba(124,58,237,0.35)" },
  "Core":               { cor: "#2563eb", bg: "rgba(37,99,235,0.12)",   border: "rgba(37,99,235,0.35)" },
  "Recreativos":        { cor: "#059669", bg: "rgba(5,150,105,0.12)",   border: "rgba(5,150,105,0.35)" },
  "Caçadores de Bônus": { cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
};

// ─── KPI CARD (estilo Overview) ───────────────────────────────────────────────
function KpiCardFin({ label, value, subValue, icon, accentColor, atual, anterior, isHistorico, isBRL }: {
  label: string;
  value: string;
  subValue?: { label: string; value: string };
  icon: string;
  accentColor: string;
  atual: number;
  anterior: number;
  isHistorico?: boolean;
  isBRL?: boolean;
}) {
  const { theme: t } = useApp();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const corSeta = up ? "#22c55e" : "#ef4444";

  return (
    <div style={{
      borderRadius: 16, border: `1px solid ${t.cardBorder}`,
      background: `linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(37,99,235,0.04) 100%)`,
      overflow: "hidden",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 16, width: 32, height: 32, borderRadius: 9,
            background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{icon}</span>
          <span style={{ color: t.textMuted, fontSize: 11, fontFamily: FONT.body, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{label}</span>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: subValue ? 4 : 6 }}>{value}</div>
        {subValue && (
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
            <span style={{ color: t.text, fontWeight: 600 }}>{subValue.value}</span> {subValue.label}
          </div>
        )}
        {!isHistorico && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corSeta, fontWeight: 700 }}>{up ? "↑" : "↓"} {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}</span>
            <span style={{ color: t.textMuted }}>vs {isBRL ? fmtBRL(anterior) : anterior.toLocaleString("pt-BR")} mês ant.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardFinanceiro() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("dash_financeiro");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroInfluencer, setFiltroInfluencer] = useState("todos");
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas");

  const [perfis, setPerfis] = useState<InfluencerPerfil[]>([]);
  const [rows, setRows] = useState<FinanceiroRow[]>([]);
  const [totais, setTotais] = useState<TotaisFinanceiros>({
    ftd_total: 0, ftds: 0, ftd_ticket_medio: 0,
    depositos: 0, deposit_count: 0, deposito_ticket_medio: 0,
    saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0,
    wd_ratio: 0, pvi: 0, investimento: 0,
  });
  const [totaisAnt, setTotaisAnt] = useState<TotaisFinanceiros>({
    ftd_total: 0, ftds: 0, ftd_ticket_medio: 0,
    depositos: 0, deposit_count: 0, deposito_ticket_medio: 0,
    saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0,
    wd_ratio: 0, pvi: 0, investimento: 0,
  });
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo() { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [{ data: perfisData }, { data: opsData }, { data: infOpsData }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      const perfisLista: InfluencerPerfil[] = perfisData || [];
      setPerfis(perfisLista);
      setOperadorasList(opsData || []);
      const map: Record<string, string[]> = {};
      (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
        if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
        map[o.operadora_slug].push(o.influencer_id);
      });
      setOperadoraInfMap(map);

      // Quando é mês atual: usar MTD (início até hoje). RPC retorna mês inteiro, então usamos fallback para MTD.
      const hoje = new Date();
      const isMesAtual = !historico && mesSelecionado && mesSelecionado.ano === hoje.getFullYear() && mesSelecionado.mes === hoje.getMonth();

      let metricas: any[] = [];
      try {
        if (isMesAtual) throw new Error("Usar fallback para MTD");
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_metricas_financeiro", {
          p_ano: historico ? null : mesSelecionado?.ano ?? null,
          p_mes: historico ? null : mesSelecionado?.mes ?? null,
          p_influencer_id: filtroInfluencer === "todos" ? null : filtroInfluencer,
          p_historico: historico,
          p_operadora_slug: operadoraFiltro === "todas" ? null : operadoraFiltro,
        });
        if (!rpcErr && rpcData?.length) {
          metricas = rpcData;
        } else {
          throw new Error("RPC vazia ou erro");
        }
      } catch {
        // Fallback: consulta direta na tabela (legado)
        let qMetricas = supabase.from("influencer_metricas")
          .select("influencer_id, ftd_count, ftd_total, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data, operadora_slug");
        if (!historico && mesSelecionado) {
          const { inicio, fim } = getDatasDoMesOuMtd(mesSelecionado.ano, mesSelecionado.mes);
          qMetricas = qMetricas.gte("data", inicio).lte("data", fim);
        }
        if (filtroInfluencer !== "todos") qMetricas = qMetricas.eq("influencer_id", filtroInfluencer);
        if (operadoraFiltro !== "todas") qMetricas = qMetricas.eq("operadora_slug", operadoraFiltro);
        const { data: metricasData } = await qMetricas;
        const raw: any[] = metricasData || [];
        const mapaAgreg = new Map<string, MetricaRow>();
        raw.forEach((m: any) => {
          if (!mapaAgreg.has(m.influencer_id)) {
            mapaAgreg.set(m.influencer_id, {
              influencer_id: m.influencer_id,
              ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0,
              withdrawal_count: 0, withdrawal_total: 0, ggr: 0,
            });
          }
          const r = mapaAgreg.get(m.influencer_id)!;
          r.ftd_count += m.ftd_count || 0; r.ftd_total += m.ftd_total ?? 0;
          r.deposit_count += m.deposit_count || 0; r.deposit_total += m.deposit_total || 0;
          r.withdrawal_count += m.withdrawal_count || 0; r.withdrawal_total += m.withdrawal_total || 0;
          r.ggr += m.ggr || 0;
        });
        metricas = Array.from(mapaAgreg.entries()).map(([id, r]) => ({
          influencer_id: id,
          ano: mesSelecionado?.ano,
          mes: mesSelecionado?.mes,
          ftd_count: r.ftd_count,
          ftd_total: r.ftd_total,
          deposit_count: r.deposit_count,
          deposit_total: r.deposit_total,
          withdrawal_count: r.withdrawal_count,
          withdrawal_total: r.withdrawal_total,
          ggr: r.ggr,
        }));
      }

      let qLives = supabase.from("lives").select("id, influencer_id, status, data, operadora_slug").eq("status", "realizada");
      if (!historico && mesSelecionado) {
        const { inicio, fim } = getDatasDoMesOuMtd(mesSelecionado.ano, mesSelecionado.mes);
        qLives = qLives.gte("data", inicio).lte("data", fim);
      }
      if (filtroInfluencer !== "todos") qLives = qLives.eq("influencer_id", filtroInfluencer);
      if (operadoraFiltro !== "todas") qLives = qLives.eq("operadora_slug", operadoraFiltro);
      const { data: livesData } = await qLives;
      const lives = livesData || [];

      const liveIds = lives.map((l: any) => l.id);
      let resultados: any[] = [];
      if (liveIds.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
        resultados = resData || [];
      }

      const horasMap = new Map<string, number>();
      lives.forEach((live: any) => {
        const res = resultados.find((r: any) => r.live_id === live.id);
        if (res) {
          const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          horasMap.set(live.influencer_id, (horasMap.get(live.influencer_id) || 0) + h);
        }
      });

      const mapa = new Map<string, any>();
      metricas.forEach((m: any) => {
        mapa.set(m.influencer_id, {
          ...m,
          ftd_count: Number(m.ftd_count) || 0,
          ftd_total: Number(m.ftd_total) || 0,
          deposit_count: Number(m.deposit_count) || 0,
          deposit_total: Number(m.deposit_total) || 0,
          withdrawal_count: Number(m.withdrawal_count) || 0,
          withdrawal_total: Number(m.withdrawal_total) || 0,
          ggr: Number(m.ggr) || 0,
        });
      });

      const resultado: FinanceiroRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const horas = horasMap.get(id) || 0;
        const investimento = horas * (perfil.cache_hora || 0);
        const roi = investimento > 0 ? ((data.ggr - investimento) / investimento) * 100 : 0;

        const ftd_ticket_medio = data.ftd_ticket_medio ?? (data.ftd_count > 0 ? data.ftd_total / data.ftd_count : 0);
        const deposito_ticket_medio = data.deposito_ticket_medio ?? (data.deposit_count > 0 ? data.deposit_total / data.deposit_count : 0);
        const saque_ticket_medio = data.saque_ticket_medio ?? ((data.withdrawal_count || 0) > 0 ? data.withdrawal_total / (data.withdrawal_count || 1) : 0);
        const ggr_por_jogador = data.ggr_por_jogador ?? (data.ftd_count > 0 ? data.ggr / data.ftd_count : 0);
        const wd_ratio_pct = data.wd_ratio ?? (data.deposit_total > 0 ? (data.withdrawal_total / data.deposit_total) * 100 : 0);
        const pvi = data.pvi ?? calculaPVI(deposito_ticket_medio, ggr_por_jogador, wd_ratio_pct);
        const perfil_jogador = (data.perfil_jogador as PerfilJogador) ?? getPerfilJogador(pvi);

        resultado.push({
          influencer_id: id,
          nome: perfil.nome_artistico,
          investimento, ggr: data.ggr, roi,
          ftds: data.ftd_count,
          ftd_total: data.ftd_total,
          ftd_ticket_medio,
          depositos: data.deposit_total,
          deposit_count: data.deposit_count,
          deposito_ticket_medio,
          saques: data.withdrawal_total,
          saque_ticket_medio,
          ggr_por_jogador,
          wd_ratio: wd_ratio_pct,
          pvi,
          perfil_jogador,
        });
      });

      resultado.sort((a, b) => b.pvi - a.pvi);
      const rowsVisiveis = resultado.filter((r) => podeVerInfluencer(r.influencer_id));
      setRows(rowsVisiveis);

      const tFTDs = rowsVisiveis.reduce((s, r) => s + r.ftds, 0);
      const tFtdTotal = rowsVisiveis.reduce((s, r) => s + r.ftd_total, 0);
      const tDep = rowsVisiveis.reduce((s, r) => s + r.depositos, 0);
      const tDepCount = rowsVisiveis.reduce((s, r) => s + r.deposit_count, 0);
      const tSaq = rowsVisiveis.reduce((s, r) => s + r.saques, 0);
      const tSaqCount = rowsVisiveis.reduce((s, r) => s + (r.saque_ticket_medio > 0 ? Math.round(r.saques / r.saque_ticket_medio) : 0), 0);
      const tGGR = rowsVisiveis.reduce((s, r) => s + r.ggr, 0);
      const tInvest = rowsVisiveis.reduce((s, r) => s + r.investimento, 0);

      const ftdTM = tFTDs > 0 ? tFtdTotal / tFTDs : 0;
      const depTM = tDepCount > 0 ? tDep / tDepCount : 0;
      const saqTM = tSaqCount > 0 ? tSaq / tSaqCount : (tSaq > 0 && tFTDs > 0 ? tSaq / tFTDs : 0);
      const ggrPJ = tFTDs > 0 ? tGGR / tFTDs : 0;
      const wdPct = tDep > 0 ? (tSaq / tDep) * 100 : 0;
      const pviTot = calculaPVI(depTM, ggrPJ, wdPct);

      setTotais({
        ftd_total: tFtdTotal, ftds: tFTDs, ftd_ticket_medio: ftdTM,
        depositos: tDep, deposit_count: tDepCount, deposito_ticket_medio: depTM,
        saques: tSaq, saque_ticket_medio: saqTM,
        ggr: tGGR, ggr_por_jogador: ggrPJ, wd_ratio: wdPct, pvi: pviTot, investimento: tInvest,
      });

      if (!historico && mesSelecionado) {
        const { inicio: iA, fim: fA } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
        let qA = supabase.from("influencer_metricas")
          .select("influencer_id, ftd_count, ftd_total, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data, operadora_slug")
          .gte("data", iA).lte("data", fA);
        if (filtroInfluencer !== "todos") qA = qA.eq("influencer_id", filtroInfluencer);
        if (operadoraFiltro !== "todas") qA = qA.eq("operadora_slug", operadoraFiltro);
        const { data: mA } = await qA;
        const metricasAnt: any[] = mA || [];

        let qLA = supabase.from("lives").select("id, influencer_id, data, operadora_slug").eq("status", "realizada").gte("data", iA).lte("data", fA);
        if (filtroInfluencer !== "todos") qLA = qLA.eq("influencer_id", filtroInfluencer);
        if (operadoraFiltro !== "todas") qLA = qLA.eq("operadora_slug", operadoraFiltro);
        const { data: lA } = await qLA;
        const livesAnt = lA || [];
        const idsLA = livesAnt.map((l: any) => l.id);
        let resA: any[] = [];
        if (idsLA.length > 0) {
          const { data: rA } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", idsLA);
          resA = rA || [];
        }

        const horasAnt = new Map<string, number>();
        livesAnt.forEach((live: any) => {
          const res = resA.find((r: any) => r.live_id === live.id);
          if (res) {
            const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
            horasAnt.set(live.influencer_id, (horasAnt.get(live.influencer_id) || 0) + h);
          }
        });

        const mapaA = new Map<string, MetricaRow>();
        metricasAnt.forEach((m: any) => {
          if (!mapaA.has(m.influencer_id)) {
            mapaA.set(m.influencer_id, {
              influencer_id: m.influencer_id,
              ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0,
              withdrawal_count: 0, withdrawal_total: 0, ggr: 0,
            });
          }
          const r = mapaA.get(m.influencer_id)!;
          r.ftd_count += m.ftd_count || 0; r.ftd_total += m.ftd_total ?? 0;
          r.deposit_count += m.deposit_count || 0; r.deposit_total += m.deposit_total || 0;
          r.withdrawal_count += m.withdrawal_count || 0; r.withdrawal_total += m.withdrawal_total || 0;
          r.ggr += m.ggr || 0;
        });

        const rowsAnt: FinanceiroRow[] = [];
        mapaA.forEach((data, id) => {
          const perfil = perfisLista.find((p) => p.id === id);
          if (!perfil) return;
          const horas = horasAnt.get(id) || 0;
          const investimento = horas * (perfil.cache_hora || 0);
          const deposito_ticket_medio = data.deposit_count > 0 ? data.deposit_total / data.deposit_count : 0;
          const ggr_por_jogador = data.ftd_count > 0 ? data.ggr / data.ftd_count : 0;
          const wd_ratio_pct = data.deposit_total > 0 ? (data.withdrawal_total / data.deposit_total) * 100 : 0;
          const pvi = calculaPVI(deposito_ticket_medio, ggr_por_jogador, wd_ratio_pct);
          rowsAnt.push({
            influencer_id: id, nome: perfil.nome_artistico,
            investimento, ggr: data.ggr, roi: 0,
            ftds: data.ftd_count, ftd_total: data.ftd_total,
            ftd_ticket_medio: data.ftd_count > 0 ? data.ftd_total / data.ftd_count : 0,
            depositos: data.deposit_total, deposit_count: data.deposit_count,
            deposito_ticket_medio,
            saques: data.withdrawal_total,
            saque_ticket_medio: (data.withdrawal_count || 0) > 0 ? data.withdrawal_total / (data.withdrawal_count || 1) : 0,
            ggr_por_jogador, wd_ratio: wd_ratio_pct, pvi,
            perfil_jogador: getPerfilJogador(pvi),
          });
        });

        const visAnt = rowsAnt.filter((r) => podeVerInfluencer(r.influencer_id));
        const tFTDsA = visAnt.reduce((s, r) => s + r.ftds, 0);
        const tFtdTotalA = visAnt.reduce((s, r) => s + r.ftd_total, 0);
        const tDepA = visAnt.reduce((s, r) => s + r.depositos, 0);
        const tDepCountA = visAnt.reduce((s, r) => s + r.deposit_count, 0);
        const tSaqA = visAnt.reduce((s, r) => s + r.saques, 0);
        const tGGRA = visAnt.reduce((s, r) => s + r.ggr, 0);
        const depTMA = tDepCountA > 0 ? tDepA / tDepCountA : 0;
        const ggrPJA = tFTDsA > 0 ? tGGRA / tFTDsA : 0;
        const wdPctA = tDepA > 0 ? (tSaqA / tDepA) * 100 : 0;

        setTotaisAnt({
          ftd_total: tFtdTotalA, ftds: tFTDsA, ftd_ticket_medio: tFTDsA > 0 ? tFtdTotalA / tFTDsA : 0,
          depositos: tDepA, deposit_count: tDepCountA, deposito_ticket_medio: depTMA,
          saques: tSaqA, saque_ticket_medio: 0,
          ggr: tGGRA, ggr_por_jogador: ggrPJA, wd_ratio: wdPctA,
          pvi: calculaPVI(depTMA, ggrPJA, wdPctA),
          investimento: visAnt.reduce((s, r) => s + r.investimento, 0),
        });
      } else {
        setTotaisAnt({
          ftd_total: 0, ftds: 0, ftd_ticket_medio: 0,
          depositos: 0, deposit_count: 0, deposito_ticket_medio: 0,
          saques: 0, saque_ticket_medio: 0, ggr: 0, ggr_por_jogador: 0,
          wd_ratio: 0, pvi: 0, investimento: 0,
        });
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, filtroInfluencer, operadoraFiltro, mesSelecionado, podeVerInfluencer]);

  const rowsParaExibir = useMemo(() => {
    if (operadoraFiltro === "todas") return rows;
    const ids = operadoraInfMap[operadoraFiltro] ?? [];
    return rows.filter((r) => ids.includes(r.influencer_id));
  }, [rows, operadoraFiltro, operadoraInfMap]);

  const totaisExibir = useMemo(() => {
    const tFTDs = rowsParaExibir.reduce((s, r) => s + r.ftds, 0);
    const tFtdTotal = rowsParaExibir.reduce((s, r) => s + r.ftd_total, 0);
    const tDep = rowsParaExibir.reduce((s, r) => s + r.depositos, 0);
    const tDepCount = rowsParaExibir.reduce((s, r) => s + r.deposit_count, 0);
    const tSaq = rowsParaExibir.reduce((s, r) => s + r.saques, 0);
    const tGGR = rowsParaExibir.reduce((s, r) => s + r.ggr, 0);
    const tInvest = rowsParaExibir.reduce((s, r) => s + r.investimento, 0);
    const depTM = tDepCount > 0 ? tDep / tDepCount : 0;
    const ggrPJ = tFTDs > 0 ? tGGR / tFTDs : 0;
    const wdPct = tDep > 0 ? (tSaq / tDep) * 100 : 0;
    const saqCount = rowsParaExibir.reduce((s, r) => s + (r.saque_ticket_medio > 0 ? Math.round(r.saques / r.saque_ticket_medio) : 0), 0);
    const saqTM = saqCount > 0 ? tSaq / saqCount : 0;
    return {
      ...totais,
      ftd_total: tFtdTotal, ftds: tFTDs, ftd_ticket_medio: tFTDs > 0 ? tFtdTotal / tFTDs : 0,
      depositos: tDep, deposit_count: tDepCount, deposito_ticket_medio: depTM,
      saques: tSaq, saque_ticket_medio: saqTM,
      ggr: tGGR, ggr_por_jogador: ggrPJ, wd_ratio: wdPct,
      pvi: calculaPVI(depTM, ggrPJ, wdPct), investimento: tInvest,
    };
  }, [rowsParaExibir, totais]);

  const pieInvestimento = useMemo(() => {
    const raw = rowsParaExibir
      .filter((r) => Math.round(r.investimento) > 0)
      .map((r, i) => ({
        name: r.nome.split(" ")[0],
        nomeCompleto: r.nome,
        value: Math.round(r.investimento),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value); // maior valor primeiro

    if (raw.length <= 10) {
      return raw.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }));
    }
    const top9 = raw.slice(0, 9).map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }));
    const outros = raw.slice(9);
    const somaOutros = outros.reduce((s, o) => s + o.value, 0);
    return [
      ...top9,
      { name: "Outros", nomeCompleto: `Outros (${outros.length} influencers)`, value: somaOutros, color: "#94a3b8" },
    ];
  }, [rowsParaExibir]);

  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 16px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const btnNav = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } as React.CSSProperties;
  const btnHistorico = { padding: "6px 16px", borderRadius: 999, border: historico ? "1px solid #7c3aed" : `1px solid ${t.cardBorder}`, background: historico ? "rgba(124,58,237,0.15)" : "transparent", color: historico ? "#7c3aed" : t.textMuted, fontSize: 13, fontWeight: historico ? 700 : 400, cursor: "pointer", fontFamily: FONT.body } as React.CSSProperties;

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>
          Dashboards • Financeiro
        </h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>
          Análise financeira — FTDs, depósitos, saques, PVI e perfil de jogadores.
        </p>
      </div>

      {/* BLOCO 1: FILTROS (carrossel mês + histórico) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...card, padding: "14px 20px", background: `linear-gradient(135deg, ${t.cardBg} 0%, rgba(124,58,237,0.04) 100%)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>›</button>
            <button style={btnHistorico} onClick={toggleHistorico}>Histórico</button>
            {showFiltroInfluencer && (
              <select value={filtroInfluencer} onChange={(e) => setFiltroInfluencer(e.target.value)} style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT.body, cursor: "pointer" }}>
                <option value="todos">Todos os influencers</option>
                {rows.map((r) => (
                  <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                ))}
              </select>
            )}
            {showFiltroOperadora && (
              <select value={operadoraFiltro} onChange={(e) => setOperadoraFiltro(e.target.value)} style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT.body, cursor: "pointer" }}>
                <option value="todas">Todas as operadoras</option>
                {operadorasList.filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug)).map((o) => (
                  <option key={o.slug} value={o.slug}>{o.nome}</option>
                ))}
              </select>
            )}
            {loading && <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 8 }}>⏳ Carregando...</span>}
          </div>
        </div>
      </div>

      {/* BLOCO 2: KPIs FINANCEIROS */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>
          <span style={{ fontSize: 16 }}>📊</span> KPIs Financeiros
          {!historico && <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, marginLeft: 4 }}>· comparativo MTD vs mesmo período do mês anterior</span>}
        </h3>

        {/* Linha 1: FTD, Depósitos, Saques */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCardFin label="FTD" value={fmtBRL(totaisExibir.ftd_total)} subValue={{ label: "ticket médio", value: totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.ftd_ticket_medio) : "—" }} icon="🏆" accentColor="#7c3aed" atual={totaisExibir.ftd_total} anterior={totaisAnt.ftd_total} isHistorico={historico} isBRL />
          <KpiCardFin label="Depósitos" value={fmtBRL(totaisExibir.depositos)} subValue={{ label: "ticket médio", value: totaisExibir.deposit_count > 0 ? fmtBRL(totaisExibir.deposito_ticket_medio) : "—" }} icon="💳" accentColor="#2563eb" atual={totaisExibir.depositos} anterior={totaisAnt.depositos} isHistorico={historico} isBRL />
          <KpiCardFin label="Saques" value={fmtBRL(totaisExibir.saques)} subValue={{ label: "ticket médio", value: totaisExibir.saque_ticket_medio > 0 ? fmtBRL(totaisExibir.saque_ticket_medio) : "—" }} icon="📤" accentColor="#059669" atual={totaisExibir.saques} anterior={totaisAnt.saques} isHistorico={historico} isBRL />
        </div>

        {/* Linha 2: WD Ratio, GGR por Jogador, PVI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <KpiCardFin label="WD Ratio" value={totaisExibir.depositos > 0 ? `${(totaisExibir.wd_ratio).toFixed(1)}%` : "—"} icon="⚖️" accentColor="#f59e0b" atual={totaisExibir.wd_ratio} anterior={totaisAnt.wd_ratio} isHistorico={historico} />
          <KpiCardFin label="GGR por Jogador" value={totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.ggr_por_jogador) : "—"} icon="🎮" accentColor="#a855f7" atual={totaisExibir.ggr_por_jogador} anterior={totaisAnt.ggr_por_jogador} isHistorico={historico} isBRL />
          <KpiCardFin label="PVI" value={totaisExibir.pvi > 0 ? `${totaisExibir.pvi}%` : "—"} icon="📈" accentColor="#06b6d4" atual={totaisExibir.pvi} anterior={totaisAnt.pvi} isHistorico={historico} />
        </div>
      </div>

      {/* BLOCO: Investimento por Influencer (gráfico + lista) */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>Investimento por Influencer</h3>
        {loading || pieInvestimento.length === 0 ? (
          <div style={{ minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>{loading ? "Carregando..." : "Sem dados"}</div>
        ) : (
          <div style={{ display: "flex", gap: 56, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
            <div style={{ flex: "0 0 360px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <ResponsiveContainer width={360} height={360}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie data={pieInvestimento} cx="50%" cy="50%" outerRadius={140} dataKey="value">
                    {pieInvestimento.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pieInvestimento.map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < pieInvestimento.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: entry.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: t.text, fontFamily: FONT.body }}>{entry.nomeCompleto}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body }}>{fmtBRL(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 5: RANKING FINANCEIRO */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>Ranking Financeiro</h3>
          <div style={{ display: "flex", gap: 8, fontSize: 11, flexWrap: "wrap" }}>
            {(["Whales", "Core", "Recreativos", "Caçadores de Bônus"] as PerfilJogador[]).map((p) => {
              const st = PERFIL_CORES[p];
              return <span key={p} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontFamily: FONT.body }}>{p}</span>;
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rowsParaExibir.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado para o período selecionado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>
                  {["Influencer", "R$ FTD", "Ticket Médio", "R$ Depósito", "Ticket Médio", "R$ Saques", "Ticket Médio", "R$ GGR", "GGR/Jogador", "WD Ratio", "PVI", "Perfil Jogador"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsParaExibir.map((r, i) => {
                  const st = PERFIL_CORES[r.perfil_jogador];
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{fmtBRL(r.ftd_total)}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.ftd_ticket_medio) : "—"}</td>
                      <td style={tdStyle}>{fmtBRL(r.depositos)}</td>
                      <td style={tdStyle}>{r.deposit_count > 0 ? fmtBRL(r.deposito_ticket_medio) : "—"}</td>
                      <td style={tdStyle}>{fmtBRL(r.saques)}</td>
                      <td style={tdStyle}>{r.saque_ticket_medio > 0 ? fmtBRL(r.saque_ticket_medio) : "—"}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? "#22c55e" : "#ef4444" }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.ggr_por_jogador) : "—"}</td>
                      <td style={tdStyle}>{r.depositos > 0 ? `${r.wd_ratio.toFixed(1)}%` : "—"}</td>
                      <td style={tdStyle}>{r.pvi}%</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11 }}>{r.perfil_jogador}</span>
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
