import type { SupabaseClient } from "@supabase/supabase-js";

export type EnviarPagamentoEmailResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Notifica (e-mail) beneficiários com pagamento aguardando no ciclo fechado.
 * **Stub** — não envia e-mail; ver `.cursor/rules/emails.mdc` § Inventário.
 * TODO: Edge Function, Resend, template, destinatários por linha a_pagar, idempotência.
 */
export async function enviarPagamentoEmailCiclo(
  _client: SupabaseClient,
  _cicloId: string,
): Promise<EnviarPagamentoEmailResult> {
  return { ok: true };
}
