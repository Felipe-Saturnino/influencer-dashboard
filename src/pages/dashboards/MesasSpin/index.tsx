import { Fragment, useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useDashboardFiltros } from "../../../hooks/useDashboardFiltros";
import { FONT } from "../../../constants/theme";
import { FONT_TITLE, MSG_SEM_DADOS_FILTRO } from "../../../lib/dashboardConstants";
import { supabase } from "../../../lib/supabase";
import { fetchAllPages } from "../../../lib/supabasePaginate";
import { getPeriodoComparativoMoM, isCarrosselMesCivilAtual } from "../../../lib/dashboardHelpers";
import KpiCard from "../../../components/dashboard/KpiCard";
import { MarginBadge, SelectComIcone, SkeletonKpiCard } from "../../../components/dashboard";
import { getThStyle, getTdStyle, getTdNumStyle } from "../../../lib/tableStyles";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Table2,
  Wallet,
  TrendingUp,
  ListOrdered,
  Percent,
  ChartColumnBig,
  Users,
  Coins,
} from "lucide-react";
import { GiCalendar, GiConvergenceTarget, GiDiceSixFacesFour, GiShield } from "react-icons/gi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/** ─── Schema v2 (relatorio_* após migração 20260420100000): daily sem operadora; monthly só UAP+ARPU; por_tabela com dia + operadora/mesa texto. */

const BRAND = {
  roxo: "#4a2082",
  roxoVivo: "#7c3aed",
  azul: "#1e36f8",
  vermelho: "#e84025",
  verde: "#22c55e",
  ciano: "#70cae4",
  amarelo: "#f59e0b",
  rosa: "#ec4899",
} as const;

/** Paleta A/B — mesmo padrão do Comparativo de Funil (Conversão). */
const COR_MESA_A = {
  accent: "#7c3aed",
  bg: "rgba(124,58,237,0.10)",
  border: "rgba(124,58,237,0.35)",
} as const;
const COR_MESA_B = {
  accent: "#1e36f8",
  bg: "rgba(30,54,248,0.10)",
  border: "rgba(30,54,248,0.35)",
} as const;

interface DailyRow {
  data: string;
  turnover: number | null;
  ggr: number | null;
  /** v2: coluna `apostas`; UI antiga usava `bets` */
  bets: number | null;
  uap: number | null;
  margin_pct: number | null;
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

/** Linha enriquecida da tabela de detalhe (diário ou mensal/histórico). */
type LinhaDetalheTab = Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & {
  label: string;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
};

type UapPorJogoPlanRow = { data: string; jogo: string; uap: number };

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

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getMesesDisponiveis() {
  const hoje = new Date();
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = 2024,
    mes = 0;
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth())) {
    lista.push({ ano, mes, label: `${MESES_PT[mes]} ${ano}` });
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }
  return lista;
}

const OPERADORA_CASA_APOSTAS = "casa_apostas";
const OPERADORA_OUTRAS = "outras_mesas";

function slugFromRelatorioOperadora(operadoraRaw: string): string {
  const t = operadoraRaw.trim().toLowerCase();
  if (t.includes("casa de apostas")) return OPERADORA_CASA_APOSTAS;
  if (t.includes("bet nacional")) return "bet_nacional";
  const slug = t.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return slug.length > 0 ? slug : OPERADORA_OUTRAS;
}

/** v2: reconstrói nome completo tipo print para heurísticas CDA + exibição. */
function syntheticNomeTabela(operadora: string, mesa: string): string {
  const op = operadora.trim();
  const m = mesa.trim();
  if (!op) return m;
  return `${op} ${m}`;
}

function mapPorTabelaV2(r: {
  dia: string;
  operadora: string;
  mesa: string;
  ggr: number | null;
  turnover: number | null;
  apostas: number | null;
}): PorTabelaRow {
  const nome = syntheticNomeTabela(r.operadora, r.mesa);
  return {
    data_relatorio: r.dia,
    nome_tabela: nome,
    operadora: slugFromRelatorioOperadora(r.operadora),
    ggr_d1: r.ggr != null ? Number(r.ggr) : null,
    turnover_d1: r.turnover != null ? Number(r.turnover) : null,
    bets_d1: r.apostas != null ? Number(r.apostas) : null,
    ggr_d2: null,
    turnover_d2: null,
    bets_d2: null,
    ggr_mtd: null,
    turnover_mtd: null,
    bets_mtd: null,
  };
}

function canonicalMesaCasaAposta(nomeTabela: string): string | null {
  const t = nomeTabela.trim();
  const pares: readonly (readonly [RegExp, string])[] = [
    [/^casa de apostas?\s+vip\s+blackjack\s+1\s*$/i, "Blackjack VIP"],
    [/^casa de apostas?\s+blackjack\s+1\s*$/i, "Blackjack 1"],
    [/^casa de apostas?\s+blackjack\s+2\s*$/i, "Blackjack 2"],
    [/^casa de apostas?\s+speed\s+baccarat\s*$/i, "Speed Baccarat"],
    [/^casa de apostas?\s+roulette\s*$/i, "Roleta"],
    [/^casa de apostas?\s+r(o|ou)leta\s*$/i, "Roleta"],
  ];
  for (const [re, mesa] of pares) {
    if (re.test(t)) return mesa;
  }
  return null;
}

function nomeMesaCdaCurto(nomeTabela: string): string {
  const s = nomeTabela.replace(/^casa de apostas?\s+/i, "").trim();
  return s.length > 0 ? s : nomeTabela.trim();
}

function isMesaCasaApostas(row: PorTabelaRow): boolean {
  if (row.operadora === OPERADORA_CASA_APOSTAS) return true;
  if (row.operadora != null && row.operadora !== OPERADORA_OUTRAS) return false;
  return /^casa de apostas?\b/i.test(row.nome_tabela);
}

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
  const canon = canonicalMesaCasaAposta(row.nome_tabela);
  if (canon != null) return canon;

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

const LABELS_BLACKJACK_COMPARATIVO = new Set(["Blackjack 1", "Blackjack 2", "Blackjack VIP"]);

function labelMesaCda(
  row: PorTabelaRow,
  operadorasList: { slug: string; nome: string }[],
): string {
  return nomeMesaParaExibicao(row, slugOperadoraPorLinha(row), operadorasList);
}

