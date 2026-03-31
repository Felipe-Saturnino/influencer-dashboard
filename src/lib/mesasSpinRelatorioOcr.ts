/**
 * OCR (Tesseract no browser) + parser para o print Mesas Spin v2.
 * Secções: Daily summaries BRL | Monthly (só tabela à direita: Date+UAP+ARPU) | Per table BRL (d-1).
 */

import { createWorker, type Worker } from "tesseract.js";

export interface DailyRowParsed {
  data: string;
  turnover: number | null;
  ggr: number | null;
  apostas: number | null;
  uap: number | null;
}

export interface MonthlyRowParsed {
  mes: string;
  uap: number | null;
  arpu: number | null;
}

export interface PorTabelaRowParsed {
  dia: string;
  operadora: string;
  mesa: string;
  ggr: number | null;
  turnover: number | null;
  apostas: number | null;
}

export interface IngestRelatorioMesasPayload {
  data_referencia_por_mesa: string;
  daily_summary: DailyRowParsed[];
  monthly_summary: MonthlyRowParsed[];
  por_tabela: PorTabelaRowParsed[];
  ocr_preview?: string;
}

export type IngestRelatorioPayload = IngestRelatorioMesasPayload;

/** Palavras com bbox (resultado do Tesseract) para colunas 2–4 na ordem visual. */
export type OcrWordLayout = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };
export type OcrLineLayout = { words?: OcrWordLayout[]; bbox?: { x0: number; y0: number; x1: number; y1: number } };
export type MesasSpinOcrResult = { text: string; layoutLines: OcrLineLayout[] | null };

const MESES_EN: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const MESES_EN_LONG: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const MONTHS_FOR_RE =
  "january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|abr";

const MONTH_YEAR_RE = new RegExp(
  `\\b(${MONTHS_FOR_RE})(?:\\s|[.:_-]|\\b)*(\\d{4}|\\d{2}[oO]\\d{2})\\b`,
  "i",
);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthYearToIso(mon: string, yearRaw: string): string | null {
  const key = mon.toLowerCase();
  const mi = MESES_EN_LONG[key] ?? MESES_EN[key];
  if (mi === undefined) return null;
  const year = yearRaw.replace(/o/gi, "0");
  if (!/^\d{4}$/.test(year)) return null;
  return `${year}-${pad2(mi + 1)}-01`;
}

/**
 * Valores como na imagem: milhar com vírgula (138,514) ou ponto (207.353); decimal com vírgula ou ponto;
 * percentagens removidas. Financeiros podem ser negativos.
 */
export function parseNumericToken(raw: string): number | null {
  let t = raw.replace(/R\$/gi, "").replace(/%/g, "").replace(/\s/g, "").trim();
  if (!t) return null;
  if (t === "—" || t === "-" || t === "–" || /^n\/?a$/i.test(t)) return null;
  t = t.replace(/O/g, "0");

  const sign = t.startsWith("-") ? -1 : 1;
  if (t.startsWith("-") || t.startsWith("+")) t = t.slice(1);

  if (/^\d{1,3}(,\d{3})+$/.test(t)) {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? sign * n : null;
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    const n = Number(t.replace(/\./g, ""));
    return Number.isFinite(n) ? sign * n : null;
  }
  if (/^[\d.]+,\d{1,4}$/.test(t)) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? sign * n : null;
  }
  if (/^[\d,]+\.\d{1,4}$/.test(t)) {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? sign * n : null;
  }
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? sign * n : null;
  }
  return null;
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

function splitLineParts(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Primeira data DD/MM/AAAA na linha; corrige 2O→20 e, se o OCR leu 20 mas existe 29 no mesmo mês/ano na linha, usa 29. */
function firstBrDateInLineToIso(line: string): { iso: string; restStart: number } | null {
  const dm = line.match(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})/);
  if (!dm || dm.index === undefined) return null;
  let dd = dm[1].replace(/[oO]/g, "0");
  const mm = dm[2].replace(/[oO]/g, "0");
  const yy = dm[3].replace(/[oO]/g, "0");
  if (dd === "20" && new RegExp(`\\b29\\s*\\/\\s*${mm}\\s*\\/\\s*${yy}\\b`).test(line)) {
    dd = "29";
  }
  const iso = `${yy}-${mm}-${dd}`;
  return { iso, restStart: dm.index + dm[0].length };
}

/** Maior data DD/MM/AAAA encontrada em todo o OCR (para dia referência por mesa). */
function maxBrDateIsoInText(text: string): string | null {
  const re = /\b(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})\b/g;
  let max: string | null = null;
  let rm: RegExpExecArray | null;
  while ((rm = re.exec(text)) !== null) {
    let dd = rm[1].replace(/[oO]/g, "0");
    const mm = rm[2].replace(/[oO]/g, "0");
    const yy = rm[3].replace(/[oO]/g, "0");
    const iso = `${yy}-${mm}-${dd}`;
    if (!max || iso > max) {
      max = iso;
    }
  }
  return max;
}

