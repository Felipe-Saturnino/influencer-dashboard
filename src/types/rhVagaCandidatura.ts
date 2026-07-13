/** Linha de `public.rh_vaga_candidaturas` + joins usados na UI. */

import type { RhVagaRow } from "./rhVaga";
import type { RhOrigemContratacao } from "./rhFuncionario";

export type RhVagaCandidaturaEtapa =
  | "inscritos"
  | "aguardando_retorno"
  | "agendado"
  | "em_avaliacao"
  | "stand_by"
  | "contratado"
  | "dispensado";

export type RhVagaCandidaturaOrigemFormulario = "interno" | "site";

export type RhVagaCandidaturaTurno = "Manhã" | "Tarde" | "Noite" | "Comercial";

export type RhVagaCandidaturaFuncionarioJoin = {
  id: string;
  email: string;
  email_spin?: string | null;
  cargo?: string | null;
  data_inicio?: string | null;
  data_funcao?: string | null;
} | null;

export type RhVagaCandidaturaVagaJoin = Pick<
  RhVagaRow,
  | "id"
  | "codigo_vaga"
  | "titulo"
  | "tipo_vaga"
  | "status"
  | "necessario_video_apresentacao"
  | "necessario_turno"
> | null;

export type RhVagaCandidaturaRow = {
  id: string;
  vaga_id: string;
  funcionario_id: string | null;
  nome_completo: string;
  funcao_atual: string;
  curriculo_storage_path: string | null;
  curriculo_nome_arquivo: string | null;
  carta_apresentacao: string;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  redes_sociais?: string | null;
  origem?: RhOrigemContratacao | null;
  quem_indicou?: string | null;
  portfolio_storage_path?: string | null;
  portfolio_nome_arquivo?: string | null;
  portfolio_url?: string | null;
  video_storage_path?: string | null;
  video_nome_arquivo?: string | null;
  turno_trabalho?: RhVagaCandidaturaTurno | string | null;
  origem_formulario?: RhVagaCandidaturaOrigemFormulario | null;
  etapa: RhVagaCandidaturaEtapa;
  etapa_entrada_em?: string | null;
  data_agendamento?: string | null;
  data_aprovacao?: string | null;
  data_contratacao?: string | null;
  data_dispensa?: string | null;
  motivo_dispensa?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vaga?: RhVagaCandidaturaVagaJoin;
  funcionario?: RhVagaCandidaturaFuncionarioJoin;
};

export type RhVagasCandidaturasFiltroTipo = "todos" | "interno" | "externo";

export type RhVagaCandidaturaEtapaMeta = {
  id: RhVagaCandidaturaEtapa;
  label: string;
};
