import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, BRAND } from "../../../lib/dashboardConstants";
import { fmtBRL, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
import { getThStyle, getTdStyle, getTdNumStyle, zebraStripe, TOTAL_ROW_BG } from "../../../lib/tableStyles";
import { SectionTitle, SkeletonKpiCard, KpiCardDepositos, SortTableTh, type SortDir } from "../../../components/dashboard";
import { supabase } from "../../../lib/supabase";
import { resolveWhitelabelAccentCss } from "../../../lib/whitelabelAccent";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart2,
  Bookmark,
  Calendar,
  Filter,
  Heart,
  Layers,
  MessageCircle,
  Mic,
  Percent,
  Play,
  Sparkles,
  Video,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  Share2,
  Target,
  Trophy,
  TrendingUp,
  CircleDollarSign,
  UserPlus,
} from "lucide-react";

// ─── CONSTANTES DE MÊS ────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2026, mes: 0 }; // Janeiro 2026 — dados de mídias começam aqui
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

/** Rótulo curto para período mensal (ex.: Abr/2026), alinhado ao modo histórico. */
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let { ano, mes } = MES_INICIO;
  while (
    ano < hoje.getFullYear() ||
    (ano === hoje.getFullYear() && mes <= hoje.getMonth())
  ) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) { mes = 0; ano++; }
  }
  return lista;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface KpiDaily {
  channel: string;
  date: string;
  followers: number | null;
  impressions: number | null;
  reach: number | null;
  engagements: number | null;
  engagement_rate: number | null;
  posts_published: number | null;
  video_views: number | null;
  link_clicks: number | null;
}

/** Série diária ou mensal (RPC get_campanha_funil_serie_temporal). */
interface FunilSerieRow {
  periodo: string;
  visitas: number;
  registros: number;
  ftds: number;
  ftd_total: number;
  deposit_count: number;
  deposit_total: number;
  withdrawal_count: number;
  withdrawal_total: number;
}

type SocialMediaTab = "overview" | "conversao" | "alcance";

const TAB_LABELS: Record<SocialMediaTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  alcance: "Alcance",
};

const COR_FUNIL_A = {
  accent: "var(--brand-action, #7c3aed)",
  border: "color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
  step: "color-mix(in srgb, var(--brand-action, #7c3aed) 7%, transparent)",
} as const;
const COR_FUNIL_B = {
  accent: "var(--brand-contrast, #1e36f8)",
  border: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 35%, transparent)",
  step: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 7%, transparent)",
} as const;

interface PostUnificado {
  canal: string;
  tipo: string;
  cor: string;
  tag: string;
  resumo: string;
  stats: ReactNode[];
  date: string;
  /** ISO da API (Meta/YouTube); null em linhas antigas até o próximo ETL. */
  publishedAt: string | null;
  url: string | null;
  thumbnailUrl: string | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
};

const fmtPct = (n: number | null | undefined) =>
  n != null ? `${(n * 100).toFixed(1)}%` : "—";

function totaisFromKpiRows(kpiData: KpiDaily[]) {
  const byCh: Record<string, KpiDaily[]> = {};
  for (const r of kpiData) {
    if (!byCh[r.channel]) byCh[r.channel] = [];
    byCh[r.channel].push(r);
  }
  const sum = (arr: KpiDaily[], f: keyof KpiDaily) => arr.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  const last = (arr: KpiDaily[], f: keyof KpiDaily) => {
    const v = arr[arr.length - 1]?.[f];
    return v != null ? Number(v) : null;
  };
  const postagens = kpiData.reduce((a, r) => a + (Number(r.posts_published) || 0), 0);
  return {
    seguidores: Object.values(byCh).reduce((a, arr) => a + (last(arr, "followers") || 0), 0),
    impressoes: Object.values(byCh).reduce((a, arr) => a + sum(arr, "impressions"), 0),
    engagements: Object.values(byCh).reduce((a, arr) => a + sum(arr, "engagements"), 0),
    link_clicks: Object.values(byCh).reduce((a, arr) => a + sum(arr, "link_clicks"), 0),
    postagens,
    byChannel: byCh,
  };
}