/** Corrige 20→29 quando o OCR troca o 9 do dia (ex.: 29/03 lido como 20/03). */
function fixPhantomDay20InDailyRows(rows: DailyRowParsed[], fullText: string): void {
  const maxT = maxBrDateIsoInText(fullText);
  if (maxT) {
    const maxDay = parseInt(maxT.slice(8), 10);
    const ymMax = maxT.slice(0, 7);
    const has29 = rows.some((r) => r.data === maxT);
    if (maxDay === 29 && !has29) {
      for (const r of rows) {
        if (r.data === `${ymMax}-20`) {
          r.data = maxT;
          return;
        }
      }
    }
  }
  const byYm = new Map<string, DailyRowParsed[]>();
  for (const r of rows) {
    const ym = r.data.slice(0, 7);
    if (!byYm.has(ym)) byYm.set(ym, []);
    byYm.get(ym)!.push(r);
  }
  for (const [ym, group] of byYm) {
    if (group.length < 3) continue;
    const days = new Set(group.map((x) => parseInt(x.data.slice(8), 10)));
    if (days.has(29) || !days.has(20)) continue;
    if (days.has(27) && days.has(28)) {
      const victim = group.find((x) => x.data.endsWith("-20"));
      if (victim) victim.data = `${ym}-29`;
    }
  }
}

/** União de menos “soltos” antes de dígitos (ex.: «- 3,746» ou «–5280») e normalização de travessões. */
function normalizeSignedNumberText(s: string): string {
  return s
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/-\s+(?=[\d,])/g, "-");
}

/**
 * Coleta números na linha. O OCR costuma separar o sinal: "- 3,746" → merge com o token seguinte.
 */
function collectNumbersLeftToRight(parts: string[]): number[] {
  const nums: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === "-" || p === "–" || p === "—") {
      if (i + 1 < parts.length) {
        const merged = parseNumericToken(`-${parts[i + 1]}`);
        if (merged != null) {
          nums.push(merged);
          i++;
          continue;
        }
      }
      continue;
    }
    const n = parseNumericToken(p);
    if (n != null) nums.push(n);
  }
  return nums;
}

/** Texto bruto da coluna Table → operadora + mesa canónica; null se ignorar (Bet Nacional, Summary, etc.). */
const MESA_RAW_TO_CANON: Array<{ raw: string; operadora: string; mesa: string }> = [
  { raw: "Casa de Apostas VIP Blackjack 1", operadora: "Casa de Apostas", mesa: "Blackjack VIP" },
  { raw: "Casa de Apostas Speed Baccarat", operadora: "Casa de Apostas", mesa: "Speed Baccarat" },
  { raw: "Casa de Apostas Blackjack 2", operadora: "Casa de Apostas", mesa: "Blackjack 2" },
  { raw: "Casa de Apostas Blackjack 1", operadora: "Casa de Apostas", mesa: "Blackjack 1" },
  { raw: "Casa de Apostas Roulette", operadora: "Casa de Apostas", mesa: "Roleta" },
].sort((a, b) => b.raw.length - a.raw.length);

export function resolveMesaOperadora(tableCell: string): { operadora: string; mesa: string } | null {
  const norm = tableCell.replace(/\s+/g, " ").trim();
  const low = norm.toLowerCase();
  if (/^summary\b/i.test(low) || /\bsummary\b/i.test(low)) return null;
  if (low.startsWith("bet nacional")) return null;
  for (const m of MESA_RAW_TO_CANON) {
    if (low.startsWith(m.raw.toLowerCase())) return { operadora: m.operadora, mesa: m.mesa };
  }
  return null;
}

function canonEntryForLine(lineStr: string): (typeof MESA_RAW_TO_CANON)[number] | null {
  const norm = lineStr.replace(/\s+/g, " ").trim();
  const low = norm.toLowerCase();
  for (const m of MESA_RAW_TO_CANON) {
    if (low.startsWith(m.raw.toLowerCase())) return m;
  }
  return null;
}

/** Quantas palavras (ordem X) cobrem o prefixo canónico do nome da mesa. */
function countPrefixWords(sortedWords: OcrWordLayout[], rawCanon: string): number {
  const target = rawCanon.toLowerCase().replace(/\s+/g, " ").trim();
  let acc = "";
  for (let k = 0; k < sortedWords.length; k++) {
    const t = sortedWords[k]!.text.trim();
    acc = k === 0 ? t : `${acc} ${t}`;
    const low = acc.toLowerCase().replace(/\s+/g, " ");
    if (low.startsWith(target) && acc.length >= target.length - 4) return k + 1;
    if (low.length > target.length + 20) break;
  }
  return 0;
}

function lineCenterY(line: OcrLineLayout): number {
  const y0 = line.bbox?.y0 ?? 0;
  const y1 = line.bbox?.y1 ?? 0;
  return (y0 + y1) / 2;
}

/** 1.ª ocorrência de uma linha de mesa «Casa de Apostas …» (ignora «Per table BRL» à esquerda). */
function mesaStartOnLine(sortedWords: OcrWordLayout[]): { startWi: number; canon: (typeof MESA_RAW_TO_CANON)[number] } | null {
  for (let start = 0; start < sortedWords.length; start++) {
    for (const m of MESA_RAW_TO_CANON) {
      const target = m.raw.toLowerCase().replace(/\s+/g, " ").trim();
      let acc = "";
      for (let k = start; k < sortedWords.length; k++) {
        const t = sortedWords[k]!.text.trim();
        acc = k === start ? t : `${acc} ${t}`;
        const low = acc.toLowerCase().replace(/\s+/g, " ");
        if (low.startsWith(target) && acc.length >= target.length - 4) {
          return { startWi: start, canon: m };
        }
        if (low.length > target.length + 28) break;
      }
    }
  }
  return null;
}

function isPerTableHeaderFragment(lineStr: string): boolean {
  return /\bper\s+table\b/i.test(lineStr) && /brl/i.test(lineStr);
}

