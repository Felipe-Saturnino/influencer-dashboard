import { describe, expect, it } from "vitest";
import {
  comparePostagensLeituraPortal,
  comparePublishedAtDesc,
} from "../../../src/lib/portalPostagemSort";

describe("portalPostagemSort", () => {
  it("coloca ciência pendente acima e ordena por published_at desc dentro do grupo", () => {
    const rows = [
      { id: "1", published_at: "2026-08-01T12:00:00Z" },
      { id: "2", published_at: "2026-08-20T12:00:00Z" },
      { id: "3", published_at: "2026-08-10T12:00:00Z" },
      { id: "4", published_at: "2026-08-15T12:00:00Z" },
    ];
    const pendente = new Set(["1", "3"]);
    const sorted = [...rows].sort((a, b) =>
      comparePostagensLeituraPortal(a, b, {
        cienciaPendenteA: pendente.has(a.id),
        cienciaPendenteB: pendente.has(b.id),
      }),
    );
    expect(sorted.map((r) => r.id)).toEqual(["3", "1", "2", "4"]);
  });

  it("comparePublishedAtDesc ordena só por data", () => {
    const rows = [
      { id: "a", published_at: "2026-01-01T00:00:00Z" },
      { id: "b", published_at: "2026-06-01T00:00:00Z" },
    ];
    const sorted = [...rows].sort(comparePublishedAtDesc);
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
