/** Linha de `public.rh_funcionarios` (Supabase). CPF/CNPJ só dígitos. */
export type RhFuncionarioStatus = "ativo" | "inativo";

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
  contato_emergencia: string;
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
  banco: string;
  agencia: string;
  conta_corrente: string;
  pix: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