/** Retira «Summary» e o que estiver colado antes dos números da linha de totais. */
function stripSummaryLeadForMerge(tail: string): string {
  if (!/\bsummary\b/i.test(tail)) return tail;
  return tail.replace(/^.*?\bsummary\b/i, "").trim();
}

/**
 * Per table BRL: só as 3 primeiras colunas numéricas após o nome da mesa
 * (GGR d-1, Turnover d-1, Bets d-1). Não deslocar a janela — valores seguintes são d-2/MTD.
 */
function thirdLooksLikeD2ForBlackjackVariant(third: number): boolean {
  return Math.abs(third) >= 35_000;
}

/**
 * OCR às vezes “come” a célula GGR d-1 na Roleta: os 2 primeiros tokens passam a ser
 * Turnover d-1 e Bets d-1. O 3.º token pode ser outra coluna — nunca usar para apostas.
 */
function roletaLooksLikeShiftedFirstCellIsTurnover(first: number, second: number): boolean {
  const absF = Math.abs(first);
  if (absF < 55_000 || absF > 240_000) return false;
  if (second < 7_000 || second > 75_000) return false;
  if (Math.abs(second) >= absF * 0.52) return false;
  return absF > Math.abs(second) * 1.12;
}

/**
 * Speed Baccarat: leitura sem GGR d-1 (1.º token já ~9k turnover, 2.º ~3.7k apostas).
 * Não confundir com (594, 9457, 3728), onde o 1.º número é o GGR.
 */
function speedBaccaratLooksLikeSkippedLeadingGgr(first: number, second: number): boolean {
  const a = Math.abs(first);
  const b = Math.abs(second);
  if (a < 5_000 || a > 18_000) return false;
  if (b < 2_200 || b > 12_000) return false;
  if (a <= b * 1.25) return false;
  if (a >= b * 6) return false;
  return true;
}

function looseDigitGroupsPattern(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const chunks: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    chunks.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return chunks.join(String.raw`[\s,.\u00A0\u2019]*`);
}

/** GGR da Roleta tipicamente |GGR|/turnover ∈ [1,5%, 12%]; nunca ~0. */
function scoreRoletaGgrCandidate(v: number, turnoverAbs: number): number | null {
  const av = Math.abs(v);
  if (av < 120 || av > Math.min(35_000, turnoverAbs * 0.28)) return null;
  const ratio = av / turnoverAbs;
  if (ratio < 0.012 || ratio > 0.14) return null;
  return Math.abs(ratio - 0.055);
}

/** Texto antes da 1.ª ocorrência do turnover; escolhe candidato com escala plausível. */
function extractRoletaGgrBeforeTurnover(tail: string, turnover: number): number | null {
  const tAbs = Math.abs(turnover);
  if (tAbs < 10_000) return null;
  const re = new RegExp(looseDigitGroupsPattern(Math.round(tAbs)));
  const hit = tail.match(re);
  if (!hit || hit.index === undefined) return null;
  const prefix = hit.index > 0 ? normalizeSignedNumberText(tail.slice(0, hit.index)) : "";
  const headNums = prefix
    ? collectNumbersLeftToRight(splitLineParts(prefix.trim()))
    : [];
  let best: number | null = null;
  let bestScore = Infinity;
  for (const v of headNums) {
    const sc = scoreRoletaGgrCandidate(v, tAbs);
    if (sc == null) continue;
    const bias = v < 0 ? -0.01 : 0;
    if (sc + bias < bestScore) {
      bestScore = sc + bias;
      best = v;
    }
  }
  if (best != null) return best;
  for (let i = headNums.length - 1; i >= 0; i--) {
    const v = headNums[i]!;
    if (Math.abs(v) >= tAbs * 0.35) continue;
    if (Math.abs(v) > 28_000) continue;
    if (Math.abs(v) < 120) continue;
    return v;
  }
  return null;
}

/** Na lista de números da linha, o turnover pode ser o 2.º; o GGR imediatamente antes (só se escala bate). */
function extractRoletaGgrFromNumsBeforeTurnover(
  nums: number[],
  turnover: number,
  apostas: number,
): number | null {
  const tAbs = Math.abs(turnover);
  const bAbs = Math.abs(apostas);
  const tolT = Math.max(10, tAbs * 0.004);
  const tolB = Math.max(10, bAbs * 0.004);
  const idx = nums.findIndex((n) => Math.abs(Math.abs(n) - tAbs) <= tolT);
  if (idx <= 0) return null;
  const prev = nums[idx - 1]!;
  if (Math.abs(Math.abs(prev) - bAbs) <= tolB) return null;
  if (scoreRoletaGgrCandidate(prev, tAbs) == null) return null;
  return prev;
}

