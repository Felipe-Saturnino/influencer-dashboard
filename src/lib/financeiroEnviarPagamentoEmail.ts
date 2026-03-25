import type { SupabaseClient } from "@supabase/supabase-js";

export type EnviarPagamentoEmailResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Notifica (e-mail) beneficiários com pagamento aguardando no ciclo fechado.
 * TODO: Edge Function, provedor de e-mail, template, destinatários por linha a_pagar, idempotência.
 */
export async function enviarPagamentoEmailCiclo(
  _client: SupabaseClient,
  _cicloId: string,
): Promise<EnviarPagamentoEmailResult> {
  return { ok: true };
}
