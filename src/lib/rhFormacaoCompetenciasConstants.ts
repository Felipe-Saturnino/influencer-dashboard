import type {
  RhFormacaoGrau,
  RhFormacaoHistoricoAcao,
  RhFormacaoHistoricoBloco,
  RhFormacaoStatus,
  RhIdiomaNivel,
  RhPortfolioTipo,
} from "../types/rhFormacaoCompetencias";

export const RH_FORMACAO_ANO_MIN = 1950;

export function rhFormacaoAnoMax(): number {
  return new Date().getFullYear() + 10;
}

export const RH_FORMACAO_GRAU_LABEL: Record<RhFormacaoGrau, string> = {
  ensino_medio: "Ensino médio",
  tecnico: "Técnico",
  tecnologo: "Tecnólogo",
  graduacao: "Graduação",
  pos_graduacao: "Pós-graduação",
  mba: "MBA",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
};

export const RH_FORMACAO_GRAU_OPCOES = Object.entries(RH_FORMACAO_GRAU_LABEL).map(([value, label]) => ({
  value: value as RhFormacaoGrau,
  label,
}));

export const RH_FORMACAO_STATUS_LABEL: Record<RhFormacaoStatus, string> = {
  concluido: "Concluído",
  cursando: "Cursando",
  trancado: "Trancado",
};

export const RH_FORMACAO_STATUS_COLOR: Record<RhFormacaoStatus, string> = {
  concluido: "#22c55e",
  cursando: "#f59e0b",
  trancado: "#6b7280",
};

export const RH_FORMACAO_STATUS_OPCOES = Object.entries(RH_FORMACAO_STATUS_LABEL).map(([value, label]) => ({
  value: value as RhFormacaoStatus,
  label,
}));

export const RH_IDIOMA_NIVEL_LABEL: Record<RhIdiomaNivel, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
  fluente: "Fluente",
  nativo: "Nativo",
};

export const RH_IDIOMA_NIVEL_OPCOES = Object.entries(RH_IDIOMA_NIVEL_LABEL).map(([value, label]) => ({
  value: value as RhIdiomaNivel,
  label,
}));

export const RH_PORTFOLIO_TIPO_LABEL: Record<RhPortfolioTipo, string> = {
  video: "Vídeo",
  imagem: "Imagem",
  texto: "Texto",
  audio: "Áudio",
  codigo: "Código",
  outro: "Outro",
};

export const RH_PORTFOLIO_TIPO_OPCOES = Object.entries(RH_PORTFOLIO_TIPO_LABEL).map(([value, label]) => ({
  value: value as RhPortfolioTipo,
  label,
}));

/** Tipos que exigem link externo (vídeo/áudio); demais aceitam link ou arquivo. */
export const RH_PORTFOLIO_TIPOS_SOMENTE_LINK: RhPortfolioTipo[] = ["video", "audio"];

export const RH_FORMACAO_HISTORICO_BLOCO_LABEL: Record<RhFormacaoHistoricoBloco, string> = {
  formacao_academica: "Formação acadêmica",
  idioma: "Idioma",
  curso: "Curso",
  portfolio: "Portfólio",
};

export const RH_FORMACAO_HISTORICO_ACAO_LABEL: Record<RhFormacaoHistoricoAcao, string> = {
  criar: "Inclusão",
  editar: "Alteração",
  excluir: "Exclusão",
};

export const RH_FORMACAO_VAZIO = {
  formacao: "Nenhuma formação cadastrada.",
  idioma: "Nenhum idioma cadastrado.",
  curso: "Nenhum curso cadastrado.",
  portfolio: "Nenhum item no portfólio.",
} as const;
