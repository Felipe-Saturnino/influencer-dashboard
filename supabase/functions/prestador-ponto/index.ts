import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * prestador-ponto — Check-in / Check-out (rede WAN + escala aprovada).
 * Turno noturno: check-out herda o dia_sp do check-in aberto (linha = turno).
 * Janela de check-out: 20h após o check-in; depois o sistema assume esquecimento
 * e libera novo check-in.
 */

const MSG_REDE =
  'Você deve estar logado na rede Spin Gaming para realizar o Check-in/Check-out.'
const MSG_SEM_VINCULO_RH =
  'Não encontramos um colaborador em RH associado ao seu e-mail de login (e-mail ou e-mail Spin).'
const MSG_SEQUENCIA_HOJE = 'Check-in e Check-out de hoje já foram registrados.'

/** Janela em que o check-out permanece habilitado após o check-in (turno noturno / esquecimento). */
const JANELA_CHECKOUT_MS = 20 * 60 * 60 * 1000

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

type PontoRegistroRow = {
  tipo: string
  dia_sp: string
  created_at: string
}

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

async function funcionarioEscaladoNoDia(
  svc: ReturnType<typeof createClient>,
  fid: string | null,
  dia: string,
): Promise<boolean> {
  if (!fid) return false
  const { data: esc } = await svc.rpc('prestador_ponto_escalado_dia', {
    p_funcionario_id: fid,
    p_dia: dia,
  })
  return esc === true
}

/**
 * Resolve próximo ato e o dia_sp do turno (âncora = check-in).
 * Check-out aberto só dentro de JANELA_CHECKOUT_MS; depois assume esquecimento.
 */
function resolverProximoPonto(
  recent: PontoRegistroRow[],
  diaSpHoje: string,
): {
  proximoTipo: ProximoTipo | null
  turnoDiaSp: string
  checkInAbertoAt: string | null
  concluidoHoje: boolean
} {
  const ordenados = [...recent].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const ultimo = ordenados.length > 0 ? ordenados[ordenados.length - 1]! : null

  const regsHoje = ordenados.filter((r) => String(r.dia_sp).slice(0, 10) === diaSpHoje)
  const temCiHoje = regsHoje.some((r) => r.tipo === 'check_in')
  const temCoHoje = regsHoje.some((r) => r.tipo === 'check_out')
  const concluidoHoje = temCiHoje && temCoHoje

  if (ultimo?.tipo === 'check_in') {
    const ageMs = Date.now() - new Date(ultimo.created_at).getTime()
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= JANELA_CHECKOUT_MS) {
      return {
        proximoTipo: 'check_out',
        turnoDiaSp: String(ultimo.dia_sp).slice(0, 10),
        checkInAbertoAt: ultimo.created_at,
        concluidoHoje: false,
      }
    }
    // Esquecimento: libera novo check-in (salvo par completo hoje).
    if (concluidoHoje) {
      return {
        proximoTipo: null,
        turnoDiaSp: diaSpHoje,
        checkInAbertoAt: null,
        concluidoHoje: true,
      }
    }
    return {
      proximoTipo: 'check_in',
      turnoDiaSp: diaSpHoje,
      checkInAbertoAt: null,
      concluidoHoje: false,
    }
  }

  if (concluidoHoje) {
    return {
      proximoTipo: null,
      turnoDiaSp: diaSpHoje,
      checkInAbertoAt: null,
      concluidoHoje: true,
    }
  }

  return {
    proximoTipo: 'check_in',
    turnoDiaSp: diaSpHoje,
    checkInAbertoAt: null,
    concluidoHoje: false,
  }
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
  const escaladoHoje = await funcionarioEscaladoNoDia(svc, fid, diaSp)

  const { data: recentRaw } = await svc
    .from('prestador_ponto_registros')
    .select('tipo, dia_sp, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40)

  const recent = (recentRaw ?? []) as PontoRegistroRow[]
  const { proximoTipo, turnoDiaSp, checkInAbertoAt, concluidoHoje } = resolverProximoPonto(
    recent,
    diaSp,
  )

  const escaladoTurno =
    proximoTipo === 'check_out'
      ? await funcionarioEscaladoNoDia(svc, fid, turnoDiaSp)
      : escaladoHoje

  // A escala é referência de presença, não bloqueio de ponto. Folgas, fins de
  // semana e plantões emergenciais também permitem Check-in/Check-out.
  const escaladoParaAcao = proximoTipo != null

  return {
    ok: true,
    diaSp,
    turnoDiaSp,
    cidrsConfigured,
    clientIp: ip,
    ipPermitido,
    escaladoHoje,
    escaladoTurno,
    escaladoParaAcao,
    rhFuncionarioId: fid,
    proximoTipo,
    checkInAbertoAt,
    janelaCheckoutHoras: 20,
    concluidoHoje,
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
    const proximoTipo = estado.proximoTipo as ProximoTipo | null
    const rhFid = estado.rhFuncionarioId as string | null | undefined
    const turnoDiaSp = String(estado.turnoDiaSp ?? estado.diaSp ?? hojeDiaSp()).slice(0, 10)

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

    if (proximoTipo === null) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: MSG_SEQUENCIA_HOJE,
          code: 'sequencia',
          estado,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const createdAt = new Date().toISOString()
    const { error: insErr } = await svc.from('prestador_ponto_registros').insert({
      user_id: userId,
      funcionario_id: rhFid,
      tipo: proximoTipo,
      dia_sp: turnoDiaSp,
      client_ip: ip,
    })
    if (insErr) {
      console.error('prestador_ponto insert', insErr)
      return new Response(JSON.stringify({ ok: false, error: 'Erro ao registrar. Tente novamente.', estado }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const estadoPos = await montarEstado(svc, userId, email, ip)
    return new Response(
      JSON.stringify({
        ok: true,
        estado: estadoPos,
        registro: {
          tipo: proximoTipo,
          diaSp: turnoDiaSp,
          createdAt,
          funcionarioId: rhFid,
        },
      }),
      {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      },
    )
  }

  return new Response(JSON.stringify({ ok: false, error: 'Método não permitido.' }), {
    status: 405,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
