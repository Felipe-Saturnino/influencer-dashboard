import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: sync-painel-noticias-rss
 * Ingestão RSS → public.painel_noticia + purge de vencidas fora do conjunto de exibição (mín. 5).
 *
 * Secrets:
 *   PAINEL_NOTICIAS_RSS_URLS — feeds (vírgula ou quebra de linha); vazio = falha controlada no log.
 *   PAINEL_NOTICIAS_CONTEM_ALGUM / CONTEM_TODOS / EXCLUIR / ALLOWLIST_HOSTS — opcionais (vazios = sem filtro).
 *   PAINEL_NOTICIAS_INGEST_SECRET — obrigatório para cron/GitHub (header x-painel-noticias-ingest-secret).
 *   Chamada logada (Status Técnico) aceita JWT role=authenticated; service_role também.
 *   Feeds só de PAINEL_NOTICIAS_RSS_URLS — o body não pode substituir a lista.
 */

const MAX_TITLE = 2000;
const MAX_RESUMO = 12000;
const FETCH_TIMEOUT_MS = 25_000;
const PURGE_CHUNK = 100;
const MIN_EXIBICAO = 5;

interface ParsedItem {
  titulo: string;
  item_url: string;
  resumo: string | null;
  published_at: string | null;
}

interface IngestBody {
  dry_run?: boolean;
}

interface DbRow {
  id: string;
  visivel_desde: string;
  visivel_ate: string;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-painel-noticias-ingest-secret",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

function parseUrlList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^https?:\/\//i.test(s));
}

