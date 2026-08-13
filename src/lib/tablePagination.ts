/** Tamanhos de página para listas/grades densas (Fase 8 — eficiência). */
export const TABELA_PAGE_SIZE_PRESTADORES = 50;
export const TABELA_PAGE_SIZE_ESCALA = 40;
export const TABELA_PAGE_SIZE_USUARIOS = 50;
export const TABELA_PAGE_SIZE_OVERVIEW_PRESTADOR = 50;
export const TABELA_PAGE_SIZE_INCIDENTES = 50;

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

/** Rótulo «Mostrando X–Y de Z» (pt-BR). */
export function labelFaixaPaginacao(page: number, pageSize: number, totalItems: number): string {
  if (totalItems <= 0) return "0 de 0";
  const p = clampPageIndex(page, totalItems, pageSize);
  const from = p * pageSize + 1;
  const to = Math.min(totalItems, (p + 1) * pageSize);
  return `${from}–${to} de ${totalItems.toLocaleString("pt-BR")}`;
}
