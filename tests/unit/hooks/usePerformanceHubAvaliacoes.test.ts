import { describe, expect, it } from "vitest";
import { mesclarAvaliacaoNaLista } from "../../../src/hooks/usePerformanceHubAvaliacoes";
import type { PerformanceHubAvaliacao } from "../../../src/lib/academyPerformanceHubTypes";

function row(partial: Partial<PerformanceHubAvaliacao>): PerformanceHubAvaliacao {
  return {
    id: "1",
    data: "14/09/2026",
    time: "game_presenter",
    avaliadoNome: "Ana",
    avaliadorNome: "Coach",
    status: "rascunho",
    notaTotal: null,
    notaImagem: null,
    notaComunicacao: null,
    notaMesa: null,
    notaProcedimentos: null,
    ...partial,
  };
}

describe("mesclarAvaliacaoNaLista", () => {
  it("substitui id cliente novo-* pelo UUID do servidor sem duplicar", () => {
    const cliente = row({ id: "novo-1", status: "rascunho" });
    const salvo = row({ id: "uuid-a", status: "aguardando" });
    const next = mesclarAvaliacaoNaLista([cliente, row({ id: "outra" })], cliente, salvo);
    expect(next.map((r) => r.id)).toEqual(["uuid-a", "outra"]);
    expect(next[0]?.status).toBe("aguardando");
  });

  it("atualiza a linha já existente pelo UUID", () => {
    const atual = row({ id: "uuid-a", status: "rascunho" });
    const salvo = row({ id: "uuid-a", status: "aguardando", notaTotal: 8 });
    const next = mesclarAvaliacaoNaLista([atual], atual, salvo);
    expect(next).toHaveLength(1);
    expect(next[0]?.notaTotal).toBe(8);
    expect(next[0]?.status).toBe("aguardando");
  });
});
