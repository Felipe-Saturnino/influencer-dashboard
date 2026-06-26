import { formatarData, hojeISO, secao } from './common.ts'
import { MARCA_PRODUTO, subtituloEmailComData } from './emailBrand.ts'
import {
  emailCtaButton,
  emailTransacionalShell,
  escapeHtml,
  PRODUCTION_LOGIN_URL,
  resolveLogoUrls,
} from './transacionalShell.ts'

export const ASSUNTO_RECUPERACAO_SENHA = 'Senha redefinida | Spin Gaming Data Intelligence'

export interface RecuperacaoSenhaEmailParams {
  nome: string
  email: string
  senhaTemporaria: string
  /** @deprecated Ignorado — CTA sempre aponta para produção. */
  loginUrl?: string
  supabaseUrl: string
}

export function buildEmailRecuperacaoSenhaHtml(params: RecuperacaoSenhaEmailParams): string {
  const nome = escapeHtml(params.nome)
  const email = escapeHtml(params.email)
  const senha = escapeHtml(params.senhaTemporaria)
  const loginUrl = escapeHtml(PRODUCTION_LOGIN_URL)
  const { logoDark, logoLight } = resolveLogoUrls(params.supabaseUrl)

  const corpo = secao(
    '',
    `    <p class="email-body-text-strong" style="margin:0 0 16px;font-size:14px;color:#111827;line-height:1.6;">Olá, <strong>${nome}</strong>!</p>
    <p class="email-body-text" style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
      Sua senha na plataforma Spin foi redefinida. Use o e-mail e a senha temporária abaixo para entrar.
      No próximo login, você será orientado(a) a definir uma senha pessoal.
    </p>

    <div class="email-credential-box" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <p class="email-body-label" style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">E-mail</p>
      <p class="email-body-text-strong" style="margin:0 0 16px;font-size:14px;font-weight:600;color:#111827;">${email}</p>
      <p class="email-body-label" style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Senha temporária</p>
      <p class="email-body-text-strong" style="margin:0;font-size:14px;font-weight:700;color:#111827;font-family:Consolas,'Courier New',monospace;letter-spacing:0.04em;">${senha}</p>
    </div>

    <p class="email-body-text" style="margin:0 0 24px;font-size:13px;color:#374151;line-height:1.5;">
      Por segurança, não compartilhe sua senha de acesso com ninguém.
    </p>

    <div style="text-align:center;">
      ${emailCtaButton(loginUrl)}
    </div>`,
    false,
  )

  return emailTransacionalShell({
    title: 'Redefinição de senha',
    subtitle: subtituloEmailComData(formatarData(hojeISO())),
    bodyHtml: corpo,
    footerLabel: 'E-mail sistêmico',
    footerBrand: MARCA_PRODUTO,
    logoDark,
    logoLight,
    pageTitle: ASSUNTO_RECUPERACAO_SENHA,
  })
}
