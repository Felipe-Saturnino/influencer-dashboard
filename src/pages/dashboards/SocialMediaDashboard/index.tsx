import { useState, useEffect, useMemo } from "react";
import { usePermission } from "../../../hooks/usePermission";
import { supabase } from "../../../lib/supabase";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  verm: "#e84025",
  ciano: "#70cae4",
  verde: "#22c55e",
  amarelo: "#f59e0b",
};

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

interface PostUnificado {
  canal: string;
  tipo: string;
  cor: string;
  tag: string;
  resumo: string;
  stats: string[];
  date: string;
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

const PERIODS = [
  { id: "7d", label: "7 dias" },
  { id: "mes", label: "Mês atual" },
  { id: "ant", label: "Mês passado" },
  { id: "hist", label: "Histórico" },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    background: "#0d0d14",
    minHeight: "100vh",
    padding: "20px 24px 48px",
    fontFamily: "'Inter', sans-serif",
    color: "#f0eefc",
  },
  navBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "#12121f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "10px 20px",
    marginBottom: 14,
    flexWrap: "wrap" as const,
  },
  navBtn: (disabled: boolean) =>
    ({
      width: 28,
      height: 28,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "transparent",
      color: "#f0eefc",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.3 : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
    }) as React.CSSProperties,
  navTitle: {
    fontSize: 18,
    fontWeight: 800,
    minWidth: 180,
    textAlign: "center" as const,
    color: "#f0eefc",
  },
  pill: (active: boolean) =>
    ({
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 14px",
      borderRadius: 999,
      cursor: "pointer",
      fontFamily: "'Inter', sans-serif",
      fontSize: 13,
      transition: "all .15s",
      border: active ? `1px solid ${BRAND.roxoVivo}` : "1px solid rgba(255,255,255,0.08)",
      background: active ? "rgba(124,58,237,0.15)" : "transparent",
      color: active ? BRAND.roxoVivo : "#8b87a8",
      fontWeight: active ? 700 : 400,
    }) as React.CSSProperties,
  card: {
    background: "#12121f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  sectionTitle: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(74,32,130,0.25)",
    border: "1px solid rgba(74,32,130,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: BRAND.ciano,
    flexShrink: 0,
    fontSize: 14,
  },
  sectionName: {
    fontSize: 13,
    fontWeight: 800,
    color: "#f0eefc",
    letterSpacing: ".06em",
    textTransform: "uppercase",
  },
  sectionSub: { fontSize: 11, color: "#8b87a8", marginLeft: 4 },
  kpiGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 12,
    marginBottom: 12,
  },
  kpi: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  kpiBody: { padding: "14px 16px" },
  kpiIconRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  kpiIcon: (cor: string) =>
    ({
      width: 30,
      height: 30,
      borderRadius: 8,
      flexShrink: 0,
      background: `${cor}20`,
      border: `1px solid ${cor}40`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: BRAND.ciano,
      fontSize: 15,
    }) as React.CSSProperties,
  kpiLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: ".07em",
    textTransform: "uppercase",
    color: "#8b87a8",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#f0eefc",
    lineHeight: 1.1,
    marginBottom: 6,
  },
  kpiDelta: { fontSize: 11, display: "flex", alignItems: "center", gap: 5 },
  chGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 12,
    marginBottom: 14,
  },
  chCard: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  chBody: { padding: "14px 16px" },
  chHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  chName: { fontSize: 14, fontWeight: 800, color: "#f0eefc", letterSpacing: ".04em" },
  chStat: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    fontSize: 12,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "7px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    fontSize: 12,
  },
  postCard: {
    flex: "0 0 175px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  postImg: {
    width: "100%",
    height: 108,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  postBody: { padding: 10 },
  postChannel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: ".07em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  postCaption: {
    fontSize: 11,
    color: "#8b87a8",
    lineHeight: 1.4,
    marginBottom: 8,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  postStats: { display: "flex", gap: 10, fontSize: 10, color: "#5a5678" },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    color: "#8b87a8",
    fontSize: 14,
  },
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function SectionTitle({
  icon,
  children,
  sub,
}: {
  icon: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div style={S.sectionTitle}>
      <div style={S.sectionIcon}>{icon}</div>
      <span style={S.sectionName}>{children}</span>
      {sub && <span style={S.sectionSub}>{sub}</span>}
    </div>
  );
}

