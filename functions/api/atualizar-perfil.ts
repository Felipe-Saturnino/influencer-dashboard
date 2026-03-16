/**
 * Proxy para atualizar-perfil — evita CORS chamando a Edge Function pelo servidor.
 */

export const onRequestPost = async (context: any) => {
  const url = context.env.VITE_SUPABASE_URL
  const anonKey = context.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return new Response(
      JSON.stringify({ error: "Configuração do servidor incompleta (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await context.request.text()
    const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/atualizar-perfil`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": context.request.headers.get("Authorization") || `Bearer ${anonKey}`,
        "Apikey": anonKey,
      },
      body: body || "{}",
    })

    const data = await res.text()
    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao chamar Edge Function" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Max-Age": "86400",
    },
  })
}
