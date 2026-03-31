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

const MONTH_YEAR_RE = new RegExp(`\\b(${MONTHS_FOR_RE})[\\s.:]*(\\d{4})\\b`, "i");

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthYearToIso(mon: string, year: string): string | null {
  const key = mon.toLowerCase();
  const mi = MESES_EN_LONG[key] ?? MESES_EN[key];
  if (mi === undefined) return null;
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

function numbersFromRight(parts: string[], count: number): number[] | null {
  const nums: number[] = [];
  let i = parts.length - 1;
  while (i >= 0 && nums.length < count) {
    const n = parseNumericToken(parts[i]);
    if (n === null) break;
    nums.unshift(n);
    i--;
  }
  if (nums.length !== count) return null;
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

/** Primeiros três números após o nome da mesa (GGR d-1, Turnover d-1, Bets d-1). */
function parseFirstThreeMetrics(afterName: string): [number, number, number] | null {
  const parts = splitLineParts(afterName);
  const nums: number[] = [];
  for (const p of parts) {
    const n = parseNumericToken(p);
    if (n != null) {
      nums.push(n);
      if (nums.length === 3) return [nums[0], nums[1], nums[2]];
    }
  }
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
    let tail = parts.slice(1);
    let nr = numbersFromRight(tail, 5);
    if (!nr) nr = numbersFromRight(tail, 4);
    if (!nr) {
      i++;
      continue;
    }
    let turnover: number;
    let ggr: number;
    let apostas: number;
    let uap: number;
    if (nr.length === 5) {
      [turnover, ggr, , apostas, uap] = nr;
    } else {
      [turnover, ggr, apostas, uap] = nr;
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
 * Tabela monthly à direita: cada linha tem MMM YYYY e exatamente 2 números (UAP inteiro, ARPU decimal).
 * Ignora linhas do quadro esquerdo (muitas colunas numéricas).
 */
function parseSecondMonthlyBlock(lines: string[], start: number, endExclusive: number): MonthlyRowParsed[] {
  const out: MonthlyRowParsed[] = [];
  for (let i = start; i < endExclusive; i++) {
    const line = lines[i];
    if (/\bper\s+table/i.test(line)) break;
    if (isMonthlyTitleLine(line)) continue;
    const m = line.match(MONTH_YEAR_RE);
    if (!m || m.index === undefined) continue;
    const mon = m[1];
    const year = m[2];
    const mesIso = monthYearToIso(mon, year);
    if (!mesIso) continue;
    const tail = line.slice(m.index + m[0].length);
    const parts = splitLineParts(tail);
    const fromRight: number[] = [];
    for (let j = parts.length - 1; j >= 0; j--) {
      const n = parseNumericToken(parts[j]);
      if (n === null) break;
      fromRight.unshift(n);
    }
    if (fromRight.length !== 2) continue;
    const [uapVal, arpuVal] = fromRight;
    out.push({
      mes: mesIso,
      uap: Math.round(uapVal),
      arpu: arpuVal,
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

  const bound = iPer >= 0 ? iPer : lines.length;
  const monthlyTitles: number[] = [];
  for (let i = iDaily >= 0 ? iDaily : 0; i < bound; i++) {
    if (isMonthlyTitleLine(lines[i])) monthlyTitles.push(i);
  }
  let monthlyScanStart = bound;
  if (monthlyTitles.length >= 2) monthlyScanStart = monthlyTitles[1] + 1;
  else if (monthlyTitles.length === 1) monthlyScanStart = monthlyTitles[0] + 1;
  /** Só linhas «Mês ano» + exactamente UAP e ARPU (filtra o quadro mensal esquerdo com mais métricas). */
  const monthly =
    monthlyScanStart < bound ? parseSecondMonthlyBlock(lines, monthlyScanStart, bound) : [];

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
