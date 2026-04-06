import { supabase } from "./supabase";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Chama Edge Function pelo SDK (`supabase.functions.invoke`).
 * Usa o mesmo fetch autenticado do cliente (Authorization + apikey), evitando falhas do fetch manual ao gateway.
 */
export async function callSupabaseEdgeFunction<T = unknown>(
  functionName: string,
  body: object,
  options?: { timeoutMs?: number }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      let msg = `Erro HTTP ${res.status}`;
      try {
        const j = (await res.clone().json()) as { error?: string; message?: string };
        if (typeof j.error === "string" && j.error.trim()) msg = j.error;
        else if (typeof j.message === "string" && j.message.trim()) msg = j.message;
      } catch {
        /* mantém msg */
      }
      throw new Error(msg);
    }
    if (error instanceof FunctionsFetchError) {
      throw new Error(
        "Falha de rede ou tempo esgotado ao chamar a Edge Function. Confirme que a função está deployada no projeto Supabase das variáveis VITE_* (ex.: supabase functions deploy " +
          functionName +
          " --no-verify-jwt)."
      );
    }
    throw new Error(
      error.message ||
        "Não foi possível contatar a Edge Function. Verifique deploy, secrets (ex.: SENHA_PADRAO) e variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
    );
  }

  return data as T;
}

export function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

/** Alias do nome antigo — evita falha de build se algum arquivo ainda importar `postSupabaseEdgeFunction`. */
export { callSupabaseEdgeFunction as postSupabaseEdgeFunction };
