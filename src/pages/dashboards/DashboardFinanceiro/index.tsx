import { useState, useEffect } from "react";
import { useApp } from "../../../context/AppContext";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, ReferenceLine,
} from "recharts";

interface InfluencerPerfil {
  id: string;
  nome_artistico: string;
  cache_hora: number;
}

interface FinanceiroRow {
  influencer_id: string;
  nome: string;
  investimento: number;
  ggr: number;
  roi: number;
  ftds: number;
  depositos: number;
  saques: number;
  custoPorFTD: number;
  ticketMedio: number;
  leitura: string;
}

function getPeriodDates(periodo: string): { inicio: string; fim: string } {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (periodo === "mes_atual")    return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) };
  if (periodo === "semana_atual") { const d = new Date(hoje); d.setDate(hoje.getDate() - (hoje.getDay() === 0 ? 6 : hoje.getDay() - 1)); return { inicio: fmt(d), fim: fmt(hoje) }; }
  if (periodo === "ultimos_30")   { const d = new Date(hoje); d.setDate(hoje.getDate() - 29); return { inicio: fmt(d), fim: fmt(hoje) }; }
  return { inicio: fmt(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), fim: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function leituraEstrategica(roi: number): { label: string; cor: string; bg: string; border: string } {
  if (roi >= 100) return { label: "Escalar",   cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)" };
  if (roi >= 50)  return { label: "Revisar",   cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)" };
  if (roi >= 0)   return { label: "Oportunidade", cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)" };
  return               { label: "Cortar",     cor: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)" };
}

function KpiCard({ label, value, delta, deltaPos }: { label: string; value: string; delta?: string; deltaPos?: boolean | null }) {
  const { theme: t } = useApp();
  const deltaColor  = deltaPos === true ? "#22c55e" : deltaPos === false ? "#ef4444" : t.textMuted;
  const deltaBg     = deltaPos === true ? "rgba(34,197,94,0.10)" : deltaPos === false ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)";
  const deltaBorder = deltaPos === true ? "rgba(34,197,94,0.25)" : deltaPos === false ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)";
  return (
    <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ color: t.textMuted, fontSize: 12 }}>{label}</span>
        {delta && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: `1px solid ${deltaBorder}`, background: deltaBg, color: deltaColor, fontFamily: "monospace" }}>{delta}</span>}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: t.text }}>{value}</div>
    </div>
  );
}

