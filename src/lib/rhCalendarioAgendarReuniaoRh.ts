import { supabase } from "./supabase";

export async function agendarReuniaoRhCalendario(params: {
  solicitanteFuncionarioId: string;
  refMesIso: string;
  diaIso: string;
  turno: string;
  motivo: string;
}): Promise<{ ok: true; solicitacaoId: string } | { ok: false }> {
  const { data, error } = await supabase.rpc("rh_calendario_agendar_reuniao_rh", {
    p_solicitante_funcionario_id: params.solicitanteFuncionarioId,
    p_ref_mes: params.refMesIso,
    p_dia_iso: params.diaIso,
    p_turno: params.turno,
    p_motivo: params.motivo.trim(),
  });
  if (error || !data) {
    console.error("[agendarReuniaoRhCalendario]", error);
    return { ok: false };
  }
  return { ok: true, solicitacaoId: String(data) };
}
