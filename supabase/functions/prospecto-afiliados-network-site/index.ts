import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, content-type, apikey, x-client-info, x-region, x-prospecto-afiliados-network-secret',
    'Access-Control-Max-Age': '86400',
  }
}

function trimMax(s: string, max: number): string {
  const t = s.trim()
  return t.length > max ? t.slice(0, max) : t
}

function isEmailOk(email: string): boolean {
  if (email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

  const expectedSecret = (Deno.env.get('PROSPECTO_AFILIADOS_NETWORK_FORM_SECRET') ?? '').trim()
  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const headerSecret = (req.headers.get('x-prospecto-afiliados-network-secret') ?? '').trim()

  let raw: Record<string, unknown>
  try {
    raw = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const bodySecret = typeof raw.secret === 'string' ? raw.secret.trim() : ''
  const secret = headerSecret || bodySecret
  if (!secret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const nome = trimMax(String(raw.nome ?? ''), 400)
  const telefone = trimMax(String(raw.telefone ?? ''), 80)
  const email = trimMax(String(raw.email ?? '').toLowerCase(), 254)
  const liveRaw = String(raw.live_cassino ?? '').trim().toLowerCase()
  const liveCassino = liveRaw === 'sim' ? 'sim' : liveRaw === 'nao' ? 'nao' : null
  const operacao = trimMax(String(raw.operacao ?? ''), 8000)

  if (!nome) {
    return new Response(JSON.stringify({ error: 'Nome é obrigatório.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!telefone) {
    return new Response(JSON.stringify({ error: 'Telefone é obrigatório.' }), {
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
  if (liveCassino == null) {
    return new Response(JSON.stringify({ error: 'Live cassino deve ser sim ou nao.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (!operacao) {
    return new Response(JSON.stringify({ error: 'Operação é obrigatória.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const row = {
    nome,
    status: 'visualizado',
    tipo_contato: 'site_spin',
    telefone,
    email,
    live_cassino: liveCassino,
    operacao,
    operadora_slug: null,
    created_by: null,
    updated_at: new Date().toISOString(),
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

  const { data: inserted, error: insErr } = await supabase
    .from('afiliados_network')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (insErr) {
    console.error('[prospecto-afiliados-network-site]', insErr)
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, id: inserted?.id ?? null }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
