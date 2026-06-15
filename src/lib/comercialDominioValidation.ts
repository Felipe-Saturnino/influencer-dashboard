/**
 * Validação HTTP de domínio — Pipeline B2B.
 * Espelhado em supabase/functions/validate-comercial-dominios/index.ts — manter sincronizado.
 */

export type StatusDominioDb = "ok" | "inativo";

export const DOMINIO_CHECK_TIMEOUT_MS = 12_000;
export const DOMINIO_CHECK_CONCURRENCY = 6;

/** UA de navegador — muitas casas .bet.br usam Cloudflare/WAF e bloqueiam bots. */
export const DOMINIO_CHECK_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DOMINIO_CHECK_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent": DOMINIO_CHECK_USER_AGENT,
  "Cache-Control": "no-cache",
};

export function normalizeDominioForCheck(raw: string | null | undefined): string | null {
  const v = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!v || v === "a definir" || v === "a definir." || v === "-") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

/** Variantes com/sem www para probe. */
export function buildDominioProbeUrls(raw: string | null | undefined): string[] {
  const base = normalizeDominioForCheck(raw);
  if (!base) return [];
  const urls = new Set<string>([base]);
  try {
    const u = new URL(base);
    const host = u.hostname;
    if (host.startsWith("www.")) {
      urls.add(`${u.protocol}//${host.slice(4)}${u.pathname}${u.search}`);
    } else {
      urls.add(`${u.protocol}//www.${host}${u.pathname}${u.search}`);
    }
  } catch {
    /* ignore */
  }
  return [...urls];
}

function httpStatusAtivo(status: number): boolean {
  return status >= 200 && status < 400;
}

/** Servidor respondeu — inclui WAF/Cloudflare (403 challenge) e bloqueio a bot. */
export function responseIndicaDominioAtivo(res: Response): boolean {
  if (httpStatusAtivo(res.status)) return true;
  if (res.status === 403 || res.status === 401) {
    if (res.headers.get("cf-mitigated")) return true;
    const server = (res.headers.get("server") ?? "").toLowerCase();
    if (server.includes("cloudflare") || server.includes("nginx") || server.includes("openresty")) {
      return true;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) return true;
  }
  return false;
}

/** Undici/Deno: cabeçalhos enormes (Cloudflare) — servidor respondeu. */
export function fetchErrorIndicaServidorRespondeu(err: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    parts.push(String((cur as Error)?.message ?? cur));
    const code = (cur as { code?: string })?.code;
    if (code) parts.push(code);
    cur = (cur as { cause?: unknown })?.cause;
  }
  const joined = parts.join(" ").toLowerCase();
  return (
    joined.includes("und_err_headers_overflow") ||
    joined.includes("headers_overflow") ||
    joined.includes("headers overflow")
  );
}

async function probeUrlOnce(
  url: string,
  method: "GET" | "HEAD",
  fetchFn: typeof fetch,
  signal: AbortSignal,
): Promise<"ok" | "inativo" | "retry"> {
  try {
    const res = await fetchFn(url, {
      method,
      redirect: "follow",
      signal,
      headers: DOMINIO_CHECK_HEADERS,
    });
    if (responseIndicaDominioAtivo(res)) return "ok";
    if (method === "HEAD") return "retry";
    if (res.status === 404) return "retry";
    return "inativo";
  } catch (err) {
    if (fetchErrorIndicaServidorRespondeu(err)) return "ok";
    if (method === "HEAD") return "retry";
    return "retry";
  }
}

/** Probe HTTP — domínio acessível (2xx/3xx, WAF 403 ou resposta do servidor). */
export async function probeDominioHttp(
  rawUrl: string | null | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<StatusDominioDb> {
  const urls = buildDominioProbeUrls(rawUrl);
  if (urls.length === 0) return "inativo";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOMINIO_CHECK_TIMEOUT_MS);

  try {
    for (const url of urls) {
      const getResult = await probeUrlOnce(url, "GET", fetchFn, ctrl.signal);
      if (getResult === "ok") return "ok";
      if (getResult === "inativo") return "inativo";

      const headResult = await probeUrlOnce(url, "HEAD", fetchFn, ctrl.signal);
      if (headResult === "ok") return "ok";
      if (headResult === "inativo") return "inativo";
    }
    return "inativo";
  } finally {
    clearTimeout(timer);
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length || 1);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
