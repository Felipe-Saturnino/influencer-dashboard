import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

/** Timeout por tentativa (proxy ou direto). */
const DEFAULT_TIMEOUT_MS = 60_000;
const GET_SESSION_MS = 20_000;
const READ_BODY_MS = 45_000;

const PROXY_FUNCTIONS = new Set(["criar-usuario", "atualizar-perfil", "admin-usuario-acao"]);

/** Sinal interno: proxy não serviu; tentar URL direta do Supabase. */
class TryDirectInstead extends Error {
  constructor(cause?: string) {
    super(cause ?? "try_direct");
    this.name = "TryDirectInstead";
  }
}

function resolveEdgeFunctionUrl(functionName: string): string {
  const base = (supabaseUrl ?? "").trim();
  if (!base) {
    throw new Error(
      "VITE_SUPABASE_URL vazia no build. No Cloudflare Pages, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY também para o ambiente Preview (branch de staging), não só Production."
    );
  }
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    throw new Error(
      "VITE_SUPABASE_URL precisa ser uma URL absoluta (ex.: https://xxxx.supabase.co). Valores relativos fazem o browser chamar o domínio do Cloudflare e as Edge Functions nunca respondem."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error("VITE_SUPABASE_URL inválida. Confira Settings → Environment variables no Cloudflare (Preview e Production).");
  }

  const host = parsed.hostname.toLowerCase();
  if (host.endsWith(".pages.dev") || host.endsWith(".cloudflareapp.com")) {
    throw new Error(
      "VITE_SUPABASE_URL está apontando para o domínio do Cloudflare Pages. Use a URL do Supabase (Settings → API → Project URL), não a URL do site."
    );
  }

  const origin = `${parsed.origin.replace(/\/$/, "")}`;
  return `${origin}/functions/v1/${encodeURIComponent(functionName)}`;
}

function raceReject<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function looksLikeHtmlBody(text: string): boolean {
  const s = text.trimStart();
  return s.startsWith("<!") || s.startsWith("<html") || s.startsWith("<HTML");
}

/**
 * POST /api/{functionName} — Cloudflare Pages (ou Vite dev) repassa ao Supabase no servidor.
 * Evita navegador pendurado em POST direto para *.supabase.co (rede/proxy/IPv6).
 */
async function callViaSameOriginProxy<T>(
  functionName: string,
  body: object,
  accessToken: string,
  timeoutMs: number
): Promise<T> {
  const path = `/api/${functionName}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (err) {
      if (
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        throw new TryDirectInstead("proxy_abort");
      }
      throw new TryDirectInstead("proxy_network");
    }

    const text = await raceReject(
      res.text(),
      READ_BODY_MS,
      "proxy_read_body"
    );

    const ct = res.headers.get("content-type") ?? "";

    if (res.ok && (!ct.includes("application/json") || looksLikeHtmlBody(text))) {
      throw new TryDirectInstead("proxy_html");
    }

    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504 || res.status === 524) {
        throw new TryDirectInstead(`proxy_http_${res.status}`);
      }
      let msg = `Erro ${res.status}`;
      if (parsed && typeof parsed === "object" && parsed !== null) {
        const o = parsed as { error?: string; message?: string };
        if (typeof o.error === "string" && o.error.trim()) msg = o.error;
        else if (typeof o.message === "string" && o.message.trim()) msg = o.message;
      }
      throw new Error(msg);
    }

    return parsed as T;
  } finally {
    clearTimeout(t);
  }
}

async function callDirectToSupabase<T>(
  url: string,
  body: object,
  accessToken: string,
  timeoutMs: number
): Promise<T> {
  const ctrl = new AbortController();
  const tFetch = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const text = await raceReject(
      res.text(),
      READ_BODY_MS,
      "direct_read_body"
    );

    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      let msg = `Erro HTTP ${res.status}`;
      if (parsed && typeof parsed === "object" && parsed !== null) {
        const o = parsed as { error?: string; message?: string };
        if (typeof o.error === "string" && o.error.trim()) msg = o.error;
        else if (typeof o.message === "string" && o.message.trim()) msg = o.message;
      }
      throw new Error(msg);
    }

    return parsed as T;
  } finally {
    clearTimeout(tFetch);
  }
}

/**
 * Ordem: 1) /api/* (mesma origem) 2) Supabase direto.
 * Muitos ambientes completam o proxy mesmo quando o browser não recebe resposta do host *.supabase.co.
 */
export async function callSupabaseEdgeFunction<T = unknown>(
  functionName: string,
  body: object,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!supabaseAnonKey?.trim()) {
    throw new Error("VITE_SUPABASE_ANON_KEY ausente no build.");
  }

  const url = resolveEdgeFunctionUrl(functionName);

  const {
    data: { session },
  } = await raceReject(
    supabase.auth.getSession(),
    GET_SESSION_MS,
    "Tempo esgotado ao obter a sessão. Recarregue a página e faça login novamente."
  );

  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  }

  const useProxyFirst = typeof window !== "undefined" && PROXY_FUNCTIONS.has(functionName);

  if (useProxyFirst) {
    try {
      return await callViaSameOriginProxy<T>(functionName, body, accessToken, timeoutMs);
    } catch (e) {
      if (!(e instanceof TryDirectInstead)) {
        throw e;
      }
    }
  }

  try {
    return await callDirectToSupabase<T>(url, body, accessToken, timeoutMs);
  } catch (e) {
    const aborted =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) {
      throw new Error(
        `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao chamar "${functionName}" no Supabase.\n` +
          `URL: ${url}\n\n` +
          `1) No painel Supabase → Edge Functions: confira se "criar-usuario" (e demais) está listada.\n` +
          `2) No terminal (projeto linkado): supabase functions deploy ${functionName} --no-verify-jwt\n` +
          `3) Secrets: SENHA_PADRAO (mín. 8 caracteres).\n` +
          `4) Cloudflare Pages: em Settings → Functions, VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para o proxy /api (Preview + Production).\n` +
          `5) Teste fora do browser: curl -i -X OPTIONS "${url}" (deve responder rápido, não ficar pendurado).`
      );
    }
    throw e;
  }
}

export function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export { callSupabaseEdgeFunction as postSupabaseEdgeFunction };
