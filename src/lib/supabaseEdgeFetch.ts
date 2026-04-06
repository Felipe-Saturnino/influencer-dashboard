import { supabase, supabaseUrl, supabaseAnonKey } from "./supabase";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Chama Edge Function via fetch direto (token da sessão atual), sem passar pelo fetch interno do cliente
 * que encadeia getAccessToken em toda requisição — em alguns cenários isso travava o invoke sem resolver.
 */
export async function callSupabaseEdgeFunction<T = unknown>(
  functionName: string,
  body: object,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    throw new Error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error("Sessão expirada ou ausente. Faça login novamente.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
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
        `Tempo esgotado (${Math.round(timeoutMs / 1000)}s) ao chamar "${functionName}". Verifique rede e se a função está deployada no Supabase.`
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

/** Alias do nome antigo — evita falha de build se algum arquivo ainda importar `postSupabaseEdgeFunction`. */
export { callSupabaseEdgeFunction as postSupabaseEdgeFunction };
