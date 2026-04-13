/**
 * Repasse comum: Cloudflare Pages → Supabase Edge Function.
 * Timeout no fetch upstream para não segurar o Worker até o limite da plataforma.
 */

const UPSTREAM_MS = 55_000;

export type SupabaseProxyContext = {
  env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };
  request: Request;
};

function jsonCorsHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
}

function isAbortError(e: unknown): boolean {
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") {
    return true;
  }
  return e instanceof Error && e.name === "AbortError";
}

export async function proxyPostToSupabaseEdge(
  context: SupabaseProxyContext,
  functionName: string
): Promise<Response> {
  const url = context.env.VITE_SUPABASE_URL;
  const anonKey = context.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(
      JSON.stringify({
        error:
          "Configuração do servidor incompleta (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). No Cloudflare Pages, defina essas variáveis também para o runtime das Functions (Preview e Production), não só no build do Vite.",
      }),
      { status: 500, headers: jsonCorsHeaders() }
    );
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_MS);

  try {
    const body = await context.request.text();
    const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: context.request.headers.get("Authorization") || `Bearer ${anonKey}`,
        Apikey: anonKey,
      },
      body: body || "{}",
      signal: ctrl.signal,
    });

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: jsonCorsHeaders(),
    });
  } catch (e) {
    if (isAbortError(e)) {
      return new Response(
        JSON.stringify({
          error: `Tempo esgotado ao contactar a Edge Function "${functionName}" no Supabase (${UPSTREAM_MS / 1000}s). Confirme deploy da função e secrets (ex.: SENHA_PADRAO).`,
        }),
        { status: 504, headers: jsonCorsHeaders() }
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao chamar Edge Function" }),
      { status: 500, headers: jsonCorsHeaders() }
    );
  } finally {
    clearTimeout(timer);
  }
}

export function supabaseProxyOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-region",
      "Access-Control-Max-Age": "86400",
    },
  });
}
