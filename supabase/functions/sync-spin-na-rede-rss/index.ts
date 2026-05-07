import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Edge Function: sync-spin-na-rede-rss
 * Lê feeds RSS/Atom, aplica filtros por texto e faz upsert em public.spin_na_rede_mencao (service role).
 * Thumbnail: media:thumbnail, media:content (image), enclosure (image), ou primeiro <img> no item/entry.
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já existem no projeto.
 *
 *   SPIN_NA_REDE_RSS_URLS — obrigatório para gravar: URLs separadas por vírgula ou quebra de linha.
 *
 * Filtros (opcionais; case-insensitive em título + resumo):
 *   SPIN_NA_REDE_CONTEM_ALGUM — frases separadas por vírgula; pelo menos UMA deve aparecer.
 *     Secret ausente → padrão "spin gaming". Secret definido como string vazia → sem filtro OR (só denylist/AND).
 *   SPIN_NA_REDE_CONTEM_TODOS — frases separadas por vírgula; TODAS devem aparecer (AND).
 *   SPIN_NA_REDE_EXCLUIR_SE_CONTIVER — frases separadas por vírgula; se QUALQUER uma aparecer, passou_filtro=false.
 *
 *   SPIN_NA_REDE_ALLOWLIST_HOSTS — opcional: domínios separados por vírgula (ex.: g1.globo.com,uol.com.br).
 *     Se definido e não vazio, só itens cujo host do link (item_url) casa com algum domínio (match exato ou subdomínio) passam o filtro de host.
 *
 * Segurança (recomendado em produção):
 *   SPIN_NA_REDE_INGEST_SECRET — se definido, exige header x-spin-na-rede-ingest-secret igual ao valor,
 *   OU Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (para cron/GitHub Actions).
 *
 * POST JSON opcional: { dry_run?: boolean, rss_urls?: string[] } — rss_urls substitui temporariamente o env.
 */

const MAX_TITLE = 2000;
const MAX_RESUMO = 12000;
const MAX_IMAGEM_URL = 2048;
const FETCH_TIMEOUT_MS = 25_000;
const UPSERT_CHUNK = 80;

interface ParsedItem {
  titulo: string;
  item_url: string;
  resumo: string | null;
  published_at: string | null;
  imagem_url: string | null;
}

interface IngestBody {
  dry_run?: boolean;
  rss_urls?: string[];
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-spin-na-rede-ingest-secret",
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
    const ok = contemAlgum.some((t) => t && texto.includes(t.toLowerCase()));
    if (!ok) return false;
  }
  return true;
}

/** Allowlist: domínios em minúsculas sem path (ex. g1.globo.com). */
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

