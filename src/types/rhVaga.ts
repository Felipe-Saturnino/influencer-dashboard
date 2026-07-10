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

export type RhVagaOrgGerenciaJoin = {
  id: string;
  nome: string;
  diretoria: { nome: string } | null;
} | null;

export type RhVagaOrgDiretoriaJoin = { id: string; nome: string } | null;

export type RhVagaCandidatoJoin = { id: string; nome: string } | null;

export type RhVagaRow = {
  id: string;
  /** Preenchido após migração `20260520140000`; trigger gera em novas vagas. */
  codigo_vaga?: string;
  titulo: string;
  tipo_vaga: RhVagaTipo;
  org_time_id: string | null;
  org_gerencia_id?: string | null;
  org_diretoria_id?: string | null;
  repasse_inicial_centavos: number;
  data_abertura: string;
  data_fim_inscricoes: string;
  descricao: string;
  responsabilidades: string;
  tags: string[];
  necessario_video_apresentacao: boolean;
  necessario_turno: boolean;
  status: RhVagaStatus;
  data_encerramento: string | null;
  candidato_selecionado_funcionario_id: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
  org_time?: RhVagaOrgTimeJoin;
  org_gerencia?: RhVagaOrgGerenciaJoin;
  org_diretoria?: RhVagaOrgDiretoriaJoin;
  candidato?: RhVagaCandidatoJoin;
};

export type RhVagasAba = "abertas" | "em_andamento" | "gerenciamento" | "candidaturas";
