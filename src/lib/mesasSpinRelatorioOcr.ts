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

/**
 * GGR d-1 é muito menor que Turnover d-1; Apostas normalmente bem abaixo do Turnover.
 * Quando o 1.º token parece Turnover (OCR perdeu o GGR), desliza a janela até achar o trio.
 */
function pickD1GgrTurnoverApostas(nums: number[]): [number, number, number] | null {
  if (nums.length < 3) return null;
  const maxI = Math.min(nums.length - 3, 10);
  for (let i = 0; i <= maxI; i++) {
    const ggr = nums[i];
    const turnover = nums[i + 1];
    const apostas = nums[i + 2];
    const absG = Math.abs(ggr);
    const absT = Math.abs(turnover);
    if (absT < 500) continue;
    if (absG >= absT) continue;
    const ratioG = absG / absT;
    if (ratioG >= 0.42) continue;
    const ratioA = apostas / absT;
    if (ratioA < 0.0015 || ratioA > 0.55) continue;
    if (apostas > absT) continue;
    return [ggr, turnover, apostas];
  }
  return [nums[0], nums[1], nums[2]];
}

/** Métricas d-1: GGR, Turnover, Apostas (ordem do quadro). */
function parseFirstThreeMetrics(afterName: string): [number, number, number] | null {
  const parts = splitLineParts(afterName);
  const nums = collectNumbersLeftToRight(parts);
  return pickD1GgrTurnoverApostas(nums);
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
    const rest = line.slice(dateHit.restStart);
    const nr = collectNumbersLeftToRight(splitLineParts(rest));
    const metrics = assignDailyMetrics(nr);
    if (!metrics) {
      i++;
      continue;
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

/**
 * Tabela monthly UAP/ARPU (geralmente à direita): linha "Jan 2026" + exatamente 2 números.
 * O quadro esquerdo tem 6+ números após o mês → ignorado.
 * Varre o texto inteiro: ordem do OCR pode colocar esse bloco depois de "Per table".
 */
/** Captura "Jan 2026 1.322 146,76" no texto bruto (OCR parte linhas; quadro da esquerda tem milhões e é filtrado). */
function scrapeMonthlyUapArpuGaps(text: string, byMes: Map<string, MonthlyRowParsed>): void {
  const re = new RegExp(
    `\\b(${MONTHS_FOR_RE})\\s+(\\d{4}|\\d{2}[oO]\\d{2})\\b\\s*[^0-9\\-]{0,8}([\\-0-9][0-9O.,]{0,16})\\s+([\\-0-9][0-9O.,]{0,16})`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const mesIso = monthYearToIso(m[1], m[2].replace(/o/gi, "0"));
    if (!mesIso || byMes.has(mesIso)) continue;
    const uapVal = parseNumericToken(m[3].replace(/O/g, "0"));
    const arpuVal = parseNumericToken(m[4].replace(/O/g, "0"));
    if (uapVal == null || arpuVal == null) continue;
    if (uapVal < 600 || uapVal > 6000) continue;
    if (Math.abs(arpuVal) > 450 || Math.abs(arpuVal) < 38) continue;
    byMes.set(mesIso, {
      mes: mesIso,
      uap: Math.round(uapVal),
      arpu: arpuVal,
    });
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
      if (!mesIso2 || byMes.has(mesIso2)) break;
      byMes.set(mesIso2, {
        mes: mesIso2,
        uap: Math.round(uapVal),
        arpu: arpuVal,
      });
      break;
    }
  }

  scrapeMonthlyUapArpuGaps(rawText, byMes);

  return Array.from(byMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));
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
    const triple = parseFirstThreeMetrics(afterName);
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

export function parseRelatorioFromOcrText(text: string): IngestRelatorioMesasPayload {
  const lines = normalizeLines(text);
  const iDaily = findDailySummariesIndex(lines);
  const iPer = findPerTableIndex(lines);
  const dailyEnd = iDaily >= 0 ? inferDailyEnd(lines, iDaily, iPer) : 0;

  const daily =
    iDaily >= 0 ? parseDailyBlock(lines, iDaily + 1, dailyEnd, text) : [];

  const monthly = parseMonthlyUapArpuAllLines(lines, text);

  let dataRef = daily.length
    ? daily.reduce((a, r) => (r.data > a ? r.data : a), daily[0].data)
    : new Date().toISOString().slice(0, 10);

  const maxScan = maxBrDateIsoInText(text);
  if (maxScan && maxScan > dataRef) dataRef = maxScan;

  const porStart = iPer >= 0 ? iPer + 1 : -1;
  const por_tabela =
    porStart >= 0 ? parsePorTabelaBlock(lines, porStart, dataRef) : [];

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

export async function prepareImageForOcr(file: File, maxWidth = 4200): Promise<string> {
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

export async function runMesasSpinOcr(
  file: File,
  onProgress?: (stage: string, pct: number) => void,
): Promise<string> {
  onProgress?.("preparação", 0);
  const dataUrl = await prepareImageForOcr(file);
  onProgress?.("ocr", 0);
  const worker = await getWorker((p) => onProgress?.("ocr", p));
  const { data } = await worker.recognize(dataUrl);
  return data.text ?? "";
}
