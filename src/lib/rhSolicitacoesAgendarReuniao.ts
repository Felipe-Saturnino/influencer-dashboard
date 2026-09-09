import { supabase } from "./supabase";
import type { RhSolicitacaoTipo } from "../types/rhSolicitacao";

export type RhSolicitacaoAgendarReuniaoTipo = Extract<
  RhSolicitacaoTipo,
  "reuniao_rh" | "reuniao_lideranca"
>;

export async function agendarReuniaoSolicitacoes(params: {
  prestadorId: string;
  tipo: RhSolicitacaoAgendarReuniaoTipo;
  diaIso: string;
  turno?: string;
  observacao: string;
}): Promise<{ ok: true; solicitacaoId: string } | { ok: false }> {
  const { data, error } = await supabase.rpc("rh_solicitacoes_agendar_reuniao", {
    p_prestador_id: params.prestadorId,
    p_tipo: params.tipo,
    p_dia_iso: params.diaIso.slice(0, 10),
    p_turno: (params.turno ?? "").trim(),
    p_observacao: params.observacao.trim(),
  });
  if (error || !data) {
    console.error("[agendarReuniaoSolicitacoes]", error);
    return { ok: false };
  }
  return { ok: true, solicitacaoId: String(data) };
}
