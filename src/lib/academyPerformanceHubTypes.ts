export type PerformanceHubTimeSlug = "game_presenter" | "shuffler";

export type PerformanceHubStatus =
  | "pendente"
  | "rascunho"
  | "em_analise"
  | "aguardando"
  | "feedback"
  | "aprovado";

export type PerformanceHubTab = "avaliacoes" | "gerenciamento" | "configuracao";

export type PerformanceHubMesaTipo = "cartas" | "roleta";

export type PerformanceHubJogoKey = "baccarat" | "roleta" | "blackjack" | "futebol_brasileiro";

export type PerformanceHubTurno = "Manhã" | "Tarde" | "Noite";

export type PerformanceHubTipoAvaliacao = "performance_coach" | "extra";

export type PerformanceHubModalModo =
  | "ver"
  | "analisar"
  | "analisar_aguardando"
  | "aplicar_feedback"
  | "historico";

export type PerformanceHubHistoricoAcao =
  | "publicada"
  | "solicitou_feedback"
  | "aprovou"
  | "aplicou_feedback";

export interface PerformanceHubHistoricoItem {
  id: string;
  avaliacaoId: string;
  createdAt: string;
  acao: PerformanceHubHistoricoAcao;
  usuarioNome: string;
  mensagem: string | null;
}

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

export type PerformanceHubScoringConfigGamePresenter = Record<
  "comunicacao" | "mesa" | "imagem",
  PerformanceHubDimensaoConfig
>;

export type PerformanceHubScoringConfigShuffler = Record<
  "comunicacao" | "procedimentos" | "imagem",
  PerformanceHubDimensaoConfig
>;

export type PerformanceHubScoringPorTime = {
  game_presenter: PerformanceHubScoringConfigGamePresenter;
  shuffler: PerformanceHubScoringConfigShuffler;
};

/** @deprecated Prefer PerformanceHubScoringConfigGamePresenter ou config por time */
export type PerformanceHubScoringConfig = PerformanceHubScoringConfigGamePresenter;

export interface PerformanceHubAvaliacao {
  id: string;
  data: string;
  /** Time/cargo no momento da avaliação — define formato histórico (GP vs Shuffler). */
  time: PerformanceHubTimeSlug;
  avaliadoNome: string;
  avaliadoStaffId?: string;
  avaliadorNome: string;
  status: PerformanceHubStatus;
  notaTotal: number | null;
  notaImagem: number | null;
  notaComunicacao: number | null;
  /** Game Presenter — dimensão Mesa */
  notaMesa: number | null;
  /** Shuffler — dimensão Procedimentos */
  notaProcedimentos: number | null;
  tipoAvaliacao?: PerformanceHubTipoAvaliacao | null;
  turno?: PerformanceHubTurno | null;
  estudioId?: string | null;
  jogo?: PerformanceHubJogoKey | null;
  mesaId?: string | null;
  pontosFortes?: string | null;
  pontosDesenvolver?: string | null;
  criterios?: Record<string, PerformanceHubCriterioResposta>;
  videoUrl?: string | null;
  videoNome?: string | null;
  /** Preenchido quando a retenção apagou o vídeo do Storage (video_nome é mantido). */
  videoRemovidoEm?: string | null;
  /** Texto do avaliado ao solicitar esclarecimento (Aguardando → Feedback). */
  solicitacaoFeedbackTexto?: string | null;
  solicitacaoFeedbackPorNome?: string | null;
  solicitacaoFeedbackEm?: string | null;
  /** Texto do coach ao aplicar o repasse (Feedback → Aprovado). */
  aplicacaoFeedbackTexto?: string | null;
  aplicacaoFeedbackPorNome?: string | null;
  aplicacaoFeedbackEm?: string | null;
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
