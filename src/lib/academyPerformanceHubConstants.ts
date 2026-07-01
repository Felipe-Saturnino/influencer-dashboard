import type { PerformanceHubStatus, PerformanceHubTimeSlug } from "./academyPerformanceHubTypes";

export const PERFORMANCE_HUB_TIME_OPTIONS: {
  value: PerformanceHubTimeSlug;
  label: string;
}[] = [
  { value: "game_presenter", label: "Game Presenter" },
  { value: "shuffler", label: "Shuffler" },
];

export const PERFORMANCE_HUB_TIME_DEFAULT: PerformanceHubTimeSlug = "game_presenter";

export const PERFORMANCE_HUB_STATUS_LABEL: Record<PerformanceHubStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em Análise",
  feedback: "Feedback",
  concluida: "Concluída",
};

export const PERFORMANCE_HUB_STATUS_COLOR: Record<PerformanceHubStatus, string> = {
  pendente: "#6b7280",
  em_analise: "#f59e0b",
  feedback: "#7c3aed",
  concluida: "#22c55e",
};

export const PERFORMANCE_HUB_KPI_SUB =
  "Comparativo MTD vs mesmo período do mês anterior";
