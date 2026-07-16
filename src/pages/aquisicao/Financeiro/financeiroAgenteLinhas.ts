import type { PagamentoStatus } from "../../../types";
import type { BlocoFiltros } from "./financeiroFiltros";
import type { FinanceiroAgenteDbRow, PagamentoRow } from "./financeiroTypes";

/** Filtra `pagamentos_agentes` pelos mesmos critérios de operadora do bloco de ciclos. */
export function filtrarAgentesDoCiclo(
  agentes: FinanceiroAgenteDbRow[],
  filtros: Pick<BlocoFiltros, "filterOperadora" | "filtroOp">,
): FinanceiroAgenteDbRow[] {
  const { filterOperadora, filtroOp } = filtros;
  let out = agentes;
  if (filtroOp?.length) {
    out = out.filter((a) => a.operadora_slug && filtroOp.includes(a.operadora_slug));
  } else if (filterOperadora && filterOperadora !== "todas") {
    out = out.filter((a) => a.operadora_slug === filterOperadora);
  }
  return out;
}

export function rotuloAgenteFinanceiro(descricao: string | null | undefined): string {
  const nome = descricao?.trim();
  return nome || "Agente";
}

export function mapAgentesParaPagamentoRows(agentes: FinanceiroAgenteDbRow[]): PagamentoRow[] {
  return agentes.map((a) => ({
    id: a.id!,
    influencer_id: "agente",
    influencer_name: rotuloAgenteFinanceiro(a.descricao),
    horas_realizadas: 0,
    cache_hora: 0,
    total: a.total,
    status: a.status as PagamentoStatus,
    pago_em: a.pago_em ?? null,
    is_agente: true,
    descricao: a.descricao ?? undefined,
    qtd_lives: 0,
    operadora_slug: a.operadora_slug ?? undefined,
  }));
}
