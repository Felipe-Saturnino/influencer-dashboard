import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  GiPokerHand,
  GiMicrophone,
  GiStarMedal,
  GiPlayerNext,
  GiShield,
  GiFilmProjector,
  GiCalendar,
} from "react-icons/gi";

// ─── BRAND COLORS (Brand Guide Spin Gaming) ───────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  ciano:    "#70cae4",
  verde:    "#22c55e",
  amarelo:  "#f59e0b",
} as const;

// Fonte NHD Bold para títulos
const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── CONSTANTES DE MÊS ────────────────────────────────────────────────────────
const MES_INICIO = { ano: 2026, mes: 0 }; // Janeiro 2026 — dados de mídias começam aqui
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

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

function getDatasDoMes(ano: number, mes: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${ano}-${pad(mes + 1)}-01`,
    end:   `${ano}-${pad(mes + 1)}-${pad(new Date(ano, mes + 1, 0).getDate())}`,
  };
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

// ─── COMPONENTE: SECTION TITLE (padrão do Overview) ──────────────────────────
function SectionTitle({
  icon,
  children,
  sub,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  sub?: string;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: "rgba(74,32,130,0.18)",
        border: "1px solid rgba(74,32,130,0.30)",
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
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── KPI CARD (alinhado ao padrão do Overview) ───────────────────────────────
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
  icon: React.ReactNode;
}) {
  const { theme: t } = useApp();
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${t.cardBorder}`,
      background: t.cardBg,
      overflow: "hidden",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentCor}, transparent)` }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${accentCor}20`,
            border: `1px solid ${accentCor}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentCor, flexShrink: 0, fontSize: 15,
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
        {delta && (
          <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, fontFamily: FONT.body }}>
            <span style={{ color: up ? BRAND.verde : BRAND.vermelho, fontWeight: 700, fontSize: 11 }}>
              {up ? "↑" : "↓"} {delta}
            </span>
            <span style={{ color: t.textMuted, fontSize: 10, marginLeft: 4 }}>vs anterior</span>
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
  const [idxMes, setIdxMes]       = useState(idxInicial >= 0 ? idxInicial : Math.max(0, mesesDisponiveis.length - 1));
  const [historico, setHistorico] = useState(false);

  const mesSelecionado = mesesDisponiveis[idxMes];

  // Guard: se não houver períodos (ex.: data do sistema antes de Jan/26)
  if (mesesDisponiveis.length === 0 || !mesSelecionado) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Nenhum período disponível para exibição.
      </div>
    );
  }

  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  function irMesAnterior() { if (!historico && !isPrimeiro) setIdxMes((i) => i - 1); }
  function irMesProximo()  { if (!historico && !isUltimo)  setIdxMes((i) => i + 1); }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : Math.max(0, mesesDisponiveis.length - 1));
    } else {
      setHistorico(true);
    }
  }

  // Datas do período selecionado
  const { start, end } = useMemo(() => {
    if (historico) {
      return { start: "2026-01-01", end: hoje.toISOString().slice(0, 10) };
    }
    return getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
  }, [historico, mesSelecionado]);

  const label = historico ? "Todo o período" : (mesSelecionado?.label ?? "");

  // ── Estados de dados ──────────────────────────────────────────────────────────
  const [carIdx,   setCarIdx]   = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [kpiData,  setKpiData]  = useState<KpiDaily[]>([]);
  const [posts,    setPosts]    = useState<PostUnificado[]>([]);
  const [formatos, setFormatos] = useState<{ tipo: string; total: number }[]>([]);
  const [funilTotais, setFunilTotais] = useState<{
    visitas: number; registros: number; ftds: number; ftd_total: number;
  } | null>(null);
  const [campanhasPerf, setCampanhasPerf] = useState<Array<{
    campanha_id: string;
    campanha_nome: string;
    operadora_slug: string | null;
    visitas: number;
    registros: number;
    ftds: number;
    ftd_total: number;
    deposit_total: number;
    withdrawal_total: number;
    utms_count: number;
  }>>([]);

  // ── Busca de dados ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setCarIdx(0);

      const { data: kpi } = await supabase
        .from("kpi_daily")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (cancelled) return;
      setKpiData((kpi as KpiDaily[]) ?? []);

      const [igRes, fbRes, ytRes] = await Promise.all([
        supabase.from("instagram_posts")
          .select("date,type,caption,likes,comments,saves,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(100),
        supabase.from("facebook_posts")
          .select("date,type,message,reactions,comments,impressions,permalink,thumbnail_url")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(100),
        supabase.from("youtube_videos")
          .select("date,type,title,views,likes,comments,video_id")
          .gte("date", start).lte("date", end)
          .order("date", { ascending: false }).limit(100),
      ]);

      if (cancelled) return;

      const ig = (igRes.data ?? []) as Array<{
        date: string; type: string; caption: string | null;
        likes: number | null; comments: number | null; saves: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const fb = (fbRes.data ?? []) as Array<{
        date: string; type: string; message: string | null;
        reactions: number | null; comments: number | null;
        impressions: number | null; permalink: string | null; thumbnail_url: string | null;
      }>;
      const yt = (ytRes.data ?? []) as Array<{
        date: string; type: string; title: string | null;
        views: number | null; likes: number | null; comments: number | null; video_id: string;
      }>;

      const tipoMap: Record<string, string> = {
        REELS: "Reels", VIDEO: "Vídeo", CAROUSEL_ALBUM: "Carrossel",
        IMAGE: "Foto", photo: "Foto", video: "Vídeo", link: "Link",
        status: "Status", short: "Short", live: "Live", upload: "Upload",
      };

      const formatoCount: Record<string, number> = {};

      const unificar = <T extends { date: string; type: string }>(
        arr: T[], canal: string, cor: string, tag: string,
        getResumo: (r: T) => string,
        getStats: (r: T) => string[],
        getUrl: (r: T) => string | null,
        getThumbnail: (r: T) => string | null
      ): PostUnificado[] =>
        arr.map((r) => {
          const tipo = tipoMap[r.type] ?? r.type ?? "Post";
          formatoCount[tipo] = (formatoCount[tipo] ?? 0) + 1;
          return { canal, tipo, cor, tag, resumo: getResumo(r), stats: getStats(r), date: r.date, url: getUrl(r), thumbnailUrl: getThumbnail(r) };
        });

      const postsUnif: PostUnificado[] = [
        ...unificar(ig, "Instagram", "#E1306C", "IG",
          (r) => (r.caption ?? "").slice(0, 80),
          (r) => [`♥ ${fmtNum(r.likes)}`, `💬 ${fmtNum(r.comments)}`, r.saves != null ? `🔖 ${fmtNum(r.saves)}` : ""].filter(Boolean),
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(fb, "Facebook", "#1877F2", "FB",
          (r) => (r.message ?? "").slice(0, 80),
          (r) => [`♥ ${fmtNum(r.reactions)}`, `💬 ${fmtNum(r.comments)}`],
          (r) => r.permalink, (r) => r.thumbnail_url),
        ...unificar(yt, "YouTube", "#FF0000", "YT",
          (r) => (r.title ?? "").slice(0, 80),
          (r) => [`▶ ${fmtNum(r.views)}`, `♥ ${fmtNum(r.likes)}`, `💬 ${fmtNum(r.comments)}`],
          (r) => (r.video_id ? `https://www.youtube.com/watch?v=${r.video_id}` : null),
          (r) => (r.video_id ? `https://img.youtube.com/vi/${r.video_id}/mqdefault.jpg` : null)),
      ].sort((a, b) => b.date.localeCompare(a.date));

      setPosts(postsUnif);
      setFormatos(
        Object.entries(formatoCount)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total)
      );

      const [funilRes, campRes] = await Promise.all([
        supabase.rpc("get_campanha_funil_totais", { p_data_inicio: start, p_data_fim: end, p_operadora_slug: null }),
        supabase.rpc("get_campanhas_performance",  { p_data_inicio: start, p_data_fim: end, p_operadora_slug: null }),
      ]);

      if (!cancelled) {
        const fr = funilRes.data as Array<{ visitas: number; registros: number; ftds: number; ftd_total: number }> | null;
        setFunilTotais(fr && fr.length > 0 ? fr[0] : null);
        setCampanhasPerf((campRes.data as typeof campanhasPerf) ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [start, end]);

  // ── Totais agregados ──────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    const byCh: Record<string, KpiDaily[]> = {};
    for (const r of kpiData) {
      if (!byCh[r.channel]) byCh[r.channel] = [];
      byCh[r.channel].push(r);
    }
    const sum  = (arr: KpiDaily[], f: keyof KpiDaily) => arr.reduce((a, r) => a + (Number(r[f]) || 0), 0);
    const last = (arr: KpiDaily[], f: keyof KpiDaily) => { const v = arr[arr.length - 1]?.[f]; return v != null ? Number(v) : null; };
    return {
      seguidores:   Object.values(byCh).reduce((a, arr) => a + (last(arr, "followers") || 0), 0),
      impressoes:   Object.values(byCh).reduce((a, arr) => a + sum(arr, "impressions"), 0),
      engagements:  Object.values(byCh).reduce((a, arr) => a + sum(arr, "engagements"), 0),
      link_clicks:  Object.values(byCh).reduce((a, arr) => a + sum(arr, "link_clicks"), 0),
      byChannel: byCh,
    };
  }, [kpiData]);

  const totalImpr = totais.impressoes || 1;
  const engMedio  = totalImpr > 0 && totais.engagements != null
    ? (totais.engagements / totalImpr) * 100
    : null;

  const lastVal = (arr: KpiDaily[], f: keyof KpiDaily): number | null => {
    const v = arr[arr.length - 1]?.[f]; return v != null ? Number(v) : null;
  };
  const sumVal = (arr: KpiDaily[], f: keyof KpiDaily): number =>
    arr.reduce((a, r) => a + (Number(r[f]) || 0), 0);

  const channelConfig = [
    {
      channel: "instagram", nome: "Instagram", cor: "#E1306C",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))    },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "reach"))         },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions"))   },
        { label: "Engajamento", val: fmtNum(sumVal(byCh, "engagements"))   },
        { label: "Taxa eng.",   val: fmtPct(lastVal(byCh, "engagement_rate")) },
      ],
    },
    {
      channel: "facebook", nome: "Facebook", cor: "#1877F2",
      stats: (byCh: KpiDaily[]) => [
        { label: "Seguidores",  val: fmtNum(lastVal(byCh, "followers"))    },
        { label: "Alcance",     val: fmtNum(sumVal(byCh, "impressions"))   },
        { label: "Impressões",  val: fmtNum(sumVal(byCh, "impressions"))   },
        { label: "Reações",     val: fmtNum(sumVal(byCh, "engagements"))   },
        { label: "Cliques",     val: fmtNum(sumVal(byCh, "link_clicks"))   },
      ],
    },
    {
      channel: "youtube", nome: "YouTube", cor: "#FF0000",
      stats: (byCh: KpiDaily[]) => [
        { label: "Inscritos",       val: fmtNum(lastVal(byCh, "followers"))    },
        { label: "Visualizações",   val: fmtNum(sumVal(byCh, "video_views"))   },
        { label: "Impressões",      val: fmtNum(sumVal(byCh, "impressions"))   },
        { label: "Engajamento",     val: fmtNum(sumVal(byCh, "engagements"))   },
        { label: "Taxa eng.",       val: fmtPct(lastVal(byCh, "engagement_rate")) },
      ],
    },
  ];

  const carW   = 175 + 12;
  const carMax = Math.max(0, posts.length - 3);
  const totalFormatos = formatos.reduce((a, f) => a + f.total, 0);

  // ── Estilos base ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: t.cardBg,
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

  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 10, letterSpacing: "0.1em",
    textTransform: "uppercase", color: t.textMuted, fontWeight: 600,
    padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.10)", fontFamily: FONT.body, whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px", fontSize: 13,
    borderBottom: `1px solid ${t.cardBorder}`,
    color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Sem permissão para visualizar este dashboard.
      </div>
    );
  }

  return (
    <div style={{ background: t.bg, minHeight: "100vh", padding: "20px 24px 48px", fontFamily: FONT.body, color: t.text }}>

      {/* Barra de navegação */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14, border: `1px solid ${t.cardBorder}`,
          background: t.cardBg, padding: "12px 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, flexWrap: "wrap" as const,
        }}>
          <button style={btnNavStyle(historico || isPrimeiro)} onClick={irMesAnterior} disabled={historico || isPrimeiro}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, minWidth: 220, textAlign: "center" }}>
            {label}
          </span>
          <button style={btnNavStyle(historico || isUltimo)} onClick={irMesProximo} disabled={historico || isUltimo}>
            <ChevronRight size={14} />
          </button>
          <button
            onClick={toggleHistorico}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              fontFamily: FONT.body, fontSize: 13,
              border: historico ? `1px solid ${BRAND.roxoVivo}` : `1px solid ${t.cardBorder}`,
              background: historico ? "rgba(124,58,237,0.15)" : "transparent",
              color: historico ? BRAND.roxoVivo : t.textMuted,
              fontWeight: historico ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            <GiCalendar size={15} />
            Histórico
          </button>
          {loading && (
            <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={12} /> Carregando...
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: t.textMuted, fontSize: 14 }}>
          Carregando dados...
        </div>
      ) : (
        <>
          {/* KPIs GERAIS */}
          <div style={card}>
            <SectionTitle icon={<GiPokerHand size={14} />} sub="· dados do ETL Social KPIs">
              KPIs de Mídias Sociais
            </SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
              <KpiCard label="Seguidores totais"  valor={fmtNum(totais.seguidores)}  accentCor={BRAND.roxo}     icon={<GiMicrophone size={15} />} />
              <KpiCard label="Impressões totais"  valor={fmtNum(totais.impressoes)}  accentCor={BRAND.azul}     icon={<GiStarMedal size={15} />}  />
              <KpiCard label="Engajamento médio"  valor={engMedio != null ? `${engMedio.toFixed(1)}%` : "—"} accentCor={BRAND.ciano} icon={<GiPokerHand size={15} />} />
              <KpiCard label="Cliques para o site" valor={fmtNum(totais.link_clicks)} accentCor={BRAND.verde}   icon={<GiPlayerNext size={15} />} />
            </div>
          </div>

          {/* Cards por canal */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 14 }}>
            {channelConfig.map((cfg) => {
              const byCh   = totais.byChannel[cfg.channel] ?? [];
              const stats  = cfg.stats(byCh);
              const engVal = byCh.length ? (byCh[byCh.length - 1]?.engagement_rate ?? 0) * 100 : 0;
              return (
                <div key={cfg.channel} style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: t.cardBg, overflow: "hidden" }}>
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
                </div>
              );
            })}
          </div>

          {/* Engajamento por formato + Funil */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div style={{ ...card, marginBottom: 0 }}>
              <SectionTitle icon={<GiStarMedal size={14} />}>Engajamento por formato</SectionTitle>
              {formatos.length > 0 ? (
                formatos.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: i === formatos.length - 1 ? "none" : `1px solid ${t.cardBorder}` }}>
                    <span style={{ color: t.textMuted, flex: 1 }}>{f.tipo}</span>
                    <div style={{ width: 90, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 3, height: 7, flexShrink: 0 }}>
                      <div style={{ width: `${totalFormatos > 0 ? (f.total / totalFormatos) * 100 : 0}%`, height: 7, borderRadius: 3, background: [BRAND.roxo, BRAND.azul, BRAND.ciano, "#5a5678"][i % 4] }} />
                    </div>
                    <span style={{ fontWeight: 600, color: t.text, minWidth: 52, textAlign: "right" }}>{f.total} posts</span>
                  </div>
                ))
              ) : (
                <div style={{ color: t.textMuted, fontSize: 12, padding: "8px 0" }}>Sem dados de posts no período.</div>
              )}
            </div>
            <div style={{ ...card, marginBottom: 0 }}>
              <SectionTitle icon={<GiPlayerNext size={14} />}>Funil de conversão</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Cliques",    valor: totais.link_clicks ?? 0,   cor: BRAND.roxo   },
                  { label: "Acessos",    valor: funilTotais?.visitas ?? 0,  cor: BRAND.azul   },
                  { label: "Registros",  valor: funilTotais?.registros ?? 0, cor: BRAND.ciano },
                  { label: "FTDs",       valor: funilTotais?.ftds ?? 0,     cor: BRAND.verde  },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, fontFamily: FONT.body, borderBottom: `1px solid ${t.cardBorder}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.cor, flexShrink: 0 }} />
                    <span style={{ color: t.textMuted, flex: 1 }}>{f.label}</span>
                    <span style={{ fontWeight: 700, color: t.text, minWidth: 48, textAlign: "right" }}>{fmtNum(f.valor)}</span>
                  </div>
                ))}
                {funilTotais && funilTotais.ftd_total > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, fontFamily: FONT.body, borderTop: `1px solid ${t.cardBorder}`, marginTop: 4, paddingTop: 10 }}>
                    <span style={{ color: t.textMuted, flex: 1 }}>R$ FTDs</span>
                    <span style={{ fontWeight: 700, color: BRAND.verde, minWidth: 80, textAlign: "right" }}>
                      {funilTotais.ftd_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
                Cliques: kpi_daily. Acessos/Registros/FTDs: UTMs mapeadas às campanhas.
              </div>
            </div>
          </div>

          {/* Campanhas — Performance */}
          <div style={card}>
            <SectionTitle icon={<GiShield size={14} />}>Campanhas — Performance de conversão</SectionTitle>
            {campanhasPerf.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.cardBorder}` }}>
                  <thead>
                    <tr>
                      {["Campanha","UTMs","Acessos","Registros","FTDs","R$ FTDs"].map((h, i) => (
                        <th key={h} style={{ ...thStyle, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campanhasPerf.map((c, i) => (
                      <tr key={c.campanha_id} style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent" }}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{c.campanha_nome}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: t.textMuted }}>{c.utms_count}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(c.visitas)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(c.registros)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: BRAND.verde, fontWeight: 600 }}>{fmtNum(c.ftds)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: BRAND.verde, fontWeight: 600 }}>
                          {(c.ftd_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
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

          {/* Carrossel postagens */}
          <div style={card}>
            <SectionTitle icon={<GiFilmProjector size={14} />}>Postagens recentes</SectionTitle>
            {posts.length > 0 ? (
              <>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 12, transform: `translateX(-${carIdx * carW}px)`, transition: "transform .3s ease" }}>
                    {posts.map((p, i) => (
                      <div key={i} style={{ flex: "0 0 175px", borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", overflow: "hidden" }}>
                        <div style={{ width: "100%", height: 108, display: "flex", alignItems: "center", justifyContent: "center", background: `${p.cor}18`, overflow: "hidden", position: "relative" }}>
                          {p.thumbnailUrl && (
                            <img src={p.thumbnailUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                          )}
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="44" height="44" viewBox="0 0 44 44">
                              <rect width="44" height="44" rx="10" fill={p.cor} opacity=".2" />
                              <text x="22" y="28" textAnchor="middle" fontSize="16" fill={p.cor} fontFamily={FONT.body}>{p.tag}</text>
                            </svg>
                          </div>
                        </div>
                        <div style={{ padding: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 4, color: p.cor }}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", borderBottom: "1px dotted currentColor" }}>
                                {p.canal} · {p.tipo}
                              </a>
                            ) : <>{p.canal} · {p.tipo}</>}
                          </div>
                          {/* Truncagem em 2 linhas — verifique após build se WebkitBoxOrient não foi removida */}
                          <div style={{
                            fontSize: 11, color: t.textMuted, lineHeight: 1.4, marginBottom: 8,
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as "vertical",
                            overflow: "hidden", fontFamily: FONT.body,
                          }}>
                            {p.resumo || `Post de ${p.date}`}
                          </div>
                          <div style={{ display: "flex", gap: 10, fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
                            {p.stats.map((s, j) => <span key={j}>{s}</span>)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 10 }}>
                  <button onClick={() => setCarIdx((i) => Math.max(0, i - 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ←
                  </button>
                  <button onClick={() => setCarIdx((i) => Math.min(carMax, i + 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${t.cardBorder}`, background: "transparent", color: t.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    →
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: t.textMuted, fontSize: 12, padding: "8px 0", fontFamily: FONT.body }}>
                Sem postagens no período.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
