/**
 * Edge Function: sync-comercial-spa-lista
 * Importa lista oficial SPA/MF (tabela HTML, CSV `;` ou XLSX) → comercial_empresas + comercial_marcas.
 * Não altera status_pipeline, status_folha, comercial_user_id, agregadora, ultimo_contato, status_dominio.
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: COMERCIAL_SPA_CSV_URL — URL direta do CSV/XLSX (senão descobre tabela HTML ou planilha na página gov.br)
 * Opcional: COMERCIAL_SPA_LISTA_PAGE_URL — página de listagem (default gov.br)
 *
 * POST JSON: { dry_run?: boolean, force?: boolean, csv_url?: string }
 *
 * Deploy no painel Supabase: um único ficheiro index.ts (sem imports locais).
 * Parser espelhado em src/lib/comercialSpaCsvParser.ts + src/lib/comercialSpaXlsx.ts + src/lib/comercialSpaListaFonte.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { unzipSync } from "https://esm.sh/fflate@0.8.2";

// --- Parser CSV SPA/MF (inline — não extrair para outro ficheiro no deploy) ---

interface ParsedMarca {
  nome: string;
  dominio: string | null;
}

interface ParsedEmpresaBloco {
  cnpj: string;
  razao_social: string;
  portaria: string | null;
  portaria_retificacoes: string[];
  requerimento_numero: string | null;
  requerimento_ano: string | null;
  marcas: ParsedMarca[];
}

function parseCsvSemicolon(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += c;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

function normalizeCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function csvCol(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

function normalizeNomeMarca(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function normalizeDominio(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (!v || v === "a definir" || v === "a definir." || v === "-") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

function splitRequerimento(raw: string): { numero: string | null; ano: string | null } {
  const v = raw.trim();
  if (!v) return { numero: null, ano: null };
  const parts = v.split("/").map((p) => p.trim());
  if (parts.length >= 2) {
    return { numero: parts[0] || null, ano: parts[1] || null };
  }
  return { numero: v, ano: null };
}

function isPortariaPrincipal(col1: string): boolean {
  return /^SPA\/MF/i.test(col1.trim());
}

function isLinhaRetificacao(col1: string): boolean {
  const t = col1.trim();
  if (!t) return false;
  if (isPortariaPrincipal(t)) return false;
  return (
    /^\(/.test(t) ||
    /retificad/i.test(t) ||
    /alterad/i.test(t) ||
    /portaria spa/i.test(t)
  );
}

function extractMarca(row: string[]): ParsedMarca | null {
  const nomeRaw = csvCol(row, 4);
  const dominioRaw = csvCol(row, 5);
  const nome = normalizeNomeMarca(nomeRaw);
  const dominio = normalizeDominio(dominioRaw);
  if (!nome && !dominio) return null;
  if (!nome) return null;
  return { nome, dominio };
}

function findHeaderIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(";").toUpperCase();
    if (joined.includes("CNPJ") && joined.includes("MARCAS")) return i;
  }
  return 1;
}

function parseSpaAutorizacoesCsv(text: string): ParsedEmpresaBloco[] {
  const rows = parseCsvSemicolon(text.replace(/^\uFEFF/, ""));
  return parseSpaAutorizacoesMatrix(rows);
}

function parseSpaAutorizacoesMatrix(rows: string[][]): ParsedEmpresaBloco[] {
  const headerIdx = findHeaderIndex(rows);
  const dataRows = rows.slice(headerIdx + 1);

  const blocos: ParsedEmpresaBloco[] = [];
  let current: ParsedEmpresaBloco | null = null;

  for (const row of dataRows) {
    const cnpjRaw = csvCol(row, 3);
    const cnpj = cnpjRaw ? normalizeCnpj(cnpjRaw) : null;

    if (cnpj) {
      if (current) blocos.push(current);
      const req = splitRequerimento(csvCol(row, 6));
      const portariaCol = csvCol(row, 1);
      current = {
        cnpj,
        razao_social: csvCol(row, 2),
        portaria: portariaCol || null,
        portaria_retificacoes: [],
        requerimento_numero: req.numero,
        requerimento_ano: req.ano,
        marcas: [],
      };
      const marca = extractMarca(row);
      if (marca) current.marcas.push(marca);
      continue;
    }

    if (!current) continue;

    const col1 = csvCol(row, 1);
    if (isLinhaRetificacao(col1)) {
      current.portaria_retificacoes.push(col1);
    }

    const marca = extractMarca(row);
    if (marca) current.marcas.push(marca);
  }

  if (current) blocos.push(current);

  return blocos.filter((b) => b.cnpj && b.razao_social);
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    if (ch < "A" || ch > "Z") break;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
      decodeXmlEntities(t[1]),
    );
    out.push(parts.join(""));
  }
  return out;
}

function parseSheetToMatrix(sheetXml: string, shared: string[]): string[][] {
  const rowMap = new Map<number, Map<number, string>>();
  let maxCol = 0;

  for (const rm of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(rm[1]);
    const cells = new Map<number, string>();
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] ?? "";
      const inner = cm[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)(\d+)"/);
      if (!ref) continue;
      const col = colLettersToIndex(ref[1]);
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      let raw = vMatch?.[1] ?? "";
      if (/\bt="inlineStr"/.test(attrs)) {
        const texts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
          decodeXmlEntities(t[1]),
        );
        raw = texts.join("");
      } else if (/\bt="s"/.test(attrs)) {
        raw = shared[Number(raw)] ?? "";
      } else {
        raw = decodeXmlEntities(raw);
      }
      cells.set(col, raw);
      if (col > maxCol) maxCol = col;
    }
    rowMap.set(rowNum, cells);
  }

  const maxRow = Math.max(0, ...rowMap.keys());
  const matrix: string[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    const cells = rowMap.get(r);
    const row: string[] = [];
    for (let c = 0; c <= Math.max(maxCol, 6); c++) {
      row.push(cells?.get(c) ?? "");
    }
    matrix.push(row);
  }
  return matrix;
}

function matrixToSemicolonCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? "");
          if (/[;"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(";"),
    )
    .join("\n");
}

function xlsxBytesToMatrix(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes) as Record<string, Uint8Array>;
  const decoder = new TextDecoder("utf-8");
  const sharedXml = files["xl/sharedStrings.xml"]
    ? decoder.decode(files["xl/sharedStrings.xml"])
    : "";
  const sheetXml = files["xl/worksheets/sheet1.xml"]
    ? decoder.decode(files["xl/worksheets/sheet1.xml"])
    : "";
  if (!sheetXml) throw new Error("XLSX sem worksheet sheet1.xml");
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];
  return parseSheetToMatrix(sheetXml, shared);
}

/**
 * Descobre URL da planilha nacional de autorizações no HTML (legado).
 * Ignora processos judiciais e links sob Transparência Ativa (ficheiros de processos;
 * `planilha-de-autorizacoes-1.xlsx` nessa pasta costuma 404 — a lista viva é a tabela HTML).
 */
