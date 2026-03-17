import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../context/AppContext";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { GiPokerHand, GiCoins, GiTrophy, GiPerson, GiCalendar } from "react-icons/gi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const FONT_TITLE = "'NHD Bold', 'nhd-bold', sans-serif";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const BRAND = {
  roxo:     "#4a2082",
  roxoVivo: "#7c3aed",
  azul:     "#1e36f8",
  vermelho: "#e84025",
  verde:    "#22c55e",
  ciano:    "#70cae4",
} as const;

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface DailyRow {
  data: string;
  turnover: number | null;
  ggr: number | null;
  bets: number | null;
  uap: number | null;
}

interface MonthlyRow {
  mes: string;
  turnover: number | null;
  ggr: number | null;
  bets: number | null;
  uap: number | null;
}

interface PorTabelaRow {
  data_relatorio: string;
  nome_tabela: string;
  ggr_d1: number | null;
  turnover_d1: number | null;
  bets_d1: number | null;
  ggr_d2: number | null;
  turnover_d2: number | null;
  bets_d2: number | null;
  ggr_mtd: number | null;
  turnover_mtd: number | null;
  bets_mtd: number | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = 2024, mes = 0; // Ajuste conforme seus dados
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
  const ultimoDia = new Date(anoAnt, mesAnt + 1, 0).getDate();
  const hoje = new Date();
  const dia = anoAnt === hoje.getFullYear() && mesAnt === hoje.getMonth()
    ? Math.min(hoje.getDate(), ultimoDia) : ultimoDia;
  return { inicio: fmt(new Date(anoAnt, mesAnt, 1)), fim: fmt(new Date(anoAnt, mesAnt, dia)) };
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const KPIS_ZERO = { bets: 0, turnover: 0, ggr: 0, uap: 0 };

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accentColor, atual, anterior, isBRL, isHistorico }: {
  label: string; value: string; icon: React.ReactNode; accentColor: string;
  atual: number; anterior: number; isBRL?: boolean; isHistorico?: boolean;
}) {
  const { theme: t } = useApp();
  const diff = atual - anterior;
  const pct = anterior !== 0 ? (diff / Math.abs(anterior)) * 100 : null;
  const up = diff >= 0;
  const corSeta = up ? BRAND.verde : BRAND.vermelho;

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
            {icon}
          </span>
          <span style={{ color: t.textMuted, fontSize: 10, fontFamily: FONT.body, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: FONT.body, marginBottom: 6, lineHeight: 1.1 }}>
          {value}
        </div>
        {!isHistorico && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body }}>
            <span style={{ color: corSeta, fontWeight: 700, fontSize: 12 }}>
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MesasSpin() {
  const { theme: t } = useApp();
  const perm = usePermission("mesas_spin");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex((m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth());

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [porTabelaData, setPorTabelaData] = useState<PorTabelaRow[]>([]);

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo() { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  // ── CARREGAR DADOS ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      if (historico) {
        const { data: daily } = await supabase.from("relatorio_daily_summary").select("data, turnover, ggr, bets, uap").order("data");
        const { data: monthly } = await supabase.from("relatorio_monthly_summary").select("mes, turnover, ggr, bets, uap").order("mes");
        const { data: porTabela } = await supabase.from("relatorio_por_tabela").select("*").order("data_relatorio", { ascending: false });
        setDailyData(daily ?? []);
        setMonthlyData(monthly ?? []);
        setPorTabelaData(porTabela ?? []);
      } else if (mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        const { data: daily } = await supabase.from("relatorio_daily_summary").select("data, turnover, ggr, bets, uap").gte("data", inicio).lte("data", fim).order("data");
        const { data: porTabela } = await supabase.from("relatorio_por_tabela").select("*").gte("data_relatorio", inicio).lte("data_relatorio", fim).order("data_relatorio", { ascending: false });
        setDailyData(daily ?? []);
        setPorTabelaData(porTabela ?? []);
        setMonthlyData([]);
      }

      setLoading(false);
    }
    carregar();
  }, [historico, idxMes, mesSelecionado]);

  // ── KPIs (período atual vs anterior) ─────────────────────────────────────────
  const kpisAtual = useMemo(() => {
    return dailyData.reduce((s, r) => ({
      bets: s.bets + (r.bets ?? 0),
      turnover: s.turnover + (r.turnover ?? 0),
      ggr: s.ggr + (r.ggr ?? 0),
      uap: s.uap + (r.uap ?? 0),
    }), KPIS_ZERO);
  }, [dailyData]);

  const [kpisAnteriorReal, setKpisAnteriorReal] = useState(KPIS_ZERO);
  useEffect(() => {
    if (historico || !mesSelecionado) {
      setKpisAnteriorReal(KPIS_ZERO);
      return;
    }
    const { inicio, fim } = getDatasDoMesMtd(mesSelecionado.ano, mesSelecionado.mes);
    supabase.from("relatorio_daily_summary").select("data, turnover, ggr, bets, uap").gte("data", inicio).lte("data", fim).then(({ data }) => {
      const r = (data ?? []).reduce((s, row) => ({
        bets: s.bets + (row.bets ?? 0),
        turnover: s.turnover + (row.turnover ?? 0),
        ggr: s.ggr + (row.ggr ?? 0),
        uap: s.uap + (row.uap ?? 0),
      }), KPIS_ZERO);
      setKpisAnteriorReal(r);
    });
  }, [historico, mesSelecionado]);

  const kpisAnt = historico ? KPIS_ZERO : kpisAnteriorReal;

  // ── Dados para gráfico ──────────────────────────────────────────────────────
  const graficoData = useMemo(() => {
    if (historico && monthlyData.length > 0) {
      return monthlyData.map((r) => {
        const d = new Date(r.mes + "T12:00:00");
        return {
          nome: `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`,
          ggr: r.ggr ?? 0,
          turnover: r.turnover ?? 0,
          bets: r.bets ?? 0,
          uap: r.uap ?? 0,
        };
      });
    }
    return dailyData.map((r) => ({
      nome: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ggr: r.ggr ?? 0,
      turnover: r.turnover ?? 0,
      bets: r.bets ?? 0,
      uap: r.uap ?? 0,
    }));
  }, [historico, dailyData, monthlyData]);

  // ── ESTILOS ──────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: t.cardBg, border: `1px solid ${t.cardBorder}`,
    borderRadius: 18, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  };
  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
    color: t.textMuted, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${t.cardBorder}`,
    background: "rgba(74,32,130,0.10)", fontFamily: FONT.body, whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px", fontSize: 13, borderBottom: `1px solid rgba(255,255,255,0.04)`,
    color: t.text, fontFamily: FONT.body, whiteSpace: "nowrap",
  };

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;
  const btnNavStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%", border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Mesas Spin.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 48px", background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ══ BLOCO 1: FILTRO PERÍODO ═══════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ borderRadius: 14, border: `1px solid ${t.cardBorder}`, background: t.cardBg, padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button style={{ ...btnNavStyle, opacity: historico || isPrimeiro ? 0.35 : 1, cursor: historico || isPrimeiro ? "not-allowed" : "pointer" }} onClick={irMesAnterior} disabled={historico || isPrimeiro}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.text, fontFamily: FONT.body, minWidth: 180, textAlign: "center" }}>
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button style={{ ...btnNavStyle, opacity: historico || isUltimo ? 0.35 : 1, cursor: historico || isUltimo ? "not-allowed" : "pointer" }} onClick={irMesProximo} disabled={historico || isUltimo}>
              <ChevronRight size={14} />
            </button>
            <button
              onClick={toggleHistorico}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                fontFamily: FONT.body, fontSize: 13,
                border: historico ? `1px solid ${BRAND.roxoVivo}` : `1px solid ${t.cardBorder}`,
                background: historico ? `rgba(124,58,237,0.15)` : "transparent",
                color: historico ? BRAND.roxoVivo : t.textMuted, fontWeight: historico ? 700 : 400,
              }}
            >
              <GiCalendar size={15} /> Histórico
            </button>
            {loading && <span style={{ fontSize: 12, color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> Carregando...</span>}
          </div>
        </div>
      </div>

      {/* ══ BLOCO 2: KPIs PRINCIPAIS ═══════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.ciano }}>
            <GiPokerHand size={15} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            KPIs Principais
          </span>
          {!historico && <span style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>· comparativo MTD vs mesmo período do mês anterior</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <KpiCard label="Apostas Realizadas" value={kpisAtual.bets.toLocaleString("pt-BR")} icon={<GiTrophy size={16} />} accentColor={BRAND.ciano} atual={kpisAtual.bets} anterior={kpisAnt.bets} isHistorico={historico} />
          <KpiCard label="Turnover" value={fmtBRL(kpisAtual.turnover)} icon={<GiCoins size={16} />} accentColor={BRAND.azul} atual={kpisAtual.turnover} anterior={kpisAnt.turnover} isBRL isHistorico={historico} />
          <KpiCard label="GGR" value={fmtBRL(kpisAtual.ggr)} icon={<GiPokerHand size={16} />} accentColor={BRAND.roxoVivo} atual={kpisAtual.ggr} anterior={kpisAnt.ggr} isBRL isHistorico={historico} />
          <KpiCard label="UAP" value={kpisAtual.uap.toLocaleString("pt-BR")} icon={<GiPerson size={16} />} accentColor={BRAND.verde} atual={kpisAtual.uap} anterior={kpisAnt.uap} isHistorico={historico} />
        </div>
      </div>

      {/* ══ BLOCO 3: GRÁFICO COMPARATIVO ══════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.ciano }}>
            <GiCoins size={15} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Comparativo {historico ? "mensal" : "diário"} — GGR, Turnover, Apostas, UAP
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Carregando gráfico...</div>
        ) : graficoData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Nenhum dado para o período.</div>
        ) : (
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: t.textMuted, fontFamily: FONT.body }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: t.textMuted, fontFamily: FONT.body }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: t.textMuted, fontFamily: FONT.body }} tickFormatter={(v) => fmtBRL(v).slice(0, 8)} />
                <Tooltip contentStyle={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 12, fontFamily: FONT.body }} formatter={(v: number, name: string) => [name === "ggr" || name === "turnover" ? fmtBRL(v) : v.toLocaleString("pt-BR"), name]} />
                <Legend />
                <Bar yAxisId="left" dataKey="bets" name="Apostas" fill={BRAND.ciano} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="uap" name="UAP" fill={BRAND.verde} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="turnover" name="Turnover" fill={BRAND.azul} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="ggr" name="GGR" fill={BRAND.roxoVivo} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ══ BLOCO 4: TABELA DIÁRIA ═════════════════════════════════════════════════ */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.ciano }}>
            <GiCalendar size={15} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Diário {historico ? "— todo o período" : `— ${mesSelecionado?.label}`}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Carregando...</div>
        ) : dailyData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Nenhum dado diário no período.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Turnover</th>
                  <th style={thStyle}>GGR</th>
                  <th style={thStyle}>Apostas</th>
                  <th style={thStyle}>UAP</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((r, i) => (
                  <tr key={r.data} style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent" }}>
                    <td style={tdStyle}>{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td style={tdStyle}>{r.turnover != null ? fmtBRL(r.turnover) : "—"}</td>
                    <td style={{ ...tdStyle, color: (r.ggr ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho }}>{r.ggr != null ? fmtBRL(r.ggr) : "—"}</td>
                    <td style={tdStyle}>{r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}</td>
                    <td style={tdStyle}>{r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ BLOCO 5: MESAS (PER TABLE) ═════════════════════════════════════════════ */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(74,32,130,0.18)", border: "1px solid rgba(74,32,130,0.30)", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.ciano }}>
            <GiPokerHand size={15} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: FONT_TITLE, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Mesas (Per Table)
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Carregando...</div>
        ) : porTabelaData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Nenhum dado de mesas no período.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Mesa</th>
                  <th style={thStyle}>GGR d-1</th>
                  <th style={thStyle}>Turnover d-1</th>
                  <th style={thStyle}>Bets d-1</th>
                  <th style={thStyle}>GGR d-2</th>
                  <th style={thStyle}>Turnover d-2</th>
                  <th style={thStyle}>Bets d-2</th>
                  <th style={thStyle}>GGR MTD</th>
                  <th style={thStyle}>Turnover MTD</th>
                  <th style={thStyle}>Bets MTD</th>
                </tr>
              </thead>
              <tbody>
                {porTabelaData.map((r, i) => (
                  <tr key={`${r.data_relatorio}-${r.nome_tabela}-${i}`} style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.06)" : "transparent" }}>
                    <td style={tdStyle}>{new Date(r.data_relatorio + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nome_tabela}</td>
                    <td style={tdStyle}>{r.ggr_d1 != null ? fmtBRL(r.ggr_d1) : "—"}</td>
                    <td style={tdStyle}>{r.turnover_d1 != null ? fmtBRL(r.turnover_d1) : "—"}</td>
                    <td style={tdStyle}>{r.bets_d1 != null ? r.bets_d1.toLocaleString("pt-BR") : "—"}</td>
                    <td style={tdStyle}>{r.ggr_d2 != null ? fmtBRL(r.ggr_d2) : "—"}</td>
                    <td style={tdStyle}>{r.turnover_d2 != null ? fmtBRL(r.turnover_d2) : "—"}</td>
                    <td style={tdStyle}>{r.bets_d2 != null ? r.bets_d2.toLocaleString("pt-BR") : "—"}</td>
                    <td style={tdStyle}>{r.ggr_mtd != null ? fmtBRL(r.ggr_mtd) : "—"}</td>
                    <td style={tdStyle}>{r.turnover_mtd != null ? fmtBRL(r.turnover_mtd) : "—"}</td>
                    <td style={tdStyle}>{r.bets_mtd != null ? r.bets_mtd.toLocaleString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
