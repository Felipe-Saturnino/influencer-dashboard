import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { SelectComIcone } from "../../../components/dashboard";
import { getThStyle, getTdStyle } from "../../../lib/tableStyles";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages, fetchLiveResultadosBatched } from "../../../lib/supabasePaginate";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  GiCalendar, GiStarMedal, GiShield,
  GiTrophy, GiMedal, GiLaurelsTrophy,
  GiConvergenceTarget, GiArcheryTarget,
  GiCheckMark, GiShare, GiGamepad,
  GiPodium, GiSpeedometer,
} from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

// Paleta A (roxo) e B (azul) — alinhadas à paleta oficial
const COR_A = {
  accent:     "#7c3aed",
  bg:         "rgba(124,58,237,0.10)",
  border:     "rgba(124,58,237,0.35)",
  step:       "rgba(124,58,237,0.07)",
  taxa:       "rgba(124,58,237,0.13)",
  taxaBorder: "rgba(124,58,237,0.40)",
};
const COR_B = {
  accent:     "#1e36f8",
  bg:         "rgba(30,54,248,0.10)",
  border:     "rgba(30,54,248,0.35)",
  step:       "rgba(30,54,248,0.07)",
  taxa:       "rgba(30,54,248,0.13)",
  taxaBorder: "rgba(30,54,248,0.40)",
};

// Cores do pódio — alinhadas à paleta oficial
const PODIO_CORES = [
  { bg: "rgba(245,158,11,0.13)", border: "rgba(245,158,11,0.38)", text: "#f59e0b" }, // 1º ouro
  { bg: "rgba(112,202,228,0.13)", border: "rgba(112,202,228,0.35)", text: "#70cae4" }, // 2º ciano
  { bg: "rgba(74,32,130,0.18)",  border: "rgba(74,32,130,0.40)",  text: "#a78bfa" }, // 3º roxo
];

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };

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

// ─── AÇÃO ─────────────────────────────────────────────────────────────────────
type AcaoInfo = { label: string; icon: React.ReactNode; cor: string; bg: string; border: string };