export default function DashboardFinanceiro() {
  const { theme: t } = useApp();
  const [periodo, setPeriodo]             = useState("mes_atual");
  const [influencerFiltro, setInfluencerFiltro] = useState("todos");
  const [plataformaFiltro, setPlataformaFiltro] = useState("todas");
  const [loading, setLoading]             = useState(true);
  const [perfis, setPerfis]               = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]                   = useState<FinanceiroRow[]>([]);
  const [totais, setTotais]               = useState({ ggr: 0, investimento: 0, roi: 0, ftds: 0, depositos: 0, saques: 0, custoPorFTD: 0, ticketMedio: 0 });

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { inicio, fim } = getPeriodDates(periodo);

      const { data: perfisData } = await supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico");
      const perfisLista: InfluencerPerfil[] = perfisData || [];
      setPerfis(perfisLista);

      let qMetricas = supabase.from("influencer_metricas")
        .select("influencer_id, ftd_count, deposit_total, withdrawal_total, ggr, data")
        .gte("data", inicio).lte("data", fim);
      if (influencerFiltro !== "todos") qMetricas = qMetricas.eq("influencer_id", influencerFiltro);

      const { data: metricasData } = await qMetricas;
      const metricas = metricasData || [];

      let qLives = supabase.from("lives").select("id, influencer_id, status, plataforma, data").gte("data", inicio).lte("data", fim).eq("status", "realizada");
      if (influencerFiltro !== "todos") qLives = qLives.eq("influencer_id", influencerFiltro);
      if (plataformaFiltro !== "todas") qLives = qLives.eq("plataforma", plataformaFiltro);

      const { data: livesData } = await qLives;
      const lives = livesData || [];

      const liveIds = lives.map((l: any) => l.id);
      let resultados: any[] = [];
      if (liveIds.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min").in("live_id", liveIds);
        resultados = resData || [];
      }

      // Horas por influencer
      const horasMap = new Map<string, number>();
      lives.forEach((live: any) => {
        const res = resultados.find((r: any) => r.live_id === live.id);
        if (res) {
          const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          horasMap.set(live.influencer_id, (horasMap.get(live.influencer_id) || 0) + h);
        }
      });

      // Agregar métricas por influencer
      const mapa = new Map<string, { ggr: number; ftds: number; depositos: number; saques: number }>();
      metricas.forEach((m: any) => {
        if (!mapa.has(m.influencer_id)) mapa.set(m.influencer_id, { ggr: 0, ftds: 0, depositos: 0, saques: 0 });
        const r = mapa.get(m.influencer_id)!;
        r.ggr       += m.ggr || 0;
        r.ftds      += m.ftd_count || 0;
        r.depositos += m.deposit_total || 0;
        r.saques    += m.withdrawal_total || 0;
      });

      const resultado: FinanceiroRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const horas       = horasMap.get(id) || 0;
        const investimento = horas * (perfil.cache_hora || 0);
        const roi          = investimento > 0 ? ((data.ggr - investimento) / investimento) * 100 : 0;
        const custoPorFTD  = data.ftds > 0 ? investimento / data.ftds : 0;
        const ticketMedio  = data.ftds > 0 ? data.depositos / data.ftds : 0;
        resultado.push({
          influencer_id: id,
          nome: perfil.nome_artistico,
          investimento, ggr: data.ggr, roi,
          ftds: data.ftds, depositos: data.depositos, saques: data.saques,
          custoPorFTD, ticketMedio,
          leitura: leituraEstrategica(roi).label,
        });
      });

      resultado.sort((a, b) => b.roi - a.roi);
      setRows(resultado);

      const tGGR    = resultado.reduce((s, r) => s + r.ggr, 0);
      const tInvest = resultado.reduce((s, r) => s + r.investimento, 0);
      const tFTDs   = resultado.reduce((s, r) => s + r.ftds, 0);
      const tDep    = resultado.reduce((s, r) => s + r.depositos, 0);
      const tSaq    = resultado.reduce((s, r) => s + r.saques, 0);
      const roiG    = tInvest > 0 ? ((tGGR - tInvest) / tInvest) * 100 : 0;

      setTotais({
        ggr: tGGR, investimento: tInvest, roi: roiG,
        ftds: tFTDs, depositos: tDep, saques: tSaq,
        custoPorFTD: tFTDs > 0 ? tInvest / tFTDs : 0,
        ticketMedio: tFTDs > 0 ? tDep / tFTDs : 0,
      });

      setLoading(false);
    }
    carregar();
  }, [periodo, influencerFiltro, plataformaFiltro]);

  // Chart data
  const barData = rows.slice(0, 10).map((r) => ({
    nome: r.nome.split(" ")[0],
    Investimento: parseFloat(r.investimento.toFixed(0)),
    GGR: parseFloat(r.ggr.toFixed(0)),
  }));

  const roiData = rows.slice(0, 10).map((r) => ({
    nome: r.nome.split(" ")[0],
    ROI: parseFloat(r.roi.toFixed(1)),
  }));

  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 16, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 14px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body } as React.CSSProperties;
  const selectStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text, padding: "9px 12px", borderRadius: 12, fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer" } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.03)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>
          Dashboards • Financeiro
        </h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>
          Análise financeira — investimento, retorno, ROI e qualidade de aquisição.
        </p>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={selectStyle}>
          <option value="mes_atual">Mês atual</option>
          <option value="semana_atual">Semana atual</option>
          <option value="ultimos_30">Últimos 30 dias</option>
          <option value="mes_passado">Mês passado</option>
        </select>
        <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
          <option value="todos">Influencer: Todos</option>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome_artistico}</option>)}
        </select>
        <select value={plataformaFiltro} onChange={(e) => setPlataformaFiltro(e.target.value)} style={selectStyle}>
          <option value="todas">Plataforma: Todas</option>
          {["Twitch", "YouTube", "Instagram", "TikTok", "Kick"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {loading && <span style={{ fontSize: 12, color: t.textMuted }}>⏳ Carregando...</span>}
      </div>

      {/* KPIs */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}>KPIs Financeiros</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard label="Investimento Total"    value={fmtBRL(totais.investimento)} />
          <KpiCard label="GGR Total"             value={fmtBRL(totais.ggr)} delta={totais.ggr >= totais.investimento ? "Lucrativo" : "Negativo"} deltaPos={totais.ggr >= totais.investimento} />
          <KpiCard label="ROI Médio"             value={`${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%`} delta="meta: 100%" deltaPos={totais.roi >= 100 ? true : totais.roi >= 50 ? null : false} />
          <KpiCard label="Total FTDs"            value={totais.ftds.toLocaleString("pt-BR")} />
          <KpiCard label="Custo por FTD"         value={totais.ftds > 0 ? fmtBRL(totais.custoPorFTD) : "—"} />
          <KpiCard label="Depósitos (Total)"     value={fmtBRL(totais.depositos)} />
          <KpiCard label="Saques (Total)"        value={fmtBRL(totais.saques)} />
          <KpiCard label="Ticket Médio (FTD)"    value={totais.ftds > 0 ? fmtBRL(totais.ticketMedio) : "—"} />
        </div>
      </div>

      {/* GRÁFICOS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <h3 style={cardTitle}>Investimento vs GGR por Influencer</h3>
          {loading || barData.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>{loading ? "Carregando..." : "Sem dados"}</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontSize: 12, color: t.text }} formatter={(v: number) => [fmtBRL(v), ""]} />
                <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted }} />
                <Bar dataKey="Investimento" fill="rgba(109,40,217,0.7)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="GGR" fill="rgba(34,197,94,0.7)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <h3 style={cardTitle}>ROI por Influencer (%)</h3>
          {loading || roiData.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>{loading ? "Carregando..." : "Sem dados"}</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={roiData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontSize: 12, color: t.text }} formatter={(v: number) => [`${v}%`, "ROI"]} />
                <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "meta 100%", fill: "#22c55e", fontSize: 10 }} />
                <ReferenceLine y={0}   stroke="rgba(239,68,68,0.5)" strokeDasharray="4 4" />
                <Bar dataKey="ROI" radius={[6, 6, 0, 0]}
                  fill="rgba(109,40,217,0.7)"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TABELA FINANCEIRA */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}>Ranking Financeiro</h3>
          <div style={{ display: "flex", gap: 8, fontSize: 11, flexWrap: "wrap" }}>
            {[
              { l: "Escalar ≥ 100%",    cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  bd: "rgba(34,197,94,0.28)" },
              { l: "Revisar 50–99%",    cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.28)" },
              { l: "Oportunidade 0–49%",cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.28)" },
              { l: "Cortar < 0%",       cor: "#ef4444", bg: "rgba(239,68,68,0.10)",  bd: "rgba(239,68,68,0.28)" },
            ].map((s) => (
              <span key={s.l} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, color: s.cor, fontFamily: FONT.body }}>{s.l}</span>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado para o período selecionado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>
                  {["Influencer", "Investimento", "GGR", "ROI", "FTDs", "Custo/FTD", "Depósitos", "Saques", "Ticket Médio", "Leitura"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const lr = leituraEstrategica(r.roi);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? "#22c55e" : "#ef4444" }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${lr.border}`, background: lr.bg, color: lr.cor, fontSize: 11 }}>
                          {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(0)}%
                        </span>
                      </td>
                      <td style={tdStyle}>{r.ftds}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.custoPorFTD) : "—"}</td>
                      <td style={tdStyle}>{fmtBRL(r.depositos)}</td>
                      <td style={tdStyle}>{fmtBRL(r.saques)}</td>
                      <td style={tdStyle}>{r.ftds > 0 ? fmtBRL(r.ticketMedio) : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${lr.border}`, background: lr.bg, color: lr.cor, fontSize: 11 }}>{lr.label}</span>
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
