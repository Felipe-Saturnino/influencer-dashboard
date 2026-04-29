import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://esm.sh/jose@5.2.0'

/**
 * Edge: sync-rh-prestador-auth-user
 * Cria ou atualiza usuário Auth + profile (role prestador) + user_scopes (prestador_tipo)
 * a partir de rh_funcionarios quando email_spin está preenchido.
 * Chamada após salvar na Gestão de Prestadores (JWT do operador; permissão rh_funcionarios).
 */

type PrestadorTipoSlug = 'customer_service' | 'game_presenter' | 'shuffler' | 'escritorio'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

type SupabaseSvc = ReturnType<typeof createClient>

const AUTH_ADMIN_MS = 45_000
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
  if (!tok || !secret) return { ok: false, error: 'Token ou JWT secret ausente' }
  try {
    const { payload } = await jwtVerify(tok, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return { ok: false, error: 'JWT sem sub (usuário)' }
    return { ok: true, userId: sub }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JWT inválido ou expirado' }
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

function authAdminHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  }
}

async function goTrueAdminCreateUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  name: string,
  perfilRole: string,
): Promise<{ uid: string } | { error: string }> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/auth/v1/admin/users`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authAdminHeaders(serviceRoleKey),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: perfilRole },
      }),
      signal: ctrl.signal,
    })
    const text = await res.text()
    let parsed: Record<string, unknown> = {}
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      /* */
    }
    if (!res.ok) {
      const msg =
        (typeof parsed.msg === 'string' && parsed.msg) ||
        (typeof parsed.message === 'string' && parsed.message) ||
        (typeof parsed.error_description === 'string' && parsed.error_description) ||
        `HTTP ${res.status}: ${text.slice(0, 240)}`
      return { error: msg }
    }
    const nested = parsed.user as { id?: string } | undefined
    const topId = typeof parsed.id === 'string' ? parsed.id : undefined
    const uid = topId ?? nested?.id
    if (!uid) return { error: 'Resposta inválida do Auth (sem id).' }
    return { uid }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { error: `Auth Admin excedeu ${AUTH_ADMIN_MS / 1000}s` }
    }
    return { error: e instanceof Error ? e.message : 'Falha ao contactar Auth Admin' }
  } finally {
    clearTimeout(timer)
  }
}

async function goTrueAdminDeleteUser(supabaseUrl: string, serviceRoleKey: string, userId: string): Promise<void> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
  try {
    await fetch(url, { method: 'DELETE', headers: authAdminHeaders(serviceRoleKey), signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

function primeiroUltimoNome(nomeCompleto: string): string {
  const parts = nomeCompleto.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  return `${parts[0]!} ${parts[parts.length - 1]!}`
}

function normTimeNome(s: string | null | undefined): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

function prestadorTipoSlugFromRow(area: string | null | undefined, timeNome: string | null | undefined): PrestadorTipoSlug {
  const a = String(area ?? '').trim().toLowerCase()
  if (a !== 'estudio') return 'escritorio'
  const t = normTimeNome(timeNome)
  if (t === 'game presenter') return 'game_presenter'
  if (t === 'shuffler') return 'shuffler'
  if (t === 'customer service') return 'customer_service'
  return 'escritorio'
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

function okPerm(v: string | null | undefined): boolean {
  return v === 'sim' || v === 'proprios'
}

async function callerPodeSyncPrestador(supabase: SupabaseSvc, callerId: string): Promise<boolean> {
  const { data: p } = await supabase.from('profiles').select('role').eq('id', callerId).maybeSingle()
  const role = String(p?.role ?? '').trim()
  if (role === 'admin') return true
  if (!role) return false
  const { data: rp } = await supabase
    .from('role_permissions')
    .select('can_editar, can_criar')
    .eq('role', role)
    .eq('page_key', 'rh_funcionarios')
    .maybeSingle()
  if (!rp) return false
  return okPerm(rp.can_editar as string) || okPerm(rp.can_criar as string)
}

async function enviarEmailBoasVindas(to: string, nome: string, senhaPadrao: string, loginUrl: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[sync-rh-prestador-auth-user] RESEND_API_KEY não configurada — e-mail não enviado.')
    return
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Bem-vindo ao Data Intelligence</h2>
      </div>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; color: #333;">Olá, <strong>${nome}</strong>!</p>
        <p style="margin: 0 0 20px; color: #333;">Sua conta foi criada. Use as credenciais abaixo para acessar:</p>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">E-mail</p>
          <p style="margin: 0 0 16px; font-weight: 600; color: #333;">${to}</p>
          <p style="margin: 0 0 8px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Senha temporária</p>
          <p style="margin: 0; font-weight: 600; color: #333; font-family: monospace;">${senhaPadrao}</p>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404; font-size: 13px; font-weight: 600;">Por segurança, você será obrigado a trocar a senha no primeiro acesso.</p>
        </div>
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Acessar a plataforma</a>
      </div>
    </div>
  `
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Data Intelligence <onboarding@resend.dev>',
      to: [to],
      subject: 'Sua conta no Data Intelligence foi criada',
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`[sync-rh-prestador-auth-user] Falha Resend: ${res.status}`, err)
  }
}

