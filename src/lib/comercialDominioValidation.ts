/**
 * Validação HTTP de domínio — Pipeline B2B.
 * Espelhado em supabase/functions/validate-comercial-dominios/index.ts — manter sincronizado.
 */

export type StatusDominioDb = "ok" | "inativo";

export const DOMINIO_CHECK_TIMEOUT_MS = 12_000;
export const DOMINIO_CHECK_CONCURRENCY = 6;
export const DOMINIO_CHECK_USER_AGENT =
  "SpinGaming-DataIntelligence/1.0 (validate-comercial-dominios)";

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

function httpStatusAtivo(status: number): boolean {
  return status >= 200 && status < 400;
}

/** Probe HTTP — domínio acessível (2xx/3xx após redirects). */
export async function probeDominioHttp(
  rawUrl: string | null | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<StatusDominioDb> {
  const url = normalizeDominioForCheck(rawUrl);
  if (!url) return "inativo";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DOMINIO_CHECK_TIMEOUT_MS);
  const headers = {
    Accept: "text/html,application/xhtml+xml,*/*",
    "User-Agent": DOMINIO_CHECK_USER_AGENT,
  };

  try {
    let res = await fetchFn(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers,
    });

    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetchFn(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers,
      });
    }

    return httpStatusAtivo(res.status) ? "ok" : "inativo";
  } catch {
    try {
      const res = await fetchFn(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers,
      });
      return httpStatusAtivo(res.status) ? "ok" : "inativo";
    } catch {
      return "inativo";
    }
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
