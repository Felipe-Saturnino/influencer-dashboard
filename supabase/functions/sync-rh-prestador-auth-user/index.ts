import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://esm.sh/jose@5.2.0'
import { enviarEmailBoasVindasConta } from './enviarBoasVindas.ts'
import { DEFAULT_LOGIN_URL } from './transacionalShell.ts'

/**
 * Edge: sync-rh-prestador-auth-user
 * Cria ou atualiza usuário Auth + profile + user_scopes conforme organograma do prestador.
 * Nome na plataforma: nome completo do prestador (`rh_funcionarios.nome`).
 * E-mail de login: E-mail Spin se válido; senão e-mail pessoal. Body opcional reforça valores após save.
 * Perfil / escopo: gerências (Figurino, Comunicação, RH, Tech Ops, Customer Service → perfil próprio; Facilities, Financeiro, TI, Treinamento → Gestor/Prestador) >
 *   times (Performance Coach → performance_coach, Shift Leader, Service Manager, Customer Service, Tech Ops, GP, Shuffler) >
 *   área de atuação do cadastro (Escritório / Estúdio) > default Escritório.
 * Usuário já existente (mesmo e-mail Spin ou pessoal): atualiza `profiles.role`, escopos RH e metadata Auth — sem e-mail de boas-vindas.
 * Chamada após salvar na Gestão de Prestadores (JWT do operador; mesma regra que _rh_funcionario_perm: admin, rh_funcionarios ou rh_staff com editar/criar).
 */

type PrestadorTipoSlug =
  | 'customer_service'
  | 'game_presenter'
  | 'shuffler'
  | 'escritorio'
  | 'facilities'
  | 'financeiro'
  | 'tech_ops'
  | 'ti'
  | 'estudio'

type GestorTipoSlug = 'operacoes' | 'marketing' | 'afiliados' | 'geral' | 'treinamento'

type PerfilRhSync =
  | 'figurino'
  | 'comunicacao'
  | 'rh'
  | 'performance_coach'
  | 'shift_leader'
  | 'service_manager'
  | 'customer_service'
  | 'game_presenter'
  | 'shuffler'
  | 'tech_ops'
  | 'prestador'
  | 'gestor'

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

async function goTrueAdminUpdateUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  opts: { name: string; perfilRole: string; email?: string },
): Promise<{ error?: string }> {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), AUTH_ADMIN_MS)
  try {
    const body: Record<string, unknown> = {
      user_metadata: { name: opts.name, role: opts.perfilRole },
    }
    if (opts.email) body.email = opts.email
    const res = await fetch(url, {
      method: 'PUT',
      headers: authAdminHeaders(serviceRoleKey),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
      } catch {
        /* */
      }
      const msg =
        (typeof parsed.msg === 'string' && parsed.msg) ||
        (typeof parsed.message === 'string' && parsed.message) ||
        (typeof parsed.error_description === 'string' && parsed.error_description) ||
        `HTTP ${res.status}: ${text.slice(0, 240)}`
      return { error: msg }
    }
    return {}
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { error: `Auth Admin excedeu ${AUTH_ADMIN_MS / 1000}s` }
    }
    return { error: e instanceof Error ? e.message : 'Falha ao contactar Auth Admin' }
  } finally {
    clearTimeout(timer)
  }
}

type PerfilExistente = { id: string; role: string; email: string; ativo: boolean | null }

async function findProfileByEmails(
  supabase: SupabaseSvc,
  emails: string[],
): Promise<PerfilExistente | null> {
  const uniq = [...new Set(emails.filter((e) => e.includes('@')))]
  for (const em of uniq) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, role, email, ativo')
      .ilike('email', em)
      .limit(1)
      .maybeSingle()
    if (!perfil?.id) continue
    const pe = String((perfil as { email?: string }).email ?? '').trim().toLowerCase()
    if (pe !== em) continue
    return perfil as PerfilExistente
  }
  return null
}

