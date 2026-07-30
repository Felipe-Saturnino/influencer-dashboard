import { describe, expect, it } from "vitest";
import {
  formatarDetalheMovimentacao,
  mapOverviewPrestadorMovimentacoes,
  situacaoEhCompraMarketplace,
} from "../../../src/lib/overviewPrestadorMovimentacoes";

describe("overviewPrestadorMovimentacoes", () => {
  it("mapeia payload jsonb com contraparte", () => {
    const map = mapOverviewPrestadorMovimentacoes([
      {
        funcionario_id: "f1",
        dia_iso: "2026-08-10",
        tipo: "compra",
        contraparte_nome: "Ana Silva",
        turno_trabalhar: "Manhã",
        estudio_trabalhar: "Sports Club",
      },
    ]);
    expect(map.get("f1|2026-08-10")).toEqual({
      tipo: "compra",
      contraparteNome: "Ana Silva",
      turnoTrabalhar: "Manhã",
      estudioTrabalhar: "Sports Club",
    });
  });

  it("formata detalhe por ocorrência da grade", () => {
    const snap = {
      tipo: "compra" as const,
      contraparteNome: "Ana Silva",
      turnoTrabalhar: "Manhã",
      estudioTrabalhar: "Sports Club",
    };
    expect(formatarDetalheMovimentacao("Compra", snap)).toBe(
      "Comprado de Ana Silva · Manhã · Sports Club",
    );
    expect(formatarDetalheMovimentacao("Venda", { ...snap, tipo: "venda" })).toBe(
      "Vendido para Ana Silva",
    );
    expect(formatarDetalheMovimentacao("Troca", { ...snap, tipo: "troca" })).toBe(
      "Troca com Ana Silva · Manhã · Sports Club",
    );
    expect(formatarDetalheMovimentacao("Troca", undefined)).toBe("—");
  });

  it("reconhece Compra - Turno como compra", () => {
    expect(situacaoEhCompraMarketplace("Compra")).toBe(true);
    expect(situacaoEhCompraMarketplace("Compra - Manhã")).toBe(true);
    expect(situacaoEhCompraMarketplace("Troca")).toBe(false);
  });
});
