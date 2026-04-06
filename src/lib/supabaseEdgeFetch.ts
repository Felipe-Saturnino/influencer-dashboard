import { supabase } from "./supabase";

function functionsBaseUrl(): string {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) throw new Error("VITE_SUPABASE_URL não configurada.");
  return raw.replace(/\/$/, "");
}

/**
 * POST para Edge Function do Supabase a partir do browser (evita depender do proxy /api do Cloudflare Pages).
 * Inclui Apikey + Authorization como o gateway Supabase exige.
 */
export async function postSupabaseEdgeFunction(
  functionName: string,
  body: object,
  options?: { timeoutMs?: number }
): Promise<Response> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anon?.trim()) throw new Error("VITE_SUPABASE_ANON_KEY não configurada.");

  const timeoutMs = options?.timeoutMs ?? 120_000;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${functionsBaseUrl()}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        apikey: anon,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
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