async function syncEscoposRhPrestador(
  supabase: SupabaseSvc,
  userId: string,
  perfilRole: PerfilRhSync,
  tipoSlug: PrestadorTipoSlug | null,
  gestorSlug: GestorTipoSlug | null,
): Promise<{ error?: string }> {
  const { error: delErr } = await supabase
    .from('user_scopes')
    .delete()
    .eq('user_id', userId)
    .in('scope_type', ['prestador_tipo', 'gestor_tipo'])
  if (delErr) return { error: `Erro ao limpar escopos RH: ${delErr.message}` }

  if (gestorSlug !== null && perfilRole === 'gestor') {
    const { error: scopeGestorErr } = await supabase.from('user_scopes').insert({
      user_id: userId,
      scope_type: 'gestor_tipo',
      scope_ref: gestorSlug,
    })
    if (scopeGestorErr) return { error: `Erro ao salvar tipo de gestor: ${scopeGestorErr.message}` }
  }

  if (tipoSlug !== null && perfilRole === 'prestador') {
    const { error: scopeErr } = await supabase.from('user_scopes').insert({
      user_id: userId,
      scope_type: 'prestador_tipo',
      scope_ref: tipoSlug,
    })
    if (scopeErr) return { error: `Erro ao salvar área de atuação: ${scopeErr.message}` }
  }

  return {}
}

function normTimeNome(s: string | null | undefined): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

function gerenciaIndicaTechOps(gerenciaNome: string | null | undefined): boolean {
  return normTimeNome(gerenciaNome) === 'tech ops'
}

function gerenciaIndicaCustomerService(gerenciaNome: string | null | undefined): boolean {
  return normTimeNome(gerenciaNome) === 'customer service'
}

function timeIndicaGamePresenter(timeNome: string | null | undefined): boolean {
  const t = normTimeNome(timeNome)
  return t === 'game presenter' || t === 'game presenters'
}

function timeIndicaShuffler(timeNome: string | null | undefined): boolean {
  const t = normTimeNome(timeNome)
  return t === 'shuffler' || t === 'shufflers'
}

async function carregarContextoOrganogramaRh(
  supabase: SupabaseSvc,
  row: { org_time_id?: string | null; org_gerencia_id?: string | null },
): Promise<{ timeNome: string | null; gerenciaNome: string | null }> {
  let timeNome: string | null = null
  let gerenciaNome: string | null = null

  if (row.org_time_id) {
    const { data: tr } = await supabase
      .from('rh_org_times')
      .select('nome, gerencia_id')
      .eq('id', row.org_time_id)
      .maybeSingle()
    timeNome = (tr as { nome?: string } | null)?.nome ?? null
    const gerIdFromTime = (tr as { gerencia_id?: string | null } | null)?.gerencia_id
    if (gerIdFromTime) {
      const { data: gr } = await supabase
        .from('rh_org_gerencias')
        .select('nome')
        .eq('id', gerIdFromTime)
        .maybeSingle()
      gerenciaNome = (gr as { nome?: string } | null)?.nome ?? null
    }
  }

  const gerIdDireto = row.org_gerencia_id
  if (gerIdDireto) {
    const { data: gr } = await supabase
      .from('rh_org_gerencias')
      .select('nome')
      .eq('id', gerIdDireto)
      .maybeSingle()
    gerenciaNome = (gr as { nome?: string } | null)?.nome ?? gerenciaNome
  }

  return { timeNome, gerenciaNome }
}

/**
 * Prioridade: gerências específicas → perfil staff, Gestor (Treinamento) ou Prestador + `prestador_tipo`;
 * depois times; por fim `rh_funcionarios.area_atuacao` (escritorio | estudio); default Escritório.
 */