function isMesaBlackjackComparativo(
  row: PorTabelaRow,
  operadorasList: { slug: string; nome: string }[],
): boolean {
  return LABELS_BLACKJACK_COMPARATIVO.has(labelMesaCda(row, operadorasList));
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

/** DD/MM — igual ao Detalhamento Diário no carrossel por mês. */
function fmtDiaMesPtBr(isoYmd: string): string {
  return new Date(isoYmd + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** `YYYY-MM` → ex.: Jan/2026, Dez/2025 (coluna Mês na visão histórico). */
function fmtMesAnoCurtoFromYm(ym: string): string {
  const [ys, ms] = ym.split("-");
  const mo = Number(ms);
  const y = Number(ys);
  if (!ys || !Number.isFinite(mo) || mo < 1 || mo > 12) return ym;
  return `${MESES_CURTOS[mo - 1]}/${y}`;
}

/** Último dia do mês com UAP em `relatorio_uap_por_jogo` (snapshot para pesos no histórico). */
function uapUltimoDiaDoMesPorJogo(rows: UapPorJogoPlanRow[], ym: string, jogo: string): number | undefined {
  let bestData: string | null = null;
  let uap: number | undefined;
  for (const r of rows) {
    if (r.data.slice(0, 7) !== ym || r.jogo !== jogo) continue;
    if (bestData == null || r.data > bestData) {
      bestData = r.data;
      uap = r.uap;
    }
  }
  return uap;
}

const UAP_JOGO_MAP: Record<string, "blackjack" | "roleta" | "baccarat"> = {
  Blackjack: "blackjack",
  Roleta: "roleta",
  "Speed Baccarat": "baccarat",
};

function buildUapPorJogoQuery(
  historico: boolean,
  mesRef: { ano: number; mes: number } | undefined,
  from: number,
  to: number,
) {
  let q = supabase
    .from("relatorio_uap_por_jogo")
    .select("data, jogo, uap")
    .order("data", { ascending: true })
    .order("jogo", { ascending: true })
    .range(from, to);
  if (!historico && mesRef) {
    const { inicio, fim } = getPeriodoComparativoMoM(mesRef.ano, mesRef.mes).atual;
    q = q.gte("data", inicio).lte("data", fim);
  }
  return q;
}

function fmtBRL(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}

type MonthlyKpiSnapshot = {
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
};

/** Agrega linhas do detalhamento diário (somas + margem, aposta média e ARPU derivados). */
function aggDailyMesKpi(rows: DailyRow[]): MonthlyKpiSnapshot | null {
  if (rows.length === 0) return null;
  let turnover = 0;
  let ggr = 0;
  let bets = 0;
  let uap = 0;
  for (const r of rows) {
    turnover += Number(r.turnover ?? 0);
    ggr += Number(r.ggr ?? 0);
    bets += Number(r.bets ?? 0);
    uap += Number(r.uap ?? 0);
  }
  const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
  const bet_size = bets !== 0 ? turnover / bets : null;
  const arpu = uap !== 0 ? ggr / uap : null;
  return {
    turnover,
    ggr,
    margin_pct,
    bets,
    uap: uap || null,
    bet_size,
    arpu,
  };
}

function nKpi(v: number | null | undefined): number {
  return Number(v) || 0;
}

/** Uma linha no comparativo por mesa (dia a dia, como o Detalhamento Diário). */
type LinhaMesaPorDia = {
  dataIso: string;
  labelData: string;
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
};

function linhaMesaPorDiaFromRow(r: PorTabelaRow): LinhaMesaPorDia {
  const t = r.turnover_d1;
  const g = r.ggr_d1;
  const b = r.bets_d1;
  const margin_pct =
    t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
  const bet_size =
    b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
  return {
    dataIso: r.data_relatorio,
    labelData: fmtDiaMesPtBr(r.data_relatorio),
    ggr: g,
    turnover: t,
    bets: b,
    margin_pct,
    bet_size,
  };
}

/** Métricas por jogo no comparativo (UAP vem de `relatorio_uap_por_jogo`). */
type CelulaJogoMetricas = {
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  uap: number | null;
};

function emptyCelulaJogo(): CelulaJogoMetricas {
  return { ggr: null, turnover: null, bets: null, margin_pct: null, bet_size: null, uap: null };
}

/** Soma GGR, turnover e apostas d-1; margem e aposta média a partir dos totais (ex.: Blackjack = BJ1+BJ2+VIP). UAP é preenchido à parte. */
function aggregateCellFromPorTabelaRows(rows: PorTabelaRow[]): CelulaJogoMetricas {
  if (rows.length === 0) return emptyCelulaJogo();
  let ggr = 0;
  let turnover = 0;
  let bets = 0;
  let gN = 0;
  let tN = 0;
  let bN = 0;
  for (const r of rows) {
    if (r.ggr_d1 != null) {
      ggr += Number(r.ggr_d1);
      gN++;
    }
    if (r.turnover_d1 != null) {
      turnover += Number(r.turnover_d1);
      tN++;
    }
    if (r.bets_d1 != null) {
      bets += Number(r.bets_d1);
      bN++;
    }
  }
  const ggrOut = gN > 0 ? ggr : null;
  const turnoverOut = tN > 0 ? turnover : null;
  const betsOut = bN > 0 ? bets : null;
  const margin_pct =
    turnoverOut != null && turnoverOut !== 0 && ggrOut != null ? (ggrOut / turnoverOut) * 100 : null;
  const bet_size =
    betsOut != null && betsOut !== 0 && turnoverOut != null ? turnoverOut / betsOut : null;
  return { ggr: ggrOut, turnover: turnoverOut, bets: betsOut, margin_pct, bet_size, uap: null };
}

/** Agrega `relatorio_por_tabela` por mês (YYYY-MM) numa linha por período. */
function linhasMesaAgregadasPorMes(
  rows: PorTabelaRow[],
  pred: (r: PorTabelaRow) => boolean,
): LinhaMesaPorDia[] {
  const filtro = rows.filter(pred);
  const byYm = new Map<string, PorTabelaRow[]>();
  for (const r of filtro) {
    const ym = r.data_relatorio.slice(0, 7);
    if (!byYm.has(ym)) byYm.set(ym, []);
    byYm.get(ym)!.push(r);
  }
  return [...byYm.keys()]
    .sort()
    .map((ym) => {
      const bucket = byYm.get(ym)!;
      const agg = aggregateCellFromPorTabelaRows(bucket);
      return {
        dataIso: `${ym}-01`,
        labelData: fmtMesAnoCurtoFromYm(ym),
        ggr: agg.ggr,
        turnover: agg.turnover,
        bets: agg.bets,
        margin_pct: agg.margin_pct,
        bet_size: agg.bet_size,
      };
    });
}

/** Mesmos totais do bloco Detalhamento Diário (`relatorio_daily_summary` / mensal). A coluna Total do comparativo usa isto; as células por jogo somam só mesas BJ/Roleta/Speed Baccarat em `por_tabela`. */
type TotaisOficiaisComparativo = {
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  uap: number | null;
};

function totaisOficiaisFromDailyRow(dr: DailyRow): TotaisOficiaisComparativo {
  const t = dr.turnover;
  const g = dr.ggr;
  const b = dr.bets;
  const u = dr.uap;
  const margin_pct =
    t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
  const bet_size =
    b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
  return { turnover: t, ggr: g, bets: b, uap: u, margin_pct, bet_size };
}

function totaisOficiaisHistoricoMes(
  ym: string,
  dailyByYm: Map<string, DailyRow[]>,
  monthlyByYm: Map<string, MonthlyRow>,
): TotaisOficiaisComparativo {
  const dias = dailyByYm.get(ym) ?? [];
  const agg = dias.length > 0 ? aggDailyMesKpi(dias) : null;
  const m = monthlyByYm.get(ym);
  const turnover = agg?.turnover ?? null;
  const ggr = agg?.ggr ?? null;
  const bets = agg?.bets ?? null;
  const uap = m?.uap != null ? Number(m.uap) : agg?.uap ?? null;
  const margin_pct =
    turnover != null && Number(turnover) !== 0 && ggr != null
      ? (Number(ggr) / Number(turnover)) * 100
      : null;
  const bet_size =
    bets != null && Number(bets) !== 0 && turnover != null ? Number(turnover) / Number(bets) : null;
  return { turnover, ggr, bets, uap, margin_pct, bet_size };
}

type LinhaComparativoJogoTab = {
  dataIso: string;
  labelData: string;
  blackjack: CelulaJogoMetricas;
  roleta: CelulaJogoMetricas;
  baccarat: CelulaJogoMetricas;
  totaisOficiais: TotaisOficiaisComparativo;
};

function linhaComparativoJogoAgregadaMes(
  ym: string,
  rowsMonth: PorTabelaRow[],
  operadorasListFmt: { slug: string; nome: string }[],
  uapRows: UapPorJogoPlanRow[],
  totaisOficiais: TotaisOficiaisComparativo,
): LinhaComparativoJogoTab {
  const bj: PorTabelaRow[] = [];
  const rl: PorTabelaRow[] = [];
  const bc: PorTabelaRow[] = [];
  for (const r of rowsMonth) {
    const lbl = labelMesaCda(r, operadorasListFmt);
    if (isMesaBlackjackComparativo(r, operadorasListFmt)) bj.push(r);
    else if (lbl === "Roleta") rl.push(r);
    else if (lbl === "Speed Baccarat") bc.push(r);
  }
  return {
    dataIso: `${ym}-01`,
    labelData: fmtMesAnoCurtoFromYm(ym),
    blackjack: {
      ...aggregateCellFromPorTabelaRows(bj),
      uap: uapUltimoDiaDoMesPorJogo(uapRows, ym, "Blackjack") ?? null,
    },
    roleta: {
      ...aggregateCellFromPorTabelaRows(rl),
      uap: uapUltimoDiaDoMesPorJogo(uapRows, ym, "Roleta") ?? null,
    },
    baccarat: {
      ...aggregateCellFromPorTabelaRows(bc),
      uap: uapUltimoDiaDoMesPorJogo(uapRows, ym, "Speed Baccarat") ?? null,
    },
    totaisOficiais,
  };
}

const COR_BLACKJACK = "#7c3aed";
const COR_ROLETA = "#22c55e";
const COR_BACCARAT = "#1e36f8";

type KpiJogoKey = "ggr" | "turnover" | "bets" | "margin_pct" | "bet_size" | "uap";

type KpiJogoDef = {
  key: KpiJogoKey;
  label: string;
  somavel: boolean;
  tipoGrafico: "barra" | "linha";
};

const KPIS_DISPONIVEIS: KpiJogoDef[] = [
  { key: "ggr", label: "GGR", somavel: true, tipoGrafico: "barra" },
  { key: "turnover", label: "Turnover", somavel: true, tipoGrafico: "barra" },
  { key: "bets", label: "Apostas", somavel: true, tipoGrafico: "barra" },
  { key: "margin_pct", label: "Margem", somavel: false, tipoGrafico: "linha" },
  { key: "bet_size", label: "Aposta média", somavel: false, tipoGrafico: "linha" },
  { key: "uap", label: "UAP", somavel: true, tipoGrafico: "linha" },
];

const JOGOS_COMPARATIVO = [
  { key: "blackjack" as const, label: "Blackjack", cor: COR_BLACKJACK },
  { key: "roleta" as const, label: "Roleta", cor: COR_ROLETA },
  { key: "baccarat" as const, label: "Baccarat", cor: COR_BACCARAT },
] as const;

function calcularPctComparativoOficial(
  valorJogo: number | null,
  row: LinhaComparativoJogoTab,
  kpi: KpiJogoDef,
): number | null {
  if (!kpi.somavel) return null;
  const key = kpi.key;
  if (key !== "ggr" && key !== "turnover" && key !== "bets" && key !== "uap") return null;
  const total = row.totaisOficiais[key];
  if (valorJogo == null || total == null || total === 0) return null;
  return (valorJogo / total) * 100;
}

function renderValorKpiComparativo(kpi: KpiJogoDef, valor: number | null): ReactNode {
  if (valor == null) return "—";
  switch (kpi.key) {
    case "ggr":
    case "turnover":
    case "bet_size":
      return fmtBRL(valor);
    case "bets":
    case "uap":
      return valor.toLocaleString("pt-BR");
    case "margin_pct":
      return fmtPct(valor);
    default:
      return String(valor);
  }
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  const { theme: tt } = useApp();
  const brand = useDashboardBrand();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: brand.primaryIconBg,
          border: brand.primaryIconBorder,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: brand.primaryIconColor,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: brand.primary,
          fontFamily: FONT_TITLE,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: tt.textMuted, fontFamily: FONT.body, marginLeft: 4 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function mapDailyV2(r: { data: string; turnover: number | null; ggr: number | null; apostas: number | null; uap: number | null }): DailyRow {
  const a = r.apostas != null ? Number(r.apostas) : null;
  return {
    data: r.data,
    turnover: r.turnover != null ? Number(r.turnover) : null,
    ggr: r.ggr != null ? Number(r.ggr) : null,
    bets: a,
    uap: r.uap != null ? Number(r.uap) : null,
    margin_pct: null,
    bet_size: null,
    arpu: null,
  };
}

function mapMonthlyV2(r: { mes: string; uap: number | null; arpu: number | null }): MonthlyRow {
  return {
    mes: r.mes,
    turnover: null,
    ggr: null,
    margin_pct: null,
    bets: null,
    uap: r.uap != null ? Number(r.uap) : null,
    bet_size: null,
    arpu: r.arpu != null ? Number(r.arpu) : null,
  };
}

export default function MesasSpin() {
  const { theme: t, isDark } = useApp();
  const { showFiltroOperadora, podeVerOperadora, operadoraSlugsForcado } = useDashboardFiltros();
  const perm = usePermission("mesas_spin");

  const mesesDisponiveis = useMemo(() => getMesesDisponiveis(), []);
  const hoje = new Date();
  const idxInicial = mesesDisponiveis.findIndex(
    (m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth(),
  );

  const [idxMes, setIdxMes] = useState(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
  const [historico, setHistorico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uapPorJogoRows, setUapPorJogoRows] = useState<UapPorJogoPlanRow[]>([]);

  const [dailyData, setDailyData] = useState<DailyRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [porTabelaRows, setPorTabelaRows] = useState<PorTabelaRow[]>([]);
  const [porTabelaHistAll, setPorTabelaHistAll] = useState<PorTabelaRow[]>([]);
  /** UAP/ARPU mensais oficiais (tabela monthly); quando null, KPI mostra "—". */
  const [monthlyUapArpuSel, setMonthlyUapArpuSel] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  const [monthlyUapArpuPrev, setMonthlyUapArpuPrev] = useState<{
    uap: number | null;
    arpu: number | null;
  } | null>(null);
  /** Só para comparação MoM no carrossel: totais do mês anterior a partir do daily. */
  const [dailyDataPrevMonth, setDailyDataPrevMonth] = useState<DailyRow[]>([]);
  const [operadorasOcr, setOperadorasOcr] = useState<{ slug: string; nome: string }[]>([]);
  const [filtroOperadora, setFiltroOperadora] = useState<string>("todas");
  const [compMesaA, setCompMesaA] = useState("");
  const [compMesaB, setCompMesaB] = useState("");
  const [kpisSelecionados, setKpisSelecionados] = useState<Set<KpiJogoKey>>(
    () => new Set<KpiJogoKey>(["ggr", "turnover", "bets", "margin_pct", "bet_size", "uap"]),
  );
  const [kpiGrafico, setKpiGrafico] = useState<KpiJogoKey>("ggr");
  const [modoVisualizacao, setModoVisualizacao] = useState<"tabela" | "grafico">("tabela");

  const mesSelecionado = mesesDisponiveis[idxMes];

  function irMesAnterior() {
    setHistorico(false);
    setIdxMes((i) => Math.max(0, i - 1));
  }
  function irMesProximo() {
    setHistorico(false);
    setIdxMes((i) => Math.min(mesesDisponiveis.length - 1, i + 1));
  }
  function toggleHistorico() {
    if (historico) {
      setHistorico(false);
      setIdxMes(idxInicial >= 0 ? idxInicial : mesesDisponiveis.length - 1);
    } else setHistorico(true);
  }

  useEffect(() => {
    let alive = true;
    supabase
      .from("operadoras")
      .select("slug, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        if (alive) setOperadorasOcr(data ?? []);
      });
    return () => {
      alive = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setPorTabelaRows([]);
    setPorTabelaHistAll([]);
    setMonthlyUapArpuSel(null);
    setMonthlyUapArpuPrev(null);
    setDailyDataPrevMonth([]);
    setUapPorJogoRows([]);

    try {
      if (historico) {
        const [monthlyRaw, dailyRaw, porAllRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_monthly_summary")
              .select("mes, uap, arpu")
              .order("mes", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, uap")
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_por_tabela")
              .select("dia, operadora, mesa, ggr, turnover, apostas")
              .order("dia", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(true, undefined, from, to)),
        ]);
        setMonthlyData((monthlyRaw as { mes: string; uap: number | null; arpu: number | null }[]).map(mapMonthlyV2));
        setDailyData((dailyRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        setPorTabelaHistAll((porAllRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(
          (uapRaw as { data: string; jogo: string; uap: number }[]).map((r) => ({
            data: String(r.data).slice(0, 10),
            jogo: r.jogo,
            uap: Number(r.uap),
          })),
        );
      } else if (mesSelecionado) {
        const { atual, anterior } = getPeriodoComparativoMoM(mesSelecionado.ano, mesSelecionado.mes);
        const { inicio, fim } = atual;
        const { inicio: pi, fim: pf } = anterior;

        const [dailyRaw, dailyPrevRaw, mesasMesRaw, uapRaw] = await Promise.all([
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, uap")
              .gte("data", inicio)
              .lte("data", fim)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_daily_summary")
              .select("data, turnover, ggr, apostas, uap")
              .gte("data", pi)
              .lte("data", pf)
              .order("data", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) =>
            supabase
              .from("relatorio_por_tabela")
              .select("dia, operadora, mesa, ggr, turnover, apostas")
              .gte("dia", inicio)
              .lte("dia", fim)
              .order("dia", { ascending: true })
              .order("mesa", { ascending: true })
              .range(from, to),
          ),
          fetchAllPages(async (from, to) => buildUapPorJogoQuery(false, mesSelecionado, from, to)),
        ]);

        setDailyData((dailyRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        setMonthlyData([]);
        setDailyDataPrevMonth((dailyPrevRaw as Parameters<typeof mapDailyV2>[0][]).map(mapDailyV2));
        setPorTabelaRows((mesasMesRaw as Parameters<typeof mapPorTabelaV2>[0][]).map(mapPorTabelaV2));
        setUapPorJogoRows(
          (uapRaw as { data: string; jogo: string; uap: number }[]).map((r) => ({
            data: String(r.data).slice(0, 10),
            jogo: r.jogo,
            uap: Number(r.uap),
          })),
        );

        const { data: mSel } = await supabase
          .from("relatorio_monthly_summary")
          .select("uap, arpu")
          .eq("mes", inicio)
          .maybeSingle();
        setMonthlyUapArpuSel(
          mSel
            ? {
                uap: mSel.uap != null ? Number(mSel.uap) : null,
                arpu: mSel.arpu != null ? Number(mSel.arpu) : null,
              }
            : null,
        );

        const { data: mPrev } = await supabase
          .from("relatorio_monthly_summary")
          .select("uap, arpu")
          .eq("mes", pi)
          .maybeSingle();
        setMonthlyUapArpuPrev(
          mPrev
            ? {
                uap: mPrev.uap != null ? Number(mPrev.uap) : null,
                arpu: mPrev.arpu != null ? Number(mPrev.arpu) : null,
              }
            : null,
        );
      }
    } catch {
      setUapPorJogoRows([]);
    } finally {
      setLoading(false);
    }
  }, [historico, mesSelecionado]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tabelaRows = useMemo(() => {
    const enrich = (base: Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & { label: string }): LinhaDetalheTab => {
      const t = base.turnover;
      const g = base.ggr;
      const b = base.bets;
      const u = base.uap;
      const margin_pct = t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
      const bet_size =
        b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
      const arpu = u != null && Number(u) !== 0 && g != null ? Number(g) / Number(u) : null;
      return { ...base, margin_pct, bet_size, arpu };
    };
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));
      const allYm = new Set<string>([...dailyByYm.keys(), ...monthlyByYm.keys()]);
      return [...allYm]
        .sort()
        .map((ym) => {
          const dias = dailyByYm.get(ym) ?? [];
          const agg = dias.length > 0 ? aggDailyMesKpi(dias) : null;
          const m = monthlyByYm.get(ym);
          const base = enrich({
            label: fmtMesAnoCurtoFromYm(ym),
            turnover: agg?.turnover ?? null,
            ggr: agg?.ggr ?? null,
            bets: agg?.bets ?? null,
            uap: m?.uap != null ? Number(m.uap) : agg?.uap ?? null,
          });
          return {
            ...base,
            arpu: m?.arpu != null ? Number(m.arpu) : base.arpu,
          };
        });
    }
    return dailyData.map((r) =>
      enrich({
        label: new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        turnover: r.turnover,
        ggr: r.ggr,
        bets: r.bets,
        uap: r.uap,
      }),
    );
  }, [historico, dailyData, monthlyData]);

  const kpiExibir = useMemo(() => {
    if (historico) {
      if (tabelaRows.length === 0) return null;
      let turnover = 0;
      let ggr = 0;
      let bets = 0;
      const uapMeses: number[] = [];
      for (const r of tabelaRows) {
        turnover += Number(r.turnover ?? 0);
        ggr += Number(r.ggr ?? 0);
        bets += Number(r.bets ?? 0);
        if (r.uap != null) uapMeses.push(Number(r.uap));
      }
      const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
      const bet_size = bets !== 0 ? turnover / bets : null;
      const somaUap = uapMeses.reduce((a, b) => a + b, 0);
      const mediaUap = uapMeses.length > 0 ? somaUap / uapMeses.length : null;
      const arpu = somaUap !== 0 ? ggr / somaUap : null;
      return {
        turnover,
        ggr,
        margin_pct,
        bets,
        uap: mediaUap,
        bet_size,
        arpu,
      };
    }
    const base = dailyData.length === 0 ? null : aggDailyMesKpi(dailyData);
    if (!base) return null;
    if (
      mesSelecionado &&
      isCarrosselMesCivilAtual(mesSelecionado.ano, mesSelecionado.mes)
    ) {
      return base;
    }
    return {
      ...base,
      uap: monthlyUapArpuSel?.uap ?? null,
      arpu: monthlyUapArpuSel?.arpu ?? null,
    };
  }, [historico, tabelaRows, dailyData, monthlyUapArpuSel, mesSelecionado]);

  const kpiAntExibir = useMemo(() => {
    const base =
      historico || dailyDataPrevMonth.length === 0 ? null : aggDailyMesKpi(dailyDataPrevMonth);
    if (!base) return null;
    if (historico) return base;
    if (
      mesSelecionado &&
      isCarrosselMesCivilAtual(mesSelecionado.ano, mesSelecionado.mes)
    ) {
      return base;
    }
    return {
      ...base,
      uap: monthlyUapArpuPrev?.uap ?? base.uap,
      arpu: monthlyUapArpuPrev?.arpu ?? base.arpu,
    };
  }, [historico, dailyDataPrevMonth, monthlyUapArpuPrev, mesSelecionado]);

  const operadorasListFmt = operadorasOcr;

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

  const porTabelaFiltradasHist = useMemo(
    () =>
      filtrarPorEscopoOperadora(
        porTabelaHistAll,
        filtroOperadora,
        operadoraSlugsForcado,
        podeVerOperadora,
      ),
    [porTabelaHistAll, filtroOperadora, operadoraSlugsForcado, podeVerOperadora],
  );

  /** Só Blackjack 1 / 2 / VIP — comparativo lateral. */
  const mesasOpcoesBlackjack = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    const seen = new Map<string, PorTabelaRow>();
    for (const r of src) {
      if (!isMesaBlackjackComparativo(r, operadorasListFmt)) continue;
      const k = r.nome_tabela.trim();
      if (!k) continue;
      if (!seen.has(k)) seen.set(k, r);
    }
    const list = [...seen.entries()].map(([key, sample]) => ({
      key,
      label: labelMesaCda(sample, operadorasListFmt),
    }));
    list.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return list;
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasSpeedBaccarat = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(
        src,
        (r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat",
      );
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Speed Baccarat")
      .sort((a, b) => a.data_relatorio.localeCompare(b.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  const linhasRoleta = useMemo(() => {
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => labelMesaCda(r, operadorasListFmt) === "Roleta");
    }
    return src
      .filter((r) => labelMesaCda(r, operadorasListFmt) === "Roleta")
      .sort((a, b) => a.data_relatorio.localeCompare(b.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, operadorasListFmt]);

  /** Dia a dia (mês selecionado) ou mês a mês (histórico). */
  const linhasComparativoJogo = useMemo((): LinhaComparativoJogoTab[] => {
    if (historico) {
      const dailyByYm = new Map<string, DailyRow[]>();
      for (const r of dailyData) {
        const ym = r.data.slice(0, 7);
        if (!dailyByYm.has(ym)) dailyByYm.set(ym, []);
        dailyByYm.get(ym)!.push(r);
      }
      const monthlyByYm = new Map(monthlyData.map((m) => [m.mes.slice(0, 7), m] as const));

      const byYm = new Map<string, PorTabelaRow[]>();
      for (const r of porTabelaFiltradasHist) {
        const ym = r.data_relatorio.slice(0, 7);
        if (!byYm.has(ym)) byYm.set(ym, []);
        byYm.get(ym)!.push(r);
      }
      return [...byYm.keys()]
        .sort()
        .map((ym) =>
          linhaComparativoJogoAgregadaMes(
            ym,
            byYm.get(ym)!,
            operadorasListFmt,
            uapPorJogoRows,
            totaisOficiaisHistoricoMes(ym, dailyByYm, monthlyByYm),
          ),
        );
    }
    const byDate = new Map<
      string,
      { bj: PorTabelaRow[]; roleta: PorTabelaRow[]; baccarat: PorTabelaRow[] }
    >();
    for (const r of porTabelaFiltradas) {
      const d = r.data_relatorio;
      const label = labelMesaCda(r, operadorasListFmt);
      if (!byDate.has(d)) byDate.set(d, { bj: [], roleta: [], baccarat: [] });
      const bucket = byDate.get(d)!;
      if (isMesaBlackjackComparativo(r, operadorasListFmt)) bucket.bj.push(r);
      else if (label === "Roleta") bucket.roleta.push(r);
      else if (label === "Speed Baccarat") bucket.baccarat.push(r);
    }

    const uapByDateJogo = new Map<string, Partial<Record<"blackjack" | "roleta" | "baccarat", number>>>();
    for (const r of uapPorJogoRows) {
      if (!uapByDateJogo.has(r.data)) uapByDateJogo.set(r.data, {});
      const jogoKey = UAP_JOGO_MAP[r.jogo];
      if (jogoKey) uapByDateJogo.get(r.data)![jogoKey] = r.uap;
    }

    return dailyData.map((dr) => {
      const dataIso = dr.data;
      const b = byDate.get(dataIso) ?? { bj: [], roleta: [], baccarat: [] };
      const uapDia = uapByDateJogo.get(dataIso) ?? {};
      const bjCell = aggregateCellFromPorTabelaRows(b.bj);
      const rlCell = aggregateCellFromPorTabelaRows(b.roleta);
      const bcCell = aggregateCellFromPorTabelaRows(b.baccarat);
      return {
        dataIso,
        labelData: fmtDiaMesPtBr(dataIso),
        blackjack: { ...bjCell, uap: uapDia.blackjack ?? null },
        roleta: { ...rlCell, uap: uapDia.roleta ?? null },
        baccarat: { ...bcCell, uap: uapDia.baccarat ?? null },
        totaisOficiais: totaisOficiaisFromDailyRow(dr),
      };
    });
  }, [
    historico,
    dailyData,
    monthlyData,
    porTabelaFiltradasHist,
    porTabelaFiltradas,
    operadorasListFmt,
    uapPorJogoRows,
  ]);

  const kpisAtivosComparativo = useMemo(
    () => KPIS_DISPONIVEIS.filter((k) => kpisSelecionados.has(k.key)),
    [kpisSelecionados],
  );

  const kpiGraficoConfig = useMemo(
    () => KPIS_DISPONIVEIS.find((k) => k.key === kpiGrafico) ?? KPIS_DISPONIVEIS[0]!,
    [kpiGrafico],
  );

  const dadosGraficoComparativoJogo = useMemo(() => {
    return linhasComparativoJogo.map((row) => {
      const val = (jogoKey: "blackjack" | "roleta" | "baccarat") => {
        const v = row[jogoKey][kpiGrafico as keyof CelulaJogoMetricas];
        return v != null ? Number(v) : null;
      };
      const totalOficial =
        row.totaisOficiais[kpiGrafico as keyof TotaisOficiaisComparativo] ?? null;
      return {
        label: row.labelData,
        dataIso: row.dataIso,
        Blackjack: val("blackjack"),
        Roleta: val("roleta"),
        Baccarat: val("baccarat"),
        Total: totalOficial != null ? Number(totalOficial) : null,
      };
    });
  }, [linhasComparativoJogo, kpiGrafico]);

  const isBRLKpiGrafico = ["ggr", "turnover", "bet_size"].includes(kpiGrafico);

  const minWidthTabelaComparativoJogo =
    120 + kpisAtivosComparativo.length * (100 + 3 * 90);

  const linhasMesaA = useMemo(() => {
    if (!compMesaA) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaA);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaA)
      .sort((a, b) => a.data_relatorio.localeCompare(b.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaA]);

  const linhasMesaB = useMemo(() => {
    if (!compMesaB) return [];
    const src = historico ? porTabelaFiltradasHist : porTabelaFiltradas;
    if (historico) {
      return linhasMesaAgregadasPorMes(src, (r) => r.nome_tabela.trim() === compMesaB);
    }
    return src
      .filter((r) => r.nome_tabela.trim() === compMesaB)
      .sort((a, b) => a.data_relatorio.localeCompare(b.data_relatorio))
      .map(linhaMesaPorDiaFromRow);
  }, [historico, porTabelaFiltradasHist, porTabelaFiltradas, compMesaB]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) {
      setCompMesaA("");
      setCompMesaB("");
      return;
    }
    setCompMesaA((prev) =>
      prev && mesasOpcoesBlackjack.some((x) => x.key === prev) ? prev : mesasOpcoesBlackjack[0]!.key,
    );
  }, [mesasOpcoesBlackjack]);

  useEffect(() => {
    if (mesasOpcoesBlackjack.length === 0) return;
    setCompMesaB((prev) => {
      if (prev && mesasOpcoesBlackjack.some((x) => x.key === prev) && prev !== compMesaA) return prev;
      const alt = mesasOpcoesBlackjack.find((x) => x.key !== compMesaA);
      return alt?.key ?? mesasOpcoesBlackjack[0]!.key;
    });
  }, [mesasOpcoesBlackjack, compMesaA]);

  const isHistoricoKpi = historico || dailyDataPrevMonth.length === 0;

  const brand = useDashboardBrand();

  const card: React.CSSProperties = {
    background: brand.blockBg,
    border: `1px solid ${t.cardBorder}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
  };

  const thStyle = getThStyle(t, { verticalAlign: "middle", background: "rgba(74,32,130,0.08)" });
  const tdStyle = getTdStyle(t, { padding: "9px 12px" });
  const tdNum = getTdNumStyle(t, { padding: "9px 12px" });

  const isPrimeiro = idxMes === 0;
  const isUltimo = idxMes === mesesDisponiveis.length - 1;

  const btnNav: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: `1px solid ${t.cardBorder}`,
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

  const selectStyleSimple: React.CSSProperties = {
    ...selectStyle,
    padding: "7px 12px",
  };

  const labelMesaComparativoA = mesasOpcoesBlackjack.find((m) => m.key === compMesaA)?.label ?? "—";
  const labelMesaComparativoB = mesasOpcoesBlackjack.find((m) => m.key === compMesaB)?.label ?? "—";

  const renderMesaDiaTabela = (
    linhas: LinhaMesaPorDia[],
    rowStripe: string,
    colTempo: "Data" | "Mês" = "Data",
  ) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>{colTempo}</th>
            <th style={{ ...thStyle, textAlign: "right" }}>GGR</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Turnover</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Apostas</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Margem</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Aposta média</th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...tdStyle, color: t.textMuted, textAlign: "center" }}>
                {MSG_SEM_DADOS_FILTRO}
              </td>
            </tr>
          ) : (
            linhas.map((row, i) => {
              const ggr = row.ggr ?? 0;
              return (
                <tr key={row.dataIso} style={{ background: i % 2 === 1 ? rowStripe : "transparent" }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.labelData}</td>
                  <td
                    style={{
                      ...tdNum,
                      color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                      fontWeight: 600,
                    }}
                  >
                    {row.ggr != null ? fmtBRL(row.ggr) : "—"}
                  </td>
                  <td style={tdNum}>{row.turnover != null ? fmtBRL(row.turnover) : "—"}</td>
                  <td style={tdNum}>{row.bets != null ? row.bets.toLocaleString("pt-BR") : "—"}</td>
                  <td style={{ ...tdNum }}>
                    <MarginBadge value={row.margin_pct} />
                  </td>
                  <td style={tdNum}>{row.bet_size != null ? fmtBRL(Number(row.bet_size)) : "—"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const thJogoComparativoSub: React.CSSProperties = {
    ...thStyle,
    textAlign: "right",
    fontSize: 9,
    letterSpacing: "0.04em",
    textTransform: "none",
    fontWeight: 600,
  };

  const COR_TOTAL_COMP = isDark ? "#ffffff" : "#000000";
  const COR_PCT_COMP = isDark ? "#ffffff" : "#000000";

  const thStickyComparativo: React.CSSProperties = {
    ...thStyle,
    position: "sticky",
    left: 0,
    zIndex: 3,
    background: brand.blockBg,
    boxShadow: "2px 0 6px -2px rgba(0,0,0,0.25)",
  };

  const tdStickyComparativo = (i: number): React.CSSProperties => ({
    ...tdStyle,
    position: "sticky",
    left: 0,
    zIndex: 2,
    fontWeight: 600,
    background:
      i % 2 === 1
        ? `color-mix(in srgb, ${brand.blockBg} 95%, rgba(74,32,130,0.06))`
        : brand.blockBg,
    boxShadow: "2px 0 6px -2px rgba(0,0,0,0.25)",
  });

  function TooltipComparativoJogo({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: {
      name?: string;
      value?: unknown;
      color?: string;
      payload?: { Total?: number | null };
    }[];
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    const somavel = kpiGraficoConfig.somavel;
    const full = payload[0]?.payload;
    const totalOficial = full?.Total;
    const totalSomavelFallback = payload.reduce((s, p) => {
      const n = Number(p.value);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    const totalSomavel =
      totalOficial != null && Number.isFinite(Number(totalOficial))
        ? Number(totalOficial)
        : totalSomavelFallback;
    const formatar = (v: number) =>
      isBRLKpiGrafico
        ? fmtBRL(v)
        : kpiGrafico === "margin_pct"
          ? `${v.toFixed(1)}%`
          : v.toLocaleString("pt-BR");

    const mostrarRodapeTotal =
      somavel ||
      kpiGrafico === "margin_pct" ||
      kpiGrafico === "bet_size";

    const valorRodape =
      totalOficial != null && Number.isFinite(Number(totalOficial))
        ? Number(totalOficial)
        : null;

    return (
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: t.text,
          fontFamily: FONT.body,
          minWidth: 160,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: t.text }}>{label}</div>
        {payload.map((p) => (
          <div
            key={String(p.name)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 4,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                }}
              />
              {p.name}
            </span>
            <span style={{ fontWeight: 600 }}>
              {p.value != null && p.value !== ""
                ? formatar(Number(p.value))
                : "—"}
            </span>
          </div>
        ))}
        {mostrarRodapeTotal && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginTop: 6,
              paddingTop: 6,
              borderTop: `1px solid ${t.cardBorder}`,
            }}
          >
            <span style={{ fontWeight: 700, color: COR_TOTAL_COMP }}>Total</span>
            <span style={{ fontWeight: 700, color: COR_TOTAL_COMP }}>
              {somavel
                ? formatar(totalSomavel)
                : valorRodape != null
                  ? formatar(valorRodape)
                  : "—"}
            </span>
          </div>
        )}
      </div>
    );
  }

  const renderComparativoJogoInterativo = (colTempoLabel: "Data" | "Mês") => (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: 10,
                color: t.textMuted,
                fontFamily: FONT.body,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                marginRight: 2,
              }}
            >
              KPIs visíveis:
            </span>
            {KPIS_DISPONIVEIS.map((kpi) => {
              const ativo =
                modoVisualizacao === "tabela"
                  ? kpisSelecionados.has(kpi.key)
                  : kpiGrafico === kpi.key;
              return (
                <button
                  type="button"
                  role="button"
                  key={kpi.key}
                  aria-pressed={ativo}
                  aria-label={
                    modoVisualizacao === "tabela"
                      ? `${ativo ? "Desativar" : "Ativar"} KPI ${kpi.label}`
                      : `KPI do gráfico: ${kpi.label}`
                  }
                  onClick={() => {
                    if (modoVisualizacao === "tabela") {
                      setKpisSelecionados((prev) => {
                        const next = new Set(prev);
                        if (next.has(kpi.key) && next.size === 1) return prev;
                        if (next.has(kpi.key)) next.delete(kpi.key);
                        else next.add(kpi.key);
                        return next;
                      });
                    } else {
                      setKpiGrafico(kpi.key);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 11,
                    fontWeight: ativo ? 700 : 400,
                    border: `1px solid ${ativo ? BRAND.roxoVivo : t.cardBorder}`,
                    background: ativo ? "rgba(124,58,237,0.12)" : "transparent",
                    color: ativo ? BRAND.roxoVivo : t.textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ativo ? BRAND.roxoVivo : t.cardBorder,
                      flexShrink: 0,
                      transition: "background 0.15s",
                    }}
                  />
                  {kpi.label}
                </button>
              );
            })}
          </div>
          {modoVisualizacao === "grafico" && (
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: FONT.body }}>
              Selecione um KPI para o gráfico
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {(
            [
              { modo: "tabela" as const, icon: <Table2 size={14} aria-hidden />, label: "Tabela" },
              { modo: "grafico" as const, icon: <ChartColumnBig size={14} aria-hidden />, label: "Gráfico" },
            ] as const
          ).map(({ modo, icon, label }) => (
            <button
              type="button"
              key={modo}
              aria-label={`Ver em ${label}`}
              aria-pressed={modoVisualizacao === modo}
              onClick={() => setModoVisualizacao(modo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 11,
                fontWeight: modoVisualizacao === modo ? 700 : 400,
                background: modoVisualizacao === modo ? "rgba(124,58,237,0.12)" : "transparent",
                color: modoVisualizacao === modo ? BRAND.roxoVivo : t.textMuted,
                transition: "all 0.15s",
                borderRight: modo === "tabela" ? `1px solid ${t.cardBorder}` : "none",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {modoVisualizacao === "tabela" ? (
        <div className="app-table-wrap" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: minWidthTabelaComparativoJogo,
              }}
            >
              <caption style={{ display: "none" }}>
                Comparativo de jogo {colTempoLabel === "Mês" ? "histórico" : (mesSelecionado?.label ?? "")}
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" style={thStickyComparativo}>
                    {colTempoLabel}
                  </th>
                  {kpisAtivosComparativo.map((kpi) => (
                    <th
                      key={kpi.key}
                      colSpan={4}
                      scope="colgroup"
                      style={{
                        ...thStyle,
                        textAlign: "center",
                        borderLeft: `2px solid ${t.cardBorder}`,
                        borderBottom: "none",
                      }}
                    >
                      {kpi.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {kpisAtivosComparativo.map((kpi) => (
                    <Fragment key={`sub-${kpi.key}`}>
                      <th
                        scope="col"
                        style={{
                          ...thJogoComparativoSub,
                          borderLeft: `2px solid ${t.cardBorder}`,
                          fontSize: 9,
                          color: t.text,
                          fontWeight: 700,
                        }}
                      >
                        Total
                      </th>
                      {JOGOS_COMPARATIVO.map((jogo) => (
                        <th
                          key={jogo.key}
                          scope="col"
                          style={{
                            ...thJogoComparativoSub,
                            fontSize: 9,
                            fontWeight: 600,
                            color: jogo.cor,
                            letterSpacing: "0.04em",
                            textTransform: "none",
                          }}
                        >
                          {jogo.label}
                        </th>
                      ))}
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasComparativoJogo.map((row, i) => {
                  const totaisOficiais = row.totaisOficiais;
                  return (
                    <tr
                      key={row.dataIso}
                      style={{
                        background: i % 2 === 1 ? "rgba(74,32,130,0.05)" : "transparent",
                      }}
                    >
                      <th scope="row" style={tdStickyComparativo(i)}>
                        {row.labelData}
                      </th>
                      {kpisAtivosComparativo.map((kpi) => (
                        <Fragment key={`${row.dataIso}-${kpi.key}`}>
                          <td
                            style={{
                              ...tdNum,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              borderLeft: `2px solid ${t.cardBorder}`,
                              fontWeight: 700,
                              color: COR_TOTAL_COMP,
                            }}
                          >
                            {renderValorKpiComparativo(kpi, totaisOficiais[kpi.key])}
                          </td>
                          {JOGOS_COMPARATIVO.map((jogo) => {
                            const cel = row[jogo.key];
                            const valorJogo = cel[kpi.key] as number | null;
                            const pct = calcularPctComparativoOficial(valorJogo, row, kpi);
                            return (
                              <td
                                key={jogo.key}
                                style={{
                                  ...tdNum,
                                  textAlign: "right",
                                  fontVariantNumeric: "tabular-nums",
                                  color: jogo.cor,
                                  fontWeight: 600,
                                }}
                              >
                                {valorJogo != null ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      gap: 1,
                                    }}
                                  >
                                    <span>{renderValorKpiComparativo(kpi, valorJogo)}</span>
                                    {kpi.somavel && pct != null && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: COR_PCT_COMP,
                                          fontWeight: 700,
                                          opacity: 0.75,
                                        }}
                                      >
                                        {pct.toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : linhasComparativoJogo.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: t.textMuted,
            fontSize: 12,
            fontFamily: FONT.body,
          }}
        >
          {MSG_SEM_DADOS_FILTRO}
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: 11,
              color: t.textMuted,
              fontFamily: FONT.body,
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            Exibindo <strong style={{ color: t.text }}>{kpiGraficoConfig.label}</strong> por jogo
          </p>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {kpiGraficoConfig.tipoGrafico === "barra" ? (
                <BarChart
                  data={dadosGraficoComparativoJogo}
                  margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                    interval="preserveStartEnd"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                    width={isBRLKpiGrafico ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGrafico ? `R$${(v / 1000).toFixed(0)}K` : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<TooltipComparativoJogo />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  <Bar
                    dataKey="Blackjack"
                    fill={COR_BLACKJACK}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar dataKey="Roleta" fill={COR_ROLETA} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Baccarat" fill={COR_BACCARAT} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              ) : (
                <LineChart
                  data={dadosGraficoComparativoJogo}
                  margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={t.cardBorder} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                    interval="preserveStartEnd"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: t.textMuted, fontFamily: FONT.body }}
                    width={isBRLKpiGrafico ? 72 : 44}
                    tickFormatter={(v) =>
                      isBRLKpiGrafico
                        ? `R$${(v / 1000).toFixed(0)}K`
                        : kpiGrafico === "margin_pct"
                          ? `${v.toFixed(0)}%`
                          : v.toLocaleString("pt-BR")
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<TooltipComparativoJogo />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted, fontFamily: FONT.body }} />
                  <Line
                    type="monotone"
                    name="Blackjack"
                    dataKey="Blackjack"
                    stroke={COR_BLACKJACK}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    name="Roleta"
                    dataKey="Roleta"
                    stroke={COR_ROLETA}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    name="Baccarat"
                    dataKey="Baccarat"
                    stroke={COR_BACCARAT}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );

  if (perm.canView === "nao") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
        Você não tem permissão para visualizar Mesas Spin.
      </div>
    );
  }

  return (
    <div
      className="app-page-shell app-page-shell--pb64"
      style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}
    >
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
            }}
          >
            <button
              type="button"
              aria-label="Mês anterior"
              style={{
                ...btnNav,
                opacity: historico || isPrimeiro ? 0.35 : 1,
                cursor: historico || isPrimeiro ? "not-allowed" : "pointer",
              }}
              onClick={irMesAnterior}
              disabled={historico || isPrimeiro}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: FONT.body,
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {historico ? "Todo o período" : mesSelecionado?.label}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              style={{
                ...btnNav,
                opacity: historico || isUltimo ? 0.35 : 1,
                cursor: historico || isUltimo ? "not-allowed" : "pointer",
              }}
              onClick={irMesProximo}
              disabled={historico || isUltimo}
            >
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
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 13,
                border: historico ? `1px solid ${brand.accent}` : `1px solid ${t.cardBorder}`,
                background: historico
                  ? brand.useBrand
                    ? "color-mix(in srgb, var(--brand-accent) 15%, transparent)"
                    : `${BRAND.roxoVivo}18`
                  : "transparent",
                color: historico ? brand.accent : t.textMuted,
                fontWeight: historico ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              <GiCalendar size={15} aria-hidden /> Histórico
            </button>

            {showFiltroOperadora && (
              <SelectComIcone
                icon={<GiShield size={15} aria-hidden />}
                label="Filtrar por operadora"
                value={filtroOperadora}
                onChange={setFiltroOperadora}
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
              </SelectComIcone>
            )}

            {loading && (
              <span
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: FONT.body,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={12} /> Carregando...
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 14 }}>
          <SectionHeader
            icon={<LayoutGrid size={15} />}
            title="KPIs Consolidados"
            sub={
              historico
                ? "acumulado"
                : "comparativo MTD vs mesmo período do mês anterior"
            }
          />
          {loading ? (
            <>
              <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonKpiCard key={i} />
                ))}
              </div>
              <div className="app-grid-kpi-3" style={{ gap: 12 }}>
                {[0, 1, 2].map((i) => (
                  <SkeletonKpiCard key={i} />
                ))}
              </div>
            </>
          ) : (
            <>
          <div className="app-grid-kpi-4" style={{ gap: 12, marginBottom: 12 }}>
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
          </div>
          <div className="app-grid-kpi-3" style={{ gap: 12 }}>
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
            <KpiCard
              label={historico ? "Média UAP" : "UAP"}
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
            </>
          )}
        </div>

      <div style={{ ...card, marginBottom: 14 }}>
        <SectionHeader
          icon={<GiCalendar size={15} />}
          title={historico ? "Comparativo Mensal" : "Detalhamento Diário"}
          sub={historico ? "mês a mês" : "dia a dia"}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            <Clock size={16} style={{ marginBottom: 8 }} />
            <div>Carregando...</div>
          </div>
        ) : tabelaRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            {MSG_SEM_DADOS_FILTRO}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{historico ? "Mês" : "Data"}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>GGR</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Turnover</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Apostas</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Margem</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aposta média</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>UAP</th>
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
                      <td
                        style={{
                          ...tdNum,
                          color: ggr > 0 ? BRAND.verde : ggr < 0 ? BRAND.vermelho : t.text,
                          fontWeight: 600,
                        }}
                      >
                        {r.ggr != null ? fmtBRL(r.ggr) : "—"}
                      </td>
                      <td style={tdNum}>{r.turnover != null ? fmtBRL(r.turnover) : "—"}</td>
                      <td style={tdNum}>{r.bets != null ? r.bets.toLocaleString("pt-BR") : "—"}</td>
                      <td style={{ ...tdNum }}>
                        <MarginBadge value={r.margin_pct} />
                      </td>
                      <td style={tdNum}>{r.bet_size != null ? fmtBRL(Number(r.bet_size)) : "—"}</td>
                      <td style={tdNum}>{r.uap != null ? r.uap.toLocaleString("pt-BR") : "—"}</td>
                      <td style={tdNum}>{r.arpu != null ? fmtBRL(Number(r.arpu)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!historico && (
        <>
          {loading ? (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub={mesSelecionado?.label}
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<Table2 size={15} />}
                  title="Dados por mesa"
                  sub="Baccarat e Roleta"
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
            </>
          ) : porTabelaRows.length === 0 ? (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub={mesSelecionado?.label}
                />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" sub="Baccarat e Roleta" />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub={mesSelecionado?.label}
                />
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  renderComparativoJogoInterativo("Data")
                )}
              </div>

              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 12,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    lineHeight: 1.45,
                  }}
                >
                  Escolha duas mesas para ver os resultados.
                </p>

                {mesasOpcoesBlackjack.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <>
                    <div className="app-conversao-vs-row">
                      <select
                        value={compMesaA}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaA(v);
                          if (v && v === compMesaB) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaB(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaA ? COR_MESA_A.border : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                      <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(74,32,130,0.35)",
                          background: "rgba(74,32,130,0.10)",
                          fontSize: 12,
                          fontWeight: 800,
                          color: t.textMuted,
                          fontFamily: FONT.body,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                        }}
                      >
                        VS
                      </div>
                      <select
                        value={compMesaB}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaB(v);
                          if (v && v === compMesaA) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaA(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaB ? COR_MESA_B.border : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {(compMesaA || compMesaB) && (
                      <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: COR_MESA_A.bg,
                            border: `1px solid ${COR_MESA_A.border}`,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: COR_MESA_A.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoA}
                        </div>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: COR_MESA_B.bg,
                            border: `1px solid ${COR_MESA_B.border}`,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: COR_MESA_B.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoB}
                        </div>
                      </div>
                    )}

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaA, "rgba(124,58,237,0.06)")}
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaB, "rgba(30,54,248,0.06)")}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" sub="Baccarat e Roleta" />

                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(112,202,228,0.10)",
                        border: "1px solid rgba(112,202,228,0.35)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: BRAND.ciano,
                        fontFamily: FONT.body,
                      }}
                    >
                      Speed Baccarat
                    </div>
                    {renderMesaDiaTabela(linhasSpeedBaccarat, "rgba(74,32,130,0.06)")}
                  </div>
                  <div
                    className="app-conversao-funil-divider"
                    style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(124,58,237,0.10)",
                        border: "1px solid rgba(124,58,237,0.30)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: BRAND.roxoVivo,
                        fontFamily: FONT.body,
                      }}
                    >
                      Roleta
                    </div>
                    {renderMesaDiaTabela(linhasRoleta, "rgba(74,32,130,0.06)")}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {historico && (
        <>
          {loading ? (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub="mês a mês"
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<Table2 size={15} />}
                  title="Dados por mesa"
                  sub="Baccarat e Roleta"
                />
                <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                  <Clock size={16} style={{ marginBottom: 8 }} />
                  Carregando…
                </div>
              </div>
            </>
          ) : porTabelaHistAll.length === 0 ? (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub="mês a mês"
                />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" sub="Baccarat e Roleta" />
                <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                  {MSG_SEM_DADOS_FILTRO}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiDiceSixFacesFour size={15} />}
                  title="Comparativo de Jogo"
                  sub="mês a mês"
                />
                {linhasComparativoJogo.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  renderComparativoJogoInterativo("Mês")
                )}
              </div>

              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader
                  icon={<GiConvergenceTarget size={15} />}
                  title="Comparativo de mesa"
                  sub="Blackjack"
                />
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 12,
                    color: t.textMuted,
                    fontFamily: FONT.body,
                    lineHeight: 1.45,
                  }}
                >
                  Escolha duas mesas para ver os resultados.
                </p>

                {mesasOpcoesBlackjack.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontFamily: FONT.body }}>
                    {MSG_SEM_DADOS_FILTRO}
                  </div>
                ) : (
                  <>
                    <div className="app-conversao-vs-row">
                      <select
                        value={compMesaA}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaA(v);
                          if (v && v === compMesaB) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaB(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaA ? COR_MESA_A.border : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaB)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                      <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(74,32,130,0.35)",
                          background: "rgba(74,32,130,0.10)",
                          fontSize: 12,
                          fontWeight: 800,
                          color: t.textMuted,
                          fontFamily: FONT.body,
                          letterSpacing: "0.05em",
                          textAlign: "center",
                        }}
                      >
                        VS
                      </div>
                      <select
                        value={compMesaB}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCompMesaB(v);
                          if (v && v === compMesaA) {
                            const o = mesasOpcoesBlackjack.find((m) => m.key !== v);
                            if (o) setCompMesaA(o.key);
                          }
                        }}
                        style={{
                          ...selectStyleSimple,
                          borderColor: compMesaB ? COR_MESA_B.border : undefined,
                          width: "100%",
                        }}
                      >
                        {mesasOpcoesBlackjack
                          .filter((m) => mesasOpcoesBlackjack.length < 2 || m.key !== compMesaA)
                          .map((m) => (
                            <option key={m.key} value={m.key}>
                              {m.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    {(compMesaA || compMesaB) && (
                      <div className="app-grid-2" style={{ gap: 16, marginBottom: 14 }}>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: COR_MESA_A.bg,
                            border: `1px solid ${COR_MESA_A.border}`,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: COR_MESA_A.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoA}
                        </div>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: COR_MESA_B.bg,
                            border: `1px solid ${COR_MESA_B.border}`,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: COR_MESA_B.accent,
                            fontFamily: FONT.body,
                          }}
                        >
                          {labelMesaComparativoB}
                        </div>
                      </div>
                    )}

                    <div className="app-conversao-funil-duo">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaA, "rgba(124,58,237,0.06)", "Mês")}
                      </div>
                      <div
                        className="app-conversao-funil-divider"
                        style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renderMesaDiaTabela(linhasMesaB, "rgba(30,54,248,0.06)", "Mês")}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ ...card, marginBottom: 14 }}>
                <SectionHeader icon={<Table2 size={15} />} title="Dados por mesa" sub="Baccarat e Roleta" />

                <div className="app-conversao-funil-duo">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(112,202,228,0.10)",
                        border: "1px solid rgba(112,202,228,0.35)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: BRAND.ciano,
                        fontFamily: FONT.body,
                      }}
                    >
                      Speed Baccarat
                    </div>
                    {renderMesaDiaTabela(linhasSpeedBaccarat, "rgba(74,32,130,0.06)", "Mês")}
                  </div>
                  <div
                    className="app-conversao-funil-divider"
                    style={{ width: 1, background: t.cardBorder, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        marginBottom: 10,
                        padding: "6px 10px",
                        borderRadius: 10,
                        background: "rgba(124,58,237,0.10)",
                        border: "1px solid rgba(124,58,237,0.30)",
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: BRAND.roxoVivo,
                        fontFamily: FONT.body,
                      }}
                    >
                      Roleta
                    </div>
                    {renderMesaDiaTabela(linhasRoleta, "rgba(74,32,130,0.06)", "Mês")}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