function KpiCard({
  label,
  valor,
  delta,
  up,
  accentCor,
  icon,
}: {
  label: string;
  valor: string;
  delta?: string | null;
  up?: boolean;
  accentCor: string;
  icon: string;
}) {
  return (
    <div style={S.kpi}>
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg,${accentCor},transparent)`,
        }}
      />
      <div style={S.kpiBody}>
        <div style={S.kpiIconRow}>
          <div style={S.kpiIcon(accentCor)}>{icon}</div>
          <span style={S.kpiLabel}>{label}</span>
        </div>
        <div style={S.kpiValue}>{valor}</div>
        {delta && (
          <div style={S.kpiDelta}>
            <span
              style={{
                color: up ? BRAND.verde : BRAND.verm,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {up ? "↑" : "↓"} {delta}
            </span>
            <span style={{ color: "#8b87a8", fontSize: 10, marginLeft: 4 }}>
              vs anterior
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SocialMediaDashboard() {
  const perm = usePermission("dash_midias_sociais");
  const [period, setPeriod] = useState<"7d" | "mes" | "ant" | "hist">("mes");
  const [carIdx, setCarIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KpiDaily[]>([]);
  const [posts, setPosts] = useState<PostUnificado[]>([]);
  const [formatos, setFormatos] = useState<{ tipo: string; total: number }[]>([]);
  const [funilTotais, setFunilTotais] = useState<{ visitas: number; registros: number; ftds: number; ftd_total: number } | null>(null);
  const [campanhasPerf, setCampanhasPerf] = useState<Array<{
    campanha_id: string; campanha_nome: string; visitas: number; registros: number; ftds: number;
    ftd_total: number; deposit_total: number; withdrawal_total: number; utms_count: number;
  }>>([]);

  const hoje = new Date();
  const { start, end, label } = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    if (period === "7d") {
      const end = new Date(hoje);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return {
        start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
        label: "Últimos 7 dias",
      };
    }
    if (period === "mes") {
      const m = hoje.getMonth();
      const y = hoje.getFullYear();
      return {
        start: `${y}-${pad(m + 1)}-01`,
        end: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
        label: `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m]} ${y}`,
      };
    }
    if (period === "ant") {
      const m = hoje.getMonth() - 1;
      const y = m < 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
      const mes = m < 0 ? 11 : m;
      return {
        start: `${m < 0 ? y : hoje.getFullYear()}-${pad(mes + 1)}-01`,
        end: `${m < 0 ? y : hoje.getFullYear()}-${pad(mes + 1)}-${pad(new Date(m < 0 ? y : hoje.getFullYear(), mes + 1, 0).getDate())}`,
        label: `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][mes]} ${m < 0 ? y : hoje.getFullYear()}`,
      };
    }
    return {
      start: "2026-01-01",
      end: hoje.toISOString().slice(0, 10),
      label: "Todo o período",
    };
  }, [period, hoje]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: kpi } = await supabase
        .from("kpi_daily")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (cancelled) return;
      setKpiData((kpi as KpiDaily[]) ?? []);

      const [igRes, fbRes, ytRes] = await Promise.all([
        supabase
          .from("instagram_posts")
          .select("date,type,caption,likes,comments,saves,impressions,permalink,thumbnail_url")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false })
          .limit(100),
        supabase
          .from("facebook_posts")
          .select("date,type,message,reactions,comments,impressions,permalink,thumbnail_url")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false })
          .limit(100),
        supabase
          .from("youtube_videos")
          .select("date,type,title,views,likes,comments,video_id")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false })
          .limit(100),
      ]);

      if (cancelled) return;

      const ig = (igRes.data ?? []) as Array<{
        date: string;
        type: string;
        caption: string | null;
        likes: number | null;
        comments: number | null;
        saves: number | null;
        impressions: number | null;
        permalink: string | null;
        thumbnail_url: string | null;
      }>;
      const fb = (fbRes.data ?? []) as Array<{
        date: string;
        type: string;
        message: string | null;
        reactions: number | null;
        comments: number | null;
        impressions: number | null;
        permalink: string | null;
        thumbnail_url: string | null;
      }>;
      const yt = (ytRes.data ?? []) as Array<{
        date: string;
        type: string;
        title: string | null;
        views: number | null;
        likes: number | null;
        comments: number | null;
        video_id: string;
      }>;

      const tipoMap: Record<string, string> = {
        REELS: "Reels",
        VIDEO: "Vídeo",
        CAROUSEL_ALBUM: "Carrossel",
        IMAGE: "Foto",
        photo: "Foto",
        video: "Vídeo",
        link: "Link",
        status: "Status",
        short: "Short",
        live: "Live",
        upload: "Upload",
      };
      const formatoCount: Record<string, number> = {};
      const unificar = <T extends { date: string; type: string }>(
        arr: T[],
        canal: string,
        cor: string,
        tag: string,
        getResumo: (r: T) => string,
        getStats: (r: T) => string[],
        getUrl: (r: T) => string | null,
        getThumbnail: (r: T) => string | null
      ): PostUnificado[] =>
        arr.map((r) => {
          const tipo = tipoMap[r.type] ?? r.type ?? "Post";
          formatoCount[tipo] = (formatoCount[tipo] ?? 0) + 1;
          return {
            canal,
            tipo,
            cor,
            tag,
            resumo: getResumo(r),
            stats: getStats(r),
            date: r.date,
            url: getUrl(r),
            thumbnailUrl: getThumbnail(r),
          };
        });

      const postsUnif: PostUnificado[] = [
        ...unificar(
          ig,
          "Instagram",
          "#E1306C",
          "IG",
          (r) => (r.caption ?? "").slice(0, 80),
          (r) => [`♥ ${fmtNum(r.likes)}`, `💬 ${fmtNum(r.comments)}`, r.saves != null ? `🔖 ${fmtNum(r.saves)}` : ""].filter(Boolean),
          (r) => r.permalink,
          (r) => r.thumbnail_url
        ),
        ...unificar(
          fb,
          "Facebook",
          "#1877F2",
          "FB",
          (r) => (r.message ?? "").slice(0, 80),
          (r) => [`♥ ${fmtNum(r.reactions)}`, `💬 ${fmtNum(r.comments)}`],
          (r) => r.permalink,
          (r) => r.thumbnail_url
        ),
        ...unificar(
          yt,
          "YouTube",
          "#FF0000",
          "YT",
          (r) => (r.title ?? "").slice(0, 80),
          (r) => [`▶ ${fmtNum(r.views)}`, `♥ ${fmtNum(r.likes)}`, `💬 ${fmtNum(r.comments)}`],
          (r) => (r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null),
          (r) => (r.video_id ? `https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg` : null)
        ),
      ].sort((a, b) => b.date.localeCompare(a.date));

      setPosts(postsUnif);
      setFormatos(
        Object.entries(formatoCount)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
      );

      const [funilRes, campRes] = await Promise.all([
        supabase.rpc("get_campanha_funil_totais", {
          p_data_inicio: start,
          p_data_fim: end,
          p_operadora_slug: null,
        }),
        supabase.rpc("get_campanhas_performance", {
          p_data_inicio: start,
          p_data_fim: end,
          p_operadora_slug: null,
        }),
      ]);
      if (!cancelled) {
        const fr = funilRes.data as Array<{ visitas: number; registros: number; ftds: number; ftd_total: number }> | null;
        setFunilTotais(fr && fr.length > 0 ? fr[0] : null);
        setCampanhasPerf((campRes.data as Array<{
          campanha_id: string; campanha_nome: string; visitas: number; registros: number; ftds: number;
          ftd_total: number; deposit_total: number; withdrawal_total: number; utms_count: number;
        }>) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const totais = useMemo(() => {
    const byCh: Record<string, KpiDaily[]> = {};
    for (const r of kpiData) {
      if (!byCh[r.channel]) byCh[r.channel] = [];
      byCh[r.channel].push(r);
    }
    const sum = (arr: KpiDaily[], field: keyof KpiDaily) =>
      arr.reduce((a, r) => a + (Number(r[field]) || 0), 0);
    const last = (arr: KpiDaily[], field: keyof KpiDaily) => {
      const v = arr[arr.length - 1]?.[field];
      return v != null ? Number(v) : null;
    };
    return {
      seguidores: Object.values(byCh).reduce((a, arr) => a + (last(arr, "followers") || 0), 0),
      impressoes: Object.values(byCh).reduce((a, arr) => a + sum(arr, "impressions"), 0),
      engagements: Object.values(byCh).reduce((a, arr) => a + sum(arr, "engagements"), 0),
      link_clicks: Object.values(byCh).reduce((a, arr) => a + sum(arr, "link_clicks"), 0),
      byChannel: byCh,
    };
  }, [kpiData]);

  const totalImpr = totais.impressoes || 1;
  const engMedio =
    totalImpr > 0 && totais.engagements != null
      ? (totais.engagements / totalImpr) * 100
      : null;

  const lastVal = (arr: KpiDaily[], field: keyof KpiDaily): number | null => {
    const v = arr[arr.length - 1]?.[field];
    return v != null ? Number(v) : null;
  };
  const sumVal = (arr: KpiDaily[], field: keyof KpiDaily): number =>
    arr.reduce((a, r) => a + (Number(r[field]) || 0), 0);

  const channelConfig = [
    {
      channel: "instagram",
      nome: "Instagram",
      cor: "#E1306C",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores", val: fmtNum(lastVal(byCh, "followers")) },
        { label: "Alcance", val: fmtNum(sumVal(byCh, "reach")) },
        { label: "Impressões", val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Engajamento", val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Taxa eng.", val: fmtPct(lastVal(byCh, "engagement_rate")) },
      ],
    },
    {
      channel: "facebook",
      nome: "Facebook",
      cor: "#1877F2",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores", val: fmtNum(lastVal(byCh, "followers")) },
        { label: "Alcance", val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Impressões", val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Reações", val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Cliques", val: fmtNum(sumVal(byCh, "link_clicks")) },
      ],
    },
    {
      channel: "youtube",
      nome: "YouTube",
      cor: "#FF0000",
      stats: (byCh: KpiDaily[]) => [
        { label: "Inscritos", val: fmtNum(lastVal(byCh, "followers")) },
        { label: "Visualizações", val: fmtNum(sumVal(byCh, "video_views")) },
        { label: "Impressões", val: fmtNum(sumVal(byCh, "impressions")) },
        { label: "Engajamento", val: fmtNum(sumVal(byCh, "engagements")) },
        { label: "Taxa eng.", val: fmtPct(lastVal(byCh, "engagement_rate")) },
      ],
    },
  ];

  const carW = 175 + 12;
  const carMax = Math.max(0, posts.length - 3);

  const totalFormatos = formatos.reduce((a, f) => a + f.total, 0);

  if (perm.canView === "nao") {
    return (
      <div style={S.wrap}>
        <div style={S.loading}>Sem permissão para visualizar este dashboard.</div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      {/* NAV BAR */}
      <div style={S.navBar}>
        <button
          style={S.navBtn(period === "hist" || period === "7d")}
          onClick={() =>
            setPeriod((p) => (p === "mes" ? "ant" : p === "ant" ? "ant" : p))
          }
          disabled={period === "hist" || period === "7d"}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={S.navTitle}>{label}</span>
        <button
          style={S.navBtn(period === "hist" || period === "mes")}
          onClick={() =>
            setPeriod((p) => (p === "ant" ? "mes" : p === "7d" ? "mes" : p))
          }
          disabled={period === "hist" || period === "mes"}
        >
          <ChevronRight size={14} />
        </button>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            style={S.pill(period === p.id)}
            onClick={() => setPeriod(p.id as typeof period)}
          >
            {p.id === "hist" && <Clock size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={S.loading}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs GERAIS */}
          <div style={S.card}>
            <SectionTitle icon="♠" sub="· dados do ETL Social KPIs">
              KPIs de mídias sociais
            </SectionTitle>
            <div style={S.kpiGrid4}>
              <KpiCard
                label="Seguidores totais"
                valor={fmtNum(totais.seguidores)}
                accentCor={BRAND.roxo}
                icon="◈"
              />
              <KpiCard
                label="Impressões totais"
                valor={fmtNum(totais.impressoes)}
                accentCor={BRAND.azul}
                icon="◉"
              />
              <KpiCard
                label="Engajamento médio"
                valor={engMedio != null ? `${engMedio.toFixed(1)}%` : "—"}
                accentCor={BRAND.ciano}
                icon="⬡"
              />
              <KpiCard
                label="Cliques para o site"
                valor={fmtNum(totais.link_clicks)}
                accentCor={BRAND.verde}
                icon="↗"
              />
            </div>
          </div>

          {/* CANAIS */}
          <div style={S.chGrid}>
            {channelConfig.map((cfg) => {
              const byCh = totais.byChannel[cfg.channel] ?? [];
              const stats = cfg.stats(byCh);
              const engVal = byCh.length
                ? (byCh[byCh.length - 1]?.engagement_rate ?? 0) * 100
                : 0;
              return (
                <div key={cfg.channel} style={S.chCard}>
                  <div style={{ height: 3, background: cfg.cor }} />
                  <div style={S.chBody}>
                    <div style={S.chHeaderRow}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: cfg.cor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={S.chName}>{cfg.nome}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: `${cfg.cor}22`,
                          border: `1px solid ${cfg.cor}44`,
                          color: cfg.cor,
                        }}
                      >
                        Eng. {engVal.toFixed(1)}%
                      </span>
                    </div>
                    {stats.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          ...S.chStat,
                          borderBottom:
                            i === stats.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span style={{ color: "#8b87a8" }}>{s.label}</span>
                        <span style={{ fontWeight: 600, color: "#f0eefc" }}>
                          {s.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ENGAJAMENTO POR FORMATO + FUNIL (lado a lado) */}
          <div style={S.twoCol}>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <SectionTitle icon="▤">Engajamento por formato</SectionTitle>
              {formatos.length > 0 ? (
                formatos.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      ...S.barRow,
                      borderBottom:
                        i === formatos.length - 1
                          ? "none"
                          : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ color: "#8b87a8", flex: 1 }}>{f.tipo}</span>
                    <div
                      style={{
                        width: 90,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 3,
                        height: 7,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: `${totalFormatos > 0 ? (f.total / totalFormatos) * 100 : 0}%`,
                          height: 7,
                          borderRadius: 3,
                          background: [BRAND.roxo, BRAND.azul, BRAND.ciano, "#5a5678"][
                            i % 4
                          ],
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#f0eefc",
                        minWidth: 36,
                        textAlign: "right",
                      }}
                    >
                      {f.total} posts
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: "#8b87a8", fontSize: 12, padding: "8px 0" }}>
                  Sem dados de posts no período.
                </div>
              )}
            </div>
            <div style={{ ...S.card, marginBottom: 0 }}>
              <SectionTitle icon="▽">Funil de conversão</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Cliques", valor: totais.link_clicks ?? 0, cor: BRAND.roxo },
                  { label: "Acessos", valor: funilTotais?.visitas ?? 0, cor: BRAND.azul },
                  { label: "Registros", valor: funilTotais?.registros ?? 0, cor: BRAND.ciano },
                  { label: "FTDs", valor: funilTotais?.ftds ?? 0, cor: BRAND.verde },
                ].map((f, i) => (
                  <div key={i} style={S.barRow}>
                    <span style={{ color: "#8b87a8", flex: 1 }}>{f.label}</span>
                    <span style={{ fontWeight: 700, color: "#f0eefc", minWidth: 48, textAlign: "right" }}>
                      {fmtNum(f.valor)}
                    </span>
                  </div>
                ))}
                {funilTotais && funilTotais.ftd_total > 0 && (
                  <div style={{ ...S.barRow, borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4, paddingTop: 10 }}>
                    <span style={{ color: "#8b87a8", flex: 1 }}>R$ FTDs</span>
                    <span style={{ fontWeight: 700, color: BRAND.verde, minWidth: 80, textAlign: "right" }}>
                      {funilTotais.ftd_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: "#5a5678" }}>
                Cliques: kpi_daily. Acessos/Registros/FTDs: UTMs mapeadas às campanhas.
              </div>
            </div>
          </div>

          {/* CAMPANHAS — PERFORMANCE */}
          <div style={S.card}>
            <SectionTitle icon="▣">Campanhas — Performance de conversão</SectionTitle>
            {campanhasPerf.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Campanha</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>UTMs</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Acessos</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Registros</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>FTDs</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#8b87a8", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>R$ FTDs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campanhasPerf.map((c, i) => (
                      <tr key={c.campanha_id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        <td style={{ padding: "10px 12px", color: "#f0eefc", fontWeight: 600 }}>{c.campanha_nome}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#8b87a8" }}>{c.utms_count}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#f0eefc" }}>{fmtNum(c.visitas)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#f0eefc" }}>{fmtNum(c.registros)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: BRAND.verde, fontWeight: 600 }}>{fmtNum(c.ftds)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: BRAND.verde, fontWeight: 600 }}>
                          {(c.ftd_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: "#8b87a8", fontSize: 12, padding: "24px 0" }}>
                Nenhuma campanha com UTMs mapeadas no período. Cadastre campanhas e mapeie UTMs na Gestão de Links.
              </div>
            )}
          </div>

          {/* CARROSSEL POSTAGENS */}
          <div style={S.card}>
            <SectionTitle icon="▦">Postagens recentes</SectionTitle>
            {posts.length > 0 ? (
              <>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      transform: `translateX(-${carIdx * carW}px)`,
                      transition: "transform .3s ease",
                    }}
                  >
                    {posts.map((p, i) => (
                      <div key={i} style={S.postCard}>
                        <div
                          style={{
                            ...S.postImg,
                            background: `${p.cor}18`,
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          {p.thumbnailUrl && (
                            <img
                              src={p.thumbnailUrl}
                              alt=""
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg width="44" height="44" viewBox="0 0 44 44">
                              <rect width="44" height="44" rx="10" fill={p.cor} opacity=".2" />
                              <text x="22" y="28" textAnchor="middle" fontSize="16" fill={p.cor} fontFamily="Inter">
                                {p.tag}
                              </text>
                            </svg>
                          </div>
                        </div>
                        <div style={S.postBody}>
                          <div
                            style={{
                              ...S.postChannel,
                              color: p.cor,
                            }}
                          >
                            {p.url ? (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "inherit",
                                  textDecoration: "none",
                                  cursor: "pointer",
                                  borderBottom: "1px dotted currentColor",
                                }}
                                title="Abrir post"
                              >
                                {p.canal} · {p.tipo}
                              </a>
                            ) : (
                              <>{p.canal} · {p.tipo}</>
                            )}
                          </div>
                          <div style={S.postCaption}>
                            {p.resumo || `Post de ${p.date}`}
                          </div>
                          <div style={S.postStats}>
                            {p.stats.map((s, j) => (
                              <span key={j}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  <button
                    onClick={() => setCarIdx((i) => Math.max(0, i - 1))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#f0eefc",
                      cursor: "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCarIdx((i) => Math.min(carMax, i + 1))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "#f0eefc",
                      cursor: "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    →
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: "#8b87a8", fontSize: 12, padding: "8px 0" }}>
                Sem postagens no período.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
