// Edge Function: sync-pls-jogador
// Lê âncoras em public.pls_jogador_dados (cda_id), chama o backoffice PLS com o cookie
// de sessão e grava public.pls_jogador_dados + public.pls_jogador_historico_dia.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   PLS_BO_COOKIE        (obrigatório) Valor do header Cookie copiado do browser (sessão logada).
//   PLS_URL_PROFILE      (obrigatório) URL do pedido de perfil com placeholder {playerId}
//                          Ex.: https://....../algum-path/casadeapostas.if_dgc.L011_358_56.CDA-2056197
//                          → substitui o segmento pelo placeholder: .../{playerId} ou ...%7BplayerId%7D
//                          Use {playerId} literal no path/query; a função faz replace.
//   PLS_URL_DAYS         (obrigatório) URL do JSON com { days: [...] } (Game totals by date), mesmo placeholder.
//   PLS_PLAYER_PREFIX    (opcional)    Prefixo antes de CDA-<número>. Default: casadeapostas.if_dgc.L011_358_56
//   PLS_BO_ORIGIN        (opcional)    Header Origin. Default: https://bo2.sg.onairent.live
//   PLS_BO_REFERER       (opcional)    Header Referer. Default: https://bo2.sg.onairent.live/backoffice/static/bo
//
// Deploy: supabase functions deploy sync-pls-jogador
// Teste:  POST .../functions/v1/sync-pls-jogador  body: {} ou { "cda_id": "2056197" }
//
// Nota: totais agregados (ggr / turnover) na linha do jogador são a soma dos dias retornados
// no endpoint de days (se a API paginar ou limitar, o total pode não bater com o Excel completo).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncBody {
  cda_id?: string
}

interface PlsProfileJson {
  playerId?: string
  registrationDate?: number
  lastLoginDate?: number
  balance?: number
}

interface PlsDayTotals {
  totalBet?: number
  totalPayout?: number
  totalNet?: number
  amount?: number
  payout?: number
  net?: number
}

interface PlsDayRow {
  day: number
  gameCount?: number
  totals?: PlsDayTotals
}

interface PlsDaysJson {
  days?: PlsDayRow[]
}

function defaultPlayerPrefix(): string {
  return Deno.env.get('PLS_PLAYER_PREFIX') ?? 'casadeapostas.if_dgc.L011_358_56'
}

function buildPlayerId(cdaId: string): string {
  const prefix = defaultPlayerPrefix().replace(/\.+$/, '')
  return `${prefix}.CDA-${cdaId}`
}

function expandUrl(template: string, playerId: string): string {
  if (!template.includes('{playerId}')) {
    throw new Error('PLS_URL_PROFILE / PLS_URL_DAYS devem conter o literal {playerId} (veja comentário no topo de index.ts).')
  }
  // Path da PLS costuma usar o id com pontos literais; se o teu URL estiver em query string com caracteres especiais, codifica manualmente no template.
  return template.split('{playerId}').join(playerId)
}

function msToTimestamptz(ms: number): string {
  return new Date(ms).toISOString()
}

function msToDateUtc(ms: number): string {
  return new Date(ms).toISOString().split('T')[0]
}

function plsFetchHeaders(cookie: string): HeadersInit {
  const origin = Deno.env.get('PLS_BO_ORIGIN') ?? 'https://bo2.sg.onairent.live'
  const referer = Deno.env.get('PLS_BO_REFERER') ?? 'https://bo2.sg.onairent.live/backoffice/static/bo'
  return {
    'Cookie': cookie,
    'Accept': 'application/json, text/plain, */*',
    'Origin': origin,
    'Referer': referer,
  }
}

