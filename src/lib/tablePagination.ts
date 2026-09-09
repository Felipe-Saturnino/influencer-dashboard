/** Tamanho canónico de página para tabelas densas (vista client-side). */
export const TABELA_PAGE_SIZE = 20;

/** Aliases de domínio — todos apontam para o tamanho canónico. */
export const TABELA_PAGE_SIZE_PRESTADORES = TABELA_PAGE_SIZE;
export const TABELA_PAGE_SIZE_ESCALA = TABELA_PAGE_SIZE;
export const TABELA_PAGE_SIZE_USUARIOS = TABELA_PAGE_SIZE;
export const TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR = TABELA_PAGE_SIZE;
export const TABELA_PAGE_SIZE_INCIDENTES = TABELA_PAGE_SIZE;
/** Ranking Overview / Comparativo de Taxas (Streamers). */
export const TABELA_PAGE_SIZE_STREAMERS = TABELA_PAGE_SIZE;
/** Catálogo da Gestão de Estoque (Itens, Equipamentos, Jogo, Fornecedores). */
export const TABELA_PAGE_SIZE_ESTOQUE = TABELA_PAGE_SIZE;

export function totalPaginasTabela(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPageIndex(page: number, totalItems: number, pageSize: number): number {
  return Math.min(Math.max(0, page), totalPaginasTabela(totalItems, pageSize) - 1);
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const p = clampPageIndex(page, items.length, pageSize);
  const start = p * pageSize;
  return items.slice(start, start + pageSize);
}

/** Grupos contíguos pela mesma chave (ex.: marcas da mesma razão social). */
export function agruparContiguo<T>(rows: T[], key: (row: T) => string): T[][] {
  const groups: T[][] = [];
  let i = 0;
  while (i < rows.length) {
    const k = key(rows[i]);
    let j = i + 1;
    while (j < rows.length && key(rows[j]) === k) j += 1;
    groups.push(rows.slice(i, j));
    i = j;
  }
  return groups;
}

/** Rótulo «Mostrando X–Y de Z» (pt-BR). */
export function labelFaixaPaginacao(page: number, pageSize: number, totalItems: number): string {
  if (totalItems <= 0) return "0 de 0";
  const p = clampPageIndex(page, totalItems, pageSize);
  const from = p * pageSize + 1;
  const to = Math.min(totalItems, (p + 1) * pageSize);
  return `${from}–${to} de ${totalItems.toLocaleString("pt-BR")}`;
}
