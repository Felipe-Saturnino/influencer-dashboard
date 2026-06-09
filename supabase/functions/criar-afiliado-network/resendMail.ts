/** E-mails transacionais (conta, reset, boas-vindas). */
export const RESEND_FROM_SISTEMA_DEFAULT =
  'Data Intelligence <sistema@data-intelligence.spingaming.com.br>'

/** Relatório diário, agenda e demais crons operacionais. */
export const RESEND_FROM_RELATORIOS_DEFAULT =
  'Data Intelligence <relatorios@data-intelligence.spingaming.com.br>'

/** Secrets de destinatários — uma lista por e-mail cron. */
export const SECRET_DEST_RELATORIO_DIRETORIA = 'RELATORIO_DIRETORIA_DESTINATARIOS'
export const SECRET_DEST_EMAIL_AGENDA = 'EMAIL_AGENDA_DESTINATARIOS'

export type ResendFromKind = 'sistema' | 'relatorios'

function isValidFromAddress(value: string): boolean {
  return !!value && /@[\w.-]+\.[a-z]{2,}/i.test(value)
}

/** Secret: RESEND_FROM_SISTEMA — fallback canônico sistema@… */
export function resolveResendFromSistema(): string {
  const fromEnv = (Deno.env.get('RESEND_FROM_SISTEMA') ?? '').trim()
  return isValidFromAddress(fromEnv) ? fromEnv : RESEND_FROM_SISTEMA_DEFAULT
}

/**
 * Secrets (ordem): RESEND_FROM_RELATORIOS → RESEND_FROM (legado) → relatorios@…
 * Mantém compatibilidade se RESEND_FROM já apontar para relatorios@ no Supabase.
 */
export function resolveResendFromRelatorios(): string {
  const specific = (Deno.env.get('RESEND_FROM_RELATORIOS') ?? '').trim()
  if (isValidFromAddress(specific)) return specific
  const legacy = (Deno.env.get('RESEND_FROM') ?? '').trim()
  if (isValidFromAddress(legacy)) return legacy
  return RESEND_FROM_RELATORIOS_DEFAULT
}

export function resolveResendFrom(kind: ResendFromKind): string {
  return kind === 'relatorios' ? resolveResendFromRelatorios() : resolveResendFromSistema()
}

/**
 * Destinatários: body `destinatarios` só para teste manual; produção (cron `{}`) usa a secret.
 * @returns lista de e-mails ou `null` se body e secret estiverem vazios
 */
export function resolveDestinatarios(
  secretName: string,
  body?: { destinatarios?: string[] },
): string[] | null {
  const fromBody = body?.destinatarios?.filter((e) => typeof e === 'string' && e.includes('@')) ?? []
  if (fromBody.length > 0) {
    return fromBody.map((e) => e.trim().toLowerCase())
  }
  const envDest = (Deno.env.get(secretName) ?? '').trim()
  if (!envDest) return null
  const list = envDest.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
  return list.length > 0 ? list : null
}

export async function sendResendEmail(params: {
  to: string | string[]
  subject: string
  html: string
  fromKind?: ResendFromKind
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY não configurada' }
  }

  const toList = Array.isArray(params.to) ? params.to : [params.to]
  const from = resolveResendFrom(params.fromKind ?? 'sistema')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: toList,
      subject: params.subject,
      html: params.html,
    }),
  })

  if (res.ok) return { ok: true }
  const errText = await res.text()
  return { ok: false, error: `Resend ${res.status}: ${errText}` }
}
