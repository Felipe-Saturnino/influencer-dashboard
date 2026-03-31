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

const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

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

function brDateToIso(token: string): string | null {
  const m = token.match(BR_DATE_RE);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Coleta todos os tokens numéricos na linha, da esquerda para a direita. */
function collectNumbersLeftToRight(parts: string[]): number[] {
  const nums: number[] = [];
  for (const p of parts) {
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
 * Métricas d-1 da linha Per table: GGR d-1, Turnover d-1, Bets d-1.
 * Com OCR, a linha traz 9+ números (d-1, d-2, MTD); usamos sempre o 1.º trio.
 */
function parseFirstThreeMetrics(afterName: string): [number, number, number] | null {
  const parts = splitLineParts(afterName);
  const nums = collectNumbersLeftToRight(parts);
  if (nums.length >= 9) return [nums[0], nums[1], nums[2]];
  if (nums.length >= 6) return [nums[0], nums[1], nums[2]];
  if (nums.length >= 3) return [nums[0], nums[1], nums[2]];
  return null;
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
function parseDailyBlock(lines: string[], start: number, endExclusive: number): DailyRowParsed[] {
  const out: DailyRowParsed[] = [];
  let i = start;
  while (i < endExclusive) {
    const line = lines[i];
    if (isMonthlyTitleLine(line) || /\bper\s+table/i.test(line)) break;
    const parts = splitLineParts(line);
    if (parts.length < 5) {
      i++;
      continue;
    }
    const dIso = brDateToIso(parts[0]);
    if (!dIso) {
      i++;
      continue;
    }
    const tail = parts.slice(1);
    const nr = collectNumbersLeftToRight(tail);
    let turnover: number;
    let ggr: number;
    let apostas: number;
    let uap: number;
    if (nr.length >= 7) {
      turnover = nr[0];
      ggr = nr[1];
      apostas = nr[3];
      uap = nr[4];
    } else if (nr.length === 6) {
      turnover = nr[0];
      ggr = nr[1];
      apostas = nr[2];
      uap = nr[3];
    } else if (nr.length === 5) {
      turnover = nr[0];
      ggr = nr[1];
      apostas = nr[3];
      uap = nr[4];
    } else if (nr.length === 4) {
      turnover = nr[0];
      ggr = nr[1];
      apostas = nr[2];
      uap = nr[3];
    } else {
      i++;
      continue;
    }
    out.push({
      data: dIso,
      turnover,
      ggr,
      apostas: Math.round(apostas),
      uap: Math.round(uap),
    });
    i++;
  }
  return out;
}

/**
 * Tabela monthly UAP/ARPU (geralmente à direita): linha "Jan 2026" + exatamente 2 números.
 * O quadro esquerdo tem 6+ números após o mês → ignorado.
 * Varre o texto inteiro: ordem do OCR pode colocar esse bloco depois de "Per table".
 */
function parseMonthlyUapArpuAllLines(lines: string[]): MonthlyRowParsed[] {
  const byMes = new Map<string, MonthlyRowParsed>();
  for (const line of lines) {
    if (isMonthlyTitleLine(line)) continue;
    const m = line.match(MONTH_YEAR_RE);
    if (!m || m.index === undefined) continue;
    const mon = m[1];
    const year = m[2];
    const mesIso = monthYearToIso(mon, year);
    if (!mesIso) continue;
    const tail = line.slice(m.index + m[0].length);
    const parts = splitLineParts(tail);
    const allNums = collectNumbersLeftToRight(parts);
    if (allNums.length !== 2) continue;
    const [uapVal, arpuVal] = allNums;
    byMes.set(mesIso, {
      mes: mesIso,
      uap: Math.round(uapVal),
      arpu: arpuVal,
    });
  }
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
    iDaily >= 0 ? parseDailyBlock(lines, iDaily + 1, dailyEnd) : [];

  const monthly = parseMonthlyUapArpuAllLines(lines);

  let dataRef = daily.length
    ? daily.reduce((a, r) => (r.data > a ? r.data : a), daily[0].data)
    : new Date().toISOString().slice(0, 10);

  const re = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
  let rm: RegExpExecArray | null;
  while ((rm = re.exec(text)) !== null) {
    const iso = `${rm[3]}-${rm[2]}-${rm[1]}`;
    if (iso > dataRef) dataRef = iso;
  }

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

export async function prepareImageForOcr(file: File, maxWidth = 3200): Promise<string> {
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