interface Body {
  rhFuncionarioId?: string
  loginUrl?: string
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
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
  if (!senhaPadrao || senhaPadrao.length < 8) {
    return new Response(
      JSON.stringify({
        error: 'SENHA_PADRAO deve ter no mínimo 8 caracteres (Secrets da Edge Function).',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Token de autorização ausente' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const token = authHeader.replace('Bearer ', '')

  const whoami = await (async (): Promise<{ ok: true; userId: string } | { ok: false; error: string; status: number }> => {
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

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const rhId = String(body.rhFuncionarioId ?? '').trim()
  if (!rhId) {
    return new Response(JSON.stringify({ error: 'rhFuncionarioId é obrigatório' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const loginUrl = (body.loginUrl ?? '').trim() || 'https://acquisition-hub.vercel.app'

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  const pode = await callerPodeSyncPrestador(supabase, whoami.userId)
  if (!pode) {
    return new Response(JSON.stringify({ error: 'Sem permissão para sincronizar usuário de prestador' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: row, error: rowErr } = await supabase
    .from('rh_funcionarios')
    .select('id, nome, email_spin, area_atuacao, org_time_id')
    .eq('id', rhId)
    .maybeSingle()

  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: rowErr?.message ?? 'Prestador não encontrado' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const emailSpin = String(row.email_spin ?? '').trim().toLowerCase()
  if (!emailSpin || !emailSpin.includes('@')) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'sem_email_spin' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: perfilComEmail } = await supabase.from('profiles').select('id').eq('email', emailSpin).maybeSingle()
  if (perfilComEmail?.id) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'usuario_email_ja_existe' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let timeNome: string | null = null
  if (row.org_time_id) {
    const { data: tr } = await supabase.from('rh_org_times').select('nome').eq('id', row.org_time_id).maybeSingle()
    timeNome = (tr as { nome?: string } | null)?.nome ?? null
  }

  const nomePlataforma = primeiroUltimoNome(String(row.nome ?? '')).trim() || emailSpin.split('@')[0] || 'Prestador'
  const tipoSlug = prestadorTipoSlugFromRow(row.area_atuacao as string, timeNome)

  const created = await goTrueAdminCreateUser(
    supabaseUrl,
    serviceRoleKey,
    emailSpin,
    senhaPadrao,
    nomePlataforma,
    'prestador',
  )
  if ('error' in created) {
    const dup = /already|registered|exists|duplicate/i.test(created.error)
    if (dup) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'usuario_email_ja_existe_auth' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: created.error }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const uid = created.uid

  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: uid,
      name: nomePlataforma,
      email: emailSpin,
      role: 'prestador',
      must_change_password: true,
    },
    { onConflict: 'id' },
  )

  if (profileErr) {
    await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
    return new Response(JSON.stringify({ error: profileErr.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { error: scopeErr } = await supabase.from('user_scopes').insert({
    user_id: uid,
    scope_type: 'prestador_tipo',
    scope_ref: tipoSlug,
  })
  if (scopeErr) {
    await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
    await supabase.from('profiles').delete().eq('id', uid)
    return new Response(JSON.stringify({ error: `Erro ao salvar área de atuação: ${scopeErr.message}` }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  void enviarEmailBoasVindas(emailSpin, nomePlataforma, senhaPadrao, loginUrl).catch((e) =>
    console.error('[sync-rh-prestador-auth-user] e-mail:', e)
  )

  return new Response(JSON.stringify({ success: true, created: true, userId: uid }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
