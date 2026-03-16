import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge Function: criar-usuario-scout — cria influencer a partir do Scout (usa Service Role)
// Chamada quando prospecto é marcado como "Fechado". Não envia e-mail (conforme docs).

interface CriarUsuarioScoutRequest {
  email: string
  nome_artistico: string
  telefone?: string
  cache_negociado?: number
  plataformas?: string[]
  link_twitch?: string
  link_youtube?: string
  link_kick?: string
  link_instagram?: string
  link_tiktok?: string
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

  if (!senhaPadrao || senhaPadrao.length < 8) {
    return new Response(JSON.stringify({
      error: 'SENHA_PADRAO deve ter no mínimo 8 caracteres. Configure no Supabase → Settings → Edge Functions → Secrets.',
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let body: CriarUsuarioScoutRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const nome = (body.nome_artistico ?? '').trim()

  if (!email || !nome) {
    return new Response(JSON.stringify({ error: 'E-mail e nome artístico são obrigatórios' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const plat = body.plataformas ?? []

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

    // Upsert: o trigger on_auth_user_created já cria o profile; atualizamos com role e must_change_password
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

    // Fallback: se falhar por duplicate key (perfil já existe do trigger), faz update e continua
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

    await supabase.from('influencer_perfil').upsert(
      {
        id: uid,
        nome_artistico: nome,
        nome_completo: nome,
        status: 'ativo',
        telefone: (body.telefone ?? '').trim() || undefined,
        cache_hora: body.cache_negociado ?? 0,
        link_twitch: plat.includes('Twitch') ? (body.link_twitch ?? '') : undefined,
        link_youtube: plat.includes('YouTube') ? (body.link_youtube ?? '') : undefined,
        link_kick: plat.includes('Kick') ? (body.link_kick ?? '') : undefined,
        link_instagram: plat.includes('Instagram') ? (body.link_instagram ?? '') : undefined,
        link_tiktok: plat.includes('TikTok') ? (body.link_tiktok ?? '') : undefined,
      },
      { onConflict: 'id', ignoreDuplicates: false }
    )

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
