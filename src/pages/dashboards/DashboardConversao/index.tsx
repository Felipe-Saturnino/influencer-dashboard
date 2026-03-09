import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
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
function fmtPct(v: number | null): string { return v === null ? "—" : v.toFixed(1) + "%" }

// ─── PERFIL (Tipo de influencer: alcance vs conversão) ────────────────────────
// Duplo Impacto  ⭐  Views > 5.000 E View→FTD ≥ 3%
// Conversor      🚀  View→FTD ≥ 3% (qualquer volume)
// Alto Alcance   👁️  Views > 5.000 E View→FTD < 3%
// Baixa Conv.    ⚠️  Views > 0 E View→FTD < 1%
// Equilibrado    ⚖️  Demais (sem views ou 1%–3% com views ≤ 5.000)

type PerfilInfo = { label: string; cor: string; bg: string; border: string; icon: string };

function getPerfilConversao(row: ConversaoRow): PerfilInfo {
  const p = row.pctViewFTD;
  const altoAlcance = row.views > 5000;
  const boaConversao = p !== null && p >= 3;
  const baixaConversao = p !== null && p < 1 && row.views > 0;

  if (altoAlcance && boaConversao)
    return { label: "Duplo Impacto",   cor: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)",  icon: "⭐" };
  if (boaConversao)
    return { label: "Conversor",       cor: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.28)",   icon: "🚀" };
  if (altoAlcance)
    return { label: "Alto Alcance",    cor: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.28)",  icon: "👁️" };
  if (baixaConversao)
    return { label: "Baixa Conv.",     cor: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.28)",   icon: "⚠️" };
  return                               { label: "Equilibrado",    cor: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)", icon: "⚖️" };
}

// ─── TOOLTIP BARCHART HORIZONTAL ──────────────────────────────────────────────
function HBarTooltip({ active, payload, cardBg, cardBorder, text }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: text, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{payload[0]?.payload?.nome}</div>
      <div style={{ color: "#9ca3af" }}>FTD/Hora: <span style={{ color: "#7c3aed", fontWeight: 700 }}>{d.value.toFixed(2)}</span></div>
    </div>
  );
}

