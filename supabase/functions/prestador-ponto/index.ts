import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * prestador-ponto — Check-in / Check-out (rede WAN + escala aprovada).
 * Turno noturno: check-out herda o dia_sp do check-in aberto (linha = turno).
 * Janela de check-out (não GP/Shuffler): 20h após o check-in; depois o sistema
 * assume esquecimento e libera novo check-in.
 * GP/Shuffler: exige dia trabalhado (RPC) + janela ±15 min (HA do CT ou escala).
 */

const MSG_REDE =
  'Você deve estar logado na rede Spin Gaming para realizar o Check-in/Check-out.'
const MSG_SEM_VINCULO_RH =
  'Não encontramos um colaborador em RH associado ao seu e-mail de login (e-mail ou e-mail Spin).'
const MSG_SEQUENCIA_HOJE = 'Check-in e Check-out de hoje já foram registrados.'

/** Mensagens canónicas — espelho de calendarioPresencaJanelaTurno.ts */
const MSG_CHECKIN_FORA_JANELA =
  'O Check-in só é permitido 15min antes do inicio do turno, caso você irá fazer horas adicionais do turno solicite a Liderança o registro'
const MSG_CHECKOUT_FORA_JANELA =
  'O Check-out só é permitido 15min após o fim do turno, caso você tenha feito horas adicionais no turno solicite a Liderança o registro'

const JANELA_TURNO_MIN = 15

/** Janela em que o check-out permanece habilitado após o check-in (não GP/Shuffler). */
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

function minutosRelogioHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function turnoCruzaMeiaNoite(ent: string, sai: string): boolean {
  const minEnt = minutosRelogioHHmm(ent)
  const minSai = minutosRelogioHHmm(sai)
  if (minEnt == null || minSai == null) return false
  return minSai <= minEnt
}

function instantesTurnoEfetivo(
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
): { inicio: Date; fim: Date } | null {
  const minEnt = minutosRelogioHHmm(entradaHhmm)
  const minSai = minutosRelogioHHmm(saidaHhmm)
  if (minEnt == null || minSai == null) return null
  const [y, mo, d] = diaIso.split('-').map((x) => Number(x))
  if (!y || !mo || !d) return null
  const inicio = new Date(y, mo - 1, d, 0, 0, 0, 0)
  inicio.setMinutes(minEnt)
  const fim = new Date(y, mo - 1, d, 0, 0, 0, 0)
  if (turnoCruzaMeiaNoite(entradaHhmm, saidaHhmm)) {
    fim.setDate(fim.getDate() + 1)
  }
  fim.setMinutes(minSai)
  return { inicio, fim }
}

function checkInDentroJanelaTurno(
  agora: Date,
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
): { ok: true } | { ok: false; mensagem: string } {
  const inst = instantesTurnoEfetivo(diaIso, entradaHhmm, saidaHhmm)
  if (!inst) return { ok: false, mensagem: MSG_CHECKIN_FORA_JANELA }
  const abre = new Date(inst.inicio.getTime() - JANELA_TURNO_MIN * 60_000)
  if (agora.getTime() < abre.getTime() || agora.getTime() > inst.fim.getTime()) {
    return { ok: false, mensagem: MSG_CHECKIN_FORA_JANELA }
  }
  return { ok: true }
}

function checkOutDentroJanelaTurno(
  agora: Date,
  diaIso: string,
  entradaHhmm: string,
  saidaHhmm: string,
  checkInAt: Date | string | null,
): { ok: true } | { ok: false; mensagem: string } {
  const inst = instantesTurnoEfetivo(diaIso, entradaHhmm, saidaHhmm)
  if (!inst) return { ok: false, mensagem: MSG_CHECKOUT_FORA_JANELA }
  if (!checkInAt) return { ok: false, mensagem: MSG_CHECKOUT_FORA_JANELA }
  const ci = typeof checkInAt === 'string' ? new Date(checkInAt) : checkInAt
  if (Number.isNaN(ci.getTime()) || agora.getTime() < ci.getTime()) {
    return { ok: false, mensagem: MSG_CHECKOUT_FORA_JANELA }
  }
  const fecha = new Date(inst.fim.getTime() + JANELA_TURNO_MIN * 60_000)
  if (agora.getTime() > fecha.getTime()) {
    return { ok: false, mensagem: MSG_CHECKOUT_FORA_JANELA }
  }
  return { ok: true }
}

