import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, BarChart, Bar, Legend,
} from "recharts";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface InfluencerPerfil { id: string; nome_artistico: string; cache_hora: number; }

interface ConversaoRow {
  influencer_id: string; nome: string;
  views: number; acessos: number; registros: number; ftds: number; horas: number;
  pctViewAcesso: number | null; pctAcessoReg: number | null;
  pctRegFTD: number | null; pctViewFTD: number | null;
  ftdPorHora: number; perfilLabel: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

function pct(num: number, den: number): number | null { return den === 0 ? null : (num / den) * 100; }
function fmtPct(v: number | null): string { return v === null ? "—" : v.toFixed(1) + "%"; }

type PerfilInfo = { label: string; cor: string; bg: string; border: string; icon: string };

function getPerfilConversao(row: ConversaoRow): PerfilInfo {
  const p = row.pctViewFTD;
  if (p !== null && p >= 5)  return { label: "Conversor",       cor: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.28)",  icon: "🚀" };
  if (row.views > 5000)      return { label: "Audiência",       cor: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.28)", icon: "👁️" };
  if (p !== null && p < 2)   return { label: "Baixa qualidade", cor: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.28)",  icon: "⚠️" };
  return                            { label: "Equilibrado",     cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", icon: "⚖️" };
}

// ─── TOOLTIPS CUSTOMIZADOS ────────────────────────────────────────────────────
function ScatterTooltip({ active, payload, cardBg, cardBorder, text }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: text, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{d.nome}</div>
      <div style={{ color: "#9ca3af" }}>Views: <span style={{ color: text, fontWeight: 700 }}>{d.views.toLocaleString("pt-BR")}</span></div>
      <div style={{ color: "#9ca3af" }}>FTDs: <span style={{ color: "#22c55e", fontWeight: 700 }}>{d.ftds}</span></div>
    </div>
  );
}

function BarTooltip({ active, payload, label, cardBg, cardBorder, text }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: text, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.fill, display: "inline-block" }} />
          <span style={{ color: "#9ca3af" }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniKpi({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, border: highlight ? "1px solid rgba(124,58,237,0.4)" : `1px solid ${t.cardBorder}`, background: highlight ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: highlight ? "#a78bfa" : t.text, fontFamily: FONT.body }}>{value}</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardConversao() {
  const { theme: t } = useApp();

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]           = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico]     = useState(false);
  const [influencerFiltro, setInfluencerFiltro] = useState("todos");
  const [plataformaFiltro, setPlataformaFiltro] = useState("todas");
  const [loading, setLoading]         = useState(true);
  const [perfis, setPerfis]           = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]               = useState<ConversaoRow[]>([]);
  const [detalheId, setDetalheId]     = useState<string>("todos");
  const [perfilFiltro, setPerfilFiltro] = useState<string | null>(null);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data: perfisData } = await supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico");
      const perfisLista: InfluencerPerfil[] = perfisData || [];
      setPerfis(perfisLista);

      let qMetricas = supabase.from("influencer_metricas").select("influencer_id, registration_count, ftd_count, visit_count, data");
      if (!historico && mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        qMetricas = qMetricas.gte("data", inicio).lte("data", fim);
      }
      if (influencerFiltro !== "todos") qMetricas = qMetricas.eq("influencer_id", influencerFiltro);
      const { data: metricasData } = await qMetricas;
      const metricas = metricasData || [];

      let qLives = supabase.from("lives").select("id, influencer_id, status, plataforma, data").eq("status", "realizada");
      if (!historico && mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        qLives = qLives.gte("data", inicio).lte("data", fim);
      }
      if (influencerFiltro !== "todos") qLives = qLives.eq("influencer_id", influencerFiltro);
      if (plataformaFiltro !== "todas") qLives = qLives.eq("plataforma", plataformaFiltro);
      const { data: livesData } = await qLives;
      const lives = livesData || [];

      const liveIds = lives.map((l: any) => l.id);
      let resultados: any[] = [];
      if (liveIds.length > 0) {
        const { data: resData } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min, media_views").in("live_id", liveIds);
        resultados = resData || [];
      }

      const mapa = new Map<string, { acessos: number; registros: number; ftds: number; views: number; horas: number }>();

      metricas.forEach((m: any) => {
        if (!mapa.has(m.influencer_id)) mapa.set(m.influencer_id, { acessos: 0, registros: 0, ftds: 0, views: 0, horas: 0 });
        const r = mapa.get(m.influencer_id)!;
        r.acessos += m.visit_count || 0; r.registros += m.registration_count || 0; r.ftds += m.ftd_count || 0;
      });

      lives.forEach((live: any) => {
        if (!mapa.has(live.influencer_id)) mapa.set(live.influencer_id, { acessos: 0, registros: 0, ftds: 0, views: 0, horas: 0 });
        const r = mapa.get(live.influencer_id)!;
        const res = resultados.find((x: any) => x.live_id === live.id);
        if (res) { r.views += res.media_views || 0; r.horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60; }
      });

      const resultado: ConversaoRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const row: ConversaoRow = {
          influencer_id: id, nome: perfil.nome_artistico,
          views: data.views, acessos: data.acessos, registros: data.registros, ftds: data.ftds, horas: data.horas,
          pctViewAcesso: pct(data.acessos, data.views), pctAcessoReg: pct(data.registros, data.acessos),
          pctRegFTD: pct(data.ftds, data.registros), pctViewFTD: pct(data.ftds, data.views),
          ftdPorHora: data.horas > 0 ? data.ftds / data.horas : 0, perfilLabel: "",
        };
        row.perfilLabel = getPerfilConversao(row).label;
        resultado.push(row);
      });

      resultado.sort((a, b) => b.ftds - a.ftds);
      setRows(resultado);
      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, influencerFiltro, plataformaFiltro]);

  const detalhe = detalheId !== "todos" ? rows.find((r) => r.influencer_id === detalheId) || null : null;
  const consolidado = { views: rows.reduce((s,r)=>s+r.views,0), acessos: rows.reduce((s,r)=>s+r.acessos,0), registros: rows.reduce((s,r)=>s+r.registros,0), ftds: rows.reduce((s,r)=>s+r.ftds,0), horas: rows.reduce((s,r)=>s+r.horas,0) };
  const d = detalhe || consolidado;
  const taxa1 = fmtPct(pct(d.acessos, d.views));
  const taxa2 = fmtPct(pct(d.registros, d.acessos));
  const taxa3 = fmtPct(pct(d.ftds, d.registros));
  const taxa4 = fmtPct(pct(d.ftds, d.views));
  const ftdH  = d.horas > 0 ? (d.ftds / d.horas).toFixed(2) : "—";

  const scatterData = rows.map((r) => ({ nome: r.nome, views: r.views, ftds: r.ftds }));
  const eficienciaData = rows.slice(0, 10).map((r) => ({ nome: r.nome.split(" ")[0], "FTD/Hora": parseFloat(r.ftdPorHora.toFixed(2)), "Reg→FTD%": parseFloat((r.pctRegFTD ?? 0).toFixed(1)) }));

  const perfisDisponiveis: PerfilInfo[] = [
    { label: "Conversor",       cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  icon: "🚀" },
    { label: "Audiência",       cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)", icon: "👁️" },
    { label: "Equilibrado",     cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", icon: "⚖️" },
    { label: "Baixa qualidade", cor: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)",  icon: "⚠️" },
  ];
  const rowsFiltrados = perfilFiltro ? rows.filter((r) => r.perfilLabel === perfilFiltro) : rows;

  // Estilos
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 16px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties;
  const selectStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, color: t.text, padding: "7px 12px", borderRadius: 10, fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer" } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.06)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const btnNav = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } as React.CSSProperties;
  const btnHistorico = { padding: "6px 16px", borderRadius: 999, border: historico ? "1px solid #7c3aed" : `1px solid ${t.cardBorder}`, background: historico ? "rgba(124,58,237,0.15)" : "transparent", color: historico ? "#7c3aed" : t.textMuted, fontSize: 13, fontWeight: historico ? 700 : 400, cursor: "pointer", fontFamily: FONT.body } as React.CSSProperties;
  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>Dashboards • Conversão</h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>Análise do funil de conversão por influencer — taxas, eficiência e perfil de audiência.</p>
      </div>

      {/* BLOCO 1: FILTROS */}
      <div style={{ ...card, marginBottom: 14, padding: "14px 20px", background: `linear-gradient(135deg, ${t.cardBg} 0%, rgba(124,58,237,0.04) 100%)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT.body, minWidth: 160, textAlign: "center" }}>{historico ? "Todo o período" : mesSelecionado?.label}</span>
            <button style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>›</button>
            <button style={btnHistorico} onClick={toggleHistorico}>Histórico</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
              <option value="todos">Influencer: Todos</option>
              {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome_artistico}</option>)}
            </select>
            <select value={plataformaFiltro} onChange={(e) => setPlataformaFiltro(e.target.value)} style={selectStyle}>
              <option value="todas">Plataforma: Todas</option>
              {["Twitch","YouTube","Instagram","TikTok","Kick"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {loading ? <span style={{ fontSize: 12, color: t.textMuted }}>⏳ Carregando...</span> : <span style={{ fontSize: 12, color: t.textMuted }}>{rows.length} influencer{rows.length !== 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>

      {/* BLOCO 2: FUNIL + SCATTER */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Funil */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ ...cardTitle, margin: 0 }}><span style={{ fontSize: 16 }}>🔽</span> Funil por Influencer</h3>
            <select value={detalheId} onChange={(e) => setDetalheId(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
              <option value="todos">Consolidado (todos)</option>
              {rows.map((r) => <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              {[
                { label: "Views",     val: d.views,     pctStr: undefined },
                { label: "Acessos",   val: d.acessos,   pctStr: taxa1 },
                { label: "Registros", val: d.registros, pctStr: taxa2 },
                { label: "FTDs",      val: d.ftds,      pctStr: taxa3 },
              ].map((step) => (
                <div key={step.label} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.05)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>{step.label}</div>
                    {step.pctStr && <div style={{ fontSize: 11, color: BASE_COLORS.purple, marginTop: 2, fontFamily: "monospace" }}>↓ {step.pctStr}</div>}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{step.val.toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
              <MiniKpi label="View→Acesso" value={taxa1} />
              <MiniKpi label="Acesso→Reg"  value={taxa2} />
              <MiniKpi label="Reg→FTD"     value={taxa3} />
              <MiniKpi label="View→FTD"    value={taxa4} highlight />
              <MiniKpi label="FTD/Hora"    value={ftdH}  icon="⚡" />
            </div>
          </div>
        </div>

        {/* Scatter */}
        <div style={card}>
          <h3 style={cardTitle}><span style={{ fontSize: 16 }}>🎯</span> Mapa: Volume vs Conversão</h3>
          <p style={{ margin: "-8px 0 12px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Cada ponto é um influencer — X = Views, Y = FTDs gerados.</p>
          {loading || rows.length === 0 ? (
            <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>{loading ? "Carregando..." : "Sem dados no período"}</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="views" name="Views" tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <YAxis dataKey="ftds" name="FTDs" tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ScatterTooltip cardBg={t.cardBg} cardBorder={t.cardBorder} text={t.text} />} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#7c3aed">
                  {scatterData.map((_, i) => <Cell key={i} fill={`rgba(124,58,237,${0.45 + (i % 5) * 0.1})`} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            {[{ label: "Alto alcance", hint: "views altos", cor: "#3b82f6" }, { label: "Alta conversão", hint: "FTDs altos", cor: "#22c55e" }].map((q) => (
              <div key={q.label} style={{ fontSize: 11, color: t.textMuted, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT.body }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: q.cor, display: "inline-block" }} />
                <span style={{ color: q.cor, fontWeight: 600 }}>{q.label}</span> — {q.hint}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCO 3: GRÁFICO EFICIÊNCIA */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>⚡</span> Eficiência por Influencer — FTD/Hora e Taxa Reg→FTD (%)</h3>
        {loading || eficienciaData.length === 0 ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>{loading ? "Carregando..." : "Sem dados"}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eficienciaData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="nome" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<BarTooltip cardBg={t.cardBg} cardBorder={t.cardBorder} text={t.text} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted }} />
              <Bar dataKey="FTD/Hora"  fill="#7c3aed" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Reg→FTD%" fill="#22c55e"  radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* BLOCO 4: TABELA COMPARATIVA */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}><span style={{ fontSize: 16 }}>📋</span> Comparativo de Taxas</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {perfisDisponiveis.map((p) => {
              const ativo = perfilFiltro === p.label;
              const qtd   = rows.filter((r) => r.perfilLabel === p.label).length;
              return (
                <button key={p.label} onClick={() => setPerfilFiltro(ativo ? null : p.label)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${ativo ? p.cor : p.border}`, background: ativo ? p.bg : "transparent", color: ativo ? p.cor : t.textMuted, fontSize: 11, fontWeight: ativo ? 700 : 400, opacity: qtd === 0 ? 0.35 : 1 }}>
                  {p.icon} {p.label} {qtd > 0 && <span style={{ opacity: 0.7 }}>({qtd})</span>}
                </button>
              );
            })}
            {perfilFiltro && <button onClick={() => setPerfilFiltro(null)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}>✕ Limpar</button>}
          </div>
        </div>

        {perfilFiltro && <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>Exibindo <strong style={{ color: t.text }}>{rowsFiltrados.length}</strong> influencer{rowsFiltrados.length !== 1 ? "s" : ""} com perfil <strong style={{ color: t.text }}>{perfilFiltro}</strong></div>}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rowsFiltrados.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>{["Influencer","Views","Acessos","Registros","FTDs","View→Acesso","Acesso→Reg","Reg→FTD","View→FTD","FTD/Hora","Perfil"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rowsFiltrados.map((r, i) => {
                  const pf = getPerfilConversao(r);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.03)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.ftds > 0 ? "#22c55e" : t.text }}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{fmtPct(r.pctViewAcesso)}</td>
                      <td style={tdStyle}>{fmtPct(r.pctAcessoReg)}</td>
                      <td style={tdStyle}>{fmtPct(r.pctRegFTD)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.pctViewFTD !== null && r.pctViewFTD >= 5 ? "#22c55e" : t.text }}>{fmtPct(r.pctViewFTD)}</td>
                      <td style={tdStyle}>{r.ftdPorHora > 0 ? r.ftdPorHora.toFixed(2) : "—"}</td>
                      <td style={tdStyle}><span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${pf.border}`, background: pf.bg, color: pf.cor, fontSize: 11, fontFamily: FONT.body }}>{pf.icon} {pf.label}</span></td>
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
