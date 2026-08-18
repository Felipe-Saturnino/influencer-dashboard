import { supabase } from "./supabase";
import type { RhFuncionario } from "../types/rhFuncionario";

export const ERRO_STAFF_SALVAR_GENERICO =
  "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";

export function mensagemErroStaffSalvar(code: string | undefined): string {
  switch (code) {
    case "conflito":
      return "Este cadastro foi alterado por outra pessoa. Recarregue e tente de novo.";
    case "sem_permissao":
    case "fora_escopo":
      return "Você não tem permissão para editar este staff.";
    case "id_tos_invalido":
      return "O ID TOS deve ser um UUID válido.";
    case "id_tos_duplicado":
      return "Este ID TOS já está cadastrado em outro Service Manager.";
    default:
      return ERRO_STAFF_SALVAR_GENERICO;
  }
}

export type RhStaffSalvarPatch = {
  staff_nickname: string | null;
  staff_turno: string | null;
  staff_horario_turno: null;
  staff_estudio_slugs: string[] | null;
  staff_estudio_slug: string | null;
  staff_operadora_slug: string | null;
  staff_barcode: string | null;
  staff_id_operacional: string | null;
  staff_id_tos?: string | null;
  staff_skills: Record<string, string>;
  staff_live_no_estudio: string | null;
  staff_dealer_genero?: string | null;
  staff_dealer_bio?: string | null;
  staff_dealer_fotos?: string[];
};

type RpcOk = { ok: true; row: RhFuncionario };
type RpcFail = { ok: false; code: string };

export async function salvarStaffGestao(params: {
  id: string;
  expectedUpdatedAt: string;
  patch: RhStaffSalvarPatch;
  historico: {
    alteracoes: { campo: string; antes: string; depois: string }[];
    usuario_label: string;
  } | null;
}): Promise<{ ok: true; row: RhFuncionario } | { ok: false; code: string }> {
  const { data, error } = await supabase.rpc("rh_staff_salvar", {
    p_id: params.id,
    p_expected_updated_at: params.expectedUpdatedAt,
    p_patch: params.patch,
    p_historico: params.historico,
  });
  if (error) return { ok: false, code: "erro" };
  const parsed = data as RpcOk | RpcFail | null;
  if (!parsed || typeof parsed !== "object") return { ok: false, code: "erro" };
  if ("ok" in parsed && parsed.ok === true && parsed.row) return { ok: true, row: parsed.row };
  if ("ok" in parsed && parsed.ok === false) return { ok: false, code: parsed.code || "erro" };
  return { ok: false, code: "erro" };
}