function fmtComparativoMoM(atual: number, anterior: number): { pctLabel: string; up: boolean } | null {
  const diff = atual - anterior;
  if (anterior === 0 && atual === 0) return null;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  return { pctLabel: pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—", up };
}

type CampanhaPerfRow = {
  campanha_id: string;
  campanha_nome: string;
  visitas: number;
  registros: number;
  ftds: number;
  ftd_total: number;
  deposit_count?: number;
  deposit_total: number;
  withdrawal_count?: number;
  withdrawal_total: number;
  utms_count: number;
};

function sumCampanhasPerf(rows: CampanhaPerfRow[]) {
  return rows.reduce(
    (acc, c) => {
      acc.visitas += Number(c.visitas) || 0;
      acc.registros += Number(c.registros) || 0;
      acc.ftds += Number(c.ftds) || 0;
      acc.ftd_total += Number(c.ftd_total) || 0;
      acc.deposit_count += Number(c.deposit_count) || 0;
      acc.deposit_total += Number(c.deposit_total) || 0;
      acc.withdrawal_count += Number(c.withdrawal_count) || 0;
      acc.withdrawal_total += Number(c.withdrawal_total) || 0;
      acc.ggr += (Number(c.deposit_total) || 0) - (Number(c.withdrawal_total) || 0);
      return acc;
    },
    {
      visitas: 0,
      registros: 0,
      ftds: 0,
      ftd_total: 0,
      deposit_count: 0,
      deposit_total: 0,
      withdrawal_count: 0,
      withdrawal_total: 0,
      ggr: 0,
    }
  );
}

function pctCamp(num: number, den: number): number | null {
  return den === 0 ? null : (num / den) * 100;
}

function cmpNullableNum(a: number | null, b: number | null, mul: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return mul * (a - b);
}

function ggrCampanha(c: CampanhaPerfRow): number {
  return (Number(c.deposit_total) || 0) - (Number(c.withdrawal_total) || 0);
}

function fmtPctCamp(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

type CampCmpSortCol =
  | "nome"
  | "visitas"
  | "registros"
  | "ftds"
  | "ftd_total"
  | "deposit_count"
  | "deposit_total"
  | "withdrawal_count"
  | "withdrawal_total"
  | "ggr";

type TaxCmpSortCol = "nome" | "visitas" | "pctVR" | "registros" | "pctRF" | "ftds" | "pctVF";

/** Rótulo de período na série do RPC (dia a dia ou mês a mês no formato Abr/2026). */
function fmtPeriodoSerieCell(periodo: string, historico: boolean): string {
  const base = periodo.length === 7 ? `${periodo}-01` : periodo.slice(0, 10);
  const d = new Date(base.includes("T") ? base : `${base}T12:00:00`);
  if (Number.isNaN(d.getTime())) return periodo;
  if (historico) {
    return `${MESES_ABREV[d.getMonth()]}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Funil 3 níveis: visitas → registros → FTDs (campanhas / consolidado). */
function FunilSocialTresNiveis({
  visitas,
  registros,
  ftds,
  accentBorder,
  accentStep,
  accentColor,
  idPrefix,
}: {
  visitas: number;
  registros: number;
  ftds: number;
  accentBorder: string;
  accentStep: string;
  accentColor: string;
  idPrefix: string;
}) {
  const { theme: t } = useApp();
  const W = 320;
  const stepH = 88;
  const levels = 3;
  const H = stepH * levels;
  const widths = [1.0, 0.68, 0.38].map((f) => f * W);
  const FUNIL_COLORS = [
    "var(--brand-action, #4a2082)",
    "var(--brand-contrast, #1e36f8)",
    BRAND.verde,
  ];
  const steps = [
    { label: "Visitas", valor: visitas },
    { label: "Registros", valor: registros },
    { label: "FTDs", valor: ftds },
  ];
  const pctVisitReg = visitas > 0 ? ((registros / visitas) * 100).toFixed(1) + "%" : "—";
  const pctRegFtd = registros > 0 ? ((ftds / registros) * 100).toFixed(1) + "%" : "—";
  const pctVisitFtd = visitas > 0 ? ((ftds / visitas) * 100).toFixed(1) + "%" : "—";

  return (
    <div className="app-grid-2" style={{ gap: 20, alignItems: "center" }}>
      <div
        role="img"
        aria-label={`Funil de conversão: ${fmtNum(visitas)} visitas, ${fmtNum(registros)} registros, ${fmtNum(ftds)} FTDs`}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 280, display: "block" }} preserveAspectRatio="xMidYMid meet" aria-hidden>
          <defs>
            {steps.map((_, i) => (
              <linearGradient key={i} id={`sms-fgrad-${idPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FUNIL_COLORS[i]} stopOpacity="0.92" />
                <stop offset="100%" stopColor={FUNIL_COLORS[i]} stopOpacity="0.62" />
              </linearGradient>
            ))}
          </defs>
          {steps.map((step, i) => {
            const wTop = widths[i];
            const wBot = widths[i + 1] ?? widths[i] * 0.55;
            const xTop = (W - wTop) / 2;
            const xBot = (W - wBot) / 2;
            const yTop = i * stepH;
            const yBot = yTop + stepH - 2;
            const path = `M ${xTop} ${yTop} L ${xTop + wTop} ${yTop} L ${xBot + wBot} ${yBot} L ${xBot} ${yBot} Z`;
            return (
              <g key={step.label}>
                <path d={path} fill={`url(#sms-fgrad-${idPrefix}-${i})`} />
                <text
                  x={W / 2}
                  y={yTop + stepH / 2 - 7}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontFamily={FONT.body}
                  fontWeight={700}
                  letterSpacing="0.09em"
                  style={{ textTransform: "uppercase" }}
                >
                  {step.label}
                </text>
                <text x={W / 2} y={yTop + stepH / 2 + 10} textAnchor="middle" fill="#fff" fontSize={18} fontFamily={FONT.body} fontWeight={800}>
                  {fmtNum(step.valor)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 10,
            color: t.textMuted,
            fontFamily: FONT.body,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          Taxas de conversão
        </div>
        {[
          { label: "Visita → Registro", taxa: pctVisitReg, hl: false },
          { label: "Registro → FTD", taxa: pctRegFtd, hl: false },
          { label: "Visita → FTD", taxa: pctVisitFtd, hl: true },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: r.hl ? `1px solid ${accentBorder}` : `1px solid ${t.cardBorder}`,
              background: r.hl ? accentStep : "transparent",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: t.textMuted,
                fontFamily: FONT.body,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 3,
              }}
            >
              {r.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT.body, color: r.hl ? accentColor : t.text }}>{r.taxa}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Data/hora da publicação no carrossel (America/Sao_Paulo). */
function fmtPostPublicacao(publishedAt: string | null | undefined, dataFallback: string): string {
  if (publishedAt) {
    const d = new Date(publishedAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    }
  }
  if (dataFallback) {
    const d = new Date(`${dataFallback}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  return "—";
}

function postStatPill(icon: ReactNode, value: string): ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, color: "currentColor" }}>{icon}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
}

function PostCarouselThumb({ p }: { p: PostUnificado }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasUrl = Boolean(p.thumbnailUrl?.trim());
  const showBadge = !hasUrl || imgFailed;

  return (
    <div style={{
      width: "100%",
      paddingTop: "56.25%",
      position: "relative",
      background: `${p.cor}18`,
      overflow: "hidden",
    }}>
      {hasUrl && !imgFailed && (
        <img
          src={p.thumbnailUrl!}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
      {showBadge && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <rect width="96" height="96" rx="20" fill={p.cor} opacity=".2" />
            <text x="48" y="62" textAnchor="middle" fontSize="36" fill={p.cor} fontFamily={FONT.body}>{p.tag}</text>
          </svg>
        </div>
      )}
    </div>
  );
}

function ordenarPostsRecentes(a: PostUnificado, b: PostUnificado): number {
  const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
  const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : NaN;
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
  if (!Number.isNaN(ta) && Number.isNaN(tb)) return -1;
  if (Number.isNaN(ta) && !Number.isNaN(tb)) return 1;
  return b.date.localeCompare(a.date);
}

/**
 * KpiCard especializado para Mídias Sociais.
 * Usa resolveWhitelabelAccentCss para tokens CSS vars dinâmicos.
 * Interface difere do KpiCard compartilhado (components/dashboard/KpiCard).
 */
function KpiCard({
  label,
  valor,
  momComparativo,
  accentVar,
  accentCor,
  icon,
}: {
  label: string;
  valor: string;
  momComparativo?: { pctLabel: string; up: boolean; refLine: string } | null;
  accentVar?: string;
  accentCor: string;
  icon: React.ReactNode;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const resolved =
    brand.useBrand && accentVar != null && accentVar !== ""
      ? resolveWhitelabelAccentCss(accentVar) ?? "var(--brand-action, #7c3aed)"
      : accentCor;
  const barBg = brand.useBrand
    ? `linear-gradient(90deg, ${resolved}, transparent)`
    : `linear-gradient(90deg, ${accentCor}, transparent)`;
  const iconBoxBg = brand.useBrand
    ? `color-mix(in srgb, ${resolved} 12%, transparent)`
    : `${accentCor}20`;
  const iconBoxBorder = brand.useBrand
    ? "1px solid var(--brand-action-border)"
    : `1px solid ${accentCor}40`;
  const iconBoxColor = brand.useBrand ? resolved : accentCor;
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${t.cardBorder}`,
      background: brand.blockBg,
      overflow: "hidden",
    }}>
      <div style={{ height: 3, background: barBg }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: iconBoxBg,
            border: iconBoxBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: iconBoxColor, flexShrink: 0, fontSize: 15,
          }}>
            {icon}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
            textTransform: "uppercase" as const,
            color: t.textMuted, fontFamily: FONT.body,
          }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, lineHeight: 1.1, marginBottom: 6, fontFamily: FONT.body }}>
          {valor}
        </div>
        {momComparativo && (
          <div style={{ fontSize: 11, fontFamily: FONT.body, marginTop: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                color: momComparativo.up ? BRAND.verde : BRAND.vermelho,
                fontWeight: 700,
                fontSize: 12,
                lineHeight: 1,
              }}>
                {momComparativo.up ? "↑" : "↓"} {momComparativo.pctLabel}
              </span>
            </div>
            <span style={{ color: t.textMuted, fontSize: 10 }}>{momComparativo.refLine}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SocialMediaDashboard() {
  const { theme: t, isDark } = useApp();
  const perm = usePermission("dash_midias_sociais");

  // ── Navegação por meses (padrão Overview) ─────────────────────────────────
  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex(
    (m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth()
  );
  const [idxMes, setIdxMes]       = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);

  const mesSelecionado = mesesDisponiveis[idxMes];
  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { if (!historico && !isPrimeiro) setIdxMes((i) => i - 1); }
  function irMesProximo()  { if (!historico && !isUltimo)  setIdxMes((i) => i + 1); }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
    } else {
      setHistorico(true);
    }
  }

  // Datas do período selecionado (atual + janela do mês anterior alinhada ao MTD)
  const { start, end, startPrev, endPrev } = useMemo(() => {
    if (historico) {
      return {
        start: `${MES_INICIO.ano}-${String(MES_INICIO.mes + 1).padStart(2, "0")}-01`,
        end: hoje.toISOString().slice(0, 10),
        startPrev: null as string | null,
        endPrev: null as string | null,
      };
    }
    if (!mesSelecionado) {
      return {
        start: "2026-01-01",
        end: hoje.toISOString().slice(0, 10),
        startPrev: null,
        endPrev: null,
      };
    }
    const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
    return {
      start: atual.inicio,
      end: atual.fim,
      startPrev: anterior.inicio,
      endPrev: anterior.fim,
    };
  }, [historico, mesSelecionado]);

  /** Texto central da navegação de período — alinhado às outras páginas de dashboard. */
  const label = historico ? "Todo o período" : (mesSelecionado?.label ?? "");

  // ── Estados de dados ──────────────────────────────────────────────────────────
  const [carIdx,   setCarIdx]   = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [kpiData,  setKpiData]  = useState<KpiDaily[]>([]);
  const [kpiAntRows, setKpiAntRows] = useState<KpiDaily[]>([]);
  const [posts,    setPosts]    = useState<PostUnificado[]>([]);
  const [formatos, setFormatos] = useState<{ tipo: string; total: number }[]>([]);
  const [funilTotais, setFunilTotais] = useState<{
    visitas: number; registros: number; ftds: number; ftd_total: number;
  } | null>(null);
  const [campanhasPerf, setCampanhasPerf] = useState<CampanhaPerfRow[]>([]);
  const [campanhasPerfPrev, setCampanhasPerfPrev] = useState<CampanhaPerfRow[]>([]);
  const [serieFunil, setSerieFunil] = useState<FunilSerieRow[]>([]);
  const [aba, setAba] = useState<SocialMediaTab>("overview");
  const [compCampA, setCompCampA] = useState<string>("");
  const [compCampB, setCompCampB] = useState<string>("");
  const [sortCampCmp, setSortCampCmp] = useState<{ col: CampCmpSortCol; dir: SortDir }>({ col: "ggr", dir: "desc" });
  const [sortTaxCmp, setSortTaxCmp] = useState<{ col: TaxCmpSortCol; dir: SortDir }>({ col: "ftds", dir: "desc" });

  useEffect(() => {
    const withData = campanhasPerf.filter((c) => (Number(c.visitas) || 0) > 0 || (Number(c.ftds) || 0) > 0);
    if (withData.length >= 1) {
      setCompCampA(withData[0].campanha_id);
      setCompCampB(withData.length >= 2 ? withData[1].campanha_id : "");
    } else {
      setCompCampA("");
      setCompCampB("");
    }
  }, [campanhasPerf]);

  useEffect(() => {
    setCarIdx(0);
  }, [posts]);

  // ── Busca de dados ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setCarIdx(0);

      const kpi = await fetchAllPages<KpiDaily>(async (from, to) =>
        supabase
          .from("kpi_daily")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true })
          .order("channel", { ascending: true })
          .range(from, to)
      );

      if (cancelled) return;
      setKpiData(kpi);

      if (startPrev && endPrev) {
        const kpiPrev = await fetchAllPages<KpiDaily>(async (from, to) =>
          supabase
            .from("kpi_daily")
            .select("*")
            .gte("date", startPrev)
            .lte("date", endPrev)
            .order("date", { ascending: true })
            .order("channel", { ascending: true })
            .range(from, to)
        );
        if (cancelled) return;
        setKpiAntRows(kpiPrev);
      } else {
        setKpiAntRows([]);
      }

      const [igRes, fbRes, ytRes] = await Promise.all([
        supabase.from("instagram_posts")
          .select("date,published_at,type,caption,likes,comments,saves,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
        supabase.from("facebook_posts")
          .select("date,published_at,type,message,reactions,comments,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
        supabase.from("youtube_videos")
          .select("date,published_at,type,title,views,likes,comments,video_id")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(500),
      ]);

      if (cancelled) return;

      const ig = (igRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; caption: string | null;
        likes: number | null; comments: number | null; saves: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const fb = (fbRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; message: string | null;
        reactions: number | null; comments: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const yt = (ytRes.data ?? []) as Array<{
        date: string; published_at: string | null; type: string; title: string | null;
        views: number | null; likes: number | null; comments: number | null; video_id: string;
      }>;

      const tipoMap: Record<string, string> = {
        REELS: "Reels", VIDEO: "Vídeo", CAROUSEL_ALBUM: "Carrossel",
        IMAGE: "Foto", photo: "Foto", video: "Vídeo", link: "Link",
        status: "Status", short: "Short", live: "Live", upload: "Upload",
      };

      const formatoCount: Record<string, number> = {};

      const unificar = <T extends { date: string; type: string; published_at?: string | null }>(
        arr: T[], canal: string, cor: string, tag: string,
        getResumo: (r: T) => string,
        getStats: (r: T) => ReactNode[],
        getUrl: (r: T) => string | null,
        getThumbnail: (r: T) => string | null
      ): PostUnificado[] =>
        arr.map((r) => {
          const tipo = tipoMap[r.type] ?? r.type ?? "Post";
          formatoCount[tipo] = (formatoCount[tipo] ?? 0) + 1;
          return {
            canal, tipo, cor, tag, resumo: getResumo(r), stats: getStats(r),
            date: r.date, publishedAt: r.published_at ?? null, url: getUrl(r), thumbnailUrl: getThumbnail(r),
          };
        });

      const postsUnif: PostUnificado[] = [
        ...unificar(ig, "Instagram", "#E1306C", "IG",
          (r) => (r.caption ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.likes)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
            ...(r.saves != null ? [postStatPill(<Bookmark size={15} strokeWidth={2} aria-hidden />, fmtNum(r.saves))] : []),
          ],
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(fb, "Facebook", "#1877F2", "FB",
          (r) => (r.message ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.reactions)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
          ],
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(yt, "YouTube", "#FF0000", "YT",
          (r) => (r.title ?? "").slice(0, 140),
          (r) => [
            postStatPill(<Play size={15} strokeWidth={2} aria-hidden />, fmtNum(r.views)),
            postStatPill(<Heart size={15} strokeWidth={2} aria-hidden />, fmtNum(r.likes)),
            postStatPill(<MessageCircle size={15} strokeWidth={2} aria-hidden />, fmtNum(r.comments)),
          ],
          (r) => (r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null),
          (r) => (r.video_id ? `https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg` : null)),
      ].sort(ordenarPostsRecentes);

      setPosts(postsUnif);
      setFormatos(
        Object.entries(formatoCount)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
      );

      const agregacaoSerie = historico ? "month" : "day";
      const [funilRes, campRes, serieRes, campPrevRes] = await Promise.all([
        supabase.rpc("get_campanha_funil_totais", { p_data_inicio: start, p_data_fim: end, p_operadora_slug: null }),
        supabase.rpc("get_campanhas_performance", { p_data_inicio: start, p_data_fim: end, p_operadora_slug: null }),
        supabase.rpc("get_campanha_funil_serie_temporal", {
          p_data_inicio: start,
          p_data_fim: end,
          p_agregacao: agregacaoSerie,
          p_operadora_slug: null,
        }),
        startPrev && endPrev
          ? supabase.rpc("get_campanhas_performance", {
              p_data_inicio: startPrev,
              p_data_fim: endPrev,
              p_operadora_slug: null,
            })
          : Promise.resolve({ data: null as CampanhaPerfRow[] | null, error: null }),
      ]);

      if (!cancelled) {
        const fr = funilRes.data as Array<{ visitas: number; registros: number; ftds: number; ftd_total: number }> | null;
        setFunilTotais(fr && fr.length > 0 ? fr[0] : null);
        setCampanhasPerf((campRes.data as CampanhaPerfRow[]) ?? []);
        if (serieRes.error) {
          console.error("[SocialMediaDashboard] get_campanha_funil_serie_temporal:", serieRes.error);
          setSerieFunil([]);
        } else {
          const raw = (serieRes.data ?? []) as Array<Record<string, unknown>>;
          setSerieFunil(
            raw.map((r) => ({
              periodo: String(r.periodo),
              visitas: Number(r.visitas) || 0,
              registros: Number(r.registros) || 0,
              ftds: Number(r.ftds) || 0,
              ftd_total: Number(r.ftd_total) || 0,
              deposit_count: Number(r.deposit_count) || 0,
              deposit_total: Number(r.deposit_total) || 0,
              withdrawal_count: Number(r.withdrawal_count) || 0,
              withdrawal_total: Number(r.withdrawal_total) || 0,
            }))
          );
        }
        setCampanhasPerfPrev((campPrevRes.data as CampanhaPerfRow[] | null) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [start, end, startPrev, endPrev]);

  // ── Totais agregados ──────────────────────────────────────────────────────────
  const totais = useMemo(() => totaisFromKpiRows(kpiData), [kpiData]);
  const totaisAntMom = useMemo(() => totaisFromKpiRows(kpiAntRows), [kpiAntRows]);

  const totalImpr = totais.impressoes || 1;
  const engMedio  = totalImpr > 0 && totais.engagements != null
    ? (totais.engagements / totalImpr) * 100
    : null;

  const totalImprAnt = totaisAntMom.impressoes || 1;
  const engMedioAnt =
    !historico && totalImprAnt > 0 && totaisAntMom.engagements != null
      ? (totaisAntMom.engagements / totalImprAnt) * 100
      : null;

  const cmpSeguidores = !historico ? fmtComparativoMoM(totais.seguidores, totaisAntMom.seguidores) : null;
  const cmpImpressoes = !historico ? fmtComparativoMoM(totais.impressoes, totaisAntMom.impressoes) : null;
  const cmpEngMedio =
    !historico && engMedio != null && engMedioAnt != null ? fmtComparativoMoM(engMedio, engMedioAnt) : null;
  const cmpPostagens = !historico ? fmtComparativoMoM(totais.postagens, totaisAntMom.postagens) : null;

  const consolidado = useMemo(() => sumCampanhasPerf(campanhasPerf), [campanhasPerf]);
  const consolidadoPrev = useMemo(() => sumCampanhasPerf(campanhasPerfPrev), [campanhasPerfPrev]);
  const ggrPorJogador = consolidado.deposit_count > 0 ? consolidado.ggr / consolidado.deposit_count : null;
  const ggrPorJogadorPrev = consolidadoPrev.deposit_count > 0 ? consolidadoPrev.ggr / consolidadoPrev.deposit_count : null;

  const cmpGgr = !historico ? fmtComparativoMoM(consolidado.ggr, consolidadoPrev.ggr) : null;
  const cmpRegs = !historico ? fmtComparativoMoM(consolidado.registros, consolidadoPrev.registros) : null;
  const cmpGgrJog =
    !historico && ggrPorJogador != null && ggrPorJogadorPrev != null
      ? fmtComparativoMoM(ggrPorJogador, ggrPorJogadorPrev)
      : null;

  const campanhaA = campanhasPerf.find((c) => c.campanha_id === compCampA) ?? null;
  const campanhaB = campanhasPerf.find((c) => c.campanha_id === compCampB) ?? null;

  /** Detalhamento: mais recente primeiro (dia ou mês). */
  const serieFunilOrdenado = useMemo(
    () => [...serieFunil].sort((a, b) => b.periodo.localeCompare(a.periodo)),
    [serieFunil]
  );

  const lastVal = (arr: KpiDaily[], f: keyof KpiDaily): number | null => {
    const v = arr[arr.length - 1]?.[f]; return v != null ? Number(v) : null;
  };
  const sumVal = (arr: KpiDaily[], f: keyof KpiDaily): number =>
    arr.reduce((a, r) => a + (Number(r[f]) || 0), 0);

  /** Taxa de engajamento agregada no período (evita depender de engagement_rate null no banco). */
  const calcEngRate = (byCh: KpiDaily[]): string => {
    const eng = sumVal(byCh, "engagements");
    const impr = sumVal(byCh, "impressions");
    if (impr > 0) return fmtPct(eng / impr);
    const views = sumVal(byCh, "video_views");
    if (views > 0) return fmtPct(eng / views);
    return "—";
  };

  const calcEngBadge = (byCh: KpiDaily[]): number => {
    const eng = sumVal(byCh, "engagements");
    const impr = sumVal(byCh, "impressions");
    if (impr > 0) return (eng / impr) * 100;
    const views = sumVal(byCh, "video_views");
    if (views > 0) return (eng / views) * 100;
    return 0;
  };

  const channelConfig = [
    {
      channel: "instagram", nome: "Instagram", cor: "#E1306C",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))  },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "reach"))       },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Engajamento", val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Taxa eng.",   val: calcEngRate(byCh) },
      ],
    },
    {
      channel: "facebook", nome: "Facebook", cor: "#1877F2",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))  },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "reach"))       },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Reações",     val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Cliques",     val: fmtNum(sumVal(byCh, "link_clicks")) },
      ],
    },
    {
      channel: "youtube", nome: "YouTube", cor: "#FF0000",
      stats: (byCh: KpiDaily[]) => [
        { label: "Inscritos",     val: fmtNum(lastVal(byCh, "followers"))    },
        { label: "Visualizações", val: fmtNum(sumVal(byCh, "video_views"))   },
        // ETL não grava impressions no kpi_daily do YouTube (Analytics day não expõe); evitar "0" falso
        { label: "Impressões",    val: "—" },
        { label: "Engajamento",   val: fmtNum(sumVal(byCh, "engagements"))   },
        { label: "Taxa eng.",     val: calcEngRate(byCh) },
      ],
    },
  ];

  const POST_W = 520;
  const POST_GAP = 20;
  const CAR_WINDOW = 5;
  const carMaxStart = Math.max(0, posts.length - CAR_WINDOW);
  const totalFormatos = formatos.reduce((a, f) => a + f.total, 0);

  const brand = useDashboardBrand();

  const onSortCampCmp = (col: CampCmpSortCol) => {
    setSortCampCmp((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };
  const onSortTaxCmp = (col: TaxCmpSortCol) => {
    setSortTaxCmp((s) => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  };

  const campanhasCmpOrdenadas = useMemo(() => {
    const list = [...campanhasPerf];
    const { col, dir } = sortCampCmp;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let primary = 0;
      if (col === "nome") {
        primary = mul * a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
      } else if (col === "ggr") {
        primary = mul * (ggrCampanha(a) - ggrCampanha(b));
      } else {
        const va = Number(a[col as keyof CampanhaPerfRow]) || 0;
        const vb = Number(b[col as keyof CampanhaPerfRow]) || 0;
        primary = mul * (va - vb);
      }
      if (primary !== 0) return primary;
      return a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
    });
    return list;
  }, [campanhasPerf, sortCampCmp]);

  const campanhasTaxasOrdenadas = useMemo(() => {
    const list = [...campanhasPerf];
    const { col, dir } = sortTaxCmp;
    const mul = dir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      let primary = 0;
      switch (col) {
        case "nome":
          primary = mul * a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
          break;
        case "visitas":
          primary = mul * (a.visitas - b.visitas);
          break;
        case "registros":
          primary = mul * (a.registros - b.registros);
          break;
        case "ftds":
          primary = mul * (a.ftds - b.ftds);
          break;
        case "pctVR":
          primary = cmpNullableNum(pctCamp(a.registros, a.visitas), pctCamp(b.registros, b.visitas), mul);
          break;
        case "pctRF":
          primary = cmpNullableNum(pctCamp(a.ftds, a.registros), pctCamp(b.ftds, b.registros), mul);
          break;
        case "pctVF":
          primary = cmpNullableNum(pctCamp(a.ftds, a.visitas), pctCamp(b.ftds, b.visitas), mul);
          break;
        default:
          primary = 0;
      }
      if (primary !== 0) return primary;
      return a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR");
    });
    return list;
  }, [campanhasPerf, sortTaxCmp]);

  // ── Estilos base ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  };

  const btnNavStyle = (disabled: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1,
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  const thStyle = getThStyle(t);
  const tdStyle = getTdStyle(t, { borderBottom: `1px solid ${t.cardBorder}` });
  const tdNumStyle = getTdNumStyle(t, { borderBottom: `1px solid ${t.cardBorder}` });
  const selectCampStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 120,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.cardBorder}`,
    background: t.inputBg ?? t.cardBg,
    color: t.text,
    fontFamily: FONT.body,
    fontSize: 13,
  };

  if (perm.canView === "nao") {
    return (
      <div className="app-page-shell" style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, background: t.bg }}>
        Você não tem permissão para visualizar este dashboard.
      </div>
    );
  }

  const tabIds: SocialMediaTab[] = ["overview", "conversao", "alcance"];

  return (
    <div className="app-page-shell" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body, color: t.text, paddingBottom: 12 }}>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: brand.primaryIconBg,
              border: brand.primaryIconBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: brand.primaryIconColor,
            }}
          >
            <Share2 size={14} aria-hidden />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: brand.primary,
                fontFamily: FONT_TITLE,
                margin: 0,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Mídias sociais
            </h1>
            <p style={{ color: t.textMuted, fontFamily: FONT.body, fontSize: 13, margin: "5px 0 0" }}>
              Alcance orgânico, conversão por campanha e KPIs consolidados de UTMs mapeadas.
            </p>
          </div>
        </div>
      </div>

      {/* Período + abas */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            borderRadius: 14,
            border: brand.primaryTransparentBorder,
            background: brand.primaryTransparentBg,
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <button type="button" aria-label="Mês anterior" style={btnNavStyle(historico || isPrimeiro)} onClick={irMesAnterior} disabled={historico || isPrimeiro}>
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 220, textAlign: "center" }}>
              {label}
            </span>
            <button type="button" aria-label="Próximo mês" style={btnNavStyle(historico || isUltimo)} onClick={irMesProximo} disabled={historico || isUltimo}>
              <ChevronRight size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={historico ? "Desativar modo histórico" : "Ativar modo histórico — ver todo o período"}
              aria-pressed={historico}
              onClick={toggleHistorico}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                minHeight: 44,
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                    : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <Calendar size={15} aria-hidden />
              Histórico
            </button>
            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="app-lucide-spin" color="var(--brand-action, #7c3aed)" aria-hidden />
                Carregando…
              </span>
            )}
          </div>

          <div role="tablist" aria-label="Seções Mídias sociais" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {tabIds.map((key) => {
              const ativo = aba === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-midias-${key}`}
                  tabIndex={ativo ? 0 : -1}
                  aria-selected={ativo}
                  aria-controls={`panel-midias-${key}`}
                  onClick={() => setAba(key)}
                  onKeyDown={(e) => {
                    const current = tabIds.indexOf(key);
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = tabIds[(current + 1) % tabIds.length];
                      setAba(next);
                      requestAnimationFrame(() => document.getElementById(`tab-midias-${next}`)?.focus());
                    }
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const next = tabIds[(current - 1 + tabIds.length) % tabIds.length];
                      setAba(next);
                      requestAnimationFrame(() => document.getElementById(`tab-midias-${next}`)?.focus());
                    }
                  }}
                  style={{
                    padding: "10px 18px",
                    minHeight: 44,
                    borderRadius: 10,
                    border: `1px solid ${ativo ? brand.accent : t.cardBorder}`,
                    background: ativo
                      ? brand.useBrand
                        ? "color-mix(in srgb, var(--brand-contrast, #1e36f8) 15%, transparent)"
                        : "color-mix(in srgb, var(--brand-action, #7c3aed) 15%, transparent)"
                      : (t.inputBg ?? t.cardBg),
                    color: ativo ? brand.accent : t.textMuted,
                    fontWeight: ativo ? 700 : 500,
                    fontSize: 13,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  {TAB_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`panel-midias-${aba}`} aria-labelledby={`tab-midias-${aba}`}>

      {loading ? (
        <>
          <div style={card}>
            <SectionTitle icon={<BarChart2 size={14} aria-hidden />}>Carregando…</SectionTitle>
            <div className="app-grid-kpi-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonKpiCard key={i} />
              ))}
            </div>
          </div>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ height: 200, borderRadius: 12, animation: "skeleton-pulse 1.5s ease-in-out infinite", background: "rgba(124,58,237,0.08)" }} />
          </div>
        </>
      ) : (
        <>
          {aba === "overview" && (
            <>
              <div style={card}>
                <SectionTitle
                  icon={<LayoutDashboard size={14} aria-hidden />}
                  sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
                >
                  KPIs consolidados
                </SectionTitle>
                <div className="app-grid-kpi-3" style={{ marginBottom: 12 }}>
                  <KpiCard
                    label="GGR"
                    valor={fmtBRL(consolidado.ggr)}
                    accentCor={BRAND.verde}
                    icon={<TrendingUp size={15} aria-hidden />}
                    momComparativo={
                      cmpGgr
                        ? {
                            pctLabel: cmpGgr.pctLabel,
                            up: cmpGgr.up,
                            refLine: `vs ${fmtBRL(consolidadoPrev.ggr)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <KpiCard
                    label="Registros"
                    valor={fmtNum(consolidado.registros)}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxoVivo}
                    icon={<UserPlus size={15} aria-hidden />}
                    momComparativo={
                      cmpRegs
                        ? {
                            pctLabel: cmpRegs.pctLabel,
                            up: cmpRegs.up,
                            refLine: `vs ${fmtNum(consolidadoPrev.registros)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                  <KpiCard
                    label="GGR por Jogador"
                    valor={ggrPorJogador != null ? fmtBRL(ggrPorJogador) : "—"}
                    accentVar="--brand-contrast"
                    accentCor={BRAND.roxo}
                    icon={<CircleDollarSign size={15} aria-hidden />}
                    momComparativo={
                      cmpGgrJog && ggrPorJogadorPrev != null
                        ? {
                            pctLabel: cmpGgrJog.pctLabel,
                            up: cmpGgrJog.up,
                            refLine: `vs ${fmtBRL(ggrPorJogadorPrev)} · mesmo período mês ant.`,
                          }
                        : null
                    }
                  />
                </div>
                <div className="app-grid-kpi-3">
                  <KpiCardDepositos
                    label="FTDs"
                    icon={<Trophy size={16} aria-hidden />}
                    atual={{ qtd: consolidado.ftds, valor: consolidado.ftd_total }}
                    anterior={{ qtd: consolidadoPrev.ftds, valor: consolidadoPrev.ftd_total }}
                    isHistorico={historico}
                  />
                  <KpiCardDepositos
                    label="Depósitos"
                    icon={<ArrowDownToLine size={16} aria-hidden />}
                    atual={{ qtd: consolidado.deposit_count, valor: consolidado.deposit_total }}
                    anterior={{ qtd: consolidadoPrev.deposit_count, valor: consolidadoPrev.deposit_total }}
                    isHistorico={historico}
                  />
                  <KpiCardDepositos
                    label="Saques"
                    icon={<ArrowUpFromLine size={16} aria-hidden />}
                    atual={{ qtd: consolidado.withdrawal_count, valor: consolidado.withdrawal_total }}
                    anterior={{ qtd: consolidadoPrev.withdrawal_count, valor: consolidadoPrev.withdrawal_total }}
                    isHistorico={historico}
                  />
                </div>
              </div>

              <div style={card}>
                <SectionTitle
                  icon={<Calendar size={14} aria-hidden />}
                  sub={historico ? "Mês a mês (Jan/2026 em diante)" : "dia a dia"}
                >
                  Detalhamento {historico ? "mensal" : "diário"}
                </SectionTitle>
                {serieFunilOrdenado.length > 0 ? (
                  <div className="app-table-wrap">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      <caption style={{ display: "none" }}>
                        Detalhamento de visitas, conversões e GGR por {historico ? "mês" : "dia"} no período selecionado.
                      </caption>
                      <thead>
                        <tr>
                          {[
                            { label: "Período", scope: "col" as const, align: "left" as const },
                            { label: "# Visitas", scope: "col" as const, align: "right" as const },
                            { label: "# Registros", scope: "col" as const, align: "right" as const },
                            { label: "# FTD", scope: "col" as const, align: "right" as const },
                            { label: "R$ FTD", scope: "col" as const, align: "right" as const },
                            { label: "# Depósito", scope: "col" as const, align: "right" as const },
                            { label: "R$ Depósito", scope: "col" as const, align: "right" as const },
                            { label: "# Saque", scope: "col" as const, align: "right" as const },
                            { label: "R$ Saque", scope: "col" as const, align: "right" as const },
                            { label: "R$ GGR", scope: "col" as const, align: "right" as const },
                          ].map((h) => (
                            <th key={h.label} scope={h.scope} style={{ ...thStyle, textAlign: h.align }}>
                              {h.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {serieFunilOrdenado.map((row, i) => {
                          const ggr = (row.deposit_total ?? 0) - (row.withdrawal_total ?? 0);
                          return (
                            <tr key={row.periodo} style={{ background: zebraStripe(i) }}>
                              <td
                                style={{ ...tdStyle, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}
                                title={row.periodo}
                              >
                                {fmtPeriodoSerieCell(row.periodo, historico)}
                              </td>
                              <td style={tdNumStyle}>{fmtNum(row.visitas)}</td>
                              <td style={tdNumStyle}>{fmtNum(row.registros)}</td>
                              <td style={tdNumStyle}>{fmtNum(row.ftds)}</td>
                              <td style={tdNumStyle}>{fmtBRL(row.ftd_total)}</td>
                              <td style={tdNumStyle}>{fmtNum(row.deposit_count)}</td>
                              <td style={tdNumStyle}>{fmtBRL(row.deposit_total)}</td>
                              <td style={tdNumStyle}>{fmtNum(row.withdrawal_count)}</td>
                              <td style={tdNumStyle}>{fmtBRL(row.withdrawal_total)}</td>
                              <td style={{ ...tdNumStyle, color: ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(ggr)}</td>
                            </tr>
                          );
                        })}
                        {(() => {
                          const tot = serieFunilOrdenado.reduce(
                            (a, row) => ({
                              visitas: a.visitas + (Number(row.visitas) || 0),
                              registros: a.registros + (Number(row.registros) || 0),
                              ftds: a.ftds + (Number(row.ftds) || 0),
                              ftd_total: a.ftd_total + (Number(row.ftd_total) || 0),
                              deposit_count: a.deposit_count + (Number(row.deposit_count) || 0),
                              deposit_total: a.deposit_total + (Number(row.deposit_total) || 0),
                              withdrawal_count: a.withdrawal_count + (Number(row.withdrawal_count) || 0),
                              withdrawal_total: a.withdrawal_total + (Number(row.withdrawal_total) || 0),
                            }),
                            {
                              visitas: 0,
                              registros: 0,
                              ftds: 0,
                              ftd_total: 0,
                              deposit_count: 0,
                              deposit_total: 0,
                              withdrawal_count: 0,
                              withdrawal_total: 0,
                            },
                          );
                          const ggrTot = tot.deposit_total - tot.withdrawal_total;
                          return (
                            <tr
                              key="total-serie-funil"
                              style={{
                                background: TOTAL_ROW_BG,
                                fontWeight: 700,
                                borderTop: `2px solid ${t.cardBorder}`,
                              }}
                            >
                              <td style={{ ...tdStyle, fontWeight: 700, color: brand.primary }}>Total</td>
                              <td style={tdNumStyle}>{fmtNum(tot.visitas)}</td>
                              <td style={tdNumStyle}>{fmtNum(tot.registros)}</td>
                              <td style={tdNumStyle}>{fmtNum(tot.ftds)}</td>
                              <td style={tdNumStyle}>{fmtBRL(tot.ftd_total)}</td>
                              <td style={tdNumStyle}>{fmtNum(tot.deposit_count)}</td>
                              <td style={tdNumStyle}>{fmtBRL(tot.deposit_total)}</td>
                              <td style={tdNumStyle}>{fmtNum(tot.withdrawal_count)}</td>
                              <td style={tdNumStyle}>{fmtBRL(tot.withdrawal_total)}</td>
                              <td style={{ ...tdNumStyle, color: ggrTot >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>
                                {fmtBRL(ggrTot)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem dados para o período selecionado.
                  </div>
                )}
              </div>

              <div style={card}>
                <SectionTitle icon={<Target size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
                  Comparativo de campanha
                </SectionTitle>
                {campanhasPerf.length > 0 ? (
                  <div className="app-table-wrap">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      <caption style={{ display: "none" }}>
                        Performance por campanha com UTMs mapeadas no período selecionado.
                      </caption>
                      <thead>
                        <tr>
                          <SortTableTh<CampCmpSortCol>
                            label="Campanha"
                            col="nome"
                            sortCol={sortCampCmp.col}
                            sortDir={sortCampCmp.dir}
                            onSort={onSortCampCmp}
                            thStyle={thStyle}
                            align="left"
                          />
                          <SortTableTh label="Acessos" col="visitas" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="Registros" col="registros" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="# FTDs" col="ftds" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="R$ FTDs" col="ftd_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="# Depósitos" col="deposit_count" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="R$ Depósitos" col="deposit_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="# Saques" col="withdrawal_count" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="R$ Saques" col="withdrawal_total" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="R$ GGR" col="ggr" sortCol={sortCampCmp.col} sortDir={sortCampCmp.dir} onSort={onSortCampCmp} thStyle={thStyle} align="right" />
                        </tr>
                      </thead>
                      <tbody>
                        {campanhasCmpOrdenadas.map((c, i) => {
                            const ggr = (c.deposit_total ?? 0) - (c.withdrawal_total ?? 0);
                            return (
                              <tr key={c.campanha_id} style={{ background: zebraStripe(i) }}>
                                <td
                                  style={{ ...tdStyle, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}
                                  title={c.campanha_nome}
                                >
                                  {c.campanha_nome}
                                </td>
                                <td style={tdNumStyle}>{fmtNum(c.visitas)}</td>
                                <td style={tdNumStyle}>{fmtNum(c.registros)}</td>
                                <td style={tdNumStyle}>{fmtNum(c.ftds)}</td>
                                <td style={tdNumStyle}>{fmtBRL(c.ftd_total)}</td>
                                <td style={tdNumStyle}>{fmtNum(c.deposit_count ?? 0)}</td>
                                <td style={tdNumStyle}>{fmtBRL(c.deposit_total)}</td>
                                <td style={tdNumStyle}>{fmtNum(c.withdrawal_count ?? 0)}</td>
                                <td style={tdNumStyle}>{fmtBRL(c.withdrawal_total)}</td>
                                <td style={{ ...tdNumStyle, color: ggr >= 0 ? BRAND.verde : BRAND.vermelho, fontWeight: 700 }}>{fmtBRL(ggr)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 12, padding: "24px 0", fontFamily: FONT.body }}>
                    Nenhuma campanha com UTMs mapeadas no período. Cadastre campanhas e mapeie UTMs na Gestão de Links.
                  </div>
                )}
              </div>
            </>
          )}

          {aba === "conversao" && (
            <>
              <div style={card}>
                <SectionTitle icon={<Filter size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
                  Funil de conversão
                </SectionTitle>
                {(funilTotais?.visitas ?? 0) + (funilTotais?.registros ?? 0) + (funilTotais?.ftds ?? 0) > 0 ? (
                  <FunilSocialTresNiveis
                    visitas={funilTotais?.visitas ?? 0}
                    registros={funilTotais?.registros ?? 0}
                    ftds={funilTotais?.ftds ?? 0}
                    accentBorder={COR_FUNIL_A.border}
                    accentStep={COR_FUNIL_A.step}
                    accentColor={COR_FUNIL_A.accent}
                    idPrefix="agg"
                  />
                ) : (
                  <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                    Sem dados para o período selecionado.
                  </div>
                )}
              </div>

              <div style={card}>
                <SectionTitle icon={<Share2 size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
                  Comparativo de funil
                </SectionTitle>
                <div className="app-conversao-vs-row" style={{ marginBottom: 14 }}>
                  <select
                    aria-label="Campanha A no comparativo de funil"
                    value={compCampA}
                    onChange={(e) => setCompCampA(e.target.value)}
                    style={{
                      ...selectCampStyle,
                      borderColor: compCampA ? COR_FUNIL_A.border : undefined,
                    }}
                  >
                    <option value="">— Selecione —</option>
                    {campanhasPerf
                      .filter((c) => c.campanha_id !== compCampB)
                      .sort((a, b) => a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR"))
                      .map((c) => (
                        <option key={c.campanha_id} value={c.campanha_id}>
                          {c.campanha_nome}
                        </option>
                      ))}
                  </select>
                  <div
                    style={{
                      padding: "5px 12px",
                      borderRadius: 999,
                      border: "1px solid color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
                      background: "color-mix(in srgb, var(--brand-action, #7c3aed) 10%, transparent)",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--brand-action, #7c3aed)",
                      fontFamily: FONT.body,
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    VS
                  </div>
                  <select
                    aria-label="Campanha B no comparativo de funil"
                    value={compCampB}
                    onChange={(e) => setCompCampB(e.target.value)}
                    style={{
                      ...selectCampStyle,
                      borderColor: compCampB ? COR_FUNIL_B.border : undefined,
                    }}
                  >
                    <option value="">— Selecione —</option>
                    {campanhasPerf
                      .filter((c) => c.campanha_id !== compCampA)
                      .sort((a, b) => a.campanha_nome.localeCompare(b.campanha_nome, "pt-BR"))
                      .map((c) => (
                        <option key={c.campanha_id} value={c.campanha_id}>
                          {c.campanha_nome}
                        </option>
                      ))}
                  </select>
                </div>
                {(campanhaA || campanhaB) && (
                  <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 10,
                        background: COR_FUNIL_A.step,
                        border: `1px solid ${COR_FUNIL_A.border}`,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: COR_FUNIL_A.accent,
                        fontFamily: FONT.body,
                      }}
                    >
                      {campanhaA?.campanha_nome ?? "—"}
                    </div>
                    <div
                      style={{
                        padding: "6px 12px",
                        borderRadius: 10,
                        background: COR_FUNIL_B.step,
                        border: `1px solid ${COR_FUNIL_B.border}`,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: COR_FUNIL_B.accent,
                        fontFamily: FONT.body,
                      }}
                    >
                      {campanhaB?.campanha_nome ?? "—"}
                    </div>
                  </div>
                )}
                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {campanhaA ? (
                      <FunilSocialTresNiveis
                        visitas={campanhaA.visitas}
                        registros={campanhaA.registros}
                        ftds={campanhaA.ftds}
                        accentBorder={COR_FUNIL_A.border}
                        accentStep={COR_FUNIL_A.step}
                        accentColor={COR_FUNIL_A.accent}
                        idPrefix="ca"
                      />
                    ) : (
                      <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
                        Selecione a campanha A.
                      </div>
                    )}
                  </div>
                  <div className="app-conversao-funil-divider" style={{ width: 1, background: t.cardBorder, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {campanhaB ? (
                      <FunilSocialTresNiveis
                        visitas={campanhaB.visitas}
                        registros={campanhaB.registros}
                        ftds={campanhaB.ftds}
                        accentBorder={COR_FUNIL_B.border}
                        accentStep={COR_FUNIL_B.step}
                        accentColor={COR_FUNIL_B.accent}
                        idPrefix="cb"
                      />
                    ) : (
                      <div style={{ padding: 32, textAlign: "center", color: t.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
                        Selecione a campanha B.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={card}>
                <SectionTitle icon={<TrendingUp size={14} aria-hidden />} sub={historico ? "acumulado" : undefined}>
                  Comparativo de taxas
                </SectionTitle>
                {campanhasPerf.length > 0 ? (
                  <div className="app-table-wrap">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        borderRadius: 14,
                        overflow: "hidden",
                        border: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      <caption style={{ display: "none" }}>Taxas de conversão por campanha no período.</caption>
                      <thead>
                        <tr>
                          <SortTableTh<TaxCmpSortCol>
                            label="Campanha"
                            col="nome"
                            sortCol={sortTaxCmp.col}
                            sortDir={sortTaxCmp.dir}
                            onSort={onSortTaxCmp}
                            thStyle={thStyle}
                            align="left"
                          />
                          <SortTableTh label="Visitas" col="visitas" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="Visita → Registro" col="pctVR" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="Registros" col="registros" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="Registro → FTD" col="pctRF" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="FTDs" col="ftds" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                          <SortTableTh label="Visita → FTD" col="pctVF" sortCol={sortTaxCmp.col} sortDir={sortTaxCmp.dir} onSort={onSortTaxCmp} thStyle={thStyle} align="right" />
                        </tr>
                      </thead>
                      <tbody>
                        {campanhasTaxasOrdenadas.map((c, i) => (
                          <tr key={c.campanha_id} style={{ background: zebraStripe(i) }}>
                            <td
                              style={{ ...tdStyle, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                              title={c.campanha_nome}
                            >
                              {c.campanha_nome}
                            </td>
                            <td style={tdNumStyle}>{fmtNum(c.visitas)}</td>
                            <td style={tdNumStyle}>{fmtPctCamp(pctCamp(c.registros, c.visitas))}</td>
                            <td style={tdNumStyle}>{fmtNum(c.registros)}</td>
                            <td style={tdNumStyle}>{fmtPctCamp(pctCamp(c.ftds, c.registros))}</td>
                            <td style={{ ...tdNumStyle, color: BRAND.verde, fontWeight: 600 }}>{fmtNum(c.ftds)}</td>
                            <td style={tdNumStyle}>{fmtPctCamp(pctCamp(c.ftds, c.visitas))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: t.textMuted, fontSize: 12, padding: "24px 0", fontFamily: FONT.body }}>
                    Nenhuma campanha com UTMs mapeadas no período. Cadastre campanhas e mapeie UTMs na Gestão de Links.
                  </div>
                )}
              </div>
            </>
          )}

          {aba === "alcance" && (
          <>
          {/* KPIs GERAIS */}
          <div style={card}>
            <SectionTitle
              icon={<BarChart2 size={14} aria-hidden />}
              sub={historico ? "acumulado" : "comparativo MTD vs mesmo período do mês anterior"}
            >
              KPIs de Mídias Sociais
            </SectionTitle>
            <div className="app-grid-kpi-4">
              <KpiCard
                label="Postagens"
                valor={fmtNum(totais.postagens)}
                accentVar="--brand-contrast"
                accentCor={BRAND.roxoVivo}
                icon={<Bookmark size={15} aria-hidden />}
                momComparativo={
                  cmpPostagens
                    ? {
                        pctLabel: cmpPostagens.pctLabel,
                        up: cmpPostagens.up,
                        refLine: `vs ${fmtNum(totaisAntMom.postagens)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <KpiCard
                label="Seguidores totais"
                valor={fmtNum(totais.seguidores)}
                accentVar="--brand-contrast"
                accentCor={BRAND.roxo}
                icon={<Mic size={15} aria-hidden />}
                momComparativo={
                  cmpSeguidores
                    ? {
                        pctLabel: cmpSeguidores.pctLabel,
                        up: cmpSeguidores.up,
                        refLine: `vs ${fmtNum(totaisAntMom.seguidores)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <KpiCard
                label="Impressões totais"
                valor={fmtNum(totais.impressoes)}
                accentVar="--brand-contrast"
                accentCor={BRAND.azul}
                icon={<Sparkles size={15} aria-hidden />}
                momComparativo={
                  cmpImpressoes
                    ? {
                        pctLabel: cmpImpressoes.pctLabel,
                        up: cmpImpressoes.up,
                        refLine: `vs ${fmtNum(totaisAntMom.impressoes)} · mesmo período mês ant.`,
                      }
                    : null
                }
              />
              <KpiCard
                label="Engajamento médio"
                valor={engMedio != null ? `${engMedio.toFixed(1)}%` : "—"}
                accentVar="--brand-action"
                accentCor={BRAND.ciano}
                icon={<Percent size={15} aria-hidden />}
                momComparativo={
                  cmpEngMedio && engMedioAnt != null
                    ? {
                        pctLabel: cmpEngMedio.pctLabel,
                        up: cmpEngMedio.up,
                        refLine: `vs ${engMedioAnt.toFixed(1)}% · mesmo período mês ant.`,
                      }
                    : null
                }
              />
            </div>
          </div>

          {/* Cards por canal */}
          <div className="app-grid-kpi-3" style={{ marginBottom: 14 }}>
            {channelConfig.map((cfg) => {
              const byCh   = totais.byChannel[cfg.channel] ?? [];
              const stats  = cfg.stats(byCh);
              const engVal = calcEngBadge(byCh);
              return (
                <section
                  key={cfg.channel}
                  aria-label={`Métricas de ${cfg.nome}`}
                  style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: brand.blockBg, overflow: "hidden" }}
                >
                  <div style={{ height: 3, background: cfg.cor }} />
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${t.cardBorder}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.cor, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: t.text, letterSpacing: "0.04em", fontFamily: FONT_TITLE }}>{cfg.nome}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${cfg.cor}22`, border: `1px solid ${cfg.cor}44`, color: cfg.cor }}>
                        Eng. {engVal.toFixed(1)}%
                      </span>
                    </div>
                    {stats.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: i === stats.length - 1 ? "none" : `1px solid ${t.cardBorder}` }}>
                        <span style={{ color: t.textMuted }}>{s.label}</span>
                        <span style={{ fontWeight: 600, color: t.text }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Engajamento por formato */}
          <div style={card}>
            <SectionTitle icon={<Layers size={14} aria-hidden />}>Engajamento por formato</SectionTitle>
            {formatos.length > 0 ? (
              formatos.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: i === formatos.length - 1 ? "none" : `1px solid ${t.cardBorder}` }}>
                  <span style={{ color: t.textMuted, flex: 1 }}>{f.tipo}</span>
                  <div style={{ width: 90, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 3, height: 7, flexShrink: 0 }}>
                    <div
                      style={{
                        width: `${totalFormatos > 0 ? (f.total / totalFormatos) * 100 : 0}%`,
                        height: 7,
                        borderRadius: 3,
                        background: [
                          "var(--brand-action, #4a2082)",
                          "var(--brand-contrast, #1e36f8)",
                          "var(--brand-icon-color)",
                          "#6b7280",
                        ][i % 4],
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, color: t.text, minWidth: 52, textAlign: "right" }}>{f.total} posts</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Sem dados para o período selecionado.
              </div>
            )}
          </div>

          {/* Carrossel postagens */}
          <div style={card}>
            <SectionTitle icon={<Video size={14} aria-hidden />}>Postagens recentes</SectionTitle>
            {posts.length > 0 ? (
              <>
                <div style={{ overflow: "hidden" }}>
                  <div style={{
                    display: "flex",
                    gap: POST_GAP,
                  }}>
                    {posts.slice(carIdx, carIdx + CAR_WINDOW).map((p, i) => (
                      <article
                        key={`${carIdx}-${i}`}
                        aria-label={`${p.canal} · ${p.tipo}`}
                        style={{
                          flex: `0 0 min(${POST_W}px, 85vw)`,
                          minWidth: "min(520px, 85vw)",
                          borderRadius: 18,
                          border: `1px solid ${t.cardBorder}`,
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          overflow: "hidden",
                        }}
                      >
                        <PostCarouselThumb p={p} />
                        <div style={{ padding: 24 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 6, color: p.cor }}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: "inherit", textDecoration: "none", borderBottom: "1px dotted currentColor" }}>
                                {p.canal} · {p.tipo}
                              </a>
                            ) : <>{p.canal} · {p.tipo}</>}
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: 500, color: t.textMuted, fontFamily: FONT.body,
                            marginBottom: 10, letterSpacing: "0.02em",
                          }}>
                            {fmtPostPublicacao(p.publishedAt, p.date)}
                          </div>
                          <div style={{
                            fontSize: 16, color: t.textMuted, lineHeight: 1.55, marginBottom: 14,
                            display: "-webkit-box", WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical" as const, overflow: "hidden", fontFamily: FONT.body,
                          }}>
                            {p.resumo || `Post de ${p.date}`}
                          </div>
                          <div style={{
                            display: "flex", alignItems: "center", flexWrap: "wrap" as const,
                            gap: "10px 18px", fontSize: 14, color: t.textMuted, fontFamily: FONT.body,
                          }}>
                            {p.stats.map((s, j) => <span key={j}>{s}</span>)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    aria-label="Postagens anteriores"
                    onClick={() => setCarIdx((i) => Math.max(0, i - 1))}
                    disabled={carIdx === 0}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: `1px solid ${t.cardBorder}`, background: "transparent",
                      color: t.text, cursor: carIdx === 0 ? "not-allowed" : "pointer",
                      opacity: carIdx === 0 ? 0.35 : 1,
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.15s",
                    }}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximas postagens"
                    onClick={() => setCarIdx((i) => Math.min(carMaxStart, i + 1))}
                    disabled={carIdx >= carMaxStart}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: `1px solid ${t.cardBorder}`, background: "transparent",
                      color: t.text, cursor: carIdx >= carMaxStart ? "not-allowed" : "pointer",
                      opacity: carIdx >= carMaxStart ? 0.35 : 1,
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "opacity 0.15s",
                    }}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                  <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                    {posts.length > 0 ? `${carIdx + 1}–${Math.min(carIdx + CAR_WINDOW, posts.length)} / ${posts.length}` : "0 / 0"}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {posts.slice(0, Math.min(posts.length, 8)).map((_, i) => {
                      const ativo = i === Math.min(carIdx, 7);
                      return (
                        <button
                          type="button"
                          key={i}
                          aria-label={`Ir para janela ${i + 1}`}
                          onClick={() => setCarIdx(Math.min(i, carMaxStart))}
                          style={{
                            width: ativo ? 18 : 6,
                            height: 6,
                            padding: 0,
                            border: "none",
                            borderRadius: 999,
                            background: ativo ? brand.accent : t.cardBorder,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        />
                      );
                    })}
                    {posts.length > 8 && (
                      <span style={{ fontSize: 11, color: t.textMuted }}>…</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Sem dados para o período selecionado.
              </div>
            )}
          </div>
          </>
          )}
        </>
      )}
      </div>
    </div>
  );
}
