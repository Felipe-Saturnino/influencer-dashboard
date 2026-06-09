import { sendResendEmail } from '../resendMail.ts'
import { ASSUNTO_RECUPERACAO_SENHA, buildEmailRecuperacaoSenhaHtml } from './recuperacaoSenha.ts'
import { DEFAULT_LOGIN_URL } from './transacionalShell.ts'

/** Envio canônico de senha redefinida — remetente `fromKind: 'sistema'` → `RESEND_FROM_SISTEMA`. */
export async function enviarEmailRecuperacaoSenhaConta(params: {
  supabaseUrl: string
  to: string
  nome: string
  senhaTemporaria: string
  loginUrl?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const loginUrl = (params.loginUrl ?? '').trim() || DEFAULT_LOGIN_URL
  const to = params.to.trim().toLowerCase()
  const html = buildEmailRecuperacaoSenhaHtml({
    nome: params.nome,
    email: to,
    senhaTemporaria: params.senhaTemporaria,
    loginUrl,
    supabaseUrl: params.supabaseUrl,
  })
  const result = await sendResendEmail({
    to,
    subject: ASSUNTO_RECUPERACAO_SENHA,
    html,
    fromKind: 'sistema',
  })
  if (result.ok) {
    console.log('[email] Recuperação de senha enviada para', to)
  } else {
    console.error('[email] Falha recuperação de senha:', result.error)
  }
  return result
}
