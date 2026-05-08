/**
 * Formulário público (site institucional) → prospecto no Scout.
 * O browser envia só os dados do candidato; o Worker acrescenta o segredo e chama a Edge Function.
 *
 * Cloudflare Pages → Settings → Environment variables (Functions):
 *   PROSPECTO_SCOUT_FORM_SECRET — igual ao secret em Supabase (Edge Function prospecto-scout-site).
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

type Env = SupabaseProxyContext["env"] & { PROSPECTO_SCOUT_FORM_SECRET?: string };

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const secret = (context.env.PROSPECTO_SCOUT_FORM_SECRET ?? "").trim();
  if (!secret) {
    return new Response(
      JSON.stringify({
        error:
          "Servidor não configurado: defina PROSPECTO_SCOUT_FORM_SECRET nas variáveis de ambiente das Cloudflare Functions (mesmo valor do secret da Edge Function no Supabase).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  return proxyPostToSupabaseEdge(context, "prospecto-scout-site", {
    forwardHeaders: { "x-prospecto-scout-secret": secret },
  });
};

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
