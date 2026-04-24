/** Linha de `public.rh_vagas` + joins usados na UI. */

export type RhVagaStatus = "aberta" | "em_andamento" | "concluida" | "cancelada";

export type RhVagaTipo = "interna" | "externa" | "mista";

export type RhVagaOrgTimeJoin = {
  id: string;
  nome: string;
  gerencia: {
    nome: string;
    diretoria: { nome: string } | null;
  } | null;
} | null;

export type RhVagaCandidatoJoin = { id: string; nome: string } | null;

export type RhVagaRow = {
  id: string;
  titulo: string;
  tipo_vaga: RhVagaTipo;
  org_time_id: string | null;
  remuneracao_centavos: number;
  data_abertura: string;
  data_fim_inscricoes: string;
  descricao: string;
  responsabilidades: string;
  requisitos: string;
  escala_trabalho: string;
  status: RhVagaStatus;
  data_encerramento: string | null;
  candidato_selecionado_funcionario_id: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
  org_time?: RhVagaOrgTimeJoin;
  candidato?: RhVagaCandidatoJoin;
};

export type RhVagasAba = "abertas" | "em_andamento" | "gerenciamento";
