import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { BASE_COLORS, FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };

// Paleta A (roxo) e B (azul)
const COR_A = {
  accent:  "#a78bfa",
  bg:      "rgba(124,58,237,0.10)",
  border:  "rgba(124,58,237,0.35)",
  step:    "rgba(124,58,237,0.07)",
  taxa:    "rgba(124,58,237,0.14)",
  taxaBorder: "rgba(124,58,237,0.45)",
};
const COR_B = {
  accent:  "#60a5fa",
  bg:      "rgba(37,99,235,0.10)",
  border:  "rgba(37,99,235,0.35)",
  step:    "rgba(37,99,235,0.07)",
  taxa:    "rgba(37,99,235,0.14)",
  taxaBorder: "rgba(37,99,235,0.45)",
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface InfluencerPerfil { id: string; nome_artistico: string; cache_hora: number; }

interface ConversaoRow {
  influencer_id: string; nome: string;
  views: number; acessos: number; registros: number; ftds: number; horas: number;
  pctViewAcesso: number | null; pctAcessoReg: number | null;
  pctRegFTD: number | null; pctViewFTD: number | null;
  ftdPorHora: number; acaoLabel: string;
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

// ─── COLUNA AÇÃO (em ordem de prioridade) ─────────────────────────────────────
// 1. View→Acesso < 10%  → "Divulgar o link"    🔗
// 2. Acesso→Reg  < 10%  → "Converter visita"   🎮
// 3. Reg→FTD     < 60%  → "Ativar cadastro"    🎯
// Sem pendências        → "Em dia"             ✅

type AcaoInfo = { label: string; icon: string; cor: string; bg: string; border: string };

function getAcao(row: ConversaoRow): AcaoInfo {
  if (row.pctViewAcesso !== null && row.pctViewAcesso < 10)
    return { label: "Divulgar o link",  icon: "🔗", cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" };
  if (row.pctAcessoReg !== null && row.pctAcessoReg < 10)
    return { label: "Converter visita", icon: "🎮", cor: "#a855f7", bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.28)" };
  if (row.pctRegFTD !== null && row.pctRegFTD < 60)
    return { label: "Ativar cadastro",  icon: "🎯", cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)" };
  return { label: "Em dia",            icon: "✅", cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)"  };
}

// ─── PAINEL FUNIL ─────────────────────────────────────────────────────────────
function PainelFunil({
  row, isEmpty, cor,
}: {
  row: ConversaoRow | null;
  isEmpty: boolean;
  cor: typeof COR_A;
}) {
  const { theme: t } = useApp();

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
      {steps.map((s) => (
        <div key={s.label} style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${cor.border}`, background: cor.step, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: cor.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.body, fontWeight: 600 }}>{s.label}</div>
            {s.taxa && <div style={{ fontSize: 10, color: cor.accent, marginTop: 1, fontFamily: "monospace", opacity: 0.8 }}>↓ {s.taxa}</div>}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text, fontFamily: FONT.body }}>{s.val.toLocaleString("pt-BR")}</div>
        </div>
      ))}
      {/* View→FTD e FTD/Hora — mesma cor */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <div style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${cor.taxaBorder}`, background: cor.taxa }}>
          <div style={{ fontSize: 9, color: cor.accent, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontWeight: 600 }}>View→FTD</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cor.accent, fontFamily: FONT.body }}>{taxa4}</div>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${cor.taxaBorder}`, background: cor.taxa }}>
          <div style={{ fontSize: 9, color: cor.accent, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontWeight: 600 }}>⚡ FTD/Hora</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cor.accent, fontFamily: FONT.body }}>{ftdH}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PÓDIO FTD/HORA ───────────────────────────────────────────────────────────
const MEDALHAS   = ["🥇","🥈","🥉"];
const PODIO_H    = [130, 90, 70];
const PODIO_CORES = [
  { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b" },
  { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)", text: "#94a3b8" },
  { bg: "rgba(180,120,70,0.12)",  border: "rgba(180,120,70,0.35)",  text: "#b47846" },
];

function PodioFTDHora({ ranking }: { ranking: ConversaoRow[] }) {
  const { theme: t } = useApp();
  const [pagResto, setPagResto] = useState<0 | 1>(0);

  if (ranking.length === 0) {
    return <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Sem dados no período</div>;
  }

  const top3  = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  // ordem visual clássica: 2º | 1º | 3º
  const podioOrdem = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;
  const podioIdx   = top3.length >= 2 ? [1, 0, 2] : [0];

  const maxFtdH = ranking[0].ftdPorHora;

  // Pares lado a lado: #4/#5, #6/#7, #8/#9...
  const PARES_POR_PAG = 6;
  const pares: [ConversaoRow, ConversaoRow | null][] = [];
  for (let i = 0; i < resto.length; i += 2) {
    pares.push([resto[i], resto[i + 1] ?? null]);
  }
  const totalPags = Math.ceil(pares.length / PARES_POR_PAG);
  const paresPag  = pares.slice(pagResto * PARES_POR_PAG, pagResto * PARES_POR_PAG + PARES_POR_PAG);

  function ItemLista({ row, pos }: { row: ConversaoRow; pos: number }) {
    const barPct = maxFtdH > 0 ? (row.ftdPorHora / maxFtdH) * 100 : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.02)" }}>
        <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textAlign: "right", flexShrink: 0 }}>#{pos}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: FONT.body, width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.nome.split(" ")[0]}</div>
        <div style={{ flex: 1, height: 5, background: t.cardBorder, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${barPct}%`, height: "100%", background: "rgba(124,58,237,0.55)", borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body, flexShrink: 0, width: 36, textAlign: "right" }}>{row.ftdPorHora.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div>
      {/* PÓDIO */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        {podioOrdem.map((row, i) => {
          const rankIdx = podioIdx[i];
          const cor     = PODIO_CORES[rankIdx];
          const altura  = PODIO_H[rankIdx];
          return (
            <div key={row.influencer_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4, textAlign: "center" }}>{row.nome.split(" ")[0]}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cor.text, fontFamily: FONT.body, marginBottom: 8 }}>{row.ftdPorHora.toFixed(2)}</div>
              <div style={{ width: "100%", height: altura, background: cor.bg, border: `1px solid ${cor.border}`, borderRadius: "12px 12px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 12 }}>
                <span style={{ fontSize: 26 }}>{MEDALHAS[rankIdx]}</span>
                <span style={{ fontSize: 11, color: cor.text, fontWeight: 700, marginTop: 6, fontFamily: FONT.body }}>#{rankIdx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RESTO — pares lado a lado: #4/#5, #6/#7... */}
      {resto.length > 0 && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {paresPag.map(([rowEsq, rowDir], i) => {
              const posEsq = pagResto * PARES_POR_PAG * 2 + i * 2 + 4;
              const posDir = posEsq + 1;
              return (
                <div key={rowEsq.influencer_id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <ItemLista row={rowEsq} pos={posEsq} />
                  {rowDir
                    ? <ItemLista row={rowDir} pos={posDir} />
                    : <div />}
                </div>
              );
            })}
          </div>
          {/* Paginação */}
          {totalPags > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
              {Array.from({ length: totalPags }).map((_, i) => (
                <button key={i} onClick={() => setPagResto(i as 0 | 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${pagResto === i ? "#7c3aed" : t.cardBorder}`, background: pagResto === i ? "rgba(124,58,237,0.15)" : "transparent", color: pagResto === i ? "#a78bfa" : t.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardConversao() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("dash_conversao");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]       = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [perfis, setPerfis]       = useState<InfluencerPerfil[]>([]);
  const [rows, setRows]           = useState<ConversaoRow[]>([]);
  const [compA, setCompA]         = useState<string>("");
  const [compB, setCompB]         = useState<string>("");
  const [acaoFiltro, setAcaoFiltro] = useState<string | null>(null);
  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
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

      // views = média de media_views entre as lives do influencer (não somatória)
      const mapa = new Map<string, { acessos: number; registros: number; ftds: number; viewsTotal: number; liveComViews: number; horas: number }>();
      metricas.forEach((m: any) => {
        if (!mapa.has(m.influencer_id)) mapa.set(m.influencer_id, { acessos: 0, registros: 0, ftds: 0, viewsTotal: 0, liveComViews: 0, horas: 0 });
        const r = mapa.get(m.influencer_id)!;
        r.acessos += m.visit_count || 0; r.registros += m.registration_count || 0; r.ftds += m.ftd_count || 0;
      });
      lives.forEach((live: any) => {
        if (!mapa.has(live.influencer_id)) mapa.set(live.influencer_id, { acessos: 0, registros: 0, ftds: 0, viewsTotal: 0, liveComViews: 0, horas: 0 });
        const r = mapa.get(live.influencer_id)!;
        const res = resultados.find((x: any) => x.live_id === live.id);
        if (res) {
          if (res.media_views) { r.viewsTotal += res.media_views; r.liveComViews += 1; }
          r.horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
        }
      });

      const resultado: ConversaoRow[] = [];
      mapa.forEach((data, id) => {
        const perfil = perfisLista.find((p) => p.id === id);
        if (!perfil) return;
        const avgViews = data.liveComViews > 0 ? Math.round(data.viewsTotal / data.liveComViews) : 0;
        const row: ConversaoRow = {
          influencer_id: id, nome: perfil.nome_artistico,
          views: avgViews, acessos: data.acessos, registros: data.registros, ftds: data.ftds, horas: data.horas,
          pctViewAcesso: pct(data.acessos, avgViews), pctAcessoReg: pct(data.registros, data.acessos),
          pctRegFTD: pct(data.ftds, data.registros), pctViewFTD: pct(data.ftds, avgViews),
          ftdPorHora: data.horas > 0 ? data.ftds / data.horas : 0, acaoLabel: "",
        };
        row.acaoLabel = getAcao(row).label;
        resultado.push(row);
      });

      resultado.sort((a, b) => b.ftds - a.ftds);
      const rowsVisiveis = resultado.filter((r) => podeVerInfluencer(r.influencer_id));
      setRows(rowsVisiveis);
      if (rowsVisiveis.length >= 1) setCompA((prev) => prev || rowsVisiveis[0].influencer_id);
      if (rowsVisiveis.length >= 2) setCompB((prev) => prev || rowsVisiveis[1].influencer_id);
      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, podeVerInfluencer]);

  const rowsFiltradosEscopo = useMemo(() => {
    let r = rows;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (filtroOperadora !== "todas") {
      const ids = operadoraInfMap[filtroOperadora] ?? [];
      r = r.filter((row) => ids.includes(row.influencer_id));
    }
    return r;
  }, [rows, filtroInfluencer, filtroOperadora, operadoraInfMap]);

  const rowA = rowsFiltradosEscopo.find((r) => r.influencer_id === compA) || null;
  const rowB = rowsFiltradosEscopo.find((r) => r.influencer_id === compB) || null;
  const rankingFtdHora = rowsFiltradosEscopo.filter((r) => r.ftdPorHora > 0).sort((a, b) => b.ftdPorHora - a.ftdPorHora);

  // Ações disponíveis para filtro
  const acoesDisponiveis = [
    { label: "Divulgar o link",  icon: "🔗", cor: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
    { label: "Converter visita", icon: "🎮", cor: "#a855f7", bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.28)" },
    { label: "Ativar cadastro",  icon: "🎯", cor: "#3b82f6", bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.28)" },
    { label: "Em dia",           icon: "✅", cor: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)"  },
  ];
  const rowsFiltrados = acaoFiltro ? rowsFiltradosEscopo.filter((r) => r.acaoLabel === acaoFiltro) : rowsFiltradosEscopo;

  // Estilos
  const card = { background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.25)" } as React.CSSProperties;
  const cardTitle = { margin: "0 0 16px", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: t.text, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties;
  const selectStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder ?? t.cardBorder}`, color: t.text, padding: "7px 12px", borderRadius: 10, fontSize: 13, fontFamily: FONT.body, outline: "none", cursor: "pointer" } as React.CSSProperties;
  const thStyle = { textAlign: "left" as const, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: t.textMuted, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`, background: "rgba(124,58,237,0.06)", fontFamily: FONT.body, whiteSpace: "nowrap" as const };
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.title, letterSpacing: "0.03em" }}>Dashboards • Conversão</h2>
        <p style={{ margin: "6px 0 0", color: t.textMuted, fontSize: 13 }}>Análise do funil de conversão por influencer — taxas, eficiência e perfil de audiência.</p>
      </div>

      {/* ── BLOCO 1: FILTROS ── */}
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
              <select value={filtroInfluencer} onChange={(e) => setFiltroInfluencer(e.target.value)} style={{ ...selectStyle, padding: "6px 12px" }}>
                <option value="todos">Todos os influencers</option>
                {rows.map((r) => (
                  <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                ))}
              </select>
            )}
            {showFiltroOperadora && (
              <select value={filtroOperadora} onChange={(e) => setFiltroOperadora(e.target.value)} style={{ ...selectStyle, padding: "6px 12px" }}>
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

      {/* ── BLOCO 2: COMPARATIVO DE FUNIL ── */}
      <div style={{ ...card, marginBottom: 14 }}>
        <h3 style={cardTitle}><span style={{ fontSize: 16 }}>🔽</span> Comparativo de Funil</h3>

        {/* Selects */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <select value={compA} onChange={(e) => setCompA(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: compA ? COR_A.border : undefined }}>
            <option value="">— Selecione —</option>
            {rowsFiltradosEscopo.filter((r) => r.influencer_id !== compB).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
          <div style={{ textAlign: "center", fontSize: 16, color: t.textMuted, fontWeight: 700 }}>vs</div>
          <select value={compB} onChange={(e) => setCompB(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: compB ? COR_B.border : undefined }}>
            <option value="">— Selecione —</option>
            {rowsFiltradosEscopo.filter((r) => r.influencer_id !== compA).map((r) => (
              <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
            ))}
          </select>
        </div>

        {/* Cabeçalhos coloridos */}
        {(rowA || rowB) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: COR_A.bg, border: `1px solid ${COR_A.border}`, textAlign: "center", fontSize: 13, fontWeight: 700, color: COR_A.accent, fontFamily: FONT.body }}>
              {rowA?.nome ?? "—"}
            </div>
            <div style={{ padding: "6px 12px", borderRadius: 10, background: COR_B.bg, border: `1px solid ${COR_B.border}`, textAlign: "center", fontSize: 13, fontWeight: 700, color: COR_B.accent, fontFamily: FONT.body }}>
              {rowB?.nome ?? "—"}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Carregando dados...</div>
        ) : (
          <div style={{ display: "flex", gap: 16 }}>
            <PainelFunil row={rowA} isEmpty={!compA} cor={COR_A} />
            <div style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
            <PainelFunil row={rowB} isEmpty={!compB} cor={COR_B} />
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
          <PodioFTDHora ranking={rankingFtdHora} />
        )}
      </div>

      {/* ── BLOCO 4: TABELA ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ ...cardTitle, margin: 0 }}><span style={{ fontSize: 16 }}>📋</span> Comparativo de Taxas</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {acoesDisponiveis.map((a) => {
              const ativo = acaoFiltro === a.label;
              const qtd   = rowsFiltradosEscopo.filter((r) => r.acaoLabel === a.label).length;
              return (
                <button key={a.label} onClick={() => setAcaoFiltro(ativo ? null : a.label)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${ativo ? a.cor : a.border}`, background: ativo ? a.bg : "transparent", color: ativo ? a.cor : t.textMuted, fontSize: 11, fontWeight: ativo ? 700 : 400, opacity: qtd === 0 ? 0.35 : 1 }}>
                  {a.icon} {a.label} {qtd > 0 && <span style={{ opacity: 0.7 }}>({qtd})</span>}
                </button>
              );
            })}
            {acaoFiltro && <button onClick={() => setAcaoFiltro(null)} style={{ padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.textMuted, fontSize: 11 }}>✕ Limpar</button>}
          </div>
        </div>

        {acaoFiltro && (
          <div style={{ marginBottom: 12, fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
            Exibindo <strong style={{ color: t.text }}>{rowsFiltrados.length}</strong> influencer{rowsFiltrados.length !== 1 ? "s" : ""} com ação <strong style={{ color: t.text }}>{acaoFiltro}</strong>
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
                  {["Influencer","Views","View→Acesso","Acessos","Acesso→Reg","Registros","Reg→FTD","FTDs","Ação"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFiltrados.map((r, i) => {
                  const ac = getAcao(r);
                  // Destacar a coluna de taxa que disparou a ação
                  const hl1 = r.pctViewAcesso !== null && r.pctViewAcesso < 10;
                  const hl2 = !hl1 && r.pctAcessoReg !== null && r.pctAcessoReg < 10;
                  const hl3 = !hl1 && !hl2 && r.pctRegFTD !== null && r.pctRegFTD < 60;
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.03)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      {/* View→Acesso */}
                      <td style={{ ...tdStyle, fontSize: 12, fontWeight: hl1 ? 700 : 400, color: hl1 ? "#f59e0b" : t.textMuted, background: hl1 ? "rgba(245,158,11,0.06)" : undefined }}>{fmtPct(r.pctViewAcesso)}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      {/* Acesso→Reg */}
                      <td style={{ ...tdStyle, fontSize: 12, fontWeight: hl2 ? 700 : 400, color: hl2 ? "#a855f7" : t.textMuted, background: hl2 ? "rgba(168,85,247,0.06)" : undefined }}>{fmtPct(r.pctAcessoReg)}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      {/* Reg→FTD */}
                      <td style={{ ...tdStyle, fontSize: 12, fontWeight: hl3 ? 700 : 400, color: hl3 ? "#3b82f6" : t.textMuted, background: hl3 ? "rgba(59,130,246,0.06)" : undefined }}>{fmtPct(r.pctRegFTD)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.ftds > 0 ? "#22c55e" : t.text }}>{r.ftds.toLocaleString("pt-BR")}</td>
                      {/* Ação */}
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${ac.border}`, background: ac.bg, color: ac.cor, fontSize: 11, fontFamily: FONT.body, whiteSpace: "nowrap" }}>
                          {ac.icon} {ac.label}
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
