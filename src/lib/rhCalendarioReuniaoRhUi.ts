import type { RhSolicitacaoStatus } from "../types/rhSolicitacao";

/** Rótulo de status da solicitação RH no chip/modal do Calendário. */
export function labelStatusReuniaoRhCalendario(status: RhSolicitacaoStatus | string | null | undefined): string {
  switch (status) {
    case "em_analise":
      return "Em Análise";
    case "aprovado":
      return "Aprovada";
    case "rejeitado":
      return "Recusada";
    default:
      return "Em Análise";
  }
}

export function ehReuniaoComRh(reuniaoCom: string | null | undefined): boolean {
  return (reuniaoCom ?? "").trim() === "rh";
}

/** Chip na grelha do dia — linha 1. */
export function tituloChipReuniaoRhCalendario(solicitacaoStatus: RhSolicitacaoStatus | string | null | undefined): string {
  return `Reunião RH - ${labelStatusReuniaoRhCalendario(solicitacaoStatus)}`;
}

/** Chip na grelha do dia — linha 2 (nome do solicitante). */
export function subtituloChipReuniaoRhCalendario(solicitanteNome: string | null | undefined): string {
  return (solicitanteNome ?? "").trim() || "—";
}

/** Cabeçalho no modal do dia. */
export function tituloModalReuniaoRhCalendario(solicitacaoStatus: RhSolicitacaoStatus | string | null | undefined): string {
  return `Reunião com RH - ${labelStatusReuniaoRhCalendario(solicitacaoStatus)}`;
}

export function exibirObservacaoRhModalReuniao(status: RhSolicitacaoStatus | string | null | undefined): boolean {
  return status === "aprovado" || status === "rejeitado";
}
