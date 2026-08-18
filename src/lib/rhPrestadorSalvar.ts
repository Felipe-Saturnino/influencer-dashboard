import { supabase } from "./supabase";
import type { RhFuncionario } from "../types/rhFuncionario";

export const ERRO_PRESTADOR_SALVAR_GENERICO =
  "Não foi possível salvar. Se o problema persistir, entre em contato com o suporte.";

export const ERRO_PRESTADOR_SYNC =
  "O cadastro foi gravado, mas não foi possível sincronizar o acesso à plataforma. Se o problema persistir, entre em contato com o suporte.";

export const ERRO_PRESTADOR_SYNC_DEALER =
  "O cadastro foi gravado, mas não foi possível sincronizar o dealer. Se o problema persistir, entre em contato com o suporte.";

export const ERRO_PRESTADOR_EXCLUIR =
  "Não foi possível excluir o prestador. Se o problema persistir, entre em contato com o suporte.";

export const ERRO_PRESTADOR_HISTORICO =
  "Não foi possível carregar o histórico. Se o problema persistir, entre em contato com o suporte.";

export const ERRO_PRESTADOR_CONFLITO =
  "Este cadastro foi alterado por outra pessoa. Recarregue e tente de novo.";

export function mensagemErroPrestadorSalvar(code: string | undefined): string {
  switch (code) {
    case "conflito":
      return ERRO_PRESTADOR_CONFLITO;
    case "sem_permissao":
      return "Você não tem permissão para salvar este prestador.";
    case "nao_encontrado":
      return "Não foi possível identificar o registro. Feche o modal e abra novamente.";
    case "cpf_duplicado":
      return "Já existe um prestador cadastrado com este CPF.";
    case "cpf_invalido":
      return "CPF Inválido";
    default:
      return ERRO_PRESTADOR_SALVAR_GENERICO;
  }
}

type RpcOk = { ok: true; row: RhFuncionario };
type RpcFail = { ok: false; code: string };
type RpcTalksOk = { ok: true };

export type RhPrestadorHistoricoPayload = {
  tipo: string;
  detalhes: Record<string, unknown>;
  anexos: { name: string; path: string; publicUrl: string }[];
};

export async function salvarPrestadorGestao(params: {
  id: string | null;
  expectedUpdatedAt: string | null;
  patch: Record<string, unknown>;
  historico?: RhPrestadorHistoricoPayload | null;
}): Promise<{ ok: true; row: RhFuncionario } | { ok: false; code: string }> {
  const { data, error } = await supabase.rpc("rh_prestador_salvar", {
    p_id: params.id,
    p_expected_updated_at: params.expectedUpdatedAt,
    p_patch: params.patch,
    p_historico: params.historico ?? null,
  });
  if (error) {
    console.error("[rhPrestadorSalvar] rpc", error);
    return { ok: false, code: "erro" };
  }
  const parsed = data as RpcOk | RpcFail | null;
  if (!parsed || typeof parsed !== "object") return { ok: false, code: "erro" };
  if ("ok" in parsed && parsed.ok === true && parsed.row) return { ok: true, row: parsed.row };
  if ("ok" in parsed && parsed.ok === false) return { ok: false, code: parsed.code || "erro" };
  return { ok: false, code: "erro" };
}

export async function salvarPrestadorTalksGestao(params: {
  funcionarioIds: string[];
  detalhes: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  const { data, error } = await supabase.rpc("rh_prestador_talks_salvar", {
    p_funcionario_ids: params.funcionarioIds,
    p_detalhes: params.detalhes,
    p_anexos: [],
  });
  if (error) {
    console.error("[rhPrestadorSalvar] talks rpc", error);
    return { ok: false, code: "erro" };
  }
  const parsed = data as RpcTalksOk | RpcFail | null;
  if (!parsed || typeof parsed !== "object") return { ok: false, code: "erro" };
  if ("ok" in parsed && parsed.ok === true) return { ok: true };
  if ("ok" in parsed && parsed.ok === false) return { ok: false, code: parsed.code || "erro" };
  return { ok: false, code: "erro" };
}

export const PRESTADOR_DETALHE_SELECT = [
  "id",
  "status",
  "nome",
  "rg",
  "cpf",
  "telefone",
  "email",
  "email_spin",
  "data_nascimento",
  "endereco_residencial",
  "res_cep",
  "res_logradouro",
  "res_numero",
  "res_complemento",
  "res_cidade",
  "res_estado",
  "contato_emergencia",
  "emerg_nome",
  "emerg_parentesco",
  "emerg_telefone",
  "setor",
  "org_diretoria_id",
  "org_gerencia_id",
  "org_time_id",
  "cargo",
  "nivel",
  "area_atuacao",
  "remuneracao_hora_centavos",
  "salario",
  "data_inicio",
  "data_funcao",
  "origem_contratacao",
  "quem_indicou",
  "data_desligamento",
  "observacao_rh",
  "escala",
  "tipo_contrato",
  "nome_empresa",
  "cnpj",
  "endereco_empresa",
  "emp_cep",
  "emp_logradouro",
  "emp_numero",
  "emp_complemento",
  "emp_cidade",
  "emp_estado",
  "banco",
  "agencia",
  "conta_corrente",
  "pix",
  "staff_turno",
  "cadastro_revisado_em",
  "cadastro_revisao_tipo",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(", ");

export const PRESTADOR_HISTORICO_SELECT =
  "id, rh_funcionario_id, tipo, detalhes, anexos, created_at, created_by";

export async function buscarPrestadorPorId(
  id: string,
): Promise<{ row: RhFuncionario | null; error: string | null }> {
  const { data, error } = await supabase
    .from("rh_funcionarios")
    .select(PRESTADOR_DETALHE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[rhPrestadorSalvar] detalhe", error);
    return {
      row: null,
      error: "Não foi possível carregar o prestador. Se o problema persistir, entre em contato com o suporte.",
    };
  }
  return { row: (data as unknown as RhFuncionario) ?? null, error: null };
}
