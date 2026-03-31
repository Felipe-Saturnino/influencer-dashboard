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

/** Nomes completos que o OCR costuma devolver em vez de «mar», «apr», etc. */
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

/**
 * Blocos do print (ordem típica no BI):
 * 1 — Daily summaries BRL: coluna Day (DD/MM/AAAA) + Turnover, GGR, Bets, UAP (+ margem/bet size/ARPU calculados).
 * 2 — Monthly summaries BRL (1.ª e 2.ª tabela no mesmo recorte até «Per table»): linhas «Mar 2026» / «March 2026» + números.
 * 3 — Per table: uma linha por mesa «Casa de Apostas …» + 9 métricas.
 */
const MONTHS_FOR_RE =
  "january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|abr";

/** Inglês/typo; espaço entre mês e ano opcional (Mar2026). «abr» ≈ abril em prints PT. */
const MONTH_YEAR_RE = new RegExp(`\\b(${MONTHS_FOR_RE})[\\s.:]*(\\d{4})\\b`, "i");

const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function lineLooksLikeMonthlyRow(line: string): boolean {
  return MONTH_YEAR_RE.test(line);
}

function isDailySummariesTitleLine(line: string): boolean {
  const x = line.toLowerCase();
  return (
    /daily\s*summar/i.test(line) ||
    (/daily/i.test(x) && /summar/i.test(x) && /brl/i.test(line)) ||
    (/resumo.*di[ií]/i.test(line) && /brl/i.test(x))
  );
}

function isMonthlySummariesTitleLine(line: string): boolean {
  const x = line.toLowerCase();
  return (
    /monthly\s*summar/i.test(line) ||
    /month\s+summar/i.test(line) ||
    (/monthly/.test(x) && /summar/.test(x)) ||
    (/month/.test(x) && /summar/.test(x) && /brl/i.test(line))
  );
}

function isPerTableTitleLine(line: string): boolean {
  const x = line.toLowerCase();
  return (
    /\bper\s+table\b/i.test(line) ||
    /\bper\s+tabl/i.test(line) ||
    (/\bper\b/.test(x) && /\btable\b/.test(x) && !/\bper\s*tableau\b/i.test(x))
  );
}

