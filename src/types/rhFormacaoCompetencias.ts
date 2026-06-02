export type RhFormacaoGrau =
  | "ensino_medio"
  | "tecnico"
  | "tecnologo"
  | "graduacao"
  | "pos_graduacao"
  | "mba"
  | "mestrado"
  | "doutorado";

export type RhFormacaoStatus = "concluido" | "cursando" | "trancado";

export type RhIdiomaNivel = "basico" | "intermediario" | "avancado" | "fluente" | "nativo";

export type RhPortfolioTipo = "video" | "imagem" | "texto" | "audio" | "codigo" | "outro";

export type RhPortfolioOrigem = "link" | "arquivo";

export type RhFormacaoHistoricoBloco =
  | "formacao_academica"
  | "idioma"
  | "curso"
  | "portfolio";

export type RhFormacaoHistoricoAcao = "criar" | "editar" | "excluir";

export interface RhIdioma {
  id: string;
  nome: string;
  ordem: number;
}

export interface RhFuncionarioFormacao {
  id: string;
  rh_funcionario_id: string;
  curso: string;
  instituicao: string;
  grau: RhFormacaoGrau;
  ano_conclusao: number | null;
  status: RhFormacaoStatus;
  created_at: string;
  updated_at: string;
}

export interface RhFuncionarioIdioma {
  id: string;
  rh_funcionario_id: string;
  rh_idioma_id: string;
  nivel: RhIdiomaNivel;
  created_at: string;
  updated_at: string;
  rh_idiomas?: Pick<RhIdioma, "nome"> | null;
}

export interface RhFuncionarioCurso {
  id: string;
  rh_funcionario_id: string;
  nome: string;
  instituicao: string;
  carga_horaria_horas: number | null;
  ano: number | null;
  created_at: string;
  updated_at: string;
}

export interface RhFuncionarioPortfolio {
  id: string;
  rh_funcionario_id: string;
  titulo: string;
  tipo: RhPortfolioTipo;
  origem: RhPortfolioOrigem;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
  updated_at: string;
}
