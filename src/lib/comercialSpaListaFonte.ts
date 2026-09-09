/**
 * Discovery da lista oficial SPA/MF (página gov.br + planilha + tabela HTML).
 * Espelhado em supabase/functions/sync-comercial-spa-lista/index.ts — manter sincronizado.
 */

import {
  normalizeCnpj,
  type ParsedEmpresaBloco,
  type ParsedMarca,
} from "./comercialSpaCsvParser";

const LISTA_EMPRESAS_PREFIX =
  "https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/lista-de-empresas/";

/** Página canónica com a tabela HTML oficial (índice `lista-de-empresas` mudou de conteúdo). */
export const DEFAULT_LISTA_PAGE = `${LISTA_EMPRESAS_PREFIX}empresas-autorizadas`;

/** Páginas conhecidas quando o índice não aponta mais para a lista. */
export const FALLBACK_PAGINAS_LISTA = [
  DEFAULT_LISTA_PAGE,
  `${LISTA_EMPRESAS_PREFIX}confira-a-lista-de-empresas-autorizadas-a-ofertar-apostas-de-quota-fixa-em-2025`,
] as const;

function decodeHref(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function collectHrefs(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/gi)) {
    const href = decodeHref(m[1]).trim();
    if (href) urls.push(href);
  }
  return urls;
}

function isJudicialUrl(u: string): boolean {
  return /processos?\s*judiciais|determinacao-judicial|determina[cç][aã]o-judicial|judicial/i.test(
    u,
  );
}

function isAssetUrl(u: string): boolean {
  return /\.(pdf|png|jpe?g|gif|svg|webp)(?:$|\?)/i.test(u) || /@@images|arquivos_tarjados/i.test(u);
}

function isTransparenciaAtivaUrl(u: string): boolean {
  return /transparencia-ativa/i.test(u);
}

/**
 * URL de ficheiro CSV/XLSX no gov.br (legado).
 * Ignora processos judiciais e links sob Transparência Ativa (ficheiros de processos; o
 * `planilha-de-autorizacoes-1.xlsx` nessa pasta costuma 404 — a lista viva é a tabela HTML).
 */
