import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

const ATUACOES = ['operador', 'provedor', 'parceria', 'agregador', 'jogador', 'outros'] as const
type Atuacao = (typeof ATUACOES)[number]

const ATUACOES_COM_EMPRESA = ['operador', 'provedor', 'parceria', 'agregador'] as const

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, content-type, apikey, x-client-info, x-region, x-cs-atendimento-secret',
    'Access-Control-Max-Age': '86400',
  }
}

function trimMax(s: string, max: number): string {
  const t = s.trim()
  return t.length > max ? t.slice(0, max) : t
}

function isEmailOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeAtuacao(raw: unknown): Atuacao | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'operador' || s === 'operadora') return 'operador'
  if (s === 'provedor' || s === 'provider') return 'provedor'
  if (s === 'parceria' || s === 'parceiro' || s === 'parcerias') return 'parceria'
  if (s === 'agregador' || s === 'aggregator') return 'agregador'
  if (s === 'jogador' || s === 'player') return 'jogador'
  if (s === 'outros' || s === 'outro' || s === 'other') return 'outros'
  return ATUACOES.includes(s as Atuacao) ? (s as Atuacao) : null
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

  const expectedSecret = (Deno.env.get('CS_ATENDIMENTO_FORM_SECRET') ?? '').trim()
  const headerSecret = (req.headers.get('x-cs-atendimento-secret') ?? '').trim()

  let raw: Record<string, unknown>
  try {
    raw = (await req.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const bodySecret = typeof raw.secret === 'string' ? raw.secret.trim() : ''
  const secret = headerSecret || bodySecret

  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const nome = trimMax(String(raw.nome_completo ?? raw.nome ?? ''), 200)
  const telefone = trimMax(String(raw.telefone ?? ''), 40)
  const email = trimMax(String(raw.email ?? '').toLowerCase(), 200)
  const atuacao = normalizeAtuacao(raw.atuacao)
  const empresa = trimMax(String(raw.empresa ?? ''), 200)
  const mensagem = trimMax(String(raw.mensagem ?? ''), 4000)

  if (!nome) {
    return new Response(JSON.stringify({ error: 'Nome completo é obrigatório.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!email || !isEmailOk(email)) {
    return new Response(JSON.stringify({ error: 'E-mail inválido.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!atuacao) {
    return new Response(JSON.stringify({ error: 'Atuação inválida.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (ATUACOES_COM_EMPRESA.includes(atuacao as (typeof ATUACOES_COM_EMPRESA)[number]) && !empresa) {
    return new Response(JSON.stringify({ error: 'Empresa é obrigatória para esta atuação.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const empresaEnvio = ['jogador', 'outros'].includes(atuacao) ? null : empresa || null
  if (!mensagem) {
    return new Response(JSON.stringify({ error: 'Mensagem é obrigatória.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, supabaseServiceOptions)

  const { data: id, error: rpcErr } = await supabase.rpc('cs_chamado_criar_site_spin', {
    p_nome_completo: nome,
    p_telefone: telefone || null,
    p_email: email,
    p_atuacao: atuacao,
    p_empresa: empresaEnvio,
    p_mensagem: mensagem,
  })

  if (rpcErr) {
    console.error('[prospecto-cs-atendimento-site]', rpcErr)
    return new Response(JSON.stringify({ error: 'Não foi possível registrar o chamado.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, id }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
