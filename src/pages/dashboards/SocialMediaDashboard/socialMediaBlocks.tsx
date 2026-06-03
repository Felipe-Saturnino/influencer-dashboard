/* eslint-disable react-refresh/only-export-components -- helpers e componentes de bloco no mesmo módulo */
import { useState, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext"
import { useDashboardBrand } from "../../../hooks/useDashboardBrand"
import { FONT } from "../../../constants/theme"
import { BRAND } from "../../../lib/dashboardConstants"
import { resolveWhitelabelAccentCss } from "../../../lib/whitelabelAccent"
import { BarChart2, GitCompare, Megaphone, Share2, TrendingDown, TrendingUp } from "lucide-react";

/** Janeiro 2026 — dados de mídias começam aqui. */
export const MES_INICIO = { ano: 2026, mes: 0 };

/** Rótulo curto para período mensal (ex.: Abr/2026), alinhado ao modo histórico. */
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

/** Série diária ou mensal (RPC get_campanha_funil_serie_temporal). */
export interface FunilSerieRow {
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

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export interface KpiDaily {
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

export type SocialMediaTab = "overview" | "conversao" | "impulsionamento" | "alcance";

export const TAB_LABELS: Record<SocialMediaTab, string> = {
  overview: "Overview",
  conversao: "Conversão",
  impulsionamento: "Impulsionamento",
  alcance: "Alcance",
};

export const TAB_ICONS: Record<SocialMediaTab, typeof BarChart2> = {
  overview: BarChart2,
  conversao: GitCompare,
  impulsionamento: Megaphone,
  alcance: Share2,
};

export interface MetaAdsDaily {
  date: string;
  ad_account_id: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  link_clicks: number;
  engagements: number;
  boosted_posts_count: number;
  attributed_ggr: number | null;
}

export interface MetaBoostedPost {
  ad_id: string;
  post_id: string | null;
  platform: string;
  date: string;
  ad_name: string | null;
  campaign_name: string | null;
  spend: number;
  impressions: number;
  reach: number;
  engagements: number;
  link_clicks: number;
  permalink: string | null;
  thumbnail_url: string | null;
}

export type BoostSortCol = "nome" | "platform" | "spend" | "impressions" | "engagements" | "link_clicks";

export function totaisFromMetaAdsRows(daily: MetaAdsDaily[], posts: MetaBoostedPost[]) {
  const sumDaily = (f: keyof MetaAdsDaily) =>
    daily.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  const spend = sumDaily("spend");
  const distinctPosts = new Set(
    posts.map((p) => p.post_id || p.ad_id).filter(Boolean)
  ).size;
  const ggrSum = daily.reduce((a, r) => a + (Number(r.attributed_ggr) || 0), 0);
  return {
    spend,
    impressions: sumDaily("impressions"),
    reach: sumDaily("reach"),
    clicks: sumDaily("clicks"),
    link_clicks: sumDaily("link_clicks"),
    engagements: sumDaily("engagements"),
    boosted_posts_count: distinctPosts,
    attributed_ggr: ggrSum > 0 ? ggrSum : null,
  };
}

export function aggregateBoostedPostsByAd(posts: MetaBoostedPost[]): MetaBoostedPost[] {
  const byAd = new Map<string, MetaBoostedPost>();
  for (const p of posts) {
    const cur = byAd.get(p.ad_id);
    if (!cur) {
      byAd.set(p.ad_id, { ...p });
      continue;
    }
    byAd.set(p.ad_id, {
      ...cur,
      spend: Number(cur.spend) + Number(p.spend),
      impressions: Number(cur.impressions) + Number(p.impressions),
      reach: Number(cur.reach) + Number(p.reach),
      engagements: Number(cur.engagements) + Number(p.engagements),
      link_clicks: Number(cur.link_clicks) + Number(p.link_clicks),
      date: p.date > cur.date ? p.date : cur.date,
      ad_name: cur.ad_name || p.ad_name,
      campaign_name: cur.campaign_name || p.campaign_name,
      thumbnail_url: cur.thumbnail_url || p.thumbnail_url,
      post_id: cur.post_id || p.post_id,
    });
  }
  return [...byAd.values()];
}

export function fmtRoiImpulsionamento(attributedGgr: number | null, spend: number): string {
  if (spend <= 0 || attributedGgr == null) return "—";
  return `${(((attributedGgr - spend) / spend) * 100).toFixed(1)}%`;
}

export interface PostUnificado {
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

export const COR_FUNIL_A = {
  accent: "var(--brand-action, #7c3aed)",
  border: "color-mix(in srgb, var(--brand-action, #7c3aed) 35%, transparent)",
  step: "color-mix(in srgb, var(--brand-action, #7c3aed) 7%, transparent)",
} as const;

export const COR_FUNIL_B = {
  accent: "var(--brand-contrast, #1e36f8)",
  border: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 35%, transparent)",
  step: "color-mix(in srgb, var(--brand-contrast, #1e36f8) 7%, transparent)",
} as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
};

export const fmtPct = (n: number | null | undefined) =>
  n != null ? `${(n * 100).toFixed(1)}%` : "—";

export type YoutubeVideoRowLite = {
  video_id: string;
  date: string;
  likes: number | null;
  comments: number | null;
};

/**
 * Estima engajamento YouTube no período a partir de snapshots em youtube_videos.
 * Usado quando kpi_daily.engagements veio zerado (Analytics atrasado ou backfill antigo).
 */
export function youtubeEngagementFromVideoSnapshots(rows: YoutubeVideoRowLite[]): number {
  const byVideo = new Map<string, { date: string; eng: number }[]>();
  for (const r of rows) {
    const eng = (Number(r.likes) || 0) + (Number(r.comments) || 0);
    const list = byVideo.get(r.video_id) ?? [];
    list.push({ date: r.date, eng });
    byVideo.set(r.video_id, list);
  }
  let total = 0;
  for (const snaps of byVideo.values()) {
    snaps.sort((a, b) => a.date.localeCompare(b.date));
    if (snaps.length === 1) {
      total += snaps[0].eng;
    } else {
      total += Math.max(0, snaps[snaps.length - 1].eng - snaps[0].eng);
    }
  }
  return total;
}

export function totaisFromKpiRows(kpiData: KpiDaily[]) {
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

export function fmtComparativoMoM(atual: number, anterior: number): { pctLabel: string; up: boolean } | null {
  const diff = atual - anterior;
  if (anterior === 0 && atual === 0) return null;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  return { pctLabel: pct !== null ? `${Math.abs(pct).toFixed(0)}%` : "—", up };
}

export type CampanhaPerfRow = {
  campanha_id: string;
  campanha_nome: string;
  operadora_slug: string | null;
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

export function sumCampanhasPerf(rows: CampanhaPerfRow[]) {
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

export function pctCamp(num: number, den: number): number | null {
  return den === 0 ? null : (num / den) * 100;
}

export function cmpNullableNum(a: number | null, b: number | null, mul: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return mul * (a - b);
}

export function ggrCampanha(c: CampanhaPerfRow): number {
  return (Number(c.deposit_total) || 0) - (Number(c.withdrawal_total) || 0);
}

export function fmtPctCamp(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

export type CampCmpSortCol =
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

export type TaxCmpSortCol = "nome" | "visitas" | "pctVR" | "registros" | "pctRF" | "ftds" | "pctVF";

/** Rótulo de período na série do RPC (dia a dia ou mês a mês no formato Abr/2026). */
export function fmtPeriodoSerieCell(periodo: string, historico: boolean): string {
  const base = periodo.length === 7 ? `${periodo}-01` : periodo.slice(0, 10);
  const d = new Date(base.includes("T") ? base : `${base}T12:00:00`);
  if (Number.isNaN(d.getTime())) return periodo;
  if (historico) {
    return `${MESES_ABREV[d.getMonth()]}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Funil 3 níveis: visitas → registros → FTDs (campanhas / consolidado). */
export function FunilSocialTresNiveis({
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
export function fmtPostPublicacao(publishedAt: string | null | undefined, dataFallback: string): string {
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

export function postStatPill(icon: ReactNode, value: string): ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, color: "currentColor" }}>{icon}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
}

export function PostCarouselThumb({ p }: { p: PostUnificado }) {
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

export function ordenarPostsRecentes(a: PostUnificado, b: PostUnificado): number {
  const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
  const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : NaN;
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
  if (!Number.isNaN(ta) && Number.isNaN(tb)) return -1;
  if (Number.isNaN(ta) && !Number.isNaN(tb)) return 1;
  return b.date.localeCompare(a.date);
}

/**
 * SocialKpiCard — KPI local de Mídias Sociais (não confundir com KpiCard compartilhado).
 * Usa resolveWhitelabelAccentCss para tokens CSS vars dinâmicos.
 */
export function SocialKpiCard({
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
                {momComparativo.up ? (
                  <TrendingUp size={12} aria-hidden />
                ) : (
                  <TrendingDown size={12} aria-hidden />
                )}{" "}
                {momComparativo.pctLabel}
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