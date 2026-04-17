/** Linha de `public.rh_funcionarios` (Supabase). CPF/CNPJ só dígitos. */
export type RhFuncionarioStatus = "ativo" | "indisponivel" | "encerrado";

export type RhHistoricoAcaoTipo =
  | "revisao_contrato"
  | "periodo_indisponibilidade"
  | "retorno_indisponibilidade"
  | "alinhamento_formal"
  | "termino_prestacao"
  | "reativacao_prestacao";

/** Linha de `public.rh_funcionario_historico`. */
export interface RhFuncionarioHistorico {
  id: string;
  rh_funcionario_id: string;
  tipo: RhHistoricoAcaoTipo | string;
  detalhes: Record<string, unknown>;
  anexos: unknown;
  created_at: string;
  created_by: string | null;
}

export type RhFuncionarioTipoContrato = "CLT" | "PJ" | "Estagio" | "Temporario";

export interface RhFuncionario {
  id: string;
  status: RhFuncionarioStatus;
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco_residencial: string;
  res_cep: string;
  res_logradouro: string;
  res_numero: string;
  res_complemento: string;
  res_cidade: string;
  res_estado: string;
  contato_emergencia: string;
  emerg_nome: string;
  emerg_parentesco: string;
  emerg_telefone: string;
  setor: string;
  /** Time do organograma (RH); preenche `setor` com o nome do time. */
  org_time_id?: string | null;
  cargo: string;
  nivel: string;
  salario: number;
  data_inicio: string;
  data_desligamento: string | null;
  escala: string;
  tipo_contrato: RhFuncionarioTipoContrato;
  nome_empresa: string;
  cnpj: string;
  endereco_empresa: string;
  emp_cep: string;
  emp_logradouro: string;
  emp_numero: string;
  emp_complemento: string;
  emp_cidade: string;
  emp_estado: string;
  banco: string;
  agencia: string;
  conta_corrente: string;
  pix: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
