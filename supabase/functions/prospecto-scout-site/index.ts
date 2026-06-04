import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseServiceOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

const PLATAFORMAS = [
  'Twitch',
  'YouTube',
  'Kick',
  'Instagram',
  'TikTok',
  'Discord',
  'WhatsApp',
  'Telegram',
] as const

type PlataformaCanal = (typeof PLATAFORMAS)[number]

const LINK_KEY: Record<string, string> = {
  twitch: 'link_twitch',
  youtube: 'link_youtube',
  kick: 'link_kick',
  instagram: 'link_instagram',
  tiktok: 'link_tiktok',
  discord: 'link_discord',
  whatsapp: 'link_whatsapp',
  telegram: 'link_telegram',
}

const VIEWS_KEY: Record<string, string> = {
  twitch: 'views_twitch',
  youtube: 'views_youtube',
  kick: 'views_kick',
  instagram: 'views_instagram',
  tiktok: 'views_tiktok',
  discord: 'views_discord',
  whatsapp: 'views_whatsapp',
  telegram: 'views_telegram',
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, content-type, apikey, x-client-info, x-region, x-prospecto-scout-secret',
    'Access-Control-Max-Age': '86400',
  }
}

function normalizePlat(raw: unknown): PlataformaCanal | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const hit = PLATAFORMAS.find((p) => p.toLowerCase() === s.toLowerCase())
  return hit ?? null
}

function parseMetrica(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) {
    const n = Math.trunc(v)
    return n >= 0 ? n : null
  }
  const str = String(v).trim()
  if (!str) return null
  let n = Number(str)
  if (!Number.isFinite(n) && str.includes(',')) {
    n = Number(str.replace(/\./g, '').replace(',', '.'))
  }
  if (!Number.isFinite(n)) return null
  const t = Math.trunc(n)
  return t >= 0 ? t : null
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

  const expectedSecret = (Deno.env.get('PROSPECTO_SCOUT_FORM_SECRET') ?? '').trim()
  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const headerSecret = (req.headers.get('x-prospecto-scout-secret') ?? '').trim()

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

  const nomeArtistico = trimMax(String(raw.nome_artistico ?? ''), 300)
  const telefone = trimMax(String(raw.telefone ?? ''), 80)
  const email = trimMax(String(raw.email ?? '').toLowerCase(), 254)
  const liveRaw = String(raw.live_cassino ?? '').trim().toLowerCase()
  const liveCassino = liveRaw === 'sim' ? 'sim' : liveRaw === 'nao' ? 'nao' : null

  const canaisRaw = raw.canais
  if (!Array.isArray(canaisRaw) || canaisRaw.length === 0) {
    return new Response(JSON.stringify({ error: 'Informe ao menos um canal (plataforma, link e métrica).' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (canaisRaw.length > 12) {
    return new Response(JSON.stringify({ error: 'Muitos canais no envio.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!nomeArtistico) {
    return new Response(JSON.stringify({ error: 'Nome artístico é obrigatório.' }), {
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
    return new Response(JSON.stringify({ error: 'Live cassino deve ser sim ou não.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const acc: Record<string, { link: string; metrica: number }> = {}

  for (const item of canaisRaw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const plat = normalizePlat(o.plataforma)
    if (!plat) {
      return new Response(JSON.stringify({ error: 'Plataforma de canal inválida.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const link = trimMax(String(o.link ?? ''), 2048)
    if (!link) {
      return new Response(JSON.stringify({ error: 'Cada canal deve ter um link.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const metrica = parseMetrica(o.metrica)
    if (metrica == null) {
      return new Response(
        JSON.stringify({ error: 'Cada canal deve ter seguidores ou média de views (número ≥ 0).' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        },
      )
    }

    const key = plat.toLowerCase()
    acc[key] = { link, metrica }
  }

  const plats = PLATAFORMAS.filter((p) => acc[p.toLowerCase()] != null)

  if (plats.length === 0) {
    return new Response(JSON.stringify({ error: 'Nenhum canal válido.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const row: Record<string, unknown> = {
    nome_artistico: nomeArtistico,
    status: 'visualizado',
    tipo_contato: 'site_spin',
    telefone,
    live_cassino: liveCassino,
    email,
    cache_negociado: null,
    operadora_slug: null,
    nome_agente: null,
    user_id: null,
    created_by: null,
    plataformas: plats,
    categorias: [],
    updated_at: new Date().toISOString(),
  }

  for (const p of plats) {
    const k = p.toLowerCase()
    const colLink = LINK_KEY[k]
    const colViews = VIEWS_KEY[k]
    if (!colLink || !colViews) continue
    const { link, metrica } = acc[k]
    row[colLink] = link
    row[colViews] = metrica
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
    .from('scout_influencer')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (insErr) {
    console.error('[prospecto-scout-site]', insErr)
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
