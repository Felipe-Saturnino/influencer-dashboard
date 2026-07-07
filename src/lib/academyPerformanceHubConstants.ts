import type { PerformanceHubStatus, PerformanceHubTimeSlug } from "./academyPerformanceHubTypes";

export const PERFORMANCE_HUB_TIME_OPTIONS: {
  value: PerformanceHubTimeSlug;
  label: string;
}[] = [
  { value: "game_presenter", label: "Game Presenter" },
  { value: "shuffler", label: "Shuffler" },
];

export const PERFORMANCE_HUB_TIME_DEFAULT: PerformanceHubTimeSlug = "game_presenter";

/** Mínimo de avaliações concluídas por prestador e mês (GP e Shuffler). */
export const PERFORMANCE_HUB_MIN_AVALIACOES_MES = 3;

export const PERFORMANCE_HUB_STATUS_LABEL: Record<PerformanceHubStatus, string> = {
  pendente: "Pendente",
  rascunho: "Rascunho",
  em_analise: "Em Análise",
  feedback: "Feedback",
  concluida: "Concluída",
};

export const PERFORMANCE_HUB_STATUS_COLOR: Record<PerformanceHubStatus, string> = {
  pendente: "#6b7280",
  rascunho: "#94a3b8",
  em_analise: "#f59e0b",
  feedback: "#7c3aed",
  concluida: "#22c55e",
};

export const PERFORMANCE_HUB_KPI_SUB =
  "Comparativo MTD vs mesmo período do mês anterior";

/** Ordem canónica dos blocos na aba Configuração (GP e Shuffler). */
export const PERFORMANCE_HUB_CONFIG_DIM_ORDER = [
  "comunicacao",
  "imagem",
  "mesa",
  "procedimentos",
] as const;

export function orderedPerformanceHubConfigKeys(
  config: Record<string, unknown>,
): string[] {
  return PERFORMANCE_HUB_CONFIG_DIM_ORDER.filter((key) => key in config);
}
