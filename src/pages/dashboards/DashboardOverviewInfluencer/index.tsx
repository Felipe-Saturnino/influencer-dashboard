import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { buscarInvestimentoPago } from "../../../lib/investimentoPago";
import { buscarMetricasDeAliases, mesclarMetricasComAliases } from "../../../lib/metricasAliases";
import { ChevronLeft, ChevronRight, Clock, TrendingUp, TrendingDown } from "lucide-react";
import {
  GiPodiumWinner, GiFunnel, GiSpeedometer, GiCalendar,
  GiMoneyStack, GiTakeMyMoney, GiStarMedal, GiClapperboard,
  GiSandsOfTime, GiEyeball, GiPerson, GiTrophy,
  GiCash, GiShield, GiCardPlay,
} from "react-icons/gi";

const GiStarMedalFilter = GiStarMedal;

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

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2025, mes: 11 };
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fmtBRL(v: number) { return (v < 0 ? "-" : "") + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtHoras(horas: number) {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtDia(iso: string) {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

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
  let anoAnt = ano, mesAnt = mes - 1;
  if (mesAnt < 0) { mesAnt = 11; anoAnt--; }
  const hoje = new Date();
  const ultimoDia = new Date(anoAnt, mesAnt + 1, 0).getDate();
  const dia = Math.min(hoje.getDate(), ultimoDia);
  return { inicio: fmt(new Date(anoAnt, mesAnt, 1)), fim: fmt(new Date(anoAnt, mesAnt, dia)) };
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface Metrica {
  influencer_id: string;
  registration_count: number;
  ftd_count: number;
  ftd_total: number;
  visit_count: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count?: number;
  withdrawal_total: number;
  ggr: number;
  data: string;
}

interface LiveData {
  id: string;
  influencer_id: string;
  data: string;
  plataforma: string;
}

interface LiveResultado {
  live_id: string;
  duracao_horas: number;
  duracao_min: number;
  media_views: number;
  max_views?: number;
}

interface InfluencerPerfil {
  id: string;
  nome_artistico: string;
  cache_hora: number;
}

interface TotaisData {
  ggr: number; investimento: number; roi: number;
  ftds: number; ftd_total: number; registros: number; acessos: number; views: number;
  depositos_qtd: number; depositos_valor: number;
  saques_qtd: number; saques_valor: number;
  lives: number; horas: number;
}

interface DiaData {
  data: string; duracao: number; media_views: number; max_views: number;
  acessos: number; registros: number; ftd_count: number; ftd_total: number;
  deposit_count: number; deposit_total: number; withdrawal_count: number;
  withdrawal_total: number; ggr: number;
}

// ─── SELECT COM ÍCONE INTERNO ─────────────────────────────────────────────────
// Replica exatamente o padrão do botão "Histórico": ícone à esquerda + texto
function SelectComIcone({
  icon, value, onChange, children, t,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  t: any;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span style={{
        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
        pointerEvents: "none", display: "flex", alignItems: "center",
        color: t.textMuted, zIndex: 1,
      }}>
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 28px 6px 30px",
          borderRadius: 999,
          border: `1px solid ${t.cardBorder}`,
          background: t.inputBg ?? t.cardBg,
          color: t.text,
          fontSize: 13,
          fontFamily: FONT.body,
          cursor: "pointer",
          outline: "none",
          appearance: "none" as const,
        }}
      >
        {children}
      </select>
      <span style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        pointerEvents: "none", color: t.textMuted, fontSize: 10, lineHeight: 1,
      }}>▾</span>
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accentVar, accentColor, useBrand, cardBg, atual, anterior, isBRL, isHistorico, subValue }: {
  label: string; value: string; icon: React.ReactNode; accentVar?: string; accentColor: string;
  useBrand?: boolean; cardBg?: string;
  atual: number; anterior: number; isBRL?: boolean; isHistorico?: boolean;
  subValue?: { label: string; value: string };
}) {
  const { theme: t } = useApp();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const isCusto = label.toLowerCase().includes("custo");
  const positivo = isCusto ? !up : up;
  const corSeta = positivo ? BRAND.verde : BRAND.vermelho;

  const barBg = useBrand && accentVar ? `linear-gradient(90deg, var(${accentVar}), transparent)` : `linear-gradient(90deg, ${accentColor}, transparent)`;
  const iconBoxBg = useBrand && accentVar ? `color-mix(in srgb, var(${accentVar}) 10%, transparent)` : `${accentColor}20`;
  const iconBoxBorder = useBrand && accentVar ? `1px solid color-mix(in srgb, var(${accentVar}) 22%, transparent)` : `1px solid ${accentColor}40`;
  const iconBoxColor = useBrand && accentVar ? `var(${accentVar})` : accentColor;

  return (
    <div style={{ borderRadius: 16, border: `1px solid ${t.cardBorder}`, background: cardBg ?? t.cardBg, overflow: "hidden" }}>
      <div style={{ height: 3, background: barBg }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: iconBoxBg, border: iconBoxBorder, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iconBoxColor }}>
            {icon}
          </span>
          <span style={{ color: t.textMuted, fontSize: 11, fontFamily: FONT.body, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: subValue ? 4 : 6 }}>{value}</div>
        {subValue && subValue.value !== "—" && (
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, marginBottom: 6 }}>
            <span style={{ color: t.text, fontWeight: 600 }}>{subValue.value}</span> {subValue.label}
          </div>
        )}
        {!isHistorico && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corSeta, fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—"}
            </span>
            <span style={{ color: t.textMuted }}>vs {isBRL ? fmtBRL(anterior) : anterior.toLocaleString("pt-BR")} mês ant.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FUNIL DE CONVERSÃO (formato Overview — SVG centralizado + Taxas) ──────────
const FUNIL_COLORS = ["#4a2082", "#1e36f8", "#70cae4", "#22c55e"] as const;
const FUNIL_VARS = ["--brand-extra1", "--brand-extra2", "--brand-extra3", "--brand-extra4"] as const;
const FUNIL_STEPS = [
  { key: "views",      label: "Views (média)" },
  { key: "acessos",    label: "Acessos"       },
  { key: "registros",  label: "Registros"     },
  { key: "ftds",       label: "FTDs"          },
] as const;

function FunilVisual({ values, taxas, useBrand, logoUrl }: {
  values: number[];
  taxas: string[];
  useBrand?: boolean;
  logoUrl?: string;
}) {
  const { theme: t } = useApp();
  const W = 420, H = 340;
  const levels = 4;
  const stepH = H / levels;
  const widths = [1.0, 0.72, 0.52, 0.32].map((f) => f * W);
  const getStepColor = (i: number) => useBrand ? `var(${FUNIL_VARS[i]})` : FUNIL_COLORS[i];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "stretch", minHeight: 340 }}>
      {/* SVG Funil — centralizado na coluna esquerda */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxHeight: 340, display: "block" }} preserveAspectRatio="xMidYMid meet">
        {FUNIL_STEPS.map((step, i) => {
          const wTop = widths[i];
          const wBot = widths[i + 1] ?? widths[i] * 0.7;
          const xTop = (W - wTop) / 2;
          const xBot = (W - wBot) / 2;
          const yTop = i * stepH;
          const yBot = yTop + stepH - 2;
          const col = getStepColor(i);
          const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
          return (
            <g key={step.key}>
              <defs>
                <linearGradient id={`fgrad-inf-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={col} stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path d={path} fill={`url(#fgrad-inf-${i})`} />
              <text x={W / 2} y={yTop + stepH / 2 - 6} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={10} fontFamily={FONT.body} fontWeight={600} letterSpacing="0.08em" style={{ textTransform: "uppercase" }}>{step.label}</text>
              <text x={W / 2} y={yTop + stepH / 2 + 9} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={16} fontFamily={FONT.body} fontWeight={800}>{values[i]?.toLocaleString("pt-BR") ?? "—"}</text>
            </g>
          );
        })}
        {logoUrl && <image href={logoUrl} x={W / 2 - 24} y={H - 56} width={48} height={48} preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.18 }} />}
      </svg>
      </div>

      {/* Taxas de conversão */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600 }}>Taxas de Conversão</div>
        {[
          { label: "View → Acesso",     taxa: taxas[0], color: FUNIL_COLORS[1], colorVar: FUNIL_VARS[1] },
          { label: "Acesso → Registro", taxa: taxas[1], color: FUNIL_COLORS[2], colorVar: FUNIL_VARS[2] },
          { label: "Registro → FTD",    taxa: taxas[2], color: FUNIL_COLORS[3], colorVar: FUNIL_VARS[3] },
          { label: "Acesso → FTD",      taxa: taxas[3], color: FUNIL_COLORS[3], colorVar: FUNIL_VARS[3], highlight: true },
          { label: "View → FTD",        taxa: taxas[4], color: FUNIL_COLORS[0], colorVar: FUNIL_VARS[0], highlight: true },
        ].map((r) => {
          const highlightColor = useBrand ? "var(--brand-primary)" : r.color;
          const border = r.highlight ? `1px solid color-mix(in srgb, ${highlightColor} 32%, transparent)` : `1px solid ${t.cardBorder}`;
          const bg = r.highlight ? `color-mix(in srgb, ${highlightColor} 8%, transparent)` : "rgba(255,255,255,0.02)";
          return (
            <div key={r.label} style={{ padding: "6px 10px", borderRadius: 8, border, background: bg }}>
              <div style={{ fontSize: 9, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.body, color: r.highlight ? highlightColor : t.text }}>{r.taxa}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RATE CARD ────────────────────────────────────────────────────────────────
function RateCard({ label, value, highlight, useBrand }: {
  label: string; value: string; highlight?: boolean | "purple"; useBrand?: boolean;
}) {
  const { theme: t } = useApp();
  const highlightColor = highlight
    ? (useBrand ? "var(--brand-primary)" : highlight === "purple" ? BRAND.roxoVivo : BRAND.azul)
    : null;

  return (
    <div style={{ padding: "10px 14px", borderRadius: 10, border: highlightColor ? `1px solid ${highlightColor}44` : `1px solid ${t.cardBorder}`, background: highlightColor ? `${highlightColor}12` : "transparent" }}>
      <div style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: highlightColor ?? t.text, margin: "5px 0 0", fontFamily: FONT.body }}>{value}</div>
    </div>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle, useBrand }: { icon: React.ReactNode; title: string; subtitle?: string; useBrand?: boolean }) {
  const { theme: t, operadoraBrand } = useApp();
  const titleColor = useBrand ? "var(--brand-primary)" : t.text;
  const iconBg = useBrand ? "color-mix(in srgb, var(--brand-primary) 18%, transparent)" : "rgba(74,32,130,0.18)";
  const iconBorder = useBrand ? "1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)" : "1px solid rgba(74,32,130,0.30)";
  const iconColor = useBrand ? "var(--brand-primary)" : BRAND.ciano;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" as const }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, border: iconBorder, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" as const }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: titleColor, fontFamily: FONT_TITLE, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 11, fontWeight: 400, color: t.textMuted, fontFamily: FONT.body }}>· {subtitle}</span>}
      </div>
      {useBrand && operadoraBrand && (operadoraBrand.logo_url || operadoraBrand.nome) && (
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "3px 10px 3px 6px", borderRadius: 999,
          border: "1px solid color-mix(in srgb, var(--brand-primary) 28%, transparent)",
          background: "color-mix(in srgb, var(--brand-primary) 8%, transparent)",
        }}>
          {operadoraBrand.logo_url && (
            <img src={operadoraBrand.logo_url} alt={operadoraBrand.nome ?? ""} style={{ width: 16, height: 16, objectFit: "contain", borderRadius: 3, flexShrink: 0 }} />
          )}
          {operadoraBrand.nome && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand-primary)", fontFamily: FONT.body, letterSpacing: "0.06em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>
              {operadoraBrand.nome}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BRAND CARD (faixa colorida no topo quando operadora) ─────────────────────
