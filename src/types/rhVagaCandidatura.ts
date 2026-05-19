/** Linha de `public.rh_vaga_candidaturas` + joins usados na UI. */

import type { RhVagaRow, RhVagaStatus, RhVagaTipo } from "./rhVaga";

export type RhVagaCandidaturaEtapa =
  | "inscritos"
  | "aguardando_retorno"
  | "agendado"
  | "em_avaliacao"
  | "aprovado"
  | "stand_by"
  | "contratado"
  | "dispensado";

export type RhVagaCandidaturaFuncionarioJoin = {
  id: string;
  email: string;
  email_spin?: string | null;
} | null;

export type RhVagaCandidaturaVagaJoin = Pick<RhVagaRow, "id" | "codigo_vaga" | "titulo" | "tipo_vaga" | "status"> | null;

export type RhVagaCandidaturaRow = {
  id: string;
  vaga_id: string;
  funcionario_id: string;
  nome_completo: string;
  funcao_atual: string;
  curriculo_storage_path: string;
  curriculo_nome_arquivo: string;
  carta_apresentacao: string;
  etapa: RhVagaCandidaturaEtapa;
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
