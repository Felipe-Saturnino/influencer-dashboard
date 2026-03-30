import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import type { OperadoraRef } from "../../../lib/mesasSpinRelatorioOcr";
import { MesasSpinRelatorioUpload } from "../../../components/MesasSpinRelatorioUpload";
import KpiCard from "../../../components/dashboard/KpiCard";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Table2,
  FileImage,
  Wallet,
  TrendingUp,
  ListOrdered,
  Percent,
  ChartColumnBig,
  Users,
  Coins,
} from "lucide-react";
import { GiCalendar, GiShield } from "react-icons/gi";

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

const OPERADORA_CASA_APOSTAS = "casa_apostas";
/** Linhas sem prefixo reconhecido e sem slug no OCR. */
const OPERADORA_OUTRAS = "outras_mesas";

/** Nome da mesa sem o prefixo operadora (apenas exibição CDA). */
function nomeMesaCdaCurto(nomeTabela: string): string {
  const s = nomeTabela.replace(/^casa de apostas\s+/i, "").trim();
  return s.length > 0 ? s : nomeTabela.trim();
}

function isMesaCasaApostas(row: PorTabelaRow): boolean {
  if (row.operadora === OPERADORA_CASA_APOSTAS) return true;
  if (row.operadora != null) return false;
  return /^casa de apostas\b/i.test(row.nome_tabela);
}

/** Slug consolidado por linha (alinha ao OCR / coluna operadora). */
function slugOperadoraPorLinha(row: PorTabelaRow): string {
  if (row.operadora != null && String(row.operadora).length > 0) return row.operadora;
  if (isMesaCasaApostas(row)) return OPERADORA_CASA_APOSTAS;
  return OPERADORA_OUTRAS;
}

function nomeMesaParaExibicao(
  row: PorTabelaRow,
  slug: string,
  operadorasList: { slug: string; nome: string }[],
): string {
  const op = operadorasList.find((o) => o.slug === slug);
  if (op) {
    const nt = row.nome_tabela.trim();
    if (nt.toLowerCase().startsWith(op.nome.toLowerCase())) {
      const rest = nt.slice(op.nome.length).replace(/^\s+/, "").trim();
      if (rest.length > 0) return rest;
    }
  }
  if (slug === OPERADORA_CASA_APOSTAS || isMesaCasaApostas(row)) return nomeMesaCdaCurto(row.nome_tabela);
  return row.nome_tabela.trim();
}

function nomeTituloOperadora(
  slug: string,
  operadorasList: { slug: string; nome: string }[],
): string {
  if (slug === OPERADORA_OUTRAS) return "Outras mesas";
  const o = operadorasList.find((x) => x.slug === slug);
  return o?.nome ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function filtrarPorEscopoOperadora(
  rows: PorTabelaRow[],
  filtroOperadora: string,
  operadoraSlugsForcado: string[] | null,
  podeVerOperadoraFn: (s: string) => boolean,
): PorTabelaRow[] {
  const slugsFixos = operadoraSlugsForcado?.length ? operadoraSlugsForcado : null;
  const slugsEscolha = !slugsFixos && filtroOperadora !== "todas" ? [filtroOperadora] : null;
  const permitir = slugsFixos ?? slugsEscolha;
  return rows.filter((r) => {
    const slug = slugOperadoraPorLinha(r);
    if (!podeVerOperadoraFn(slug)) return false;
    if (permitir && !permitir.includes(slug)) return false;
    return true;
  });
}

function agruparPorSlug(rows: PorTabelaRow[]): Map<string, PorTabelaRow[]> {
  const m = new Map<string, PorTabelaRow[]>();
  for (const r of rows) {
    const slug = slugOperadoraPorLinha(r);
    if (!m.has(slug)) m.set(slug, []);
    m.get(slug)!.push(r);
  }
  return m;
}

function ordenarSlugs(
  slugs: string[],
  operadorasList: { slug: string; nome: string }[],
): string[] {
  return [...slugs].sort((a, b) =>
    nomeTituloOperadora(a, operadorasList).localeCompare(
      nomeTituloOperadora(b, operadorasList),
      "pt-BR",
    ),
  );
}

function addDaysIso(isoYmd: string, delta: number): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, (d ?? 1) + delta);
  return fmt(dt);
}

