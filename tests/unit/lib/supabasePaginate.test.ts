import { describe, it, expect, vi } from "vitest";
import { fetchAllPages, fetchLiveResultadosBatched, SUPABASE_PAGE_SIZE } from "@/lib/supabasePaginate";

describe("fetchAllPages", () => {
  it("acumula páginas até receber menos que SUPABASE_PAGE_SIZE linhas", async () => {
    const runPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: SUPABASE_PAGE_SIZE }, (_, i) => ({ id: i })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: "last" }],
        error: null,
      });

    const rows = await fetchAllPages(runPage);

    expect(runPage).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(SUPABASE_PAGE_SIZE + 1);
    expect(rows[rows.length - 1]).toEqual({ id: "last" });
  });

  it("lança quando a página retorna error", async () => {
    const runPage = vi.fn().mockResolvedValue({
      data: [],
      error: { message: "RLS" },
    });

    await expect(fetchAllPages(runPage)).rejects.toThrow("RLS");
  });
});

describe("fetchLiveResultadosBatched", () => {
  it("retorna vazio quando liveIds está vazio", async () => {
    const runChunk = vi.fn();
    const out = await fetchLiveResultadosBatched([], runChunk);
    expect(out).toEqual([]);
    expect(runChunk).not.toHaveBeenCalled();
  });

  it("agrega chunks", async () => {
    const runChunk = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ x: 1 }], error: null })
      .mockResolvedValueOnce({ data: [{ x: 2 }], error: null });

    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
    const out = await fetchLiveResultadosBatched(ids, runChunk);

    expect(runChunk).toHaveBeenCalledTimes(2);
    expect(out).toEqual([{ x: 1 }, { x: 2 }]);
  });
});
