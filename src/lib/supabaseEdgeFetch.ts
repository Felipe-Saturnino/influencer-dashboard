import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

const DEFAULT_TIMEOUT_MS = 120_000;

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

/**
 * Chama Edge Function via fetch direto (token da sessão), sem o fetch interno do cliente que encadeia getAccessToken.
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
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

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

    const text = await res.text();
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
  } catch (e) {
    if (
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError")
    ) {
      throw new Error(
        `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao chamar "${functionName}".\n` +
          `URL usada: ${url}\n\n` +
          `• Deploy de staging: no Cloudflare Pages, variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem existir no ambiente Preview (branch).\n` +
          `• Confirme no Supabase (mesmo projeto dessa URL) que a função está deployada: supabase functions deploy ${functionName} --no-verify-jwt`
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export { callSupabaseEdgeFunction as postSupabaseEdgeFunction };
