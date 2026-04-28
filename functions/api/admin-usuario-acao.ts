/**
 * Proxy para admin-usuario-acao — evita CORS chamando a Edge Function pelo servidor.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

export const onRequestPost = async (context: SupabaseProxyContext) =>
  proxyPostToSupabaseEdge(context, "admin-usuario-acao");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
