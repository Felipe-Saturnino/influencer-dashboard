export type PerformanceHubTimeSlug = "game_presenter" | "shuffler";

export type PerformanceHubStatus =
  | "pendente"
  | "em_analise"
  | "feedback"
  | "concluida";

export type PerformanceHubTab = "avaliacoes" | "gerenciamento" | "configuracao";

export type PerformanceHubMesaTipo = "cartas" | "roleta";

export type PerformanceHubJogoKey = "baccarat" | "roleta" | "blackjack" | "futebol_brasileiro";

export type PerformanceHubTurno = "Manhã" | "Tarde" | "Noite";

export type PerformanceHubTipoAvaliacao = "performance_coach" | "extra";

export type PerformanceHubModalModo = "ver" | "analisar";

export interface PerformanceHubCriterioResposta {
  nota: number | null;
  comentario: string;
}

export interface PerformanceHubCriterioConfig {
  slug: string;
  label: string;
  peso: number;
  mesaTipo?: PerformanceHubMesaTipo | null;
}

export interface PerformanceHubDimensaoConfig {
  label: string;
  pesoDimensao: number;
  criterios: PerformanceHubCriterioConfig[];
}

export type PerformanceHubScoringConfig = Record<
  "comunicacao" | "mesa" | "imagem",
  PerformanceHubDimensaoConfig
>;

export interface PerformanceHubAvaliacao {
  id: string;
  data: string;
  time: PerformanceHubTimeSlug;
  avaliadoNome: string;
  avaliadoStaffId?: string;
  avaliadorNome: string;
  status: PerformanceHubStatus;
  notaTotal: number | null;
  notaImagem: number | null;
  notaComunicacao: number | null;
  notaMesa: number | null;
  tipoAvaliacao?: PerformanceHubTipoAvaliacao | null;
  turno?: PerformanceHubTurno | null;
  estudioId?: string | null;
  jogo?: PerformanceHubJogoKey | null;
  mesaId?: number | null;
  pontosFortes?: string | null;
  pontosDesenvolver?: string | null;
  criterios?: Record<string, PerformanceHubCriterioResposta>;
  videoUrl?: string | null;
  videoNome?: string | null;
}

export interface PerformanceHubAgendaItem {
  id: string;
  time: PerformanceHubTimeSlug;
  nome: string;
  goLive: string;
  turno: string;
  realizadas: number;
  pendentes: number;
}

export interface PerformanceHubStaffOption {
  value: string;
  label: string;
  turno: string;
}
