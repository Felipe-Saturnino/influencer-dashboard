import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

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

// ─── PERFIL ───────────────────────────────────────────────────────────────────
type PerfilInfo = { label: string; cor: string; bg: string; border: string; icon: string };

function getPerfilConversao(row: ConversaoRow): PerfilInfo {
  const p = row.pctViewFTD;
  const altoAlcance  = row.views > 5000;
  const boaConversao = p !== null && p >= 3;
  const baixaConv    = p !== null && p < 1 && row.views > 0;
  if (altoAlcance && boaConversao) return { label: "Duplo Impacto", cor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)", icon: "⭐" };
  if (boaConversao)                return { label: "Conversor",     cor: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.28)",  icon: "🚀" };
  if (altoAlcance)                 return { label: "Alto Alcance",  cor: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.28)", icon: "👁️" };
  if (baixaConv)                   return { label: "Baixa Conv.",   cor: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.28)",  icon: "⚠️" };
  return                                  { label: "Equilibrado",   cor: "#6b7280", bg: "rgba(107,114,128,0.10)",border: "rgba(107,114,128,0.22)",icon: "⚖️" };
}

// ─── PAINEL FUNIL (slot A ou B) ───────────────────────────────────────────────
function PainelFunil({ row, isEmpty, theme: t }: { row: ConversaoRow | null; isEmpty: boolean; theme: any }) {
  if (isEmpty || !row) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `1px dashed ${t.cardBorder}`, minHeight: 160, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Selecione um influencer
      </div>
    );
  }
  const taxa4 = fmtPct(pct(row.ftds, row.views));
  const ftdH  = row.horas > 0 ? (row.ftds / row.horas).toFixed(2) : "—";

  const steps = [
    { label: "Views",     val: row.views,     taxa: undefined },
    { label: "Acessos",   val: row.acessos,   taxa: fmtPct(pct(row.acessos, row.views)) },
    { label: "Registros", val: row.registros, taxa: fmtPct(pct(row.registros, row.acessos)) },
    { label: "FTDs",      val: row.ftds,      taxa: fmtPct(pct(row.ftds, row.registros)) },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Steps funil */}
      {steps.map((s) => (
        <div key={s.label} style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body }}>{s.label}</div>
            {s.taxa && <div style={{ fontSize: 10, color: BASE_COLORS.purple, marginTop: 1, fontFamily: "monospace" }}>↓ {s.taxa}</div>}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{s.val.toLocaleString("pt-BR")}</div>
        </div>
      ))}
      {/* Apenas View→FTD e FTD/Hora */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.12)" }}>
          <div style={{ fontSize: 9, color: "#a78bfa", fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>View→FTD</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa", fontFamily: FONT.body }}>{taxa4}</div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>⚡ FTD/Hora</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{ftdH}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PÓDIO FTD/HORA ───────────────────────────────────────────────────────────
const MEDALHAS = ["🥇", "🥈", "🥉"];
const PODIO_ALTURAS = [130, 90, 70]; // px da coluna do pódio
const PODIO_CORES   = [
  { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b" },  // ouro
  { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)", text: "#94a3b8" }, // prata
  { bg: "rgba(180,120,70,0.12)",  border: "rgba(180,120,70,0.35)",  text: "#b47846" }, // bronze
];

function PodioFTDHora({ ranking, theme: t }: { ranking: ConversaoRow[]; theme: any }) {
  if (ranking.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Sem dados no período</div>;
  }

  const top3  = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  // Reordenar pódio: 2º | 1º | 3º (visual clássico)
  const podioOrdem = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;
  const podioIdx   = top3.length >= 2 ? [1, 0, 2] : [0]; // índices originais no ranking

  return (
    <div>
      {/* ── PÓDIO VISUAL ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        {podioOrdem.map((row, i) => {
          const rankIdx = podioIdx[i]; // posição real (0=1º, 1=2º, 2=3º)
          const cor     = PODIO_CORES[rankIdx];
          const altura  = PODIO_ALTURAS[rankIdx];
          const medalha = MEDALHAS[rankIdx];
          const maxFtdH = top3[0].ftdPorHora;
          const barPct  = maxFtdH > 0 ? (row.ftdPorHora / maxFtdH) * 100 : 0;

          return (
            <div key={row.influencer_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
              {/* Nome */}
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 6, textAlign: "center", maxWidth: 130 }}>{row.nome.split(" ")[0]}</div>
              {/* Valor */}
              <div style={{ fontSize: 20, fontWeight: 900, color: cor.text, fontFamily: FONT.body, marginBottom: 8 }}>{row.ftdPorHora.toFixed(2)}</div>
              {/* Barra de pódio */}
              <div style={{
                width: "100%", height: altura,
                background: cor.bg, border: `1px solid ${cor.border}`,
                borderRadius: "12px 12px 0 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                paddingTop: 12,
                position: "relative",
              }}>
                <span style={{ fontSize: 28 }}>{medalha}</span>
                <span style={{ fontSize: 11, color: cor.text, fontWeight: 700, marginTop: 6, fontFamily: FONT.body }}>#{rankIdx + 1}</span>
                {/* Mini barra de progresso interna */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, borderRadius: "0 0 0 0", background: cor.border }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── LISTA DO RESTO ── */}
      {resto.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {resto.map((row, i) => {
            const pos     = i + 4;
            const maxFtdH = ranking[0].ftdPorHora;
            const barPct  = maxFtdH > 0 ? (row.ftdPorHora / maxFtdH) * 100 : 0;
            return (
              <div key={row.influencer_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.02)" }}>
                {/* Posição */}
                <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textAlign: "right", flexShrink: 0 }}>#{pos}</div>
                {/* Nome */}
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT.body, width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.nome.split(" ")[0]}</div>
                {/* Barra proporcional */}
                <div style={{ flex: 1, height: 6, background: t.cardBorder, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${barPct}%`, height: "100%", background: "rgba(124,58,237,0.55)", borderRadius: 999, transition: "width 0.4s" }} />
                </div>
                {/* Valor */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body, flexShrink: 0, width: 40, textAlign: "right" }}>{row.ftdPorHora.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardConversao() {
  const { theme: t } = useApp();

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]       = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [perfis, setPerfis]       = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]           = useState<ConversaoRow[]>([]);

  // Comparativo — inicializa em placeholder, preenchido após carga
  const [compA, setCompA] = useState<string>("");
  const [compB, setCompB] = useState<string>("");

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
      const { data: metricasData } = await qMetricas;
      const metricas = metricasData || [];

      let qLives = supabase.from("lives").select("id, influencer_id, status, plataforma, data").eq("status", "realizada");
      if (!historico && mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        qLives = qLives.gte("data", inicio).lte("data", fim);
      }
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

      // Pré-preencher A e B com os dois primeiros com dados
      if (resultado.length >= 1) setCompA((prev) => prev || resultado[0].influencer_id);
      if (resultado.length >= 2) setCompB((prev) => prev || resultado[1].influencer_id);

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes]);

  // ── DADOS DERIVADOS ────────────────────────────────────────────────────────
  const rowA = rows.find((r) => r.influencer_id === compA) || null;
  const rowB = rows.find((r) => r.influencer_id === compB) || null;

  // Ranking FTD/Hora — todos com horas > 0, ordenado desc
  const rankingFtdHora = rows.filter((r) => r.ftdPorHora > 0).sort((a, b) => b.ftdPorHora - a.ftdPorHora);

  const perfisDisponiveis: PerfilInfo[] = [
    { label: "Duplo Impacto", cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", icon: "⭐" },
    { label: "Conversor",     cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)",  icon: "🚀" },
    { label: "Alto Alcance",  cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)", icon: "👁️" },
    { label: "Equilibrado",   cor: "#6b7280", bg: "rgba(107,114,128,0.10)",border: "rgba(107,114,128,0.22)",icon: "⚖️" },
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

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>Dashboards • Conversão</h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>Análise do funil de conversão por influencer — taxas, eficiência e perfil de audiência.</p>
      </div>

      {/* ── BLOCO 1: FILTROS — idêntico ao Overview ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...card, padding: "14px 20px", background: `linear-gradient(135deg, ${t.cardBg} 0%, rgba(124,58,237,0.04) 100%)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <button style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>›</button>
            <button style={btnHistorico} onClick={toggleHistorico}>Histórico</button>
            {loading && <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 8 }}>⏳ Carregando...</span>}
          </div>
        </div>
      </div>

      {/* ── BLOCO 2: COMPARATIVO DE FUNIL ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>🔽</span> Comparativo de Funil</h3>

        {/* Selects dos dois influencers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <select value={compA} onChange={(e) => setCompA(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: compA ? "rgba(124,58,237,0.5)" : undefined }}>
            <option value="">— Selecione —</option>
            {rows.filter((r) => r.influencer_id !== compB).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
          <div style={{ textAlign: "center", fontSize: 16, color: t.textMuted, fontWeight: 700 }}>vs</div>
          <select value={compB} onChange={(e) => setCompB(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: compB ? "rgba(37,99,235,0.5)" : undefined }}>
            <option value="">— Selecione —</option>
            {rows.filter((r) => r.influencer_id !== compA).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
        </div>

        {/* Cabeçalhos coloridos com nome */}
        {(rowA || rowB) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.3)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body }}>
              {rowA?.nome ?? "—"}
            </div>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.3)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#60a5fa", fontFamily: FONT.body }}>
              {rowB?.nome ?? "—"}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Carregando dados...</div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <PainelFunil row={rowA} isEmpty={!compA} theme={t} />
            <div style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
            <PainelFunil row={rowB} isEmpty={!compB} theme={t} />
          </div>
        )}
      </div>

      {/* ── BLOCO 3: PÓDIO FTD/HORA ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>⚡</span> Ranking FTD/Hora — Eficiência por Influencer</h3>
        <p style={{ margin: "-8px 0 20px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>FTDs gerados por hora de live — influencers sem horas registradas omitidos.</p>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Carregando...</div>
        ) : (
          <PodioFTDHora ranking={rankingFtdHora} theme={t} />
        )}
      </div>

      {/* ── BLOCO 4: TABELA COMPARATIVA ── */}
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
                  {["Influencer","Views","View→Acesso","Acessos","Acesso→Reg","Registros","Reg→FTD","FTDs","Perfil"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFiltrados.map((r, i) => {
                  const pf = getPerfilConversao(r);
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.03)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctViewAcesso)}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctAcessoReg)}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: t.textMuted, fontSize: 12 }}>{fmtPct(r.pctRegFTD)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.ftds > 0 ? "#22c55e" : t.text }}>{r.ftds.toLocaleString("pt-BR")}</td>
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
