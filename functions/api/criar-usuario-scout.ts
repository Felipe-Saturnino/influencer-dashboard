/**
 * Proxy para criar-usuario-scout — cria influencer a partir do Scout.
 * O browser chama /api/criar-usuario-scout (mesma origem), e esta função repassa ao Supabase.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse } from "./_supabaseProxy";

export const onRequestPost = async (context: any) => proxyPostToSupabaseEdge(context, "criar-usuario-scout");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
