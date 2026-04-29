/** Mesmo contrato que `SortTableTh` (dashboard). */
export type SortDir = "asc" | "desc";

function rankInfluencerPerfilStatus(status: string | null | undefined, isAgente?: boolean): number {
  if (isAgente) return 99;
  const s = (status ?? "ativo").toLowerCase().trim();
  if (s === "ativo") return 0;
  if (s === "inativo") return 1;
  if (s === "cancelado") return 2;
  return 3;
}

/** Ordena por status do perfil (agente sempre por último em asc). */
export function compareInfluencerPerfilStatus(
  a: { statusInfluencer?: string | null; is_agente?: boolean },
  b: { statusInfluencer?: string | null; is_agente?: boolean },
  dir: SortDir,
): number {
  const ra = rankInfluencerPerfilStatus(a.statusInfluencer, a.is_agente);
  const rb = rankInfluencerPerfilStatus(b.statusInfluencer, b.is_agente);
  const d = ra - rb;
  return dir === "asc" ? d : -d;
}

export function compareAtivoBoolean(aAtivo: boolean, bAtivo: boolean, dir: SortDir): number {
  const va = aAtivo ? 1 : 0;
  const vb = bAtivo ? 1 : 0;
  const d = va - vb;
  return dir === "asc" ? d : -d;
}

const ORDEM_CONDICAO_PECA: Record<string, number> = {
  good: 0,
  damaged: 1,
  needs_cleaning: 2,
};

export function compareCondicaoPeca(aCond: string, bCond: string, dir: SortDir): number {
  const ra = ORDEM_CONDICAO_PECA[aCond] ?? 9;
  const rb = ORDEM_CONDICAO_PECA[bCond] ?? 9;
  const d = ra - rb;
  return dir === "asc" ? d : -d;
}

export function compareLocaleTexto(a: string, b: string, dir: SortDir): number {
  const d = a.localeCompare(b, "pt-BR", { sensitivity: "base" });
  return dir === "asc" ? d : -d;
}

export function compareNumber(a: number, b: number, dir: SortDir): number {
  const d = a - b;
  return dir === "asc" ? d : -d;
}

const PAGAMENTO_STATUS_RANK: Record<string, number> = {
  perfil_incompleto: 0,
  em_analise: 1,
  a_pagar: 2,
  pago: 3,
};

/** Ordena por fluxo típico de pagamento (perfil incompleto → pago). */
export function comparePagamentoStatus(a: string, b: string, dir: SortDir): number {
  const ra = PAGAMENTO_STATUS_RANK[a] ?? 9;
  const rb = PAGAMENTO_STATUS_RANK[b] ?? 9;
  const d = ra - rb;
  return dir === "asc" ? d : -d;
}

/** `null` = sem influencer associado (sempre após quem tem status, em asc). */
export function comparePerfilStatusNullable(a: string | null, b: string | null, dir: SortDir): number {
  const ra = a == null ? 10 : rankInfluencerPerfilStatus(a, false);
  const rb = b == null ? 10 : rankInfluencerPerfilStatus(b, false);
  const d = ra - rb;
  return dir === "asc" ? d : -d;
}
