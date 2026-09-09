import { useEffect, useMemo, useState } from "react";
import { clampPageIndex, slicePage, TABELA_PAGE_SIZE } from "../lib/tablePagination";

/**
 * Paginação client-side da vista (20 linhas). KPIs/filtros devem usar o array completo.
 * `resetKey` volta à página 1 (ex.: busca, filtro, ordenação, aba).
 */
export function useTabelaPaginacao<T>(items: T[], resetKey?: unknown) {
  const [pagina, setPagina] = useState(0);
  const pageSize = TABELA_PAGE_SIZE;

  useEffect(() => {
    setPagina(0);
  }, [resetKey]);

  const paginaSafe = clampPageIndex(pagina, items.length, pageSize);
  const linhasPagina = useMemo(
    () => slicePage(items, paginaSafe, pageSize),
    [items, paginaSafe, pageSize],
  );

  return {
    paginaSafe,
    linhasPagina,
    pageSize,
    setPagina,
    totalItems: items.length,
    zebraIdx: (i: number) => paginaSafe * pageSize + i,
  };
}