function extractAutorizacoesPlanilhaUrl(html: string): string | null {
  const urls: string[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/gi)) {
    urls.push(m[1].replace(/&amp;/g, "&").trim());
  }
  const isJudicial = (u: string) =>
    /processos?\s*judiciais|determinacao-judicial|determina[cç][aã]o-judicial|judicial/i.test(u);
  const gov = urls.filter(
    (u) => /gov\.br\/fazenda/i.test(u) && !isJudicial(u) && !/transparencia-ativa/i.test(u),
  );
  const xlsx = gov.find((u) => /planilha-de-autorizacoes[^"/?]*\.xlsx(?:$|\?)/i.test(u));
  if (xlsx) return xlsx.split("#")[0] ?? xlsx;
  const csv = gov.find((u) => /planilha-de-autorizacoes[^"/?]*\.csv(?:$|\?)/i.test(u));
  if (csv) return csv.split("#")[0] ?? csv;
  return null;
}

function toSharePointDownloadUrl(url: string): string {
  if (!/sharepoint\.com/i.test(url)) return url;
  const sourcedoc = url.match(/[?&]sourcedoc=([^&]+)/i);
  if (sourcedoc?.[1]) {
    const guid = decodeURIComponent(sourcedoc[1]).replace(/[{}]/g, "");
    const origin = url.match(/^(https:\/\/[^/]+)/i)?.[1];
    const personal = url.match(/\/personal\/[^/?#]+/i)?.[0];
    if (origin && personal && guid) {
      return `${origin}${personal}/_layouts/15/download.aspx?UniqueId=${guid}`;
    }
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("download", "1");
    parsed.searchParams.delete("action");
    parsed.searchParams.delete("mobileredirect");
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractSharePointPlanilhaUrl(html: string): string | null {
  const urls: string[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/gi)) {
    urls.push(m[1].replace(/&amp;/g, "&").trim());
  }
  const sp = urls.filter((u) => /sharepoint\.com/i.test(u) && !/judicial/i.test(u));
  const withFile = sp.find((u) => /[?&]file=[^&]*\.xlsx/i.test(u) || /\.xlsx(?:$|\?)/i.test(u));
  if (withFile) return toSharePointDownloadUrl(withFile);
  const first = sp.find((u) => /:x:\//i.test(u));
  return first ? toSharePointDownloadUrl(first) : null;
}

const LISTA_EMPRESAS_PREFIX =
  "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/";

/** Página canónica com a tabela HTML oficial (índice `lista-de-empresas` mudou de conteúdo). */
const DEFAULT_LISTA_PAGE = `${LISTA_EMPRESAS_PREFIX}empresas-autorizadas`;

const FALLBACK_PAGINAS_LISTA = [
  DEFAULT_LISTA_PAGE,
  `${LISTA_EMPRESAS_PREFIX}confira-a-lista-de-empresas-autorizadas-a-ofertar-apostas-de-quota-fixa-em-2025`,
];

function extractPaginasListaAutorizacoes(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const current = pageUrl.replace(/\/+$/, "");
  for (const m of html.matchAll(/href="([^"]+)"/gi)) {
    let href = m[1].replace(/&amp;/g, "&").trim();
    if (href.startsWith("/")) href = `https://www.gov.br${href}`;
    else if (!/^https?:\/\//i.test(href)) {
      try {
        href = new URL(href, pageUrl).toString();
      } catch {
        continue;
      }
    }
    const cleaned = (href.split("#")[0] ?? href).replace(/\/+$/, "");
    if (!cleaned.toLowerCase().startsWith(LISTA_EMPRESAS_PREFIX.toLowerCase())) continue;
    if (/\.(pdf|png|jpe?g|gif|svg|webp)(?:$|\?)/i.test(cleaned)) continue;
    if (/@@images|arquivos_tarjados|judicial|transparencia-ativa/i.test(cleaned)) continue;
    const rest = cleaned.slice(LISTA_EMPRESAS_PREFIX.length);
    if (!rest || rest.includes("/")) continue;
    if (cleaned === current || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function findAutorizacoesTableHtml(html: string): string | null {
  const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  return (
    tables.find(
      (t) => /CNPJ/i.test(t) && /Marcas/i.test(t) && /Dom[ií]nio/i.test(t) && /Portaria/i.test(t),
    ) ?? null
  );
}

function looksLikeSpaAutorizacoesHtmlTable(html: string): boolean {
  return findAutorizacoesTableHtml(html) != null;
}

function splitListaItens(text: string): string[] {
  return text
    .split(/\n|•|·/)
    .map((s) => s.replace(/^[-–]\s*/, "").trim())
    .filter(Boolean);
}

function splitRequerimentoHtml(raw: string): { numero: string | null; ano: string | null } {
  const compact = raw.replace(/\s+/g, "");
  const sigap = compact.match(/^(\d+)(20\d{2})$/);
  if (sigap) return { numero: sigap[1] ?? null, ano: sigap[2] ?? null };
  return splitRequerimento(raw);
}

function zipMarcasDominiosHtml(nomes: string[], dominios: string[]): ParsedMarca[] {
  const len = Math.max(nomes.length, dominios.length);
  const marcas: ParsedMarca[] = [];
  for (let i = 0; i < len; i++) {
    const nome = (nomes[i] ?? "").replace(/\s+/g, " ").trim();
    const dominio = normalizeDominio(dominios[i] ?? "");
    if (!nome) continue;
    marcas.push({ nome, dominio });
  }
  return marcas;
}

function parseSpaAutorizacoesHtmlTable(html: string): ParsedEmpresaBloco[] {
  const table = findAutorizacoesTableHtml(html);
  if (!table) return [];
  const blocos: ParsedEmpresaBloco[] = [];
  for (const rm of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...(rm[1] ?? "").matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(
      (c) => c[2] ?? "",
    );
    if (cells.length < 6) continue;
    let offset = 0;
    if (/^\d+$/.test(htmlToPlainText(cells[0] ?? ""))) offset = 1;
    const razao = htmlToPlainText(cells[offset] ?? "").replace(/\s+/g, " ").trim();
    const cnpj = normalizeCnpj(htmlToPlainText(cells[offset + 1] ?? ""));
    if (!cnpj || !razao || /^empresa$/i.test(razao)) continue;
    const portariaLines = htmlToPlainText(cells[offset + 4] ?? "")
      .split(/\n/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const principal = portariaLines.find((l) => /^SPA\/MF/i.test(l)) ?? portariaLines[0] ?? null;
    const req = splitRequerimentoHtml(htmlToPlainText(cells[offset + 5] ?? ""));
    blocos.push({
      cnpj,
      razao_social: razao,
      portaria: principal,
      portaria_retificacoes: portariaLines.filter((l) => l !== principal),
      requerimento_numero: req.numero,
      requerimento_ano: req.ano,
      marcas: zipMarcasDominiosHtml(
        splitListaItens(htmlToPlainText(cells[offset + 2] ?? "")),
        splitListaItens(htmlToPlainText(cells[offset + 3] ?? "")),
      ),
    });
  }
  return blocos.filter((b) => b.cnpj && b.razao_social);
}

function blocosToCanonicalText(blocos: ParsedEmpresaBloco[]): string {
  return JSON.stringify(blocos);
}

// --- Sync ---

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 45_000;
const INTEGRACAO_SLUG = "comercial_spa_lista";

interface SyncBody {
  dry_run?: boolean;
  force?: boolean;
  csv_url?: string;
}

interface MarcaExistente {
  id: string;
  nome: string;
  dominio: string | null;
  status_dominio: string;
  status_pipeline: string;
  status_folha: string;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function normalizeNomeKey(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().toLowerCase();
}

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; erro: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/csv,*/*",
        "User-Agent": BROWSER_UA,
        Referer: DEFAULT_LISTA_PAGE,
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, erro: `HTTP ${res.status} ao buscar ${url}` };
    }
    const text = await res.text();
    if (!text.trim()) return { ok: false, erro: "Resposta vazia" };
    return { ok: true, text };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, erro: msg };
  }
}

async function fetchBytes(
  url: string,
): Promise<{ ok: true; bytes: Uint8Array; contentType: string } | { ok: false; erro: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,*/*",
        "User-Agent": BROWSER_UA,
        Referer: DEFAULT_LISTA_PAGE,
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, erro: `HTTP ${res.status} ao buscar ${url}` };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return { ok: false, erro: "Resposta vazia" };
    return {
      ok: true,
      bytes: buf,
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, erro: msg };
  }
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

type FonteResolvida =
  | { ok: true; kind: "arquivo"; url: string; listaAtualizadaEm: string | null }
  | { ok: true; kind: "html"; url: string; html: string; listaAtualizadaEm: string | null }
  | { ok: false; erro: string };

function pickFonteFromHtml(
  html: string,
  pageUrl: string,
): Extract<FonteResolvida, { ok: true }> | null {
  const listaAtualizadaEm = extractListaAtualizadaEm(html);
  // Tabela HTML oficial primeiro — a página ainda liga um .xlsx 404 sob Transparência Ativa.
  if (looksLikeSpaAutorizacoesHtmlTable(html)) {
    return { ok: true, kind: "html", url: pageUrl, html, listaAtualizadaEm };
  }
  const planilha = extractAutorizacoesPlanilhaUrl(html);
  if (planilha) {
    return { ok: true, kind: "arquivo", url: planilha, listaAtualizadaEm };
  }
  const sharepoint = extractSharePointPlanilhaUrl(html);
  if (sharepoint) {
    return { ok: true, kind: "arquivo", url: sharepoint, listaAtualizadaEm };
  }
  return null;
}

async function resolveFonte(bodyUrl?: string): Promise<FonteResolvida> {
  const envUrl = Deno.env.get("COMERCIAL_SPA_CSV_URL")?.trim();
  const direct = bodyUrl?.trim() || envUrl;
  if (direct) {
    return {
      ok: true,
      kind: "arquivo",
      url: toSharePointDownloadUrl(direct),
      listaAtualizadaEm: null,
    };
  }

  const pageUrl = Deno.env.get("COMERCIAL_SPA_LISTA_PAGE_URL")?.trim() || DEFAULT_LISTA_PAGE;
  const page = await fetchText(pageUrl);
  if (!page.ok) return { ok: false, erro: `Não foi possível abrir a página oficial: ${page.erro}` };

  const fromIndex = pickFonteFromHtml(page.text, pageUrl);
  if (fromIndex) return fromIndex;

  const nested = [
    ...extractPaginasListaAutorizacoes(page.text, pageUrl),
    ...FALLBACK_PAGINAS_LISTA,
  ];
  const seen = new Set<string>([pageUrl.replace(/\/+$/, "")]);
  let sharepointFallback: Extract<FonteResolvida, { ok: true; kind: "arquivo" }> | null = null;

  for (const url of nested) {
    const key = url.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const child = await fetchText(url);
    if (!child.ok) continue;
    const picked = pickFonteFromHtml(child.text, url);
    if (!picked) continue;
    if (picked.kind === "html") return picked;
    if (picked.kind === "arquivo" && /gov\.br\/fazenda/i.test(picked.url)) return picked;
    if (picked.kind === "arquivo" && /sharepoint\.com/i.test(picked.url) && !sharepointFallback) {
      sharepointFallback = picked;
    }
  }

  if (sharepointFallback) return sharepointFallback;

  return {
    ok: false,
    erro:
      "Planilha de autorizações não encontrada na página (CSV/XLSX/HTML). Defina COMERCIAL_SPA_CSV_URL nos Secrets.",
  };
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLog(
  supabase: SupabaseAdmin,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    registros_atualizados: number;
    erros_count: number;
    mensagem_erro: string | null;
    duracao_ms: number;
  },
): Promise<void> {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("sync_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: opts.registros_atualizados,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[sync-comercial-spa-lista] Falha ao gravar sync_logs:", e);
  }
}

async function gravarTechLog(supabase: SupabaseAdmin, descricao: string): Promise<void> {
  try {
    await supabase.from("tech_logs").insert({
      integracao_slug: INTEGRACAO_SLUG,
      tipo: "comercial_spa_lista",
      descricao: descricao.slice(0, 2000),
    });
  } catch (e) {
    console.error("[sync-comercial-spa-lista] Falha ao gravar tech_logs:", e);
  }
}

async function getUltimoHash(supabase: SupabaseAdmin): Promise<string | null> {
  const { data } = await supabase
    .from("comercial_spa_sync_meta")
    .select("content_hash")
    .eq("id", 1)
    .maybeSingle();
  return data?.content_hash ?? null;
}

async function salvarMeta(
  supabase: SupabaseAdmin,
  meta: { content_hash: string; csv_url: string; lista_atualizada_em: string | null; blocos: number; marcas: number },
): Promise<void> {
  await supabase.from("comercial_spa_sync_meta").upsert({
    id: 1,
    content_hash: meta.content_hash,
    csv_url: meta.csv_url,
    lista_atualizada_em: meta.lista_atualizada_em,
    blocos_parseados: meta.blocos,
    marcas_parseadas: meta.marcas,
    synced_at: new Date().toISOString(),
  });
}

function retificacoesIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

async function insertHistoricoSync(
  supabase: SupabaseAdmin,
  marcaId: string,
  campo: string,
  valorAnterior: string | null,
  valorNovo: string | null,
): Promise<void> {
  if (valorAnterior === valorNovo) return;
  await supabase.from("comercial_marca_historico").insert({
    marca_id: marcaId,
    usuario_id: null,
    campo,
    valor_anterior: valorAnterior,
    valor_novo: valorNovo,
  });
}

async function upsertBlocos(
  supabase: SupabaseAdmin,
  blocos: ParsedEmpresaBloco[],
): Promise<{ empresas_inseridas: number; empresas_atualizadas: number; marcas_inseridas: number; marcas_atualizadas: number; erros: string[] }> {
  let empresas_inseridas = 0;
  let empresas_atualizadas = 0;
  let marcas_inseridas = 0;
  let marcas_atualizadas = 0;
  const erros: string[] = [];

  for (const bloco of blocos) {
    const { data: existente, error: selErr } = await supabase
      .from("comercial_empresas")
      .select("id, razao_social, portaria, portaria_retificacoes, requerimento_numero, requerimento_ano")
      .eq("cnpj", bloco.cnpj)
      .maybeSingle();

    if (selErr) {
      erros.push(`CNPJ ${bloco.cnpj}: ${selErr.message}`);
      continue;
    }

    const retificacoesJson = bloco.portaria_retificacoes;
    let empresaId: string;

    if (!existente) {
      const { data: inserted, error: insErr } = await supabase
        .from("comercial_empresas")
        .insert({
          razao_social: bloco.razao_social,
          cnpj: bloco.cnpj,
          portaria: bloco.portaria,
          portaria_retificacoes: retificacoesJson,
          requerimento_numero: bloco.requerimento_numero,
          requerimento_ano: bloco.requerimento_ano,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        erros.push(`Insert empresa ${bloco.cnpj}: ${insErr?.message ?? "sem id"}`);
        continue;
      }
      empresaId = inserted.id;
      empresas_inseridas++;
    } else {
      empresaId = existente.id;
      const patch: Record<string, unknown> = {};
      if (existente.razao_social !== bloco.razao_social) patch.razao_social = bloco.razao_social;
      if ((existente.portaria ?? null) !== (bloco.portaria ?? null)) patch.portaria = bloco.portaria;
      const prevRet = (existente.portaria_retificacoes ?? []) as string[];
      if (!retificacoesIguais(prevRet, retificacoesJson)) {
        patch.portaria_retificacoes = retificacoesJson;
      }
      if ((existente.requerimento_numero ?? null) !== (bloco.requerimento_numero ?? null)) {
        patch.requerimento_numero = bloco.requerimento_numero;
      }
      if ((existente.requerimento_ano ?? null) !== (bloco.requerimento_ano ?? null)) {
        patch.requerimento_ano = bloco.requerimento_ano;
      }
      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase.from("comercial_empresas").update(patch).eq("id", empresaId);
        if (updErr) {
          erros.push(`Update empresa ${bloco.cnpj}: ${updErr.message}`);
        } else {
          empresas_atualizadas++;
        }
      }
    }

    const { data: marcasDb, error: marErr } = await supabase
      .from("comercial_marcas")
      .select("id, nome, dominio, status_dominio, status_pipeline, status_folha")
      .eq("empresa_id", empresaId);

    if (marErr) {
      erros.push(`Marcas ${bloco.cnpj}: ${marErr.message}`);
      continue;
    }

    const byNome = new Map<string, MarcaExistente>();
    for (const m of (marcasDb ?? []) as MarcaExistente[]) {
      byNome.set(normalizeNomeKey(m.nome), m);
    }

    for (const marca of bloco.marcas) {
      const key = normalizeNomeKey(marca.nome);
      const prev = byNome.get(key);
      if (!prev) {
        const { error: insMarcaErr } = await supabase.from("comercial_marcas").insert({
          empresa_id: empresaId,
          nome: marca.nome,
          dominio: marca.dominio,
          status_dominio: "inativo",
          status_pipeline: "disponiveis",
          status_folha: "sem_contato",
        });
        if (insMarcaErr) {
          erros.push(`Insert marca ${marca.nome} (${bloco.cnpj}): ${insMarcaErr.message}`);
        } else {
          marcas_inseridas++;
        }
        continue;
      }

      const patchMarca: Record<string, unknown> = {};
      if (prev.nome !== marca.nome) patchMarca.nome = marca.nome;
      if ((prev.dominio ?? null) !== (marca.dominio ?? null)) {
        patchMarca.dominio = marca.dominio;
        patchMarca.status_dominio = "inativo";
      }

      if (Object.keys(patchMarca).length === 0) continue;

      const { error: updMarcaErr } = await supabase
        .from("comercial_marcas")
        .update(patchMarca)
        .eq("id", prev.id);

      if (updMarcaErr) {
        erros.push(`Update marca ${marca.nome}: ${updMarcaErr.message}`);
        continue;
      }

      marcas_atualizadas++;
      if (patchMarca.dominio !== undefined) {
        await insertHistoricoSync(
          supabase,
          prev.id,
          "dominio",
          prev.dominio,
          marca.dominio,
        );
        if (patchMarca.status_dominio === "inativo" && prev.status_dominio !== "inativo") {
          await insertHistoricoSync(
            supabase,
            prev.id,
            "status_dominio",
            prev.status_dominio === "ok" ? "Ativo" : "Inativo",
            "Inativo",
          );
        }
      }
      if (patchMarca.nome !== undefined) {
        await insertHistoricoSync(supabase, prev.id, "nome", prev.nome, marca.nome);
      }
    }
  }

  return { empresas_inseridas, empresas_atualizadas, marcas_inseridas, marcas_atualizadas, erros };
}

function extractListaAtualizadaEm(htmlOrCsvHint: string): string | null {
  const m = htmlOrCsvHint.match(/Atualizad[oa] em(?:<\/span>\s*<span[^>]*>|\s+)(\d{2}\/\d{2}\/\d{4})/i);
  return m?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta." }, req, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: SyncBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as SyncBody;
  } catch {
    body = {};
  }

  const dry_run = body.dry_run === true;
  const force = body.force === true;
  const inicioMs = Date.now();

  const resolved = await resolveFonte(body.csv_url);
  if (!resolved.ok) {
    if (!dry_run) {
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: resolved.erro,
        duracao_ms: Date.now() - inicioMs,
      });
      await gravarTechLog(supabase, resolved.erro);
    }
    return json({ ok: false, erro: resolved.erro }, req, 200);
  }

  let canonicalText: string;
  let blocos: ParsedEmpresaBloco[];
  let isXlsx = false;
  let formato: "xlsx" | "csv" | "html" = "csv";
  const fonteUrl = resolved.url;

  if (resolved.kind === "html") {
    try {
      blocos = parseSpaAutorizacoesHtmlTable(resolved.html);
      canonicalText = blocosToCanonicalText(blocos);
      formato = "html";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!dry_run) {
        await gravarSyncLog(supabase, {
          status: "falha",
          registros_inseridos: 0,
          registros_atualizados: 0,
          erros_count: 1,
          mensagem_erro: `Erro ao interpretar planilha: ${msg}`,
          duracao_ms: Date.now() - inicioMs,
        });
      }
      return json({ ok: false, erro: `Erro ao interpretar planilha: ${msg}` }, req, 200);
    }
  } else {
    const arquivo = await fetchBytes(resolved.url);
    if (!arquivo.ok) {
      const msg = `Não foi possível baixar a planilha oficial: ${arquivo.erro}`;
      if (!dry_run) {
        await gravarSyncLog(supabase, {
          status: "falha",
          registros_inseridos: 0,
          registros_atualizados: 0,
          erros_count: 1,
          mensagem_erro: msg,
          duracao_ms: Date.now() - inicioMs,
        });
        await gravarTechLog(supabase, msg);
      }
      return json({ ok: false, erro: msg, csv_url: fonteUrl }, req, 200);
    }

    const urlLower = resolved.url.toLowerCase();
    isXlsx =
      urlLower.endsWith(".xlsx") ||
      urlLower.includes("download.aspx") ||
      arquivo.contentType.includes("spreadsheetml") ||
      arquivo.contentType.includes("excel") ||
      looksLikeZip(arquivo.bytes);
    formato = isXlsx ? "xlsx" : "csv";

    try {
      if (isXlsx) {
        const matrix = xlsxBytesToMatrix(arquivo.bytes);
        canonicalText = matrixToSemicolonCsv(matrix);
        blocos = parseSpaAutorizacoesMatrix(matrix);
      } else {
        canonicalText = new TextDecoder("utf-8").decode(arquivo.bytes);
        blocos = parseSpaAutorizacoesCsv(canonicalText);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!dry_run) {
        await gravarSyncLog(supabase, {
          status: "falha",
          registros_inseridos: 0,
          registros_atualizados: 0,
          erros_count: 1,
          mensagem_erro: `Erro ao interpretar planilha: ${msg}`,
          duracao_ms: Date.now() - inicioMs,
        });
      }
      return json({ ok: false, erro: `Erro ao interpretar planilha: ${msg}` }, req, 200);
    }
  }

  const contentHash = await sha256Hex(canonicalText);
  const ultimoHash = dry_run ? null : await getUltimoHash(supabase);

  if (!force && !dry_run && ultimoHash && ultimoHash === contentHash) {
    await gravarSyncLog(supabase, {
      status: "ok",
      registros_inseridos: 0,
      registros_atualizados: 0,
      erros_count: 0,
      mensagem_erro: null,
      duracao_ms: Date.now() - inicioMs,
    });
    return json({
      ok: true,
      skipped: true,
      motivo: "Planilha sem alteração (hash igual ao último sync).",
      content_hash: contentHash,
      csv_url: fonteUrl,
      formato,
    }, req);
  }

  if (blocos.length === 0) {
    const msg = "Planilha interpretada sem empresas (verifique o formato oficial).";
    if (!dry_run) {
      await gravarSyncLog(supabase, {
        status: "falha",
        registros_inseridos: 0,
        registros_atualizados: 0,
        erros_count: 1,
        mensagem_erro: msg,
        duracao_ms: Date.now() - inicioMs,
      });
      await gravarTechLog(supabase, msg);
    }
    return json({ ok: false, erro: msg, csv_url: fonteUrl, formato }, req, 200);
  }

  const totalMarcas = blocos.reduce((s, b) => s + b.marcas.length, 0);
  const listaAtualizada =
    resolved.listaAtualizadaEm ?? extractListaAtualizadaEm(canonicalText.slice(0, 500));

  if (dry_run) {
    return json({
      ok: true,
      dry_run: true,
      csv_url: fonteUrl,
      formato,
      content_hash: contentHash,
      blocos: blocos.length,
      marcas: totalMarcas,
      lista_atualizada_em: listaAtualizada,
      amostra: blocos.slice(0, 3).map((b) => ({
        cnpj: b.cnpj,
        razao_social: b.razao_social,
        portaria: b.portaria,
        retificacoes: b.portaria_retificacoes.length,
        marcas: b.marcas.length,
      })),
    }, req);
  }

  const result = await upsertBlocos(supabase, blocos);
  const duracao_ms = Date.now() - inicioMs;
  const inseridos = result.empresas_inseridas + result.marcas_inseridas;
  const atualizados = result.empresas_atualizadas + result.marcas_atualizadas;
  const erros_count = result.erros.length;
  const ok = erros_count === 0 || inseridos + atualizados > 0;

  await salvarMeta(supabase, {
    content_hash: contentHash,
    csv_url: fonteUrl,
    lista_atualizada_em: listaAtualizada,
    blocos: blocos.length,
    marcas: totalMarcas,
  });

  await gravarSyncLog(supabase, {
    status: ok ? "ok" : "falha",
    registros_inseridos: inseridos,
    registros_atualizados: atualizados,
    erros_count,
    mensagem_erro: erros_count > 0 ? result.erros.slice(0, 5).join(" | ") : null,
    duracao_ms,
  });

  if (erros_count > 0) {
    await gravarTechLog(supabase, result.erros.slice(0, 10).join("\n"));
  }

  return json({
    ok,
    csv_url: fonteUrl,
    formato,
    lista_atualizada_em: listaAtualizada,
    blocos: blocos.length,
    marcas_parseadas: totalMarcas,
    empresas_inseridas: result.empresas_inseridas,
    empresas_atualizadas: result.empresas_atualizadas,
    marcas_inseridas: result.marcas_inseridas,
    marcas_atualizadas: result.marcas_atualizadas,
    erros: result.erros.slice(0, 20),
    duracao_ms,
  }, req);
});
