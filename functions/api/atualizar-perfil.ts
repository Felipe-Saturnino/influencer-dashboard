/**
 * Proxy para atualizar-perfil — evita CORS chamando a Edge Function pelo servidor.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

export const onRequestPost = async (context: SupabaseProxyContext) =>
  proxyPostToSupabaseEdge(context, "atualizar-perfil");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
