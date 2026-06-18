import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Nome canónico do responsável por liberações legadas e criação manual (Gestão de Usuários). */
export const ACCESS_GRANTED_BY_CANONICAL_NAME = 'Felipe Saturnino'

export async function resolveAccessGrantedByProfileId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const fromEnv = (Deno.env.get('ACCESS_GRANTED_BY_PROFILE_ID') ?? '').trim()
  if (fromEnv) return fromEnv

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('name', ACCESS_GRANTED_BY_CANONICAL_NAME)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as { id?: string } | null)?.id ?? null
}

export async function accessGrantedByPayload(
  supabase: SupabaseClient,
): Promise<{ access_granted_by: string | null; access_granted_at: string }> {
  return {
    access_granted_by: await resolveAccessGrantedByProfileId(supabase),
    access_granted_at: new Date().toISOString(),
  }
}
