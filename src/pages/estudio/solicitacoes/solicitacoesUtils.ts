/** Tempo relativo curto para listas (ex.: Central). */
export function tempoRelativo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `há ${h}h`;
  const days = Math.floor(h / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export type SolicitacaoTipo = "troca_dealer" | "feedback";
export type SolicitacaoStatus = "pendente" | "em_andamento" | "resolvido" | "cancelado";
export type AguardaResposta = "operadora" | "gestor";

export function labelTipoSolicitacao(tipo: SolicitacaoTipo): string {
  if (tipo === "troca_dealer") return "Troca de dealer";
  return "Feedback";
}

export function corStatusSolicitacao(status: SolicitacaoStatus): string {
  if (status === "pendente") return "#f59e0b";
  if (status === "em_andamento") return "#6b7fff";
  if (status === "resolvido") return "#22c55e";
  return "#6b7280";
}
