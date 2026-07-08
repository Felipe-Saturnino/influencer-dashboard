/**
 * Formulário público (site institucional) → chamado em Customer Success → Atendimento.
 * O browser envia só os dados; o Worker acrescenta o segredo e chama a Edge Function.
 *
 * Cloudflare Pages → Environment variables (Functions):
 *   CS_ATENDIMENTO_FORM_SECRET — igual ao secret em Supabase (Edge Function prospecto-cs-atendimento-site).
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

type Env = SupabaseProxyContext["env"] & { CS_ATENDIMENTO_FORM_SECRET?: string };

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const secret = (context.env.CS_ATENDIMENTO_FORM_SECRET ?? "").trim();
  if (!secret) {
    return new Response(
      JSON.stringify({
        error:
          "Servidor não configurado: defina CS_ATENDIMENTO_FORM_SECRET nas variáveis de ambiente das Cloudflare Functions (mesmo valor do secret da Edge Function no Supabase).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  return proxyPostToSupabaseEdge(context, "prospecto-cs-atendimento-site", {
    forwardHeaders: { "x-cs-atendimento-secret": secret },
  });
};

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
