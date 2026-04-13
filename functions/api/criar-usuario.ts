/**
 * Proxy para criar-usuario — evita CORS chamando a Edge Function pelo servidor.
 * O browser chama /api/criar-usuario (mesma origem), e esta função repassa ao Supabase.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse } from "./_supabaseProxy";

export const onRequestPost = async (context: any) => proxyPostToSupabaseEdge(context, "criar-usuario");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
