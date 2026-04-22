export type RhOrgStatus = "ativo" | "inativo";

export interface RhOrgDiretoria {
  id: string;
  nome: string;
  diretor_funcionario_id: string | null;
  diretor_nome_livre: string | null;
  diretor_foto_url: string | null;
  diretor_sobre: string;
  /** Código numérico 3 dígitos (ex.: 001). */
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
  /** Código numérico: diretoria (3) + ordem na diretoria (3), ex.: 001002. */
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
  /** Código numérico: gerência (6) + ordem na gerência (3), ex.: 001002003. */
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

export type RhOrgPrestadorVinculoNivel = "diretoria" | "gerencia" | "time";

/** Opção de vínculo ao organograma (diretoria, gerência ou time) no cadastro de prestador. */
export interface RhOrgPrestadorVinculoOpcao {
  nivel: RhOrgPrestadorVinculoNivel;
  diretoriaId: string;
  gerenciaId: string | null;
  timeId: string | null;
  diretoriaNome: string;
  gerenciaNome: string;
  timeNome: string;
  label: string;
  /** Valor gravado em `rh_funcionarios.setor` ao escolher o nó. */
  setorNome: string;
  gestorNome: string;
}

/** Agrupamento Diretoria › Gerência para select na Gestão de Prestadores. */
export interface RhOrgOrganogramaGrupoPrestador {
  key: string;
  label: string;
  vinculos: RhOrgPrestadorVinculoOpcao[];
  /** Quando o select aceita só times (ex.: vagas) e não há time ativo neste ramo. */
  emptyTimesPlaceholder?: string;
}
