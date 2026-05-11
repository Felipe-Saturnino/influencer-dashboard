/**
 * Formulário público (site) → cadastro em Afiliados → Network.
 * O browser envia só os dados; o Worker acrescenta o segredo e chama a Edge Function.
 *
 * Cloudflare Pages → Environment variables (Functions):
 *   PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET — igual ao secret em Supabase (Edge Function prospecto-afiliados-network-site).
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

type Env = SupabaseProxyContext["env"] & { PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET?: string };

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const secret = (context.env.PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET ?? "").trim();
  if (!secret) {
    return new Response(
      JSON.stringify({
        error:
          "Servidor não configurado: defina PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET nas variáveis de ambiente das Cloudflare Functions (mesmo valor do secret da Edge Function no Supabase).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  return proxyPostToSupabaseEdge(context, "prospecto-afiliados-network-site", {
    forwardHeaders: { "x-prospecto-afiliados-network-secret": secret },
  });
};

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
