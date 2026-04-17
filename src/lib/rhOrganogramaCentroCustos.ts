/** Gera código de centro de custos alinhado à migração SQL (hierarquia D > G > T). */

function sufixoId(id: string, len: number): string {
  return id.replace(/-/g, "").slice(0, len).toUpperCase();
}

export function gerarCentroCustosDiretoria(id: string): string {
  return `RH.D.${sufixoId(id, 8)}`;
}

export function gerarCentroCustosGerencia(centroCustosDiretoria: string, id: string): string {
  return `${centroCustosDiretoria}.G.${sufixoId(id, 6)}`;
}

export function gerarCentroCustosTime(centroCustosGerencia: string, id: string): string {
  return `${centroCustosGerencia}.T.${sufixoId(id, 6)}`;
}
