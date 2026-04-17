export type RhOrgStatus = "ativo" | "inativo";

export interface RhOrgDiretoria {
  id: string;
  nome: string;
  diretor_funcionario_id: string | null;
  diretor_nome_livre: string | null;
  diretor_foto_url: string | null;
  diretor_sobre: string;
  /** Código fixo hierárquico (ex.: RH.D.XXXXXXXX). */
  centro_custos: string;
  status: RhOrgStatus;
  created_at: string;
  updated_at: string;
}

export interface RhOrgGerencia {
  id: string;
  diretoria_id: string;
  nome: string;
  gerente_funcionario_id: string | null;
  gerente_nome_livre: string | null;
  sobre_gerencia: string;
  /** Sufixo hierárquico sobre a diretoria (… .G.XXXXXX). */
  centro_custos: string;
  status: RhOrgStatus;
  created_at: string;
  updated_at: string;
}

export interface RhOrgTime {
  id: string;
  gerencia_id: string;
  nome: string;
  lider_funcionario_id: string | null;
  lider_nome_livre: string | null;
  /** Sufixo hierárquico sobre a gerência (… .T.XXXXXX). */
  centro_custos: string;
  status: RhOrgStatus;
  created_at: string;
  updated_at: string;
}

export interface RhOrgDiretoriaComFilhos extends RhOrgDiretoria {
  gerencias: RhOrgGerenciaComFilhos[];
}

export interface RhOrgGerenciaComFilhos extends RhOrgGerencia {
  times: RhOrgTime[];
}

/** Opção flat para select no cadastro de funcionário. */
export interface RhOrgTimeOpcao {
  timeId: string;
  timeNome: string;
  gerenciaNome: string;
  diretoriaNome: string;
  label: string;
  gestorNome: string;
}