export function extractAutorizacoesPlanilhaUrl(html: string): string | null {
  const urls = collectHrefs(html).filter(
    (u) => /gov\.br\/fazenda/i.test(u) && !isJudicialUrl(u) && !isTransparenciaAtivaUrl(u),
  );

  const xlsx = urls.find((u) => /planilha-de-autorizacoes[^"/?]*\.xlsx(?:$|\?)/i.test(u));
  if (xlsx) return xlsx.split("#")[0] ?? xlsx;

  const csv = urls.find((u) => /planilha-de-autorizacoes[^"/?]*\.csv(?:$|\?)/i.test(u));
  if (csv) return csv.split("#")[0] ?? csv;

  return null;
}

export type SpaListaFontePicked =
  | { kind: "html"; url: string; html: string; listaAtualizadaEm: string | null }
  | { kind: "arquivo"; url: string; listaAtualizadaEm: string | null };

/**
 * Escolhe a fonte na página: tabela HTML oficial primeiro; planilha gov.br só se
 * não houver tabela; SharePoint por último.
 */
export function pickFonteFromHtml(html: string, pageUrl: string): SpaListaFontePicked | null {
  const listaAtualizadaEm = extractListaAtualizadaEm(html);
  if (looksLikeSpaAutorizacoesHtmlTable(html)) {
    return { kind: "html", url: pageUrl, html, listaAtualizadaEm };
  }
  const planilha = extractAutorizacoesPlanilhaUrl(html);
  if (planilha) {
    return { kind: "arquivo", url: planilha, listaAtualizadaEm };
  }
  const sharepoint = extractSharePointPlanilhaUrl(html);
  if (sharepoint) {
    return { kind: "arquivo", url: sharepoint, listaAtualizadaEm };
  }
  return null;
}

/** @deprecated Use extractAutorizacoesPlanilhaUrl — mantido para compatibilidade. */
export function extractAutorizacoesCsvUrl(html: string): string | null {
  return extractAutorizacoesPlanilhaUrl(html);
}

/**
 * Converte link de partilha SharePoint/OneDrive (`:x:/r/` + `sourcedoc`) em URL de download.
 * Sem GUID, acrescenta `download=1`.
 */
export function toSharePointDownloadUrl(url: string): string {
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

/**
 * Link SharePoint/OneDrive da planilha (file=.xlsx). Último recurso — costuma exigir login.
 */
export function extractSharePointPlanilhaUrl(html: string): string | null {
  const urls = collectHrefs(html).filter((u) => /sharepoint\.com/i.test(u) && !isJudicialUrl(u));
  const withFile = urls.find((u) => /[?&]file=[^&]*\.xlsx/i.test(u) || /\.xlsx(?:$|\?)/i.test(u));
  if (withFile) return toSharePointDownloadUrl(withFile);
  const first = urls.find((u) => /:x:\//i.test(u));
  return first ? toSharePointDownloadUrl(first) : null;
}

function normalizeListaPageUrl(href: string, pageUrl: string): string | null {
  let absolute = href;
  if (href.startsWith("/")) {
    absolute = `https://www.gov.br${href}`;
  } else if (!/^https?:\/\//i.test(href)) {
    try {
      absolute = new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  }
  const cleaned = absolute.split("#")[0]?.replace(/\/+$/, "") ?? absolute;
  if (!cleaned.toLowerCase().startsWith(LISTA_EMPRESAS_PREFIX.toLowerCase())) return null;
  if (isAssetUrl(cleaned) || isJudicialUrl(cleaned)) return null;
  if (/transparencia-ativa/i.test(cleaned)) return null;
  const rest = cleaned.slice(LISTA_EMPRESAS_PREFIX.length);
  if (!rest || rest.includes("/")) return null;
  return cleaned;
}

/** Subpáginas da lista (ex.: empresas-autorizadas) — não ficheiros. */
export function extractPaginasListaAutorizacoes(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const current = pageUrl.replace(/\/+$/, "");
  for (const href of collectHrefs(html)) {
    const normalized = normalizeListaPageUrl(href, pageUrl);
    if (!normalized || normalized === current || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function looksLikeSpaAutorizacoesHtmlTable(html: string): boolean {
  return findAutorizacoesTableHtml(html) != null;
}

function findAutorizacoesTableHtml(html: string): string | null {
  const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  return (
    tables.find(
      (t) =>
        /CNPJ/i.test(t) &&
        /Marcas/i.test(t) &&
        /Dom[ií]nio/i.test(t) &&
        /Portaria/i.test(t),
    ) ?? null
  );
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractRowCells(trHtml: string): string[] {
  return [...trHtml.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2] ?? "");
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
  const v = raw.trim();
  if (!v) return { numero: null, ano: null };
  const parts = v.split("/").map((p) => p.trim());
  if (parts.length >= 2) return { numero: parts[0] || null, ano: parts[1] || null };
  return { numero: v, ano: null };
}

function splitPortarias(text: string): { principal: string | null; retificacoes: string[] } {
  const lines = text
    .split(/\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const principal = lines.find((l) => /^SPA\/MF/i.test(l)) ?? lines[0] ?? null;
  const retificacoes = lines.filter((l) => l !== principal);
  return { principal, retificacoes };
}

function zipMarcasDominios(nomes: string[], dominios: string[]): ParsedMarca[] {
  const len = Math.max(nomes.length, dominios.length);
  const marcas: ParsedMarca[] = [];
  for (let i = 0; i < len; i++) {
    const nome = (nomes[i] ?? "").replace(/\s+/g, " ").trim();
    const domRaw = (dominios[i] ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    let dominio: string | null = null;
    if (domRaw && domRaw !== "a definir" && domRaw !== "a definir." && domRaw !== "-") {
      if (/^https?:\/\//i.test(domRaw)) dominio = domRaw;
      else if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(domRaw)) dominio = `https://${domRaw}`;
    }
    if (!nome) continue;
    marcas.push({ nome, dominio });
  }
  return marcas;
}

/**
 * Parser da tabela HTML oficial (`/empresas-autorizadas`).
 */
export function parseSpaAutorizacoesHtmlTable(html: string): ParsedEmpresaBloco[] {
  const table = findAutorizacoesTableHtml(html);
  if (!table) return [];

  const blocos: ParsedEmpresaBloco[] = [];
  for (const rm of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = extractRowCells(rm[1] ?? "");
    if (cells.length < 6) continue;

    let offset = 0;
    const firstPlain = htmlToPlainText(cells[0] ?? "");
    if (/^\d+$/.test(firstPlain)) offset = 1;

    const empresaHtml = cells[offset] ?? "";
    const cnpjHtml = cells[offset + 1] ?? "";
    const marcasHtml = cells[offset + 2] ?? "";
    const dominiosHtml = cells[offset + 3] ?? "";
    const portariaHtml = cells[offset + 4] ?? "";
    const reqHtml = cells[offset + 5] ?? "";

    const razao = htmlToPlainText(empresaHtml).replace(/\s+/g, " ").trim();
    const cnpj = normalizeCnpj(htmlToPlainText(cnpjHtml));
    if (!cnpj || !razao || /^empresa$/i.test(razao)) continue;

    const { principal, retificacoes } = splitPortarias(htmlToPlainText(portariaHtml));
    const req = splitRequerimentoHtml(htmlToPlainText(reqHtml));
    const marcas = zipMarcasDominios(
      splitListaItens(htmlToPlainText(marcasHtml)),
      splitListaItens(htmlToPlainText(dominiosHtml)),
    );

    blocos.push({
      cnpj,
      razao_social: razao,
      portaria: principal,
      portaria_retificacoes: retificacoes,
      requerimento_numero: req.numero,
      requerimento_ano: req.ano,
      marcas,
    });
  }

  return blocos.filter((b) => b.cnpj && b.razao_social);
}

export function extractListaAtualizadaEm(htmlOrCsvHint: string): string | null {
  const m = htmlOrCsvHint.match(/Atualizad[oa] em(?:<\/span>\s*<span[^>]*>|\s+)(\d{2}\/\d{2}\/\d{4})/i);
  return m?.[1] ?? null;
}

export function blocosToCanonicalText(blocos: ParsedEmpresaBloco[]): string {
  return JSON.stringify(blocos);
}
