import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  GiPokerHand,      // GGR Total — chip de cassino
  GiCoins,          // Investimento — moedas
  GiTrophy,         // ROI Geral + FTDs — troféu
  GiFilmProjector,  // Lives — transmissão
  GiSandsOfTime,    // Horas Realizadas — ampulheta
  GiMicrophone,     // Influencers Ativos — microfone
  GiCardPlay,       // Depósitos — carta/jogo
  GiPlayerNext,     // Registros — novo jogador
  GiReceiveMoney,   // Custo por Registro
  GiPayMoney,       // Custo por FTD
  GiCalendar,       // Histórico
  GiStarMedal,      // Filtro Influencer
  GiShield,         // Filtro Operadora
} from "react-icons/gi";
// Fonte NHD Bold para títulos
const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── BRAND COLORS (Brand Guide Spin Gaming) ───────────────────────────────────
const BRAND = {
  // Cores principais
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",    // variante mais viva para accent/glow
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  preto:    "#000000",
  // Semântica de status (mantida por ser sinalização financeira)
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
  // Categorias de KPI
  receita:     "#4a2082",   // Roxo  → GGR
  operacao:    "#1e36f8",   // Azul  → Lives, Horas, Influencers
  transacao:   "#70cae4",   // Ciano → Depósitos, FTDs, Registros
  custo:       "#e84025",   // Vermelho → Investimento, Custo/FTD, Custo/Reg
} as const;

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };

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
  viewsTotal: number;
  liveComViews: number;
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
    if (ggr > 0)  return { label: "Bônus",      cor: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.28)", roiStr: "—" };
    if (ggr < 0)  return { label: "Atenção",    cor: BRAND.amarelo, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", roiStr: "—" };
    return              { label: "Sem dados",   cor: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)", roiStr: "—" };
  }
  const r = roi ?? 0;
  const roiStr = `${r >= 0 ? "+" : ""}${r.toFixed(0)}%`;
  if (r >= 0)   return { label: "Rentável",    cor: BRAND.verde,   bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.28)",  roiStr };
  if (r >= -30) return { label: "Atenção",     cor: BRAND.amarelo, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)", roiStr };
  return              { label: "Não Rentável", cor: BRAND.vermelho, bg: "rgba(232,64,37,0.12)", border: "rgba(232,64,37,0.28)", roiStr };
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

