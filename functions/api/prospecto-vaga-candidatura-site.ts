/**
 * Formulário Carreiras (WordPress) → candidatura externa em RH → Vagas.
 * O browser envia multipart; o Worker acrescenta o segredo e chama a Edge Function.
 *
 * Cloudflare Pages → Settings → Environment variables (Functions):
 *   PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET — igual ao secret em Supabase.
 */

import {
  proxyMultipartPostToSupabaseEdge,
  supabaseProxyOptionsResponse,
  type SupabaseProxyContext,
} from "./_supabaseProxy";

type Env = SupabaseProxyContext["env"] & { PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET?: string };

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const secret = (context.env.PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET ?? "").trim();
  if (!secret) {
    return new Response(
      JSON.stringify({
        error:
          "Servidor não configurado: defina PROSPECTO_VAGA_CANDIDATURA_FORM_SECRET nas variáveis de ambiente das Cloudflare Functions (mesmo valor do secret da Edge Function no Supabase).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  return proxyMultipartPostToSupabaseEdge(context, "prospecto-vaga-candidatura-site", {
    forwardHeaders: { "x-prospecto-vaga-candidatura-secret": secret },
    timeoutMs: 120_000,
  });
};

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
