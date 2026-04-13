/**
 * Repasse comum: Cloudflare Pages → Supabase Edge Function.
 * Timeout no fetch upstream para não segurar o Worker até o limite da plataforma.
 */

const UPSTREAM_MS = 55_000;

/** Cloudflare Pages: às vezes só variáveis sem prefixo VITE_ estão ligadas ao runtime das Functions. */
export type SupabaseProxyContext = {
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
  request: Request;
};

function resolveProxySupabaseEnv(context: SupabaseProxyContext): { url: string; anonKey: string } {
  const url = (context.env.VITE_SUPABASE_URL || context.env.SUPABASE_URL || "").trim();
  const anonKey = (context.env.VITE_SUPABASE_ANON_KEY || context.env.SUPABASE_ANON_KEY || "").trim();
  return { url, anonKey };
}

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
  const { url, anonKey } = resolveProxySupabaseEnv(context);

  if (!url || !anonKey) {
    return new Response(
      JSON.stringify({
        error:
          "Configuração do servidor incompleta (sem URL/chave Supabase no Worker). No Cloudflare Pages → Settings → Environment variables: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou SUPABASE_URL e SUPABASE_ANON_KEY) para Production e para Preview, marcando-as disponíveis para Functions — não basta só o build do Vite.",
      }),
      { status: 500, headers: jsonCorsHeaders() }
    );
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".pages.dev") || host.endsWith(".cloudflareapp.com")) {
      return new Response(
        JSON.stringify({
          error:
            "SUPABASE_URL no proxy aponta para o domínio do Cloudflare Pages. Use a Project URL do Supabase (Settings → API).",
        }),
        { status: 500, headers: jsonCorsHeaders() }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL inválida no proxy (URL malformada)." }),
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
