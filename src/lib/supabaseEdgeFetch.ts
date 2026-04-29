import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

/** Timeout por tentativa (proxy ou direto). */
const DEFAULT_TIMEOUT_MS = 60_000;
const GET_SESSION_MS = 20_000;
const READ_BODY_MS = 45_000;

const PROXY_FUNCTIONS = new Set([
  "criar-usuario",
  "atualizar-perfil",
  "admin-usuario-acao",
  "sync-rh-prestador-auth-user",
]);

/** Sinal interno: proxy não serviu; tentar URL direta do Supabase. */
class TryDirectInstead extends Error {
  constructor(cause?: string) {
    super(cause ?? "try_direct");
    this.name = "TryDirectInstead";
  }
}

/** Direto falhou por rede/timeout — vale tentar o proxy /api (última tentativa). */
function isRetriableNetworkError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") {
    return true;
  }
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  if (e instanceof TypeError) {
    return true;
  }
  if (e instanceof Error && /direct_read_body|Failed to fetch|Load failed|NetworkError/i.test(e.message)) {
    return true;
  }
  return false;
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

type ProxyOptions = { isLastResort?: boolean };

/**
 * POST /api/{functionName} — Cloudflare Pages (ou Vite dev) repassa ao Supabase no servidor.
 * Quando isLastResort=true, não lança TryDirectInstead (já tentámos o browser → Supabase antes).
 */
async function callViaSameOriginProxy<T>(
  functionName: string,
  body: object,
  accessToken: string,
  timeoutMs: number,
  opts?: ProxyOptions
): Promise<T> {
  const path = `/api/${functionName}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const last = opts?.isLastResort === true;
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
      if (last) {
        throw err instanceof Error ? err : new Error(String(err));
      }
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
      if (last) {
        throw new Error(
          "Resposta inválida do proxy /api (HTML ou não-JSON). O deploy das Pages Functions pode estar incorreto."
        );
      }
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
      let msg = `Erro ${res.status}`;
      if (parsed && typeof parsed === "object" && parsed !== null) {
        const o = parsed as { error?: string; message?: string };
        if (typeof o.error === "string" && o.error.trim()) msg = o.error;
        else if (typeof o.message === "string" && o.message.trim()) msg = o.message;
      }
      if (
        !last &&
        (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504 || res.status === 524)
      ) {
        throw new TryDirectInstead(`proxy_http_${res.status}`);
      }
      /** Proxy CF sem env no Worker: build do app ainda pode ter VITE_* — tenta Supabase direto no browser. */
      if (
        !last &&
        res.status === 500 &&
        /configura(ç|c)ão do servidor incompleta|VITE_SUPABASE_URL|SUPABASE_URL/i.test(msg)
      ) {
        throw new TryDirectInstead("proxy_config_incomplete");
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
 * Ordem: 1) Supabase direto no browser 2) /api/* (Cloudflare) só se a direta falhar por rede/timeout.
 * O caminho Worker → Supabase costuma estourar tempo (504) em alguns projetos; o browser → Supabase costuma responder.
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

  const tokenRaw = session?.access_token?.trim();
  if (!tokenRaw) {
    throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  }
  const accessToken: string = tokenRaw;

  const useProxyFallback = typeof window !== "undefined" && PROXY_FUNCTIONS.has(functionName);

  async function callDirect(): Promise<T> {
    return await callDirectToSupabase<T>(url, body, accessToken, timeoutMs);
  }

  function formatDirectFailure(e: unknown): Error {
    const aborted =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) {
      return new Error(
        `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao chamar "${functionName}" no Supabase.\n` +
          `URL: ${url}\n\n` +
          `1) No painel Supabase → Edge Functions: confira se "${functionName}" está listada.\n` +
          `2) Deploy: supabase functions deploy ${functionName}\n` +
          `3) Secrets (criar-usuario): SENHA_PADRAO (mín. 8 caracteres).\n` +
          `4) Se só o proxy /api falhar, esta chamada direta deve funcionar após atualizar o front.\n` +
          `5) Teste: curl -i -X OPTIONS "${url}"`
      );
    }
    return e instanceof Error ? e : new Error(String(e));
  }

  if (useProxyFallback) {
    try {
      return await callDirect();
    } catch (e) {
      if (!isRetriableNetworkError(e)) {
        throw e;
      }
      try {
        return await callViaSameOriginProxy<T>(functionName, body, accessToken, timeoutMs, {
          isLastResort: true,
        });
      } catch (eProxy) {
        const directFail = formatDirectFailure(e);
        const proxyMsg = eProxy instanceof Error ? eProxy.message : String(eProxy);
        throw new Error(
          `${directFail.message}\n\n` +
            `Tentativa extra via proxy /api/${functionName} também falhou:\n${proxyMsg}`
        );
      }
    }
  }

  try {
    return await callDirect();
  } catch (e) {
    throw formatDirectFailure(e);
  }
}

export function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export { callSupabaseEdgeFunction as postSupabaseEdgeFunction };
