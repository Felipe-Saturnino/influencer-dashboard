import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: criar-usuario — senha padrão + e-mail de boas-vindas + troca obrigatória no primeiro login

// ── Tipos ────────────────────────────────────────────────────────────────

interface CriarUsuarioRequest {
  email: string
  nome: string
  role: string
  scopeInfluencers: string[]
  scopeOperadoras: string[]
  scopePares: string[]
  scopeGestorTipos?: string[]
  loginUrl?: string  // URL da aplicação para o link no e-mail (ex: window.location.origin)
}

const ROLES_BLOQUEADOS = ['admin', 'gestor']  // Admin sem escopo; gestor usa tipos

const GESTOR_TIPO_SLUGS = ['operacoes', 'marketing', 'afiliados', 'geral'] as const

/** Evita timers/listeners de Auth no cliente service_role (comum em Edge Functions travarem o isolate). */
const supabaseServiceOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const

type SupabaseSvc = ReturnType<typeof createClient>

type ScoutRowForSync = {
  id: string
  user_id: string | null
  operadora_slug: string | null
  cache_negociado: unknown
}

/** Mesma lógica que criar-usuario-scout (cachê vindo do Scout). */
function parseCacheNumeric(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, v) : 0
  const s = String(v).trim()
  if (!s) return 0
  let n = Number(s)
  if (!Number.isFinite(n) && s.includes(',')) {
    n = Number(s.replace(/\./g, '').replace(',', '.'))
  }
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Prospecto sem outro usuário vinculado (para não colidir contas). */
async function buscarScoutUsavelPorEmail(
  supabase: SupabaseSvc,
  emailLower: string,
): Promise<ScoutRowForSync | null> {
  const e = emailLower.trim().toLowerCase()
  if (!e) return null
  const { data, error } = await supabase
    .from('scout_influencer')
    .select('id, user_id, operadora_slug, cache_negociado, updated_at')
    .ilike('email', e)
    .order('updated_at', { ascending: false })
  if (error || !data?.length) return null
  for (const raw of data) {
    const r = raw as ScoutRowForSync
    if (r.user_id == null || r.user_id === '') return r
  }
  return null
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

// ── Enviar e-mail de boas-vindas via Resend ───────────────────────────────

async function enviarEmailBoasVindas(
  to: string,
  nome: string,
  senhaPadrao: string,
  loginUrl: string
): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[criar-usuario] RESEND_API_KEY não configurada — e-mail não enviado.')
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
          <p style="margin: 0; color: #856404; font-size: 13px; font-weight: 600;">
            ⚠️ Por segurança, você será obrigado a trocar a senha no primeiro acesso.
          </p>
        </div>

        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Acessar a plataforma
        </a>
      </div>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Data Intelligence <onboarding@resend.dev>',
      to: [to],
      subject: 'Sua conta no Data Intelligence foi criada',
      html,
    }),
  })
  if (res.ok) {
    console.log('[criar-usuario] E-mail de boas-vindas enviado para', to)
  } else {
    const err = await res.text()
    console.error(`[criar-usuario] Falha Resend: ${res.status}`, err)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────

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
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!senhaPadrao || senhaPadrao.length < 8) {
    return new Response(JSON.stringify({
      error: 'SENHA_PADRAO deve ter no mínimo 8 caracteres. Configure no Supabase → Settings → Edge Functions → Secrets.',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  let body: CriarUsuarioRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { email, nome, role, scopeInfluencers, scopeOperadoras, scopePares, scopeGestorTipos } = body
  const loginUrl = (body.loginUrl ?? '').trim() || 'https://acquisition-hub.vercel.app' // fallback legado; envie loginUrl a partir do app

  // Garantir arrays (evita "forEach is not a function" quando vem string/objeto/undefined)
  const toStrArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const scopeInfluencersArr = toStrArr(scopeInfluencers)
  let scopeOperadorasArr = toStrArr(scopeOperadoras)
  const scopeParesArr = toStrArr(scopePares)
  const scopeGestorTiposArr = toStrArr(scopeGestorTipos).filter((s) =>
    (GESTOR_TIPO_SLUGS as readonly string[]).includes(s)
  )

  if (!email?.trim() || !nome?.trim() || !role?.trim()) {
    return new Response(JSON.stringify({ error: 'E-mail, nome e perfil são obrigatórios' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let influencerScoutRow: ScoutRowForSync | null = null
  if (role === 'influencer') {
    influencerScoutRow = await buscarScoutUsavelPorEmail(supabase, email.trim().toLowerCase())
    const slug = String(influencerScoutRow?.operadora_slug ?? '').trim()
    if (slug && !scopeOperadorasArr.includes(slug)) {
      const { data: op } = await supabase.from('operadoras').select('slug').eq('slug', slug).maybeSingle()
      if (op?.slug) {
        scopeOperadorasArr = [...scopeOperadorasArr, slug]
      }
    }
  }

  const bloqueado = ROLES_BLOQUEADOS.includes(role)

  // Validações por role
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
    // 1. Criar usuário no Auth com senha padrão
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senhaPadrao,
      email_confirm: true,
      user_metadata: { name: nome.trim() },
    })

    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: authErr?.message ?? 'Erro ao criar usuário' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const uid = authData.user.id

    // 2. Upsert profile (trigger já pode ter inserido; atualiza role e must_change_password)
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: uid,
        name: nome.trim(),
        email: email.trim().toLowerCase(),
        role,
        must_change_password: true,
      },
      { onConflict: 'id' }
    )

    if (profileErr) {
      // Rollback: excluir usuário do Auth se profile falhou
      await supabase.auth.admin.deleteUser(uid)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 3. Escopos (user_scopes)
    if (role === 'gestor') {
      const novasTipos = scopeGestorTiposArr.map((scope_ref) => ({
        user_id: uid,
        scope_type: 'gestor_tipo',
        scope_ref,
      }))
      const { error: scopeErr } = await supabase.from('user_scopes').insert(novasTipos)
      if (scopeErr) {
        await supabase.auth.admin.deleteUser(uid)
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
        scopeParesArr.forEach((par) =>
          novasLinhas.push({ user_id: uid, scope_type: 'agencia_par', scope_ref: par })
        )
      } else {
        const influenciadoresUnicos = [...new Set(scopeInfluencersArr)]
        const operadorasUnicas = [...new Set(scopeOperadorasArr)]
        influenciadoresUnicos.forEach((ref) =>
          novasLinhas.push({ user_id: uid, scope_type: 'influencer', scope_ref: ref })
        )
        operadorasUnicas.forEach((ref) =>
          novasLinhas.push({ user_id: uid, scope_type: 'operadora', scope_ref: ref })
        )
      }
      if (novasLinhas.length > 0) {
        const { error: scopeInsertErr } = await supabase.from('user_scopes').insert(novasLinhas)
        if (scopeInsertErr) {
          await supabase.auth.admin.deleteUser(uid)
          return new Response(
            JSON.stringify({ error: `Erro ao salvar escopos: ${scopeInsertErr.message}` }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }

      // 4. Se influencer: influencer_perfil e influencer_operadoras
      if (role === 'influencer') {
        const cacheHoraScout = influencerScoutRow
          ? parseCacheNumeric(influencerScoutRow.cache_negociado)
          : 0
        await supabase.from('influencer_perfil').upsert(
          {
            id: uid,
            nome_artistico: nome.trim(),
            nome_completo: nome.trim(),
            status: 'ativo',
            cache_hora: cacheHoraScout,
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        if (scopeOperadorasArr.length > 0) {
          for (const slug of scopeOperadorasArr) {
            await supabase.from('influencer_operadoras').upsert(
              { influencer_id: uid, operadora_slug: slug, ativo: true },
              { onConflict: 'influencer_id,operadora_slug', ignoreDuplicates: true }
            )
          }
        }
        if (influencerScoutRow?.id) {
          await supabase
            .from('scout_influencer')
            .update({ user_id: uid })
            .eq('id', influencerScoutRow.id)
            .is('user_id', null)
        }
      }
    }

    // 5. E-mail em background (não await — não segura o isolate até o Responder)
    void enviarEmailBoasVindas(
      email.trim().toLowerCase(),
      nome.trim(),
      senhaPadrao,
      loginUrl
    ).catch((e) => console.error('[criar-usuario] Erro ao enviar e-mail:', e))

    return new Response(JSON.stringify({ success: true, userId: uid }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[criar-usuario] Erro:', e)
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : 'Erro interno ao criar usuário',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
