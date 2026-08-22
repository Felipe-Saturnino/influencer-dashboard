import type { PermissaoValor } from "../types";
import type {
  PerformanceHubAvaliacao,
  PerformanceHubStatus,
  PerformanceHubTimeSlug,
} from "./academyPerformanceHubTypes";

export function statusInicialNovaAvaliacao(_time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return "rascunho";
}

/** Publicar (Concluir) na Gerenciamento → entra na aba Avaliações como Aguardando. */
export function statusAposConcluirModal(_time: PerformanceHubTimeSlug): PerformanceHubStatus {
  return "aguardando";
}

export function statusAposSalvarRascunho(
  row: PerformanceHubAvaliacao,
): PerformanceHubStatus {
  if (row.status === "rascunho" || row.status === "em_analise" || row.status === "pendente") {
    return "rascunho";
  }
  return row.status;
}

/** Aba Avaliações — só avaliações já publicadas. */
export function avaliacaoVisivelAbaAvaliacoes(row: PerformanceHubAvaliacao): boolean {
  return (
    row.status === "aguardando" ||
    row.status === "feedback" ||
    row.status === "aprovado"
  );
}

/** Bloco Analisar Avaliações (Gerenciamento) — rascunhos em andamento. */
export function avaliacaoVisivelGerenciamentoAnalisar(
  row: PerformanceHubAvaliacao,
  time: PerformanceHubTimeSlug,
): boolean {
  if (row.time !== time) return false;
  return row.status === "rascunho" || row.status === "em_analise" || row.status === "pendente";
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

export type PerformanceHubAcaoAvaliacoes =
  | "ver"
  | "analisar"
  | "historico"
  | "aplicar_feedback";

/**
 * Ações da aba Avaliações conforme permissão.
 * Editar=Sim tem precedência sobre Ver=Próprios quando ambos existem.
 */
export function acoesAbaAvaliacoesPerformanceHub(opts: {
  canView: PermissaoValor;
  canEditarOk: boolean;
  status: PerformanceHubStatus;
}): PerformanceHubAcaoAvaliacoes[] {
  const { canView, canEditarOk, status } = opts;
  if (status !== "aguardando" && status !== "feedback" && status !== "aprovado") {
    return [];
  }

  if (canEditarOk) {
    if (status === "aguardando") return [];
    if (status === "feedback") return ["historico", "ver", "aplicar_feedback"];
    return ["ver", "historico"];
  }

  if (canView === "proprios") {
    if (status === "aguardando") return ["analisar"];
    return ["ver", "historico"];
  }

  return ["ver", "historico"];
}

export function statusPublicadoPerformanceHub(status: PerformanceHubStatus): boolean {
  return status === "aguardando" || status === "feedback" || status === "aprovado";
}

/** Conta na agenda (realizadas) — só avaliações aprovadas. */
export function statusContaComoRealizadaPerformanceHub(status: PerformanceHubStatus): boolean {
  return status === "aprovado";
}