function resolvePerfilEscopo(
  gerenciaNome: string | null | undefined,
  timeNome: string | null | undefined,
  areaAtuacaoRh: string | null | undefined,
): { role: PerfilRhSync; prestadorTipo: PrestadorTipoSlug | null; gestorTipo: GestorTipoSlug | null } {
  const g = normTimeNome(gerenciaNome)
  if (g === 'figurino') {
    return { role: 'figurino', prestadorTipo: null, gestorTipo: null }
  }
  if (g === 'comunicacao') {
    return { role: 'comunicacao', prestadorTipo: null, gestorTipo: null }
  }
  if (g === 'rh' || g === 'recursos humanos') {
    return { role: 'rh', prestadorTipo: null, gestorTipo: null }
  }
  if (gerenciaIndicaTechOps(gerenciaNome)) {
    return { role: 'tech_ops', prestadorTipo: null, gestorTipo: null }
  }
  if (gerenciaIndicaCustomerService(gerenciaNome)) {
    return { role: 'customer_service', prestadorTipo: null, gestorTipo: null }
  }
  if (g === 'facilities') {
    return { role: 'prestador', prestadorTipo: 'facilities', gestorTipo: null }
  }
  if (g === 'financeiro') {
    return { role: 'prestador', prestadorTipo: 'financeiro', gestorTipo: null }
  }
  if (g === 'ti') {
    return { role: 'prestador', prestadorTipo: 'ti', gestorTipo: null }
  }
  if (g === 'treinamento') {
    return { role: 'gestor', prestadorTipo: null, gestorTipo: 'treinamento' }
  }

  const t = normTimeNome(timeNome)
  if (t === 'tech ops') {
    return { role: 'tech_ops', prestadorTipo: null, gestorTipo: null }
  }
  if (t === 'performance coach') {
    return { role: 'performance_coach', prestadorTipo: null, gestorTipo: null }
  }
  if (t === 'shift leader') {
    return { role: 'shift_leader', prestadorTipo: null, gestorTipo: null }
  }
  if (t === 'service manager') {
    return { role: 'service_manager', prestadorTipo: null, gestorTipo: null }
  }
  if (t === 'customer service') {
    return { role: 'customer_service', prestadorTipo: null, gestorTipo: null }
  }
  if (timeIndicaGamePresenter(timeNome)) {
    return { role: 'game_presenter', prestadorTipo: null, gestorTipo: null }
  }
  if (timeIndicaShuffler(timeNome)) {
    return { role: 'shuffler', prestadorTipo: null, gestorTipo: null }
  }

  const a = normTimeNome(areaAtuacaoRh)
  if (a === 'escritorio') {
    return { role: 'prestador', prestadorTipo: 'escritorio', gestorTipo: null }
  }
  if (a === 'estudio') {
    return { role: 'prestador', prestadorTipo: 'estudio', gestorTipo: null }
  }
  return { role: 'prestador', prestadorTipo: 'escritorio', gestorTipo: null }
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
  const pageKeys = ['rh_funcionarios', 'rh_staff'] as const
  for (const page_key of pageKeys) {
    const { data: rp } = await supabase
      .from('role_permissions')
      .select('can_editar, can_criar')
      .eq('role', role)
      .eq('page_key', page_key)
      .maybeSingle()
    if (rp && (okPerm(rp.can_editar as string) || okPerm(rp.can_criar as string))) return true
  }
  return false
}

interface Body {
  rhFuncionarioId?: string
  loginUrl?: string
  /** E-mail Spin (corporativo); opcional — reforço pós-save. */
  emailSpin?: string
  /** E-mail pessoal (`rh_funcionarios.email`); usado quando não há Spin. */
  emailPessoal?: string
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

