import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: aprovar-pagamento — usa service_role para garantir que o update persista
// Contorna RLS que pode bloquear em ciclos legados. Exige usuário autenticado.

interface AprovarRequest {
  id: string
  total: number
  isAgente?: boolean
}

interface RegistrarRequest {
  id: string
  isAgente?: boolean
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Max-Age': '86400',
  }
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'Token de autorização ausente' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Sessão inválida ou expirada' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let body: (AprovarRequest | RegistrarRequest) & { action?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const action = (body as { action?: string }).action || 'aprovar'

  try {
    if (action === 'aprovar') {
      const { id, total, isAgente } = body as AprovarRequest
      if (!id || total === undefined || total === null) {
        return new Response(JSON.stringify({ ok: false, error: 'id e total são obrigatórios' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const tb = isAgente ? 'pagamentos_agentes' : 'pagamentos'
      const { data, error } = await supabase
        .from(tb)
        .update({ status: 'a_pagar', total: Number(total) })
        .eq('id', id)
        .select('id')
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'Registro não encontrado' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'registrar') {
      const { id, isAgente } = body as RegistrarRequest
      if (!id) {
        return new Response(JSON.stringify({ ok: false, error: 'id é obrigatório' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const tb = isAgente ? 'pagamentos_agentes' : 'pagamentos'
      const { data, error } = await supabase
        .from(tb)
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('id', id)
        .select('id')
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'Registro não encontrado' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: false, error: 'action inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[aprovar-pagamento] Erro:', e)
    return new Response(JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : 'Erro interno',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