function parseCommaPhrases(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function textoParaFiltro(titulo: string, resumo: string | null): string {
  return `${titulo}\n${resumo ?? ""}`.toLowerCase();
}

function passaFiltro(
  texto: string,
  contemAlgum: string[],
  contemTodos: string[],
  excluir: string[],
): boolean {
  for (const ex of excluir) {
    if (ex && texto.includes(ex.toLowerCase())) return false;
  }
  if (contemTodos.length > 0) {
    for (const t of contemTodos) {
      if (!t || !texto.includes(t.toLowerCase())) return false;
    }
  }
  if (contemAlgum.length > 0) {
    if (!contemAlgum.some((t) => t && texto.includes(t.toLowerCase()))) return false;
  }
  return true;
}

function parseHostAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function hostMatchesAllowlist(host: string | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  if (!host?.trim()) return false;
  const h = host.trim().toLowerCase();
  for (const a of allowlist) {
    if (h === a || h.endsWith(`.${a}`)) return true;
  }
  return false;
}

function jwtRoleClaim(token: string): string | null {
  if (!token || !token.includes(".")) return null;
  try {
    const part = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const pad = part.length % 4 === 0 ? "" : "=".repeat(4 - (part.length % 4));
    const payload = JSON.parse(atob(part + pad)) as Record<string, unknown>;
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

async function autorizado(req: Request): Promise<boolean> {
  const secret = Deno.env.get("PAINEL_NOTICIAS_INGEST_SECRET")?.trim();
  const h =
    req.headers.get("x-painel-noticias-ingest-secret") ??
    req.headers.get("X-Painel-Noticias-Ingest-Secret");
  if (secret && h === secret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && bearer === sr) return true;

  if (jwtRoleClaim(bearer) !== "authenticated") return false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!supabaseUrl || !sr || !bearer) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${bearer}`, apikey: sr },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const MEDIA_TAG_RE = /(?:img|figure|picture|iframe|video|audio|embed|source|object|svg|noscript|script|style)/i;

function normalizeEspacosPainel(s: string): string {
  return s
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limparLinhaEditorialPainel(line: string): string {
  return line
    .replace(/^['"']?\s*>\s*/, "")
    .replace(/\s*\([^)]*\bfoto\s*:[^)]*\)/gi, "")
    .replace(/\s*\(\s*reprodução\s*\/?\s*foto\s*:[^)]*\)/gi, "")
    .trim();
}

function linhaIrrelevantePainel(line: string): boolean {
  const raw = line.trim();
  if (!raw) return false;
  if (/^['"']?\s*>\s/.test(raw)) return true;
  if (/\(foto\s*:/i.test(raw)) return true;
  const cleaned = limparLinhaEditorialPainel(raw);
  if (!cleaned) return true;
  const lower = cleaned.toLowerCase();
  if (/^crédito\s*:/.test(lower)) return true;
  if (/^fonte\s*:/.test(lower)) return true;
  if (/^imagem\s*:/.test(lower)) return true;
  if (cleaned.length < 95 && /^[\wÀ-ú''.\s-]+,\s*do\s+/i.test(cleaned)) return true;
  return false;
}

function filtrarLinhasPainel(text: string): string {
  return normalizeEspacosPainel(
    text
      .split("\n")
      .map(limparLinhaEditorialPainel)
      .filter((line) => !line.trim() || !linhaIrrelevantePainel(line))
      .join("\n"),
  );
}

function sanitizePainelHtml(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  let s = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<ul\b[\s\S]*?<\/ul>/gi, "\n")
    .replace(/<ol\b[\s\S]*?<\/ol>/gi, "\n")
    .replace(/<\/?(?:ul|ol|figure|figcaption)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(new RegExp(`<${MEDIA_TAG_RE.source}[^>]*\\/?>`, "gi"), " ");
  s = s.replace(new RegExp(`<${MEDIA_TAG_RE.source}\\b[^>\\n]*`, "gi"), " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+|alt|title|class|width|height)\s*=\s*['"][^'"]*['"]/gi, " ");
  s = s.replace(/\b(?:href|src|data-[\w-]+)\s*=\s*[^\s'"]+/gi, " ");
  s = s.replace(/https?:\/\/[^\s]+\.(?:webp|jpe?g|png|gif|svg|bmp)(?:\?[^\s]*)?/gi, " ");
  s = s.replace(/\bdata-[\w-]+(?:\.\.\.)?/gi, " ");
  s = unescapeXml(s);
  s = s.replace(/['"']\s*>\s*/g, " ");
  s = s.replace(/(?:^|\n)\s*>\s*/g, "\n");
  return filtrarLinhasPainel(normalizeEspacosPainel(s));
}

function removeBoilerplatePainel(text: string, titulo?: string): string {
  let t = text
    .replace(/O post [\s\S]+? apareceu primeiro em [^\n.]+\.?\s*/gi, "")
    .replace(/The post [\s\S]+? appeared first on [^\n.]+\.?\s*/gi, "");
  t = normalizeEspacosPainel(t);
  if (titulo) {
    const nt = titulo.toLowerCase().trim();
    t = normalizeEspacosPainel(
      t
        .split("\n")
        .filter((line) => {
          const nl = line.toLowerCase().trim();
          if (!nl) return true;
          if (nl === nt) return false;
          if (nl.startsWith("o post ") && nl.includes("apareceu primeiro em")) return false;
          return true;
        })
        .join("\n"),
    );
  }
  return filtrarLinhasPainel(t);
}

function tituloUtilPainel(s: string): boolean {
  if (!s.trim() || s.trim().length < 8) return false;
  if (/^https?:\/\//i.test(s.trim())) return false;
  if (/^o post .+ apareceu primeiro em/i.test(s.trim())) return false;
  return true;
}

function prepararItemArmazenamento(
  tituloRaw: string,
  resumoRaw: string | null,
): { titulo: string; resumo: string | null } {
  const bruto = resumoRaw?.trim() && !/^(null|undefined|n\/a|none|-)$/i.test(resumoRaw.trim())
    ? resumoRaw
    : null;
  let titulo = removeBoilerplatePainel(sanitizePainelHtml(tituloRaw));
  let resumo = bruto ? removeBoilerplatePainel(sanitizePainelHtml(bruto), titulo) : null;

  if (!tituloUtilPainel(titulo) && resumo) {
    const frase = resumo.match(/^(.{24,220}?[.!?])(?:\s|\n|$)/s);
    if (frase && frase[1].length <= 200) {
      titulo = frase[1].trim();
      resumo = filtrarLinhasPainel(normalizeEspacosPainel(resumo.slice(frase[1].length)));
    }
  }

  if (resumo) resumo = filtrarLinhasPainel(resumo) || null;

  if (resumo && titulo) {
    const nt = titulo.toLowerCase().trim();
    const nr = resumo.toLowerCase().trim();
    if (nr === nt) resumo = null;
    else if (nr.startsWith(nt)) {
      const esc = titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      resumo = resumo.replace(new RegExp(`^${esc}\\s*`, "i"), "").trim() || null;
    }
  }

  const ajuste = substituirTituloTruncadoArmazenamento(titulo, resumo);
  titulo = ajuste.titulo;
  resumo = ajuste.resumo;

  if (!tituloUtilPainel(titulo)) {
    titulo = tituloRaw.trim().slice(0, MAX_TITLE) || titulo;
  }
  if (resumo && resumo.length > MAX_RESUMO) resumo = resumo.slice(0, MAX_RESUMO);

  return { titulo: titulo.slice(0, MAX_TITLE), resumo };
}

function stripInnerTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractCdataOrText(inner: string): string {
  const c = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const raw = c ? c[1] : inner.trim();
  return stripInnerTags(unescapeXml(raw)).trim();
}

function getTagBlockRaw(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  const c = m[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const raw = unescapeXml(c ? c[1] : m[1].trim()).trim();
  return raw.length > 0 ? raw : null;
}

function getTagBlock(block: string, tag: string): string | null {
  const raw = getTagBlockRaw(block, tag);
  if (!raw) return null;
  return extractCdataOrText(raw);
}

/** Escolhe o campo RSS mais longo (HTML preservado para o painel TV). */
function resumoRssBrutoUtil(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  return !/^(null|undefined|n\/a|none|-)$/i.test(raw.trim());
}

function tituloPareceTruncadoPainel(titulo: string): boolean {
  const t = titulo.trim();
  return !t || t.endsWith("...") || t.endsWith("…");
}

function resumoUtilPainel(resumo: string | null): boolean {
  if (!resumo?.trim() || /^(null|undefined|n\/a|none|-)$/i.test(resumo.trim())) return false;
  return sanitizePainelHtml(resumo).length >= 40;
}

function substituirTituloTruncadoArmazenamento(
  titulo: string,
  resumo: string | null,
): { titulo: string; resumo: string | null } {
  if (!resumo || !tituloPareceTruncadoPainel(titulo) || resumo.length < 40) {
    return { titulo, resumo };
  }
  const frase = resumo.match(/^(.{24,220}?[.!?])(?:\s|\n|$)/s);
  if (frase && frase[1].length <= 200 && !tituloPareceTruncadoPainel(frase[1].trim())) {
    return {
      titulo: frase[1].trim(),
      resumo: filtrarLinhasPainel(normalizeEspacosPainel(resumo.slice(frase[1].length))) || null,
    };
  }
  if (resumo.length <= 220) {
    return { titulo: resumo, resumo: null };
  }
  return { titulo: resumo, resumo: null };
}

function itemElegivelPainel(titulo: string, resumo: string | null): boolean {
  if (titulo.trim().length < 12 || /^https?:\/\//i.test(titulo.trim())) return false;
  if (tituloPareceTruncadoPainel(titulo)) return resumoUtilPainel(resumo);
  return true;
}

function pickResumoRss(block: string, tags: string[]): string | null {
  const parts = tags
    .map((tag) => getTagBlockRaw(block, tag))
    .filter((v): v is string => resumoRssBrutoUtil(v));
  if (parts.length === 0) return null;
  parts.sort((a, b) => b.length - a.length);
  return parts[0].slice(0, MAX_RESUMO);
}

function getAtomLinkHref(entry: string): string | null {
  const m = entry.match(
    /<link[^>]+rel\s*=\s*["']alternate["'][^>]*href\s*=\s*["']([^"']+)["']/i,
  );
  if (m) return m[1].trim();
  const m2 = entry.match(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (m2) return m2[1].trim();
  return null;
}

function parsePubDateToIso(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href.trim(), base).href;
  } catch {
    return href.trim();
  }
}

function parseRss2Items(xml: string, feedUrl: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    let titulo = getTagBlock(block, "title") ?? "";
    let link = getTagBlock(block, "link")?.trim() ?? "";
    if (!link) {
      const guid = getTagBlock(block, "guid")?.trim() ?? "";
      if (guid.startsWith("http://") || guid.startsWith("https://")) link = guid;
    }
    if (!link) continue;
    link = resolveUrl(link, feedUrl);
    const resumo = pickResumoRss(block, ["content:encoded", "description", "summary"]);
    titulo = titulo.slice(0, MAX_TITLE);
    if (!titulo) titulo = link;
    const pubRaw =
      getTagBlock(block, "pubDate") ??
      getTagBlock(block, "dc:date") ??
      getTagBlock(block, "published");
    out.push({ titulo, item_url: link, resumo, published_at: parsePubDateToIso(pubRaw) });
  }
  return out;
}

function parseAtomEntries(xml: string, feedUrl: string): ParsedItem[] {
  const out: ParsedItem[] = [];
  const re = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const titulo = (getTagBlock(block, "title") ?? "").slice(0, MAX_TITLE);
    let link = getAtomLinkHref(block) ?? "";
    if (!link) continue;
    link = resolveUrl(link, feedUrl);
    const resumo = pickResumoRss(block, ["content", "summary"]);
    const pubRaw = getTagBlock(block, "updated") ?? getTagBlock(block, "published");
    out.push({ titulo: titulo || link, item_url: link, resumo, published_at: parsePubDateToIso(pubRaw) });
  }
  return out;
}

function parseFeed(xml: string, feedUrl: string): ParsedItem[] {
  const head = xml.slice(0, 4000).toLowerCase();
  if (/<entry[\s>]/.test(xml) && (head.includes("xmlns=\"http://www.w3.org/2005/atom\"") || head.includes("<feed"))) {
    const atom = parseAtomEntries(xml, feedUrl);
    if (atom.length > 0) return atom;
  }
  return parseRss2Items(xml, feedUrl);
}

function parseCharsetFromContentType(contentType: string | null): string | null {
  if (!contentType?.trim()) return null;
  const m = contentType.match(/charset\s*=\s*["']?([\w.-]+)/i);
  return m ? m[1].trim().toLowerCase() : null;
}

function parseCharsetFromXmlDeclaration(head: string): string | null {
  const m = head.match(/<\?xml[^>]+encoding\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim().toLowerCase() : null;
}

function normalizeRssCharset(label: string): string {
  const c = label.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (c === "utf8") return "utf-8";
  if (c === "iso88591" || c === "latin1") return "iso-8859-1";
  if (c === "windows1252" || c === "cp1252") return "windows-1252";
  return label.toLowerCase();
}

function decodeRssFeedBody(body: ArrayBuffer, contentType: string | null): string {
  const bytes = new Uint8Array(body);
  if (bytes.length === 0) return "";

  let charset = parseCharsetFromContentType(contentType);
  if (!charset) {
    const head = new TextDecoder("iso-8859-1").decode(bytes.slice(0, Math.min(bytes.length, 1024)));
    charset = parseCharsetFromXmlDeclaration(head);
  }
  charset = normalizeRssCharset(charset ?? "utf-8");

  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    try {
      return new TextDecoder("iso-8859-1").decode(bytes);
    } catch {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  }
}

async function fetchFeedXml(url: string): Promise<{ ok: true; xml: string } | { ok: false; erro: string }> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "PainelNoticiasRSS/1.0 (+https://spingaming.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(id);
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status} ${res.statusText}` };
    const xml = decodeRssFeedBody(await res.arrayBuffer(), res.headers.get("content-type"));
    if (!xml.trim()) return { ok: false, erro: "Corpo vazio" };
    return { ok: true, xml };
  } catch (e) {
    clearTimeout(id);
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

function hostDeUrl(u: string): string | null {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

function parseMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function calcularExibicao(rows: DbRow[], now: Date): Set<string> {
  const nowMs = now.getTime();
  const ordenadas = [...rows].sort((a, b) => parseMs(b.visivel_desde) - parseMs(a.visivel_desde));
  const frescas = ordenadas.filter((r) => parseMs(r.visivel_ate) > nowMs);
  let exibir: DbRow[];
  if (frescas.length >= MIN_EXIBICAO) {
    exibir = frescas;
  } else {
    const vencidas = ordenadas.filter((r) => parseMs(r.visivel_ate) <= nowMs);
    exibir = [...frescas, ...vencidas.slice(0, MIN_EXIBICAO - frescas.length)];
  }
  return new Set(exibir.map((r) => r.id));
}

function idsParaPurga(rows: DbRow[], now: Date): string[] {
  const exibir = calcularExibicao(rows, now);
  const nowMs = now.getTime();
  return rows
    .filter((r) => parseMs(r.visivel_ate) <= nowMs && !exibir.has(r.id))
    .map((r) => r.id);
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function gravarSyncLog(
  supabase: SupabaseAdmin,
  opts: {
    status: "ok" | "falha";
    registros_inseridos: number;
    erros_count: number;
    mensagem_erro: string | null;
    duracao_ms: number;
  },
): Promise<void> {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    await supabase.from("sync_logs").insert({
      integracao_slug: "painel_noticias_rss",
      status: opts.status,
      registros_inseridos: opts.registros_inseridos,
      registros_atualizados: 0,
      erros_count: opts.erros_count,
      mensagem_erro: opts.mensagem_erro,
      duracao_ms: opts.duracao_ms,
      periodo_inicio: hoje,
      periodo_fim: hoje,
    });
  } catch (e) {
    console.error("[sync-painel-noticias-rss] sync_logs:", e);
  }
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
  if (!(await autorizado(req))) {
    return json({ ok: false, erro: "Não autorizado." }, req, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let body: IngestBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as IngestBody;
  } catch {
    body = {};
  }

  const rss_urls = parseUrlList(Deno.env.get("PAINEL_NOTICIAS_RSS_URLS"));

  const contemAlgum = parseCommaPhrases(Deno.env.get("PAINEL_NOTICIAS_CONTEM_ALGUM"));
  const contemTodos = parseCommaPhrases(Deno.env.get("PAINEL_NOTICIAS_CONTEM_TODOS"));
  const excluir = parseCommaPhrases(Deno.env.get("PAINEL_NOTICIAS_EXCLUIR_SE_CONTIVER"));
  const allowlistHosts = parseHostAllowlist(Deno.env.get("PAINEL_NOTICIAS_ALLOWLIST_HOSTS"));
  const dry_run = body.dry_run === true;

  if (rss_urls.length === 0) {
    const msg = "Nenhum feed configurado. Defina PAINEL_NOTICIAS_RSS_URLS nos secrets.";
    await gravarSyncLog(supabase, {
      status: "falha",
      registros_inseridos: 0,
      erros_count: 1,
      mensagem_erro: msg,
      duracao_ms: 0,
    });
    return json({ ok: false, erro: msg }, req, 200);
  }

  const inicioMs = Date.now();
  const errosFeed: string[] = [];
  const aceites: Array<{
    item_url: string;
    titulo: string;
    resumo: string | null;
    published_at: string | null;
    feed_url: string;
    fonte_host: string | null;
  }> = [];
  let itemsParsed = 0;

  for (const feedUrl of rss_urls) {
    const got = await fetchFeedXml(feedUrl);
    if (!got.ok) {
      errosFeed.push(`${feedUrl}: ${got.erro}`);
      continue;
    }
    const items = parseFeed(got.xml, feedUrl);
    itemsParsed += items.length;
    const fh = hostDeUrl(feedUrl);
    for (const it of items) {
      const texto = textoParaFiltro(it.titulo, it.resumo);
      const itemHost = hostDeUrl(it.item_url) ?? fh;
      if (!passaFiltro(texto, contemAlgum, contemTodos, excluir)) continue;
      if (!hostMatchesAllowlist(itemHost, allowlistHosts)) continue;
      const prep = prepararItemArmazenamento(it.titulo, it.resumo);
      if (!itemElegivelPainel(prep.titulo, prep.resumo)) continue;
      aceites.push({
        item_url: it.item_url,
        titulo: prep.titulo,
        resumo: prep.resumo,
        published_at: it.published_at,
        feed_url: feedUrl,
        fonte_host: itemHost,
      });
    }
  }

  if (dry_run) {
    return json({
      ok: true,
      dry_run: true,
      feeds: rss_urls.length,
      items_parsed: itemsParsed,
      aceites: aceites.length,
      erros_feed: errosFeed,
    }, req);
  }

  let upserted = 0;
  const errosDb: string[] = [];

  for (const row of aceites) {
    const { error } = await supabase.rpc("upsert_painel_noticia_rss", {
      p_item_url: row.item_url,
      p_titulo: row.titulo,
      p_resumo: row.resumo,
      p_published_at: row.published_at,
      p_feed_url: row.feed_url,
      p_fonte_host: row.fonte_host,
    });
    if (error) {
      errosDb.push(error.message);
      break;
    }
    upserted += 1;
  }

  let purged = 0;
  if (errosDb.length === 0) {
    const { data: allRows, error: selErr } = await supabase
      .from("painel_noticia")
      .select("id, visivel_desde, visivel_ate")
      .eq("passou_filtro", true);
    if (selErr) {
      errosDb.push(selErr.message);
    } else {
      const now = new Date();
      const ids = idsParaPurga((allRows ?? []) as DbRow[], now);
      for (let i = 0; i < ids.length; i += PURGE_CHUNK) {
        const chunk = ids.slice(i, i + PURGE_CHUNK);
        const { error: delErr } = await supabase.from("painel_noticia").delete().in("id", chunk);
        if (delErr) {
          errosDb.push(delErr.message);
          break;
        }
        purged += chunk.length;
      }
    }
  }

  const duracaoMs = Date.now() - inicioMs;
  const okRun = errosDb.length === 0;
  const partesErro = [...errosFeed, ...errosDb];
  const mensagemErro = partesErro.length > 0 ? partesErro.join(" | ").slice(0, 4000) : null;

  await gravarSyncLog(supabase, {
    status: okRun ? "ok" : "falha",
    registros_inseridos: upserted,
    erros_count: errosFeed.length + errosDb.length,
    mensagem_erro: okRun && errosFeed.length === 0 ? null : mensagemErro,
    duracao_ms: duracaoMs,
  });

  return json({
    ok: okRun,
    feeds_processados: rss_urls.length,
    items_parseados: itemsParsed,
    linhas_upsert: upserted,
    linhas_purge: purged,
    erros_feed: errosFeed,
    erros_db: errosDb,
  }, req);
});
