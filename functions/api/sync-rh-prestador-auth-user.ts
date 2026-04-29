/**
 * Proxy para sync-rh-prestador-auth-user — evita CORS chamando a Edge Function pelo servidor.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

export const onRequestPost = async (context: SupabaseProxyContext) =>
  proxyPostToSupabaseEdge(context, "sync-rh-prestador-auth-user");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
