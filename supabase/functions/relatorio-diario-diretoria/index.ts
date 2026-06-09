import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendResendEmail, SECRET_DEST_RELATORIO_DIRETORIA, resolveDestinatarios } from './resendMail.ts'
import { formatarData } from './relatorioEmails/common.ts'
import { fetchRelatorioDiretoriaData } from './relatorioEmails/fetchRelatorioDiretoriaData.ts'
import { gerarHTMLRelatorioDiretoria } from './relatorioEmails/templateRelatorioDiretoria.ts'

const EMAIL_TIPO = 'relatorio_diretoria' as const

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
}

serve(async (req) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: { destinatarios?: string[] } = {}
    if (req.method === 'POST') {
      try {
        body = (await req.json()) as { destinatarios?: string[] }
      } catch {
        /* ok */
      }
    }

    const destinatarios = resolveDestinatarios(SECRET_DEST_RELATORIO_DIRETORIA, body)
    if (!destinatarios?.length) {
      return new Response(
        JSON.stringify({
          error: `Configure ${SECRET_DEST_RELATORIO_DIRETORIA} ou envie destinatarios no body.`,
        }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const data = await fetchRelatorioDiretoriaData(supabase)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const logoUrl = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming%20White.png`
      : ''
    const logoUrlDark = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/logos/Logo%20Spin%20Gaming.png`
      : ''

    const html = gerarHTMLRelatorioDiretoria(data, logoUrl, logoUrlDark)
    const subject = `Relatório Diário - ${formatarData(data.dataHoje)} | Aquisição`

    const result = await sendResendEmail({
      to: destinatarios,
      subject,
      html,
      fromKind: 'relatorios',
    })

    if (!result.ok) {
      try {
        await supabase.from('tech_logs').insert({
          integracao_slug: null,
          tipo: EMAIL_TIPO,
          descricao: result.error ?? 'Erro ao enviar e-mail via Resend',
        })
      } catch (e) {
        console.warn('[relatorio-diario-diretoria] Falha ao registrar tech_log:', e)
      }
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    try {
      await supabase.from('email_envios').insert({
        data: data.dataHoje,
        tipo: EMAIL_TIPO,
        destinatarios_count: destinatarios.length,
      })
    } catch (e) {
      console.warn('[relatorio-diario-diretoria] Falha ao registrar email_envios:', e)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data_agenda: data.dataHoje,
        data_consolidado: data.dataOntem,
        total_agenda: data.agenda.length,
        total_influencer_rows: data.influencersRows.length,
        total_operadoras: Math.max(0, data.operadorasMtd.length - 1),
        streamers_mtd: data.streamersMtd,
        midias_mtd: data.midiasMtd,
        destinatarios,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('[relatorio-diario-diretoria] Erro:', e)
    try {
      const supabaseErr = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      await supabaseErr.from('tech_logs').insert({
        integracao_slug: null,
        tipo: EMAIL_TIPO,
        descricao: `[exceção] ${String(e)}`.slice(0, 2000),
      })
    } catch {
      /* ignora */
    }
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