// ─── COMPONENTE: SECTION TITLE ────────────────────────────────────────────────
function SectionTitle({ icon, children, sub }: {
  icon: React.ReactNode; children: React.ReactNode; sub?: React.ReactNode;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: `rgba(74,32,130,0.18)`,
        border: `1px solid rgba(74,32,130,0.30)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: BRAND.ciano, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800, color: t.text,
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

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accentColor, atual, anterior, isBRL, isHistorico, subValue }: {
  label: string; value: string; icon: React.ReactNode; accentColor: string;
  atual: number; anterior: number; isBRL?: boolean; isHistorico?: boolean;
  subValue?: { label: string; value: string };
}) {
  const { theme: t } = useApp();
  const diff     = atual - anterior;
  const pct      = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up       = diff >= 0;
  const isCusto  = label.toLowerCase().includes("custo") || label.toLowerCase().includes("invest");
  const positivo = isCusto ? !up : up;
  const corSeta  = positivo ? BRAND.verde : BRAND.vermelho;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${t.cardBorder}`,
      background: t.cardBg,
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor, flexShrink: 0,
          }}>
            {icon}
          </span>
          <span style={{
            color: t.textMuted, fontSize: 10, fontFamily: FONT.body,
            fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const,
          }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: subValue ? 4 : 6, lineHeight: 1.1 }}>
          {value}
        </div>
        {subValue && (
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
            <span style={{ color: t.text, fontWeight: 600 }}>{subValue.value}</span> {subValue.label}
          </div>
        )}
        {!isHistorico && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corSeta, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>
              {up ? "↑" : "↓"} {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}
            </span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>
              vs {isBRL ? fmtBRL(anterior) : anterior.toLocaleString("pt-BR")} mês ant.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI CARD DEPÓSITOS ────────────────────────────────────────────────────────
function KpiCardDepositos({ atual, anterior, isHistorico }: {
  atual: { qtd: number; valor: number };
  anterior: { qtd: number; valor: number };
  isHistorico?: boolean;
}) {
  const { theme: t } = useApp();
  const accentColor = BRAND.transacao;
  const diffQtd = atual.qtd - anterior.qtd;
  const pctQtd  = anterior.qtd !== 0 ? (diffQtd / Math.abs(anterior.qtd)) * 100 : null;
  const upQtd   = diffQtd >= 0;
  const diffVal = atual.valor - anterior.valor;
  const pctVal  = anterior.valor !== 0 ? (diffVal / Math.abs(anterior.valor)) * 100 : null;
  const upVal   = diffVal >= 0;

  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${t.cardBorder}`,
      background: t.cardBg, overflow: "hidden",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accentColor}18`, border: `1px solid ${accentColor}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor,
          }}>
            <GiCardPlay size={16} />
          </span>
          <span style={{ color: t.textMuted, fontSize: 10, fontFamily: FONT.body, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>
            Depósitos
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Qtd</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>{atual.qtd.toLocaleString("pt-BR")}</div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span style={{ color: upQtd ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>
                  {upQtd ? "↑" : "↓"} {pctQtd !== null ? `${Math.abs(pctQtd).toFixed(0)}%` : "—"}
                </span>
              </div>
            )}
          </div>
          <div style={{ borderLeft: `1px solid ${t.cardBorder}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Volume</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: 4 }}>{fmtBRL(atual.valor)}</div>
            {!isHistorico && (
              <div style={{ fontSize: 10, fontFamily: FONT.body }}>
                <span style={{ color: upVal ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>
                  {upVal ? "↑" : "↓"} {pctVal !== null ? `${Math.abs(pctVal).toFixed(0)}%` : "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FUNIL DE CONVERSÃO (visual em SVG) ───────────────────────────────────────
const FUNIL_COLORS = ["#4a2082", "#1e36f8", "#70cae4", "#22c55e"] as const;
const FUNIL_STEPS = [
  { key: "views",      label: "Views (média)" },
  { key: "acessos",    label: "Acessos"       },
  { key: "registros",  label: "Registros"     },
  { key: "ftds",       label: "FTDs"          },
] as const;

function FunilVisual({ values, taxas }: {
  values: number[];
  taxas: string[];
}) {
  const { theme: t } = useApp();
  const W = 420, H = 340;
  const levels = 4;
  const stepH = H / levels;
  // Larguras: nível 0 = W total, nível 3 = W * 0.32 (fixo pois estático)
  const widths = [1.0, 0.72, 0.52, 0.32].map((f) => f * W);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch", minHeight: 340 }}>
      {/* SVG Funil — ocupa metade do espaço */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxHeight: 340, display: "block" }} preserveAspectRatio="xMidYMid meet">
        {FUNIL_STEPS.map((step, i) => {
          const wTop = widths[i];
          const wBot = widths[i + 1] ?? widths[i] * 0.7;
          const xTop = (W - wTop) / 2;
          const xBot = (W - wBot) / 2;
          const yTop = i * stepH;
          const yBot = yTop + stepH - 2; // 2px gap
          const col = FUNIL_COLORS[i];
          // Trapezoid path
          const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
          return (
            <g key={step.key}>
              {/* Fill com gradiente */}
              <defs>
                <linearGradient id={`fgrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={col} stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path d={path} fill={`url(#fgrad-${i})`} />
              {/* Label dentro */}
              <text
                x={W / 2} y={yTop + stepH / 2 - 6}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={10} fontFamily={FONT.body}
                fontWeight={600} letterSpacing="0.08em"
                style={{ textTransform: "uppercase" }}
              >
                {step.label}
              </text>
              <text
                x={W / 2} y={yTop + stepH / 2 + 9}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={16} fontFamily={FONT.body} fontWeight={800}
              >
                {values[i]?.toLocaleString("pt-BR") ?? "—"}
              </text>
            </g>
          );
        })}
      </svg>
      </div>

      {/* Taxas de conversão — ocupa a outra metade, cards compactos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>
          Taxas de Conversão
        </div>
        {[
          { label: "View → Acesso",     taxa: taxas[0], color: FUNIL_COLORS[1] },
          { label: "Acesso → Registro", taxa: taxas[1], color: FUNIL_COLORS[2] },
          { label: "Registro → FTD",    taxa: taxas[2], color: FUNIL_COLORS[3] },
          { label: "Acesso → FTD",      taxa: taxas[3], color: FUNIL_COLORS[3], highlight: true },
          { label: "View → FTD",        taxa: taxas[4], color: FUNIL_COLORS[0], highlight: true },
        ].map((r) => (
          <div key={r.label} style={{
            padding: "6px 10px", borderRadius: 8,
            border: r.highlight
              ? `1px solid ${r.color}50`
              : `1px solid ${t.cardBorder}`,
            background: r.highlight
              ? `${r.color}12`
              : "rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>
              {r.label}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 800, fontFamily: FONT.body,
              color: r.highlight ? r.color : t.text,
            }}>
              {r.taxa}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { theme: t } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora, podeVerInfluencer, podeVerOperadora, escoposVisiveis } = useDashboardFiltros();
  const perm = usePermission("dash_overview");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes]       = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading]     = useState(true);

  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora]   = useState<string>("todas");
  const [operadorasList, setOperadorasList]     = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap]   = useState<Record<string, string[]>>({});
  const [statusFiltro, setStatusFiltro]         = useState<StatusLabel | null>(null);

  const [perfis, setPerfis]       = useState<InfluencerPerfil[]>([]);
  const [ranking, setRanking]     = useState<RankingRow[]>([]);
  const [rankingAnt, setRankingAnt] = useState<RankingRow[]>([]);
  const [totais, setTotais]       = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  // ── BUSCA DE DADOS (idêntica ao original) ────────────────────────────────────
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

      async function buscaMetricas(ini: string, fim: string, incluirAliases = false): Promise<Metrica[]> {
        let q = supabase.from("influencer_metricas")
          .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data")
          .gte("data", ini).lte("data", fim);
        if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
        const { data } = await q;
        const metricas = data || [];
        if (!incluirAliases) return metricas;
        const { buscarMetricasDeAliases, mesclarMetricasComAliases } = await import("../../../lib/metricasAliases");
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          dataInicio: ini,
          dataFim: fim,
        });
        return mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
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
          row.views = row.liveComViews > 0 ? Math.round(row.viewsTotal / row.liveComViews) : 0;
        });
        return Array.from(mapa.values()).sort((a, b) => {
          const ia = STATUS_ORDEM.indexOf(a.statusLabel);
          const ib = STATUS_ORDEM.indexOf(b.statusLabel);
          if (ia !== ib) return ia - ib;
          return (b.roi ?? b.ggr) - (a.roi ?? a.ggr);
        });
      }

      let metricas: Metrica[] = [], lives: LiveData[] = [], resultados: LiveResultado[] = [];
      if (historico) {
        let qM = supabase.from("influencer_metricas").select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_total, ggr, data");
        if (filtroOperadora !== "todas") qM = qM.eq("operadora_slug", filtroOperadora);
        const { data: mAll } = await qM;
        let mRaw = mAll || [];
        const fimHoje = fmt(new Date());
        const { buscarMetricasDeAliases, mesclarMetricasComAliases } = await import("../../../lib/metricasAliases");
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          dataInicio: "2020-01-01",
          dataFim: fimHoje,
        });
        metricas = mesclarMetricasComAliases(mRaw, aliasesSinteticas, fimHoje, podeVerInfluencer);
        const { data: lAll } = await supabase.from("lives").select("id, influencer_id, status, plataforma, data").eq("status", "realizada");
        lives = lAll || [];
        resultados = await buscaResultados(lives);
      } else {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        metricas   = await buscaMetricas(inicio, fim, false);
        lives      = await buscaLives(inicio, fim);
        resultados = await buscaResultados(lives);
      }

      const rows = montaRanking(metricas, lives, resultados);
      const rowsVisiveis = rows.filter((r) => podeVerInfluencer(r.influencer_id));
      setRanking(rowsVisiveis);
      setTotais(calculaTotais(rowsVisiveis));

      if (!historico && mesSelecionado) {
        const { inicio: iA, fim: fA } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
        const mA = await buscaMetricas(iA, fA, false);
        const lA = await buscaLives(iA, fA);
        const rA = await buscaResultados(lA);
        const rowsAnt = montaRanking(mA, lA, rA).filter((r) => podeVerInfluencer(r.influencer_id));
        setRankingAnt(rowsAnt);
        setTotaisAnt(calculaTotais(rowsAnt));
      } else {
        setRankingAnt([]);
        setTotaisAnt({ ggr: 0, investimento: 0, roi: 0, ftds: 0, registros: 0, acessos: 0, views: 0, custoPorFTD: 0, custoPorRegistro: 0, lives: 0, horas: 0, influencers: 0, depositos_qtd: 0, depositos_valor: 0 });
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, mesSelecionado, podeVerInfluencer, filtroOperadora]);

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

  // Mesmo filtro aplicado ao período anterior (para comparativo MTD)
  const rankingAntFiltrado = useMemo(() => {
    let r = rankingAnt;
    if (filtroInfluencer !== "todos") r = r.filter((row) => row.influencer_id === filtroInfluencer);
    if (filtroOperadora !== "todas") {
      const ids = operadoraInfMap[filtroOperadora] ?? [];
      r = r.filter((row) => ids.includes(row.influencer_id));
    }
    if (statusFiltro) r = r.filter((row) => row.statusLabel === statusFiltro);
    return r;
  }, [rankingAnt, filtroInfluencer, filtroOperadora, statusFiltro, operadoraInfMap]);

  // Totais exibidos nos KPIs e Funil (respeitam filtros de influencer/operadora/status)
  const totaisExibidos = useMemo(() => calculaTotais(rankingFiltrado), [rankingFiltrado]);
  const totaisAntExibidos = useMemo(() => calculaTotais(rankingAntFiltrado), [rankingAntFiltrado]);

  // ── TAXAS DO FUNIL ────────────────────────────────────────────────────────────
  const pctViewAcesso  = totaisExibidos.views > 0    ? ((totaisExibidos.acessos   / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg   = totaisExibidos.acessos > 0  ? ((totaisExibidos.registros / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctRegFTD      = totaisExibidos.registros > 0? ((totaisExibidos.ftds      / totaisExibidos.registros)* 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD   = totaisExibidos.acessos > 0  ? ((totaisExibidos.ftds      / totaisExibidos.acessos)  * 100).toFixed(1) + "%" : "—";
  const pctViewFTD     = totaisExibidos.views > 0    ? ((totaisExibidos.ftds      / totaisExibidos.views)    * 100).toFixed(1) + "%" : "—";

  // ── ESTILOS BASE ──────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: t.cardBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: t.textMuted,
    fontWeight: 600,
    padding: "10px 12px",
    borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.10)",
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    color: t.text,
    fontFamily: FONT.body,
    whiteSpace: "nowrap",
  };

  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  // ── STATUS BADGES ─────────────────────────────────────────────────────────────
  const statusBadges = [
    { label: "Rentável"    as StatusLabel, cor: BRAND.verde,    bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.28)"    },
    { label: "Atenção"     as StatusLabel, cor: BRAND.amarelo,  bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.28)"   },
    { label: "Não Rentável"as StatusLabel, cor: BRAND.vermelho, bg: "rgba(232,64,37,0.10)",   border: "rgba(232,64,37,0.28)"    },
    { label: "Bônus"       as StatusLabel, cor: "#a855f7",      bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.28)"   },
    { label: "Sem dados"   as StatusLabel, cor: "#6b7280",      bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.22)"  },
  ];

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  // ── ESTILOS FILTROS ───────────────────────────────────────────────────────────
  const selectStyle: React.CSSProperties = {
    padding: "6px 12px 6px 32px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontSize: 13,
    fontFamily: FONT.body,
    cursor: "pointer",
    appearance: "none" as const,
    outline: "none",
  };

  const btnNavStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ padding: "20px 24px 48px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ══ BLOCO 1: FILTROS ══════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          background: t.cardBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Navegação de mês */}
            <button
              style={{ ...btnNavStyle, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }}
              onClick={irMesAnterior} disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{
              fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body,
              minWidth: 180, textAlign: "center",
            }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>

            <button
              style={{ ...btnNavStyle, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }}
              onClick={irMesProximo} disabled={historico || isUltimo}
            >
              <ChevronRight size={14} />
            </button>

            {/* Botão Histórico */}
            <button
              onClick={toggleHistorico}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico ? `1px solid ${BRAND.roxoVivo}` : `1px solid ${t.cardBorder}`,
                background: historico ? `rgba(124,58,237,0.15)` : "transparent",
                color: historico ? BRAND.roxoVivo : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} />
              Histórico
            </button>

            {/* Filtro Influencer */}
            {showFiltroInfluencer && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiStarMedal size={15} />
                </span>
                <select value={filtroInfluencer} onChange={(e) => setFiltroInfluencer(e.target.value)} style={selectStyle}>
                  <option value="todos">Todos os influencers</option>
                  {ranking.map((r) => (
                    <option key={r.influencer_id} value={r.influencer_id}>{r.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Operadora */}
            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 10, display: "flex", alignItems: "center", pointerEvents: "none", color: t.textMuted }}>
                  <GiShield size={15} />
                </span>
                <select value={filtroOperadora} onChange={(e) => setFiltroOperadora(e.target.value)} style={selectStyle}>
                  <option value="todas">Todas as operadoras</option>
                  {operadorasList
                    .filter((o) => podeVerOperadora(o.slug))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>{o.nome}</option>
                    ))}
                </select>
              </div>
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══ BLOCO 2: KPIs EXECUTIVOS ══════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiPokerHand size={15} />} sub={!historico ? "· comparativo MTD vs mesmo período do mês anterior" : undefined}>
          KPIs Executivos
        </SectionTitle>

        {/* Linha 1: Receita — GGR / Investimento / ROI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard
            label="GGR Total" value={fmtBRL(totaisExibidos.ggr)}
            icon={<GiPokerHand size={16} />}
            accentColor={BRAND.receita}
            atual={totaisExibidos.ggr} anterior={totaisAntExibidos.ggr} isBRL isHistorico={historico}
          />
          <KpiCard
            label="Investimento" value={fmtBRL(totaisExibidos.investimento)}
            icon={<GiCoins size={16} />}
            accentColor={BRAND.custo}
            atual={totaisExibidos.investimento} anterior={totaisAntExibidos.investimento} isBRL isHistorico={historico}
          />
          <KpiCard
            label="ROI Geral"
            value={totaisExibidos.investimento > 0 ? `${totaisExibidos.roi >= 0 ? "+" : ""}${totaisExibidos.roi.toFixed(1)}%` : "—"}
            icon={<GiTrophy size={16} />}
            accentColor={BRAND.verde}
            atual={totaisExibidos.roi} anterior={totaisAntExibidos.roi} isHistorico={historico}
          />
        </div>

        {/* Linha 2: Operação — Lives / Horas / Influencers + Depósitos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard
            label="Lives" value={totaisExibidos.lives.toLocaleString("pt-BR")}
            icon={<GiFilmProjector size={16} />}
            accentColor={BRAND.operacao}
            atual={totaisExibidos.lives} anterior={totaisAntExibidos.lives} isHistorico={historico}
          />
          <KpiCard
            label="Horas Realizadas" value={fmtHorasTotal(totaisExibidos.horas)}
            icon={<GiSandsOfTime size={16} />}
            accentColor={BRAND.operacao}
            atual={totaisExibidos.horas} anterior={totaisAntExibidos.horas} isHistorico={historico}
          />
          <KpiCard
            label="Influencers Ativos" value={totaisExibidos.influencers.toLocaleString("pt-BR")}
            icon={<GiMicrophone size={16} />}
            accentColor={BRAND.operacao}
            atual={totaisExibidos.influencers} anterior={totaisAntExibidos.influencers} isHistorico={historico}
          />
          <KpiCardDepositos
            atual={{ qtd: totaisExibidos.depositos_qtd, valor: totaisExibidos.depositos_valor }}
            anterior={{ qtd: totaisAntExibidos.depositos_qtd, valor: totaisAntExibidos.depositos_valor }}
            isHistorico={historico}
          />
        </div>

        {/* Linha 3: Transação — Registros / Custo Reg / FTDs / Custo FTD */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard
            label="Registros" value={totaisExibidos.registros.toLocaleString("pt-BR")}
            icon={<GiPlayerNext size={16} />}
            accentColor={BRAND.transacao}
            atual={totaisExibidos.registros} anterior={totaisAntExibidos.registros} isHistorico={historico}
          />
          <KpiCard
            label="Custo por Registro"
            value={totaisExibidos.registros > 0 ? fmtBRL(totaisExibidos.custoPorRegistro) : "—"}
            icon={<GiReceiveMoney size={16} />}
            accentColor={BRAND.custo}
            atual={totaisExibidos.custoPorRegistro} anterior={totaisAntExibidos.custoPorRegistro} isBRL isHistorico={historico}
          />
          <KpiCard
            label="FTDs" value={totaisExibidos.ftds.toLocaleString("pt-BR")}
            icon={<GiTrophy size={16} />}
            accentColor={BRAND.transacao}
            atual={totaisExibidos.ftds} anterior={totaisAntExibidos.ftds} isHistorico={historico}
          />
          <KpiCard
            label="Custo por FTD"
            value={totaisExibidos.ftds > 0 ? fmtBRL(totaisExibidos.custoPorFTD) : "—"}
            icon={<GiPayMoney size={16} />}
            accentColor={BRAND.custo}
            atual={totaisExibidos.custoPorFTD} anterior={totaisAntExibidos.custoPorFTD} isBRL isHistorico={historico}
          />
        </div>
      </div>

      {/* ══ BLOCO 3: Funil de Conversão ════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionTitle icon={<GiPlayerNext size={15} />}>Funil de Conversão</SectionTitle>
        <FunilVisual
          values={[totaisExibidos.views, totaisExibidos.acessos, totaisExibidos.registros, totaisExibidos.ftds]}
          taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]}
        />
      </div>

      {/* ══ BLOCO 4: RANKING ═════════════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <SectionTitle icon={<GiTrophy size={15} />}>Ranking de Influencers</SectionTitle>

          {/* Filtros de status */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {statusBadges.map((s) => {
              const ativo = statusFiltro === s.label;
              const qtd = ranking.filter((r) => r.statusLabel === s.label).length;
              return (
                <button
                  key={s.label}
                  onClick={() => setStatusFiltro(ativo ? null : s.label)}
                  style={{
                    padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                    fontFamily: FONT.body,
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
                <tr>
                  {["Influencer","Lives","Horas","Views","Acessos","Registros","FTDs","GGR","Invest.","ROI","Status"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankingFiltrado.map((r, i) => {
                  const st = getStatusROI(r.roi, r.ggr, r.investimento);
                  const hT = Math.floor(r.horas);
                  const mT = Math.round((r.horas - hT) * 60);
                  return (
                    <tr
                      key={r.influencer_id}
                      style={{ background: i % 2 === 0 ? "transparent" : "rgba(74,32,130,0.06)" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome}</td>
                      <td style={tdStyle}>{r.lives}</td>
                      <td style={tdStyle}>{r.horas > 0 ? `${String(hT).padStart(2,"0")}:${String(mT).padStart(2,"0")}` : "—"}</td>
                      <td style={tdStyle}>{r.views > 0 ? r.views.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdStyle}>{r.acessos.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.registros.toLocaleString("pt-BR")}</td>
                      <td style={tdStyle}>{r.ftds.toLocaleString("pt-BR")}</td>
                      <td style={{ ...tdStyle, color: r.ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(r.ggr)}</td>
                      <td style={tdStyle}>{r.investimento > 0 ? fmtBRL(r.investimento) : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${st.border}`, background: st.bg, color: st.cor, fontSize: 11, fontFamily: FONT.body, fontWeight: 700 }}>
                          {st.roiStr}
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
