import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: admin-usuario-acao — desativar/ativar perfil (sem excluir) e reset de senha padrão + must_change_password
// Usa service_role; apenas admins (JWT) podem chamar.

type Acao = 'desativar' | 'ativar' | 'reset_senha'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

interface Body {
  userId?: string
  action?: string
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Max-Age': '86400',
  }
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const senhaPadrao = Deno.env.get('SENHA_PADRAO') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token de autorização ausente' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user: caller } } = await supabaseAnon.auth.getUser(token)
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: callerProfile } = await supabaseAnon
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem executar esta ação' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const userId = (body.userId ?? '').trim()
  const action = body.action as Acao | undefined

  const acoesValidas: Acao[] = ['desativar', 'ativar', 'reset_senha']
  if (!userId || !action || !acoesValidas.includes(action)) {
    return new Response(
      JSON.stringify({ error: 'userId e action (desativar | ativar | reset_senha) são obrigatórios' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  if (action === 'desativar' && userId === caller.id) {
    return new Response(JSON.stringify({ error: 'Não é possível desativar sua própria conta.' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'reset_senha' && (!senhaPadrao || senhaPadrao.length < 8)) {
    return new Response(
      JSON.stringify({
        error:
          'SENHA_PADRAO deve ter no mínimo 8 caracteres. Configure no Supabase → Edge Functions → Secrets.',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  try {
    if (action === 'desativar') {
      const { error } = await supabase.from('profiles').update({ ativo: false }).eq('id', userId)
      if (error) {
        return new Response(JSON.stringify({ error: `Erro ao desativar: ${error.message}` }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    } else if (action === 'ativar') {
      const { error } = await supabase.from('profiles').update({ ativo: true }).eq('id', userId)
      if (error) {
        return new Response(JSON.stringify({ error: `Erro ao ativar: ${error.message}` }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    } else if (action === 'reset_senha') {
      const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
        password: senhaPadrao,
      })
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message ?? 'Erro ao redefinir senha no Auth' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', userId)
      if (profileErr) {
        return new Response(JSON.stringify({ error: `Senha atualizada, mas perfil: ${profileErr.message}` }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[admin-usuario-acao] Erro:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro interno' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