// ─── PAINEL DO FUNIL (reutilizado para os dois slots do comparativo) ───────────
function PainelFunil({
  row, label, isEmpty, theme: t,
}: {
  row: ConversaoRow | null; label: string; isEmpty: boolean;
  theme: any;
}) {
  if (isEmpty || !row) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `1px dashed ${t.cardBorder}`, minHeight: 280, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        {label}
      </div>
    );
  }

  const taxa1 = fmtPct(pct(row.acessos, row.views));
  const taxa2 = fmtPct(pct(row.registros, row.acessos));
  const taxa3 = fmtPct(pct(row.ftds, row.registros));
  const taxa4 = fmtPct(pct(row.ftds, row.views));
  const ftdH  = row.horas > 0 ? (row.ftds / row.horas).toFixed(2) : "—";

  const steps = [
    { label: "Views",     val: row.views,     taxa: undefined },
    { label: "Acessos",   val: row.acessos,   taxa: taxa1 },
    { label: "Registros", val: row.registros, taxa: taxa2 },
    { label: "FTDs",      val: row.ftds,      taxa: taxa3 },
  ];

  const taxas = [
    { label: "View→Acesso",  val: taxa1, hl: false },
    { label: "Acesso→Reg",   val: taxa2, hl: false },
    { label: "Reg→FTD",      val: taxa3, hl: false },
    { label: "View→FTD",     val: taxa4, hl: true  },
    { label: "FTD/Hora ⚡",  val: ftdH,  hl: false },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Steps */}
      {steps.map((s) => (
        <div key={s.label} style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>{s.label}</div>
            {s.taxa && <div style={{ fontSize: 10, color: BASE_COLORS.purple, marginTop: 1, fontFamily: "monospace" }}>↓ {s.taxa}</div>}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{s.val.toLocaleString("pt-BR")}</div>
        </div>
      ))}
      {/* Taxas em grid 2x3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
        {taxas.map((tx) => (
          <div key={tx.label} style={{ padding: "8px 10px", borderRadius: 10, border: tx.hl ? "1px solid rgba(124,58,237,0.4)" : `1px solid ${t.cardBorder}`, background: tx.hl ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)" }}>
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{tx.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: tx.hl ? "#a78bfa" : t.text, fontFamily: FONT.body }}>{tx.val}</div>
          </div>
        ))}
      </div>
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

  // Comparativo — dois slots independentes
  const [compA, setCompA] = useState<string>("placeholder_a");
  const [compB, setCompB] = useState<string>("placeholder_b");

  // Filtro de perfil na tabela
  const [perfilFiltro, setPerfilFiltro] = useState<string | null>(null);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  // ── BUSCA DE DADOS ────────────────────────────────────────────────────────
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

  // ── DADOS DERIVADOS ────────────────────────────────────────────────────────
  const rowA = rows.find((r) => r.influencer_id === compA) || null;
  const rowB = rows.find((r) => r.influencer_id === compB) || null;

  // Ranking FTD/Hora — todos, ordenado desc
  const ftdHoraData = rows
    .filter((r) => r.ftdPorHora > 0)
    .sort((a, b) => b.ftdPorHora - a.ftdPorHora)
    .map((r) => ({ nome: r.nome.split(" ")[0], valor: parseFloat(r.ftdPorHora.toFixed(2)), id: r.influencer_id }));

  const perfisDisponiveis: PerfilInfo[] = [
    { label: "Duplo Impacto", cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", icon: "⭐" },
    { label: "Conversor",     cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  icon: "🚀" },
    { label: "Alto Alcance",  cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)", icon: "👁️" },
    { label: "Equilibrado",   cor: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)", icon: "⚖️" },
    { label: "Baixa Conv.",   cor: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)",  icon: "⚠️" },
  ];
  const rowsFiltrados = perfilFiltro ? rows.filter((r) => r.perfilLabel === perfilFiltro) : rows;

  // ── ESTILOS ────────────────────────────────────────────────────────────────
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 16px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties;
  const selectStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, color: t.text, padding: "7px 12px", borderRadius: 10, fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer" } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.06)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap" as const };
  const btnNav = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } as React.CSSProperties;
  const btnHistorico = { padding: "6px 16px", borderRadius: 999, border: historico ? "1px solid #7c3aed" : `1px solid ${t.cardBorder}`, background: historico ? "rgba(124,58,237,0.15)" : "transparent", color: historico ? "#7c3aed" : t.textMuted, fontSize: 13, fontWeight: historico ? 700 : 400, cursor: "pointer", fontFamily: FONT.body } as React.CSSProperties;

  const isPlaceholder = (id: string) => id === "placeholder_a" || id === "placeholder_b";

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>Dashboards • Conversão</h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>Análise do funil de conversão por influencer — taxas, eficiência e perfil de audiência.</p>
      </div>

      {/* ── BLOCO 1: FILTROS (padrão Overview) ── */}
      <div style={{ ...card, marginBottom: 14, padding: "14px 20px", background: `linear-gradient(135deg, ${t.cardBg} 0%, rgba(124,58,237,0.04) 100%)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>

          {/* Carrossel centralizado */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: FONT.body, minWidth: 160, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>›</button>
            <button style={btnHistorico} onClick={toggleHistorico}>Histórico</button>
          </div>

          {/* Filtros contextuais */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select value={influencerFiltro} onChange={(e) => setInfluencerFiltro(e.target.value)} style={selectStyle}>
              <option value="todos">Influencer: Todos</option>
              {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome_artistico}</option>)}
            </select>
            <select value={plataformaFiltro} onChange={(e) => setPlataformaFiltro(e.target.value)} style={selectStyle}>
              <option value="todas">Plataforma: Todas</option>
              {["Twitch","YouTube","Instagram","TikTok","Kick"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {loading
              ? <span style={{ fontSize: 12, color: t.textMuted }}>⏳ Carregando...</span>
              : <span style={{ fontSize: 12, color: t.textMuted }}>{rows.length} influencer{rows.length !== 1 ? "s" : ""}</span>
            }
          </div>
        </div>
      </div>

      {/* ── BLOCO 2: COMPARATIVO DE FUNIL ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>🔽</span> Comparativo de Funil</h3>

        {/* Selects dos dois influencers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <select
            value={compA}
            onChange={(e) => setCompA(e.target.value)}
            style={{ ...selectStyle, width: "100%", borderColor: compA && !isPlaceholder(compA) ? "rgba(124,58,237,0.5)" : undefined }}
          >
            <option value="placeholder_a">— Selecione o influencer A —</option>
            {rows.filter((r) => r.influencer_id !== compB || isPlaceholder(compB)).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
          <div style={{ textAlign: "center", fontSize: 16, color: t.textMuted, fontWeight: 700 }}>vs</div>
          <select
            value={compB}
            onChange={(e) => setCompB(e.target.value)}
            style={{ ...selectStyle, width: "100%", borderColor: compB && !isPlaceholder(compB) ? "rgba(37,99,235,0.5)" : undefined }}
          >
            <option value="placeholder_b">— Selecione o influencer B —</option>
            {rows.filter((r) => r.influencer_id !== compA || isPlaceholder(compA)).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
        </div>

        {/* Cabeçalhos coloridos */}
        {(!isPlaceholder(compA) || !isPlaceholder(compB)) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 10 }}>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.3)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body }}>
              {rowA?.nome ?? "—"}
            </div>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.3)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#60a5fa", fontFamily: FONT.body }}>
              {rowB?.nome ?? "—"}
            </div>
          </div>
        )}

        {/* Os dois painéis */}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Carregando dados...</div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <PainelFunil row={rowA} label="Selecione o influencer A" isEmpty={isPlaceholder(compA)} theme={t} />
            <div style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
            <PainelFunil row={rowB} label="Selecione o influencer B" isEmpty={isPlaceholder(compB)} theme={t} />
          </div>
        )}
      </div>

      {/* ── BLOCO 3: RANKING FTD/HORA ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>⚡</span> Ranking FTD/Hora — Eficiência por Influencer</h3>
        <p style={{ margin: "-8px 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>FTDs gerados por hora de live ao vivo — influencers com 0 FTDs omitidos.</p>
        {loading ? (
          <div style={{ height: Math.max(180, ftdHoraData.length * 36), display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 13 }}>Carregando...</div>
        ) : ftdHoraData.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, ftdHoraData.length * 38)}>
            <BarChart
              data={ftdHoraData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
              <XAxis type="number" tick={{ fill: t.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(1)} />
              <YAxis type="category" dataKey="nome" width={90} tick={{ fill: t.text, fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<HBarTooltip cardBg={t.cardBg} cardBorder={t.cardBorder} text={t.text} />} cursor={{ fill: "rgba(124,58,237,0.08)" }} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {ftdHoraData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`rgba(124,58,237,${Math.max(0.35, 1 - i * (0.55 / Math.max(ftdHoraData.length - 1, 1)))})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── BLOCO 4: TABELA COMPARATIVA ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}><span style={{ fontSize: 16 }}>📋</span> Comparativo de Taxas</h3>

          {/* Filtros de perfil clicáveis */}
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
            {perfilFiltro && (
              <button onClick={() => setPerfilFiltro(null)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}>✕ Limpar</button>
            )}
          </div>
        </div>

        {perfilFiltro && (
          <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Exibindo <strong style={{ color: t.text }}>{rowsFiltrados.length}</strong> influencer{rowsFiltrados.length !== 1 ? "s" : ""} com perfil <strong style={{ color: t.text }}>{perfilFiltro}</strong>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Carregando dados...</div>
        ) : rowsFiltrados.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>Nenhum dado encontrado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <thead>
                <tr>
                  {[
                    "Influencer",
                    "Views", "View→Acesso",
                    "Acessos", "Acesso→Reg",
                    "Registros", "Reg→FTD",
                    "FTDs",
                    "Perfil",
                  ].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rowsFiltrados.map((r, i) => {
                  const pf = getPerfilConversao(r);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.03)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      {/* Views */}
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      {/* View→Acesso */}
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctViewAcesso)}</td>
                      {/* Acessos */}
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      {/* Acesso→Reg */}
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctAcessoReg)}</td>
                      {/* Registros */}
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      {/* Reg→FTD */}
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctRegFTD)}</td>
                      {/* FTDs */}
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.ftds > 0 ? "#22c55e" : t.text }}>{r.ftds.toLocaleString("pt-BR")}</td>
                      {/* Perfil */}
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${pf.border}`, background: pf.bg, color: pf.cor, fontSize: 11, fontFamily: FONT.body, whiteSpace: "nowrap" }}>
                          {pf.icon} {pf.label}
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
