import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://esm.sh/jose@5.2.0'

// Edge Function: admin-usuario-acao — desativar/ativar perfil (sem excluir) e reset de senha padrão + must_change_password
// Usa service_role; apenas admins (JWT) podem chamar.

type Acao = 'desativar' | 'ativar' | 'reset_senha'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

const AUTH_USER_MS = 15_000

function readJwtSecretFromEnv(): string {
  return (Deno.env.get('JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET') ?? '').trim()
}

async function verifySupabaseUserAccessToken(
  accessToken: string,
  jwtSecret: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const tok = accessToken.trim()
  const secret = jwtSecret.trim()
  if (!tok || !secret) {
    return { ok: false, error: 'Token ou JWT secret ausente' }
  }
  try {
    const { payload } = await jwtVerify(tok, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    })
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return { ok: false, error: 'JWT sem sub (usuário)' }
    return { ok: true, userId: sub }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JWT inválido ou expirado'
    return { ok: false, error: msg }
  }
}

async function goTrueGetUserId(
  supabaseUrl: string,
  anonKey: string,
  jwt: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string; status: number }> {
  const base = supabaseUrl.replace(/\/$/, '')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), AUTH_USER_MS)
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: anonKey },
      signal: ctrl.signal,
    })
    const text = await res.text()
    let parsed: Record<string, unknown> = {}
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      const msg =
        (typeof parsed.msg === 'string' && parsed.msg) ||
        (typeof parsed.error_description === 'string' && parsed.error_description) ||
        `HTTP ${res.status}`
      const st = res.status === 401 || res.status === 403 ? res.status : 401
      return { ok: false, error: msg, status: st }
    }
    const id = typeof parsed.id === 'string' ? parsed.id : ''
    if (!id) return { ok: false, error: 'Resposta Auth sem id', status: 401 }
    return { ok: true, userId: id }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: `Validação de sessão excedeu ${AUTH_USER_MS / 1000}s`, status: 504 }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Erro ao validar sessão', status: 500 }
  } finally {
    clearTimeout(t)
  }
}

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

  const whoami = await (async (): Promise<
    { ok: true; userId: string } | { ok: false; error: string; status: number }
  > => {
    const secret = readJwtSecretFromEnv()
    if (secret) {
      const v = await verifySupabaseUserAccessToken(token, secret)
      if (v.ok) return { ok: true, userId: v.userId }
    }
    return await goTrueGetUserId(supabaseUrl, anonKey, token)
  })()
  if (!whoami.ok) {
    return new Response(JSON.stringify({ error: whoami.error }), {
      status: whoami.status >= 400 && whoami.status < 600 ? whoami.status : 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const callerId = whoami.userId

  const supabasePre = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)
  const { data: callerProfile } = await supabasePre
    .from('profiles')
    .select('role')
    .eq('id', callerId)
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

  if (action === 'desativar' && userId === callerId) {
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

  const supabase = supabasePre

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
