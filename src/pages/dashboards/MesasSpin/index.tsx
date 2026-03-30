import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import type { OperadoraRef } from "../../../lib/mesasSpinRelatorioOcr";
import { MesasSpinRelatorioUpload } from "../../../components/MesasSpinRelatorioUpload";
import { ChevronLeft, ChevronRight, Clock, LayoutGrid, Table2, FileImage } from "lucide-react";
import { GiCalendar } from "react-icons/gi";

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

interface PorTabelaRow {
  data_relatorio: string;
  nome_tabela: string;
  operadora: string | null;
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

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
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

// ─── KPI compacto (resumo do período da tabela) ────────────────────────────────
function KpiMesasCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const { theme: t } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{
      background: brand.blockBg,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 14,
      padding: "14px 16px",
      overflow: "hidden",
    }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)`, margin: "-14px -16px 12px" }} />
      <p style={{
        fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: "uppercase",
        margin: "0 0 8px", letterSpacing: "0.06em", fontFamily: FONT.body,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: t.text, margin: 0, fontFamily: FONT.body }}>{value}</p>
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

  const [dailyData, setDailyData]       = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData]   = useState<MonthlyRow[]>([]);
  const [porTabelaRows, setPorTabelaRows] = useState<PorTabelaRow[]>([]);
  const [porTabelaSnapshot, setPorTabelaSnapshot] = useState<string | null>(null);
  const [operadorasOcr, setOperadorasOcr] = useState<OperadoraRef[]>([]);
  const [uploadMsg, setUploadMsg]       = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const mesSelecionado = mesesDisponiveis[idxMes];

  // ── Navegação ────────────────────────────────────────────────────────────────
  function irMesAnterior() { setHistorico(false); setIdxMes((i) => Math.max(0, i - 1)); }
  function irMesProximo()  { setHistorico(false); setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1)); }
  function toggleHistorico() {
    if (historico) { setHistorico(false); setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1); }
    else setHistorico(true);
  }

  useEffect(() => {
    let alive = true;
    supabase.from("operadoras").select("slug, nome").eq("ativo", true).order("nome").then(({ data }) => {
      if (alive) setOperadorasOcr(data ?? []);
    });
    return () => { alive = false; };
  }, []);

  // ── Carregar dados principais + snapshot por mesa ─────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    setPorTabelaRows([]);
    setPorTabelaSnapshot(null);

    try {
      if (historico) {
        const monthly = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_monthly_summary")
            .select("mes, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
            .is("operadora", null)
            .order("mes", { ascending: true })
            .range(from, to)
        );
        const daily = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_daily_summary")
            .select("data, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
            .is("operadora", null)
            .order("data", { ascending: true })
            .range(from, to)
        );
        setMonthlyData(monthly);
        setDailyData(daily);
      } else if (mesSelecionado) {
        const { inicio, fim } = getDatasDoMes(mesSelecionado.ano, mesSelecionado.mes);
        const daily = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_daily_summary")
            .select("data, turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
            .is("operadora", null)
            .gte("data", inicio)
            .lte("data", fim)
            .order("data", { ascending: true })
            .range(from, to)
        );
        setDailyData(daily);
        setMonthlyData([]);

        const { data: snap } = await supabase
          .from("relatorio_por_tabela")
          .select("data_relatorio")
          .gte("data_relatorio", inicio)
          .lte("data_relatorio", fim)
          .order("data_relatorio", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (snap?.data_relatorio) {
          setPorTabelaSnapshot(snap.data_relatorio);
          const mesas = await fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_por_tabela")
              .select(
                "data_relatorio, nome_tabela, operadora, ggr_d1, turnover_d1, bets_d1, ggr_d2, turnover_d2, bets_d2, ggr_mtd, turnover_mtd, bets_mtd",
              )
              .eq("data_relatorio", snap.data_relatorio)
              .order("nome_tabela")
              .range(from, to)
          );
          setPorTabelaRows(mesas as PorTabelaRow[]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [historico, mesSelecionado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

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

  const kpiResumo = useMemo(() => {
    if (tabelaRows.length === 0) return null;
    const withMargin = tabelaRows.filter((r) => r.margin_pct != null);
    return {
      turnover: tabelaRows.reduce((s, r) => s + (r.turnover ?? 0), 0),
      ggr: tabelaRows.reduce((s, r) => s + (r.ggr ?? 0), 0),
      bets: tabelaRows.reduce((s, r) => s + (r.bets ?? 0), 0),
      marginMedia:
        withMargin.length > 0
          ? withMargin.reduce((s, r) => s + (Number(r.margin_pct) || 0), 0) / withMargin.length
          : null,
    };
  }, [tabelaRows]);

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

  const thMesa: React.CSSProperties = {
    ...thStyle, fontSize: 9, padding: "8px 6px", letterSpacing: "0.04em", whiteSpace: "normal", maxWidth: 88,
    lineHeight: 1.2,
  };
  const tdMesa: React.CSSProperties = {
    ...tdStyle, fontSize: 12, padding: "8px 6px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis",
  };
  const tdMesaNum: React.CSSProperties = { ...tdNum, fontSize: 12, padding: "8px 6px" };

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
    <div className="app-page-shell app-page-shell--pb64" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOCO 1 — FILTROS (primária transparente)
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 14, border: brand.primaryTransparentBorder,
          background: brand.primaryTransparentBg,
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

            {loading && (
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      {uploadMsg && (
        <div style={{
          marginBottom: 14,
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${uploadMsg.tipo === "ok" ? BRAND.verde : BRAND.vermelho}`,
          background: uploadMsg.tipo === "ok" ? `${BRAND.verde}14` : `${BRAND.vermelho}14`,
          color: uploadMsg.tipo === "ok" ? BRAND.verde : BRAND.vermelho,
          fontFamily: FONT.body, fontSize: 13,
        }}>
          {uploadMsg.tipo === "ok" ? "✅ " : "⚠️ "}{uploadMsg.texto}
        </div>
      )}

      {!perm.loading && perm.canEditarOk && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<FileImage size={15} />}
            title="Importar relatório (print)"
            sub="· mesmo fluxo OCR do Status Técnico — atualiza resumo diário, mensal e por mesa"
          />
          <MesasSpinRelatorioUpload
            t={t}
            operadoras={operadorasOcr}
            disabled={perm.loading}
            embedded
            onImported={() => { void carregar(); }}
            onUserMessage={setUploadMsg}
          />
        </div>
      )}

      {kpiResumo && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<LayoutGrid size={15} />}
            title={historico ? "Resumo do período (soma)" : "Resumo do mês (soma das linhas)"}
            sub={historico ? "· todos os meses carregados" : undefined}
          />
          <div className="app-grid-kpi-4" style={{ gap: 12 }}>
            <KpiMesasCard label="Turnover" value={fmtBRL(kpiResumo.turnover)} accent={BRAND.roxoVivo} />
            <KpiMesasCard label="GGR" value={fmtBRL(kpiResumo.ggr)} accent={kpiResumo.ggr >= 0 ? BRAND.verde : BRAND.vermelho} />
            <KpiMesasCard label="Apostas" value={kpiResumo.bets.toLocaleString("pt-BR")} accent={BRAND.azul} />
            <KpiMesasCard
              label="Margem média"
              value={kpiResumo.marginMedia != null ? fmtPct(kpiResumo.marginMedia) : "—"}
              accent={BRAND.amarelo}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tabela — detalhamento diário / mensal
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

      {!historico && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<Table2 size={15} />}
            title="Por mesa (print BI)"
            sub={
              porTabelaSnapshot
                ? `· snapshot ${new Date(porTabelaSnapshot + "T12:00:00").toLocaleDateString("pt-BR")} — GGR / Turnover / Apostas`
                : "· importe um relatório com secção “Per table” ou aguarde dados no mês"
            }
          />
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
              <Clock size={16} style={{ marginBottom: 8 }} />
              Carregando mesas…
            </div>
          ) : porTabelaRows.length === 0 ? (
            <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Nenhum registro em <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> para este mês. Use o bloco de importação acima (ou o Status Técnico).
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, minWidth: 160 }}>Mesa</th>
                    <th style={thMesa}>GGR D-1</th>
                    <th style={thMesa}>TO D-1</th>
                    <th style={thMesa}>Ap. D-1</th>
                    <th style={thMesa}>GGR D-2</th>
                    <th style={thMesa}>TO D-2</th>
                    <th style={thMesa}>Ap. D-2</th>
                    <th style={thMesa}>GGR MTD</th>
                    <th style={thMesa}>TO MTD</th>
                    <th style={thMesa}>Ap. MTD</th>
                  </tr>
                </thead>
                <tbody>
                  {porTabelaRows.map((row, i) => (
                    <tr key={`${row.nome_tabela}-${i}`} style={{ background: i % 2 === 1 ? "rgba(74,32,130,0.05)" : "transparent" }}>
                      <td style={{ ...tdMesa, fontWeight: 600 }} title={row.nome_tabela}>{row.nome_tabela}</td>
                      <td style={{ ...tdMesaNum, color: (row.ggr_d1 ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho }}>
                        {row.ggr_d1 != null ? fmtBRL(Number(row.ggr_d1)) : "—"}
                      </td>
                      <td style={tdMesaNum}>{row.turnover_d1 != null ? fmtBRL(Number(row.turnover_d1)) : "—"}</td>
                      <td style={tdMesaNum}>{row.bets_d1 != null ? row.bets_d1.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ ...tdMesaNum, color: (row.ggr_d2 ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho }}>
                        {row.ggr_d2 != null ? fmtBRL(Number(row.ggr_d2)) : "—"}
                      </td>
                      <td style={tdMesaNum}>{row.turnover_d2 != null ? fmtBRL(Number(row.turnover_d2)) : "—"}</td>
                      <td style={tdMesaNum}>{row.bets_d2 != null ? row.bets_d2.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ ...tdMesaNum, color: (row.ggr_mtd ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho }}>
                        {row.ggr_mtd != null ? fmtBRL(Number(row.ggr_mtd)) : "—"}
                      </td>
                      <td style={tdMesaNum}>{row.turnover_mtd != null ? fmtBRL(Number(row.turnover_mtd)) : "—"}</td>
                      <td style={tdMesaNum}>{row.bets_mtd != null ? row.bets_mtd.toLocaleString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
