import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
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
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("dash_financeiro");

  const [periodo, setPeriodo]             = useState("mes_atual");
  const [influencerFiltro, setInfluencerFiltro] = useState("todos");
  const [plataformaFiltro, setPlataformaFiltro] = useState("todas");
  const [operadoraFiltro, setOperadoraFiltro] = useState("todas");
  const [loading, setLoading]             = useState(true);
  const [perfis, setPerfis]               = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]                   = useState<FinanceiroRow[]>([]);
  const [totais, setTotais]               = useState({ ggr: 0, investimento: 0, roi: 0, ftds: 0, depositos: 0, saques: 0, custoPorFTD: 0, ticketMedio: 0 });
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { inicio, fim } = getPeriodDates(periodo);

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
      const rowsVisiveis = resultado.filter((r) => podeVerInfluencer(r.influencer_id));
      setRows(rowsVisiveis);

      const tGGR    = rowsVisiveis.reduce((s, r) => s + r.ggr, 0);
      const tInvest = rowsVisiveis.reduce((s, r) => s + r.investimento, 0);
      const tFTDs   = rowsVisiveis.reduce((s, r) => s + r.ftds, 0);
      const tDep    = rowsVisiveis.reduce((s, r) => s + r.depositos, 0);
      const tSaq    = rowsVisiveis.reduce((s, r) => s + r.saques, 0);
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
  }, [periodo, influencerFiltro, plataformaFiltro, podeVerInfluencer]);

  const rowsParaExibir = useMemo(() => {
    if (operadoraFiltro === "todas") return rows;
    const ids = operadoraInfMap[operadoraFiltro] ?? [];
    return rows.filter((r) => ids.includes(r.influencer_id));
  }, [rows, operadoraFiltro, operadoraInfMap]);

  const perfisVisiveis = useMemo(() => perfis.filter((p) => podeVerInfluencer(p.id)), [perfis, podeVerInfluencer]);

  const totaisExibir = useMemo(() => {
    const tGGR = rowsParaExibir.reduce((s, r) => s + r.ggr, 0);
    const tInvest = rowsParaExibir.reduce((s, r) => s + r.investimento, 0);
    const tFTDs = rowsParaExibir.reduce((s, r) => s + r.ftds, 0);
    const tDep = rowsParaExibir.reduce((s, r) => s + r.depositos, 0);
    const tSaq = rowsParaExibir.reduce((s, r) => s + r.saques, 0);
    const roiG = tInvest > 0 ? ((tGGR - tInvest) / tInvest) * 100 : 0;
    return {
      ggr: tGGR, investimento: tInvest, roi: roiG,
      ftds: tFTDs, depositos: tDep, saques: tSaq,
      custoPorFTD: tFTDs > 0 ? tInvest / tFTDs : 0,
      ticketMedio: tFTDs > 0 ? tDep / tFTDs : 0,
    };
  }, [rowsParaExibir]);

  // Chart data
  const barData = rowsParaExibir.slice(0, 10).map((r) => ({
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
        {showFiltroInfluencer && (
          <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
            <option value="todos">Influencer: Todos</option>
            {perfisVisiveis.map((p) => <option key={p.id} value={p.id}>{p.nome_artistico}</option>)}
          </select>
        )}
        {showFiltroOperadora && (
          <select value={operadoraFiltro} onChange={(e) => setOperadoraFiltro(e.target.value)} style={selectStyle}>
            <option value="todas">Operadora: Todas</option>
            {operadorasList.filter((o) => escoposVisiveis.operadorasVisiveis.length === 0 || escoposVisiveis.operadorasVisiveis.includes(o.slug)).map((o) => (
              <option key={o.slug} value={o.slug}>{o.nome}</option>
            ))}
          </select>
        )}
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
          <KpiCard label="Investimento Total"    value={fmtBRL(totaisExibir.investimento)} />
          <KpiCard label="GGR Total"             value={fmtBRL(totaisExibir.ggr)} delta={totaisExibir.ggr >= totaisExibir.investimento ? "Lucrativo" : "Negativo"} deltaPos={totaisExibir.ggr >= totaisExibir.investimento} />
          <KpiCard label="ROI Médio"             value={`${totaisExibir.roi >= 0 ? "+" : ""}${totaisExibir.roi.toFixed(1)}%`} delta="meta: 100%" deltaPos={totaisExibir.roi >= 100 ? true : totaisExibir.roi >= 50 ? null : false} />
          <KpiCard label="Total FTDs"            value={totaisExibir.ftds.toLocaleString("pt-BR")} />
          <KpiCard label="Custo por FTD"         value={totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.custoPorFTD) : "—"} />
          <KpiCard label="Depósitos (Total)"     value={fmtBRL(totaisExibir.depositos)} />
          <KpiCard label="Saques (Total)"        value={fmtBRL(totaisExibir.saques)} />
          <KpiCard label="Ticket Médio (FTD)"    value={totaisExibir.ftds > 0 ? fmtBRL(totaisExibir.ticketMedio) : "—"} />
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
        ) : rowsParaExibir.length === 0 ? (
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
                {rowsParaExibir.map((r, i) => {
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
