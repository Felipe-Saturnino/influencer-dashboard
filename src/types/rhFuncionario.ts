/** Linha de `public.rh_funcionarios` (Supabase). CPF/CNPJ só dígitos. */
export type RhFuncionarioStatus = "ativo" | "indisponivel" | "encerrado";

export type RhHistoricoAcaoTipo =
  | "revisao_contrato"
  | "periodo_indisponibilidade"
  | "retorno_indisponibilidade"
  | "alinhamento_formal"
  | "termino_prestacao"
  | "reativacao_prestacao"
  | "rh_talks"
  | "anotacao_rh"
  | "staff_gestao_edicao"
  | "dados_cadastro_self";

/** Histórico da ação «Término da Prestação» (`detalhes.tipo_termino`). */
export type RhTipoTerminoPrestacao = "voluntario" | "nao_voluntario";

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

/** Contratação: Estúdio (hora + escala + turno) vs Escritório (mensal + escala). */
export type RhAreaAtuacao = "estudio" | "escritorio";

export interface RhFuncionario {
  id: string;
  status: RhFuncionarioStatus;
  nome: string;
  rg: string;
  cpf: string;
  telefone: string;
  email: string;
  /** E-mail corporativo Spin (opcional); vínculo com login quando diferente do e-mail pessoal. */
  email_spin?: string | null;
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
  /** Vínculo ao organograma (níveis mutuamente exclusivos no banco). */
  org_diretoria_id?: string | null;
  org_gerencia_id?: string | null;
  /** Time do organograma (RH); preenche `setor` com o nome do time quando aplicável. */
  org_time_id?: string | null;
  cargo: string;
  nivel: string;
  /** Estúdio vs Escritório (Gestão de Prestadores — Dados de contratação). */
  area_atuacao?: RhAreaAtuacao | null;
  /** Centavos por hora quando `area_atuacao` = estudio. */
  remuneracao_hora_centavos?: number | null;
  salario: number;
  data_inicio: string;
  /** Data da função/cargo (YYYY-MM-DD). */
  data_funcao?: string | null;
  data_desligamento: string | null;
  /** Nota interna de RH (texto livre). Opcional até migração aplicada no banco. */
  observacao_rh?: string | null;
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
  /** Gestão de Staff — opcional até migration aplicada. */
  staff_nickname?: string | null;
  staff_operadora_slug?: string | null;
  staff_barcode?: string | null;
  /** ID de staff definido pela operação (não é o UUID da plataforma). */
  staff_id_operacional?: string | null;
  /** Turno operacional (Gestão de Staff); distinto de `escala` (4x2/3x3 — Gestão de Prestadores). */
  staff_turno?: string | null;
  /** JSON: baccarat | blackjack | vip | roleta | futebol_studio → ativo | treinamento | inativo */
  staff_skills?: Record<string, string> | null;
  /** Gênero no dealer (Gestão de Staff > Gestão de dealer). */
  staff_dealer_genero?: "feminino" | "masculino" | null;
  /** Bio do dealer (`dealers.perfil_influencer`). */
  staff_dealer_bio?: string | null;
  /** URLs das fotos do dealer (JSON array). */
  staff_dealer_fotos?: unknown;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type RhFuncionarioSelfMediaKind = "documento" | "foto";

/** Linha de `public.rh_funcionario_self_media` (uploads na página Dados de Cadastro). */
export interface RhFuncionarioSelfMedia {
  id: string;
  rh_funcionario_id: string;
  kind: RhFuncionarioSelfMediaKind;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
  created_by: string | null;
}
