/**
 * Proxy para criar-afiliado-network — cria utilizador Afiliado a partir de um card Network.
 */

import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

export const onRequestPost = async (context: SupabaseProxyContext) =>
  proxyPostToSupabaseEdge(context, "criar-afiliado-network");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
