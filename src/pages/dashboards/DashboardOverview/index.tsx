import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ReferenceLine,
} from "recharts";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 }; // Dezembro 2025

// Status do ranking — ordem fixa de exibição
const STATUS_ORDEM = ["Rentável", "Atenção", "Não Rentável", "Bônus", "Sem dados"] as const;
type StatusLabel = typeof STATUS_ORDEM[number];

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

interface LiveResultado {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
}

interface RankingRow {
  influencer_id: string;
  nome: string;
  lives: number;
  horas: number;
  views: number;
  viewsTotal: number;    // acumulador interno — não exibir
  liveComViews: number;  // acumulador interno — não exibir
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

function getDatasDoMesMtd(ano: number, mes: number) {
  const hoje = new Date();
  let anoAnt = ano, mesAnt = mes - 1;
  if (mesAnt < 0) { mesAnt = 11; anoAnt--; }
  const ultimoDia = new Date(anoAnt, mesAnt + 1, 0).getDate();
  const dia = Math.min(hoje.getDate(), ultimoDia);
  return { inicio: fmt(new Date(anoAnt, mesAnt, 1)), fim: fmt(new Date(anoAnt, mesAnt, dia)) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHorasTotal(horas: number) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getStatusROI(roi: number | null, ggr: number, investimento: number): {
  label: StatusLabel; cor: string; bg: string; border: string; roiStr: string;
} {
  if (investimento === 0) {
    if (ggr > 0)  return { label: "Bônus",       cor: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.28)", roiStr: "—" };
    if (ggr < 0)  return { label: "Atenção",     cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", roiStr: "—" };
    return              { label: "Sem dados",    cor: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)", roiStr: "—" };
  }
  const r = roi ?? 0;
  const roiStr = `${r >= 0 ? "+" : ""}${r.toFixed(0)}%`;
  if (r >= 0)   return { label: "Rentável",     cor: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.28)",  roiStr };
  if (r >= -30) return { label: "Atenção",      cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", roiStr };
  return              { label: "Não Rentável",  cor: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.28)",  roiStr };
}

function calculaTotais(rows: RankingRow[]): TotaisData {
  const ggr           = rows.reduce((s, r) => s + r.ggr, 0);
  const invest        = rows.reduce((s, r) => s + r.investimento, 0);
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

// ─── TOOLTIP DO GRÁFICO ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, cardBg, cardBorder, text }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[];
  label?: string; cardBg: string; cardBorder: string; text: string;
}) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { GGR: "GGR", Investimento: "Invest." };
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: text, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.fill, display: "inline-block" }} />
          <span style={{ color: "#9ca3af" }}>{labelMap[p.name] ?? p.name}:</span>
          <span style={{ fontWeight: 700 }}>{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI CARD SIMPLES ─────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accentColor, atual, anterior, isBRL, isHistorico, subValue }: {
  label: string; value: string; icon: string; accentColor: string;
  atual: number; anterior: number; isBRL?: boolean; isHistorico?: boolean;
  subValue?: { label: string; value: string };
}) {
  const { theme: t } = useApp();
  const diff     = atual - anterior;
  const pct      = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up       = diff >= 0;
  const isCusto  = label.toLowerCase().includes("custo");
  const positivo = isCusto ? !up : up;
  const corSeta  = positivo ? "#22c55e" : "#ef4444";

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

// KPI card especial para Depósitos (dois sub-valores lado a lado)
function KpiCardDepositos({ atual, anterior, isHistorico, accentColor }: {
  atual: { qtd: number; valor: number };
  anterior: { qtd: number; valor: number };
  isHistorico?: boolean;
  accentColor: string;
}) {
  const { theme: t } = useApp();
  const diffQtd  = atual.qtd - anterior.qtd;
  const pctQtd   = anterior.qtd !== 0 ? (diffQtd / Math.abs(anterior.qtd)) * 100 : null;
  const upQtd    = diffQtd >= 0;
  const diffVal  = atual.valor - anterior.valor;
  const pctVal   = anterior.valor !== 0 ? (diffVal / Math.abs(anterior.valor)) * 100 : null;
  const upVal    = diffVal >= 0;

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
          }}>💳</span>
          <span style={{ color: t.textMuted, fontSize: 11, fontFamily: FONT.body, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>Depósitos</span>
        </div>
        {/* Dois sub-valores lado a lado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Quantidade */}
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Qtd</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>{atual.qtd.toLocaleString("pt-BR")}</div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span style={{ color: upQtd ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{upQtd ? "↑" : "↓"} {pctQtd !== null ? `${Math.abs(pctQtd).toFixed(0)}%` : "—"}</span>
              </div>
            )}
          </div>
          {/* Divisor */}
          <div style={{ borderLeft: `1px solid ${t.cardBorder}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Volume</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>{fmtBRL(atual.valor)}</div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span style={{ color: upVal ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{upVal ? "↑" : "↓"} {pctVal !== null ? `${Math.abs(pctVal).toFixed(0)}%` : "—"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct?: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.05)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
        {pct && <div style={{ fontSize: 11, color: BASE_COLORS.purple, marginTop: 2, fontFamily: "monospace" }}>↓ {pct}</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

function RateCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { theme: t } = useApp();
  return (
    <div style={{ padding: 12, borderRadius: 14, border: highlight ? "1px solid rgba(124,58,237,0.4)" : `1px solid ${t.cardBorder}`, background: highlight ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: highlight ? "#a78bfa" : t.text, margin: "6px 0 0", fontFamily: FONT.body }}>{value}</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("dash_overview");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]     = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading]   = useState(true);

  // Filtros por escopo (Etapa 8)
  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  // Filtro de status no ranking (null = todos)
  const [statusFiltro, setStatusFiltro] = useState<StatusLabel | null>(null);

  const [perfis, setPerfis]       = useState<InfluencerPerfil[]>([]);
  const [ranking, setRanking]     = useState<RankingRow[]>([]);
  const [totais, setTotais]       = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  // ── BUSCA DE DADOS ──────────────────────────────────────────────────────────
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

      async function buscaMetricas(ini: string, fim: string): Promise<Metrica[]> {
        const { data } = await supabase.from("influencer_metricas")
          .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data")
          .gte("data", ini).lte("data", fim);
        return data || [];
      }

      async function buscaLives(ini: string, fim: string): Promise<LiveData[]> {
        const { data } = await supabase.from("lives")
          .select("id, influencer_id, status, plataforma, data")
          .eq("status", "realizada").gte("data", ini).lte("data", fim);
        return data || [];
      }

      async function buscaResultados(lives: LiveData[]): Promise<LiveResultado[]> {
        const ids = lives.map((l) => l.id);
        if (!ids.length) return [];
        const { data } = await supabase.from("live_resultados")
          .select("live_id, duracao_horas, duracao_min, media_views").in("live_id", ids);
        return data || [];
      }

      function montaRanking(m: Metrica[], l: LiveData[], r: LiveResultado[]): RankingRow[] {
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
          const p = perfisLista.find((x) => x.id === row.influencer_id);
          row.investimento = row.horas * (p?.cache_hora || 0);
          row.roi = row.investimento > 0 ? ((row.ggr - row.investimento) / row.investimento) * 100 : null;
          row.statusLabel = getStatusROI(row.roi, row.ggr, row.investimento).label;
          // views = média de media_views por live (nunca somatória)
          row.views = row.liveComViews > 0 ? Math.round(row.viewsTotal / row.liveComViews) : 0;
        });

        // Ordenar por STATUS_ORDEM depois por ROI desc dentro de cada grupo
        return Array.from(mapa.values()).sort((a, b) => {
          const ia = STATUS_ORDEM.indexOf(a.statusLabel);
          const ib = STATUS_ORDEM.indexOf(b.statusLabel);
          if (ia !== ib) return ia - ib;
          return (b.roi ?? b.ggr) - (a.roi ?? a.ggr);
        });
      }

      // Período atual
      let metricas: Metrica[] = [], lives: LiveData[] = [], resultados: LiveResultado[] = [];
      if (historico) {
        let qM = supabase.from("influencer_metricas").select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data");
        const { data: mAll } = await qM; metricas = mAll || [];
        const { data: lAll } = await supabase.from("lives").select("id, influencer_id, status, plataforma, data").eq("status", "realizada");
        lives = lAll || [];
        resultados = await buscaResultados(lives);
      } else {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        metricas   = await buscaMetricas(inicio, fim);
        lives      = await buscaLives(inicio, fim);
        resultados = await buscaResultados(lives);
      }

      const rows = montaRanking(metricas, lives, resultados);
      const rowsVisiveis = rows.filter((r) => podeVerInfluencer(r.influencer_id));
      setRanking(rowsVisiveis);
      setTotais(calculaTotais(rowsVisiveis));

      // Período anterior MTD
      if (!historico && mesSelecionado) {
        const { inicio: iA, fim: fA } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
        const mA = await buscaMetricas(iA, fA);
        const lA = await buscaLives(iA, fA);
        const rA = await buscaResultados(lA);
        const rowsAnt = montaRanking(mA, lA, rA).filter((r) => podeVerInfluencer(r.influencer_id));
        setTotaisAnt(calculaTotais(rowsAnt));
      } else {
        setTotaisAnt({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, podeVerInfluencer]);

  // ── FUNIL ────────────────────────────────────────────────────────────────────
  const pctViewAcesso = totais.views > 0 ? ((totais.acessos / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg  = totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—";
  const pctRegFTD     = totais.registros > 0 ? ((totais.ftds / totais.registros) * 100).toFixed(1) + "%" : "—";
  const pctViewFTD    = totais.views > 0 ? ((totais.ftds / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD  = totais.acessos > 0 ? ((totais.ftds / totais.acessos) * 100).toFixed(1) + "%" : "—";
  const pctRegFTDTotal = totais.registros > 0 ? ((totais.ftds / totais.registros) * 100).toFixed(1) + "%" : "—"; // Registro → FTD total

  // ── CHART (respeita filtros influencer/operadora) ─────────────────────────────
  const rankingParaChart = useMemo(() => {
    let r = ranking;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (filtroOperadora !== "todas") {
      const ids = operadoraInfMap[filtroOperadora] ?? [];
      r = r.filter((row) => ids.includes(row.influencer_id));
    }
    return r;
  }, [ranking, filtroInfluencer, filtroOperadora, operadoraInfMap]);
  const chartData = rankingParaChart
    .filter((r) => r.investimento > 0)
    .sort((a, b) => b.investimento - a.investimento)
    .slice(0, 10)
    .map((r) => ({
      nome: r.nome.split(" ")[0],
      GGR: parseFloat(r.ggr.toFixed(2)),
      Investimento: parseFloat(r.investimento.toFixed(2)),
    }));

  // ── RANKING FILTRADO ──────────────────────────────────────────────────────────
  const rankingFiltrado = useMemo(() => {
    let r = ranking;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (filtroOperadora !== "todas") {
      const ids = operadoraInfMap[filtroOperadora] ?? [];
      r = r.filter((row) => ids.includes(row.influencer_id));
    }
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [ranking, filtroInfluencer, filtroOperadora, statusFiltro, operadoraInfMap]);

  // ── ESTILOS ───────────────────────────────────────────────────────────────────
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 16px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.06)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const btnNav = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } as React.CSSProperties;
  const btnHistorico = { padding: "6px 16px", borderRadius: 999, border: historico ? "1px solid #7c3aed" : `1px solid ${t.cardBorder}`, background: historico ? "rgba(124,58,237,0.15)" : "transparent", color: historico ? "#7c3aed" : t.textMuted, fontSize: 13, fontWeight: historico ? 700 : 400, cursor: "pointer", fontFamily: FONT.body } as React.CSSProperties;

  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  // Configs KPI — Roxo: GGR/Registros/FTDs | Azul: Invest/Lives/Horas/Influencers | Verde: ROI | Amarelo: Depósito/Custo Reg/Custo FTD
  const kpiL1 = [
    { label: "GGR Total",    value: fmtBRL(totais.ggr),         icon: "📈", accentColor: "#7c3aed", atual: totais.ggr,         anterior: totaisAnt.ggr,         isBRL: true  },
    { label: "Investimento", value: fmtBRL(totais.investimento), icon: "💰", accentColor: "#2563eb", atual: totais.investimento, anterior: totaisAnt.investimento, isBRL: true  },
    { label: "ROI Geral",    value: totais.investimento > 0 ? `${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%` : "—", icon: "🎯", accentColor: "#059669", atual: totais.roi, anterior: totaisAnt.roi, isBRL: false },
  ];
  const kpiL3 = [
    { label: "Total Registros",    value: totais.registros.toLocaleString("pt-BR"),                     icon: "👤", accentColor: "#7c3aed", atual: totais.registros,       anterior: totaisAnt.registros,       isBRL: false },
    { label: "Custo por Registro", value: totais.registros > 0 ? fmtBRL(totais.custoPorRegistro) : "—", icon: "💸", accentColor: "#f59e0b", atual: totais.custoPorRegistro, anterior: totaisAnt.custoPorRegistro, isBRL: true  },
    { label: "Total FTDs",         value: totais.ftds.toLocaleString("pt-BR"),                          icon: "🏆", accentColor: "#7c3aed", atual: totais.ftds,            anterior: totaisAnt.ftds,            isBRL: false },
    { label: "Custo por FTD",      value: totais.ftds > 0 ? fmtBRL(totais.custoPorFTD) : "—",          icon: "💸", accentColor: "#f59e0b", atual: totais.custoPorFTD,     anterior: totaisAnt.custoPorFTD,     isBRL: true  },
  ];

  // Badges de status para o ranking
  const statusBadges: { label: StatusLabel; cor: string; bg: string; border: string }[] = [
    { label: "Rentável",     cor: "#22c55e", bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.28)"   },
    { label: "Atenção",      cor: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.28)"  },
    { label: "Não Rentável", cor: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)"   },
    { label: "Bônus",        cor: "#a855f7", bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.28)"  },
    { label: "Sem dados",    cor: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)" },
  ];

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ── BLOCO 1: FILTROS (centralizado) ── */}
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
                {ranking.map((r) => (
                  <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                ))}
              </select>
            )}
            {showFiltroOperadora && (
              <select value={filtroOperadora} onChange={(e) => setFiltroOperadora(e.target.value)} style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: FONT.body, cursor: "pointer" }}>
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

      {/* ── BLOCO 2: KPIs ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>
          <span style={{ fontSize: 16 }}>📊</span> KPIs Executivos
          {!historico && <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, marginLeft: 4 }}>· comparativo MTD vs mesmo período do mês anterior</span>}
        </h3>

        {/* Linha 1: GGR / Investimento / ROI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          {kpiL1.map((k) => <KpiCard key={k.label} {...k} isHistorico={historico} />)}
        </div>

        {/* Linha 2: Lives / Horas / Influencers / Depósitos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard label="Qtd. Lives" value={totais.lives.toLocaleString("pt-BR")} icon="🎥" accentColor="#2563eb" atual={totais.lives} anterior={totaisAnt.lives} isBRL={false} isHistorico={historico} />
          <KpiCard label="Horas Realizadas" value={fmtHorasTotal(totais.horas)} icon="⏱️" accentColor="#2563eb" atual={totais.horas} anterior={totaisAnt.horas} isBRL={false} isHistorico={historico} />
          <KpiCard label="Influencers Ativos" value={totais.influencers.toLocaleString("pt-BR")} icon="🎙️" accentColor="#2563eb" atual={totais.influencers} anterior={totaisAnt.influencers} isBRL={false} isHistorico={historico} />
          <KpiCardDepositos
            atual={{ qtd: totais.depositos_qtd, valor: totais.depositos_valor }}
            anterior={{ qtd: totaisAnt.depositos_qtd, valor: totaisAnt.depositos_valor }}
            isHistorico={historico}
            accentColor="#f59e0b"
          />
        </div>

        {/* Linha 3: Registros / Custo Registro / FTDs / Custo FTD */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {kpiL3.map((k) => <KpiCard key={k.label} {...k} isHistorico={historico} />)}
        </div>
      </div>

      {/* ── BLOCOS 3 e 4: Funil + Gráfico ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* BLOCO 3: Funil */}
        <div style={card}>
          <h3 style={cardTitle}><span style={{ fontSize: 16 }}>🔽</span> Funil de Conversão</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FunnelStep label="Views (média)" value={totais.views} />
              <FunnelStep label="Acessos"       value={totais.acessos} pct={pctViewAcesso} />
              <FunnelStep label="Registros"     value={totais.registros} pct={pctAcessoReg} />
              <FunnelStep label="FTDs"          value={totais.ftds} pct={pctRegFTD} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start" }}>
              <RateCard label="Acesso → FTD total"  value={pctAcessoFTD} />
              <RateCard label="Registro → FTD total" value={pctRegFTDTotal} />
              <RateCard label="View → FTD total"     value={pctViewFTD} highlight />
            </div>
          </div>
        </div>

        {/* BLOCO 4: Gráfico */}
        <div style={card}>
          <h3 style={cardTitle}><span style={{ fontSize: 16 }}>📊</span> GGR vs Investimento por Influencer</h3>
          {loading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>Carregando...</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip cardBg={t.cardBg} cardBorder={t.cardBorder} text={t.text} />} />
                <Legend content={() => null} wrapperStyle={{ visibility: "hidden", height: 0 }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
                <Bar dataKey="GGR"          fill="#7c3aed" radius={[6, 6, 0, 0]} legendType={false} />
                <Bar dataKey="Investimento" fill="#2563eb" radius={[6, 6, 0, 0]} legendType={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── BLOCO 5: RANKING ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}><span style={{ fontSize: 16 }}>🏅</span> Ranking de Influencers</h3>

          {/* Legendas clicáveis como filtro */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {statusBadges.map((s) => {
              const ativo = statusFiltro === s.label;
              const qtd = rankingParaChart.filter((r) => r.statusLabel === s.label).length;
              return (
                <button
                  key={s.label}
                  onClick={() => setStatusFiltro(ativo ? null : s.label)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body,
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
                onClick={() => setStatusFiltro(null)}
                style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}
              >
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        {/* Indicador de filtro ativo */}
        {statusFiltro && (
          <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Exibindo <strong style={{ color: t.text }}>{rankingFiltrado.length}</strong> influencer{rankingFiltrado.length !== 1 ? "s" : ""} com status <strong style={{ color: t.text }}>{statusFiltro}</strong>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rankingFiltrado.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado para o período/filtro selecionado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>{["Influencer","Lives","Horas","Views","Acessos","Registros","FTDs","GGR","Invest.","ROI","Status"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rankingFiltrado.map((r, i) => {
                  const st = getStatusROI(r.roi, r.ggr, r.investimento);
                  const hT = Math.floor(r.horas);
                  const mT = Math.round((r.horas - hT) * 60);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.03)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.lives}</td>
                      <td style={tdStyle}>{r.horas > 0 ? `${String(hT).padStart(2,"0")}:${String(mT).padStart(2,"0")}` : "—"}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body, fontWeight: 700 }}>{st.roiStr}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body }}>{st.label}</span>
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
