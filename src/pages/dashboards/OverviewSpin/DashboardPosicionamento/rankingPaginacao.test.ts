import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabelaPaginacao } from "../../../../hooks/useTabelaPaginacao";
import { TABELA_PAGE_SIZE, slicePage } from "../../../../lib/tablePagination";

describe("paginação Ranking / tabelas densas", () => {
  it("slicePage nunca devolve mais que TABELA_PAGE_SIZE", () => {
    const items = Array.from({ length: 87 }, (_, i) => i + 1);
    expect(slicePage(items, 0, TABELA_PAGE_SIZE)).toHaveLength(TABELA_PAGE_SIZE);
    expect(slicePage(items, 4, TABELA_PAGE_SIZE)).toHaveLength(7);
    expect(slicePage(items, 0, TABELA_PAGE_SIZE)[0]).toBe(1);
    expect(slicePage(items, 1, TABELA_PAGE_SIZE)[0]).toBe(21);
  });

  it("useTabelaPaginacao limita a vista a 20 com 50 itens", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => useTabelaPaginacao(items, "blaze"));
    expect(result.current.linhasPagina).toHaveLength(20);
    expect(result.current.totalItems).toBe(50);
    expect(result.current.pageSize).toBe(20);
    act(() => result.current.setPagina(1));
    expect(result.current.linhasPagina).toHaveLength(20);
    expect(result.current.linhasPagina[0]?.id).toBe(20);
    act(() => result.current.setPagina(2));
    expect(result.current.linhasPagina).toHaveLength(10);
  });
});