function strictPerTableD1Triple(
  nums: number[],
  mesa: string,
  afterNameForRoleta: string,
): { ggr: number | null; turnover: number; apostas: number } | null {
  if (nums.length < 3) return null;
  let ggr: number | null = nums[0];
  let turnover = nums[1];
  let apostas = nums[2];

  if (mesa === "Roleta" && roletaLooksLikeShiftedFirstCellIsTurnover(nums[0], nums[1])) {
    turnover = nums[0];
    apostas = nums[1];
    ggr =
      extractRoletaGgrFromNumsBeforeTurnover(nums, turnover, apostas) ??
      extractRoletaGgrBeforeTurnover(afterNameForRoleta, turnover);
  } else if (mesa === "Speed Baccarat" && speedBaccaratLooksLikeSkippedLeadingGgr(nums[0], nums[1])) {
    turnover = nums[0];
    apostas = nums[1];
    const c = nums[2];
    ggr = null;
    const tAbsB = Math.abs(turnover);
    if (
      c !== undefined &&
      Math.abs(c) >= 150 &&
      Math.abs(c) < tAbsB * 0.13 &&
      Math.abs(c) < 8_000
    ) {
      ggr = c;
    }
  }

  const isBjFamily =
    mesa === "Blackjack 1" || mesa === "Blackjack VIP" || mesa === "Blackjack 2";

  if (
    isBjFamily &&
    thirdLooksLikeD2ForBlackjackVariant(apostas) &&
    Math.abs(turnover) >= 200 &&
    Math.abs(turnover) <= 30_000 &&
    Math.abs(ggr ?? 0) >= 8000 &&
    Math.abs(ggr ?? 0) <= 120_000
  ) {
    apostas = turnover;
    turnover = ggr as number;
    ggr = null;
  } else if (
    ggr != null &&
    Math.abs(ggr) >= 8000 &&
    Math.abs(ggr) <= 120_000 &&
    Math.abs(turnover) < Math.abs(ggr) * 0.25 &&
    Math.abs(turnover) >= 50 &&
    Math.abs(turnover) <= 12_000 &&
    Math.abs(apostas) <= 50_000
  ) {
    const tTmp = ggr;
    ggr = turnover;
    turnover = tTmp;
  }

  let out = { ggr, turnover, apostas };
  out.turnover = Math.abs(out.turnover);
  out.apostas = Math.abs(out.apostas);
  return out;
}

/** Há carácter «-» antes do 1.º dígito da célula numérica (GGR d-1). */
function minusBeforeFirstDigitInCell(cellTail: string): boolean {
  const idx = cellTail.search(/\d/);
  if (idx < 0) return false;
  return /-/.test(cellTail.slice(0, idx));
}

/**
 * Roleta costuma ter GGR negativo com grande turnover; se o OCR perde o menos e o trio bate escala típica, corrige o sinal.
 */
function adjustRoletaGgrSign(mesa: string, ggr: number, turnover: number): number {
  if (mesa !== "Roleta") return ggr;
  if (ggr > 0 && turnover > 65_000 && ggr >= 4000 && ggr <= 12_000) return -Math.abs(ggr);
  if (ggr > 0 && turnover >= 35_000 && turnover < 55_000 && ggr > 500 && ggr < 2500) {
    return -Math.abs(ggr);
  }
  return ggr;
}

/** Métricas d-1: GGR, Turnover, Apostas — só as 3 primeiras células numéricas da linha. */
function parseFirstThreeMetrics(
  afterName: string,
  mesa: string,
): [number | null, number, number] | null {
  const norm = normalizeSignedNumberText(afterName);
  const parts = splitLineParts(norm);
  const nums = collectNumbersLeftToRight(parts);
  const raw = strictPerTableD1Triple(nums, mesa, norm);
  if (!raw) return null;
  let { ggr, turnover, apostas } = raw;
  if (ggr != null) {
    if (ggr > 0 && minusBeforeFirstDigitInCell(norm)) ggr = -Math.abs(ggr);
    ggr = adjustRoletaGgrSign(mesa, ggr, turnover);
  }
  return [ggr, Math.abs(turnover), Math.abs(apostas)];
}

function findDailySummariesIndex(lines: string[]): number {
  return lines.findIndex(
    (l) =>
      /daily\s*summar/i.test(l) ||
      (/daily/i.test(l) && /summar/i.test(l) && /brl/i.test(l)),
  );
}

function findPerTableIndex(lines: string[]): number {
  return lines.findIndex(
    (l) => /\bper\s+table/i.test(l) || (/\bper\b/i.test(l) && /\btable\b/i.test(l) && /brl/i.test(l)),
  );
}

function isMonthlyTitleLine(line: string): boolean {
  const x = line.toLowerCase();
  return (
    /monthly\s*summar/i.test(line) ||
    (/monthly/.test(x) && /summar/.test(x) && /brl/i.test(line))
  );
}

/**
 * Daily summaries BRL: após a data, ordem fixa
 * Turnover, GGR, Margin %, Bets (apostas), UAP, Bet Size, ARPU.
 * Índices: 0,1,3,4 — ignoramos margin (2), bet size (5) e ARPU (6).
 */
function looksLikeMarginPercent(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n) <= 50;
}

/**
 * Percentagens na linha do daily (Margin %). Para 29/03 o OCR pode falhar o GGR negativo mas manter «-2,7%».
 * Considera todas as ocorrências plausíveis como margem (|x| ≤ 20 %), não só a primeira.
 */