async function fetchJson<T>(url: string, headers: HeadersInit): Promise<T> {
  const res = await fetch(url, { method: 'GET', headers })
  const text = await res.text()
  if (res.status === 401 || res.status === 403) {
    throw new Error(`PLS ${res.status}: cookie expirado ou sem permissão — atualize PLS_BO_COOKIE.`)
  }
  if (!res.ok) {
    throw new Error(`PLS HTTP ${res.status} em ${url.slice(0, 120)}… — corpo: ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Resposta não-JSON de ${url.slice(0, 80)}…`)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, erro: 'Use POST' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const cookie = Deno.env.get('PLS_BO_COOKIE')?.trim()
    const urlProfileTpl = Deno.env.get('PLS_URL_PROFILE')?.trim()
    const urlDaysTpl = Deno.env.get('PLS_URL_DAYS')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!cookie) {
      return new Response(
        JSON.stringify({ ok: false, erro: 'Secret PLS_BO_COOKIE não configurada.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!urlProfileTpl || !urlDaysTpl) {
      return new Response(
        JSON.stringify({
          ok: false,
          erro: 'Configure PLS_URL_PROFILE e PLS_URL_DAYS (com {playerId}) nos Secrets. Copie do DevTools → Network o URL completo e substitua o id do jogador por {playerId}.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!supabaseUrl || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em falta.')
    }

    let body: SyncBody = {}
    try {
      body = (await req.json()) as SyncBody
    } catch {
      /* body vazio */
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    let query = supabase.from('pls_jogador_dados').select('cda_id')
    if (body.cda_id) query = query.eq('cda_id', String(body.cda_id).trim())

    const { data: anchors, error: qErr } = await query
    if (qErr) throw new Error(`Supabase: ${qErr.message}`)
    if (!anchors?.length) {
      return new Response(
        JSON.stringify({ ok: true, mensagem: 'Nenhuma linha em pls_jogador_dados (filtro ou tabela vazia).', processados: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const headers = plsFetchHeaders(cookie)
    const resultados: Array<{ cda_id: string; ok: boolean; erro?: string }> = []

    for (const row of anchors) {
      const cdaId = row.cda_id
      const playerId = buildPlayerId(cdaId)
      try {
        const profileUrl = expandUrl(urlProfileTpl, playerId)
        const daysUrl = expandUrl(urlDaysTpl, playerId)

        const profile = await fetchJson<PlsProfileJson>(profileUrl, headers)
        const daysPayload = await fetchJson<PlsDaysJson>(daysUrl, headers)
        const days = Array.isArray(daysPayload.days) ? daysPayload.days : []

        let sumBet = 0
        let sumNet = 0
        const historicoRows = days.map((d) => {
          const bet = Number(d.totals?.totalBet ?? d.totals?.amount ?? 0)
          const payout = Number(d.totals?.totalPayout ?? d.totals?.payout ?? 0)
          const net = Number(d.totals?.totalNet ?? d.totals?.net ?? 0)
          sumBet += bet
          sumNet += net
          return {
            cda_id: cdaId,
            game_date: msToDateUtc(d.day),
            game_count: d.gameCount ?? 0,
            turnover: bet,
            payout,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        const nowIso = new Date().toISOString()
        const { error: upErr } = await supabase
          .from('pls_jogador_dados')
          .update({
            registration_date_utc: profile.registrationDate != null ? msToTimestamptz(profile.registrationDate) : null,
            last_login_date_utc: profile.lastLoginDate != null ? msToTimestamptz(profile.lastLoginDate) : null,
            balance: profile.balance ?? null,
            ggr: sumNet,
            turnover: sumBet,
            synced_at: nowIso,
            updated_at: nowIso,
          })
          .eq('cda_id', cdaId)

        if (upErr) throw new Error(upErr.message)

        if (historicoRows.length > 0) {
          const { error: hErr } = await supabase.from('pls_jogador_historico_dia').upsert(historicoRows, {
            onConflict: 'cda_id,game_date',
          })
          if (hErr) throw new Error(hErr.message)
        }

        resultados.push({ cda_id: cdaId, ok: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[sync-pls-jogador] cda_id=${cdaId}: ${msg}`)
        resultados.push({ cda_id: cdaId, ok: false, erro: msg })
      }
      await new Promise((r) => setTimeout(r, 250))
    }

    const okCount = resultados.filter((r) => r.ok).length
    return new Response(
      JSON.stringify({
        ok: resultados.every((r) => r.ok),
        processados: resultados.length,
        sucesso: okCount,
        falhas: resultados.length - okCount,
        detalhes: resultados,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[sync-pls-jogador] ${msg}`)
    return new Response(JSON.stringify({ ok: false, erro: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
