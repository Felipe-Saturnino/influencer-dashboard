import { buscarRhFuncionarioIdsPorEmailLogin } from "./rhFuncionarioLoginMatch";
import { supabase } from "./supabase";

/** IDs de vagas em que o prestador do login já possui candidatura. */
export async function buscarVagaIdsComCandidaturaDoLogin(
  emailRaw: string | null | undefined,
): Promise<Set<string>> {
  const funcionarioIds = await buscarRhFuncionarioIdsPorEmailLogin(emailRaw);
  if (funcionarioIds.length === 0) return new Set();

  const { data, error } = await supabase.from("rh_vaga_candidaturas").select("vaga_id").in("funcionario_id", funcionarioIds);

  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.vaga_id as string));
}

export async function prestadorJaInscritoNaVaga(vagaId: string, funcionarioId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("rh_vaga_candidaturas")
    .select("id")
    .eq("vaga_id", vagaId)
    .eq("funcionario_id", funcionarioId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}
