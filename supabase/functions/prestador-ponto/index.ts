import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * prestador-ponto — Check-in / Check-out (rede WAN + escala aprovada).
 * Qualquer utilizador autenticado pode consultar/registar; regras de negócio em montarEstado/POST.
 */

const MSG_REDE =
  'Você deve estar logado na rede Spin Colaboradores para realizar o Check-in/Check-out.'
const MSG_SEM_ESCALA = 'Sem escala aprovada para hoje na Gestão de Escala.'
const MSG_SEM_VINCULO_RH =
  'Não encontrámos um colaborador em RH associado ao seu e-mail de login (e-mail ou e-mail Spin).'

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

function hojeDiaSp(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function clientIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const xri = req.headers.get('x-real-ip')?.trim()
  if (xri) return xri
  const xff = req.headers.get('x-forwarded-for')?.trim()
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return null
}

type ProximoTipo = 'check_in' | 'check_out'

async function rhFuncionarioIdPorEmail(
  svc: ReturnType<typeof createClient>,
  emailRaw: string,
): Promise<string | null> {
  const em = emailRaw.trim()
  if (!em) return null
  const el = em.toLowerCase()
  const { data: a } = await svc
    .from('rh_funcionarios')
    .select('id')
    .eq('email', em)
    .in('status', ['ativo', 'indisponivel'])
    .maybeSingle()
  if (a?.id) return a.id as string
  const { data: b } = await svc
    .from('rh_funcionarios')
    .select('id')
    .eq('email_spin', em)
    .in('status', ['ativo', 'indisponivel'])
    .maybeSingle()
  if (b?.id) return b.id as string
  const { data: c } = await svc
    .from('rh_funcionarios')
    .select('id')
    .ilike('email', el)
    .in('status', ['ativo', 'indisponivel'])
    .maybeSingle()
  if (c?.id) return c.id as string
  const { data: d } = await svc
    .from('rh_funcionarios')
    .select('id')
    .ilike('email_spin', el)
    .in('status', ['ativo', 'indisponivel'])
    .maybeSingle()
  return (d?.id as string) ?? null
}

async function montarEstado(
  svc: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  ip: string | null,
): Promise<Record<string, unknown>> {
  const diaSp = hojeDiaSp()
  const { data: cfg } = await svc.rpc('prestador_ponto_cidr_configurado')
  const cidrsConfigured = cfg === true

  let ipPermitido = false
  if (ip && cidrsConfigured) {
    const { data: ipData, error: ipErr } = await svc.rpc('prestador_ponto_ip_permitido', { p_ip: ip })
    ipPermitido = !ipErr && ipData === true
  }

  const fid = await rhFuncionarioIdPorEmail(svc, email)
  let escaladoHoje = false
  if (fid) {
    const { data: esc } = await svc.rpc('prestador_ponto_escalado_dia', {
      p_funcionario_id: fid,
      p_dia: diaSp,
    })
    escaladoHoje = esc === true
  }

  const { data: ultimos } = await svc
    .from('prestador_ponto_registros')
    .select('tipo')
    .eq('user_id', userId)
    .eq('dia_sp', diaSp)
    .order('created_at', { ascending: false })
    .limit(1)

  const ultimo = ultimos?.[0]?.tipo as string | undefined
  let proximoTipo: ProximoTipo | null = 'check_in'
  if (ultimo === 'check_in') proximoTipo = 'check_out'
  else if (ultimo === 'check_out') proximoTipo = null

  return {
    ok: true,
    diaSp: diaSp,
    cidrsConfigured,
    clientIp: ip,
    ipPermitido,
    escaladoHoje,
    rhFuncionarioId: fid,
    proximoTipo,
    concluidoHoje: ultimo === 'check_out',
  }
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Configuração do servidor incompleta.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, error: 'Não autorizado.', code: 'auth' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: udata, error: uerr } = await userClient.auth.getUser()
  if (uerr || !udata?.user?.id) {
    return new Response(JSON.stringify({ ok: false, error: 'Sessão inválida.', code: 'auth' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const user = udata.user
  const userId = user.id
  const email = user.email ?? ''

  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ip = clientIp(req)

  if (req.method === 'GET') {
    const url = new URL(req.url)
    if (url.searchParams.get('action') !== 'estado') {
      return new Response(JSON.stringify({ ok: false, error: 'Parâmetro action inválido.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const body = await montarEstado(svc, userId, email, ip)
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'POST') {
    let action = ''
    try {
      const j = (await req.json()) as { action?: string }
      action = j?.action ?? ''
    } catch {
      action = ''
    }
    if (action !== 'registrar') {
      return new Response(JSON.stringify({ ok: false, error: 'action inválida.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const estado = await montarEstado(svc, userId, email, ip)
    const cidrsConfigured = estado.cidrsConfigured === true
    const escaladoHoje = estado.escaladoHoje === true
    const proximoTipo = estado.proximoTipo as ProximoTipo | null
    const rhFid = estado.rhFuncionarioId as string | null | undefined

    if (!rhFid) {
      return new Response(
        JSON.stringify({ ok: false, error: MSG_SEM_VINCULO_RH, code: 'rh_vinculo', estado }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!cidrsConfigured || !ip || estado.ipPermitido !== true) {
      return new Response(
        JSON.stringify({ ok: false, error: MSG_REDE, code: 'rede', estado }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!escaladoHoje) {
      return new Response(
        JSON.stringify({ ok: false, error: MSG_SEM_ESCALA, code: 'escala', estado }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (proximoTipo === null) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Check-in e Check-out de hoje já foram registados.',
          code: 'sequencia',
          estado,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const diaSp = String(estado.diaSp ?? hojeDiaSp())

    const { error: insErr } = await svc.from('prestador_ponto_registros').insert({
      user_id: userId,
      tipo: proximoTipo,
      dia_sp: diaSp,
      client_ip: ip,
    })
    if (insErr) {
      console.error('prestador_ponto insert', insErr)
      return new Response(JSON.stringify({ ok: false, error: 'Erro ao registar. Tente novamente.', estado }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const estadoPos = await montarEstado(svc, userId, email, ip)
    return new Response(JSON.stringify({ ok: true, estado: estadoPos }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: false, error: 'Método não permitido.' }), {
    status: 405,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
