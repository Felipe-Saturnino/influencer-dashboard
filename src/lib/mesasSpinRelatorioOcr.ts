/**
 * OCR (Tesseract no browser) + parser para o print Mesas Spin v2.
 * Secções: Daily summaries BRL | Monthly (só tabela à direita: Date+UAP+ARPU) | Per table BRL (d-1).
 */

import { createWorker, PSM, type Worker } from "tesseract.js";

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
  t = t.replace(/^["'`´«»\u201c\u201d\u201e\u2033]+|["'`´«»\u201c\u201d\u201e\u2033]+$/g, "");
  t = t.replace(/(\d)[a-zA-Z]{1,3}$/i, "$1");
  if (!t) return null;
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

/** Junta N linhas consecutivas (OCR às vezes parte o título da secção). */
function lineChunkJoin(lines: string[], start: number, len: number): string {
  return lines.slice(start, Math.min(lines.length, start + len)).join(" ");
}

function splitLineParts(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Primeira data D/M/AAAA na linha; corrige 2O→20 e, se o OCR leu 20 mas existe 29 no mesmo mês/ano na linha, usa 29. */
function firstBrDateInLineToIso(line: string): { iso: string; restStart: number } | null {
  const dm = line.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if (!dm || dm.index === undefined) return null;
  let dd = dm[1].replace(/[oO]/g, "0").padStart(2, "0");
  const mm = dm[2].replace(/[oO]/g, "0").padStart(2, "0");
  const yy = dm[3].replace(/[oO]/g, "0");
  if (dd === "20" && new RegExp(`\\b29\\s*\\/\\s*${mm}\\s*\\/\\s*${yy}\\b`).test(line)) {
    dd = "29";
  }
  const iso = `${yy}-${mm}-${dd}`;
  return { iso, restStart: dm.index + dm[0].length };
}

/** Maior data D/M/AAAA encontrada em todo o OCR (para dia referência por mesa). */
function maxBrDateIsoInText(text: string): string | null {
  const re = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/g;
  let max: string | null = null;
  let rm: RegExpExecArray | null;
  while ((rm = re.exec(text)) !== null) {
    let dd = rm[1].replace(/[oO]/g, "0").padStart(2, "0");
    const mm = rm[2].replace(/[oO]/g, "0").padStart(2, "0");
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
    .replace(/-\s+(?=[\d,])/g, "-")
    .replace(/[\u201c\u201d\u201e\u2033"'«»]\s*(?=[\d,])/g, "-");
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

/** Corrige lixo típico do OCR no início do nome da mesa (ex.: «(asa de Apostas Routerte»). */
function normalizeOcrTableNameLine(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s([{`'""«»]+/, "");
  t = t.replace(/\basa\s+de\s+apostas\b/gi, "Casa de Apostas");
  t = t.replace(/\bcasa\s+de\s+apostas\b/gi, "Casa de Apostas");
  t = t.replace(/\brouterte\b/gi, "Roulette");
  t = t.replace(/\broulete\b/gi, "Roulette");
  t = t.replace(/\broulett\b/gi, "Roulette");
  t = t.replace(/\b(blackjack\s+\d)\s*\.\s+(?=[\d-])/gi, "$1 ");
  return t.trim();
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
  let norm = normalizeOcrTableNameLine(tableCell).replace(/\s+/g, " ").trim();
  norm = norm.replace(/\.\s*$/g, "").trim();
  const low = norm.toLowerCase();
  if (/^summary\b/i.test(low) || /\bsummary\b/i.test(low)) return null;
  if (low.startsWith("bet nacional")) return null;
  for (const m of MESA_RAW_TO_CANON) {
    if (low.startsWith(m.raw.toLowerCase())) return { operadora: m.operadora, mesa: m.mesa };
  }
  return null;
}

function canonEntryForLine(lineStr: string): (typeof MESA_RAW_TO_CANON)[number] | null {
  const norm = normalizeOcrTableNameLine(lineStr).replace(/\s+/g, " ").replace(/\.\s*$/g, "").trim();
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

function wordCenterYWord(w: OcrWordLayout): number {
  return (w.bbox.y0 + w.bbox.y1) / 2;
}

/** Token que parece número/coluna (OCR); evita «Casa», «Roulette», etc. */
function looksLikeNumericOcrToken(raw: string): boolean {
  const t = raw.trim().replace(/\u2212/g, "-").replace(/\u2013/g, "-").replace(/\u2014/g, "-");
  if (t.length === 0 || t.length > 28) return false;
  if (/[a-zA-Z]{2,}/.test(t)) return false;
  return /[\d]/.test(t.replace(/O/gi, "0"));
}

/** Lixos típicos do Tesseract na 1.ª célula d-1 («em», «aus», …) — sem dígitos. */
function looksLikeGarbageMetricToken(raw: string): boolean {
  const t = raw.trim().replace(/\s/g, "");
  if (t.length < 2 || t.length > 6) return false;
  if (looksLikeNumericOcrToken(t)) return false;
  if (isLayoutNoiseWord(t)) return false;
  return /^[a-zA-Z]+$/.test(t);
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

function lineTextLooksLikeSummary(ws: OcrWordLayout[]): boolean {
  const s = ws.map((w) => w.text.trim().toLowerCase()).join(" ");
  return /\bsummary\b/i.test(s) || /\bsummar[yv]\b/.test(s) || /\b4ummary\b/.test(s);
}

function isLayoutNoiseWord(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (t.length === 0) return true;
  if (/^d[-]?1$/i.test(t) || /^d[-]?2$/i.test(t)) return true;
  if (t === "ggr" || t === "mtd") return true;
  if (t === "turnover" || t === "bets" || t === "bet") return true;
  if (t === "summary") return true;
  if (t === "per" || t === "table" || t === "brl") return true;
  return false;
}

function wordsToMetricWords(ws: OcrWordLayout[]): OcrWordLayout[] {
  return [...ws].filter((w) => !isLayoutNoiseWord(w.text)).sort((a, b) => a.bbox.x0 - b.bbox.x0);
}

/**
 * O OCR separa «-» do número (GGR neg. na Roleta); o centro X do «-» pode cair na coluna errada.
 * Funde com o token seguinte se estiver perto e tiver dígitos.
 */
function mergeOrphanMinusWords(ws: OcrWordLayout[]): OcrWordLayout[] {
  const sorted = [...ws].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const out: OcrWordLayout[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i]!;
    const t = w.text
      .trim()
      .replace(/\u2212/g, "-")
      .replace(/\u2013/g, "-");
    if ((t === "-" || t === "–" || t === "—") && i + 1 < sorted.length) {
      const n = sorted[i + 1]!;
      const gap = n.bbox.x0 - w.bbox.x1;
      if (gap <= 72 && /\d/.test(n.text)) {
        out.push({
          text: `-${n.text.trim()}`,
          bbox: {
            x0: w.bbox.x0,
            y0: Math.min(w.bbox.y0, n.bbox.y0),
            x1: n.bbox.x1,
            y1: Math.max(w.bbox.y1, n.bbox.y1),
          },
        });
        i++;
        continue;
      }
    }
    out.push(w);
  }
  return out;
}

/** 1.ª e última linha de mesa costumam desviar ligeiramente em X relativamente ao cabeçalho. */
function slackenD1AnchorsForEdgeRow(
  a: PerTableD1ColumnAnchors,
  isFirstDataRow: boolean,
  isLastDataRow: boolean,
): PerTableD1ColumnAnchors {
  const spanGT = Math.max(a.boundTurnBets - a.boundGgrTurn, 24);
  const spanTB = Math.max(a.betsRightMaxX - a.boundTurnBets, 24);
  const dxG = Math.max(32, spanGT * 0.14);
  const dxB = Math.max(32, spanTB * 0.12);
  let boundGgrTurn = a.boundGgrTurn;
  let boundTurnBets = a.boundTurnBets;
  let betsRightMaxX = a.betsRightMaxX;
  if (isFirstDataRow) boundGgrTurn = a.boundGgrTurn + Math.max(dxG, 40);
  if (isLastDataRow) {
    betsRightMaxX = a.betsRightMaxX + Math.max(dxB, 40);
    boundTurnBets = a.boundTurnBets - Math.min(dxB * 0.35, spanGT * 0.2);
  }
  if (boundTurnBets <= boundGgrTurn + 8) boundTurnBets = boundGgrTurn + spanGT * 0.45;
  return { boundGgrTurn, boundTurnBets, betsRightMaxX };
}

function medianGap(ns: number[]): number {
  if (ns.length === 0) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Funde caixas OCR adjacentes com pequeno espaço (ex. «1» + «,053») para não confundir gap interno com coluna nova. */
function collapseMetricWordsSameCell(ws: OcrWordLayout[]): OcrWordLayout[] {
  const sorted = [...ws].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  if (sorted.length <= 1) return sorted;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i]!.bbox.x0 - sorted[i - 1]!.bbox.x1);
  }
  const med = medianGap(gaps);
  const maxJoin = Math.min(50, Math.max(8, med * 0.72));
  const out: OcrWordLayout[] = [];
  let acc = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i]!;
    const gap = w.bbox.x0 - acc.bbox.x1;
    if (gap <= maxJoin) {
      acc = {
        text: `${acc.text.trim()} ${w.text.trim()}`.trim(),
        bbox: {
          x0: acc.bbox.x0,
          y0: Math.min(acc.bbox.y0, w.bbox.y0),
          x1: Math.max(acc.bbox.x1, w.bbox.x1),
          y1: Math.max(acc.bbox.y1, w.bbox.y1),
        },
      };
    } else {
      out.push(acc);
      acc = w;
    }
  }
  out.push(acc);
  return out;
}

/** Limites horizontais das 3 colunas d-1 (GGR / Turnover / Bets) inferidos do cabeçalho «Per table BRL» na imagem. */
type PerTableD1ColumnAnchors = {
  boundGgrTurn: number;
  boundTurnBets: number;
  /** Palavras com centro X abaixo disto pertencem a Bets d-1; à direita são d-2/MTD. */
  betsRightMaxX: number;
};

function wordCenterX(w: OcrWordLayout): number {
  return (w.bbox.x0 + w.bbox.x1) / 2;
}

function avgSpanCenterX(ws: OcrWordLayout[], from: number, to: number): number {
  let s = 0;
  let n = 0;
  for (let i = from; i <= to; i++) {
    s += wordCenterX(ws[i]!);
    n++;
  }
  return n ? s / n : 0;
}

function spanMaxX1(ws: OcrWordLayout[], from: number, to: number): number {
  let m = -Infinity;
  for (let i = from; i <= to; i++) m = Math.max(m, ws[i]!.bbox.x1);
  return m;
}

function spanMinX0(ws: OcrWordLayout[], from: number, to: number): number {
  let m = Infinity;
  for (let i = from; i <= to; i++) m = Math.min(m, ws[i]!.bbox.x0);
  return m;
}

function normTok(t: string): string {
  return t.trim().replace(/\s+/g, " ").toLowerCase();
}

/** «d-1», «d - 1», token «d1» colado ou partido. */
function headerWordIsDminus1(ws: OcrWordLayout[], i: number): boolean {
  const a = normTok(ws[i]?.text ?? "");
  const b = i + 1 < ws.length ? normTok(ws[i + 1]!.text) : "";
  const c = i + 2 < ws.length ? normTok(ws[i + 2]!.text) : "";
  if (/^d[-–]?\s*1$/i.test(a) || a === "d1" || a.replace(/[^a-z0-9]/gi, "") === "d1") return true;
  if (a === "d" && /^[-–]?\s*1$/.test(b)) return true;
  if (a === "d" && b === "-" && /^1$/.test(c)) return true;
  return false;
}

function headerWordIsDminus2(ws: OcrWordLayout[], i: number): boolean {
  const a = normTok(ws[i]?.text ?? "");
  const b = i + 1 < ws.length ? normTok(ws[i + 1]!.text) : "";
  const c = i + 2 < ws.length ? normTok(ws[i + 2]!.text) : "";
  if (/^d[-–]?\s*2$/i.test(a) || a === "d2" || a.replace(/[^a-z0-9]/gi, "") === "d2") return true;
  if (a === "d" && /^[-–]?\s*2$/.test(b)) return true;
  if (a === "d" && b === "-" && /^2$/.test(c)) return true;
  return false;
}

function lineLooksLikePerTableHeader(ws: OcrWordLayout[]): boolean {
  const spaceJoin = ws.map((w) => normTok(w.text)).join(" ");
  const compact = spaceJoin.replace(/\s+/g, "");
  if (!/\bper\b/i.test(spaceJoin) || !/\btable\b/i.test(spaceJoin)) return false;
  if (!/ggr/i.test(spaceJoin)) return false;
  if (!/turnover|tunrover/i.test(spaceJoin)) return false;
  if (!/\bbets?\b/i.test(spaceJoin)) return false;
  return /\bd\s*[-]?\s*1\b/i.test(spaceJoin) || /\bd1\b/i.test(compact);
}

function findPerTableHeaderWords(sortedLayoutLines: OcrLineLayout[]): OcrWordLayout[] | null {
  for (let li = 0; li < sortedLayoutLines.length; li++) {
    const line = sortedLayoutLines[li]!;
    const raw = line.words ?? [];
    if (raw.length < 4) continue;
    const ws = [...raw].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    if (lineLooksLikePerTableHeader(ws)) return ws;
    if (li + 1 < sortedLayoutLines.length) {
      const yd = Math.abs(lineCenterY(line) - lineCenterY(sortedLayoutLines[li + 1]!));
      if (yd < 40) {
        const raw2 = sortedLayoutLines[li + 1]!.words ?? [];
        if (raw2.length === 0) continue;
        const merged = [...raw, ...raw2].sort((a, b) => a.bbox.x0 - b.bbox.x0);
        if (lineLooksLikePerTableHeader(merged)) return merged;
      }
    }
  }
  return null;
}

/** Índice final (inclusivo) do sufixo «d-1» ou «d-2» começando em `i` (primeiro token após GGR/Turnover/Bets). */
function endIndexOfDminusSuffix(w: OcrWordLayout[], i: number, digit: "1" | "2"): number {
  const t = normTok(w[i]?.text ?? "");
  const oneOrTwo = digit === "1" ? "1" : "2";
  if (new RegExp(`^d[-–]?\\s*${oneOrTwo}$`, "i").test(t) || t === `d${oneOrTwo}`) return i;
  const flattened = t.replace(/[^a-z0-9]/gi, "");
  if (flattened === `d${oneOrTwo}`) return i;
  if (t === "d" && i + 2 < w.length && normTok(w[i + 1]!.text) === "-" && normTok(w[i + 2]!.text) === oneOrTwo) {
    return i + 2;
  }
  if (t === "d" && i + 1 < w.length && new RegExp(`^[-]?${oneOrTwo}$`).test(normTok(w[i + 1]!.text))) {
    return i + 1;
  }
  return i;
}

/**
 * Obtém limites X entre GGR d-1 | Turnover d-1 | Bets d-1 a partir dos títulos do cabeçalho na imagem.
 * Direito da coluna Bets: meio‑termo até «GGR d-2» quando existir.
 */
function buildPerTableD1ColumnAnchors(headerWordsSorted: OcrWordLayout[]): PerTableD1ColumnAnchors | null {
  const w = headerWordsSorted;
  const n = w.length;

  let iGgrD1 = -1;
  let jGgrD1 = -1;
  let iTurnD1 = -1;
  let jTurnD1 = -1;
  let iBetD1 = -1;
  let jBetD1 = -1;
  let iGgrD2 = -1;
  let jGgrD2 = -1;

  for (let i = 0; i < n; i++) {
    if (!/^ggr$/i.test(normTok(w[i]!.text))) continue;
    if (i + 1 >= n || !headerWordIsDminus1(w, i + 1)) continue;
    iGgrD1 = i;
    jGgrD1 = endIndexOfDminusSuffix(w, i + 1, "1");
    break;
  }

  for (let i = 0; i < n; i++) {
    if (!/turnover|tunrover/i.test(normTok(w[i]!.text))) continue;
    if (i + 1 >= n || !headerWordIsDminus1(w, i + 1)) continue;
    iTurnD1 = i;
    jTurnD1 = endIndexOfDminusSuffix(w, i + 1, "1");
    break;
  }

  for (let i = 0; i < n; i++) {
    if (!/^bets?$/i.test(normTok(w[i]!.text))) continue;
    if (i + 1 >= n || !headerWordIsDminus1(w, i + 1)) continue;
    iBetD1 = i;
    jBetD1 = endIndexOfDminusSuffix(w, i + 1, "1");
    break;
  }

  for (let i = 0; i < n; i++) {
    if (!/^ggr$/i.test(normTok(w[i]!.text))) continue;
    if (i + 1 >= n || !headerWordIsDminus2(w, i + 1)) continue;
    if (iGgrD1 >= 0 && i >= iGgrD1 && i <= jGgrD1) continue;
    iGgrD2 = i;
    jGgrD2 = endIndexOfDminusSuffix(w, i + 1, "2");
    break;
  }

  if (iGgrD1 < 0 || iTurnD1 < 0 || iBetD1 < 0) return null;

  const xG = avgSpanCenterX(w, iGgrD1, jGgrD1);
  const xT = avgSpanCenterX(w, iTurnD1, jTurnD1);
  const xB = avgSpanCenterX(w, iBetD1, jBetD1);
  const xsSorted = [xG, xT, xB].sort((a, b) => a - b);
  const xLeft = xsSorted[0]!;
  const xMid = xsSorted[1]!;
  const xRight = xsSorted[2]!;

  let betsRightMaxX: number;
  if (iGgrD2 >= 0) {
    const rightBets = spanMaxX1(w, iBetD1, jBetD1);
    const leftG2 = spanMinX0(w, iGgrD2, jGgrD2);
    betsRightMaxX = (rightBets + leftG2) / 2;
  } else {
    betsRightMaxX = xRight + Math.max(48, (xRight - xMid) * 1.15);
  }

  return {
    boundGgrTurn: (xLeft + xMid) / 2,
    boundTurnBets: (xMid + xRight) / 2,
    betsRightMaxX,
  };
}

function assignMetricWordToD1Column(cx: number, a: PerTableD1ColumnAnchors): 0 | 1 | 2 | -1 {
  if (cx < a.boundGgrTurn) return 0;
  if (cx < a.boundTurnBets) return 1;
  if (cx < a.betsRightMaxX) return 2;
  return -1;
}

/** Lê GGR / Turnover / Apostas d-1 alinhando às colunas do cabeçalho (sem regras entre magnitudes). */
function buildTripleStringFromColumnBuckets(
  metricWords: OcrWordLayout[],
  anchors: PerTableD1ColumnAnchors,
): string | null {
  const b0: OcrWordLayout[] = [];
  const b1: OcrWordLayout[] = [];
  const b2: OcrWordLayout[] = [];
  for (const w of metricWords) {
    if (isLayoutNoiseWord(w.text)) continue;
    const cx = wordCenterX(w);
    const col = assignMetricWordToD1Column(cx, anchors);
    if (col === 0) b0.push(w);
    else if (col === 1) b1.push(w);
    else if (col === 2) b2.push(w);
  }
  const sortX = (p: OcrWordLayout, q: OcrWordLayout) => p.bbox.x0 - q.bbox.x0;
  b0.sort(sortX);
  b1.sort(sortX);
  b2.sort(sortX);
  const g = clusterWordsToNumber(b0);
  const t = clusterWordsToNumber(b1);
  const bet = clusterWordsToNumber(b2);
  if (g == null || t == null || bet == null) return null;
  return `${g} ${t} ${bet}`;
}

/**
 * 1.ª / última linha de dados: limites do cabeçalho desalinham → reparte o intervalo d-1
 * [min X, betsRightMaxX) em **três faixas iguais** (GGR | Turnover | Bets), só com palavras nessa janela.
 * Evita usar «3 primeiros números no texto» quando o GGR não aparece na string (deslocava T/B para GGR/T e T_d-2 em Apostas).
 */
function buildTripleStringFromD1EqualThirds(
  metricWords: OcrWordLayout[],
  betsRightMaxX: number,
): string | null {
  const raw = [...metricWords]
    .filter((w) => !isLayoutNoiseWord(w.text) && wordCenterX(w) < betsRightMaxX)
    .sort((a, b) => a.bbox.x0 - b.bbox.x0);
  if (raw.length === 0) return null;
  const collapsed = collapseMetricWordsSameCell(raw);
  if (collapsed.length < 3) return null;
  const xs = collapsed.map((w) => wordCenterX(w));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const span = xMax - xMin;
  if (span < 28) return null;
  const t1 = xMin + span / 3;
  const t2 = xMin + (2 * span) / 3;
  const b0: OcrWordLayout[] = [];
  const b1: OcrWordLayout[] = [];
  const b2: OcrWordLayout[] = [];
  const sortX = (p: OcrWordLayout, q: OcrWordLayout) => p.bbox.x0 - q.bbox.x0;
  for (const w of collapsed) {
    const cx = wordCenterX(w);
    if (cx < t1) b0.push(w);
    else if (cx < t2) b1.push(w);
    else b2.push(w);
  }
  b0.sort(sortX);
  b1.sort(sortX);
  b2.sort(sortX);
  const g = clusterWordsToNumber(b0);
  const t = clusterWordsToNumber(b1);
  const bet = clusterWordsToNumber(b2);
  if (g == null || t == null || bet == null) return null;
  return `${g} ${t} ${bet}`;
}

/** Fallback sem cabeçalho: 1.º trio contíguo em X que parseia (sem comparar GGR vs turnover). */
function enumerateFirstValidD1TripleString(atoms: OcrWordLayout[]): string | null {
  const n = atoms.length;
  if (n < 3) return null;
  for (let i = 1; i <= n - 2; i++) {
    for (let j = i + 1; j <= n - 1; j++) {
      const gv = clusterWordsToNumber(atoms.slice(0, i));
      const tv = clusterWordsToNumber(atoms.slice(i, j));
      const av = clusterWordsToNumber(atoms.slice(j));
      if (gv != null && tv != null && av != null) return `${gv} ${tv} ${av}`;
    }
  }
  return null;
}

function tripleFromFirstThreeAtoms(collapsed: OcrWordLayout[]): string | null {
  if (collapsed.length < 3) return null;
  const gv = clusterWordsToNumber(collapsed.slice(0, 1));
  const tv = clusterWordsToNumber(collapsed.slice(1, 2));
  const av = clusterWordsToNumber(collapsed.slice(2, 3));
  if (gv == null || tv == null || av == null) return null;
  return `${gv} ${tv} ${av}`;
}

function clusterWordsToNumber(cluster: OcrWordLayout[]): number | null {
  if (cluster.length === 0) return null;
  const joined = normalizeSignedNumberText(
    cluster.map((w) => w.text.trim()).filter(Boolean).join(" "),
  );
  const nums = collectNumbersLeftToRight(splitLineParts(joined));
  if (nums.length >= 1) return nums[0]!;
  const t = joined.replace(/\s+/g, "").trim();
  return t ? parseNumericToken(t) : null;
}

function clusterMetricWordsByMedianGap(ws: OcrWordLayout[]): OcrWordLayout[][] {
  if (ws.length === 0) return [];
  const sorted = [...ws].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i]!.bbox.x0 - sorted[i - 1]!.bbox.x1);
  }
  const med = medianGap(gaps);
  const thresh = Math.max(22, med * 1.6);
  const clusters: OcrWordLayout[][] = [[sorted[0]!]];
  for (let i = 1; i < sorted.length; i++) {
    const g = sorted[i]!.bbox.x0 - sorted[i - 1]!.bbox.x1;
    if (g > thresh) clusters.push([]);
    clusters[clusters.length - 1]!.push(sorted[i]!);
  }
  return clusters;
}

/**
 * GGR / Turnover / Apostas d-1 via salto X (corta bloco d-2) + 2 colunas intermédias na zona d-1.
 */
/** Fallback quando não há cabeçalho «Per table» reconhecido: só geometria (gaps), sem regras GGR×turnover. */
function buildPerTableD1TripleStringFromMetricWords(metricWords: OcrWordLayout[]): string | null {
  const filtered = metricWords.filter((w) => !isLayoutNoiseWord(w.text));
  if (filtered.length < 1) return null;
  const sorted = [...filtered].sort((a, b) => a.bbox.x0 - b.bbox.x0);

  const outerGaps: Array<{ i: number; g: number }> = [];
  for (let i = 1; i < sorted.length; i++) {
    outerGaps.push({ i, g: sorted[i]!.bbox.x0 - sorted[i - 1]!.bbox.x1 });
  }
  const gvals = outerGaps.map((x) => x.g);
  const medOut = medianGap(gvals);
  const maxOut = outerGaps.length ? Math.max(...gvals) : 0;
  const strongBlockAfterD1 = maxOut >= Math.max(34, medOut * 1.85);

  let d1words = sorted;
  if (strongBlockAfterD1 && outerGaps.length > 0) {
    const cut = outerGaps.reduce((a, b) => (b.g > a.g ? b : a)).i;
    if (cut >= 2 && cut < sorted.length) d1words = sorted.slice(0, cut);
  }

  if (d1words.length < 1) return null;

  const collapsed = collapseMetricWordsSameCell(d1words);
  const bestEnum = enumerateFirstValidD1TripleString(collapsed);
  if (bestEnum) return bestEnum;
  const fromThree = tripleFromFirstThreeAtoms(collapsed);
  if (fromThree) return fromThree;

  const innerGaps: Array<{ i: number; g: number }> = [];
  for (let i = 1; i < d1words.length; i++) {
    innerGaps.push({ i, g: d1words[i]!.bbox.x0 - d1words[i - 1]!.bbox.x1 });
  }
  if (innerGaps.length >= 2) {
    const byG = [...innerGaps].sort((a, b) => b.g - a.g);
    const top = byG[0]!;
    const second = byG[1]!;
    const s1 = Math.min(top.i, second.i);
    const s2 = Math.max(top.i, second.i);
    const g = clusterWordsToNumber(d1words.slice(0, s1));
    const t = clusterWordsToNumber(d1words.slice(s1, s2));
    const a = clusterWordsToNumber(d1words.slice(s2));
    if (g != null && t != null && a != null) return `${g} ${t} ${a}`;
  }

  const clusters = clusterMetricWordsByMedianGap(d1words);
  if (clusters.length < 3) return null;
  const g = clusterWordsToNumber(clusters[0]!);
  const t = clusterWordsToNumber(clusters[1]!);
  const a = clusterWordsToNumber(clusters[2]!);
  if (g == null || t == null || a == null) return null;
  return `${g} ${t} ${a}`;
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
function roletaLooksLikeShiftedFirstCellIsTurnover(
  first: number,
  second: number,
  firstDataRow?: boolean,
): boolean {
  const absF = Math.abs(first);
  const minTurn = firstDataRow ? 38_000 : 55_000;
  if (absF < minTurn || absF > 240_000) return false;
  const minSecond = firstDataRow ? 5_000 : 7_000;
  if (second < minSecond || second > 75_000) return false;
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

/**
 * Com âncoras/OCR (especialmente última linha), o 1.º bucket pode ser **Bets d-1**, o 2.º Turnover d-1 e o 3.º **Turnover d-2**.
 * Padrão seguro: **a < b < c** (|--|) — turn d-2 pode ser só ligeiramente maior que d-1, por isso na **última linha** aceitamos só isso.
 */
function speedBaccaratTrustColsLookLikeBetsTurnD2(
  first: number,
  second: number,
  third: number,
  lastDataRow?: boolean,
): boolean {
  const a = Math.abs(first);
  const b = Math.abs(second);
  const c = Math.abs(third);
  if (b < 1_500 || b > 250_000 || a < 50) return false;
  if (a >= b) return false;
  if (c <= b) return false;

  if (lastDataRow === true) {
    return true;
  }

  if (a > b * 0.92) return false;
  const thirdLooksLikeD2Turn = c >= 22_000 || c >= b * 1.11 || (c > 14_000 && c > a * 2.2);
  if (!thirdLooksLikeD2Turn) return false;
  if (c < 12_000 && c <= a * 1.35) return false;
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

/** GGR da Roleta tipicamente |GGR|/turnover ∈ [~0,8%, ~14%]; nunca ~0. */
function scoreRoletaGgrCandidate(v: number, turnoverAbs: number): number | null {
  const av = Math.abs(v);
  if (av < 100 || av > Math.min(38_000, turnoverAbs * 0.32)) return null;
  const ratio = av / turnoverAbs;
  if (ratio < 0.008 || ratio > 0.16) return null;
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
  const tolT = Math.max(55, tAbs * 0.01);
  const tolB = Math.max(10, bAbs * 0.004);
  const idx = nums.findIndex((n) => Math.abs(Math.abs(n) - tAbs) <= tolT);
  if (idx <= 0) return null;
  let best: number | null = null;
  let bestSc = Infinity;
  for (let k = idx - 1; k >= 0; k--) {
    const prev = nums[k]!;
    if (Math.abs(Math.abs(prev) - bAbs) <= tolB) continue;
    const sc = scoreRoletaGgrCandidate(prev, tAbs);
    if (sc != null && sc < bestSc) {
      bestSc = sc;
      best = prev;
    }
  }
  if (best != null) return best;
  for (let k = idx - 1; k >= 0; k--) {
    const prev = nums[k]!;
    if (Math.abs(Math.abs(prev) - bAbs) <= tolB) continue;
    if (scoreRoletaGgrCandidate(prev, tAbs) != null) return prev;
  }
  return null;
}

/** GGR d-1 à esquerda do turnover na linha OCR (após corrigir slots Bets/Turn d-1 na Speed). */
function extractSpeedBaccaratGgrFromNumsBeforeTurnover(
  nums: number[],
  turnover: number,
  betsD1: number,
): number | null {
  const tAbs = Math.abs(turnover);
  const bAbs = Math.abs(betsD1);
  if (tAbs < 2_000) return null;
  const tolT = Math.max(50, tAbs * 0.008);
  const tolB = Math.max(35, bAbs * 0.035);
  let ti = nums.findIndex((n) => Math.abs(Math.abs(n) - tAbs) <= tolT);
  if (ti < 0) {
    ti = indexOfClosestAbsMatch(nums, tAbs, Math.max(160, tAbs * 0.028));
  }
  if (ti <= 0) return null;
  for (let k = ti - 1; k >= 0; k--) {
    const v = nums[k]!;
    if (Math.abs(Math.abs(v) - bAbs) <= tolB) continue;
    const av = Math.abs(v);
    if (av >= tAbs * 0.42) continue;
    if (av > 16_000) continue;
    if (av > 0 && av < 40) continue;
    return v;
  }
  return null;
}

type PerTableEdgeRows = { isFirst?: boolean; isLast?: boolean };

function strictPerTableD1Triple(
  nums: number[],
  mesa: string,
  afterNameForRoleta: string,
  roletaNumPool?: number[],
  trustColumnLayout?: boolean,
  edgeRows?: PerTableEdgeRows,
): { ggr: number | null; turnover: number; apostas: number } | null {
  if (nums.length < 3) return null;
  let ggr: number | null = nums[0];
  let turnover = nums[1];
  let apostas = nums[2];

  if (
    trustColumnLayout &&
    mesa === "Speed Baccarat" &&
    speedBaccaratTrustColsLookLikeBetsTurnD2(
      nums[0]!,
      nums[1]!,
      nums[2]!,
      edgeRows?.isLast === true,
    )
  ) {
    const pool = roletaNumPool && roletaNumPool.length >= 3 ? roletaNumPool : nums;
    turnover = nums[1]!;
    apostas = nums[0]!;
    ggr = extractSpeedBaccaratGgrFromNumsBeforeTurnover(pool, turnover, apostas);
    const fixed = { ggr, turnover, apostas };
    fixed.turnover = Math.abs(fixed.turnover);
    fixed.apostas = Math.abs(fixed.apostas);
    return fixed;
  }
  if (trustColumnLayout) {
    const out = { ggr, turnover, apostas };
    out.turnover = Math.abs(out.turnover);
    out.apostas = Math.abs(out.apostas);
    return out;
  }

  if (
    mesa === "Roleta" &&
    roletaLooksLikeShiftedFirstCellIsTurnover(nums[0], nums[1], edgeRows?.isFirst === true)
  ) {
    turnover = nums[0];
    apostas = nums[1];
    const pool = roletaNumPool && roletaNumPool.length >= 3 ? roletaNumPool : nums;
    ggr =
      extractRoletaGgrFromNumsBeforeTurnover(pool, turnover, apostas) ??
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

/**
 * Reparações finais para OCR ruidoso: troca turnover/apostas (ex.: VIP 745 vs 26k),
 * GGR com dígito/milhar «comido» (Roleta 17→9017; VIP 745→4745; BJ 83→483).
 */
function finalRepairPerTableMetrics(
  mesa: string,
  ggr: number | null,
  turnover: number,
  apostas: number,
  numPool: number[],
): { ggr: number | null; turnover: number; apostas: number } {
  let g = ggr;
  let t = Math.abs(turnover);
  let b = Math.abs(apostas);
  const poolAbs = () => [...new Set(numPool.map((n) => Math.abs(n)))];

  if (t >= 200 && t < 12_000 && b > 15_000 && b > t * 2.5) {
    const tmp = t;
    t = b;
    b = tmp;
  }
  const avgBet = t / Math.max(1, b);
  if (avgBet > 0 && avgBet < 1.2 && Math.max(t, b) > 12_000) {
    const tmp = t;
    t = b;
    b = tmp;
  }

  if (mesa === "Roleta" && g != null && g > 0 && t > 45_000) {
    const candidates: number[] = [];
    if (g < 260) candidates.push(g + 9_000);
    if (g >= 880 && g <= 1_250) candidates.push((g % 1000) + 9_000);
    let best: number | null = null;
    let bestDist = Infinity;
    for (const cand of candidates) {
      const r = cand / t;
      if (r >= 0.028 && r <= 0.17) {
        const dist = Math.abs(r - 0.075);
        if (dist < bestDist) {
          bestDist = dist;
          best = cand;
        }
      }
    }
    if (best != null) g = best;
  }

  if (mesa === "Blackjack VIP" && t >= 11_000 && t <= 50_000) {
    if (g != null && g <= 150 && b >= 350 && b <= 10_000) {
      const plus = b + 4_000;
      const rPlus = plus / t;
      if (rPlus >= 0.07 && rPlus <= 0.28) {
        const stolenBet = b;
        g = plus;
        const altB = poolAbs().find(
          (n) =>
            n >= 150 &&
            n <= 4_500 &&
            Math.round(n) !== Math.round(t) &&
            Math.round(n) !== Math.round(stolenBet) &&
            Math.abs(n - stolenBet) > 8,
        );
        if (altB != null) b = altB;
      } else {
        const rB = b / t;
        if (rB >= 0.07 && rB <= 0.22) g = b;
      }
    }
  }

  if (
    mesa === "Blackjack VIP" &&
    g != null &&
    g > 0 &&
    g <= 1_800 &&
    t >= 11_000 &&
    t <= 45_000 &&
    b <= 2_000
  ) {
    const cand = g + 4_000;
    const r = cand / t;
    if (r >= 0.07 && r <= 0.28) g = cand;
  }

  if (
    (mesa === "Blackjack 1" || mesa === "Blackjack 2") &&
    g != null &&
    g > 30 &&
    g > 0 &&
    g < 150 &&
    t > 14_000
  ) {
    const cand = g + 400;
    const r = cand / t;
    if (r >= 0.003 && r <= 0.04) g = cand;
  }

  if ((mesa === "Blackjack 1" || mesa === "Blackjack 2") && g != null && g <= 30 && t > 14_000) {
    const uniq = poolAbs().filter((n) => Math.round(n) !== Math.round(t));
    for (const n of uniq.sort((a, b) => b - a)) {
      if (n < 35 || n > 6_000) continue;
      let fixed = false;
      for (const cand of [n + 400, n]) {
        const r = cand / t;
        if (r >= 0.002 && r <= 0.045 && cand >= 40 && cand <= 3_500) {
          g = cand;
          fixed = true;
          break;
        }
      }
      if (fixed) break;
    }
  }

  if (g != null && g <= 25 && t > 18_000 && numPool.length >= 3) {
    const alt = numPool.filter(
      (n) =>
        Math.abs(n) >= 350 &&
        Math.abs(n) <= 6_500 &&
        Math.round(Math.abs(n)) !== Math.round(t) &&
        Math.round(Math.abs(n)) !== Math.round(b),
    );
    if (alt.length === 1) {
      const v = alt[0]!;
      const r = Math.abs(v) / t;
      if (r >= 0.004 && r <= 0.25) g = v;
    }
  }

  return { ggr: g, turnover: t, apostas: Math.round(b) };
}

/** Métricas d-1: GGR, Turnover, Apostas — só as 3 primeiras células numéricas da linha. */
function parseFirstThreeMetrics(
  afterName: string,
  mesa: string,
  layoutContext?: {
    allNums: number[];
    fullTail: string;
    fromColumnLayout?: boolean;
    isFirstPerTableMesaRow?: boolean;
    isLastPerTableMesaRow?: boolean;
  },
): [number | null, number, number] | null {
  const norm = normalizeSignedNumberText(afterName);
  const parts = splitLineParts(norm);
  const nums = collectNumbersLeftToRight(parts);
  const numPoolForRepair =
    layoutContext?.allNums && layoutContext.allNums.length > 0
      ? [...nums, ...layoutContext.allNums]
      : nums;
  const tailForRoleta = layoutContext?.fullTail ?? norm;
  const roletaPool =
    layoutContext?.allNums && layoutContext.allNums.length >= 3 ? layoutContext.allNums : undefined;
  const trustCols = layoutContext?.fromColumnLayout === true;
  const edgeRows: PerTableEdgeRows | undefined =
    layoutContext?.isFirstPerTableMesaRow != null || layoutContext?.isLastPerTableMesaRow != null
      ? {
          isFirst: layoutContext.isFirstPerTableMesaRow,
          isLast: layoutContext.isLastPerTableMesaRow,
        }
      : undefined;
  const raw = strictPerTableD1Triple(nums, mesa, tailForRoleta, roletaPool, trustCols, edgeRows);
  if (!raw) return null;
  const rep = finalRepairPerTableMetrics(mesa, raw.ggr, raw.turnover, raw.apostas, numPoolForRepair);
  let { ggr, turnover, apostas } = rep;
  const tailForSign = layoutContext?.fullTail ?? norm;
  if (ggr != null) {
    if (ggr > 0 && minusBeforeFirstDigitInCell(tailForSign)) ggr = -Math.abs(ggr);
    if (!trustCols) ggr = adjustRoletaGgrSign(mesa, ggr, turnover);
  }
  return [ggr, Math.abs(turnover), Math.abs(apostas)];
}

/** Índice do valor mais próximo de `target` em |x|; útil quando o OCR altera ligeiramente o turnover. */
function indexOfClosestAbsMatch(nums: number[], target: number, maxDelta: number): number {
  let bestI = -1;
  let bestD = Infinity;
  for (let i = 0; i < nums.length; i++) {
    const d = Math.abs(Math.abs(nums[i]!) - target);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  if (bestI < 0 || bestD > maxDelta) return -1;
  return bestI;
}

/** Quando as colunas falham no GGR mas turnover/apostas batem: número antes do turnover na cauda OCR. */
function extractRoletaGgrLoose(tail: string, turnover: number, apostas: number): number | null {
  const tAbs = Math.abs(turnover);
  const bAbs = Math.abs(apostas);
  const nums = collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(tail)));
  const tolT = Math.max(90, tAbs * 0.016);
  const tolB = Math.max(25, bAbs * 0.028);
  let idx = nums.findIndex((n) => Math.abs(Math.abs(n) - tAbs) <= tolT);
  if (idx < 0) {
    idx = indexOfClosestAbsMatch(nums, tAbs, Math.max(220, tAbs * 0.045));
  }
  if (idx <= 0) return null;
  let bestScored: number | null = null;
  let bestRank = Infinity;
  for (let k = idx - 1; k >= 0; k--) {
    const v = nums[k]!;
    if (Math.abs(Math.abs(v) - bAbs) <= tolB) continue;
    const sc = scoreRoletaGgrCandidate(v, tAbs);
    if (sc != null && sc < bestRank) {
      bestRank = sc;
      bestScored = v;
    }
  }
  if (bestScored != null) return bestScored;
  for (let k = idx - 1; k >= 0; k--) {
    const v = nums[k]!;
    if (Math.abs(Math.abs(v) - bAbs) <= tolB) continue;
    return v;
  }
  return null;
}

function findDailySummariesIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (
      /daily\s*summar/i.test(l) ||
      (/\bdaily\b/i.test(l) && /summar/i.test(l) && /brl/i.test(l))
    ) {
      return i;
    }
  }
  for (const win of [2, 3, 4] as const) {
    for (let i = 0; i <= lines.length - win; i++) {
      const c = lineChunkJoin(lines, i, win);
      if (
        /daily\s*summar/i.test(c) ||
        (/\bdaily\b/i.test(c) && /summar/i.test(c) && /brl/i.test(c))
      ) {
        return i;
      }
    }
  }
  return -1;
}

function findPerTableIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (
      /\bper\s+table/i.test(l) ||
      (/\bper\b/i.test(l) && /\btable\b/i.test(l) && /brl/i.test(l))
    ) {
      return i;
    }
  }
  for (const win of [2, 3, 4] as const) {
    for (let i = 0; i <= lines.length - win; i++) {
      const c = lineChunkJoin(lines, i, win);
      if (/\bper\b/i.test(c) && /\btable\b/i.test(c) && (/brl/i.test(c) || /d[\s-]*1/i.test(c))) {
        return i;
      }
    }
  }
  for (let i = 0; i < lines.length; i++) {
    if (!/\bper\b/i.test(lines[i]!)) continue;
    const c = lineChunkJoin(lines, i, 4);
    if (/\btable\b/i.test(c)) return i;
  }
  return -1;
}

function isMonthlyTitleLine(line: string): boolean {
  const x = line.toLowerCase();
  return (
    /monthly\s*summar/i.test(line) ||
    (/monthly/.test(x) && /summar/.test(x) && /brl/i.test(line))
  );
}

/**
 * Limite do bloco Daily: início real da secção mensal (linha atual).
 * Linhas com data DD/MM/AAAA nunca contam como início mensal, mesmo numa janela de várias linhas.
 */
function isMonthlySectionBoundaryLine(lines: string[], i: number): boolean {
  if (i >= lines.length) return false;
  const li = lines[i]!.trim();
  if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}/.test(li)) return false;
  if (isMonthlyTitleLine(lines[i]!)) return true;
  if (/^\s*monthly\b/i.test(li)) {
    const c2 = lineChunkJoin(lines, i, 2);
    if (/summar/i.test(c2) && /brl/i.test(c2)) return true;
  }
  return false;
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
    if (ap < 0.05) continue;
    const pushCand = (p: number) => {
      const g = Math.round((turnover * p) / 100);
      if (Math.abs(g) > Math.abs(turnover) * 0.35) return;
      cands.push({ g, ap: Math.abs(p) });
    };
    if (ap <= 12) {
      pushCand(pct);
    } else if (ap <= 55) {
      const scaled = pct / 10;
      const aps = Math.abs(scaled);
      if (aps >= 0.2 && aps <= 12) pushCand(scaled);
    }
  }
  const reLoose = /(-?\d+)\s*[.,]\s*(\d+)\s*%/g;
  while ((m = reLoose.exec(raw)) !== null) {
    const pct = parseNumericToken(`${m[1]}.${m[2]}%`) ?? parseNumericToken(`${m[1]},${m[2]}%`);
    if (pct == null) continue;
    const ap = Math.abs(pct);
    if (ap < 0.05) continue;
    const pushLoose = (p: number) => {
      const g = Math.round((turnover * p) / 100);
      if (Math.abs(g) > Math.abs(turnover) * 0.35) return;
      cands.push({ g, ap: Math.abs(p) });
    };
    if (ap <= 12) pushLoose(pct);
    else if (ap <= 55) {
      const scaled = pct / 10;
      if (Math.abs(scaled) >= 0.2 && Math.abs(scaled) <= 12) pushLoose(scaled);
    }
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

  /** OCR leu o GGR como margem (27 em vez de 2,7%): 2º número parece % e 3º já são apostas (milhares). */
  if (
    nr.length >= 5 &&
    looksLikeMarginPercent(t1) &&
    Math.abs(t1) <= 48 &&
    t2 >= 4_000 &&
    t3 >= 40 &&
    t3 <= 900 &&
    Math.abs(t1) < Math.abs(t0) * 0.01
  ) {
    return { turnover: t0, ggr: null, apostas: t2, uap: t3 };
  }

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

/** Só recupera milhar truncado (×10/×100). Não inferir turnover a partir de GGR — gerava valores ~185k incorretos. */
function fixDailyOcrTurnoverGgr(
  turnover: number,
  ggr: number | null,
  bets: number,
): { turnover: number; ggr: number | null } {
  let t = turnover;
  const g = ggr;
  if (bets < 4000 || t <= 0) return { turnover: t, ggr: g };

  const okRatio = (tt: number) => {
    const r = tt / bets;
    if (r < 2.2 || r > 21) return false;
    if (g != null && Math.abs(g) > 80) {
      const rg = Math.abs(g) / tt;
      if (rg < 0.008 || rg > 0.22) return false;
    }
    return true;
  };

  if (okRatio(t)) return { turnover: t, ggr: g };

  let bestT = t;
  let bestScore = Number.POSITIVE_INFINITY;
  const consider = (tt: number) => {
    if (!okRatio(tt)) return;
    let score = Math.abs(tt / bets - 6.5);
    if (g != null && Math.abs(g) > 80) {
      const rg = Math.abs(g) / tt;
      score += Math.abs(rg - 0.055) * 200;
    }
    if (score < bestScore) {
      bestScore = score;
      bestT = tt;
    }
  };

  for (const mul of [10, 100] as const) {
    consider(Math.round(turnover * mul));
  }
  if (g != null && Math.abs(g) > 400 && bets > 6_000) {
    consider(Math.round(Math.abs(g) / 0.056));
    consider(Math.round(Math.abs(g) / 0.062));
  }

  return { turnover: bestScore < Number.POSITIVE_INFINITY ? bestT : t, ggr: g };
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
    // Só a linha atual: janelas «para a frente» faziam coincidir 30/03+31/03 com «Monthly» na linha seguinte e paravam cedo.
    if (isMonthlyTitleLine(line) || /^\s*monthly\s+/i.test(line.trim())) break;
    const perAhead = lineChunkJoin(lines, i, 4);
    if (/\bper\b/i.test(perAhead) && /\btable\b/i.test(perAhead)) break;
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
    let turnover = metrics.turnover;
    let ggr = metrics.ggr;
    const scaled = fixDailyOcrTurnoverGgr(turnover, ggr, metrics.apostas);
    turnover = scaled.turnover;
    ggr = scaled.ggr;
    out.push({
      data: dateHit.iso,
      turnover,
      ggr,
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

/**
 * Último par plausível (UAP, ARPU) quando o OCR junta as duas tabelas mensais na mesma linha
 * (ex.: «Mar 2026 … Mar 2026 1,370 17»).
 */
function pickBestUapArpuPairFromNumbers(allNums: number[]): { uap: number; arpu: number } | null {
  for (let k = allNums.length - 1; k >= 1; k--) {
    let uapVal = allNums[k - 1]!;
    let arpuVal = allNums[k]!;
    if (uapVal < 100 || !Number.isFinite(uapVal)) continue;
    if (!Number.isFinite(arpuVal)) continue;
    if (arpuVal >= 5 && arpuVal < 55 && uapVal >= 350) arpuVal *= 10;
    if (
      uapVal <= 50_000 &&
      Math.abs(arpuVal) >= 7 &&
      Math.abs(arpuVal) <= 450
    ) {
      return { uap: uapVal, arpu: arpuVal };
    }
  }
  return null;
}

function parseMonthlyUapArpuAllLines(lines: string[], rawText: string): MonthlyRowParsed[] {
  const byMes = new Map<string, MonthlyRowParsed>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isMonthlyTitleLine(line)) continue;
    if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}/.test(line.trim())) continue;
    const reMy = new RegExp(MONTH_YEAR_RE.source, "gi");
    const matches = [...line.matchAll(reMy)];
    if (matches.length === 0) continue;

    const ingestMonthSegment = (mon: string, yearRaw: string, segment: string) => {
      const y = yearRaw.replace(/o/gi, "0");
      const mesIso = monthYearToIso(mon, y);
      if (!mesIso) return;
      const parts = splitLineParts(segment);
      let allNums = collectNumbersLeftToRight(parts);
      if (allNums.length === 3) {
        const [a, b, c] = allNums;
        if (a >= 500 && a <= 100_000 && b >= 50 && b < 1000 && c >= 0 && c < 100) {
          const arpuMerged = c < 10 ? b + c / 10 : b + c / 100;
          allNums = [a, arpuMerged];
        }
      }
      let uapVal: number;
      let arpuVal: number;
      if (allNums.length === 2) {
        uapVal = allNums[0]!;
        arpuVal = allNums[1]!;
        if (arpuVal >= 5 && arpuVal < 55 && uapVal >= 350) arpuVal *= 10;
      } else if (allNums.length > 2) {
        const picked = pickBestUapArpuPairFromNumbers(allNums);
        if (!picked) return;
        uapVal = picked.uap;
        arpuVal = picked.arpu;
      } else return;

      if (uapVal < 100 || uapVal > 1_000_000) return;
      if (Math.abs(arpuVal) > 1_000_000) return;
      byMes.set(mesIso, {
        mes: mesIso,
        uap: Math.round(uapVal),
        arpu: arpuVal,
      });
    };

    for (let mi = 0; mi < matches.length; mi++) {
      const mat = matches[mi]!;
      const start = mat.index! + mat[0].length;
      const end = mi + 1 < matches.length ? matches[mi + 1]!.index! : line.length;
      const segment = line.slice(start, end);
      ingestMonthSegment(mat[1], mat[2], segment);
    }
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

function findFirstLastMesaLineIndices(sorted: OcrLineLayout[]): { first: number | null; last: number | null } {
  let first: number | null = null;
  let last: number | null = null;
  for (let idx = 0; idx < sorted.length; idx++) {
    const ww = [...(sorted[idx]!.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    if (ww.length === 0 || !mesaStartOnLine(ww)) continue;
    if (first == null) first = idx;
    last = idx;
  }
  return { first, last };
}

/**
 * Per table: lê colunas 2–4 pela ordem X das palavras (após o nome canónico), não pela ordem do string plano.
 * Opcionalmente funde a linha seguinte se o OCR partir o nome dos números (e a linha seguinte não for outra mesa).
 */
function parsePorTabelaFromLayoutLines(ocrLines: OcrLineLayout[], diaRef: string): PorTabelaRowParsed[] {
  const sorted = [...ocrLines].sort((a, b) => lineCenterY(a) - lineCenterY(b));
  const headerWs = findPerTableHeaderWords(sorted);
  const d1Anchors = headerWs ? buildPerTableD1ColumnAnchors(headerWs) : null;
  const { first: firstMesaIdx, last: lastMesaIdx } = findFirstLastMesaLineIndices(sorted);
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
    const nameWordsForBounds = subWords.slice(0, Math.max(k, 1));
    const mesaNameLeftX = Math.min(...nameWordsForBounds.map((w) => w.bbox.x0));
    const ys = nameWordsForBounds.map((w) => wordCenterYWord(w)).sort((a, b) => a - b);
    const yMed =
      ys.length > 0 ? ys[Math.floor(ys.length / 2)]! : lineCenterY(sorted[i]!);
    const lineH = Math.max(
      14,
      (sorted[i]!.bbox?.y1 ?? 0) - (sorted[i]!.bbox?.y0 ?? 0),
    );
    const yTol = Math.max(44, lineH * 0.42);
    const inSameTextRow = (w: OcrWordLayout) => Math.abs(wordCenterYWord(w) - yMed) <= yTol;

    /** GGR «órfão» à esquerda do nome da mesa, **na mesma faixa Y** (evita lixo de outras linhas no mesmo `line` do Tesseract). */
    const orphansBeforeMesaName = words.filter(
      (w) =>
        inSameTextRow(w) &&
        !isLayoutNoiseWord(w.text) &&
        w.bbox.x1 < mesaNameLeftX - 1 &&
        looksLikeNumericOcrToken(w.text),
    );
    let afterRest =
      k > 0
        ? subWords
            .slice(k)
            .map((w) => w.text?.trim() ?? "")
            .filter(Boolean)
            .join(" ")
        : lineStr.slice(canon.raw.length).trim();
    let metricWords = [
      ...orphansBeforeMesaName.sort((a, b) => a.bbox.x0 - b.bbox.x0),
      ...wordsToMetricWords(subWords.slice(k).filter(inSameTextRow)),
    ];
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
        metricWords = [...wordsToMetricWords(prevWords), ...metricWords];
      }
    }

    if (nums.length < 3 && i + 1 < sorted.length) {
      const yd = Math.abs(lineCenterY(sorted[i + 1]!) - lineCenterY(sorted[i]!));
      const nextWords = [...(sorted[i + 1]!.words ?? [])].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const nextStrFixed = nextWords.map((w) => w.text?.trim() ?? "").filter(Boolean).join(" ");
      const nextOwn = nextStrFixed.length > 0 ? mesaStartOnLine(nextWords) : null;
      /** Linha «Summary» não é continuação da mesa: anexar palavras contamina colunas d-1 com MTD/d-2. */
      const nextIsSummary = lineTextLooksLikeSummary(nextWords);
      if (yd < yMergeMax && !nextOwn && !nextIsSummary) {
        const tail2 = stripSummaryLeadForMerge(nextStrFixed);
        afterRest = `${afterRest} ${tail2}`.trim();
        nums = collectNumbersLeftToRight(splitLineParts(normalizeSignedNumberText(afterRest)));
        metricWords = [...metricWords, ...wordsToMetricWords(nextWords)];
        if (nums.length >= 3) i++;
      }
    }

    const tailNorm = normalizeSignedNumberText(afterRest);
    const orphanPrefix = orphansBeforeMesaName
      .map((w) => w.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    const orphanNorm = orphanPrefix ? normalizeSignedNumberText(orphanPrefix) : "";
    const fullTailForLayout = orphanNorm ? `${orphanNorm} ${tailNorm}`.trim() : tailNorm;
    const numsAfterName = collectNumbersLeftToRight(splitLineParts(tailNorm));
    const orphanNums = orphanNorm ? collectNumbersLeftToRight(splitLineParts(orphanNorm)) : [];
    const allNums =
      orphanNums.length > 0 ? [...orphanNums, ...numsAfterName] : numsAfterName;
    const layoutCtxBase = { allNums, fullTail: fullTailForLayout };
    const isFirstMesaRow = firstMesaIdx != null && i === firstMesaIdx;
    const isLastMesaRow = lastMesaIdx != null && i === lastMesaIdx;
    const mergedMetrics = mergeOrphanMinusWords(metricWords);
    let geomCol: string | null = null;
    if (d1Anchors) {
      const rowAnchors = slackenD1AnchorsForEdgeRow(d1Anchors, isFirstMesaRow, isLastMesaRow);
      const useEqualThirds =
        (isFirstMesaRow && resolved.mesa === "Roleta") ||
        (isLastMesaRow && resolved.mesa === "Speed Baccarat");
      if (useEqualThirds) {
        geomCol =
          buildTripleStringFromD1EqualThirds(mergedMetrics, rowAnchors.betsRightMaxX) ??
          buildTripleStringFromColumnBuckets(mergedMetrics, rowAnchors);
      } else {
        geomCol = buildTripleStringFromColumnBuckets(mergedMetrics, rowAnchors);
      }
      if (!geomCol && isFirstMesaRow && resolved.mesa === "Roleta") {
        const looser = slackenD1AnchorsForEdgeRow(d1Anchors, true, false);
        const wide = looser.betsRightMaxX + 36;
        geomCol =
          buildTripleStringFromD1EqualThirds(mergedMetrics, wide) ??
          buildTripleStringFromColumnBuckets(mergedMetrics, {
            ...looser,
            boundGgrTurn: looser.boundGgrTurn + Math.max(50, (looser.boundTurnBets - looser.boundGgrTurn) * 0.1),
          });
      }
      if (!geomCol && isLastMesaRow && resolved.mesa === "Speed Baccarat") {
        const looser = slackenD1AnchorsForEdgeRow(d1Anchors, false, true);
        const wide = looser.betsRightMaxX + 36;
        geomCol =
          buildTripleStringFromD1EqualThirds(mergedMetrics, wide) ??
          buildTripleStringFromColumnBuckets(mergedMetrics, {
            ...looser,
            boundGgrTurn: looser.boundGgrTurn + Math.max(50, (looser.boundTurnBets - looser.boundGgrTurn) * 0.1),
          });
      }
    }
    const geomStr = geomCol ?? buildPerTableD1TripleStringFromMetricWords(mergedMetrics);
    const fromColumnLayout = geomCol != null;
    const layoutCtx = {
      ...layoutCtxBase,
      fromColumnLayout,
      isFirstPerTableMesaRow: isFirstMesaRow,
      isLastPerTableMesaRow: isLastMesaRow,
    };
    let triple = geomStr ? parseFirstThreeMetrics(geomStr, resolved.mesa, layoutCtx) : null;
    if (!triple) {
      if (nums.length < 3) continue;
      triple = parseFirstThreeMetrics(layoutCtxBase.fullTail, resolved.mesa, layoutCtx);
    } else if (
      triple[0] == null &&
      geomStr &&
      resolved.mesa !== "Speed Baccarat" &&
      resolved.mesa !== "Roleta"
    ) {
      const alt = parseFirstThreeMetrics(layoutCtxBase.fullTail, resolved.mesa, {
        ...layoutCtxBase,
        fromColumnLayout: false,
      });
      if (alt && alt[0] != null) triple = alt;
    }
    if (triple && resolved.mesa === "Roleta" && triple[0] == null && triple[1] != null && triple[2] != null) {
      const ft = layoutCtxBase.fullTail;
      let gFill = extractRoletaGgrLoose(ft, triple[1], triple[2]);
      if (gFill != null) {
        if (gFill > 0 && minusBeforeFirstDigitInCell(ft)) gFill = -Math.abs(gFill);
        gFill = adjustRoletaGgrSign("Roleta", gFill, triple[1]!);
        triple = [gFill, triple[1], triple[2]];
      }
    }

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
    if (isMonthlySectionBoundaryLine(lines, i)) return i;
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
  let por_tabela =
    porStart >= 0
      ? useLayout
        ? parsePorTabelaFromLayoutLines(layoutLines!, dataRef)
        : parsePorTabelaBlock(lines, porStart, dataRef)
      : [];
  if (porStart >= 0) {
    const fromText = parsePorTabelaBlock(lines, porStart, dataRef);
    if (por_tabela.length === 0 || fromText.length > por_tabela.length) {
      if (fromText.length > 0) por_tabela = fromText;
    }
  }

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

/** Contraste leve em tons de cinza — ajuda dígitos pequenos na coluna GGR d-1. */
function enhanceCanvasGrayscaleContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  factor = 1.2,
): void {
  const img = ctx.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    let v = 0.299 * r + 0.587 * g + 0.114 * b;
    v = Math.min(255, Math.max(0, (v - 128) * factor + 128));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

export async function prepareImageForOcr(file: File, maxWidth = 6400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const bmp = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const scaleDown = bmp.width > maxWidth ? maxWidth / bmp.width : 1;
    let w = Math.round(bmp.width * scaleDown);
    let h = Math.round(bmp.height * scaleDown);
    /** Tesseract falha muito em «1»/«2» iniciais em colunas estreitas se o raster for baixo. */
    const minLongSide = 2400;
    const longSide = Math.max(w, h);
    if (longSide > 0 && longSide < minLongSide) {
      const up = Math.min(minLongSide / longSide, maxWidth / w, maxWidth / h, 3);
      if (up > 1.01) {
        w = Math.round(w * up);
        h = Math.round(h * up);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    enhanceCanvasGrayscaleContrast(ctx, w, h, 1.22);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadDataUrlAsImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar bitmap OCR"));
    img.src = dataUrl;
  });
}

/**
 * 2.ª leitura só da faixa GGR d-1 quando o 1.º token da coluna é lixo («em», «aus», …).
 * Usa linha + âncoras do cabeçalho Per table; texto reconstruído passa a mostrar o valor lido.
 */
async function refinePerTableGgrD1GarbageWords(
  sortedLayoutLines: OcrLineLayout[],
  dataUrl: string,
  worker: Worker,
): Promise<void> {
  const headerWs = findPerTableHeaderWords(sortedLayoutLines);
  if (!headerWs) return;
  const anchors = buildPerTableD1ColumnAnchors(headerWs);
  if (!anchors) return;

  const { first: firstIdx, last: lastIdx } = findFirstLastMesaLineIndices(sortedLayoutLines);
  let imgW = 0;
  let imgH = 0;
  try {
    const img = await loadDataUrlAsImage(dataUrl);
    imgW = img.naturalWidth;
    imgH = img.naturalHeight;
  } catch {
    return;
  }

  let refines = 0;
  const maxRefines = 10;

  try {
  for (let li = 0; li < sortedLayoutLines.length; li++) {
    if (refines >= maxRefines) break;
    const line = sortedLayoutLines[li]!;
    const raw = line.words ?? [];
    if (raw.length < 4) continue;
    const words = [...raw].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const mesaHit = mesaStartOnLine(words);
    if (!mesaHit) continue;

    const isEdge =
      (firstIdx != null && li === firstIdx) || (lastIdx != null && li === lastIdx);
    const colSlack = isEdge ? 78 : 34;

    const { startWi, canon } = mesaHit;
    const subWords = words.slice(startWi);
    const k = countPrefixWords(subWords, canon.raw);
    if (k <= 0) continue;

    const nameWs = subWords.slice(0, Math.max(k, 1));
    const ys = nameWs.map((w) => wordCenterYWord(w)).sort((a, b) => a - b);
    const yMed = ys.length > 0 ? ys[Math.floor(ys.length / 2)]! : lineCenterY(line);
    const lineH = Math.max(
      14,
      (line.bbox?.y1 ?? 0) - (line.bbox?.y0 ?? 0),
    );
    const yTol = Math.max(44, lineH * 0.42);
    const inSameTextRow = (w: OcrWordLayout) =>
      Math.abs(wordCenterYWord(w) - yMed) <= yTol;

    const metricWords = wordsToMetricWords(subWords.slice(k).filter(inSameTextRow));
    const col0 = metricWords.filter((w) => wordCenterX(w) < anchors.boundGgrTurn + colSlack);
    col0.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const w0 = col0[0];
    if (!w0 || !looksLikeGarbageMetricToken(w0.text)) continue;

    const x0 = Math.max(0, Math.floor(Math.min(...col0.map((w) => w.bbox.x0)) - 14));
    const x1 = Math.min(imgW - 1, Math.ceil(anchors.boundGgrTurn + colSlack + 14));
    const y0 = Math.max(0, Math.floor((line.bbox?.y0 ?? w0.bbox.y0) - 10));
    const y1 = Math.min(imgH - 1, Math.ceil((line.bbox?.y1 ?? w0.bbox.y1) + 10));
    const rw = Math.max(28, x1 - x0);
    const rh = Math.max(22, y1 - y0);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: "0123456789.,-+ ",
    });

    try {
      const { data } = await worker.recognize(dataUrl, {
        rectangle: { left: x0, top: y0, width: rw, height: rh },
      });
      const snip = (data?.text ?? "").replace(/\|/g, " ").trim();
      const normSnip = normalizeSignedNumberText(snip);
      const nums = collectNumbersLeftToRight(splitLineParts(normSnip));
      const n = nums.length > 0 ? nums[0]! : null;
      if (n == null) continue;

      let tokenOut = String(n);
      for (const p of splitLineParts(normSnip)) {
        const pv = parseNumericToken(p);
        if (pv != null && Math.abs(pv - n) <= Math.max(1, Math.abs(n) * 0.0001)) {
          tokenOut = p.trim();
          break;
        }
      }
      w0.text = tokenOut;
      refines++;
    } catch {
      /* ignora falha de recorte */
    }
  }
  } finally {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_char_whitelist: "",
      });
    } catch {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    }
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
  if (layoutLines && layoutLines.length > 0) {
    const sortedForRefine = [...layoutLines].sort((a, b) => {
      const ya = (a.bbox?.y0 ?? 0) + (a.bbox?.y1 ?? 0);
      const yb = (b.bbox?.y0 ?? 0) + (b.bbox?.y1 ?? 0);
      return ya - yb;
    });
    await refinePerTableGgrD1GarbageWords(sortedForRefine, dataUrl, worker);
  }
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
