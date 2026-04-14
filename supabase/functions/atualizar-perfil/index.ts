import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://esm.sh/jose@5.2.0'

// Edge Function: atualizar-perfil — usa service_role para garantir que o update persista
// Apenas admins podem chamar (verificado via JWT)

interface AtualizarPerfilRequest {
  userId: string
  name: string
  role: string
  scopeInfluencers?: string[]
  scopeOperadoras?: string[]
  scopePares?: string[]
  scopeGestorTipos?: string[]
}

const ROLES_BLOQUEADOS = ['admin', 'gestor']

const GESTOR_TIPO_SLUGS = ['operacoes', 'marketing', 'afiliados', 'geral'] as const

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

const AUTH_USER_MS = 15_000

/** HS256 + exp, sem auth.sessions. Secret: JWT_SECRET (= JWT Secret do painel API). */
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

/** GET /auth/v1/user — evita supabase.auth.getUser() no Edge (isolate pendurado). */
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
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: anonKey,
      },
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
    if (!id) {
      return { ok: false, error: 'Resposta Auth sem id', status: 401 }
    }
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

  /** Preferir verificação HS256 local (não depende de auth.sessions). Fallback: GET /user. */
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem alterar perfis' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: AtualizarPerfilRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { userId, name, role, scopeInfluencers, scopeOperadoras, scopePares, scopeGestorTipos } = body
  const toStrArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const scopeInfluencersArr = toStrArr(scopeInfluencers)
  const scopeOperadorasArr = toStrArr(scopeOperadoras)
  const scopeParesArr = toStrArr(scopePares)
  const scopeGestorTiposArr = toStrArr(scopeGestorTipos).filter((s) =>
    (GESTOR_TIPO_SLUGS as readonly string[]).includes(s)
  )

  if (!userId?.trim() || !name?.trim() || !role?.trim()) {
    return new Response(JSON.stringify({ error: 'userId, name e role são obrigatórios' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const bloqueado = ROLES_BLOQUEADOS.includes(role)

  if (role === 'influencer' && scopeOperadorasArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos uma operadora para o influencer' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (role === 'operador' && scopeOperadorasArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos uma operadora para o operador' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (role === 'agencia' && scopeParesArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos um par influencer+operadora para a agência' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (role === 'gestor' && scopeGestorTiposArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos um tipo de gestor' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: updatedProfile, error: profileErr } = await supabase
      .from('profiles')
      .update({ name: name.trim(), role })
      .eq('id', userId)
      .select('id')

    if (profileErr) {
      return new Response(JSON.stringify({ error: `Erro ao atualizar perfil: ${profileErr.message}` }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!updatedProfile?.length) {
      return new Response(
        JSON.stringify({ error: 'Nenhum perfil encontrado para este userId (nada foi atualizado).' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { error: delScopesErr } = await supabase.from('user_scopes').delete().eq('user_id', userId)
    if (delScopesErr) {
      return new Response(
        JSON.stringify({ error: `Erro ao limpar escopos: ${delScopesErr.message}` }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (role === 'gestor') {
      const novasTipos = scopeGestorTiposArr.map((scope_ref) => ({
        user_id: userId,
        scope_type: 'gestor_tipo',
        scope_ref,
      }))
      const { error: scopeErr } = await supabase.from('user_scopes').insert(novasTipos)
      if (scopeErr) {
        return new Response(
          JSON.stringify({
            error: `Erro ao salvar tipos de gestor: ${scopeErr.message}. Verifique a migration user_scopes (scope_type gestor_tipo).`,
          }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
    } else if (!bloqueado) {
      const novasLinhas: { user_id: string; scope_type: string; scope_ref: string }[] = []
      if (role === 'agencia') {
        scopeParesArr.forEach((par) => novasLinhas.push({ user_id: userId, scope_type: 'agencia_par', scope_ref: par }))
      } else {
        scopeInfluencersArr.forEach((ref) => novasLinhas.push({ user_id: userId, scope_type: 'influencer', scope_ref: ref }))
        scopeOperadorasArr.forEach((ref) => novasLinhas.push({ user_id: userId, scope_type: 'operadora', scope_ref: ref }))
      }
      if (novasLinhas.length > 0) {
        const { error: insScopeErr } = await supabase.from('user_scopes').insert(novasLinhas)
        if (insScopeErr) {
          return new Response(
            JSON.stringify({ error: `Erro ao salvar escopos: ${insScopeErr.message}` }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }

      if (role === 'influencer') {
        const { error: perfilErr } = await supabase.from('influencer_perfil').upsert(
          {
            id: userId,
            nome_artistico: name.trim(),
            nome_completo: name.trim(),
            status: 'ativo',
            cache_hora: 0,
          },
          { onConflict: 'id', ignoreDuplicates: false },
        )
        if (perfilErr) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar influencer_perfil: ${perfilErr.message}` }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
        const { error: delIoErr } = await supabase.from('influencer_operadoras').delete().eq('influencer_id', userId)
        if (delIoErr) {
          return new Response(
            JSON.stringify({ error: `Erro ao limpar influencer_operadoras: ${delIoErr.message}` }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
        if (scopeOperadorasArr.length > 0) {
          const linhasIo = scopeOperadorasArr.map((slug) => ({
            influencer_id: userId,
            operadora_slug: slug,
            ativo: true,
          }))
          const { error: insIoErr } = await supabase.from('influencer_operadoras').insert(linhasIo)
          if (insIoErr) {
            return new Response(
              JSON.stringify({ error: `Erro ao salvar influencer_operadoras: ${insIoErr.message}` }),
              { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[atualizar-perfil] Erro:', e)
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : 'Erro interno ao atualizar perfil',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
