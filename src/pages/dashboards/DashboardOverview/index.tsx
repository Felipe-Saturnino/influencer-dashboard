import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

// ─── TIPOS LOCAIS ────────────────────────────────────────────────────────────
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

interface Live {
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
  acessos: number;
  registros: number;
  ftds: number;
  ggr: number;
  investimento: number;
  roi: number;
  plataformas: string[];
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function getPeriodDates(periodo: string): { inicio: string; fim: string } {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (periodo === "mes_atual") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: fmt(inicio), fim: fmt(fim) };
  }
  if (periodo === "semana_atual") {
    const diaSemana = hoje.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() + diff);
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  if (periodo === "ultimos_30") {
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - 29);
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  // mes_passado
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHoras(h: number, m: number) {
  return `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.floor(m)).padStart(2, "0")}`;
}

function statusROI(roi: number): { label: string; cor: string; bg: string; border: string } {
  if (roi >= 100) return { label: "Rentável", cor: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)" };
  if (roi >= 50)  return { label: "Atenção",  cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)" };
  return               { label: "Não Rentável", cor: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.28)" };
}

// ─── COMPONENTES MENORES ─────────────────────────────────────────────────────
function KpiCard({ label, value, delta, deltaPos }: { label: string; value: string; delta?: string; deltaPos?: boolean | null }) {
  const { theme: t } = useApp();
  const deltaColor = deltaPos === true ? "#22c55e" : deltaPos === false ? "#ef4444" : t.textMuted;
  const deltaBg    = deltaPos === true ? "rgba(34,197,94,0.10)" : deltaPos === false ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)";
  const deltaBorder= deltaPos === true ? "rgba(34,197,94,0.25)" : deltaPos === false ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)";

  return (
    <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: t.textMuted, fontSize: 12, fontFamily: FONT.body }}>{label}</span>
        {delta && (
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: `1px solid ${deltaBorder}`, background: deltaBg, color: deltaColor, fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{value}</div>
    </div>
  );
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct?: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
        {pct && <div style={{ fontSize: 11, color: BASE_COLORS.purple, marginTop: 2, fontFamily: "monospace" }}>↓ {pct}</div>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

function RateCard({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  const { theme: t } = useApp();
  return (
    <div style={{
      padding: 12, borderRadius: 14,
      border: highlight ? "1px solid rgba(109,40,217,0.35)" : `1px solid ${t.cardBorder}`,
      background: highlight ? "rgba(109,40,217,0.14)" : "rgba(255,255,255,0.03)",
    }}>
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: t.text, margin: "6px 0 4px", fontFamily: FONT.body }}>{value}</div>
      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>{hint}</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { theme: t } = useApp();

  const [periodo, setPeriodo] = useState("mes_atual");
  const [influencerFiltro, setInfluencerFiltro] = useState<string>("todos");
  const [plataformaFiltro, setPlataformaFiltro] = useState<string>("todas");
  const [loading, setLoading] = useState(true);

  const [perfis, setPerfis] = useState<InfluencerPerfil[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [totais, setTotais] = useState({
    ggr: 0, investimento: 0, roi: 0,
    ftds: 0, registros: 0, acessos: 0, views: 0,
    custoPorFTD: 0, custoPorRegistro: 0,
  });

  const periodoLabel: Record<string, string> = {
    mes_atual: "Mês atual",
    semana_atual: "Semana atual",
    ultimos_30: "Últimos 30 dias",
    mes_passado: "Mês passado",
  };

  // ── BUSCA DE DADOS ────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { inicio, fim } = getPeriodDates(periodo);

      // 1. Perfis de influencers
      const { data: perfisData } = await supabase
        .from("influencer_perfil")
        .select("id, nome_artistico, cache_hora")
        .order("nome_artistico");

      const perfisLista: InfluencerPerfil[] = perfisData || [];
      setPerfis(perfisLista);

      // 2. Métricas no período
      let qMetricas = supabase
        .from("influencer_metricas")
        .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data")
        .gte("data", inicio)
        .lte("data", fim);

      if (influencerFiltro !== "todos") qMetricas = qMetricas.eq("influencer_id", influencerFiltro);

      const { data: metricasData } = await qMetricas;
      const metricas: Metrica[] = metricasData || [];

      // 3. Lives no período
      let qLives = supabase
        .from("lives")
        .select("id, influencer_id, status, plataforma, data")
        .gte("data", inicio)
        .lte("data", fim)
        .eq("status", "realizada");

      if (influencerFiltro !== "todos") qLives = qLives.eq("influencer_id", influencerFiltro);
      if (plataformaFiltro !== "todas") qLives = qLives.eq("plataforma", plataformaFiltro);

      const { data: livesData } = await qLives;
      const lives: Live[] = livesData || [];

      // 4. Resultados das lives
      const liveIds = lives.map((l) => l.id);
      let resultados: LiveResultado[] = [];
      if (liveIds.length > 0) {
        const { data: resData } = await supabase
          .from("live_resultados")
          .select("live_id, duracao_horas, duracao_min, media_views")
          .in("live_id", liveIds);
        resultados = resData || [];
      }

      // ── MONTAR RANKING ──────────────────────────────────────────────────
      const mapa = new Map<string, RankingRow>();

      // Inicializar com influencers que têm métricas
      metricas.forEach((m) => {
        if (!mapa.has(m.influencer_id)) {
          const perfil = perfisLista.find((p) => p.id === m.influencer_id);
          if (!perfil) return;
          mapa.set(m.influencer_id, {
            influencer_id: m.influencer_id,
            nome: perfil.nome_artistico,
            lives: 0, horas: 0, views: 0,
            acessos: 0, registros: 0, ftds: 0,
            ggr: 0, investimento: 0, roi: 0,
            plataformas: [],
          });
        }
        const row = mapa.get(m.influencer_id)!;
        row.acessos    += m.visit_count || 0;
        row.registros  += m.registration_count || 0;
        row.ftds       += m.ftd_count || 0;
        row.ggr        += m.ggr || 0;
      });

      // Adicionar dados de lives
      lives.forEach((live) => {
        if (!mapa.has(live.influencer_id)) {
          const perfil = perfisLista.find((p) => p.id === live.influencer_id);
          if (!perfil) return;
          mapa.set(live.influencer_id, {
            influencer_id: live.influencer_id,
            nome: perfil.nome_artistico,
            lives: 0, horas: 0, views: 0,
            acessos: 0, registros: 0, ftds: 0,
            ggr: 0, investimento: 0, roi: 0,
            plataformas: [],
          });
        }
        const row = mapa.get(live.influencer_id)!;
        row.lives += 1;
        if (!row.plataformas.includes(live.plataforma)) row.plataformas.push(live.plataforma);

        const res = resultados.find((r) => r.live_id === live.id);
        if (res) {
          row.horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          row.views += res.media_views || 0;
        }
      });

      // Calcular investimento e ROI
      mapa.forEach((row) => {
        const perfil = perfisLista.find((p) => p.id === row.influencer_id);
        const cacheHora = perfil?.cache_hora || 0;
        row.investimento = row.horas * cacheHora;
        row.roi = row.investimento > 0 ? ((row.ggr - row.investimento) / row.investimento) * 100 : 0;
      });

      const rows = Array.from(mapa.values()).sort((a, b) => b.roi - a.roi);
      setRanking(rows);

      // ── TOTAIS ────────────────────────────────────────────────────────
      const totalGGR        = rows.reduce((s, r) => s + r.ggr, 0);
      const totalInvest     = rows.reduce((s, r) => s + r.investimento, 0);
      const totalFTDs       = rows.reduce((s, r) => s + r.ftds, 0);
      const totalRegistros  = rows.reduce((s, r) => s + r.registros, 0);
      const totalAcessos    = rows.reduce((s, r) => s + r.acessos, 0);
      const totalViews      = rows.reduce((s, r) => s + r.views, 0);
      const roiGeral        = totalInvest > 0 ? ((totalGGR - totalInvest) / totalInvest) * 100 : 0;

      setTotais({
        ggr: totalGGR,
        investimento: totalInvest,
        roi: roiGeral,
        ftds: totalFTDs,
        registros: totalRegistros,
        acessos: totalAcessos,
        views: totalViews,
        custoPorFTD: totalFTDs > 0 ? totalInvest / totalFTDs : 0,
        custoPorRegistro: totalRegistros > 0 ? totalInvest / totalRegistros : 0,
      });

      setLoading(false);
    }

    carregar();
  }, [periodo, influencerFiltro, plataformaFiltro]);

  // ── FUNIL ──────────────────────────────────────────────────────────────────
  const pctViewAcesso   = totais.views > 0 ? ((totais.acessos / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg    = totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—";
  const pctRegFTD       = totais.registros > 0 ? ((totais.ftds / totais.registros) * 100).toFixed(1) + "%" : "—";
  const pctViewFTD      = totais.views > 0 ? ((totais.ftds / totais.views) * 100).toFixed(1) + "%" : "—";

  // ── CHART DATA ────────────────────────────────────────────────────────────
  const chartData = ranking.slice(0, 10).map((r) => ({
    nome: r.nome.split(" ")[0],
    GGR: parseFloat(r.ggr.toFixed(2)),
    Investimento: parseFloat(r.investimento.toFixed(2)),
  }));

  const roiColor = totais.roi >= 0 ? "#22c55e" : "#ef4444";

  // ── ESTILOS COMUNS ────────────────────────────────────────────────────────
  const card = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
  } as React.CSSProperties;

  const cardTitle = {
    margin: "0 0 14px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: t.text,
    fontFamily: FONT.body,
  } as React.CSSProperties;

  const selectStyle = {
    background: t.inputBg,
    border: `1px solid ${t.inputBorder}`,
    color: t.text,
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
    cursor: "pointer",
  } as React.CSSProperties;

  const thStyle = {
    textAlign: "left" as const,
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: t.textMuted,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    fontFamily: FONT.body,
    whiteSpace: "nowrap" as const,
  };

  const tdStyle = {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid rgba(255,255,255,0.05)`,
    color: t.text,
    fontFamily: FONT.body,
    whiteSpace: "nowrap" as const,
  };

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>
          Dashboards • Overview
        </h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>
          Visão consolidada de performance — KPIs, funil de conversão e ranking de influencers.
        </p>
      </div>

      {/* ── FILTROS ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={selectStyle}>
          <option value="mes_atual">Mês atual</option>
          <option value="semana_atual">Semana atual</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="mes_passado">Mês passado</option>
        </select>

        <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
          <option value="todos">Influencer: Todos</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome_artistico}</option>
          ))}
        </select>

        <select value={plataformaFiltro} onChange={(e) => setPlataformaFiltro(e.target.value)} style={selectStyle}>
          <option value="todas">Plataforma: Todas</option>
          {["Twitch", "YouTube", "Instagram", "TikTok", "Kick"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {loading && (
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 4 }}>⏳ Carregando...</span>
        )}
        {!loading && (
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 4 }}>
            {periodoLabel[periodo]} · {ranking.length} influencer{ranking.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>KPIs Executivos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard label="GGR Total" value={fmtBRL(totais.ggr)} delta={totais.roi >= 0 ? `ROI +${totais.roi.toFixed(1)}%` : `ROI ${totais.roi.toFixed(1)}%`} deltaPos={totais.roi >= 0} />
          <KpiCard label="Investimento" value={fmtBRL(totais.investimento)} />
          <KpiCard label="ROI Geral" value={`${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%`} delta="meta: 100%" deltaPos={totais.roi >= 100 ? true : totais.roi >= 50 ? null : false} />
          <KpiCard label="Total FTDs" value={totais.ftds.toLocaleString("pt-BR")} />
          <KpiCard label="Custo por FTD" value={totais.ftds > 0 ? fmtBRL(totais.custoPorFTD) : "—"} />
          <KpiCard label="Total Registros" value={totais.registros.toLocaleString("pt-BR")} />
          <KpiCard label="Custo por Registro" value={totais.registros > 0 ? fmtBRL(totais.custoPorRegistro) : "—"} />
          <KpiCard label="Total Acessos" value={totais.acessos.toLocaleString("pt-BR")} />
        </div>
      </div>

      {/* ── FUNIL + CHART ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Funil */}
        <div style={card}>
          <h3 style={cardTitle}>Funil de Conversão</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FunnelStep label="Views (média)" value={totais.views} />
              <FunnelStep label="Acessos" value={totais.acessos} pct={pctViewAcesso} />
              <FunnelStep label="Registros" value={totais.registros} pct={pctAcessoReg} />
              <FunnelStep label="FTDs" value={totais.ftds} pct={pctRegFTD} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start" }}>
              <RateCard label="View → Acesso"    value={pctViewAcesso} hint="CTA / link track" />
              <RateCard label="Acesso → Registro" value={pctAcessoReg} hint="UX de cadastro" />
              <RateCard label="Registro → FTD"   value={pctRegFTD}    hint="Incentivo + intenção" />
              <RateCard label="View → FTD total" value={pctViewFTD}   hint="Eficiência geral" highlight />
            </div>
          </div>
        </div>

        {/* Gráfico GGR vs Investimento */}
        <div style={card}>
          <h3 style={cardTitle}>GGR vs Investimento por Influencer</h3>
          {loading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>Carregando...</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontSize: 12, color: t.text }}
                  formatter={(value: number) => [fmtBRL(value), ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted }} />
                <Bar dataKey="GGR" fill={roiColor} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Investimento" fill="rgba(109,40,217,0.7)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── RANKING ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>Ranking de Influencers</h3>
          <div style={{ display: "flex", gap: 8, fontSize: 11, flexWrap: "wrap" }}>
            {[
              { label: "Rentável ≥ 100%", cor: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.28)" },
              { label: "Atenção 50–99%",  cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)" },
              { label: "Não Rentável < 50%", cor: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)" },
            ].map((s) => (
              <span key={s.label} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.border}`, background: s.bg, color: s.cor, fontFamily: FONT.body }}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : ranking.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado para o período selecionado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>
                  {["Influencer", "Lives", "Horas", "Views", "Acessos", "Registros", "FTDs", "GGR", "Invest.", "ROI", "Status"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => {
                  const st = statusROI(r.roi);
                  const hTotal = Math.floor(r.horas);
                  const mTotal = Math.round((r.horas - hTotal) * 60);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.lives}</td>
                      <td style={tdStyle}>{r.horas > 0 ? fmtHoras(hTotal, mTotal) : "—"}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? "#22c55e" : "#ef4444" }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body }}>
                          {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(0)}%
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body }}>
                          {st.label}
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
