import type { ReactNode } from "react";
import { fmtBRL, getPeriodoComparativoMoM } from "../../../lib/dashboardHelpers";
import {
  JOGOS_IDENTIDADE_LISTA,
  type GameIdentityKey,
} from "../../../lib/gameIdentityColors";
import { supabase } from "../../../lib/supabase";

/** Legenda MoM do card UAP: referência é o mês anterior fechado (mensal), não o recorte MTD. */
export const KPI_UAP_VS_LEGENDA = "período completo do mês ant.";

/** Zebras por coluna nas tabelas de mesa — alinhado a tokens de marca. */
export interface DailyRow {
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

export interface MonthlyRow {
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
export type LinhaDetalheTab = Pick<DailyRow, "turnover" | "ggr" | "bets" | "uap"> & {
  label: string;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
  /** Chave estável para drilldown (YYYY-MM-DD ou YYYY-MM). */
  drillId?: string;
  /** Eixo temporal do gráfico (YYYY-MM-DD no diário; YYYY-MM-01 no mensal). */
  periodoIso: string;
};

export type UapPorJogoPlanRow = { data: string; jogo: string; uap: number | null };

export interface PorTabelaRow {
  data_relatorio: string;
  nome_tabela: string;
  /** Valor de `relatorio_por_tabela.mesa` — usado para classificar jogo quando o prefixo de `operadoras.nome` ≠ texto em `nome_tabela`. */
  mesaRaw?: string;
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

export const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Primeiro mês com operação Overview Spin — o carrossel não lista meses anteriores (evita confusão). */
export const CARROSSEL_MESAS_MIN_ANO = 2025;
export const CARROSSEL_MESAS_MIN_MES = 11; // Dezembro (0-based)
export const CARROSSEL_MESAS_QTD_MESES = 3;

export function getMesesDisponiveis(ref = new Date()) {
  const hoje = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const inicioOperacao = new Date(CARROSSEL_MESAS_MIN_ANO, CARROSSEL_MESAS_MIN_MES, 1);
  const inicioJanela = new Date(
    hoje.getFullYear(),
    hoje.getMonth() - (CARROSSEL_MESAS_QTD_MESES - 1),
    1,
  );
  const inicio = inicioJanela < inicioOperacao ? inicioOperacao : inicioJanela;
  const lista: { ano: number; mes: number; label: string }[] = [];
  let ano = inicio.getFullYear();
  let mes = inicio.getMonth();
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

export const OPERADORA_CASA_APOSTAS = "casa_apostas";
export const OPERADORA_OUTRAS = "outras_mesas";
/** Nome canónico da mesa/jogo no PLS e no comparativo (`relatorio_por_tabela.mesa`, `relatorio_uap_por_jogo.jogo`). */
export const LABEL_FUTEBOL_BRASILEIRO = "Futebol Brasileiro";

export function slugFromRelatorioOperadora(operadoraRaw: string): string {
  const t = operadoraRaw.trim().toLowerCase();
  if (t.includes("casa de apostas")) return OPERADORA_CASA_APOSTAS;
  if (t.includes("bet nacional")) return "bet_nacional";
  const slug = t.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return slug.length > 0 ? slug : OPERADORA_OUTRAS;
}

/** v2: reconstrói nome completo tipo print para heurísticas CDA + exibição. */
export function syntheticNomeTabela(operadora: string, mesa: string): string {
  const op = operadora.trim();
  const m = mesa.trim();
  if (!op) return m;
  return `${op} ${m}`;
}

export function mapPorTabelaV2(r: {
  dia: string;
  operadora: string;
  operadora_slug?: string | null;
  mesa: string;
  ggr: number | null;
  turnover: number | null;
  apostas: number | null;
}): PorTabelaRow {
  const nome = syntheticNomeTabela(r.operadora, r.mesa);
  const slug =
    r.operadora_slug != null && String(r.operadora_slug).trim().length > 0
      ? String(r.operadora_slug).trim()
      : slugFromRelatorioOperadora(r.operadora);
  const mesaRaw = String(r.mesa ?? "").trim();
  return {
    data_relatorio: r.dia,
    nome_tabela: nome,
    ...(mesaRaw.length > 0 ? { mesaRaw } : {}),
    operadora: slug,
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

export function canonicalMesaCasaAposta(nomeTabela: string): string | null {
  const t = nomeTabela.trim();
  const pares: readonly (readonly [RegExp, string])[] = [
    [/^casa de apostas?\s+vip\s+blackjack\s+1\s*$/i, "Blackjack VIP"],
    [/^casa de apostas?\s+blackjack\s+1\s*$/i, "Blackjack 1"],
    [/^casa de apostas?\s+blackjack\s+2\s*$/i, "Blackjack 2"],
    [/^casa de apostas?\s+speed\s+baccarat\s*$/i, "Speed Baccarat"],
    [/^casa de apostas?\s+roulette\s*$/i, "Roleta"],
    [/^casa de apostas?\s+r(o|ou)leta\s*$/i, "Roleta"],
    [/^casa de apostas?\s+futebol\s+brasileiro\s*$/i, LABEL_FUTEBOL_BRASILEIRO],
  ];
  for (const [re, mesa] of pares) {
    if (re.test(t)) return mesa;
  }
  return null;
}

export function nomeMesaCdaCurto(nomeTabela: string): string {
  const s = nomeTabela.replace(/^casa de apostas?\s+/i, "").trim();
  return s.length > 0 ? s : nomeTabela.trim();
}

export function isMesaCasaApostas(row: PorTabelaRow): boolean {
  if (row.operadora === OPERADORA_CASA_APOSTAS) return true;
  if (row.operadora != null && row.operadora !== OPERADORA_OUTRAS) return false;
  return /^casa de apostas?\b/i.test(row.nome_tabela);
}

export function slugOperadoraPorLinha(row: PorTabelaRow): string {
  if (row.operadora != null && String(row.operadora).length > 0) return row.operadora;
  if (isMesaCasaApostas(row)) return OPERADORA_CASA_APOSTAS;
  return OPERADORA_OUTRAS;
}

export function nomeMesaParaExibicao(
  row: PorTabelaRow,
  slug: string,
  operadorasList: { slug: string; nome: string }[],
): string {
  if (row.mesaRaw != null && row.mesaRaw.length > 0) {
    const fromCol = canonicalMesasSpinFromMesaColumn(row.mesaRaw);
    if (fromCol != null) return fromCol;
  }
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

export const LABELS_BLACKJACK_COMPARATIVO = new Set(["Blackjack 1", "Blackjack 2", "Blackjack VIP"]);

/** Alinha ao inventário canónico de mesas Spin (coluna `mesa` no banco). */
export function canonicalMesasSpinFromMesaColumn(mesa: string): string | null {
  const m = mesa.trim();
  if (!m) return null;
  const ml = m.toLowerCase();
  if (ml === "blackjack 1") return "Blackjack 1";
  if (ml === "blackjack 2") return "Blackjack 2";
  if (ml === "blackjack vip") return "Blackjack VIP";
  if (ml === "roleta" || ml === "roulette") return "Roleta";
  if (ml === "speed baccarat") return "Speed Baccarat";
  if (ml === "futebol brasileiro") return LABEL_FUTEBOL_BRASILEIRO;
  return null;
}

export function isMesaFutebolBrasileiro(
  row: PorTabelaRow,
  operadorasList: { slug: string; nome: string }[],
): boolean {
  return labelMesaCda(row, operadorasList) === LABEL_FUTEBOL_BRASILEIRO;
}

export function labelMesaCda(
  row: PorTabelaRow,
  operadorasList: { slug: string; nome: string }[],
): string {
  return nomeMesaParaExibicao(row, slugOperadoraPorLinha(row), operadorasList);
}

export function isMesaBlackjackComparativo(
  row: PorTabelaRow,
  operadorasList: { slug: string; nome: string }[],
): boolean {
  return LABELS_BLACKJACK_COMPARATIVO.has(labelMesaCda(row, operadorasList));
}

export function filtrarPorEscopoOperadora(
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
export function fmtDiaMesPtBr(isoYmd: string): string {
  return new Date(isoYmd + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** `YYYY-MM-DD` a partir de string vinda do PostgREST (date ou timestamptz). */
export function normalizeMesasYmd(isoish: string): string {
  const s = String(isoish ?? "").trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Soma/subtrai dias no calendário (UTC) sem depender do fuso local do browser. */
export function addCalendarDaysIso(ymd: string, deltaDays: number): string {
  const ymdN = normalizeMesasYmd(ymd);
  const [y, m, d] = ymdN.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymdN;
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type PorTabelaGameBucket = {
  bj: PorTabelaRow[];
  roleta: PorTabelaRow[];
  baccarat: PorTabelaRow[];
  futebolBrasileiro: PorTabelaRow[];
};

/** Agrupa `relatorio_por_tabela` pela data operacional do resumo diário: `operacional = dia_na_linha + shiftDays`. */
export function buildPorTabelaGameBuckets(
  rows: PorTabelaRow[],
  operadorasListFmt: { slug: string; nome: string }[],
  shiftDays: number,
): Map<string, PorTabelaGameBucket> {
  const byDate = new Map<string, PorTabelaGameBucket>();
  for (const r of rows) {
    const diaLinha = normalizeMesasYmd(r.data_relatorio);
    const operational = addCalendarDaysIso(diaLinha, shiftDays);
    const label = labelMesaCda(r, operadorasListFmt);
    if (!byDate.has(operational)) {
      byDate.set(operational, { bj: [], roleta: [], baccarat: [], futebolBrasileiro: [] });
    }
    const bucket = byDate.get(operational)!;
    if (isMesaBlackjackComparativo(r, operadorasListFmt)) bucket.bj.push(r);
    else if (label === "Roleta") bucket.roleta.push(r);
    else if (label === "Speed Baccarat") bucket.baccarat.push(r);
    else if (label === LABEL_FUTEBOL_BRASILEIRO) bucket.futebolBrasileiro.push(r);
  }
  return byDate;
}

export function sumComparableGameBets(bucket: PorTabelaGameBucket): number {
  const bj = aggregateCellFromPorTabelaRows(bucket.bj).bets;
  const rl = aggregateCellFromPorTabelaRows(bucket.roleta).bets;
  const bc = aggregateCellFromPorTabelaRows(bucket.baccarat).bets;
  const fb = aggregateCellFromPorTabelaRows(bucket.futebolBrasileiro).bets;
  return (bj ?? 0) + (rl ?? 0) + (bc ?? 0) + (fb ?? 0);
}

/**
 * Alguns lotes gravam `relatorio_por_tabela.dia` com calendário deslocado em ±1 dia em relação a
 * `relatorio_daily_summary.data`. Escolhe o shift que melhor alinha soma(BJ+Roleta+Bacc+FB) ao total de apostas.
 */
/**
 * Penalidade quando há apostas no resumo diário mas nenhuma mesa comparável no bucket.
 * Precisa ser maior que a penalidade de “soma de mesas > total” (duplicados / ruído no por_tabela),
 * senão o shift ±1 que esvazia um dia civil (ex.: 10/04) ainda vence o shift 0.
 */
export const POR_SHIFT_PENALTY_DIA_SEM_BREAKDOWN = 3e12;

/** Excesso de apostas nas mesas vs resumo diário — valor alto mas abaixo de `POR_SHIFT_PENALTY_DIA_SEM_BREAKDOWN`. */
export const POR_SHIFT_PENALTY_SOMA_MESAS_ACIMA_TOTAL = 8e11;

export function pickPorTabelaOperDayShift(
  dailyRows: DailyRow[],
  porRows: PorTabelaRow[],
  operadorasListFmt: { slug: string; nome: string }[],
): number {
  const SHIFTS = [0, 1, -1] as const;
  let best: number = 0;
  let bestScore = Infinity;
  for (const s of SHIFTS) {
    const byDate = buildPorTabelaGameBuckets(porRows, operadorasListFmt, s);
    let penalty = 0;
    let n = 0;
    for (const dr of dailyRows) {
      const key = normalizeMesasYmd(dr.data);
      const b = byDate.get(key) ?? { bj: [], roleta: [], baccarat: [], futebolBrasileiro: [] };
      const sumG = sumComparableGameBets(b);
      const off = dr.bets != null ? Number(dr.bets) : null;
      if (off == null || off <= 0) continue;
      n++;
      if (sumG <= 0) {
        penalty += POR_SHIFT_PENALTY_DIA_SEM_BREAKDOWN;
        continue;
      }
      if (sumG > off * 1.0005) penalty += POR_SHIFT_PENALTY_SOMA_MESAS_ACIMA_TOTAL;
      penalty += (sumG - off) ** 2;
    }
    const sc = n === 0 ? 1e18 : penalty;
    if (sc < bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  return best;
}

/** `YYYY-MM` → ex.: Jan/2026, Dez/2025 (coluna Mês na visão histórico). */
export function fmtMesAnoCurtoFromYm(ym: string): string {
  const [ys, ms] = ym.split("-");
  const mo = Number(ms);
  const y = Number(ys);
  if (!ys || !Number.isFinite(mo) || mo < 1 || mo > 12) return ym;
  return `${MESES_CURTOS[mo - 1]}/${y}`;
}

/** Último dia do mês com UAP em `relatorio_uap_por_jogo` (snapshot para pesos no histórico). */
export function uapUltimoDiaDoMesPorJogo(rows: UapPorJogoPlanRow[], ym: string, jogo: string): number | undefined {
  let bestData: string | null = null;
  let uap: number | undefined;
  for (const r of rows) {
    if (r.data.slice(0, 7) !== ym || r.jogo !== jogo || r.uap == null) continue;
    if (bestData == null || r.data > bestData) {
      bestData = r.data;
      uap = Number(r.uap);
    }
  }
  return uap;
}

export const UAP_JOGO_MAP: Record<string, "blackjack" | "roleta" | "baccarat" | "futebol_brasileiro"> = {
  Blackjack: "blackjack",
  Roleta: "roleta",
  "Speed Baccarat": "baccarat",
  [LABEL_FUTEBOL_BRASILEIRO]: "futebol_brasileiro",
};

/**
 * Filtra consultas às tabelas de relatório por `operadora_slug`.
 * Tipagem solta: o encadeamento genérico do PostgREST dispara TS2589 se o builder for tipado de forma estrita aqui.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function applyMesasOperadoraSlugFilter(q: any, slugList: string[] | null): any {
  if (slugList != null && slugList.length > 0) {
    return q.in("operadora_slug", slugList);
  }
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function buildSlugListForMesasQueries(opts: {
  operadoraSlugsForcado: string[] | null | undefined;
  filtroOperadora: string;
  semRestricaoEscopo: boolean;
  operadorasVisiveis: string[];
}): string[] | null {
  if (opts.operadoraSlugsForcado != null && opts.operadoraSlugsForcado.length > 0) {
    return [...opts.operadoraSlugsForcado];
  }
  if (!opts.semRestricaoEscopo && opts.operadorasVisiveis.length > 0) {
    return [...opts.operadorasVisiveis];
  }
  if (opts.filtroOperadora !== "todas") {
    return [opts.filtroOperadora];
  }
  return null;
}

export type DailyRawRow = {
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  uap: number | null;
  operadora_slug: string;
};

export function mergeDailyRowsPorData(rows: DailyRawRow[]): DailyRow[] {
  const by = new Map<string, DailyRawRow[]>();
  for (const r of rows) {
    const d = String(r.data).slice(0, 10);
    if (!by.has(d)) by.set(d, []);
    by.get(d)!.push(r);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, list]) => {
      const turnover = list.reduce((s, x) => s + Number(x.turnover ?? 0), 0);
      const ggr = list.reduce((s, x) => s + Number(x.ggr ?? 0), 0);
      const bets = list.reduce((s, x) => s + Number(x.apostas ?? 0), 0);
      const slugs = new Set(list.map((x) => x.operadora_slug));
      let uap: number | null = null;
      if (slugs.size === 1) {
        const withUap = list.find((x) => x.uap != null);
        uap = withUap != null && withUap.uap != null ? Number(withUap.uap) : null;
      }
      return {
        data,
        turnover: list.some((x) => x.turnover != null) ? turnover : null,
        ggr: list.some((x) => x.ggr != null) ? ggr : null,
        bets: list.some((x) => x.apostas != null) ? bets : null,
        uap,
        margin_pct: null,
        bet_size: null,
        arpu: null,
      };
    });
}

/** Filtro Todas Operadoras (`todas`): soma financeira por dia + soma de UAP entre operadoras; margem / aposta média; ARPU = GGR÷UAP. */
export function mergeDailyRowsAgregadoTodasOperadoras(rows: DailyRawRow[]): DailyRow[] {
  const by = new Map<string, DailyRawRow[]>();
  for (const r of rows) {
    const d = String(r.data).slice(0, 10);
    if (!by.has(d)) by.set(d, []);
    by.get(d)!.push(r);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([data, list]) => {
      const turnover = list.reduce((s, x) => s + Number(x.turnover ?? 0), 0);
      const ggr = list.reduce((s, x) => s + Number(x.ggr ?? 0), 0);
      const bets = list.reduce((s, x) => s + Number(x.apostas ?? 0), 0);
      const uaps = list
        .map((x) => x.uap)
        .filter((v): v is number => v != null && Number.isFinite(Number(v)))
        .map(Number);
      const uap = uaps.length > 0 ? uaps.reduce((a, b) => a + b, 0) : null;
      const hasT = list.some((x) => x.turnover != null);
      const hasG = list.some((x) => x.ggr != null);
      const hasB = list.some((x) => x.apostas != null);
      const margin_pct =
        hasT && turnover !== 0 && hasG && ggr != null ? (ggr / turnover) * 100 : null;
      const bet_size = hasB && bets !== 0 && hasT ? turnover / bets : null;
      const arpu = arpuComparativoFromGgrUap(hasG ? ggr : null, uap);
      return {
        data,
        turnover: hasT ? turnover : null,
        ggr: hasG ? ggr : null,
        bets: hasB ? bets : null,
        uap,
        margin_pct,
        bet_size,
        arpu,
      };
    });
}

/** Drilldown mensal: agrega `relatorio_daily_summary` por operadora no mês (ym = YYYY-MM). UAP do resumo mensal por operadora. */
export function agregaDailyRawPorOperadoraNoMes(
  rows: DailyRawRow[],
  ym: string,
  monthlyRows: MonthlyRawRow[],
): {
  operadora_slug: string;
  turnover: number;
  ggr: number;
  bets: number;
  uap: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
}[] {
  const uapPorSlug = new Map<string, number | null>();
  for (const r of monthlyRows) {
    if (String(r.mes).slice(0, 7) !== ym) continue;
    uapPorSlug.set(r.operadora_slug, r.uap != null ? Number(r.uap) : null);
  }
  const bySlug = new Map<string, DailyRawRow[]>();
  for (const r of rows) {
    if (String(r.data).slice(0, 7) !== ym) continue;
    const s = r.operadora_slug;
    if (!bySlug.has(s)) bySlug.set(s, []);
    bySlug.get(s)!.push(r);
  }
  return [...bySlug.entries()]
    .map(([operadora_slug, dias]) => {
      const turnover = dias.reduce((acc, x) => acc + Number(x.turnover ?? 0), 0);
      const ggr = dias.reduce((acc, x) => acc + Number(x.ggr ?? 0), 0);
      const bets = dias.reduce((acc, x) => acc + Number(x.apostas ?? 0), 0);
      const uapM = uapPorSlug.get(operadora_slug) ?? null;
      const margin_pct = turnover !== 0 ? (ggr / turnover) * 100 : null;
      const bet_size = bets !== 0 ? turnover / bets : null;
      const arpu = arpuComparativoFromGgrUap(ggr, uapM);
      return {
        operadora_slug,
        turnover,
        ggr,
        bets,
        uap: uapM,
        margin_pct,
        bet_size,
        arpu,
      };
    })
    .sort((a, b) => a.operadora_slug.localeCompare(b.operadora_slug, "pt-BR"));
}

/** Drilldown diário (carrossel): uma linha por operadora no dia. */
export function agregaDailyRawPorOperadoraNoDia(
  rows: DailyRawRow[],
  dia: string,
): {
  operadora_slug: string;
  turnover: number | null;
  ggr: number | null;
  bets: number | null;
  uap: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  arpu: number | null;
}[] {
  const bySlug = new Map<string, DailyRawRow[]>();
  for (const r of rows) {
    if (String(r.data).slice(0, 10) !== dia) continue;
    const s = r.operadora_slug;
    if (!bySlug.has(s)) bySlug.set(s, []);
    bySlug.get(s)!.push(r);
  }
  return [...bySlug.entries()]
    .map(([operadora_slug, list]) => {
      const r = list[0]!;
      const turnover = r.turnover != null ? Number(r.turnover) : null;
      const ggr = r.ggr != null ? Number(r.ggr) : null;
      const bets = r.apostas != null ? Number(r.apostas) : null;
      const uap = r.uap != null ? Number(r.uap) : null;
      const margin_pct =
        turnover != null && turnover !== 0 && ggr != null ? (ggr / turnover) * 100 : null;
      const bet_size =
        bets != null && bets !== 0 && turnover != null ? turnover / bets : null;
      const arpu = arpuComparativoFromGgrUap(ggr, uap);
      return {
        operadora_slug,
        turnover,
        ggr,
        bets,
        uap,
        margin_pct,
        bet_size,
        arpu,
      };
    })
    .sort((a, b) => a.operadora_slug.localeCompare(b.operadora_slug, "pt-BR"));
}

export type MonthlyRawRow = {
  mes: string;
  uap: number | null;
  arpu: number | null;
  operadora_slug: string;
};

export type UapRawRow = { data: string; jogo: string; uap: number; operadora_slug: string };

export function mergeUapPorJogoRows(rows: UapRawRow[]): UapPorJogoPlanRow[] {
  const byD = new Map<string, Map<string, UapRawRow[]>>();
  for (const r of rows) {
    const d = String(r.data).slice(0, 10);
    if (!byD.has(d)) byD.set(d, new Map());
    const jm = byD.get(d)!;
    if (!jm.has(r.jogo)) jm.set(r.jogo, []);
    jm.get(r.jogo)!.push(r);
  }
  const out: UapPorJogoPlanRow[] = [];
  for (const [data, jm] of byD) {
    for (const [jogo, list] of jm) {
      const slugs = new Set(list.map((x) => x.operadora_slug));
      if (slugs.size === 1) {
        const u = list[0]!.uap;
        out.push({ data, jogo, uap: u != null ? Number(u) : null });
        continue;
      }
      const sumUap = list.reduce((s, x) => s + (x.uap != null ? Number(x.uap) : 0), 0);
      out.push({ data, jogo, uap: sumUap > 0 ? sumUap : null });
    }
  }
  out.sort((a, b) => a.data.localeCompare(b.data) || a.jogo.localeCompare(b.jogo));
  return out;
}

export function buildUapPorJogoQuery(
  historico: boolean,
  mesRef: { ano: number; mes: number } | undefined,
  from: number,
  to: number,
  slugList: string[] | null,
  tabelaUap: string = "relatorio_uap_por_jogo",
) {
  let q = applyMesasOperadoraSlugFilter(
    supabase
      .from(tabelaUap)
      .select("data, jogo, uap, operadora_slug")
      .order("data", { ascending: true })
      .order("jogo", { ascending: true })
      .range(from, to),
    slugList,
  );
  if (!historico && mesRef) {
    const { inicio, fim } = getPeriodoComparativoMoM(mesRef.ano, mesRef.mes).atual;
    q = q.gte("data", inicio).lte("data", fim);
  }
  return q;
}

export function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}%`;
}

export type MonthlyKpiSnapshot = {
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
};

/**
 * Agrega linhas do detalhamento diário: soma GGR/turnover/apostas e derivados.
 * O campo `uap` na saída é a **soma dos UAPs diários** (não é “único no mês”); para KPIs consolidados
 * do mês use `relatorio_monthly_summary` via `monthlyUapArpuSel` / `monthlyUapArpuPrev`.
 */
export function aggDailyMesKpi(rows: DailyRow[]): MonthlyKpiSnapshot | null {
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

export function nKpi(v: number | null | undefined): number {
  return Number(v) || 0;
}

/** Uma linha no comparativo por mesa (dia a dia, como o Detalhamento Diário). */
export type LinhaMesaPorDia = {
  dataIso: string;
  labelData: string;
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
};

export function linhaMesaPorDiaFromRow(r: PorTabelaRow): LinhaMesaPorDia {
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

/** Soma as colunas numéricas da tabela por mesa; margem e aposta média recalculadas a partir dos totais. */
export function totaisLinhasMesaPorDia(linhas: LinhaMesaPorDia[]): LinhaMesaPorDia | null {
  if (linhas.length === 0) return null;
  let ggr = 0;
  let turnover = 0;
  let bets = 0;
  let gN = 0;
  let tN = 0;
  let bN = 0;
  for (const row of linhas) {
    if (row.ggr != null) {
      ggr += Number(row.ggr);
      gN++;
    }
    if (row.turnover != null) {
      turnover += Number(row.turnover);
      tN++;
    }
    if (row.bets != null) {
      bets += Number(row.bets);
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
  return {
    dataIso: "__total_mesa__",
    labelData: "Total",
    ggr: ggrOut,
    turnover: turnoverOut,
    bets: betsOut,
    margin_pct,
    bet_size,
  };
}

/** ARPU no comparativo de jogo: GGR ÷ UAP (por jogo e no total oficial). */
export function arpuComparativoFromGgrUap(ggr: number | null, uap: number | null): number | null {
  if (ggr == null || uap == null || Number(uap) === 0) return null;
  return Number(ggr) / Number(uap);
}

/**
 * Snapshot MoM do mês anterior para KPIs consolidados (Overview / Dedicado / Network).
 * Financeiro: daily na janela MTD / mês fechado (`dailyDataPrevMonth`).
 * UAP/ARPU: UAP do `monthly_summary` do mês civil anterior (período completo) —
 * mesma regra nas três abas; só muda a origem (soma Overview vs canal).
 */
export function montarKpiAnteriorMoM(opts: {
  historico: boolean;
  dailyDataPrevMonth: DailyRow[];
  monthlyUapArpuPrev: { uap: number | null; arpu: number | null } | null;
}): MonthlyKpiSnapshot | null {
  const { historico, dailyDataPrevMonth, monthlyUapArpuPrev } = opts;
  if (historico || dailyDataPrevMonth.length === 0) return null;
  const base = aggDailyMesKpi(dailyDataPrevMonth);
  if (!base) return null;
  const u = monthlyUapArpuPrev?.uap ?? null;
  return {
    ...base,
    uap: u,
    arpu: arpuComparativoFromGgrUap(base.ggr, u),
  };
}

/** Métricas por jogo no comparativo (UAP vem de `relatorio_uap_por_jogo`). */
export type CelulaJogoMetricas = {
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  uap: number | null;
  arpu: number | null;
};

export function emptyCelulaJogo(): CelulaJogoMetricas {
  return { ggr: null, turnover: null, bets: null, margin_pct: null, bet_size: null, uap: null, arpu: null };
}

/** Soma GGR, turnover e apostas d-1; margem e aposta média a partir dos totais (ex.: Blackjack = BJ1+BJ2+VIP). UAP é preenchido à parte. */
export function aggregateCellFromPorTabelaRows(rows: PorTabelaRow[]): CelulaJogoMetricas {
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
  return { ggr: ggrOut, turnover: turnoverOut, bets: betsOut, margin_pct, bet_size, uap: null, arpu: null };
}

/** Agrega `relatorio_por_tabela` por mês (YYYY-MM) numa linha por período. */
export function linhasMesaAgregadasPorMes(
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
    .sort((a, b) => b.localeCompare(a))
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

/** Agrega `relatorio_por_tabela` por dia (ex.: uma ou mais mesas Blackjack no mesmo dia). */
export function linhasMesaAgregadasPorDia(
  rows: PorTabelaRow[],
  pred: (r: PorTabelaRow) => boolean,
): LinhaMesaPorDia[] {
  const filtro = rows.filter(pred);
  const byDay = new Map<string, PorTabelaRow[]>();
  for (const r of filtro) {
    const d = normalizeMesasYmd(r.data_relatorio);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(r);
  }
  return [...byDay.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((d) => {
      const bucket = byDay.get(d)!;
      if (bucket.length === 1) return linhaMesaPorDiaFromRow(bucket[0]!);
      const agg = aggregateCellFromPorTabelaRows(bucket);
      return {
        dataIso: d,
        labelData: fmtDiaMesPtBr(d),
        ggr: agg.ggr,
        turnover: agg.turnover,
        bets: agg.bets,
        margin_pct: agg.margin_pct,
        bet_size: agg.bet_size,
      };
    });
}

/** Mesmos totais do bloco Detalhamento Diário (`relatorio_daily_summary` / mensal). A coluna Total do comparativo usa isto; as células por jogo somam mesas BJ/Roleta/Speed Baccarat/Futebol Brasileiro em `por_tabela` (alinhadas ao `data` do daily com deslocamento automático de ±1 dia quando necessário). */
export type TotaisOficiaisComparativo = {
  ggr: number | null;
  turnover: number | null;
  bets: number | null;
  margin_pct: number | null;
  bet_size: number | null;
  uap: number | null;
  arpu: number | null;
};

export function totaisOficiaisFromDailyRow(dr: DailyRow): TotaisOficiaisComparativo {
  const t = dr.turnover;
  const g = dr.ggr;
  const b = dr.bets;
  const u = dr.uap;
  const margin_pct =
    t != null && Number(t) !== 0 && g != null ? (Number(g) / Number(t)) * 100 : null;
  const bet_size =
    b != null && Number(b) !== 0 && t != null ? Number(t) / Number(b) : null;
  const arpu = arpuComparativoFromGgrUap(g != null ? Number(g) : null, u != null ? Number(u) : null);
  return { turnover: t, ggr: g, bets: b, uap: u, margin_pct, bet_size, arpu };
}

export function totaisOficiaisHistoricoMes(
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
  const uapN = uap != null ? Number(uap) : null;
  const ggrN = ggr != null ? Number(ggr) : null;
  const arpu = arpuComparativoFromGgrUap(ggrN, uapN);
  return { turnover, ggr, bets, uap, margin_pct, bet_size, arpu };
}

export type LinhaComparativoJogoTab = {
  dataIso: string;
  labelData: string;
  blackjack: CelulaJogoMetricas;
  roleta: CelulaJogoMetricas;
  baccarat: CelulaJogoMetricas;
  futebol_brasileiro: CelulaJogoMetricas;
  totaisOficiais: TotaisOficiaisComparativo;
};

export function linhaComparativoJogoAgregadaMes(
  ym: string,
  rowsMonth: PorTabelaRow[],
  operadorasListFmt: { slug: string; nome: string }[],
  uapRows: UapPorJogoPlanRow[],
  totaisOficiais: TotaisOficiaisComparativo,
): LinhaComparativoJogoTab {
  const bj: PorTabelaRow[] = [];
  const rl: PorTabelaRow[] = [];
  const bc: PorTabelaRow[] = [];
  const fb: PorTabelaRow[] = [];
  for (const r of rowsMonth) {
    const lbl = labelMesaCda(r, operadorasListFmt);
    if (isMesaBlackjackComparativo(r, operadorasListFmt)) bj.push(r);
    else if (lbl === "Roleta") rl.push(r);
    else if (lbl === "Speed Baccarat") bc.push(r);
    else if (lbl === LABEL_FUTEBOL_BRASILEIRO) fb.push(r);
  }
  const bjAgg = aggregateCellFromPorTabelaRows(bj);
  const rlAgg = aggregateCellFromPorTabelaRows(rl);
  const bcAgg = aggregateCellFromPorTabelaRows(bc);
  const fbAgg = aggregateCellFromPorTabelaRows(fb);
  const uapBj = uapUltimoDiaDoMesPorJogo(uapRows, ym, "Blackjack") ?? null;
  const uapRl = uapUltimoDiaDoMesPorJogo(uapRows, ym, "Roleta") ?? null;
  const uapBc = uapUltimoDiaDoMesPorJogo(uapRows, ym, "Speed Baccarat") ?? null;
  const uapFb = uapUltimoDiaDoMesPorJogo(uapRows, ym, LABEL_FUTEBOL_BRASILEIRO) ?? null;
  return {
    dataIso: `${ym}-01`,
    labelData: fmtMesAnoCurtoFromYm(ym),
    blackjack: {
      ...bjAgg,
      uap: uapBj,
      arpu: arpuComparativoFromGgrUap(bjAgg.ggr, uapBj),
    },
    roleta: {
      ...rlAgg,
      uap: uapRl,
      arpu: arpuComparativoFromGgrUap(rlAgg.ggr, uapRl),
    },
    baccarat: {
      ...bcAgg,
      uap: uapBc,
      arpu: arpuComparativoFromGgrUap(bcAgg.ggr, uapBc),
    },
    futebol_brasileiro: {
      ...fbAgg,
      uap: uapFb,
      arpu: arpuComparativoFromGgrUap(fbAgg.ggr, uapFb),
    },
    totaisOficiais,
  };
}

/** Agrega várias linhas do comparativo de jogo (soma GGR/turnover/apostas/UAP; margem, aposta média e ARPU recalculados). */
export function agregarCelulasJogoMetricasParaLinha(
  cels: ReadonlyArray<TotaisOficiaisComparativo | CelulaJogoMetricas>,
): CelulaJogoMetricas {
  let ggr = 0;
  let turnover = 0;
  let bets = 0;
  let uap = 0;
  let gN = 0;
  let tN = 0;
  let bN = 0;
  let uN = 0;
  for (const c of cels) {
    if (c.ggr != null) {
      ggr += Number(c.ggr);
      gN++;
    }
    if (c.turnover != null) {
      turnover += Number(c.turnover);
      tN++;
    }
    if (c.bets != null) {
      bets += Number(c.bets);
      bN++;
    }
    if (c.uap != null) {
      uap += Number(c.uap);
      uN++;
    }
  }
  const ggrOut = gN > 0 ? ggr : null;
  const turnoverOut = tN > 0 ? turnover : null;
  const betsOut = bN > 0 ? bets : null;
  const uapOut = uN > 0 ? uap : null;
  const margin_pct =
    turnoverOut != null && turnoverOut !== 0 && ggrOut != null ? (ggrOut / turnoverOut) * 100 : null;
  const bet_size =
    betsOut != null && betsOut !== 0 && turnoverOut != null ? turnoverOut / betsOut : null;
  const arpu = arpuComparativoFromGgrUap(ggrOut, uapOut);
  return {
    ggr: ggrOut,
    turnover: turnoverOut,
    bets: betsOut,
    margin_pct,
    bet_size,
    uap: uapOut,
    arpu,
  };
}

export function agregarLinhasComparativoJogo(linhas: LinhaComparativoJogoTab[]): LinhaComparativoJogoTab {
  const tot = agregarCelulasJogoMetricasParaLinha(linhas.map((r) => r.totaisOficiais));
  return {
    dataIso: "__totais_periodo__",
    labelData: "Total",
    totaisOficiais: tot,
    blackjack: agregarCelulasJogoMetricasParaLinha(linhas.map((r) => r.blackjack)),
    roleta: agregarCelulasJogoMetricasParaLinha(linhas.map((r) => r.roleta)),
    baccarat: agregarCelulasJogoMetricasParaLinha(linhas.map((r) => r.baccarat)),
    futebol_brasileiro: agregarCelulasJogoMetricasParaLinha(linhas.map((r) => r.futebol_brasileiro)),
  };
}

export type KpiJogoKey = "ggr" | "turnover" | "bets" | "margin_pct" | "bet_size" | "uap" | "arpu";

export type KpiJogoDef = {
  key: KpiJogoKey;
  label: string;
  somavel: boolean;
  tipoGrafico: "barra" | "linha";
};

export const KPIS_DISPONIVEIS: KpiJogoDef[] = [
  { key: "ggr", label: "GGR", somavel: true, tipoGrafico: "barra" },
  { key: "turnover", label: "Turnover", somavel: true, tipoGrafico: "barra" },
  { key: "bets", label: "Apostas", somavel: true, tipoGrafico: "barra" },
  { key: "margin_pct", label: "Margem", somavel: false, tipoGrafico: "linha" },
  { key: "bet_size", label: "Aposta média", somavel: false, tipoGrafico: "linha" },
  { key: "uap", label: "UAP", somavel: true, tipoGrafico: "linha" },
  { key: "arpu", label: "ARPU", somavel: false, tipoGrafico: "linha" },
];

export function pickKpiMetricaDetalhe(
  row: {
    ggr: number | null;
    turnover: number | null;
    bets: number | null;
    margin_pct: number | null;
    bet_size: number | null;
    uap: number | null;
    arpu: number | null;
  },
  k: KpiJogoKey,
): number | null {
  const v = row[k];
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

/** Cores distintas por série no gráfico de detalhamento (operadoras). */
export const PALETA_OPERADORAS_DETALHE = [
  "var(--brand-action, #7c3aed)",
  "var(--brand-contrast, #1e36f8)",
  "var(--brand-icon-color, #70cae4)",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#a78bfa",
  "#14b8a6",
] as const;

export const JOGOS_COMPARATIVO = JOGOS_IDENTIDADE_LISTA.map((j) =>
  j.key === "futebol_brasileiro" ? { ...j, label: LABEL_FUTEBOL_BRASILEIRO } : j,
);

export type JogoComparativoKey = GameIdentityKey;

export type MesaCadastroComparativoRow = {
  operadora_slug: string;
  tipo_jogo: string;
  nome_mesa: string;
};

/** Mapeia linha do catálogo (`mesas_spin_cadastro`) para chaves do Comparativo de Jogo. */
export function jogoComparativoKeysFromCadastroMesa(tipoJogo: string, nomeMesa: string): JogoComparativoKey[] {
  const t = tipoJogo.trim().toLowerCase();
  const n = nomeMesa.trim().toLowerCase();
  const keys = new Set<JogoComparativoKey>();
  if (
    t.includes("futebol brasileiro") ||
    t.includes("futebol studio") ||
    t.includes("futebol_studio") ||
    (n.includes("futebol") && (n.includes("brasileiro") || n.includes("studio")))
  ) {
    keys.add("futebol_brasileiro");
  }
  if (t.includes("blackjack") || /\bblackjack\b/.test(n)) keys.add("blackjack");
  if (t.includes("roleta") || n === "roleta" || n.includes("roulette")) keys.add("roleta");
  if (t.includes("baccarat") || n.includes("baccarat") || n.includes("speed baccarat")) {
    keys.add("baccarat");
  }
  return [...keys];
}

export function calcularPctComparativoOficial(
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

export function renderValorKpiComparativo(kpi: KpiJogoDef, valor: number | null): ReactNode {
  if (valor == null) return "—";
  switch (kpi.key) {
    case "ggr":
    case "turnover":
    case "bet_size":
    case "arpu":
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

export function mapMonthlyV2(r: { mes: string; uap: number | null; arpu: number | null }): MonthlyRow {
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

export function mergeMonthlyHistoricoRows(rows: MonthlyRawRow[]): MonthlyRow[] {
  const by = new Map<string, MonthlyRawRow[]>();
  for (const r of rows) {
    const ym = String(r.mes).slice(0, 10);
    if (!by.has(ym)) by.set(ym, []);
    by.get(ym)!.push(r);
  }
  return [...by.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, list]) => {
      const slugs = new Set(list.map((x) => x.operadora_slug));
      if (slugs.size !== 1) {
        return mapMonthlyV2({ mes: list[0]!.mes, uap: null, arpu: null });
      }
      const one = list[0]!;
      return mapMonthlyV2({ mes: one.mes, uap: one.uap, arpu: one.arpu });
    });
}

/** Filtro Todas Operadoras (`todas`): um registro por mês com UAP = soma entre operadoras (ARPU vem do daily agregado na UI). */
export function mergeMonthlyHistoricoAgregadoTodas(rows: MonthlyRawRow[]): MonthlyRow[] {
  const by = new Map<string, MonthlyRawRow[]>();
  for (const r of rows) {
    const ym = String(r.mes).slice(0, 10);
    if (!by.has(ym)) by.set(ym, []);
    by.get(ym)!.push(r);
  }
  return [...by.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, list]) => {
      const uaps = list
        .map((x) => x.uap)
        .filter((v): v is number => v != null && Number.isFinite(Number(v)))
        .map(Number);
      const uap = uaps.length > 0 ? uaps.reduce((a, b) => a + b, 0) : null;
      return mapMonthlyV2({ mes: list[0]!.mes, uap, arpu: null });
    });
}

export function mergeMonthlyUapArpuSingleMonth(
  rows: { uap: number | null; arpu: number | null; operadora_slug: string }[],
): { uap: number | null; arpu: number | null } | null {
  if (rows.length === 0) return null;
  if (new Set(rows.map((r) => r.operadora_slug)).size !== 1) {
    return { uap: null, arpu: null };
  }
  const r = rows[0]!;
  return {
    uap: r.uap != null ? Number(r.uap) : null,
    arpu: r.arpu != null ? Number(r.arpu) : null,
  };
}

export function mergeMonthlyUapArpuAgregadoTodas(
  rows: { uap: number | null; arpu: number | null; operadora_slug: string }[],
): { uap: number | null; arpu: number | null } | null {
  if (rows.length === 0) return null;
  const uaps = rows
    .map((r) => r.uap)
    .filter((v): v is number => v != null && Number.isFinite(Number(v)))
    .map(Number);
  const uap = uaps.length > 0 ? uaps.reduce((a, b) => a + b, 0) : null;
  return { uap, arpu: null };
}
