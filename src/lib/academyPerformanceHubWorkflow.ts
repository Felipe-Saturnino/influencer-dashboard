import type { PerformanceHubAvaliacao, PerformanceHubStatus, PerformanceHubTimeSlug } from "./academyPerformanceHubTypes";

export function statusInicialNovaAvaliacao(time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return time === "game_presenter" ? "rascunho" : "em_analise";
}

export function statusAposConcluirModal(time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return time === "game_presenter" ? "feedback" : "concluida";
}

export function statusAposSalvarRascunho(
  row: PerformanceHubAvaliacao,
): PerformanceHubStatus {
  if (row.time === "game_presenter") return "rascunho";
  return row.status;
}

/** Aba Avaliações — Game Presenter só após Concluir (Feedback em diante). */
export function avaliacaoVisivelAbaAvaliacoes(row: PerformanceHubAvaliacao): boolean {
  if (row.time === "game_presenter") {
    return row.status !== "rascunho" && row.status !== "em_analise";
  }
  return row.status !== "rascunho";
}

/** Bloco Analisar Avaliações (Gerenciamento). */
export function avaliacaoVisivelGerenciamentoAnalisar(
  row: PerformanceHubAvaliacao,
  time: PerformanceHubTimeSlug,
): boolean {
  if (row.time !== time) return false;
  if (time === "game_presenter") return row.status === "rascunho";
  return row.status === "pendente" || row.status === "em_analise" || row.status === "feedback";
}

export function avaliacaoEmAndamentoPorNome(
  rows: PerformanceHubAvaliacao[],
  time: PerformanceHubTimeSlug,
  nome: string,
): PerformanceHubAvaliacao | undefined {
  return rows.find(
    (row) =>
      row.time === time &&
      row.avaliadoNome === nome &&
      avaliacaoVisivelGerenciamentoAnalisar(row, time),
  );
}