function impliedGgrFromMarginInDailyRest(raw: string, turnover: number): number | null {
  type Cand = { g: number; ap: number };
  const cands: Cand[] = [];
  const re = /(-?\d+(?:[.,]\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const pct = parseNumericToken(`${m[1]}%`);
    if (pct == null) continue;
    const ap = Math.abs(pct);
    if (ap > 12 || ap < 0.05) continue;
    const g = Math.round((turnover * pct) / 100);
    if (Math.abs(g) > Math.abs(turnover) * 0.35) continue;
    cands.push({ g, ap });
  }
  const reLoose = /(-?\d+)\s*[.,]\s*(\d+)\s*%/g;
  while ((m = reLoose.exec(raw)) !== null) {
    const pct = parseNumericToken(`${m[1]}.${m[2]}%`) ?? parseNumericToken(`${m[1]},${m[2]}%`);
    if (pct == null) continue;
    const ap = Math.abs(pct);
    if (ap > 12 || ap < 0.05) continue;
    const g = Math.round((turnover * pct) / 100);
    if (Math.abs(g) > Math.abs(turnover) * 0.35) continue;
    cands.push({ g, ap });
  }
  if (cands.length === 0) return null;
  const neg = cands.filter((c) => c.g < 0);
  const pool = neg.length > 0 ? neg : cands;
  pool.sort((a, b) => a.ap - b.ap);
  return pool[0]!.g;
}

/**
 * No print, ARPU ≈ GGR / UAP (ex.: -27,15 × 138 ≈ -3747). Útil quando o OCR perde o GGR mas lê ARPU.
 */
function inferGgrFromArpuTimesUap(turnover: number, uap: number, nr: number[]): number | null {
  if (uap < 80 || Math.abs(turnover) < 10_000) return null;
  let best: number | null = null;
  let bestScore = Infinity;
  for (const x of nr) {
    if (!Number.isFinite(x) || Math.abs(x) > 400 || Math.abs(x) < 2.2) continue;
    const g = Math.round(x * uap);
    const ratio = Math.abs(g) / Math.abs(turnover);
    if (ratio > 0.14 || ratio < 0.0045 || Math.abs(g) < 40) continue;
    const score = Math.abs(ratio - 0.035);
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

function assignDailyMetrics(nr: number[]): {
  turnover: number;
  ggr: number | null;
  apostas: number;
  uap: number;
} | null {
  if (nr.length < 4) return null;

  const t0 = nr[0];
  const t1 = nr[1];
  const t2 = nr[2];
  const t3 = nr[3];

  if (nr.length >= 7) {
    return { turnover: t0, ggr: t1, apostas: nr[3], uap: nr[4] };
  }

  if (nr.length === 6) {
    if (looksLikeMarginPercent(t2)) {
      return { turnover: t0, ggr: t1, apostas: nr[3], uap: nr[4] };
    }
    if (Math.abs(t1) <= Math.abs(t0) * 0.28 && t2 > 600) {
      return { turnover: t0, ggr: t1, apostas: t2, uap: t3 };
    }
    return { turnover: t0, ggr: t1, apostas: t2, uap: t3 };
  }

  if (nr.length === 5) {
    if (looksLikeMarginPercent(t2)) {
      return { turnover: t0, ggr: t1, apostas: nr[3], uap: nr[4] };
    }
    if (Math.abs(t1) <= Math.abs(t0) * 0.28 && t2 > 600) {
      return { turnover: t0, ggr: t1, apostas: t2, uap: nr[4] };
    }
    const betsInSecondSlot = t1 > 2500 && t1 > Math.abs(t0) * 0.035;
    const uapLike = t2 >= 35 && t2 <= 3000;
    if (betsInSecondSlot && uapLike) {
      return { turnover: t0, ggr: null, apostas: t1, uap: t2 };
    }
    return { turnover: t0, ggr: t1, apostas: nr[3], uap: nr[4] };
  }

  const betsInSecondSlot4 = t1 > 2500 && t1 > Math.abs(t0) * 0.035;
  const uapLike4 = t2 >= 35 && t2 <= 3000;
  if (betsInSecondSlot4 && uapLike4) {
    return { turnover: t0, ggr: null, apostas: t1, uap: t2 };
  }
  return { turnover: t0, ggr: t1, apostas: t2, uap: nr[3]! };
}

function parseDailyBlock(
  lines: string[],
  start: number,
  endExclusive: number,
  fullText: string,
): DailyRowParsed[] {
  const out: DailyRowParsed[] = [];
  let i = start;
  while (i < endExclusive) {
    const line = lines[i];
    if (isMonthlyTitleLine(line) || /\bper\s+table/i.test(line)) break;
    const dateHit = firstBrDateInLineToIso(line);
    if (!dateHit) {
      i++;
      continue;
    }
    const rest = normalizeSignedNumberText(line.slice(dateHit.restStart));
    const nr = collectNumbersLeftToRight(splitLineParts(rest));
    let metrics = assignDailyMetrics(nr);
    if (!metrics) {
      i++;
      continue;
    }
    if (metrics.ggr == null) {
      const inferred = impliedGgrFromMarginInDailyRest(rest, metrics.turnover);
      if (inferred != null) metrics = { ...metrics, ggr: inferred };
    }
    if (metrics.ggr == null) {
      const fromArpu = inferGgrFromArpuTimesUap(metrics.turnover, metrics.uap, nr);
      if (fromArpu != null) metrics = { ...metrics, ggr: fromArpu };
    }
    out.push({
      data: dateHit.iso,
      turnover: metrics.turnover,
      ggr: metrics.ggr,
      apostas: Math.round(metrics.apostas),
      uap: Math.round(metrics.uap),
    });
    i++;
  }
  fixPhantomDay20InDailyRows(out, fullText);
  return out;
}

/** Ordem típica GGR, Turnover; se o OCR colocar Turnover (>50k) à frente do GGR, corrige. */
function normalizeSummaryGgrTurnoverPair(nums: number[]): { ggr: number; turnover: number } | null {
  if (nums.length < 2) return null;
  let g = nums[0];
  let t = nums[1];
  const ag = Math.abs(g);
  const at = Math.abs(t);
  if (ag > 50_000 && at < ag * 0.25 && at < 100_000) {
    return { ggr: t, turnover: g };
  }
  if (at > 50_000 && ag < at * 0.25) {
    return { ggr: g, turnover: t };
  }
  return { ggr: g, turnover: t };
}

/** Linha «Summary» do Per table: primeiros 2 valores = GGR e Turnover d-1 (para validar o daily). */
function parsePerTableSummaryD1TripleFromLines(lines: string[]): { ggr: number; turnover: number } | null {
  let last: { ggr: number; turnover: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\bsummary\b/i.test(line.toLowerCase())) continue;
    const low = line.toLowerCase();
    const k = low.indexOf("summary");
    const tail = normalizeSignedNumberText(line.slice(k + 7));
    const nums = collectNumbersLeftToRight(splitLineParts(tail));
    if (nums.length < 3) continue;
    const pair = normalizeSummaryGgrTurnoverPair(nums);
    if (pair) last = pair;
  }
  return last;
}

function fillNullDailyGgrFromSummaryRow(rows: DailyRowParsed[], summary: { ggr: number; turnover: number } | null): void {
  if (!summary) return;
  const tol = Math.max(3, Math.abs(summary.turnover) * 0.001);
  for (const r of rows) {
    if (r.ggr != null || r.turnover == null) continue;
    if (Math.abs(r.turnover - summary.turnover) <= tol) r.ggr = summary.ggr;
  }
  const stillNull = rows.filter((r) => r.ggr == null && r.turnover != null);
  if (stillNull.length === 1) {
    const r = stillNull[0]!;
    if (Math.abs(r.turnover! - summary.turnover) <= tol * 3) r.ggr = summary.ggr;
  }
}

/**
 * Tabela monthly UAP/ARPU (geralmente à direita): linha "Jan 2026" + exatamente 2 números.
 * O quadro esquerdo tem 6+ números após o mês → ignorado.
 * Varre o texto inteiro: ordem do OCR pode colocar esse bloco depois de "Per table".
 */
/** Captura "Jan 2026 1.322 146,76" no texto bruto (OCR parte linhas; quadro da esquerda tem milhões e é filtrado). */
function monthlyUapArpuCandidateScore(uap: number, arpu: number): number {
  let s = 0;
  if (uap >= 700 && uap <= 2200) s += 25;
  if (uap >= 1100 && uap <= 1450) s += 10;
  if (Math.abs(arpu) >= 90 && Math.abs(arpu) <= 230) s += 25;
  if (Math.abs(arpu) >= 130 && Math.abs(arpu) <= 200) s += 8;
  return s;
}

/** Vários «Jan 2026» no OCR (quadro esquerdo vs direito); escolhe o par UAP/ARPU plausível (Janeiro costuma falhar no 1.º match). */
function scrapeMonthlyUapArpuGaps(text: string, byMes: Map<string, MonthlyRowParsed>): void {
  const re = new RegExp(
    `\\b(${MONTHS_FOR_RE})\\s+(\\d{4}|\\d{2}[oO]\\d{2})\\b[\\s\\S]{0,240}?([\\-0-9][0-9O.,]{0,16})\\s+([\\-0-9][0-9O.,]{0,16})`,
    "gi",
  );
  const scraped = new Map<string, MonthlyRowParsed[]>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const mesIso = monthYearToIso(m[1], m[2].replace(/o/gi, "0"));
    if (!mesIso) continue;
    const uapVal = parseNumericToken(m[3].replace(/O/g, "0"));
    const arpuVal = parseNumericToken(m[4].replace(/O/g, "0"));
    if (uapVal == null || arpuVal == null) continue;
    if (uapVal < 500 || uapVal > 8000) continue;
    if (Math.abs(arpuVal) > 500 || Math.abs(arpuVal) < 28) continue;
    const row: MonthlyRowParsed = {
      mes: mesIso,
      uap: Math.round(uapVal),
      arpu: arpuVal,
    };
    if (!scraped.has(mesIso)) scraped.set(mesIso, []);
    scraped.get(mesIso)!.push(row);
  }
  for (const [mesIso, rows] of scraped) {
    const best = rows.reduce((a, b) =>
      monthlyUapArpuCandidateScore(b.uap!, b.arpu!) > monthlyUapArpuCandidateScore(a.uap!, a.arpu!) ? b : a,
    );
    const cur = byMes.get(mesIso);
    if (!cur) {
      byMes.set(mesIso, best);
      continue;
    }
    if (monthlyUapArpuCandidateScore(best.uap!, best.arpu!) > monthlyUapArpuCandidateScore(cur.uap!, cur.arpu!)) {
      byMes.set(mesIso, best);
    }
  }
}

function parseMonthlyUapArpuAllLines(lines: string[], rawText: string): MonthlyRowParsed[] {
  const byMes = new Map<string, MonthlyRowParsed>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isMonthlyTitleLine(line)) continue;
    if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}/.test(line.trim())) continue;
    const m = line.match(MONTH_YEAR_RE);
    if (!m || m.index === undefined) continue;
    const mon = m[1];
    const year = m[2];
    const mesIso = monthYearToIso(mon, year);
    if (!mesIso) continue;
    const tail = line.slice(m.index + m[0].length);
    let parts = splitLineParts(tail);
    let allNums = collectNumbersLeftToRight(parts);
    if (
      allNums.length === 0 &&
      i + 1 < lines.length &&
      !isMonthlyTitleLine(lines[i + 1]) &&
      !/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}/.test(lines[i + 1].trim())
    ) {
      const nextNums = collectNumbersLeftToRight(splitLineParts(lines[i + 1]));
      if (nextNums.length >= 2) {
        allNums = nextNums.length === 2 ? nextNums : [nextNums[0], nextNums[1]];
        i++;
      }
    }
    if (allNums.length === 1 && i + 1 < lines.length) {
      const nextNums = collectNumbersLeftToRight(splitLineParts(lines[i + 1]));
      if (nextNums.length === 1) {
        allNums = [allNums[0], nextNums[0]];
        i++;
      }
    }
    if (allNums.length === 3) {
      const [a, b, c] = allNums;
      if (a >= 500 && a <= 100_000 && b >= 50 && b < 1000 && c >= 0 && c < 100) {
        const arpu = c < 10 ? b + c / 10 : b + c / 100;
        allNums = [a, arpu];
      }
    }
    if (allNums.length !== 2) continue;
    const [uapVal, arpuVal] = allNums;
    if (uapVal < 100 || uapVal > 1_000_000) continue;
    if (Math.abs(arpuVal) > 1_000_000) continue;
    byMes.set(mesIso, {
      mes: mesIso,
      uap: Math.round(uapVal),
      arpu: arpuVal,
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isMonthlyTitleLine(line)) continue;
    if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}/.test(line.trim())) continue;
    if (/blackjack|roulette|baccarat|bet nacional|summary|per\s+table|casa de apostas/i.test(line)) continue;
    const nums = collectNumbersLeftToRight(splitLineParts(line));
    if (nums.length !== 2) continue;
    const [uapVal, arpuVal] = nums;
    if (uapVal < 800 || uapVal > 5000) continue;
    if (arpuVal < 80 || arpuVal > 350) continue;
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const m2 = lines[j].match(MONTH_YEAR_RE);
      if (!m2) continue;
      const mesIso2 = monthYearToIso(m2[1], m2[2]);
      if (!mesIso2) break;
      const cand: MonthlyRowParsed = {
        mes: mesIso2,
        uap: Math.round(uapVal),
        arpu: arpuVal,
      };
      const cur = byMes.get(mesIso2);
      if (!cur || monthlyUapArpuCandidateScore(cand.uap!, cand.arpu!) > monthlyUapArpuCandidateScore(cur.uap!, cur.arpu!)) {
        byMes.set(mesIso2, cand);
      }
      break;
    }
  }

  scrapeMonthlyUapArpuGaps(rawText, byMes);

  return Array.from(byMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Per table: lê colunas 2–4 pela ordem X das palavras (após o nome canónico), não pela ordem do string plano.
 * Opcionalmente funde a linha seguinte se o OCR partir o nome dos números (e a linha seguinte não for outra mesa).
 */
function parsePorTabelaFromLayoutLines(ocrLines: OcrLineLayout[], diaRef: string): PorTabelaRowParsed[] {
  const sorted = [...ocrLines].sort((a, b) => lineCenterY(a) - lineCenterY(b));
  const out: PorTabelaRowParsed[] = [];
  const yMergeMax = 62;

  for (let i = 0; i < sorted.length; i++) {
    const words = [...(sorted[i]!.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    if (words.length === 0) continue;

    const mesaHit = mesaStartOnLine(words);
    if (!mesaHit) continue;

    const { startWi, canon } = mesaHit;
    const subWords = words.slice(startWi);
    const lineStr = subWords.map((w) => w.text?.trim() ?? "").filter(Boolean).join(" ");
    if (/^main\b|^day\b/i.test(lineStr)) continue;

    const resolved = { operadora: canon.operadora, mesa: canon.mesa };
    const k = countPrefixWords(subWords, canon.raw);
    let afterRest =
      k > 0
        ? subWords
            .slice(k)
            .map((w) => w.text?.trim() ?? "")
            .filter(Boolean)
            .join(" ")
        : lineStr.slice(canon.raw.length).trim();
    let nums = collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(afterRest)));

    if (nums.length < 3 && i > 0) {
      const prev = sorted[i - 1]!;
      const ydP = Math.abs(lineCenterY(sorted[i]!) - lineCenterY(prev));
      const prevWords = [...(prev.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const prevStr = prevWords.map((w) => w.text?.trim() ?? "").filter(Boolean).join(" ");
      const prevHasMesa = mesaStartOnLine(prevWords) != null;
      const prevHeaderSemNumeros =
        isPerTableHeaderFragment(prevStr) &&
        collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(prevStr))).length === 0;
      if (ydP < yMergeMax && !prevHasMesa && !prevHeaderSemNumeros && !/^main\b/i.test(prevStr)) {
        const prep = prevWords.map((w) => w.text?.trim() ?? "").filter(Boolean).join(" ");
        afterRest = `${prep} ${afterRest}`.trim();
        nums = collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(afterRest)));
      }
    }

    if (nums.length < 3 && i + 1 < sorted.length) {
      const yd = Math.abs(lineCenterY(sorted[i + 1]!) - lineCenterY(sorted[i]!));
      const nextWords = [...(sorted[i + 1]!.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const nextStrFixed = nextWords.map((w) => w.text?.trim() ?? "").filter(Boolean).join(" ");
      const nextOwn = nextStrFixed.length > 0 ? mesaStartOnLine(nextWords) : null;
      if (yd < yMergeMax && !nextOwn) {
        const tail2 = stripSummaryLeadForMerge(nextStrFixed);
        afterRest = `${afterRest} ${tail2}`.trim();
        nums = collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(afterRest)));
        if (nums.length >= 3) i++;
      }
    }

    if (nums.length < 3) continue;
    const norm = normalizeSignedNumberText(afterRest);
    const triple = parseFirstThreeMetrics(norm, resolved.mesa);
    if (!triple) continue;
    const [ggr, turnover, apostas] = triple;
    out.push({
      dia: diaRef,
      operadora: resolved.operadora,
      mesa: resolved.mesa,
      ggr,
      turnover,
      apostas: Math.round(apostas),
    });
  }
  return out;
}

