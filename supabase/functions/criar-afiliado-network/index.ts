import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Cria utilizador Afiliado + influencer_perfil + vínculos a partir de um card em afiliados_network. */

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

type SupabaseSvc = ReturnType<typeof createClient>

const AUTH_ADMIN_MS = 45_000

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
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
  const t = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
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
      /* ignore */
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
      return { error: `Auth Admin excedeu ${AUTH_ADMIN_MS / 1000}s.` }
    }
    return { error: e instanceof Error ? e.message : 'Falha ao contactar Auth Admin' }
  } finally {
    clearTimeout(t)
  }
}

async function goTrueAdminDeleteUser(supabaseUrl: string, serviceRoleKey: string, userId: string): Promise<void> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
  try {
    await fetch(url, { method: 'DELETE', headers: authAdminHeaders(serviceRoleKey), signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function enviarEmailBoasVindas(to: string, nome: string, senhaPadrao: string, loginUrl: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[criar-afiliado-network] RESEND_API_KEY não configurada.')
    return
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Bem-vindo ao Data Intelligence</h2>
      </div>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; color: #333;">Olá, <strong>${nome}</strong>!</p>
        <p style="margin: 0 0 20px; color: #333;">Sua conta de <strong>afiliado</strong> foi criada. Use as credenciais abaixo:</p>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666;">E-mail</p>
          <p style="margin: 0 0 16px; font-weight: 600;">${to}</p>
          <p style="margin: 0 0 8px; font-size: 12px; color: #666;">Senha temporária</p>
          <p style="margin: 0; font-weight: 600; font-family: monospace;">${senhaPadrao}</p>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404; font-size: 13px; font-weight: 600;">Por segurança, você será obrigado a trocar a senha no primeiro acesso.</p>
        </div>
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Acessar a plataforma</a>
      </div>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Data Intelligence <onboarding@resend.dev>',
      to: [to],
      subject: 'Sua conta de afiliado foi criada',
      html,
    }),
  })
  if (!res.ok) console.error('[criar-afiliado-network] Resend:', await res.text())
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const senhaPadrao = Deno.env.get('SENHA_PADRAO') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
  if (!senhaPadrao || senhaPadrao.length < 8) {
    return new Response(JSON.stringify({ error: 'SENHA_PADRAO inválida no servidor.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  let body: { network_id?: string; loginUrl?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const networkId = (body.network_id ?? '').trim()
  const loginUrl = (body.loginUrl ?? '').trim() || 'https://acquisition-hub.vercel.app'

  if (!networkId) {
    return new Response(JSON.stringify({ error: 'network_id é obrigatório.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  const { data: row, error: fetchErr } = await supabase
    .from('afiliados_network')
    .select('id, nome, email, telefone, operacao, operadora_slug, afiliado_user_id')
    .eq('id', networkId)
    .maybeSingle()

  if (fetchErr || !row) {
    return new Response(JSON.stringify({ error: fetchErr?.message ?? 'Card não encontrado.' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const r = row as {
    id: string
    nome: string
    email: string | null
    telefone: string | null
    operacao: string | null
    operadora_slug: string | null
    afiliado_user_id: string | null
  }

  if (r.afiliado_user_id) {
    return new Response(JSON.stringify({ error: 'Já existe um utilizador afiliado vinculado a este card.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const nome = (r.nome ?? '').trim()
  const email = (r.email ?? '').trim().toLowerCase()
  const slug = (r.operadora_slug ?? '').trim()

  if (!nome) {
    return new Response(JSON.stringify({ error: 'Nome é obrigatório no card.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
  if (!email) {
    return new Response(JSON.stringify({ error: 'E-mail é obrigatório para criar o utilizador afiliado.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Operadora é obrigatória no card para criar o vínculo.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: opOk } = await supabase.from('operadoras').select('slug').eq('slug', slug).maybeSingle()
  if (!opOk?.slug) {
    return new Response(JSON.stringify({ error: 'Operadora inválida ou inexistente.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const { data: dup } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (dup?.id) {
    return new Response(JSON.stringify({ error: 'Já existe um utilizador com este e-mail.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const created = await goTrueAdminCreateUser(supabaseUrl, serviceRoleKey, email, senhaPadrao, nome, 'afiliado')
    if ('error' in created) {
      return new Response(JSON.stringify({ error: created.error }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const uid = created.uid

    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: uid,
        name: nome,
        email,
        role: 'afiliado',
        must_change_password: true,
      },
      { onConflict: 'id' },
    )

    if (profileErr) {
      await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { error: scopeErr } = await supabase.from('user_scopes').insert({
      user_id: uid,
      scope_type: 'operadora',
      scope_ref: slug,
    })
    if (scopeErr) {
      await supabase.from('profiles').delete().eq('id', uid)
      await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
      return new Response(JSON.stringify({ error: scopeErr.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const agora = new Date().toISOString()
    const telefone = (r.telefone ?? '').trim() || null
    const operacao = (r.operacao ?? '').trim() || null

    const { error: perfilErr } = await supabase.from('influencer_perfil').upsert(
      {
        id: uid,
        nome_artistico: nome,
        nome_completo: nome,
        telefone,
        operacao,
        status: 'ativo',
        cache_hora: 0,
        updated_at: agora,
      },
      { onConflict: 'id' },
    )
    if (perfilErr) {
      await supabase.from('user_scopes').delete().eq('user_id', uid)
      await supabase.from('profiles').delete().eq('id', uid)
      await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
      return new Response(JSON.stringify({ error: perfilErr.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { error: ioErr } = await supabase.from('influencer_operadoras').upsert(
      { influencer_id: uid, operadora_slug: slug, ativo: true },
      { onConflict: 'influencer_id,operadora_slug' },
    )
    if (ioErr) {
      await supabase.from('influencer_perfil').delete().eq('id', uid)
      await supabase.from('user_scopes').delete().eq('user_id', uid)
      await supabase.from('profiles').delete().eq('id', uid)
      await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
      return new Response(JSON.stringify({ error: ioErr.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const { error: linkErr } = await supabase
      .from('afiliados_network')
      .update({ afiliado_user_id: uid, updated_at: agora })
      .eq('id', networkId)

    if (linkErr) {
      console.error('[criar-afiliado-network] Falha ao vincular card:', linkErr.message)
    }

    void enviarEmailBoasVindas(email, nome, senhaPadrao, loginUrl).catch((e) =>
      console.error('[criar-afiliado-network] E-mail:', e),
    )

    return new Response(JSON.stringify({ success: true, userId: uid }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[criar-afiliado-network]', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro interno' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