function getAcao(row: ConversaoRow): AcaoInfo {
  if (row.pctViewAcesso !== null && row.pctViewAcesso < 10)
    return { label: "Divulgar o link",  icon: <GiShare size={11} />,          cor: BRAND.amarelo, bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" };
  if (row.pctAcessoReg !== null && row.pctAcessoReg < 10)
    return { label: "Converter visita", icon: <GiGamepad size={11} />,         cor: "#a855f7",     bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.28)" };
  if (row.pctRegFTD !== null && row.pctRegFTD < 60)
    return { label: "Ativar cadastro",  icon: <GiArcheryTarget size={11} />,   cor: BRAND.azul,    bg: "rgba(30,54,248,0.10)",  border: "rgba(30,54,248,0.28)"  };
  return { label: "Em dia",            icon: <GiCheckMark size={11} />,       cor: BRAND.verde,   bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)"  };
}

// ─── SECTION TITLE (mesmo padrão do Overview) ─────────────────────────────────
function SectionTitle({ icon, children, sub }: {
  icon: React.ReactNode; children: React.ReactNode; sub?: React.ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: brand.primaryIconBg,
        border: brand.primaryIconBorder,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: brand.primaryIconColor, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800, color: brand.primary,
        fontFamily: FONT_TITLE,
        letterSpacing: "0.05em", textTransform: "uppercase" as const,
      }}>
        {children}
      </span>
      {sub && (
        <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── FUNIL SVG (mesmo padrão do Overview, adaptado para 1 influencer) ─────────
const FUNIL_STEPS_CONFIG = [
  { key: "views",     label: "Views"     },
  { key: "acessos",   label: "Acessos"   },
  { key: "registros", label: "Registros" },
  { key: "ftds",      label: "FTDs"      },
] as const;

// Degradê por nível: roxo → azul → ciano → verde
const FUNIL_CORES = [BRAND.roxoVivo, BRAND.azul, BRAND.ciano, BRAND.verde] as const;

function FunilSVG({ row, cor, idPrefix }: { row: ConversaoRow; cor: typeof COR_A; idPrefix: string }) {
  const { theme: t } = useApp();
  const W = 220, H = 230;
  const levels = 4;
  const stepH  = H / levels;
  const widths = [1.0, 0.76, 0.55, 0.36].map((f) => f * W);

  const values = [row.views, row.acessos, row.registros, row.ftds];
  const taxas  = [
    undefined,
    fmtPct(pct(row.acessos, row.views)),
    fmtPct(pct(row.registros, row.acessos)),
    fmtPct(pct(row.ftds, row.registros)),
  ];

  const ariaFunil = `Funil de conversão: ${values[0].toLocaleString("pt-BR")} views, ${values[1].toLocaleString("pt-BR")} acessos, ${values[2].toLocaleString("pt-BR")} registros, ${values[3].toLocaleString("pt-BR")} FTDs`;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <svg
        role="img"
        aria-label={ariaFunil}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, flexShrink: 0, display: "block" }}
      >
        <defs>
          {FUNIL_STEPS_CONFIG.map((_, i) => (
            <linearGradient key={i} id={`fg-${idPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FUNIL_CORES[i]} stopOpacity="0.88" />
              <stop offset="100%" stopColor={FUNIL_CORES[i]} stopOpacity="0.58" />
            </linearGradient>
          ))}
        </defs>
        {FUNIL_STEPS_CONFIG.map((step, i) => {
          const wTop = widths[i];
          const wBot = widths[i + 1] ?? widths[i] * 0.72;
          const xTop = (W - wTop) / 2;
          const xBot = (W - wBot) / 2;
          const yTop = i * stepH;
          const yBot = yTop + stepH - 2;
          const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
          return (
            <g key={step.key}>
              <path d={path} fill={`url(#fg-${idPrefix}-${i})`} />
              <text x={W / 2} y={yTop + stepH / 2 - 5}
                textAnchor="middle" fill="#fff"
                fontSize={9} fontFamily={FONT.body} fontWeight={600} letterSpacing="0.08em">
                {step.label.toUpperCase()}
              </text>
              <text x={W / 2} y={yTop + stepH / 2 + 10}
                textAnchor="middle" fill="#fff"
                fontSize={15} fontFamily={FONT.body} fontWeight={800}>
                {values[i] > 0 ? values[i].toLocaleString("pt-BR") : "—"}
              </text>
              {taxas[i] && (
                <text x={W / 2} y={yTop + stepH / 2 + 22}
                  textAnchor="middle" fill="rgba(255,255,255,0.72)"
                  fontSize={8} fontFamily={FONT.body}>
                  ↓ {taxas[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Taxas à direita */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, flex: 1 }}>
        <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 2, fontWeight: 600 }}>
          Taxas Chave
        </div>
        {[
          { label: "View → FTD",    val: fmtPct(pct(row.ftds, row.views)),    hl: true  },
          { label: "Acesso → FTD",  val: fmtPct(pct(row.ftds, row.acessos)),  hl: false },
          { label: "FTD / Hora",    val: row.horas > 0 ? (row.ftds / row.horas).toFixed(2) : "—", hl: true },
        ].map((r) => (
          <div key={r.label} style={{
            padding: "8px 10px", borderRadius: 10,
            border: `1px solid ${r.hl ? cor.taxaBorder : t.cardBorder}`,
            background: r.hl ? cor.taxa : "rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.body, color: r.hl ? cor.accent : t.text }}>
              {r.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAINEL FUNIL (wrapper) ────────────────────────────────────────────────────
function PainelFunil({ row, isEmpty, cor }: {
  row: ConversaoRow | null; isEmpty: boolean; cor: typeof COR_A;
}) {
  const { theme: t } = useApp();
  if (isEmpty || !row) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `1px dashed ${t.cardBorder}`, minHeight: 230, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
        Selecione um influencer
      </div>
    );
  }
  return (
    <div style={{ flex: 1 }}>
      <FunilSVG row={row} cor={cor} idPrefix={row.influencer_id} />
    </div>
  );
}

// ─── PÓDIO FTD/HORA ───────────────────────────────────────────────────────────
const PODIO_H    = [130, 90, 70];
const PODIO_ICONS = [
  <GiTrophy key="1" size={28} />,
  <GiMedal key="2" size={24} />,
  <GiLaurelsTrophy key="3" size={22} />,
];

function PodioFTDHora({ ranking }: { ranking: ConversaoRow[] }) {
  const { theme: t } = useApp();
  const [pagResto, setPagResto] = useState<number>(0);

  useEffect(() => {
    setPagResto(0);
  }, [ranking]);

  if (!ranking.length) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>{MSG_SEM_DADOS_FILTRO}</div>
    );
  }

  const top3  = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  // ordem visual clássica: 2º | 1º | 3º
  const podioOrdem = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3;
  const podioIdx   = top3.length >= 2 ? [1, 0, 2] : [0];

  const maxFtdH = ranking[0].ftdPorHora;

  const PARES_POR_PAG = 6;
  const pares: [ConversaoRow, ConversaoRow | null][] = [];
  for (let i = 0; i < resto.length; i += 2) pares.push([resto[i], resto[i + 1] ?? null]);
  const totalPags = Math.ceil(pares.length / PARES_POR_PAG);
  const paresPag  = pares.slice(pagResto * PARES_POR_PAG, (pagResto + 1) * PARES_POR_PAG);

  function ItemLista({ row, pos }: { row: ConversaoRow; pos: number }) {
    const barPct = maxFtdH > 0 ? (row.ftdPorHora / maxFtdH) * 100 : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, border: `1px solid ${t.cardBorder}`, background: "rgba(255,255,255,0.02)" }}>
        <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: FONT.body, textAlign: "right", flexShrink: 0 }}>#{pos}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: FONT.body, width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
          {row.nome.split(" ")[0]}
        </div>
        <div style={{ flex: 1, height: 5, background: t.cardBorder, borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${barPct}%`, height: "100%", background: `${BRAND.roxo}`, opacity: 0.65, borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", fontFamily: FONT.body, flexShrink: 0, width: 36, textAlign: "right" as const }}>
          {row.ftdPorHora.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Pódio */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 28 }}>
        {podioOrdem.map((row, i) => {
          const rankIdx = podioIdx[i];
          const cor     = PODIO_CORES[rankIdx];
          const altura  = PODIO_H[rankIdx];
          return (
            <div key={row.influencer_id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, fontFamily: FONT.body, marginBottom: 4, textAlign: "center" as const }}>
                {row.nome.split(" ")[0]}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cor.text, fontFamily: FONT.body, marginBottom: 8 }}>
                {row.ftdPorHora.toFixed(2)}
              </div>
              <div style={{
                width: "100%", height: altura,
                background: cor.bg, border: `1px solid ${cor.border}`,
                borderRadius: "12px 12px 0 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                paddingTop: 12,
              }}>
                <span style={{ color: cor.text }}>{PODIO_ICONS[rankIdx]}</span>
                <span style={{ fontSize: 11, color: cor.text, fontWeight: 700, marginTop: 6, fontFamily: FONT.body }}>
                  #{rankIdx + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resto */}
      {resto.length > 0 && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {paresPag.map(([rowEsq, rowDir], i) => {
              const posEsq = pagResto * PARES_POR_PAG * 2 + i * 2 + 4;
              return (
                <div key={rowEsq.influencer_id} className="app-grid-2-tight" style={{ gap: 10 }}>
                  <ItemLista row={rowEsq} pos={posEsq} />
                  {rowDir ? <ItemLista row={rowDir} pos={posEsq + 1} /> : <div />}
                </div>
              );
            })}
          </div>
          {totalPags > 1 && (
            <>
              <div style={{
                textAlign: "center",
                fontSize: 11,
                color: t.textMuted,
                fontFamily: FONT.body,
                marginBottom: 6,
              }}>
                {(() => {
                  const startResto = pagResto * PARES_POR_PAG * 2;
                  const endResto = Math.min(startResto + PARES_POR_PAG * 2, resto.length);
                  const startRank = 4 + startResto;
                  const endRank = 4 + endResto - 1;
                  return endResto > startResto
                    ? `${startRank}–${endRank} de ${ranking.length} influencers`
                    : null;
                })()}
              </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 0 }}>
              {Array.from({ length: totalPags }).map((_, i) => (
                <button type="button" key={i} aria-label={`Página ${i + 1} da lista FTD por hora`} onClick={() => setPagResto(i)} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `1px solid ${pagResto === i ? BRAND.roxoVivo : t.cardBorder}`,
                  background: pagResto === i ? "rgba(124,58,237,0.15)" : "transparent",
                  color: pagResto === i ? "#a78bfa" : t.textMuted,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.body,
                }}>
                  {i + 1}
                </button>
              ))}
            </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardConversao() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis: _escoposVisiveis, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("dash_conversao");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]         = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [rows, setRows]             = useState<ConversaoRow[]>([]);
  const [compA, setCompA]           = useState<string>("");
  const [compB, setCompB]           = useState<string>("");
  const [acaoFiltro, setAcaoFiltro] = useState<string | null>(null);
  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora]   = useState<string>("todas");
  const [operadorasList, setOperadorasList]     = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap]   = useState<Record<string, string[]>>({});

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
      setOperadorasList(opsData || []);
      const map: Record<string, string[]> = {};
      (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
        if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
        map[o.operadora_slug].push(o.influencer_id);
      });
      setOperadoraInfMap(map);

      const { inicio, fim } = historico || !mesSelecionado
        ? { inicio: "2020-01-01", fim: new Date().toISOString().split("T")[0] }
        : getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
      const metricasData = await fetchAllPages<{ influencer_id: string; visit_count: number; registration_count: number; ftd_count: number; data: string }>(
        async (from, to) => {
          let qMetricas = supabase.from("influencer_metricas").select("influencer_id, registration_count, ftd_count, visit_count, data")
            .order("data", { ascending: true })
            .order("influencer_id", { ascending: true })
            .order("operadora_slug", { ascending: true })
            .range(from, to);
          if (!historico && mesSelecionado) qMetricas = qMetricas.gte("data", inicio).lte("data", fim);
          if (operadoraSlugsForcado?.length) qMetricas = qMetricas.in("operadora_slug", operadoraSlugsForcado);
          else if (filtroOperadora !== "todas") qMetricas = qMetricas.eq("operadora_slug", filtroOperadora);
          return qMetricas;
        }
      );
      let metricas = metricasData;
      if (historico) {
        const { buscarMetricasDeAliases, mesclarMetricasComAliases } = await import("../../../lib/metricasAliases");
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: operadoraSlugsForcado?.[0] ?? (filtroOperadora !== "todas" ? filtroOperadora : undefined),
          dataInicio: inicio,
          dataFim: fim,
        });
        metricas = mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
      }

      const lives = await fetchAllPages<{ id: string; influencer_id: string; status: string; plataforma: string; data: string; operadora_slug: string }>(
        async (from, to) => {
          let qLives = supabase.from("lives").select("id, influencer_id, status, plataforma, data, operadora_slug").eq("status", "realizada")
            .order("data", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);
          if (!historico && mesSelecionado) {
            const { inicio: i0, fim: f0 } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
            qLives = qLives.gte("data", i0).lte("data", f0);
          }
          if (operadoraSlugsForcado?.length) qLives = qLives.in("operadora_slug", operadoraSlugsForcado);
          return qLives;
        }
      );

      const liveIds = lives.map((l) => l.id);
      const resultados = await fetchLiveResultadosBatched<{ live_id: string; duracao_horas: number; duracao_min: number; media_views: number }>(
        liveIds,
        async (slice) => await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min, media_views").in("live_id", slice)
      );

      const mapa = new Map<string, { acessos: number; registros: number; ftds: number; viewsTotal: number; liveComViews: number; horas: number }>();
      metricas.forEach((m: { influencer_id: string; visit_count: number; registration_count: number; ftd_count: number }) => {
        if (!mapa.has(m.influencer_id)) mapa.set(m.influencer_id, { acessos: 0, registros: 0, ftds: 0, viewsTotal: 0, liveComViews: 0, horas: 0 });
        const r = mapa.get(m.influencer_id)!;
        r.acessos += m.visit_count || 0;
        r.registros += m.registration_count || 0;
        r.ftds += m.ftd_count || 0;
      });
      lives.forEach((live: { influencer_id: string; id: string }) => {
        if (!mapa.has(live.influencer_id)) mapa.set(live.influencer_id, { acessos: 0, registros: 0, ftds: 0, viewsTotal: 0, liveComViews: 0, horas: 0 });
        const r = mapa.get(live.influencer_id)!;
        const res = resultados.find((x) => x.live_id === live.id);
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
          views: avgViews, acessos: data.acessos, registros: data.registros,
          ftds: data.ftds, horas: data.horas,
          pctViewAcesso: pct(data.acessos, avgViews),
          pctAcessoReg: pct(data.registros, data.acessos),
          pctRegFTD: pct(data.ftds, data.registros),
          pctViewFTD: pct(data.ftds, avgViews),
          ftdPorHora: data.horas > 0 ? data.ftds / data.horas : 0,
          acaoLabel: "",
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
  }, [historico, idxMes, mesSelecionado, podeVerInfluencer, operadoraSlugsForcado]);

  // ── DADOS FILTRADOS ───────────────────────────────────────────────────────────
  const rowsFiltradosEscopo = useMemo(() => {
    let r = rows;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (operadoraSlugsForcado?.length) {
      const ids = new Set<string>();
      operadoraSlugsForcado.forEach((slug) => (operadoraInfMap[slug] ?? []).forEach((id) => ids.add(id)));
      r = r.filter((row) => ids.has(row.influencer_id));
    } else if (filtroOperadora !== "todas") {
      const ids = operadoraInfMap[filtroOperadora] ?? [];
      r = r.filter((row) => ids.includes(row.influencer_id));
    }
    return r;
  }, [rows, filtroInfluencer, filtroOperadora, operadoraInfMap, operadoraSlugsForcado]);

  const rowA = rowsFiltradosEscopo.find((r) => r.influencer_id === compA) || null;
  const rowB = rowsFiltradosEscopo.find((r) => r.influencer_id === compB) || null;
  const rankingFtdHora = rowsFiltradosEscopo.filter((r) => r.ftdPorHora > 0).sort((a, b) => b.ftdPorHora - a.ftdPorHora);

  const acoesDisponiveis = [
    { label: "Divulgar o link",  icon: <GiShare size={11} aria-hidden />,        cor: BRAND.amarelo, bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
    { label: "Converter visita", icon: <GiGamepad size={11} aria-hidden />,      cor: "#a855f7",     bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.28)" },
    { label: "Ativar cadastro",  icon: <GiArcheryTarget size={11} aria-hidden />, cor: BRAND.azul,   bg: "rgba(30,54,248,0.10)",  border: "rgba(30,54,248,0.28)"  },
    { label: "Em dia",           icon: <GiCheckMark size={11} aria-hidden />,    cor: BRAND.verde,   bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.28)"  },
  ];
  const rowsFiltrados = acaoFiltro ? rowsFiltradosEscopo.filter((r) => r.acaoLabel === acaoFiltro) : rowsFiltradosEscopo;

  const brand = useDashboardBrand();

  // ── ESTILOS ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const thStyle = getThStyle(t);
  const tdStyle = getTdStyle(t);

  const btnNavStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };

  const selectStyle: React.CSSProperties = {
    background: t.inputBg ?? t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    color: t.text,
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    fontSize: 13,
    fontFamily: FONT.body,
    outline: "none",
    cursor: "pointer",
    appearance: "none",
  };

  const selectStyleSimple: React.CSSProperties = {
    ...selectStyle,
    padding: "7px 12px",
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

      {/* ══ BLOCO 1: FILTROS — primária transparente ═══════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

            <button type="button" aria-label="Mês anterior" style={{ ...btnNavStyle, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }}
              onClick={irMesAnterior} disabled={historico || isPrimeiro}>
              <ChevronLeft size={14} aria-hidden />
            </button>

            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>

            <button type="button" aria-label="Próximo mês" style={{ ...btnNavStyle, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }}
              onClick={irMesProximo} disabled={historico || isUltimo}>
              <ChevronRight size={14} aria-hidden />
            </button>

            <button type="button" aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"} aria-pressed={historico} onClick={toggleHistorico} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              fontFamily: FONT.body, fontSize: 13,
              border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
              background: historico ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : "rgba(124,58,237,0.15)") : "transparent",
              color: historico ? brand.accent : t.textMuted,
              fontWeight: historico ? 700 : 400, transition: "all 0.15s",
            }}>
              <GiCalendar size={14} aria-hidden /> Histórico
            </button>

            {showFiltroInfluencer && (
              <SelectComIcone
                icon={<GiStarMedal size={14} />}
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
                icon={<GiShield size={14} />}
                label="Filtrar por operadora"
                value={filtroOperadora}
                onChange={setFiltroOperadora}
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

      {/* ══ BLOCO 2: COMPARATIVO DE FUNIL ═══════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiConvergenceTarget size={14} />} sub={historico ? "acumulado" : undefined}>
          Comparativo de Funil
        </SectionTitle>

        {/* Selects com badge "vs" estilizado */}
        <div className="app-conversao-vs-row">
          <select aria-label="Influencer A no comparativo de funil" value={compA} onChange={(e) => setCompA(e.target.value)}
            style={{ ...selectStyleSimple, borderColor: compA ? COR_A.border : undefined, width: "100%" }}>
            <option value="">— Selecione —</option>
            {rowsFiltradosEscopo
              .filter((r) => r.influencer_id !== compB)
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((r) => (
                <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
              ))}
          </select>

          {/* Badge "vs" com peso visual */}
          <div style={{
            padding: "5px 12px", borderRadius: 999,
            border: `1px solid rgba(74,32,130,0.35)`,
            background: "rgba(74,32,130,0.10)",
            fontSize: 12, fontWeight: 800, color: t.textMuted,
            fontFamily: FONT.body, letterSpacing: "0.05em",
            textAlign: "center",
          }}>
            VS
          </div>

          <select aria-label="Influencer B no comparativo de funil" value={compB} onChange={(e) => setCompB(e.target.value)}
            style={{ ...selectStyleSimple, borderColor: compB ? COR_B.border : undefined, width: "100%" }}>
            <option value="">— Selecione —</option>
            {rowsFiltradosEscopo
              .filter((r) => r.influencer_id !== compA)
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((r) => (
                <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
              ))}
          </select>
        </div>

        {/* Cabeçalhos coloridos */}
        {(rowA || rowB) && (
          <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
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
          <div className="app-conversao-funil-duo">
            <PainelFunil row={rowA} isEmpty={!compA} cor={COR_A} />
            <div className="app-conversao-funil-divider" style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
            <PainelFunil row={rowB} isEmpty={!compB} cor={COR_B} />
          </div>
        )}
      </div>

      {/* ══ BLOCO 3: PÓDIO FTD/HORA ═════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiPodium size={14} />}>
          Ranking FTD/Hora — Eficiência por Influencer
        </SectionTitle>
        <p style={{ margin: "-8px 0 20px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
          FTDs gerados por hora de live — influencers sem horas registradas omitidos.
        </p>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13 }}>Carregando...</div>
        ) : (
          <PodioFTDHora ranking={rankingFtdHora} />
        )}
      </div>

      {/* ══ BLOCO 4: COMPARATIVO DE TAXAS ═══════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <SectionTitle icon={<GiSpeedometer size={14} />} sub={historico ? "acumulado" : undefined}>
            Comparativo de Taxas
          </SectionTitle>

          {/* Filtros de ação */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {acoesDisponiveis.map((a) => {
              const ativo = acaoFiltro === a.label;
              const qtd   = rowsFiltradosEscopo.filter((r) => r.acaoLabel === a.label).length;
              return (
                <button
                  type="button"
                  key={a.label}
                  aria-pressed={ativo}
                  aria-label={`Filtrar por ação ${a.label}${qtd > 0 ? `, ${qtd} influencers` : ""}`}
                  onClick={() => setAcaoFiltro(ativo ? null : a.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                    fontFamily: FONT.body, fontSize: 11,
                    border: `1px solid ${ativo ? a.cor : a.border}`,
                    background: ativo ? a.bg : "transparent",
                    color: ativo ? a.cor : t.textMuted,
                    fontWeight: ativo ? 700 : 400,
                    opacity: qtd === 0 ? 0.35 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {a.icon} {a.label} {qtd > 0 && <span style={{ opacity: 0.7 }}>({qtd})</span>}
                </button>
              );
            })}
            {acaoFiltro && (
              <button type="button" aria-label="Remover filtro de ação" onClick={() => setAcaoFiltro(null)} style={{
                padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, border: `1px solid ${t.cardBorder}`,
                background: "transparent", color: t.textMuted, fontSize: 11,
              }}>
                ✕ Limpar
              </button>
            )}
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
          <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted }}>{MSG_SEM_DADOS_FILTRO}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
              <caption style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                Comparativo de taxas de conversão — {historico ? "Todo o período" : (mesSelecionado?.label ?? "")}
              </caption>
              <thead>
                <tr>
                  {["Influencer","Views","View→Acesso","Acessos","Acesso→Reg","Registros","Reg→FTD","FTDs","Ação"].map((h) => (
                    <th key={h} scope="col" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFiltrados.map((r, i) => {
                  const ac  = getAcao(r);
                  const hl1 = r.pctViewAcesso !== null && r.pctViewAcesso < 10;
                  const hl2 = !hl1 && r.pctAcessoReg !== null && r.pctAcessoReg < 10;
                  const hl3 = !hl1 && !hl2 && r.pctRegFTD !== null && r.pctRegFTD < 60;
                  return (
                    <tr key={r.influencer_id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(74,32,130,0.06)" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{
                        ...tdStyle,
                        fontSize: 12,
                        fontWeight: hl1 ? 700 : 400,
                        color: hl1 ? BRAND.amarelo : t.textMuted,
                        borderLeft: hl1 ? `3px solid rgba(245,158,11,0.7)` : "none",
                        background: hl1 ? "rgba(245,158,11,0.08)" : undefined,
                        paddingLeft: hl1 ? 9 : 12,
                      }}>{fmtPct(r.pctViewAcesso)}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={{
                        ...tdStyle,
                        fontSize: 12,
                        fontWeight: hl2 ? 700 : 400,
                        color: hl2 ? "#a855f7" : t.textMuted,
                        borderLeft: hl2 ? `3px solid rgba(168,85,247,0.7)` : "none",
                        background: hl2 ? "rgba(168,85,247,0.08)" : undefined,
                        paddingLeft: hl2 ? 9 : 12,
                      }}>{fmtPct(r.pctAcessoReg)}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={{
                        ...tdStyle,
                        fontSize: 12,
                        fontWeight: hl3 ? 700 : 400,
                        color: hl3 ? BRAND.azul : t.textMuted,
                        borderLeft: hl3 ? `3px solid rgba(30,54,248,0.7)` : "none",
                        background: hl3 ? "rgba(30,54,248,0.08)" : undefined,
                        paddingLeft: hl3 ? 9 : 12,
                      }}>{fmtPct(r.pctRegFTD)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: r.ftds > 0 ? BRAND.verde : t.text }}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 10px", borderRadius: 999,
                          border: `1px solid ${ac.border}`,
                          background: ac.bg, color: ac.cor,
                          fontSize: 11, fontFamily: FONT.body, whiteSpace: "nowrap",
                        }}>
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
