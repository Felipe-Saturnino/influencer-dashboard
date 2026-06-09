import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { enviarEmailRecuperacaoSenhaConta } from './enviarRecuperacaoSenha.ts'
import { DEFAULT_LOGIN_URL } from './transacionalShell.ts'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

type Status = 'success' | 'not_found' | 'inactive' | 'email_error' | 'config_error'

interface Body {
  email?: string
  loginUrl?: string
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
  const senhaPadrao = Deno.env.get('SENHA_PADRAO') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ status: 'config_error' satisfies Status }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!senhaPadrao || senhaPadrao.length < 8) {
    return new Response(JSON.stringify({ status: 'config_error' satisfies Status }), {
      status: 500,
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

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return new Response(JSON.stringify({ error: 'E-mail inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const loginUrl = (body.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, name, email, ativo')
    .eq('email', email)
    .maybeSingle()

  if (profileErr) {
    console.error('[recuperar-senha] Erro ao buscar perfil:', profileErr.message)
    return new Response(JSON.stringify({ status: 'config_error' satisfies Status }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!profile) {
    return new Response(JSON.stringify({ status: 'not_found' satisfies Status }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (profile.ativo === false) {
    return new Response(JSON.stringify({ status: 'inactive' satisfies Status }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const userId = profile.id as string
  const nome = (profile.name as string | null)?.trim() || email

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    password: senhaPadrao,
  })
  if (authErr) {
    console.error('[recuperar-senha] Erro Auth:', authErr.message)
    return new Response(JSON.stringify({ status: 'config_error' satisfies Status }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { error: profileUpdErr } = await supabase
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', userId)
  if (profileUpdErr) {
    console.error('[recuperar-senha] Erro ao marcar must_change_password:', profileUpdErr.message)
    return new Response(JSON.stringify({ status: 'config_error' satisfies Status }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const mail = await enviarEmailRecuperacaoSenhaConta({
    supabaseUrl,
    supabase,
    to: email,
    nome,
    senhaTemporaria: senhaPadrao,
    loginUrl,
  })

  if (!mail.ok) {
    console.error('[recuperar-senha] Falha Resend:', mail.error)
    return new Response(JSON.stringify({ status: 'email_error' satisfies Status }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ status: 'success' satisfies Status }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
