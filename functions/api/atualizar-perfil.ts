/**
 * Proxy para atualizar-perfil — evita CORS chamando a Edge Function pelo servidor.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse } from "./_supabaseProxy";

export const onRequestPost = async (context: any) => proxyPostToSupabaseEdge(context, "atualizar-perfil");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