function parsePorTabelaBlock(
  lines: string[],
  start: number,
  diaRef: string,
): PorTabelaRowParsed[] {
  const out: PorTabelaRowParsed[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^main\b|^day\b/i.test(line)) continue;
    const resolved = resolveMesaOperadora(line);
    if (!resolved) continue;
    const low = line.toLowerCase();
    let prefixLen = 0;
    for (const m of MESA_RAW_TO_CANON) {
      if (low.startsWith(m.raw.toLowerCase())) {
        prefixLen = m.raw.length;
        break;
      }
    }
    const afterName = line.slice(prefixLen).trim();
    const triple = parseFirstThreeMetrics(afterName, resolved.mesa);
    if (!triple) continue;
    const [ggr, turnover, apostas] = triple;
    out.push({
      dia: diaRef,
      operadora: resolved.operadora,
      mesa: resolved.mesa,
      ggr,
      turnover,
      apostas: Math.round(apostas),
    });
  }
  return out;
}

function inferDailyEnd(lines: string[], iDaily: number, iPer: number): number {
  const bound = iPer >= 0 ? iPer : lines.length;
  for (let i = iDaily + 1; i < bound; i++) {
    if (isMonthlyTitleLine(lines[i])) return i;
  }
  return bound;
}

export function parseRelatorioFromOcrText(
  text: string,
  layoutLines?: OcrLineLayout[] | null,
): IngestRelatorioMesasPayload {
  const lines = normalizeLines(text);
  const iDaily = findDailySummariesIndex(lines);
  const iPer = findPerTableIndex(lines);
  const dailyEnd = iDaily >= 0 ? inferDailyEnd(lines, iDaily, iPer) : 0;

  const daily =
    iDaily >= 0 ? parseDailyBlock(lines, iDaily + 1, dailyEnd, text) : [];

  fillNullDailyGgrFromSummaryRow(daily, parsePerTableSummaryD1TripleFromLines(lines));

  const monthly = parseMonthlyUapArpuAllLines(lines, text);

  let dataRef = daily.length
    ? daily.reduce((a, r) => (r.data > a ? r.data : a), daily[0].data)
    : new Date().toISOString().slice(0, 10);

  const maxScan = maxBrDateIsoInText(text);
  if (maxScan && maxScan > dataRef) dataRef = maxScan;

  const porStart = iPer >= 0 ? iPer + 1 : -1;
  const useLayout = layoutLines != null && layoutLines.length > 0;
  const por_tabela =
    porStart >= 0
      ? useLayout
        ? parsePorTabelaFromLayoutLines(layoutLines!, dataRef)
        : parsePorTabelaBlock(lines, porStart, dataRef)
      : [];

  return {
    data_referencia_por_mesa: dataRef,
    daily_summary: daily,
    monthly_summary: monthly,
    por_tabela,
    ocr_preview: text.slice(0, 4000),
  };
}

