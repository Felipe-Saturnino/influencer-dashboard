import type {
  AcademyCatalogoStatus,
  AcademyCronogramaJogo,
  AcademyCronogramaTab,
  AcademyMaterialTipo,
  AcademyTrilhaTipo,
} from "./academyCronogramaTypes";

export const ACADEMY_CRONOGRAMA_PAGE_KEY = "academy_cronograma" as const;

export const ACADEMY_CRONOGRAMA_TABS: readonly AcademyCronogramaTab[] = [
  "cronogramas",
  "trilhas",
  "materiais",
  "provas",
];

export const ACADEMY_CRONOGRAMA_TAB_LABEL: Record<AcademyCronogramaTab, string> = {
  cronogramas: "Cronogramas",
  trilhas: "Trilhas",
  materiais: "Materiais",
  provas: "Provas",
};

export const ACADEMY_CRONOGRAMA_STATUS_LABEL: Record<AcademyCatalogoStatus, string> = {
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const ACADEMY_CRONOGRAMA_TRILHA_TIPO_LABEL: Record<AcademyTrilhaTipo, string> = {
  institucional: "Institucional",
  jogo: "Jogo",
  operacao: "Operação",
  pratica: "Prática",
};

export const ACADEMY_CRONOGRAMA_MATERIAL_TIPO_LABEL: Record<AcademyMaterialTipo, string> = {
  pdf: "PDF",
  video: "Vídeo",
  apresentacao: "Apresentação",
};

export const ACADEMY_CRONOGRAMA_JOGOS: readonly AcademyCronogramaJogo[] = [
  "Blackjack",
  "Roleta",
  "Baccarat",
  "Futebol Brasileiro",
];

export const ACADEMY_CRONOGRAMA_BUCKET = "academy-cronograma-materiais";

export const ACADEMY_CRONOGRAMA_ARQUIVO_ACCEPT = ".pdf,.pptx,.ppt,.mp4,.mov";

export const ACADEMY_CRONOGRAMA_ARQUIVO_HINT =
  "PDF, PPTX, MP4 ou MOV. Máximo 100 MB. O prestador lê na turma — não no Portal da Academy.";

export const ACADEMY_CRONOGRAMA_VAZIO = "—";

export const ACADEMY_CRONOGRAMA_ERRO_CARGA =
  "Não foi possível carregar o catálogo de Cronograma. Se o problema persistir, entre em contato com o suporte.";
