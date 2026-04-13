/**
 * Proxy para admin-usuario-acao — evita CORS chamando a Edge Function pelo servidor.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse } from "./_supabaseProxy";

export const onRequestPost = async (context: any) => proxyPostToSupabaseEdge(context, "admin-usuario-acao");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