function timeNomeIndicaGpOuShuffler(nome: string | null | undefined): boolean {
  const t = (nome ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
  return t.includes('game presenter') || t.includes('shuffler')
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

async function funcionarioEhGpOuShuffler(
  svc: ReturnType<typeof createClient>,
  fid: string,
): Promise<boolean> {
  const { data: f } = await svc
    .from('rh_funcionarios')
    .select('org_time_id')
    .eq('id', fid)
    .maybeSingle()
  const timeId = (f as { org_time_id?: string | null } | null)?.org_time_id
  if (!timeId) return false
  const { data: t } = await svc.from('rh_org_times').select('nome').eq('id', timeId).maybeSingle()
  return timeNomeIndicaGpOuShuffler((t as { nome?: string } | null)?.nome)
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

/** Preferir Hora Adicional do CT; senão null (Edge não resolve horários de Staff). */
async function resolverTurnoHaCt(
  svc: ReturnType<typeof createClient>,
  fid: string,
  diaIso: string,
): Promise<{ entrada: string; saida: string } | null> {
  const { data } = await svc
    .from('escala_ct_presenca_registro')
    .select('entrada_hhmm, saida_hhmm, status_presenca, tipo, created_at')
    .eq('prestador_id', fid)
    .eq('data', diaIso)
    .order('created_at', { ascending: false })
    .limit(20)
  for (const row of (data ?? []) as Array<{
    entrada_hhmm: string | null
    saida_hhmm: string | null
    status_presenca: string | null
    tipo: string | null
  }>) {
    const st = String(row.status_presenca ?? '').toLowerCase()
    const tipo = String(row.tipo ?? '').toLowerCase()
    if (st !== 'hora_adicional' && tipo !== 'hora_adicional') continue
    const e = String(row.entrada_hhmm ?? '').trim().slice(0, 5)
    const s = String(row.saida_hhmm ?? '').trim().slice(0, 5)
    if (minutosRelogioHHmm(e) != null && minutosRelogioHHmm(s) != null) {
      return { entrada: e, saida: s }
    }
  }
  return null
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

  // Preferir funcionario_id (várias contas Auth no mesmo RH); fallback user_id.
  let recent: PontoRegistroRow[] = []
  if (fid) {
    const { data: byFid } = await svc
      .from('prestador_ponto_registros')
      .select('tipo, dia_sp, created_at')
      .eq('funcionario_id', fid)
      .order('created_at', { ascending: false })
      .limit(40)
    recent = (byFid ?? []) as PontoRegistroRow[]
  }
  if (recent.length === 0) {
    const { data: recentRaw } = await svc
      .from('prestador_ponto_registros')
      .select('tipo, dia_sp, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    recent = (recentRaw ?? []) as PontoRegistroRow[]
  }
  const { proximoTipo, turnoDiaSp, checkInAbertoAt, concluidoHoje } = resolverProximoPonto(
    recent,
    diaSp,
  )

  const escaladoTurno =
    proximoTipo === 'check_out'
      ? await funcionarioEscaladoNoDia(svc, fid, turnoDiaSp)
      : escaladoHoje

  // A escala é referência de presença, não bloqueio de ponto (exceto GP/Shuffler no POST).
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

    const isGpShuffler = await funcionarioEhGpOuShuffler(svc, rhFid)
    if (isGpShuffler) {
      const escalado =
        proximoTipo === 'check_out'
          ? await funcionarioEscaladoNoDia(svc, rhFid, turnoDiaSp)
          : await funcionarioEscaladoNoDia(svc, rhFid, turnoDiaSp)
      if (!escalado) {
        const msg =
          proximoTipo === 'check_out' ? MSG_CHECKOUT_FORA_JANELA : MSG_CHECKIN_FORA_JANELA
        return new Response(
          JSON.stringify({ ok: false, error: msg, code: 'janela_turno', estado }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const ha = await resolverTurnoHaCt(svc, rhFid, turnoDiaSp)
      // Sem HA e sem horários de escala no Edge: só aplica ±15 quando HA conhecida.
      if (ha) {
        const agora = new Date()
        if (proximoTipo === 'check_in') {
          const janela = checkInDentroJanelaTurno(agora, turnoDiaSp, ha.entrada, ha.saida)
          if (!janela.ok) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: janela.mensagem,
                code: 'janela_turno',
                estado,
              }),
              { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
        } else {
          const checkInAt = (estado.checkInAbertoAt as string | null) ?? null
          const janela = checkOutDentroJanelaTurno(
            agora,
            turnoDiaSp,
            ha.entrada,
            ha.saida,
            checkInAt,
          )
          if (!janela.ok) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: janela.mensagem,
                code: 'janela_turno',
                estado,
              }),
              { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
        }
      }
      // Sem HA: cliente Calendário aplica janela com horários da escala; Edge só exige dia trabalhado.
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