let workerSingleton: Worker | null = null;

async function getWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (!workerSingleton) {
    workerSingleton = await createWorker("por+eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
  }
  return workerSingleton;
}

export async function terminateMesasSpinOcrWorker(): Promise<void> {
  if (workerSingleton) {
    await workerSingleton.terminate();
    workerSingleton = null;
  }
}

export async function prepareImageForOcr(file: File, maxWidth = 4800): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const bmp = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const scale = bmp.width > maxWidth ? maxWidth / bmp.width : 1;
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reconstrói o texto na ordem visual (Daily/Monthly continuam a usar isto). */
function buildSpatialOcrText(data: { text?: string | null; lines?: OcrLineLayout[] | null }): string {
  const lines = data.lines;
  if (!lines || lines.length === 0) return data.text ?? "";

  const sortedLines = [...lines].sort((a, b) => {
    const ya = (a.bbox?.y0 ?? 0) + (a.bbox?.y1 ?? 0);
    const yb = (b.bbox?.y0 ?? 0) + (b.bbox?.y1 ?? 0);
    return ya - yb;
  });

  const out: string[] = [];
  for (const line of sortedLines) {
    const words = [...(line.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const s = words
      .map((w) => w.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();
    if (s.length > 0) out.push(s);
  }

  const spatial = out.join("\n");
  return spatial.length > 0 ? spatial : (data.text ?? "");
}

export async function runMesasSpinOcrDetailed(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<MesasSpinOcrResult> {
  onProgress?.("preparação", 0);
  const dataUrl = await prepareImageForOcr(file);
  onProgress?.("ocr", 0);
  const worker = await getWorker((p) => onProgress?.("ocr", p));
  const { data } = await worker.recognize(dataUrl);
  const layoutLines = Array.isArray(data.lines) ? (data.lines as OcrLineLayout[]) : null;
  const text = buildSpatialOcrText({
    text: data.text,
    lines: layoutLines,
  });
  return { text, layoutLines: layoutLines && layoutLines.length > 0 ? layoutLines : null };
}

export async function runMesasSpinOcr(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<string> {
  const { text } = await runMesasSpinOcrDetailed(file, onProgress);
  return text;
}
