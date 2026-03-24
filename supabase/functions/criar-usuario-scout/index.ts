import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SupabaseAdmin = ReturnType<typeof createClient>

// Edge Function: criar-usuario-scout — cria influencer a partir do Scout (usa Service Role)
// Também: vincular_operadora — grava influencer_operadoras + user_scopes (prospecto já com user_id).

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

/** Vincula influencer à operadora: quadro Influencers + escopo na Gestão de Usuários. */
async function vincularOperadoraInfluencer(
  supabase: SupabaseAdmin,
  userId: string,
  slug: string,
): Promise<{ error?: string }> {
  const trim = slug.trim()
  if (!trim) return { error: 'Operadora obrigatória ao fechar o prospecto no Scout.' }

  const { data: op } = await supabase.from('operadoras').select('slug').eq('slug', trim).maybeSingle()
  if (!op?.slug) return { error: `Operadora inválida ou não cadastrada: ${trim}` }

  const { error: ioErr } = await supabase.from('influencer_operadoras').upsert(
    { influencer_id: userId, operadora_slug: trim, ativo: true },
    { onConflict: 'influencer_id,operadora_slug', ignoreDuplicates: false },
  )
  if (ioErr) return { error: ioErr.message }

  const { data: existing } = await supabase
    .from('user_scopes')
    .select('id')
    .eq('user_id', userId)
    .eq('scope_type', 'operadora')
    .eq('scope_ref', trim)
    .maybeSingle()

  if (!existing) {
    const { error: scErr } = await supabase.from('user_scopes').insert({
      user_id: userId,
      scope_type: 'operadora',
      scope_ref: trim,
    })
    if (scErr) return { error: scErr.message }
  }
  return {}
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

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let raw: Record<string, unknown>
  try {
    raw = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const vinc = raw.vincular_operadora as { user_id?: string; operadora_slug?: string } | undefined
  if (vinc && typeof vinc === 'object' && typeof vinc.user_id === 'string' && vinc.user_id.trim()) {
    const slugIn = String(vinc.operadora_slug ?? '').trim()
    if (!slugIn) {
      return new Response(JSON.stringify({ error: 'operadora_slug é obrigatório' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const verr = await vincularOperadoraInfluencer(supabase, vinc.user_id.trim(), slugIn)
    if (verr.error) {
      return new Response(JSON.stringify({ error: verr.error }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const scoutId = typeof raw.scout_id === 'string' ? raw.scout_id.trim() : ''
    if (scoutId) {
      await supabase.from('scout_influencer').update({ operadora_slug: slugIn }).eq('id', scoutId)
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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

  const email = String(raw.email ?? '').trim().toLowerCase()
  const nome = String(raw.nome_artistico ?? '').trim()

  if (!email || !nome) {
    return new Response(JSON.stringify({ error: 'E-mail e nome artístico são obrigatórios' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const plat = (raw.plataformas as string[] | undefined) ?? []
  const scoutId = typeof raw.scout_id === 'string' ? raw.scout_id.trim() : ''

  let cacheHora = parseCacheNumeric(raw.cache_negociado)
  let operadoraSlug = String(raw.operadora_slug ?? '').trim()

  if (scoutId) {
    const { data: scoutRow } = await supabase
      .from('scout_influencer')
      .select('cache_negociado, operadora_slug')
      .eq('id', scoutId)
      .single()
    if (cacheHora <= 0) cacheHora = parseCacheNumeric(scoutRow?.cache_negociado)
    if (!operadoraSlug && scoutRow?.operadora_slug) operadoraSlug = String(scoutRow.operadora_slug).trim()
  }

  if (cacheHora <= 0) {
    return new Response(JSON.stringify({ error: 'Cachê negociado inválido ou ausente' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!operadoraSlug) {
    return new Response(JSON.stringify({
      error: 'Operadora é obrigatória para marcar o prospecto como Fechado. Selecione no cadastro do Scout.',
    }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { data: opRow } = await supabase.from('operadoras').select('slug').eq('slug', operadoraSlug).maybeSingle()
  if (!opRow?.slug) {
    return new Response(JSON.stringify({ error: 'Operadora inválida ou não cadastrada.' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: senhaPadrao,
      email_confirm: true,
      user_metadata: { name: nome },
    })

    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: authErr?.message ?? 'Erro ao criar usuário' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const uid = authData.user.id

    let { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: uid,
        name: nome,
        email,
        role: 'influencer',
        must_change_password: true,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

    if (profileErr && /duplicate key|unique constraint/i.test(profileErr.message ?? '')) {
      const { error: updateErr } = await supabase.from('profiles').update({
        name: nome,
        email,
        role: 'influencer',
        must_change_password: true,
      }).eq('id', uid)
      if (!updateErr) profileErr = null
    }

    if (profileErr) {
      await supabase.auth.admin.deleteUser(uid)
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { error: perfilErr } = await supabase.from('influencer_perfil').upsert(
      {
        id: uid,
        nome_artistico: nome,
        nome_completo: nome,
        status: 'ativo',
        telefone: String(raw.telefone ?? '').trim() || undefined,
        cache_hora: cacheHora,
        canais: plat.length > 0 ? plat : undefined,
        link_twitch: plat.includes('Twitch') ? String(raw.link_twitch ?? '') : undefined,
        link_youtube: plat.includes('YouTube') ? String(raw.link_youtube ?? '') : undefined,
        link_kick: plat.includes('Kick') ? String(raw.link_kick ?? '') : undefined,
        link_instagram: plat.includes('Instagram') ? String(raw.link_instagram ?? '') : undefined,
        link_tiktok: plat.includes('TikTok') ? String(raw.link_tiktok ?? '') : undefined,
        link_discord: plat.includes('Discord') ? String(raw.link_discord ?? '') : undefined,
        link_whatsapp: plat.includes('WhatsApp') ? String(raw.link_whatsapp ?? '') : undefined,
        link_telegram: plat.includes('Telegram') ? String(raw.link_telegram ?? '') : undefined,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

    if (perfilErr) {
      await supabase.auth.admin.deleteUser(uid)
      return new Response(JSON.stringify({ error: perfilErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const vErr = await vincularOperadoraInfluencer(supabase, uid, operadoraSlug)
    if (vErr.error) {
      await supabase.auth.admin.deleteUser(uid)
      return new Response(JSON.stringify({ error: vErr.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, userId: uid }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[criar-usuario-scout] Erro:', e)
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : 'Erro interno ao criar usuário',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
