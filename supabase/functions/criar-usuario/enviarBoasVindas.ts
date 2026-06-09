import { sendResendEmail } from './resendMail.ts'
import { ASSUNTO_BOAS_VINDAS, buildEmailBoasVindasHtml } from './boasVindasUsuario.ts'
import { DEFAULT_LOGIN_URL } from './transacionalShell.ts'
import { registrarEmailTransacional } from './registrarEmailTransacional.ts'

export const EMAIL_TIPO_BOAS_VINDAS = 'boas_vindas'

type SupabaseLogClient = Parameters<typeof registrarEmailTransacional>[0]

/** Envio canônico de boas-vindas (conta nova) — remetente `fromKind: 'sistema'` → `RESEND_FROM_SISTEMA`. */
export async function enviarEmailBoasVindasConta(params: {
  supabaseUrl: string
  supabase?: SupabaseLogClient
  to: string
  nome: string
  senhaTemporaria: string
  loginUrl?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const loginUrl = (params.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL
  const html = buildEmailBoasVindasHtml({
    nome: params.nome,
    email: params.to.trim().toLowerCase(),
    senhaTemporaria: params.senhaTemporaria,
    loginUrl,
    supabaseUrl: params.supabaseUrl,
  })
  const result = await sendResendEmail({
    to: params.to.trim().toLowerCase(),
    subject: ASSUNTO_BOAS_VINDAS,
    html,
    fromKind: 'sistema',
  })
  if (result.ok) {
    console.log('[email] Boas-vindas enviado para', params.to.trim().toLowerCase())
    await registrarEmailTransacional(params.supabase, EMAIL_TIPO_BOAS_VINDAS, true)
  } else {
    console.error('[email] Falha boas-vindas:', result.error)
    await registrarEmailTransacional(params.supabase, EMAIL_TIPO_BOAS_VINDAS, false, result.error)
  }
  return result
}
