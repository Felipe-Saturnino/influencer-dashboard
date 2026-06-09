/** Registra envio transacional em email_envios (sucesso) ou tech_logs (falha) — Status Técnico. */

export function hojeIsoBr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

type SupabaseInsertClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>
  }
}

export async function registrarEmailTransacional(
  supabase: SupabaseInsertClient | undefined,
  tipo: string,
  ok: boolean,
  error?: string,
): Promise<void> {
  if (!supabase) return
  try {
    if (ok) {
      await supabase.from('email_envios').insert({
        data: hojeIsoBr(),
        tipo,
        destinatarios_count: 1,
      })
    } else {
      await supabase.from('tech_logs').insert({
        integracao_slug: null,
        tipo,
        descricao: (error ?? 'Erro ao enviar e-mail via Resend').slice(0, 2000),
      })
    }
  } catch (e) {
    console.warn(`[email] Falha ao registrar ${tipo}:`, e)
  }
}
