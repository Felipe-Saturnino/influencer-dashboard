/**
 * OCR client-side (Tesseract.js) + parser heurístico para o print fixo do relatório Mesas Spin.
 * Depende do layout descrito no BI (seções Daily / Monthly / Per table).
 */

import { createWorker, type Worker } from "tesseract.js";

export interface OperadoraRef {
  slug: string;
  nome: string;
}

export interface IngestRelatorioMesasPayload {
  data_relatorio: string;
  daily_summary: DailySummaryParsed[];
  monthly_summary: MonthlySummaryParsed[];
  por_tabela: PorTabelaParsed[];
  ocr_preview?: string;
}

export type IngestRelatorioPayload = IngestRelatorioMesasPayload;

export interface DailySummaryParsed {
  data: string;
  operadora: string | null;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

export interface MonthlySummaryParsed {
  mes: string;
  operadora: string | null;
  turnover: number | null;
  ggr: number | null;
  margin_pct: number | null;
  bets: number | null;
  uap: number | null;
  bet_size: number | null;
  arpu: number | null;
}

export interface PorTabelaParsed {
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

const MESES_EN: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const MONTH_YEAR_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i;
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function brDateToIso(token: string): string | null {
  const m = token.match(BR_DATE_RE);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function monthYearToIso(mon: string, year: string): string | null {
  const mi = MESES_EN[mon.toLowerCase()];
  if (mi === undefined) return null;
  return `${year}-${pad2(mi + 1)}-01`;
}

/** Normaliza token com possível %, R$, espaços. */
export function parsePtBrNumber(raw: string): number | null {
  let t = raw.replace(/R\$/gi, "").replace(/%/g, "").replace(/\s/g, "").trim();
  if (!t) return null;
  /** Célula vazia no print / OCR — conta como 0 para não invalidar a linha das 9 métricas. */
  if (t === "—" || t === "-" || t === "–" || /^[–‑]$/.test(t) || /^n\/?a$/i.test(t)) return 0;
  t = t.replace(/O/g, "0");

  const sign = t.startsWith("-") ? -1 : 1;
  if (t.startsWith("-") || t.startsWith("+")) t = t.slice(1);

  // Vírgula só como milhar (OCR perdeu os centavos ou trocou "." por ","): 207,595 → R$ 207.595,00
  if (/^\d{1,3}(,\d{3})+$/.test(t)) {
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? sign * n : null;
  }

  // Apenas pontos como milhar pt-BR, sem parte decimal na string: 207.595 → 207595
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    const n = Number(t.replace(/\./g, ""));
    return Number.isFinite(n) ? sign * n : null;
  }

  // pt-BR: milhar com ponto, decimal com vírgula (ex.: 207.595,00 ou 207595,50)
  if (/^[\d.]+,\d{1,4}$/.test(t)) {
    const norm = t.replace(/\./g, "").replace(",", ".");
    const n = Number(norm);
    return Number.isFinite(n) ? sign * n : null;
  }

  // EN / misto: milhar com vírgula, decimal com ponto
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

function splitLineParts(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Coleta números a partir da direita até esgotar tokens numéricos. */
function numbersFromRight(parts: string[], count: number): { nums: number[]; rest: string[] } | null {
  const nums: number[] = [];
  let i = parts.length - 1;
  while (i >= 0 && nums.length < count) {
    const n = parsePtBrNumber(parts[i]);
    if (n === null) break;
    nums.unshift(n);
    i--;
  }
  if (nums.length !== count) return null;
  return { nums, rest: parts.slice(0, i + 1) };
}

function isPerTableOcrHeaderLine(line: string): boolean {
  const low = line.toLowerCase();
  return (low.includes("ggr") && low.includes("d-1") && low.includes("turnover")) || /^table\b/i.test(line);
}

export function resolveOperadoraSlug(nomeMesa: string, operadoras: OperadoraRef[]): string | null {
  const lower = nomeMesa.toLowerCase().trim();
  const sorted = [...operadoras].filter((o) => o.nome).sort((a, b) => b.nome.length - a.nome.length);
  for (const op of sorted) {
    if (lower.startsWith(op.nome.toLowerCase())) return op.slug;
  }
  return null;
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

function findDailySummariesIndex(lines: string[]): number {
  return lines.findIndex((l) => /daily\s+summar/i.test(l));
}

function findMonthlySummariesIndex(lines: string[]): number {
  return lines.findIndex((l) => /monthly\s+summar/i.test(l));
}

/** Evita confundir com "period", "prev", etc. */
function findPerTableIndex(lines: string[]): number {
  return lines.findIndex((l) => /\bper\s+table\b/i.test(l));
}

function parseDailyRows(lines: string[], start: number, end: number, _operadoras: OperadoraRef[]): DailySummaryParsed[] {
  void _operadoras;
  const out: DailySummaryParsed[] = [];
  for (let i = start; i < end; i++) {
    const parts = splitLineParts(lines[i]);
    if (parts.length < 8) continue;
    const dIso = brDateToIso(parts[0]);
    if (!dIso) continue;
    const nr = numbersFromRight(parts.slice(1), 7);
    if (!nr) continue;
    const [turnover, ggr, margin_pct, bets, uap, bet_size, arpu] = nr.nums;
    out.push({
      data: dIso,
      operadora: null,
      turnover,
      ggr,
      margin_pct,
      bets: Math.round(bets),
      uap: Math.round(uap),
      bet_size,
      arpu,
    });
  }
  return out;
}

function parseMonthlyBlock(textBlock: string[], _operadoras: OperadoraRef[]): MonthlySummaryParsed[] {
  void _operadoras;
  const merged = new Map<
    string,
    { turnover?: number; ggr?: number; margin_pct?: number; bets?: number; bet_size?: number; uap?: number; arpu?: number }
  >();

  for (const line of textBlock) {
    const m = line.match(MONTH_YEAR_RE);
    if (!m) continue;
    const mesIso = monthYearToIso(m[1], m[2]);
    if (!mesIso) continue;
    const idx = line.toLowerCase().indexOf(m[0].toLowerCase());
    const tail = line.slice(idx + m[0].length);
    const parts = splitLineParts(tail);
    const nums: number[] = [];
    let j = parts.length - 1;
    while (j >= 0) {
      const n = parsePtBrNumber(parts[j]);
      if (n === null) break;
      nums.unshift(n);
      j--;
    }
    if (nums.length === 0) continue;
    const cur = merged.get(mesIso) ?? {};
    if (nums.length >= 7) {
      cur.turnover = nums[0];
      cur.ggr = nums[1];
      cur.margin_pct = nums[2];
      cur.bets = nums[3];
      cur.bet_size = nums[4];
      cur.uap = nums[5];
      cur.arpu = nums[6];
    } else if (nums.length >= 5 && cur.uap === undefined) {
      cur.turnover = nums[0];
      cur.ggr = nums[1];
      cur.margin_pct = nums[2];
      cur.bets = nums[3];
      cur.bet_size = nums[4];
    } else if (nums.length <= 3 && cur.turnover !== undefined) {
      if (nums.length >= 2) {
        cur.uap = nums[0];
        cur.arpu = nums[1];
      }
    }
    merged.set(mesIso, cur);
  }

  const out: MonthlySummaryParsed[] = [];
  for (const [mes, v] of merged) {
    if (v.turnover == null && v.ggr == null) continue;
    out.push({
      mes,
      operadora: null,
      turnover: v.turnover ?? null,
      ggr: v.ggr ?? null,
      margin_pct: v.margin_pct ?? null,
      bets: v.bets != null ? Math.round(v.bets) : null,
      uap: v.uap != null ? Math.round(v.uap) : null,
      bet_size: v.bet_size ?? null,
      arpu: v.arpu ?? null,
    });
  }
  return out.sort((a, b) => a.mes.localeCompare(b.mes));
}

function parsePorTabelaLines(
  lines: string[],
  start: number,
  end: number,
  dataRelatorio: string,
  operadoras: OperadoraRef[],
): PorTabelaParsed[] {
  const out: PorTabelaParsed[] = [];
  /** Nome da mesa veio em linha(s) anteriores; a seguinte pode trazer só os 9 números. */
  let pendingName: string | null = null;
  /** Máx. linhas a fundir: quebra de linha do OCR costuma separar nome longo dos valores. */
  const MAX_LINE_MERGE = 6;

  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (isPerTableOcrHeaderLine(line)) {
      pendingName = null;
      continue;
    }

    let merged = line;
    let mergeEnd = i;
    let parsed: PorTabelaParsed | null = null;

    for (let k = 0; k < MAX_LINE_MERGE; k++) {
      const parts = splitLineParts(merged);
      if (parts.length >= 9) {
        const nr = numbersFromRight(parts, 9);
        if (nr) {
          let name = nr.rest.join(" ").trim();
          if (name.length < 3 && pendingName) {
            name = pendingName.trim();
          }
          if (name.length >= 3 && !/^month\b|^day\b|^main\b/i.test(name)) {
            const [ggr_d1, turnover_d1, bets_d1, ggr_d2, turnover_d2, bets_d2, ggr_mtd, turnover_mtd, bets_mtd] =
              nr.nums;
            parsed = {
              data_relatorio: dataRelatorio,
              nome_tabela: name,
              operadora: resolveOperadoraSlug(name, operadoras),
              ggr_d1,
              turnover_d1,
              bets_d1: Math.round(bets_d1),
              ggr_d2,
              turnover_d2,
              bets_d2: Math.round(bets_d2),
              ggr_mtd,
              turnover_mtd,
              bets_mtd: Math.round(bets_mtd),
            };
            break;
          }
        }
      }
      if (mergeEnd + 1 >= end) break;
      mergeEnd++;
      merged = `${merged} ${lines[mergeEnd]}`;
    }

    if (parsed) {
      out.push(parsed);
      pendingName = null;
      i = mergeEnd;
      continue;
    }

    const partsOne = splitLineParts(line);
    if (partsOne.length > 0 && partsOne.length < 9) {
      pendingName = pendingName ? `${pendingName} ${line.trim()}` : line.trim();
    } else if (partsOne.length >= 9) {
      pendingName = null;
    }
  }

  return out;
}

function inferDataRelatorio(daily: DailySummaryParsed[], fallback: string): string {
  if (daily.length === 0) return fallback;
  return daily.reduce((a, r) => (r.data > a ? r.data : a), daily[0].data);
}

export function parseRelatorioFromOcrText(text: string, operadoras: OperadoraRef[]): IngestRelatorioPayload {
  const lines = normalizeLines(text);
  const todayIso = new Date().toISOString().slice(0, 10);

  const iDaily = findDailySummariesIndex(lines);
  const iMonthly = findMonthlySummariesIndex(lines);
  const iPer = findPerTableIndex(lines);

  let daily: DailySummaryParsed[] = [];
  if (iDaily >= 0) {
    const end = iMonthly >= 0 ? iMonthly : iPer >= 0 ? iPer : lines.length;
    daily = parseDailyRows(lines, iDaily + 1, end, operadoras);
  }

  let monthly: MonthlySummaryParsed[] = [];
  if (iMonthly >= 0) {
    const end = iPer >= 0 ? iPer : lines.length;
    monthly = parseMonthlyBlock(lines.slice(iMonthly + 1, end), operadoras);
  }

  const dataRelatorio = inferDataRelatorio(daily, todayIso);

  let porTabela: PorTabelaParsed[] = [];
  if (iPer >= 0) {
    porTabela = parsePorTabelaLines(lines, iPer + 1, lines.length, dataRelatorio, operadoras);
  }

  return {
    data_relatorio: dataRelatorio,
    daily_summary: daily,
    monthly_summary: monthly,
    por_tabela: porTabela,
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

/** Redimensiona no canvas (largura máx.) para melhorar OCR em imagens enormes. */
export async function prepareImageForOcr(file: File, maxWidth = 2400): Promise<string> {
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