function BrandCard({
  children, useBrand, style, defaultPadding = true,
}: { children: React.ReactNode; useBrand?: boolean; style?: React.CSSProperties; defaultPadding?: boolean }) {
  const { theme: t, operadoraBrand } = useApp();
  const blockBg_local = useBrand && operadoraBrand?.cor_background ? operadoraBrand.cor_background : t.cardBg;
  return (
    <div style={{
      background: blockBg_local, border: `1px solid ${t.cardBorder}`, borderRadius: 18,
      overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", ...style,
    }}>
      {useBrand && (
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--brand-primary), var(--brand-secondary, var(--brand-primary)))" }} />
      )}
      {defaultPadding ? <div style={{ padding: 20 }}>{children}</div> : children}
    </div>
  );
}

// ─── BRAND DIVIDER ───────────────────────────────────────────────────────────
function BrandDivider({ useBrand }: { useBrand?: boolean }) {
  if (!useBrand) return null;
  return (
    <div style={{
      height: 1, marginBottom: 14,
      background: "linear-gradient(90deg, var(--brand-primary) 0%, transparent 100%)",
      opacity: 0.25, borderRadius: 1,
    }} />
  );
}

function cel(v: number, isBRL = false) {
  if (v === 0 || (typeof v === "number" && isNaN(v))) return "—";
  return isBRL ? fmtBRL(v) : v.toLocaleString("pt-BR");
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DashboardOverviewInfluencer() {
  const { theme: t, user, operadoraBrand, podeVerInfluencer, podeVerOperadora, escoposVisiveis } = useApp();
  const { showFiltroInfluencer, showFiltroOperadora } = useDashboardFiltros();
  const perm = usePermission("dash_overview_influencer");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtroInfluencer, setFiltroInfluencer] = useState<string>("todos");
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [operadorasList, setOperadorasList] = useState<{ slug: string; nome: string }[]>([]);
  const [operadoraInfMap, setOperadoraInfMap] = useState<Record<string, string[]>>({});

  const [totais, setTotais] = useState<TotaisData>({ ggr: 0, investimento: 0, roi: 0, ftds: 0, ftd_total: 0, registros: 0, acessos: 0, views: 0, depositos_qtd: 0, depositos_valor: 0, saques_qtd: 0, saques_valor: 0, lives: 0, horas: 0 });
  const [totaisAnt, setTotaisAnt] = useState<TotaisData>(totais);
  const [diasData, setDiasData] = useState<DiaData[]>([]);
  const [perfis, setPerfis] = useState<InfluencerPerfil[]>([]);
  const [influencersComDadosIds, setInfluencersComDadosIds] = useState<string[]>([]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo() { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  const influencersVisiveis = useMemo(() => escoposVisiveis.influencersVisiveis.length === 0 ? [] : escoposVisiveis.influencersVisiveis, [escoposVisiveis.influencersVisiveis]);

  useEffect(() => {
    if (filtroInfluencer !== "todos" && influencersComDadosIds.length > 0 && !influencersComDadosIds.includes(filtroInfluencer)) {
      setFiltroInfluencer("todos");
    }
  }, [filtroInfluencer, influencersComDadosIds]);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [{ data: perfisData }, { data: opsData }, { data: infOpsData }] = await Promise.all([
        supabase.from("influencer_perfil").select("id, nome_artistico, cache_hora").order("nome_artistico"),
        supabase.from("operadoras").select("slug, nome").order("nome"),
        supabase.from("influencer_operadoras").select("influencer_id, operadora_slug"),
      ]);
      setPerfis(perfisData || []);
      const opsFiltradas = (opsData || []).filter(
        (o: { slug: string }) => podeVerOperadora(o.slug)
      );
      setOperadorasList(opsFiltradas);
      const map: Record<string, string[]> = {};
      (infOpsData || []).forEach((o: { influencer_id: string; operadora_slug: string }) => {
        if (!map[o.operadora_slug]) map[o.operadora_slug] = [];
        map[o.operadora_slug].push(o.influencer_id);
      });
      setOperadoraInfMap(map);

      const { inicio, fim } = historico
        ? { inicio: "2020-01-01", fim: fmt(new Date()) }
        : getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);

      const infIdsFiltro = influencersVisiveis.length === 0 ? [] : influencersVisiveis;
      const infIds = filtroInfluencer !== "todos"
        ? [filtroInfluencer]
        : filtroOperadora !== "todas"
          ? (map[filtroOperadora] || []).filter((id) => infIdsFiltro.length === 0 || infIdsFiltro.includes(id))
          : infIdsFiltro;

      const infIdsQuery = infIds.length > 0 ? infIds : (perfisData || []).map((p: InfluencerPerfil) => p.id);

      async function buscaMetricas(ini: string, fim: string): Promise<Metrica[]> {
        let q = supabase.from("influencer_metricas")
          .select("influencer_id, registration_count, ftd_count, ftd_total, visit_count, deposit_count, deposit_total, withdrawal_count, withdrawal_total, ggr, data")
          .gte("data", ini).lte("data", fim);
        if (infIdsQuery.length > 0) q = q.in("influencer_id", infIdsQuery);
        if (filtroOperadora !== "todas") q = q.eq("operadora_slug", filtroOperadora);
        const { data } = await q;
        return data || [];
      }

      async function buscaLives(ini: string, fim: string): Promise<LiveData[]> {
        let q = supabase.from("lives")
          .select("id, influencer_id, data, plataforma")
          .eq("status", "realizada").gte("data", ini).lte("data", fim);
        if (infIdsQuery.length > 0) q = q.in("influencer_id", infIdsQuery);
        const { data } = await q;
        return data || [];
      }

      async function buscaResultados(lives: LiveData[]) {
        const ids = lives.map((l) => l.id);
        if (!ids.length) return [] as LiveResultado[];
        const { data } = await supabase.from("live_resultados").select("live_id, duracao_horas, duracao_min, media_views, max_views").in("live_id", ids);
        return data || [];
      }

      let metricas = await buscaMetricas(inicio, fim);
      if (historico) {
        const aliasesSinteticas = await buscarMetricasDeAliases({
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
          dataInicio: inicio,
          dataFim: fim,
        });
        metricas = mesclarMetricasComAliases(metricas, aliasesSinteticas, fim, podeVerInfluencer);
      }

      const lives = await buscaLives(inicio, fim);
      const resultados = await buscaResultados(lives);

      const rows = metricas.filter((m) => podeVerInfluencer(m.influencer_id));
      const liveRows = lives.filter((l) => podeVerInfluencer(l.influencer_id));

      // Investimento apenas de pagamentos com status PAGO (valores revisados no Financeiro)
      const { total: investTotal } = await buscarInvestimentoPago(
        { inicio, fim },
        {
          influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
          operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
          includeAgentes: false,
        }
      );

      // Incluir influencers com métricas, lives OU aliases mapeados (caso só tenham tráfego via Gestão de Links)
      let idsComDados = [...new Set([...rows.map((m) => m.influencer_id), ...liveRows.map((l) => l.influencer_id)])];
      const { data: aliasesMapeados } = await supabase
        .from("utm_aliases")
        .select("influencer_id")
        .eq("status", "mapeado")
        .not("influencer_id", "is", null);
      const idsAliases = [...new Set((aliasesMapeados ?? []).map((a: { influencer_id: string }) => a.influencer_id).filter((id) => podeVerInfluencer(id)))];
      idsComDados = [...new Set([...idsComDados, ...idsAliases])];
      setInfluencersComDadosIds(idsComDados);

      function calcTotais(m: Metrica[], l: LiveData[], r: LiveResultado[], investimentoPago: number): TotaisData {
        const ggr = m.reduce((s, x) => s + (x.ggr || 0), 0);
        const ftds = m.reduce((s, x) => s + (x.ftd_count || 0), 0);
        const ftd_total = m.reduce((s, x) => s + (x.ftd_total || 0), 0);
        const registros = m.reduce((s, x) => s + (x.registration_count || 0), 0);
        const acessos = m.reduce((s, x) => s + (x.visit_count || 0), 0);
        const depositos_qtd = m.reduce((s, x) => s + (x.deposit_count || 0), 0);
        const depositos_valor = m.reduce((s, x) => s + (x.deposit_total || 0), 0);
        const saques_qtd = m.reduce((s, x) => s + (x.withdrawal_count || 0), 0);
        const saques_valor = m.reduce((s, x) => s + (x.withdrawal_total || 0), 0);

        let horas = 0;
        const viewsPorLive: number[] = [];
        l.forEach((live) => {
          const res = r.find((x) => x.live_id === live.id);
          if (res) {
            horas += (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
            if (res.media_views) viewsPorLive.push(res.media_views);
          }
        });
        const views = viewsPorLive.length > 0 ? Math.round(viewsPorLive.reduce((a, b) => a + b, 0) / viewsPorLive.length) : 0;

        return {
          ggr, investimento: investimentoPago, roi: investimentoPago > 0 ? ((ggr - investimentoPago) / investimentoPago) * 100 : 0,
          ftds, ftd_total, registros, acessos, views,
          depositos_qtd, depositos_valor, saques_qtd, saques_valor,
          lives: l.length, horas,
        };
      }

      setTotais(calcTotais(rows, liveRows, resultados, investTotal));

      if (!historico && mesSelecionado) {
        const { inicio: iA, fim: fA } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
        const [investAnt, mA, lA] = await Promise.all([
          buscarInvestimentoPago(
            { inicio: iA, fim: fA },
            {
              influencerIds: infIdsQuery.length > 0 ? infIdsQuery : undefined,
              operadora_slug: filtroOperadora !== "todas" ? filtroOperadora : undefined,
              includeAgentes: false,
            }
          ),
          buscaMetricas(iA, fA),
          buscaLives(iA, fA),
        ]);
        const rA = await buscaResultados(lA);
        const rowsA = mA.filter((m) => podeVerInfluencer(m.influencer_id));
        const liveA = lA.filter((l) => podeVerInfluencer(l.influencer_id));
        setTotaisAnt(calcTotais(rowsA, liveA, rA, investAnt.total));
      } else {
        setTotaisAnt({ ggr: 0, investimento: 0, roi: 0, ftds: 0, ftd_total: 0, registros: 0, acessos: 0, views: 0, depositos_qtd: 0, depositos_valor: 0, saques_qtd: 0, saques_valor: 0, lives: 0, horas: 0 });
      }

      // Bloco 5: Comparativo Diário (só quando período = mês)
      if (!historico && mesSelecionado) {
        const dias: Record<string, DiaData> = {};
        const { inicio: iIni, fim: iFim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        for (let d = new Date(mesSelecionado.ano, mesSelecionado.mes, 1); d <= new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0); d.setDate(d.getDate() + 1)) {
          const ds = fmt(d);
          dias[ds] = { data: ds, duracao: 0, media_views: 0, max_views: 0, acessos: 0, registros: 0, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 };
        }
        rows.forEach((m) => {
          if (!dias[m.data]) return;
          dias[m.data].acessos += m.visit_count || 0;
          dias[m.data].registros += m.registration_count || 0;
          dias[m.data].ftd_count += m.ftd_count || 0;
          dias[m.data].ftd_total += m.ftd_total || 0;
          dias[m.data].deposit_count += m.deposit_count || 0;
          dias[m.data].deposit_total += m.deposit_total || 0;
          dias[m.data].withdrawal_count += m.withdrawal_count || 0;
          dias[m.data].withdrawal_total += m.withdrawal_total || 0;
          dias[m.data].ggr += m.ggr || 0;
        });
        const viewsPorDia: Record<string, number[]> = {};
        liveRows.forEach((live) => {
          const res = resultados.find((r) => r.live_id === live.id);
          if (!res || !dias[live.data]) return;
          const h = (res.duracao_horas || 0) + (res.duracao_min || 0) / 60;
          dias[live.data].duracao += h;
          const views = res.media_views || res.max_views || 0;
          if (views > 0) {
            if (!viewsPorDia[live.data]) viewsPorDia[live.data] = [];
            viewsPorDia[live.data].push(views);
            dias[live.data].max_views = Math.max(dias[live.data].max_views, views);
          }
        });
        Object.keys(viewsPorDia).forEach((ds) => {
          if (dias[ds]) {
            const arr = viewsPorDia[ds];
            dias[ds].media_views = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
          }
        });
        setDiasData(Object.values(dias).sort((a, b) => a.data.localeCompare(b.data)));
      } else {
        setDiasData([]);
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, filtroInfluencer, filtroOperadora, podeVerInfluencer, influencersVisiveis, escoposVisiveis.operadorasVisiveis, mesSelecionado]);

  const pctViewAcesso = totais.views > 0 ? ((totais.acessos / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoReg = totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—";
  const pctRegFTD = totais.registros > 0 ? ((totais.ftds / totais.registros) * 100).toFixed(1) + "%" : "—";
  const pctViewFTD = totais.views > 0 ? ((totais.ftds / totais.views) * 100).toFixed(1) + "%" : "—";
  const pctAcessoFTD = totais.acessos > 0 ? ((totais.ftds / totais.acessos) * 100).toFixed(1) + "%" : "—";

  const subValueReg = totais.acessos > 0 || totais.registros > 0
    ? { label: "acessos (conv.)", value: `${totais.acessos.toLocaleString("pt-BR")} (${totais.acessos > 0 ? ((totais.registros / totais.acessos) * 100).toFixed(1) + "%" : "—"})` }
    : { label: "", value: "—" };

  const ftdPorHora = totais.horas > 0 ? (totais.ftds / totais.horas).toFixed(1) : "—";
  const ticketFTD = totais.ftds > 0 ? fmtBRL(totais.ftd_total / totais.ftds) : "—";
  const ticketDep = totais.depositos_qtd > 0 ? fmtBRL(totais.depositos_valor / totais.depositos_qtd) : "—";
  const ticketSaque = totais.saques_qtd > 0 ? fmtBRL(totais.saques_valor / totais.saques_qtd) : "—";
  const ggrPorJogador = totais.ftds > 0 ? fmtBRL(totais.ggr / totais.ftds) : "—";

  const useBrand = user?.role === "operador" && !!operadoraBrand;
  const blockBg = useBrand && operadoraBrand?.cor_background ? operadoraBrand.cor_background : t.cardBg;
  const card: React.CSSProperties = { background: blockBg, border: `1px solid ${t.cardBorder}`, borderRadius: 18, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" };

  useEffect(() => {
    if (!useBrand || !operadoraBrand) return;
    const tituloOriginal = document.title;
    document.title = operadoraBrand.nome ? `${operadoraBrand.nome} — Dashboard Influencer` : tituloOriginal;
    if (operadoraBrand.logo_url) {
      const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null)
        ?? (() => { const el = document.createElement("link"); el.rel = "icon"; document.head.appendChild(el); return el; })();
      const faviconOriginal = link.href;
      link.href = operadoraBrand.logo_url;
      return () => { document.title = tituloOriginal; link.href = faviconOriginal; };
    }
    return () => { document.title = tituloOriginal; };
  }, [useBrand, operadoraBrand]);
  const btnNav: React.CSSProperties = { width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
    color: t.textMuted, padding: "10px 12px",
    background: useBrand ? "color-mix(in srgb, var(--brand-primary) 10%, transparent)" : "rgba(74,32,130,0.10)",
    borderBottom: `1px solid ${t.cardBorder}`, fontFamily: FONT.body, whiteSpace: "nowrap", fontWeight: 700,
  };
  const zebraStripe = (i: number) =>
    i % 2 === 1 ? (useBrand ? "color-mix(in srgb, var(--brand-primary) 6%, transparent)" : "rgba(74,32,130,0.06)") : "transparent";
  const totalRowBg = useBrand ? "color-mix(in srgb, var(--brand-primary) 12%, transparent)" : "rgba(74,32,130,0.12)";
  const tdStyle: React.CSSProperties = { padding: "10px 12px", fontSize: 13, color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap", borderBottom: `1px solid ${t.cardBorder}` };

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  if (perm.canView === "nao") {
    return <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>Você não tem permissão para visualizar este dashboard.</div>;
  }

  return (
    <div style={{ padding: "20px 24px 40px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ─── BLOCO 1: Filtros ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14,
          border: `1px solid ${t.cardBorder}`,
          background: blockBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Navegação de mês */}
            <button style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>
              <ChevronRight size={14} />
            </button>

            {/* Botão Histórico — padrão Overview */}
            <button
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico
                  ? `1px solid ${useBrand ? "var(--brand-primary)" : BRAND.roxoVivo}`
                  : `1px solid ${t.cardBorder}`,
                background: historico
                  ? useBrand ? "color-mix(in srgb, var(--brand-primary) 15%, transparent)" : `${BRAND.roxoVivo}18`
                  : "transparent",
                color: historico ? (useBrand ? "var(--brand-primary)" : BRAND.roxoVivo) : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
              onClick={toggleHistorico}
            >
              <GiCalendar size={15} /> Histórico
            </button>

            {/* Filtro Influencer — ícone dentro do campo (mesmo padrão do Histórico) */}
            {showFiltroInfluencer && (
              <SelectComIcone
                icon={<GiStarMedalFilter size={15} />}
                value={filtroInfluencer}
                onChange={setFiltroInfluencer}
                t={t}
              >
                <option value="todos">Todos os influencers</option>
                {perfis
                  .filter((p) => influencersComDadosIds.includes(p.id) && podeVerInfluencer(p.id))
                  .sort((a, b) => (a.nome_artistico ?? "").localeCompare(b.nome_artistico ?? "", "pt-BR"))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.nome_artistico}</option>
                  ))}
              </SelectComIcone>
            )}

            {/* Filtro Operadora — ícone dentro do campo */}
            {showFiltroOperadora && (
              <SelectComIcone
                icon={<GiShield size={15} />}
                value={filtroOperadora}
                onChange={setFiltroOperadora}
                t={t}
              >
                <option value="todas">Todas as operadoras</option>
                {[...operadorasList].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((o) => (
                  <option key={o.slug} value={o.slug}>{o.nome}</option>
                ))}
              </SelectComIcone>
            )}

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── BLOCO 2: KPIs Executivos ─────────────────────────────────────────── */}
      <BrandCard useBrand={useBrand} style={{ marginBottom: 14 }}>
        <SectionTitle icon={<GiPodiumWinner size={14} />} title="KPIs Executivos" subtitle={!historico ? "MTD vs mês anterior" : undefined} useBrand={useBrand} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard label="GGR Total"    value={fmtBRL(totais.ggr)}         icon={<GiMoneyStack  size={16} color={BRAND.roxo}    />} accentVar="--brand-extra1" accentColor={BRAND.roxo}    useBrand={useBrand} cardBg={blockBg} atual={totais.ggr}         anterior={totaisAnt.ggr}         isBRL isHistorico={historico} />
          <KpiCard label="Investimento" value={fmtBRL(totais.investimento)} icon={<GiTakeMyMoney size={16} color={BRAND.azul}    />} accentVar="--brand-extra4" accentColor={BRAND.azul}    useBrand={useBrand} cardBg={blockBg} atual={totais.investimento} anterior={totaisAnt.investimento} isBRL isHistorico={historico} />
          <KpiCard label="ROI"          value={totais.investimento > 0 ? `${totais.roi >= 0 ? "+" : ""}${totais.roi.toFixed(1)}%` : "—"} icon={<GiStarMedal size={16} color={BRAND.verde} />} accentVar="--brand-extra2" accentColor={BRAND.verde} useBrand={useBrand} cardBg={blockBg} atual={totais.roi} anterior={totaisAnt.roi} isHistorico={historico} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard label="Qtd de Lives"     value={totais.lives.toLocaleString("pt-BR")} icon={<GiClapperboard size={16} color={BRAND.azul} />} accentVar="--brand-extra2" accentColor={BRAND.azul} useBrand={useBrand} cardBg={blockBg} atual={totais.lives} anterior={totaisAnt.lives} isHistorico={historico} />
          <KpiCard label="Horas Realizadas" value={fmtHoras(totais.horas)}               icon={<GiSandsOfTime  size={16} color={BRAND.azul} />} accentVar="--brand-extra2" accentColor={BRAND.azul} useBrand={useBrand} cardBg={blockBg} atual={totais.horas} anterior={totaisAnt.horas} isHistorico={historico} />
          <KpiCard label="Média de Views"   value={totais.views > 0 ? totais.views.toLocaleString("pt-BR") : "—"} icon={<GiEyeball size={16} color={BRAND.azul} />} accentVar="--brand-extra2" accentColor={BRAND.azul} useBrand={useBrand} cardBg={blockBg} atual={totais.views} anterior={totaisAnt.views} isHistorico={historico} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard label="Registros" value={totais.registros.toLocaleString("pt-BR")}    icon={<GiPerson   size={16} color={BRAND.roxo}    />} accentVar="--brand-extra3" accentColor={BRAND.roxo}    useBrand={useBrand} cardBg={blockBg} atual={totais.registros}     anterior={totaisAnt.registros}     isHistorico={historico} subValue={subValueReg} />
          <KpiCard label="FTDs"      value={totais.ftds.toLocaleString("pt-BR")}         icon={<GiTrophy   size={16} color={BRAND.roxo}    />} accentVar="--brand-extra3" accentColor={BRAND.roxo}    useBrand={useBrand} cardBg={blockBg} atual={totais.ftds}          anterior={totaisAnt.ftds}          isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.ftd_total) }} />
          <KpiCard label="Depósitos" value={totais.depositos_qtd.toLocaleString("pt-BR")} icon={<GiCardPlay size={16} color={BRAND.amarelo} />} accentVar="--brand-extra3" accentColor={BRAND.amarelo} useBrand={useBrand} cardBg={blockBg} atual={totais.depositos_qtd} anterior={totaisAnt.depositos_qtd} isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.depositos_valor) }} />
          <KpiCard label="Saques"    value={totais.saques_qtd.toLocaleString("pt-BR")}   icon={<GiCash     size={16} color={BRAND.amarelo} />} accentVar="--brand-extra4" accentColor={BRAND.amarelo} useBrand={useBrand} cardBg={blockBg} atual={totais.saques_qtd}    anterior={totaisAnt.saques_qtd}    isHistorico={historico} subValue={{ label: "valor", value: fmtBRL(totais.saques_valor) }} />
        </div>
      </BrandCard>
      <BrandDivider useBrand={useBrand} />

      {/* ─── BLOCO 3: Funil de Conversão (formato Overview) ────────────────────── */}
      <BrandCard useBrand={useBrand} style={{ marginBottom: 14 }}>
        <SectionTitle icon={<GiFunnel size={14} />} title="Funil de Conversão" useBrand={useBrand} />
        <FunilVisual
          values={[totais.views, totais.acessos, totais.registros, totais.ftds]}
          taxas={[pctViewAcesso, pctAcessoReg, pctRegFTD, pctAcessoFTD, pctViewFTD]}
          useBrand={useBrand}
          logoUrl={useBrand ? (operadoraBrand?.logo_url ?? undefined) : undefined}
        />
      </BrandCard>
      <BrandDivider useBrand={useBrand} />

      {/* ─── BLOCO 4: Eficiência ──────────────────────────────────────────────── */}
      <BrandCard useBrand={useBrand} style={{ marginBottom: 14 }}>
        <SectionTitle icon={<GiSpeedometer size={14} />} title="Eficiência" useBrand={useBrand} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <RateCard label="FTD/Hora"              value={ftdPorHora} />
          <RateCard label="Ticket Médio FTD"      value={ticketFTD} />
          <RateCard label="Ticket Médio Depósito" value={ticketDep} />
          <RateCard label="Ticket Médio Saque"    value={ticketSaque} />
          <RateCard label="GGR por Jogador"     value={ggrPorJogador} highlight={true} useBrand={useBrand} />
        </div>
      </BrandCard>
      <BrandDivider useBrand={useBrand} />

      {/* ─── BLOCO 5: Comparativo Diário ──────────────────────────────────────── */}
      {!historico && mesSelecionado && diasData.length > 0 && (
        <BrandCard useBrand={useBrand} style={{ marginBottom: 0 }} defaultPadding={false}>
          <div style={{ padding: "20px 20px 16px" }}>
            <SectionTitle icon={<GiCalendar size={14} />} title="Comparativo Diário" useBrand={useBrand} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Data","Duração Live","Média Views","Máx Views","Acessos","Registros","# FTDs","R$ FTDs","# Depósitos","R$ Depósitos","# Saques","R$ Saques","R$ GGR"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diasData.map((d, i) => (
                  <tr key={d.data} style={{ background: zebraStripe(i) }}>
                    <td style={tdStyle}>{fmtDia(d.data)}</td>
                    <td style={tdStyle}>{d.duracao > 0 ? fmtHoras(d.duracao) : "—"}</td>
                    <td style={tdStyle}>{cel(d.media_views)}</td>
                    <td style={tdStyle}>{cel(d.max_views)}</td>
                    <td style={tdStyle}>{cel(d.acessos)}</td>
                    <td style={tdStyle}>{cel(d.registros)}</td>
                    <td style={tdStyle}>{cel(d.ftd_count)}</td>
                    <td style={tdStyle}>{cel(d.ftd_total, true)}</td>
                    <td style={tdStyle}>{cel(d.deposit_count)}</td>
                    <td style={tdStyle}>{cel(d.deposit_total, true)}</td>
                    <td style={tdStyle}>{cel(d.withdrawal_count)}</td>
                    <td style={tdStyle}>{cel(d.withdrawal_total, true)}</td>
                    <td style={tdStyle}>{cel(d.ggr, true)}</td>
                  </tr>
                ))}
                {diasData.length > 0 && (() => {
                  const tot = diasData.reduce((acc, d) => ({
                    duracao: acc.duracao + d.duracao,
                    acessos: acc.acessos + d.acessos,
                    registros: acc.registros + d.registros,
                    ftd_count: acc.ftd_count + d.ftd_count,
                    ftd_total: acc.ftd_total + d.ftd_total,
                    deposit_count: acc.deposit_count + d.deposit_count,
                    deposit_total: acc.deposit_total + d.deposit_total,
                    withdrawal_count: acc.withdrawal_count + d.withdrawal_count,
                    withdrawal_total: acc.withdrawal_total + d.withdrawal_total,
                    ggr: acc.ggr + d.ggr,
                  }), { duracao: 0, acessos: 0, registros: 0, ftd_count: 0, ftd_total: 0, deposit_count: 0, deposit_total: 0, withdrawal_count: 0, withdrawal_total: 0, ggr: 0 });
                  return (
                    <tr key="total" style={{ background: totalRowBg, fontWeight: 700, borderTop: `2px solid ${t.cardBorder}` }}>
                      <td style={tdStyle}>Total</td>
                      <td style={tdStyle}>{tot.duracao > 0 ? fmtHoras(tot.duracao) : "—"}</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>{cel(tot.acessos)}</td>
                      <td style={tdStyle}>{cel(tot.registros)}</td>
                      <td style={tdStyle}>{cel(tot.ftd_count)}</td>
                      <td style={tdStyle}>{cel(tot.ftd_total, true)}</td>
                      <td style={tdStyle}>{cel(tot.deposit_count)}</td>
                      <td style={tdStyle}>{cel(tot.deposit_total, true)}</td>
                      <td style={tdStyle}>{cel(tot.withdrawal_count)}</td>
                      <td style={tdStyle}>{cel(tot.withdrawal_total, true)}</td>
                      <td style={tdStyle}>{cel(tot.ggr, true)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </BrandCard>
      )}
    </div>
  );
}