function fmtDataPtBr(isoYmd: string): string {
  return new Date(isoYmd + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}

/** Métricas do bloco Monthly Summaries BRL (1 linha = 1 mês consolidado). */
type MonthlyKpiSnapshot = {
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
};

function snapshotFromMonthlyRow(row: Partial<MonthlyRow> | null): MonthlyKpiSnapshot | null {
  if (!row) return null;
  return {
    turnover: row.turnover != null ? Number(row.turnover) : null,
    ggr: row.ggr != null ? Number(row.ggr) : null,
    margin_pct: row.margin_pct != null ? Number(row.margin_pct) : null,
    bets: row.bets != null ? Number(row.bets) : null,
    uap: row.uap != null ? Number(row.uap) : null,
    bet_size: row.bet_size != null ? Number(row.bet_size) : null,
    arpu: row.arpu != null ? Number(row.arpu) : null,
  };
}

function aggMonthlyKpiFromRows(rows: MonthlyRow[]): MonthlyKpiSnapshot | null {
  if (rows.length === 0) return null;
  const turnover = rows.reduce((s, r) => s + Number(r.turnover ?? 0), 0);
  const ggr = rows.reduce((s, r) => s + Number(r.ggr ?? 0), 0);
  const bets = rows.reduce((s, r) => s + Number(r.bets ?? 0), 0);
  const uap = rows.reduce((s, r) => s + Number(r.uap ?? 0), 0);
  const margins = rows.map((r) => r.margin_pct).filter((v): v is number => v != null);
  const margin_pct = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
  const bs = rows.map((r) => r.bet_size).filter((v): v is number => v != null);
  const bet_size = bs.length > 0 ? bs.reduce((a, b) => a + Number(b), 0) / bs.length : null;
  const ar = rows.map((r) => r.arpu).filter((v): v is number => v != null);
  const arpu = ar.length > 0 ? ar.reduce((a, b) => a + Number(b), 0) / ar.length : null;
  return { turnover, ggr, margin_pct, bets, uap, bet_size, arpu };
}

function nKpi(v: number | null | undefined): number {
  return Number(v) || 0;
}

type RotulosMesa = { d1: string; d2: string; mtd: string; usouFallbackDaily: boolean };

function rotulosPorMesaParaMes(
  dailyData: DailyRow[],
  snapshotIso: string | null,
  ano: number,
  mes0a11: number,
): RotulosMesa {
  const { inicio, fim } = getDatasDoMes(ano, mes0a11);
  const inMonth = dailyData.filter((r) => r.data >= inicio && r.data <= fim);
  const ultimoDiaDailyIso =
    inMonth.length === 0 ? null : inMonth.reduce((a, r) => (r.data > a ? r.data : a), inMonth[0].data);
  const ultimo = ultimoDiaDailyIso ?? (snapshotIso ? addDaysIso(snapshotIso, -1) : null);
  const mtd = `MTD · ${MESES_CURTOS[mes0a11]}/${ano}`;
  if (!ultimo) {
    return { d1: "D-1 (BI)", d2: "D-2 (BI)", mtd, usouFallbackDaily: false };
  }
  return {
    d1: fmtDataPtBr(ultimo),
    d2: fmtDataPtBr(addDaysIso(ultimo, -1)),
    mtd,
    usouFallbackDaily: ultimoDiaDailyIso === null,
  };
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

// ─── Lista vertical: uma mesa por bloco (evita sobreposição da grelha) ───────
function MesasPorMesaListaVertical({
  rows,
  rotulos,
  slugOperadora,
  operadorasList,
  thMini,
  tdMini,
  tdMiniNum,
}: {
  rows: PorTabelaRow[];
  rotulos: RotulosMesa;
  slugOperadora: string;
  operadorasList: { slug: string; nome: string }[];
  thMini: React.CSSProperties;
  tdMini: React.CSSProperties;
  tdMiniNum: React.CSSProperties;
}) {
  const { theme: t } = useApp();
  const sorted = [...rows].sort((a, b) =>
    nomeMesaParaExibicao(a, slugOperadora, operadorasList).localeCompare(
      nomeMesaParaExibicao(b, slugOperadora, operadorasList),
      "pt-BR",
    ),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {sorted.map((row) => (
        <div
          key={`${row.data_relatorio}|${slugOperadora}|${row.nome_tabela}`}
          style={{
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 14,
            padding: 14,
            background: "rgba(74,32,130,0.04)",
            width: "100%",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 13,
              color: t.text,
              marginBottom: 10,
              fontFamily: FONT.body,
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Mesa
            </span>
            {nomeMesaParaExibicao(row, slugOperadora, operadorasList)}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
            <thead>
              <tr>
                <th style={thMini}>Data</th>
                <th style={{ ...thMini, textAlign: "right" }}>Apostas</th>
                <th style={{ ...thMini, textAlign: "right" }}>Turnover</th>
                <th style={{ ...thMini, textAlign: "right" }}>GGR</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "rgba(74,32,130,0.06)" }}>
                <td style={tdMini}>{rotulos.d1}</td>
                <td style={tdMiniNum}>{row.bets_d1 != null ? row.bets_d1.toLocaleString("pt-BR") : "—"}</td>
                <td style={tdMiniNum}>{row.turnover_d1 != null ? fmtBRL(Number(row.turnover_d1)) : "—"}</td>
                <td style={{
                  ...tdMiniNum,
                  color: (row.ggr_d1 ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho,
                  fontWeight: 600,
                }}>
                  {row.ggr_d1 != null ? fmtBRL(Number(row.ggr_d1)) : "—"}
                </td>
              </tr>
              <tr>
                <td style={tdMini}>{rotulos.d2}</td>
                <td style={tdMiniNum}>{row.bets_d2 != null ? row.bets_d2.toLocaleString("pt-BR") : "—"}</td>
                <td style={tdMiniNum}>{row.turnover_d2 != null ? fmtBRL(Number(row.turnover_d2)) : "—"}</td>
                <td style={{
                  ...tdMiniNum,
                  color: (row.ggr_d2 ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho,
                  fontWeight: 600,
                }}>
                  {row.ggr_d2 != null ? fmtBRL(Number(row.ggr_d2)) : "—"}
                </td>
              </tr>
              <tr style={{ background: "rgba(74,32,130,0.06)" }}>
                <td style={{ ...tdMini, fontWeight: 600 }}>{rotulos.mtd}</td>
                <td style={tdMiniNum}>{row.bets_mtd != null ? row.bets_mtd.toLocaleString("pt-BR") : "—"}</td>
                <td style={tdMiniNum}>{row.turnover_mtd != null ? fmtBRL(Number(row.turnover_mtd)) : "—"}</td>
                <td style={{
                  ...tdMiniNum,
                  color: (row.ggr_mtd ?? 0) >= 0 ? BRAND.verde : BRAND.vermelho,
                  fontWeight: 600,
                }}>
                  {row.ggr_mtd != null ? fmtBRL(Number(row.ggr_mtd)) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      ))}
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MesasSpin() {
  const { theme: t } = useApp();
  const { showFiltroOperadora, podeVerOperadora, operadoraSlugsForcado } = useDashboardFiltros();
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
  /** Todas as linhas por mesa (modo Histórico), para agrupar mês a mês. */
  const [porTabelaHistAll, setPorTabelaHistAll] = useState<PorTabelaRow[]>([]);
  /** Monthly Summaries BRL — mês do carrossel e mês anterior (comparativo). */
  const [monthlyKpiAtual, setMonthlyKpiAtual] = useState<MonthlyKpiSnapshot | null>(null);
  const [monthlyKpiAnt, setMonthlyKpiAnt] = useState<MonthlyKpiSnapshot | null>(null);
  const [operadorasOcr, setOperadorasOcr] = useState<OperadoraRef[]>([]);
  const [uploadMsg, setUploadMsg]       = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");

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
    setPorTabelaHistAll([]);
    setMonthlyKpiAtual(null);
    setMonthlyKpiAnt(null);

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
        const porAll = await fetchAllPages(async (from, to) =>
          supabase
            .from("relatorio_por_tabela")
            .select(
              "data_relatorio, nome_tabela, operadora, ggr_d1, turnover_d1, bets_d1, ggr_d2, turnover_d2, bets_d2, ggr_mtd, turnover_mtd, bets_mtd",
            )
            .order("data_relatorio", { ascending: true })
            .range(from, to)
        );
        setMonthlyData(monthly);
        setDailyData(daily);
        setPorTabelaHistAll(porAll as PorTabelaRow[]);
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

        const mesIsoCarousel = fmt(new Date(mesSelecionado.ano, mesSelecionado.mes, 1));
        const { data: mCur } = await supabase
          .from("relatorio_monthly_summary")
          .select("turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
          .eq("mes", mesIsoCarousel)
          .is("operadora", null)
          .maybeSingle();
        setMonthlyKpiAtual(snapshotFromMonthlyRow(mCur));

        if (idxMes > 0) {
          const prev = mesesDisponiveis[idxMes - 1];
          const mesIsoAnt = fmt(new Date(prev.ano, prev.mes, 1));
          const { data: mAnt } = await supabase
            .from("relatorio_monthly_summary")
            .select("turnover, ggr, margin_pct, bets, uap, bet_size, arpu")
            .eq("mes", mesIsoAnt)
            .is("operadora", null)
            .maybeSingle();
          setMonthlyKpiAnt(snapshotFromMonthlyRow(mAnt));
        } else {
          setMonthlyKpiAnt(null);
        }

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
  }, [historico, mesSelecionado, idxMes, mesesDisponiveis]);

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

  const kpiMonthlyHistoricoAgg = useMemo(
    () => (historico ? aggMonthlyKpiFromRows(monthlyData) : null),
    [historico, monthlyData],
  );

  const kpiExibir: MonthlyKpiSnapshot | null = historico ? kpiMonthlyHistoricoAgg : monthlyKpiAtual;
  const kpiAntExibir: MonthlyKpiSnapshot | null = historico ? null : monthlyKpiAnt;

  const operadorasListFmt = operadorasOcr as { slug: string; nome: string }[];

  const porTabelaFiltradas = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaRows,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaRows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  /** Snapshot do mês: blocos por operadora (ordem alfabética por nome). */
  const porOperadoraSnapshot = useMemo(() => {
    const m = agruparPorSlug(porTabelaFiltradas);
    return ordenarSlugs([...m.keys()], operadorasListFmt).map((slug) => ({
      slug,
      rows: m.get(slug)!,
    }));
  }, [porTabelaFiltradas, operadorasListFmt]);

  const rotulosPorMesaBrl = useMemo(() => {
    if (!mesSelecionado) {
      return { d1: "D-1 (BI)", d2: "D-2 (BI)", mtd: "MTD", usouFallbackDaily: false };
    }
    return rotulosPorMesaParaMes(
      dailyData,
      porTabelaSnapshot,
      mesSelecionado.ano,
      mesSelecionado.mes,
    );
  }, [dailyData, porTabelaSnapshot, mesSelecionado]);

  /** Histórico: último snapshot por mês, por operadora (respeita filtro / escopo). */
  const porMesaPorMesHistorico = useMemo(() => {
    if (!historico || porTabelaHistAll.length === 0) return [];
    const filtroLinhas = (rows: PorTabelaRow[]) =>
      filtrarPorEscopoOperadora(rows, filtroOperadora, operadoraSlugsForcado, podeVerOperadora);

    const map = new Map<string, PorTabelaRow[]>();
    for (const r of porTabelaHistAll) {
      const ym = r.data_relatorio.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(r);
    }
    const items: Array<{
      ym: string;
      mesLabel: string;
      snapshot: string;
      porOperadora: { slug: string; rows: PorTabelaRow[] }[];
    }> = [];
    for (const [ym, list] of map) {
      if (list.length === 0) continue;
      const snapshot = list.reduce((a, r) => (r.data_relatorio > a ? r.data_relatorio : a), list[0].data_relatorio);
      let rowsSnap = list.filter((r) => r.data_relatorio === snapshot);
      rowsSnap = filtroLinhas(rowsSnap);
      const bySlug = agruparPorSlug(rowsSnap);
      const porOperadora = ordenarSlugs([...bySlug.keys()], operadorasListFmt)
        .map((slug) => ({ slug, rows: bySlug.get(slug)! }))
        .filter((b) => b.rows.length > 0);
      const [yStr, mStr] = ym.split("-");
      const Y = Number(yStr);
      const M = Number(mStr) - 1;
      items.push({
        ym,
        mesLabel: `${MESES_PT[M]} ${Y}`,
        snapshot,
        porOperadora,
      });
    }
    items.sort((a, b) => a.ym.localeCompare(b.ym));
    return items.filter((it) => it.porOperadora.length > 0);
  }, [
    historico,
    porTabelaHistAll,
    filtroOperadora,
    operadoraSlugsForcado,
    podeVerOperadora,
    operadorasListFmt,
  ]);

  /** Rodapé “vs mês ant.” só com mês atual e mês anterior vindos do Monthly Summary BRL. */
  const isHistoricoKpi =
    historico ||
    monthlyKpiAnt == null ||
    (!historico && monthlyKpiAtual == null);

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

  const thMini: React.CSSProperties = {
    ...thStyle, fontSize: 10, padding: "8px 10px", whiteSpace: "nowrap",
  };
  const tdMini: React.CSSProperties = { ...tdStyle, fontSize: 12, padding: "8px 10px" };
  const tdMiniNum: React.CSSProperties = { ...tdNum, fontSize: 12, padding: "8px 10px" };

  const isPrimeiro = idxMes === 0;
  const isUltimo   = idxMes === mesesDisponiveis.length - 1;

  const btnNav: React.CSSProperties = {
    width: 30, height: 30, borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent", color: t.text, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

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

            {showFiltroOperadora && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                    color: t.textMuted,
                  }}
                >
                  <GiShield size={15} />
                </span>
                <select
                  value={filtroOperadora}
                  onChange={(e) => setFiltroOperadora(e.target.value)}
                  style={selectStyle}
                >
                  <option value="todas">Todas as operadoras</option>
                  {operadorasOcr
                    .filter((o) => podeVerOperadora(o.slug))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}

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

      {!loading && (!historico || kpiMonthlyHistoricoAgg != null) && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<LayoutGrid size={15} />}
            title="KPIs Consolidados"
            sub={historico ? "· agregado do período" : "· comparativo vs mês anterior"}
          />
          <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
            <KpiCard
              label="Turnover"
              value={kpiExibir?.turnover != null ? fmtBRL(kpiExibir.turnover) : "—"}
              icon={<Wallet size={16} />}
              accentVar="--brand-extra3"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.turnover)}
              anterior={nKpi(kpiAntExibir?.turnover)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Apostas"
              value={kpiExibir?.bets != null ? kpiExibir.bets.toLocaleString("pt-BR") : "—"}
              icon={<ListOrdered size={16} />}
              accentVar="--brand-extra2"
              accentColor={BRAND.azul}
              atual={nKpi(kpiExibir?.bets)}
              anterior={nKpi(kpiAntExibir?.bets)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Margem"
              value={kpiExibir?.margin_pct != null ? fmtPct(kpiExibir.margin_pct) : "—"}
              icon={<Percent size={16} />}
              accentVar="--brand-extra4"
              accentColor={BRAND.amarelo}
              atual={nKpi(kpiExibir?.margin_pct)}
              anterior={nKpi(kpiAntExibir?.margin_pct)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="Aposta média"
              value={kpiExibir?.bet_size != null ? fmtBRL(kpiExibir.bet_size) : "—"}
              icon={<ChartColumnBig size={16} />}
              accentVar="--brand-extra4"
              accentColor={BRAND.ciano}
              atual={nKpi(kpiExibir?.bet_size)}
              anterior={nKpi(kpiAntExibir?.bet_size)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
          </div>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
            <KpiCard
              label="GGR"
              value={kpiExibir?.ggr != null ? fmtBRL(kpiExibir.ggr) : "—"}
              icon={<TrendingUp size={16} />}
              accentVar="--brand-extra1"
              accentColor={nKpi(kpiExibir?.ggr) >= 0 ? BRAND.verde : BRAND.vermelho}
              atual={nKpi(kpiExibir?.ggr)}
              anterior={nKpi(kpiAntExibir?.ggr)}
              isBRL
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="UAP"
              value={kpiExibir?.uap != null ? kpiExibir.uap.toLocaleString("pt-BR") : "—"}
              icon={<Users size={16} />}
              accentVar="--brand-extra2"
              accentColor={BRAND.roxo}
              atual={nKpi(kpiExibir?.uap)}
              anterior={nKpi(kpiAntExibir?.uap)}
              isHistorico={isHistoricoKpi}
            />
            <KpiCard
              label="ARPU"
              value={kpiExibir?.arpu != null ? fmtBRL(kpiExibir.arpu) : "—"}
              icon={<Coins size={16} />}
              accentVar="--brand-extra3"
              accentColor={BRAND.roxoVivo}
              atual={nKpi(kpiExibir?.arpu)}
              anterior={nKpi(kpiAntExibir?.arpu)}
              isBRL
              isHistorico={isHistoricoKpi}
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
          title={historico ? "Comparativo Mensal" : "Detalhamento Diário"}
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
        <>
          {loading ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                <Clock size={16} style={{ marginBottom: 8 }} />
                Carregando mesas…
              </div>
            </div>
          ) : porTabelaRows.length === 0 ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Nenhum registo em <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> para este mês. Use o bloco de importação acima (ou o Status Técnico).
              </p>
            </div>
          ) : porOperadoraSnapshot.length === 0 ? (
            <div style={{ ...card, marginBottom: 14 }}>
              <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" />
              <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
                Nenhuma mesa neste filtro de operadora. Ajuste o seletor no topo ou verifique o escopo de acesso.
              </p>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                Valores alinhados ao último dia do resumo diário (BRL) deste mês.
              </p>
              {rotulosPorMesaBrl.usouFallbackDaily && porTabelaFiltradas.length > 0 && (
                <p style={{ margin: "0 0 16px", fontSize: 12, color: t.textMuted, fontFamily: FONT.body }}>
                  Sem linhas no resumo diário neste mês: rótulos de data usam o dia anterior à data do print.
                </p>
              )}
              {porOperadoraSnapshot.map(({ slug, rows }) => (
                <div key={slug} style={{ ...card, marginBottom: 14 }}>
                  <SectionHeader
                    icon={<Table2 size={15} />}
                    title="Dados por mesa"
                    sub={`· ${nomeTituloOperadora(slug, operadorasListFmt)}`}
                  />
                  <MesasPorMesaListaVertical
                    rows={rows}
                    rotulos={rotulosPorMesaBrl}
                    slugOperadora={slug}
                    operadorasList={operadorasListFmt}
                    thMini={thMini}
                    tdMini={tdMini}
                    tdMiniNum={tdMiniNum}
                  />
                </div>
              ))}
            </>
          )}
        </>
      )}

      {historico && (
        <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<Table2 size={15} />}
            title="Dados por mesa"
            sub="· última importação de cada mês (valores em BRL)"
          />
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
              <Clock size={16} style={{ marginBottom: 8 }} />
              Carregando mesas…
            </div>
          ) : porMesaPorMesHistorico.length === 0 ? (
            <p style={{ margin: 0, color: t.textMuted, fontSize: 13, fontFamily: FONT.body }}>
              Nenhum registo em <code style={{ fontSize: 12 }}>relatorio_por_tabela</code> no período para o filtro atual.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {porMesaPorMesHistorico.map((blo) => {
                const [yStr, mStr] = blo.ym.split("-");
                const rot = rotulosPorMesaParaMes(
                  dailyData,
                  blo.snapshot,
                  Number(yStr),
                  Number(mStr) - 1,
                );
                return (
                  <div key={blo.ym}>
                    <h3
                      style={{
                        fontFamily: FONT_TITLE,
                        fontSize: 13,
                        fontWeight: 800,
                        color: brand.primary,
                        margin: "0 0 14px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {blo.mesLabel}
                      <span
                        style={{
                          fontFamily: FONT.body,
                          fontWeight: 500,
                          fontSize: 11,
                          color: t.textMuted,
                          marginLeft: 8,
                          textTransform: "none",
                          letterSpacing: "normal",
                        }}
                      >
                        · print {fmtDataPtBr(blo.snapshot)}
                      </span>
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {blo.porOperadora.map(({ slug: opSlug, rows }) => (
                        <div key={`${blo.ym}-${opSlug}`}>
                          <SectionHeader
                            icon={<Table2 size={14} />}
                            title="Dados por mesa"
                            sub={`· ${nomeTituloOperadora(opSlug, operadorasListFmt)}`}
                          />
                          {rot.usouFallbackDaily && rows.length > 0 && (
                            <p style={{ margin: "0 0 10px", fontSize: 11, color: t.textMuted, fontFamily: FONT.body }}>
                              Sem resumo diário neste mês: rótulos por data do print.
                            </p>
                          )}
                          <MesasPorMesaListaVertical
                            rows={rows}
                            rotulos={rot}
                            slugOperadora={opSlug}
                            operadorasList={operadorasListFmt}
                            thMini={thMini}
                            tdMini={tdMini}
                            tdMiniNum={tdMiniNum}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