/** Não fundir linha seguinte no mesmo dia: novo dia, cabeçalho de secção ou linha mensal. */
function shouldBreakDailyLineMerge(nextLine: string): boolean {
  if (isMonthlySummariesTitleLine(nextLine) || isPerTableTitleLine(nextLine)) return true;
  if (lineLooksLikeMonthlyRow(nextLine)) return true;
  const p = splitLineParts(nextLine);
  return p.length > 0 && brDateToIso(p[0]) != null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function brDateToIso(token: string): string | null {
  const m = token.match(BR_DATE_RE);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function monthYearToIso(mon: string, year: string): string | null {
  const key = mon.toLowerCase();
  const mi = MESES_EN_LONG[key] ?? MESES_EN[key];
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

/** Margem = GGR/Turnover (%). Usar na plataforma em vez do valor OCR quando há ruído (ex.: 1,8% → 18). */
export function marginPctFromGgrTurnover(
  turnover: number | null | undefined,
  ggr: number | null | undefined,
): number | null {
  const t = Number(turnover);
  const g = Number(ggr);
  if (!Number.isFinite(t) || t === 0) return null;
  if (!Number.isFinite(g)) return null;
  return (g / t) * 100;
}

/** Bet size = Turnover ÷ Apostas (linha). Ignorar colunas da imagem. */
export function betSizeFromTurnoverBets(
  turnover: number | null | undefined,
  bets: number | null | undefined,
): number | null {
  const t = Number(turnover);
  const b = Number(bets);
  if (!Number.isFinite(t) || !Number.isFinite(b) || b === 0) return null;
  return t / b;
}

/** ARPU = GGR ÷ UAP (linha). Pode ser negativo; ignorar coluna da imagem. */
export function arpuFromGgrUap(
  ggr: number | null | undefined,
  uap: number | null | undefined,
): number | null {
  const g = Number(ggr);
  const u = Number(uap);
  if (!Number.isFinite(g) || !Number.isFinite(u) || u === 0) return null;
  return g / u;
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

/** Primeira linha que parece dados do Daily summaries (data BR + 5 ou 7 métricas). */
function findFirstDailyDataLineIndex(lines: string[], from: number, until: number): number {
  const u = Math.min(until, lines.length);
  for (let i = Math.max(0, from); i < u; i++) {
    const line = lines[i];
    if (isMonthlySummariesTitleLine(line) || isPerTableTitleLine(line)) break;
    const p = splitLineParts(line);
    if (p.length < 2 || !brDateToIso(p[0])) continue;
    const tail = p.slice(1);
    if (numbersFromRight(tail, 7) || numbersFromRight(tail, 5)) return i;
  }
  return -1;
}

function isPerTableOcrHeaderLine(line: string): boolean {
  const low = line.toLowerCase();
  return (low.includes("ggr") && low.includes("d-1") && low.includes("turnover")) || /^table\b/i.test(line);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Corta linhas OCR onde começa o nome de uma operadora (evita fundir várias mesas num só nome). */
function buildPorTabelaLabelSplitRegex(operadoras: OperadoraRef[]): RegExp | null {
  const labels = Array.from(
    new Set<string>(["Casa de Apostas", "Casa de Aposta", ...operadoras.map((o) => o.nome).filter(Boolean)]),
  ).sort((a, b) => b.length - a.length);
  if (labels.length === 0) return null;
  const inner = labels.map((l) => escapeRegExp(l)).join("|");
  return new RegExp(`(?=(?:${inner})\\b)`, "gi");
}

function chunkStartsWithOperadoraLabel(chunk: string, operadoras: OperadoraRef[]): boolean {
  const low = chunk.trim().toLowerCase();
  if (low.startsWith("casa de apostas") || low.startsWith("casa de aposta")) return true;
  return operadoras.some((o) => o.nome && low.startsWith(o.nome.toLowerCase()));
}

/**
 * Parte o texto fundido do OCR em segmentos (um por bloco que recomeça com operadora).
 * Trechos sem rótulo no início são colados ao segmento seguinte (ex.: "Blackjack 1" antes de "Bet Nacional …").
 */
function splitPorTabelaMergedIntoChunks(merged: string, operadoras: OperadoraRef[]): string[] {
  const re = buildPorTabelaLabelSplitRegex(operadoras);
  if (!re) return [merged.trim()].filter(Boolean);
  const raw = merged.split(re).map((s) => s.trim()).filter((s) => s.length > 0);
  const out: string[] = [];
  let orphan = "";
  for (const s of raw) {
    if (chunkStartsWithOperadoraLabel(s, operadoras)) {
      out.push(orphan ? `${orphan} ${s}` : s);
      orphan = "";
    } else {
      orphan = orphan ? `${orphan} ${s}` : s;
    }
  }
  if (orphan) out.push(orphan);
  return out;
}

function sanitizePorTabelaMesaName(name: string): string {
  let s = name.replace(/\s+(?:o|O)\s+(?:o|O)(?:\s+(?:o|O))*/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Linha Summary ou lixo OCR (números colados no nome). */
function isPorTabelaNomeIgnorar(name: string): boolean {
  const t = sanitizePorTabelaMesaName(name);
  if (t.length < 2) return true;
  if (/^summary\b/i.test(t)) return true;
  if (/\bsummary\b/i.test(t)) return true;
  if (t.length > 90) return true;
  const digitChunks = t.match(/\d[\d\s.,]*/g) ?? [];
  if (digitChunks.length >= 5) return true;
  return false;
}

function makePorTabelaParsed(
  nomeTabela: string,
  nums: number[],
  dataRelatorio: string,
  operadoras: OperadoraRef[],
): PorTabelaParsed {
  const [ggr_d1, turnover_d1, bets_d1, ggr_d2, turnover_d2, bets_d2, ggr_mtd, turnover_mtd, bets_mtd] = nums;
  const name = sanitizePorTabelaMesaName(nomeTabela.trim());
  return {
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
}

/** Últimos 9 tokens são todos numéricos (uma linha de métricas no fim do segmento). */
function tryStripTrailingNineNumeric(parts: string[]): { nums: number[]; rest: string[] } | null {
  if (parts.length < 9) return null;
  const slice9 = parts.slice(-9);
  const nums: number[] = [];
  for (const p of slice9) {
    const n = parsePtBrNumber(p);
    if (n === null) return null;
    nums.push(n);
  }
  return { nums, rest: parts.slice(0, -9) };
}

/**
 * Dentro de um segmento já cortado por operadora: pode haver 2+ mesas (ex.: duas linhas coladas);
 * remove sufixos de 9 números da direita até esgotar.
 */
function parsePorTabelaSegmentToRows(
  chunk: string,
  dataRelatorio: string,
  operadoras: OperadoraRef[],
): PorTabelaParsed[] {
  const rows: PorTabelaParsed[] = [];
  let parts = splitLineParts(chunk);
  while (parts.length >= 10) {
    const stripped = tryStripTrailingNineNumeric(parts);
    if (!stripped || stripped.rest.length === 0) break;
    const name = stripped.rest.join(" ").trim();
    if (name.length < 2 || /^month\b|^day\b|^main\b/i.test(name) || isPorTabelaNomeIgnorar(name)) {
      parts = stripped.rest;
      continue;
    }
    rows.unshift(makePorTabelaParsed(name, stripped.nums, dataRelatorio, operadoras));
    parts = stripped.rest;
  }
  return rows;
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
  return lines.findIndex((l) => isDailySummariesTitleLine(l));
}

function findMonthlySummariesIndex(lines: string[]): number {
  return lines.findIndex((l) => isMonthlySummariesTitleLine(l));
}

function findPerTableIndex(lines: string[]): number {
  return lines.findIndex((l) => isPerTableTitleLine(l));
}

function parseDailyRows(lines: string[], start: number, end: number, _operadoras: OperadoraRef[]): DailySummaryParsed[] {
  void _operadoras;
  const out: DailySummaryParsed[] = [];
  let i = start;
  while (i < end) {
    const line0 = lines[i];
    if (isMonthlySummariesTitleLine(line0) || isPerTableTitleLine(line0)) break;

    let merged = line0;
    let j = i;
    let parsed: DailySummaryParsed | null = null;
    for (let k = 0; k < 7; k++) {
      const parts = splitLineParts(merged);
      if (parts.length >= 8) {
        const dIso = brDateToIso(parts[0]);
        if (dIso) {
          let nr = numbersFromRight(parts.slice(1), 7);
          if (!nr) nr = numbersFromRight(parts.slice(1), 5);
          if (nr) {
            /** 7 colunas: T, GGR, margem, Bets, UAP, bet size (OCR), ARPU (OCR). 5 colunas: T, GGR, margem, Bets, UAP — fim do print colado ao OCR. */
            let turnover: number;
            let ggr: number;
            let betsRaw: number;
            let uapRaw: number;
            if (nr.nums.length === 7) {
              const [t0, g0, , br, ur, , ocrArpuIgn] = nr.nums;
              void ocrArpuIgn;
              turnover = t0;
              ggr = g0;
              betsRaw = br;
              uapRaw = ur;
            } else {
              const [t0, g0, , br, ur] = nr.nums;
              turnover = t0;
              ggr = g0;
              betsRaw = br;
              uapRaw = ur;
            }
            const bets = Math.round(betsRaw);
            const uap = Math.round(uapRaw);
            const margin_pct = marginPctFromGgrTurnover(turnover, ggr);
            const bet_size = betSizeFromTurnoverBets(turnover, bets);
            const arpu = arpuFromGgrUap(ggr, uap);
            parsed = {
              data: dIso,
              operadora: null,
              turnover,
              ggr,
              margin_pct,
              bets,
              uap,
              bet_size,
              arpu,
            };
            break;
          }
        }
      }
      if (j + 1 >= end) break;
      const next = lines[j + 1];
      if (shouldBreakDailyLineMerge(next)) break;
      j++;
      merged = `${merged} ${next}`;
    }
    if (parsed) {
      out.push(parsed);
      i = j + 1;
    } else {
      i++;
    }
  }
  return out;
}

/**
 * Monthly summaries no BI costuma vir em duas tabelas: (Turnover, GGR, Margin, Bets, Bet size) e (UAP, ARPU).
 * Linhas com 5 números + linhas com 2 números para o mesmo mês são fundidas (ordem no OCR irrelevante).
 */
function parseMonthlyBlock(textBlock: string[], _operadoras: OperadoraRef[]): MonthlySummaryParsed[] {
  void _operadoras;
  const merged = new Map<
    string,
    { turnover?: number; ggr?: number; margin_pct?: number; bets?: number; bet_size?: number; uap?: number; arpu?: number }
  >();

  for (const line of textBlock) {
    if (isPerTableTitleLine(line)) break;

    const m = line.match(MONTH_YEAR_RE);
    if (!m || m.index === undefined) continue;
    const mesIso = monthYearToIso(m[1], m[2]);
    if (!mesIso) continue;
    const tail = line.slice(m.index + m[0].length);
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
      cur.uap = Math.round(nums[5]);
      cur.arpu = nums[6];
    } else if (nums.length >= 5) {
      cur.turnover = nums[0];
      cur.ggr = nums[1];
      cur.margin_pct = nums[2];
      cur.bets = nums[3];
      cur.bet_size = nums[4];
    } else if (nums.length === 2) {
      cur.uap = Math.round(nums[0]);
      cur.arpu = nums[1];
    }

    merged.set(mesIso, cur);
  }

  const out: MonthlySummaryParsed[] = [];
  for (const [mes, v] of merged) {
    if (
      v.turnover == null &&
      v.ggr == null &&
      v.bets == null &&
      v.uap == null &&
      v.arpu == null
    ) {
      continue;
    }
    const marginCalc = marginPctFromGgrTurnover(v.turnover ?? null, v.ggr ?? null);
    out.push({
      mes,
      operadora: null,
      turnover: v.turnover ?? null,
      ggr: v.ggr ?? null,
      margin_pct: marginCalc ?? v.margin_pct ?? null,
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
  const MAX_LINE_MERGE = 10;

  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (isPerTableOcrHeaderLine(line)) {
      pendingName = null;
      continue;
    }

    let merged = line;
    let mergeEnd = i;
    let gotBatch = false;

    for (let k = 0; k < MAX_LINE_MERGE; k++) {
      const toParse = pendingName ? `${pendingName} ${merged}`.trim() : merged;
      let batch: PorTabelaParsed[] = [];
      const chunks = splitPorTabelaMergedIntoChunks(toParse, operadoras);
      for (const ch of chunks) {
        batch.push(...parsePorTabelaSegmentToRows(ch, dataRelatorio, operadoras));
      }
      if (batch.length === 0) {
        const parts = splitLineParts(toParse);
        if (parts.length >= 9) {
          const nr = numbersFromRight(parts, 9);
          if (nr) {
            let name = sanitizePorTabelaMesaName(nr.rest.join(" ").trim());
            if (name.length < 3 && pendingName) name = sanitizePorTabelaMesaName(pendingName.trim());
            if (name.length >= 3 && !/^month\b|^day\b|^main\b/i.test(name) && !isPorTabelaNomeIgnorar(name)) {
              batch = [makePorTabelaParsed(name, nr.nums, dataRelatorio, operadoras)];
            }
          }
        }
      }
      if (batch.length > 0) {
        out.push(...batch);
        pendingName = null;
        i = mergeEnd;
        gotBatch = true;
        break;
      }
      if (mergeEnd + 1 >= end) break;
      mergeEnd++;
      merged = `${merged} ${lines[mergeEnd]}`;
    }

    if (gotBatch) continue;

    const partsOne = splitLineParts(line);
    if (partsOne.length > 0 && partsOne.length < 9) {
      pendingName = pendingName ? `${pendingName} ${line.trim()}` : line.trim();
    } else if (partsOne.length >= 9) {
      pendingName = null;
    }
  }

  return out;
}

function inferDataRelatorio(daily: DailySummaryParsed[], ocrText: string, fallback: string): string {
  let best: string | null =
    daily.length === 0 ? null : daily.reduce((a, r) => (r.data > a ? r.data : a), daily[0].data);
  const re = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
  let rm: RegExpExecArray | null;
  while ((rm = re.exec(ocrText)) !== null) {
    const iso = `${rm[3]}-${rm[2]}-${rm[1]}`;
    if (!best || iso > best) best = iso;
  }
  return best ?? fallback;
}

export function parseRelatorioFromOcrText(text: string, operadoras: OperadoraRef[]): IngestRelatorioPayload {
  const lines = normalizeLines(text);
  const todayIso = new Date().toISOString().slice(0, 10);

  const iDaily = findDailySummariesIndex(lines);
  const iMonthlyHeader = findMonthlySummariesIndex(lines);
  const iPer = findPerTableIndex(lines);
  const regionEnd = iPer >= 0 ? iPer : lines.length;

  let dailyEndExclusive = regionEnd;
  if (iMonthlyHeader >= 0 && iMonthlyHeader < regionEnd) {
    dailyEndExclusive = iMonthlyHeader;
  }

  let monthlyStartInclusive = -1;
  if (iMonthlyHeader >= 0 && iMonthlyHeader < regionEnd) {
    monthlyStartInclusive = iMonthlyHeader + 1;
  } else {
    /** Cabeçalho «Monthly» ilegível no OCR: primeira linha «Mar 2026» / «March 2026» fecha o daily. */
    const scanFrom = iDaily >= 0 ? iDaily + 1 : 0;
    for (let idx = scanFrom; idx < regionEnd; idx++) {
      if (lineLooksLikeMonthlyRow(lines[idx])) {
        dailyEndExclusive = idx;
        monthlyStartInclusive = idx;
        break;
      }
    }
  }

  let daily: DailySummaryParsed[] = [];
  let dailyStart = iDaily >= 0 ? iDaily + 1 : 0;
  const monthlyCap = monthlyStartInclusive >= 0 ? monthlyStartInclusive : regionEnd;
  if (iDaily < 0) {
    const hit = findFirstDailyDataLineIndex(lines, 0, Math.min(monthlyCap, regionEnd));
    if (hit >= 0) dailyStart = hit;
  }
  if (dailyStart < dailyEndExclusive) {
    daily = parseDailyRows(lines, dailyStart, dailyEndExclusive, operadoras);
  }

  let monthly: MonthlySummaryParsed[] = [];
  if (monthlyStartInclusive >= 0 && monthlyStartInclusive < regionEnd) {
    monthly = parseMonthlyBlock(lines.slice(monthlyStartInclusive, regionEnd), operadoras);
  }

  const dataRelatorio = inferDataRelatorio(daily, text, todayIso);

  let porTabela: PorTabelaParsed[] = [];
  if (iPer >= 0) {
    porTabela = parsePorTabelaLines(lines, iPer + 1, lines.length, dataRelatorio, operadoras).filter(
      (p) => !isPorTabelaNomeIgnorar(p.nome_tabela),
    );
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
