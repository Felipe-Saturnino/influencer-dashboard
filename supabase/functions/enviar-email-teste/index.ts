import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendResendEmail } from './resendMail.ts'
import {
  ASSUNTO_BOAS_VINDAS,
  buildEmailBoasVindasHtml,
} from './emailTemplates/boasVindasUsuario.ts'
import { DEFAULT_LOGIN_URL } from './emailTemplates/transacionalShell.ts'

/**
 * Envio de preview de e-mails transacionais — somente com secret EMAIL_TESTE_SECRET.
 * Não cria usuário nem altera dados.
 *
 * Body: { secret, template: 'boas_vindas', to, loginUrl? }
 */

interface Body {
  secret?: string
  template?: string
  to?: string
  loginUrl?: string
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const expectedSecret = (Deno.env.get('EMAIL_TESTE_SECRET') ?? '').trim()
  if (!expectedSecret) {
    return new Response(JSON.stringify({
      error: 'EMAIL_TESTE_SECRET não configurada no Supabase. Adicione em Edge Functions → Secrets.',
    }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if ((body.secret ?? '').trim() !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Secret inválida' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const to = (body.to ?? '').trim().toLowerCase()
  if (!to || !/\S+@\S+\.\S+/.test(to)) {
    return new Response(JSON.stringify({ error: 'Campo to (e-mail) é obrigatório' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const template = (body.template ?? 'boas_vindas').trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const loginUrl = (body.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL

  if (template !== 'boas_vindas') {
    return new Response(JSON.stringify({ error: `Template desconhecido: ${template}` }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const html = buildEmailBoasVindasHtml({
    nome: 'Felipe (teste)',
    email: to,
    senhaTemporaria: 'SenhaExemplo123',
    loginUrl,
    supabaseUrl,
    isPreview: true,
  })

  const mail = await sendResendEmail({
    to,
    subject: `[Teste] ${ASSUNTO_BOAS_VINDAS}`,
    html,
    fromKind: 'sistema',
  })

  if (!mail.ok) {
    console.error('[enviar-email-teste] Falha Resend:', mail.error)
    return new Response(JSON.stringify({ ok: false, error: 'Falha ao enviar e-mail de teste' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  console.log('[enviar-email-teste] Enviado para', to)
  return new Response(JSON.stringify({ ok: true, to, template }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
