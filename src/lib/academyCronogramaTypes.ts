export type AcademyCronogramaTab = "cronogramas" | "trilhas" | "materiais" | "provas";

export type AcademyCatalogoStatus = "publicado" | "arquivado";

export type AcademyTrilhaTipo = "institucional" | "jogo" | "operacao" | "pratica";

export type AcademyMaterialTipo = "pdf" | "video" | "apresentacao";

export type AcademyCronogramaEntidade = "cronograma" | "trilha" | "material" | "prova";

export type AcademyCronogramaJogo = "Blackjack" | "Roleta" | "Baccarat" | "Futebol Brasileiro";

export type AcademyProvaQuestao = {
  t: string;
  opts: [string, string, string, string];
  ok: 0 | 1 | 2 | 3;
};

export type AcademyCronograma = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_dias: number;
  status: AcademyCatalogoStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademyTrilha = {
  id: string;
  nome: string;
  tipo: AcademyTrilhaTipo;
  jogo: string | null;
  descricao: string;
  status: AcademyCatalogoStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademyCronogramaItem = {
  id: string;
  cronograma_id: string;
  trilha_id: string;
  ordem: number;
};

export type AcademyMaterial = {
  id: string;
  titulo: string;
  tipo: AcademyMaterialTipo;
  introducao: string;
  status: AcademyCatalogoStatus;
  arquivo_storage_path: string | null;
  arquivo_nome: string | null;
  versao: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademyProva = {
  id: string;
  nome: string;
  nota_minima: number;
  status: AcademyCatalogoStatus;
  questoes: AcademyProvaQuestao[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademyCronogramaHistorico = {
  id: string;
  entidade_tipo: AcademyCronogramaEntidade;
  entidade_id: string;
  acao: string;
  created_by: string | null;
  created_at: string;
  autor_nome: string;
};

export type AcademyCronogramaCatalogo = {
  cronogramas: AcademyCronograma[];
  trilhas: AcademyTrilha[];
  itens: AcademyCronogramaItem[];
  materiais: AcademyMaterial[];
  provas: AcademyProva[];
  trilhaMateriais: { trilha_id: string; material_id: string }[];
  trilhaProvas: { trilha_id: string; prova_id: string }[];
};
