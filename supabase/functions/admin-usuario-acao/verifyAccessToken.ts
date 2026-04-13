/**
 * Valida o access_token do Supabase (HS256) só pela assinatura e exp — sem consultar auth.sessions.
 * Evita o erro GoTrue: "Session from session_id claim in JWT does not exist" quando a linha de sessão
 * sumiu mas o JWT ainda é válido (ex.: cliente com storage desatualizado).
 *
 * Secret: mesmo valor de Settings → API → JWT Secret.
 * Edge secret: JWT_SECRET (prefixo SUPABASE_ é reservado no painel).
 *
 * Cópia local: o deploy do Supabase só inclui ficheiros desta pasta da função.
 */
import { jwtVerify } from 'https://esm.sh/jose@5.2.0'

export type VerifyAccessTokenResult =
  | { ok: true; userId: string }
  | { ok: false; error: string }

export async function verifySupabaseUserAccessToken(
  accessToken: string,
  jwtSecret: string,
): Promise<VerifyAccessTokenResult> {
  const tok = accessToken.trim()
  const secret = jwtSecret.trim()
  if (!tok || !secret) {
    return { ok: false, error: 'Token ou JWT secret ausente' }
  }
  try {
    const { payload } = await jwtVerify(tok, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    })
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return { ok: false, error: 'JWT sem sub (usuário)' }
    return { ok: true, userId: sub }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'JWT inválido ou expirado'
    return { ok: false, error: msg }
  }
}

export function readJwtSecretFromEnv(): string {
  return (Deno.env.get('JWT_SECRET') ?? Deno.env.get('SUPABASE_JWT_SECRET') ?? '').trim()
}
