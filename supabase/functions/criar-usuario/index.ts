import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { enviarEmailBoasVindasConta } from './enviarBoasVindas.ts'
import { DEFAULT_LOGIN_URL } from './transacionalShell.ts'
import { accessGrantedByPayload } from './common.ts'

// Edge Function: criar-usuario — senha padrão + e-mail de boas-vindas + troca obrigatória no primeiro login

// ── Tipos ────────────────────────────────────────────────────────────────

interface CriarUsuarioRequest {
  email: string
  nome: string
  role: string
  emprestadoPara?: string | null
  scopeInfluencers: string[]
  scopeOperadoras: string[]
  scopePares: string[]
  scopePrestadorTipos?: string[]
  loginUrl?: string  // URL da aplicação para o link no e-mail (ex: window.location.origin)
}

const ROLES_BLOQUEADOS = [
  'admin',
  'gestor_aquisicao',
  'gestor_marketing',
  'gestor_operacoes',
  'gestor_academy',
  'gestor_rh',
  'prestador',
  'executivo',
  'investidor',
  'shift_leader',
  'service_manager',
  'customer_service',
  'game_presenter',
  'shuffler',
  'tech_ops',
  'figurino',
  'comunicacao',
  'performance_coach',
  'rh',
] // sem user_scopes genérico; staff Spin e gestores de departamento só role_permissions (aba Permissões)

const PRESTADOR_TIPO_SLUGS = [
  'escritorio',
  'facilities',
  'financeiro',
  'ti',
  'estudio',
] as const

function paridadeInfluencer(role: string): boolean {
  return role === 'influencer' || role === 'afiliado'
}

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Max-Age': '86400',
  }
}

/** GoTrue Admin via fetch + timeout — evita isolate pendurado com supabase.auth.admin no Edge. */
const AUTH_ADMIN_MS = 45_000

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
  /** Perfil em profiles.role — o trigger handle_new_user usa raw_user_meta_data->>'role' (senão cai em 'influencer'). */
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
      /* corpo não-JSON */
    }
    if (!res.ok) {
      const msg =
        (typeof parsed.msg === 'string' && parsed.msg) ||
        (typeof parsed.message === 'string' && parsed.message) ||
        (typeof parsed.error_description === 'string' && parsed.error_description) ||
        `HTTP ${res.status}: ${text.slice(0, 240)}`
      return { error: msg }
    }
    // GoTrue devolve o user no root { id, email, ... }; alguns clientes usam { user: { id } }.
    const nested = parsed.user as { id?: string } | undefined
    const topId = typeof parsed.id === 'string' ? parsed.id : undefined
    const uid = topId ?? nested?.id
    if (!uid) {
      return { error: 'Resposta inválida do Auth (sem id no JSON). Confira a versão do GoTrue / Supabase Auth.' }
    }
    return { uid }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { error: `Auth Admin excedeu ${AUTH_ADMIN_MS / 1000}s (timeout). Tente de novo ou confira o projeto Auth no Supabase.` }
    }
    return { error: e instanceof Error ? e.message : 'Falha ao contactar Auth Admin' }
  } finally {
    clearTimeout(t)
  }
}

async function goTrueAdminDeleteUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
): Promise<void> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
  try {
    await fetch(url, {
      method: 'DELETE',
      headers: authAdminHeaders(serviceRoleKey),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(t)
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

  const {
    email,
    nome,
    role,
    emprestadoPara,
    scopeInfluencers,
    scopeOperadoras,
    scopePares,
    scopePrestadorTipos,
  } = body
  const emprestadoParaDb =
    typeof emprestadoPara === 'string' && emprestadoPara.trim() ? emprestadoPara.trim() : null
  const loginUrl = (body.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL

  // Garantir arrays (evita "forEach is not a function" quando vem string/objeto/undefined)
  const toStrArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  const scopeInfluencersArr = toStrArr(scopeInfluencers)
  let scopeOperadorasArr = toStrArr(scopeOperadoras)
  const scopeParesArr = toStrArr(scopePares)
  const scopePrestadorTiposArr = toStrArr(scopePrestadorTipos).filter((s) =>
    (PRESTADOR_TIPO_SLUGS as readonly string[]).includes(s)
  )

  if (!email?.trim() || !nome?.trim() || !role?.trim()) {
    return new Response(JSON.stringify({ error: 'E-mail, nome e perfil são obrigatórios' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let influencerScoutRow: ScoutRowForSync | null = null
  if (paridadeInfluencer(role)) {
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
  if (paridadeInfluencer(role) && scopeOperadorasArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos uma operadora para o perfil' }), {
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
  if (role === 'prestador' && scopePrestadorTiposArr.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecione pelo menos uma área de atuação' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log('[criar-usuario] início', { role, email: email.trim().toLowerCase() })

    // 1. Criar usuário no Auth (GoTrue Admin HTTP — mais estável que supabase.auth.admin no Edge)
    const created = await goTrueAdminCreateUser(
      supabaseUrl,
      serviceRoleKey,
      email.trim().toLowerCase(),
      senhaPadrao,
      nome.trim(),
      role.trim(),
    )
    if ('error' in created) {
      return new Response(JSON.stringify({ error: created.error }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const uid = created.uid
    console.log('[criar-usuario] auth user criado', uid)

    const accessAudit = await accessGrantedByPayload(supabase)

    // 2. Upsert profile (trigger já pode ter inserido; atualiza role e must_change_password)
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: uid,
        name: nome.trim(),
        email: email.trim().toLowerCase(),
        role,
        must_change_password: true,
        emprestado_para: emprestadoParaDb,
        access_granted_by: accessAudit.access_granted_by,
        access_granted_at: accessAudit.access_granted_at,
      },
      { onConflict: 'id' }
    )

    if (profileErr) {
      // Rollback: excluir usuário do Auth se profile falhou
      await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 3. Escopos (user_scopes)
    if (role === 'prestador') {
      const novasAreas = scopePrestadorTiposArr.map((scope_ref) => ({
        user_id: uid,
        scope_type: 'prestador_tipo',
        scope_ref,
      }))
      const { error: scopeErr } = await supabase.from('user_scopes').insert(novasAreas)
      if (scopeErr) {
        await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
        return new Response(
          JSON.stringify({
            error: `Erro ao salvar áreas de prestador: ${scopeErr.message}. Verifique user_scopes (scope_type prestador_tipo).`,
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
          await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
          return new Response(
            JSON.stringify({ error: `Erro ao salvar escopos: ${scopeInsertErr.message}` }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }

      // 4. Influenciador ou afiliado: influencer_perfil e influencer_operadoras
      if (paridadeInfluencer(role)) {
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

    const mail = await enviarEmailBoasVindasConta({
      supabaseUrl,
      supabase,
      to: email.trim().toLowerCase(),
      nome: nome.trim(),
      senhaTemporaria: senhaPadrao,
      loginUrl,
    })
    if (!mail.ok) {
      console.error('[criar-usuario] Erro ao enviar e-mail:', mail.error)
    }

    return new Response(JSON.stringify({
      success: true,
      userId: uid,
      emailEnviado: mail.ok,
      ...(mail.ok ? {} : { emailErro: 'Não foi possível enviar o e-mail de boas-vindas. Verifique RESEND_API_KEY e RESEND_FROM_SISTEMA no Supabase.' }),
    }), {
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
