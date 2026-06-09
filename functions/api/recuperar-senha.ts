import { proxyPostToSupabaseEdge, supabaseProxyOptionsResponse, type SupabaseProxyContext } from "./_supabaseProxy";

export const onRequestPost = async (context: SupabaseProxyContext) =>
  proxyPostToSupabaseEdge(context, "recuperar-senha");

export const onRequestOptions = async () => supabaseProxyOptionsResponse();