function autorizado(req: Request): boolean {
  const secret = Deno.env.get("SPIN_NA_REDE_INGEST_SECRET")?.trim();
  if (!secret) return true;
  const h =
    req.headers.get("x-spin-na-rede-ingest-secret") ??
    req.headers.get("X-Spin-Na-Rede-Ingest-Secret");
  if (h === secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (sr && auth === `Bearer ${sr}`) return true;
  return false;
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

function stripInnerTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractCdataOrText(inner: string): string {
  const c = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const raw = c ? c[1] : inner.trim();
  return stripInnerTags(unescapeXml(raw)).trim();
}

function getTagBlock(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return extractCdataOrText(m[1]);
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

/** Normaliza href de imagem do RSS para URL absoluta http(s); null se inválida. */
function normalizeImagemHref(href: string, baseUrl: string): string | null {
  let u = unescapeXml(href.trim()).replace(/&amp;/g, "&");
  if (u.startsWith("//")) u = `https:${u}`;
  u = resolveUrl(u, baseUrl);
  if (!/^https?:\/\//i.test(u)) return null;
  if (u.length > MAX_IMAGEM_URL) u = u.slice(0, MAX_IMAGEM_URL);
  return u;
}

/** Extrai thumbnail de um bloco <item> RSS 2.0 (media:, enclosure, primeiro <img>). */
function extractImagemUrlFromRssItemBlock(block: string, feedUrl: string): string | null {
  const th = block.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i);
  if (th?.[1]) {
    const u = normalizeImagemHref(th[1], feedUrl);
    if (u) return u;
  }
  const mc1 = block.match(
    /<media:content[^>]*\btype=["']image\/[^"']*["'][^>]*\burl=["']([^"']+)["']/i,
  );
  const mc2 = block.match(
    /<media:content[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']*["']/i,
  );
  const mc = mc1?.[1] ?? mc2?.[1];
  if (mc) {
    const u = normalizeImagemHref(mc, feedUrl);
    if (u) return u;
  }
  const enc1 = block.match(
    /<enclosure[^>]*\btype=["']image\/[^"']*["'][^>]*\burl=["']([^"']+)["']/i,
  );
  const enc2 = block.match(
    /<enclosure[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']*["']/i,
  );
  const enc = enc1?.[1] ?? enc2?.[1];
  if (enc) {
    const u = normalizeImagemHref(enc, feedUrl);
    if (u) return u;
  }
  const imgM = block.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (imgM?.[1]) {
    const u = normalizeImagemHref(imgM[1], feedUrl);
    if (u) return u;
  }
  return null;
}

/** Extrai thumbnail de um bloco <entry> Atom (link enclosure image, media:, <img>). */
function extractImagemUrlFromAtomEntryBlock(block: string, feedUrl: string): string | null {
  const linkRe = /<link([^>]+)\/?>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(block)) !== null) {
    const attrs = lm[1];
    if (!/type=["']image\//i.test(attrs)) continue;
    const hm = attrs.match(/\bhref=["']([^"']+)["']/i);
    if (hm?.[1]) {
      const u = normalizeImagemHref(hm[1], feedUrl);
      if (u) return u;
    }
  }
  const th = block.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i);
  if (th?.[1]) {
    const u = normalizeImagemHref(th[1], feedUrl);
    if (u) return u;
  }
  const imgM = block.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (imgM?.[1]) {
    const u = normalizeImagemHref(imgM[1], feedUrl);
    if (u) return u;
  }
  return null;
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
    const encoded = getTagBlock(block, "content:encoded") ?? getTagBlock(block, "description");
    const resumo = encoded && encoded.length > 0 ? encoded.slice(0, MAX_RESUMO) : null;
    titulo = titulo.slice(0, MAX_TITLE);
    if (!titulo) titulo = link;
    const pubRaw =
      getTagBlock(block, "pubDate") ??
      getTagBlock(block, "dc:date") ??
      getTagBlock(block, "published");
    const published_at = parsePubDateToIso(pubRaw);
    const imagem_url = extractImagemUrlFromRssItemBlock(block, feedUrl);
    out.push({ titulo, item_url: link, resumo, published_at, imagem_url });
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
    const summary = getTagBlock(block, "summary") ?? getTagBlock(block, "content");
    const resumo = summary && summary.length > 0 ? summary.slice(0, MAX_RESUMO) : null;
    const pubRaw = getTagBlock(block, "updated") ?? getTagBlock(block, "published");
    const published_at = parsePubDateToIso(pubRaw);
    const imagem_url = extractImagemUrlFromAtomEntryBlock(block, feedUrl);
    out.push({ titulo: titulo || link, item_url: link, resumo, published_at, imagem_url });
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

async function fetchFeedXml(url: string): Promise<{ ok: true; xml: string } | { ok: false; erro: string }> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "SpinNaRedeRSS/1.0 (+https://spingaming.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(id);
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status} ${res.statusText}` };
    const xml = await res.text();
    if (!xml.trim()) return { ok: false, erro: "Corpo vazio" };
    return { ok: true, xml };
  } catch (e) {
    clearTimeout(id);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, erro: msg };
  }
}

function hostDeUrl(u: string): string | null {
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json({ ok: false, erro: "Use POST" }, req, 405);
  }

  if (!autorizado(req)) {
    return json({ ok: false, erro: "Não autorizado. Defina x-spin-na-rede-ingest-secret ou Bearer service_role." }, req, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, erro: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta." }, req, 500);
  }

  let body: IngestBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as IngestBody;
  } catch {
    body = {};
  }

  const envUrls = parseUrlList(Deno.env.get("SPIN_NA_REDE_RSS_URLS"));
  const rss_urls = Array.isArray(body.rss_urls) && body.rss_urls.length > 0
    ? body.rss_urls.map((u) => String(u).trim()).filter((u) => u.startsWith("http"))
    : envUrls;

  const rawContemAlgum = Deno.env.get("SPIN_NA_REDE_CONTEM_ALGUM");
  const contemAlgum =
    rawContemAlgum === undefined || rawContemAlgum === null
      ? parseCommaPhrases("spin gaming")
      : parseCommaPhrases(rawContemAlgum);
  const contemTodos = parseCommaPhrases(Deno.env.get("SPIN_NA_REDE_CONTEM_TODOS"));
  const excluir = parseCommaPhrases(Deno.env.get("SPIN_NA_REDE_EXCLUIR_SE_CONTIVER"));
  const allowlistHosts = parseHostAllowlist(Deno.env.get("SPIN_NA_REDE_ALLOWLIST_HOSTS"));

  const dry_run = body.dry_run === true;

  if (rss_urls.length === 0) {
    return json({
      ok: false,
      erro:
        "Nenhum feed configurado. Defina SPIN_NA_REDE_RSS_URLS (secrets) ou envie rss_urls no JSON do POST.",
    }, req, 200);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const errosFeed: string[] = [];
  const rows: Array<{
    item_url: string;
    titulo: string;
    resumo: string | null;
    published_at: string | null;
    imagem_url: string | null;
    feed_url: string;
    fonte_host: string | null;
    passou_filtro: boolean;
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
      let passou_filtro = passaFiltro(texto, contemAlgum, contemTodos, excluir);
      if (passou_filtro && !hostMatchesAllowlist(itemHost, allowlistHosts)) {
        passou_filtro = false;
      }
      rows.push({
        item_url: it.item_url,
        titulo: it.titulo,
        resumo: it.resumo,
        published_at: it.published_at,
        imagem_url: it.imagem_url,
        feed_url: feedUrl,
        fonte_host: itemHost,
        passou_filtro,
      });
    }
  }

  if (dry_run) {
    const aceites = rows.filter((r) => r.passou_filtro);
    const rejeitados = rows.filter((r) => !r.passou_filtro);
    const maxAmostra = 10;
    return json({
      ok: true,
      dry_run: true,
      feeds: rss_urls.length,
      items_parsed: itemsParsed,
      rows_montadas: rows.length,
      passou_filtro_sim: aceites.length,
      passou_filtro_nao: rejeitados.length,
      erros_feed: errosFeed,
      filtro_contem_algum: contemAlgum,
      filtro_contem_todos: contemTodos,
      filtro_excluir: excluir,
      filtro_allowlist_hosts: allowlistHosts,
      amostra_aceites: aceites.slice(0, maxAmostra).map((r) => ({
        titulo: r.titulo,
        item_url: r.item_url,
        fonte_host: r.fonte_host,
        imagem_url: r.imagem_url,
      })),
      amostra_rejeitados: rejeitados.slice(0, maxAmostra).map((r) => ({
        titulo: r.titulo,
        item_url: r.item_url,
        fonte_host: r.fonte_host,
        imagem_url: r.imagem_url,
      })),
    }, req);
  }

  let upserted = 0;
  const errosDb: string[] = [];

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    if (chunk.length === 0) continue;
    const { error } = await supabase.from("spin_na_rede_mencao").upsert(chunk, {
      onConflict: "item_url",
      ignoreDuplicates: false,
    });
    if (error) {
      errosDb.push(error.message);
      break;
    }
    upserted += chunk.length;
  }

  const aceites = rows.filter((r) => r.passou_filtro).length;

  return json({
    ok: errosDb.length === 0,
    feeds_processados: rss_urls.length,
    items_parseados: itemsParsed,
    linhas_upsert: upserted,
    passou_filtro_sim: aceites,
    passou_filtro_nao: rows.length - aceites,
    erros_feed: errosFeed,
    erros_db: errosDb,
    filtro_contem_algum: contemAlgum,
    filtro_contem_todos: contemTodos,
    filtro_excluir: excluir,
    filtro_allowlist_hosts: allowlistHosts,
  }, req);
});
