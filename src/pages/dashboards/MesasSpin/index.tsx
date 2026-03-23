import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ChevronLeft, ChevronRight, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  GiPokerHand,
  GiCoins,
  GiTrophy,
  GiPerson,
  GiCalendar,
  GiShield,
} from "react-icons/gi";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:      "#4a2082",
  roxoVivo:  "#7c3aed",
  azul:      "#1e36f8",
  vermelho:  "#e84025",
  verde:     "#22c55e",
  ciano:     "#70cae4",
  amarelo:   "#f59e0b",
  rosa:      "#ec4899",
} as const;

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface DailyRow {
  data: string;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

interface MonthlyRow {
  mes: string;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

interface Operadora {
  slug: string;
  nome: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = 2024, mes = 0;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) { mes = 0; ano++; }
  }
  return lista;
}

function getDatasDoMes(ano: number, mes: number) {
  return { inicio: fmt(new Date(ano, mes, 1)), fim: fmt(new Date(ano, mes + 1, 0)) };
}

function getDatasDoMesMtd(ano: number, mes: number) {
  let anoAnt = ano, mesAnt = mes - 1;
  if (mesAnt < 0) { mesAnt = 11; anoAnt--; }
  const ultimoDia = new Date(anoAnt, mesAnt + 1, 0).getDate();
  const hoje = new Date();
  const dia =
    anoAnt === hoje.getFullYear() && mesAnt === hoje.getMonth()
      ? Math.min(hoje.getDate(), ultimoDia)
      : ultimoDia;
  return { inicio: fmt(new Date(anoAnt, mesAnt, 1)), fim: fmt(new Date(anoAnt, mesAnt, dia)) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLCompact(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1)}k`;
  return fmtBRL(v);
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}

const KPIS_ZERO = { bets: 0, turnover: 0, ggr: 0, uap: 0, margin_pct: 0, arpu: 0 };

// ─── SELECT COM ÍCONE (padrão Dashboard Influencer) ───────────────────────────
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

// ─── BADGE MARGEM ─────────────────────────────────────────────────────────────
function MarginBadge({ value }: { value: number | null }) {
  const { theme: t } = useApp();
  if (value == null) return <span style={{ color: t.textMuted }}>—</span>;
  const v = Number(value);
  let bg: string = "rgba(124,58,237,0.12)", color: string = BRAND.roxoVivo;
  if (v >= 5) { bg = "rgba(34,197,94,0.12)"; color = BRAND.verde; }
  else if (v < 3) { bg = "rgba(232,64,37,0.12)"; color = BRAND.vermelho; }
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      background: bg, color, fontSize: 11, fontWeight: 600, fontFamily: FONT.body,
    }}>
      {fmtPct(v)}
    </span>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon, accentVar, accentColor,
  atual, anterior, isBRL, isPct, isHistorico,
}: {
  label: string; value: string; icon: React.ReactNode; accentVar?: string; accentColor: string;
  atual: number; anterior: number; isBRL?: boolean; isPct?: boolean; isHistorico?: boolean;
}) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const neutral = Math.abs(diff) < 0.001;

  const barColor = brand.useBrand ? "var(--brand-secondary)" : accentColor;
  const barBg = `linear-gradient(90deg, ${barColor}, transparent)`;
  const iconBoxBg = brand.useBrand ? "color-mix(in srgb, var(--brand-secondary) 10%, transparent)" : `${accentColor}18`;
  const iconBoxBorder = brand.useBrand ? "1px solid color-mix(in srgb, var(--brand-secondary) 22%, transparent)" : `1px solid ${accentColor}35`;
  const iconBoxColor = brand.useBrand ? "var(--brand-secondary)" : accentColor;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${t.cardBorder}`,
      background: brand.blockBg,
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      <div style={{ height: 3, background: barBg }} />
      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: iconBoxBg,
            border: iconBoxBorder,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: iconBoxColor,
          }}>
            {icon}
          </span>
          <span style={{
            color: t.textMuted, fontSize: 10, fontFamily: FONT.body,
            fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            {label}
          </span>
        </div>

        {/* Valor principal */}
        <div style={{
          fontSize: 22, fontWeight: 800, color: t.text,
          fontFamily: FONT.body, marginBottom: 6, lineHeight: 1.1,
        }}>
          {value}
        </div>

        {/* Delta */}
        {!isHistorico && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
            {neutral ? (
              <Minus size={12} color={t.textMuted} />
            ) : up ? (
              <TrendingUp size={12} color={BRAND.verde} />
            ) : (
              <TrendingDown size={12} color={BRAND.vermelho} />
            )}
            <span style={{ color: neutral ? t.textMuted : up ? BRAND.verde : BRAND.vermelho, fontWeight: 700, fontSize: 12 }}>
              {pct !== null ? `${up && !neutral ? "+" : ""}${pct.toFixed(1)}%` : "—"}
            </span>
            <span style={{ color: t.textMuted, fontSize: 10 }}>
              vs {isPct
                ? fmtPct(anterior)
                : isBRL
                  ? fmtBRLCompact(anterior)
                  : anterior.toLocaleString("pt-BR")} mês ant.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: brand.primaryIconBg,
        border: brand.primaryIconBorder,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: brand.primaryIconColor,
      }}>
        {icon}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 800, color: brand.primary,
        fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        {title}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── PLACEHOLDER BLOCO ────────────────────────────────────────────────────────
function PlaceholderBloco({ label }: { label: string }) {
  const { theme: t } = useApp();
  return (
    <div style={{
      borderRadius: 18, border: `1.5px dashed ${t.cardBorder}`,
      background: `${t.cardBg}80`,
      padding: "32px 20px",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: t.textMuted, fontFamily: FONT.body, fontSize: 13, gap: 8,
    }}>
      <Clock size={14} />
      {label} — em breve
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MesasSpin() {
  const { theme: t } = useApp();
  const perm = usePermission("mesas_spin");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex(
    (m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth()
  );

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [idxMes, setIdxMes]           = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [operadoras, setOperadoras]   = useState<Operadora[]>([]);
  const [operadoraSel, setOperadoraSel] = useState<string>("todas");

  const [dailyData, setDailyData]     = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [kpisAnterior, setKpisAnterior] = useState(KPIS_ZERO);

  const mesSelecionado = mesesDisponiveis[idxMes];

  // ── Navegação ────────────────────────────────────────────────────────────────
  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  // ── Carregar operadoras ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome").then(({ data }) => {
      setOperadoras(data ?? []);
    });
  }, []);

  // ── Carregar dados principais ─────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      if (historico) {
        const { data: monthly } = await supabase
          .from("relatorio_monthly_summary")
          .select("mes, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
          .order("mes");
        const { data: daily } = await supabase
          .from("relatorio_daily_summary")
          .select("data, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
          .order("data");
        setMonthlyData(monthly ?? []);
        setDailyData(daily ?? []);
      } else if (mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        const { data: daily } = await supabase
          .from("relatorio_daily_summary")
          .select("data, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
          .gte("data", inicio).lte("data", fim).order("data");
        setDailyData(daily ?? []);
        setMonthlyData([]);

        // KPIs mês anterior (MTD comparável)
        const { inicio: iAnt, fim: fAnt } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
        const { data: ant } = await supabase
          .from("relatorio_daily_summary")
          .select("turnover, ggr, margin_pct, bets, uap, arpu")
          .gte("data", iAnt).lte("data", fAnt);
        const rows = ant ?? [];
        const totalAnt = rows.reduce((s, r) => ({
          bets:       s.bets + (r.bets ?? 0),
          turnover:   s.turnover + (r.turnover ?? 0),
          ggr:        s.ggr + (r.ggr ?? 0),
          uap:        s.uap + (r.uap ?? 0),
          margin_pct: 0,
          arpu:       0,
        }), KPIS_ZERO);
        // Margem e ARPU: médias ponderadas simples
        const margemMedia = rows.length > 0
          ? rows.reduce((s, r) => s + (Number(r.margin_pct) || 0), 0) / rows.length : 0;
        const arpuMedio = rows.length > 0
          ? rows.reduce((s, r) => s + (Number(r.arpu) || 0), 0) / rows.length : 0;
        setKpisAnterior({ ...totalAnt, margin_pct: margemMedia, arpu: arpuMedio });
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, mesSelecionado]);

  // ── KPIs período atual ───────────────────────────────────────────────────────
  const kpisAtual = useMemo(() => {
    const source = historico
      ? monthlyData.map((r) => ({ ...r, data: r.mes }))
      : dailyData;
    const totais = source.reduce((s, r) => ({
      bets:       s.bets + (r.bets ?? 0),
      turnover:   s.turnover + (r.turnover ?? 0),
      ggr:        s.ggr + (r.ggr ?? 0),
      uap:        s.uap + (r.uap ?? 0),
      margin_pct: 0,
      arpu:       0,
    }), KPIS_ZERO);
    const margemMedia = source.length > 0
      ? source.reduce((s, r) => s + (Number(r.margin_pct) || 0), 0) / source.length : 0;
    const arpuMedio = source.length > 0
      ? source.reduce((s, r) => s + (Number(r.arpu) || 0), 0) / source.length : 0;
    return { ...totais, margin_pct: margemMedia, arpu: arpuMedio };
  }, [historico, dailyData, monthlyData]);

  const kpisAnt = historico ? KPIS_ZERO : kpisAnterior;

  // ── Dados tabela (diário ou mensal) ──────────────────────────────────────────
  const tabelaRows = useMemo(() => {
    if (historico) {
      return monthlyData.map((r) => {
        const d = new Date(r.mes + "T12:00:00");
        return { label: `${MESES_CURTOS[d.getMonth()]} ${d.getFullYear()}`, ...r };
      });
    }
    return dailyData.map((r) => ({
      label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ...r,
    }));
  }, [historico, dailyData, monthlyData]);

  const brand = useDashboardBrand();

  // ── Estilos base ─────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 10, letterSpacing: "0.1em",
    textTransform: "uppercase", color: t.textMuted, fontWeight: 600,
    padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.08)", fontFamily: FONT.body, whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "9px 12px", fontSize: 13,
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap",
  };

  const tdNum: React.CSSProperties = { ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  const btnNav: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  // ── Permissão ────────────────────────────────────────────────────────────────
  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Mesas Spin.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 64px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 1 — FILTROS (padrão Overview Influencer)
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14, border: `1px solid ${t.cardBorder}`,
          background: brand.blockBg,
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

            {/* Navegação de mês — centralizada */}
            <button
              style={{ ...btnNav, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{
              fontSize: 18, fontWeight: 800, color: t.text,
              fontFamily: FONT.body, minWidth: 180, textAlign: "center",
            }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              style={{ ...btnNav, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
              <ChevronRight size={14} />
            </button>

            {/* Botão Histórico — padrão Overview */}
            <button
              onClick={toggleHistorico}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico ? (brand.useBrand ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)" : `${BRAND.roxoVivo}18`) : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} /> Histórico
            </button>

            {/* Filtro Operadora — SelectComIcone (padrão Dashboard Influencer) */}
            <SelectComIcone
              icon={<GiShield size={15} />}
              value={operadoraSel}
              onChange={setOperadoraSel}
              t={t}
            >
              <option value="todas">Todas as operadoras</option>
              {[...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((op) => (
                <option key={op.slug} value={op.slug}>{op.nome}</option>
              ))}
            </SelectComIcone>

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 2 — KPIs PRINCIPAIS
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionHeader
          icon={<GiPokerHand size={15} />}
          title="KPIs Principais"
          sub={!historico ? "· comparativo MTD vs mesmo período do mês anterior" : undefined}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          <KpiCard
            label="Apostas"
            value={kpisAtual.bets.toLocaleString("pt-BR")}
            icon={<GiTrophy size={16} />}
            accentVar="--brand-extra1" accentColor={BRAND.ciano}
            atual={kpisAtual.bets}
            anterior={kpisAnt.bets}
            isHistorico={historico}
          />
          <KpiCard
            label="Turnover"
            value={fmtBRLCompact(kpisAtual.turnover)}
            icon={<GiCoins size={16} />}
            accentVar="--brand-extra2" accentColor={BRAND.azul}
            atual={kpisAtual.turnover}
            anterior={kpisAnt.turnover}
            isBRL
            isHistorico={historico}
          />
          <KpiCard
            label="GGR"
            value={fmtBRLCompact(kpisAtual.ggr)}
            icon={<GiPokerHand size={16} />}
            accentVar="--brand-extra1" accentColor={BRAND.roxoVivo}
            atual={kpisAtual.ggr}
            anterior={kpisAnt.ggr}
            isBRL
            isHistorico={historico}
          />
          <KpiCard
            label="Margem"
            value={fmtPct(kpisAtual.margin_pct)}
            icon={<TrendingUp size={16} />}
            accentVar="--brand-extra1" accentColor={BRAND.amarelo}
            atual={kpisAtual.margin_pct}
            anterior={kpisAnt.margin_pct}
            isPct
            isHistorico={historico}
          />
          <KpiCard
            label="UAP"
            value={kpisAtual.uap.toLocaleString("pt-BR")}
            icon={<GiPerson size={16} />}
            accentVar="--brand-extra3" accentColor={BRAND.verde}
            atual={kpisAtual.uap}
            anterior={kpisAnt.uap}
            isHistorico={historico}
          />
          <KpiCard
            label="ARPU"
            value={fmtBRL(kpisAtual.arpu)}
            icon={<GiCoins size={14} />}
            accentVar="--brand-extra4" accentColor={BRAND.rosa}
            atual={kpisAtual.arpu}
            anterior={kpisAnt.arpu}
            isBRL
            isHistorico={historico}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 3 — EVOLUÇÃO DO MÊS (PLACEHOLDER)
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <PlaceholderBloco label="Bloco 3 · Gráfico de evolução — últimos 12 meses (Turnover, GGR, UAP)" />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 5 — DETALHAMENTO DIÁRIO / MENSAL
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <SectionHeader
          icon={<GiCalendar size={15} />}
          title={historico ? "Comparativo Mensal" : `Detalhamento Diário · ${mesSelecionado?.label}`}
          sub={historico ? "· consolidado mês a mês" : "· dia a dia do mês selecionado"}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            <Clock size={16} style={{ marginBottom: 8 }} />
            <div>Carregando...</div>
          </div>
        ) : tabelaRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            Nenhum dado para o período selecionado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{historico ? "Mês" : "Data"}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Turnover</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>GGR</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Margem</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Apostas</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>UAP</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Bet Size</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>ARPU</th>
                </tr>
              </thead>
              <tbody>
                {tabelaRows.map((r, i) => {
                  const ggr = r.ggr ?? 0;
                  return (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.05)" : "transparent" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.label}</td>
                      <td style={tdNum}>{r.turnover != null ? fmtBRL(r.turnover) : "—"}</td>
                      <td style={{
                        ...tdNum,
                        color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                        fontWeight: 600,
                      }}>
                        {r.ggr != null ? fmtBRL(r.ggr) : "—"}
                      </td>
                      <td style={{ ...tdNum }}>
                        <MarginBadge value={r.margin_pct} />
                      </td>
                      <td style={tdNum}>{r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdNum}>{r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdNum}>{r.bet_size != null ? fmtBRL(Number(r.bet_size)) : "—"}</td>
                      <td style={tdNum}>{r.arpu != null ? fmtBRL(Number(r.arpu)) : "—"}</td>
                    </tr>
                  );
                })}

                {/* Linha de totais */}
                {tabelaRows.length > 1 && (
                  <tr style={{
                    borderTop: `2px solid ${t.cardBorder}`,
                    background: "rgba(74,32,130,0.10)",
                  }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: t.text }}>Total</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>
                      {fmtBRL(tabelaRows.reduce((s, r) => s + (r.turnover ?? 0), 0))}
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700, color: BRAND.roxoVivo }}>
                      {fmtBRL(tabelaRows.reduce((s, r) => s + (r.ggr ?? 0), 0))}
                    </td>
                    <td style={tdNum}>
                      <MarginBadge
                        value={
                          tabelaRows.length > 0
                            ? tabelaRows.reduce((s, r) => s + (Number(r.margin_pct) || 0), 0) / tabelaRows.length
                            : null
                        }
                      />
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>
                      {tabelaRows.reduce((s, r) => s + (r.bets ?? 0), 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>
                      {tabelaRows.reduce((s, r) => s + (r.uap ?? 0), 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={tdNum}>—</td>
                    <td style={tdNum}>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 6 — MESAS (PLACEHOLDER)
      ══════════════════════════════════════════════════════════════════════ */}
      <PlaceholderBloco label="Bloco 6 · Mesas por operadora com dropdown diário (aguarda nova tabela)" />

    </div>
  );
}