  const loginUrl = (body.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL

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
    .select('id, nome, email, email_spin, area_atuacao, org_time_id, org_gerencia_id, status')
    .eq('id', rhId)
    .maybeSingle()

  if (rowErr || !row) {
    return new Response(JSON.stringify({ error: rowErr?.message ?? 'Prestador não encontrado' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const statusPrestador = String((row as { status?: string }).status ?? '').trim()

  if (statusPrestador === 'encerrado') {
    const spinEnc = String(row.email_spin ?? '').trim().toLowerCase()
    const personalEnc = String(row.email ?? '').trim().toLowerCase()
    const emailsMatch = [...new Set([spinEnc, personalEnc].filter((e) => e.includes('@')))]
    let deactivatedUserId: string | null = null
    let jaInativo = false
    for (const em of emailsMatch) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('id, email, ativo')
        .ilike('email', em)
        .limit(1)
        .maybeSingle()
      if (!perfil?.id) continue
      const pe = String((perfil as { email?: string }).email ?? '').trim().toLowerCase()
      if (pe !== em) continue
      deactivatedUserId = perfil.id as string
      jaInativo = (perfil as { ativo?: boolean | null }).ativo === false
      if (!jaInativo) {
        const { error: deactErr } = await supabase.from('profiles').update({ ativo: false }).eq('id', perfil.id)
        if (deactErr) {
          return new Response(JSON.stringify({ error: deactErr.message }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
      }
      break
    }
    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        reason: deactivatedUserId ? 'prestador_encerrado' : 'prestador_encerrado_sem_usuario',
        deactivated: Boolean(deactivatedUserId),
        userId: deactivatedUserId ?? undefined,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const spinFromRow = String(row.email_spin ?? '').trim().toLowerCase()
  const spinFromBody = String(body.emailSpin ?? '').trim().toLowerCase()
  const spin = spinFromRow || spinFromBody

  const personalFromRow = String(row.email ?? '').trim().toLowerCase()
  const personalFromBody = String(body.emailPessoal ?? '').trim().toLowerCase()
  const personal = personalFromRow || personalFromBody

  const loginEmail = spin && spin.includes('@') ? spin : personal
  if (!loginEmail || !loginEmail.includes('@')) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'sem_email' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { timeNome, gerenciaNome } = await carregarContextoOrganogramaRh(supabase, row)

  const nomePlataforma = String(row.nome ?? '').trim() || loginEmail.split('@')[0] || 'Prestador'
  const { role: perfilRole, prestadorTipo: tipoSlug, gestorTipo: gestorSlug } = resolvePerfilEscopo(
    gerenciaNome,
    timeNome,
    (row as { area_atuacao?: string | null }).area_atuacao,
  )

  const emailsBusca = [...new Set([loginEmail, spin, personal].filter((e) => e.includes('@')))]
  const perfilExistente = await findProfileByEmails(supabase, emailsBusca)

  if (perfilExistente) {
    const roleAnterior = String(perfilExistente.role ?? '').trim()
    const emailAnterior = String(perfilExistente.email ?? '').trim().toLowerCase()
    const emailMudou = emailAnterior !== loginEmail

    const patchProfile: Record<string, unknown> = {
      name: nomePlataforma,
      role: perfilRole,
      ativo: true,
    }
    if (emailMudou) patchProfile.email = loginEmail

    const { error: profileUpErr } = await supabase
      .from('profiles')
      .update(patchProfile)
      .eq('id', perfilExistente.id)
    if (profileUpErr) {
      return new Response(JSON.stringify({ error: profileUpErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const authUp = await goTrueAdminUpdateUser(supabaseUrl, serviceRoleKey, perfilExistente.id, {
      name: nomePlataforma,
      perfilRole,
      ...(emailMudou ? { email: loginEmail } : {}),
    })
    if (authUp.error) {
      console.error('[sync-rh-prestador-auth-user] Auth metadata:', authUp.error)
      return new Response(JSON.stringify({ error: authUp.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const escopos = await syncEscoposRhPrestador(supabase, perfilExistente.id, perfilRole, tipoSlug, gestorSlug)
    if (escopos.error) {
      return new Response(JSON.stringify({ error: escopos.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: true,
        userId: perfilExistente.id,
        role: perfilRole,
        roleChanged: roleAnterior !== perfilRole,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const created = await goTrueAdminCreateUser(
    supabaseUrl,
    serviceRoleKey,
    loginEmail,
    senhaPadrao,
    nomePlataforma,
    perfilRole,
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
      email: loginEmail,
      role: perfilRole,
      must_change_password: true,
      access_granted_by: whoami.userId,
      access_granted_at: new Date().toISOString(),
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

  const escoposCreate = await syncEscoposRhPrestador(supabase, uid, perfilRole, tipoSlug, gestorSlug)
  if (escoposCreate.error) {
    await goTrueAdminDeleteUser(supabaseUrl, serviceRoleKey, uid)
    await supabase.from('profiles').delete().eq('id', uid)
    return new Response(JSON.stringify({ error: escoposCreate.error }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (
    spinFromBody &&
    spinFromBody.includes('@') &&
    !spinFromRow &&
    loginEmail === spin
  ) {
    const { error: rhPatchErr } = await supabase.from('rh_funcionarios').update({ email_spin: loginEmail }).eq('id', rhId)
    if (rhPatchErr) {
      console.error('[sync-rh-prestador-auth-user] gravar email_spin em rh_funcionarios:', rhPatchErr)
    }
  }

  const mail = await enviarEmailBoasVindasConta({
    supabaseUrl,
    supabase,
    to: loginEmail,
    nome: nomePlataforma,
    senhaTemporaria: senhaPadrao,
    loginUrl,
  })
  if (!mail.ok) {
    console.error('[sync-rh-prestador-auth-user] Erro ao enviar e-mail:', mail.error)
  }

  return new Response(JSON.stringify({
    success: true,
    created: true,
    userId: uid,
    emailEnviado: mail.ok,
    ...(mail.ok ? {} : { emailErro: 'Não foi possível enviar o e-mail de boas-vindas. Verifique RESEND_API_KEY e RESEND_FROM_SISTEMA no Supabase.' }),
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
