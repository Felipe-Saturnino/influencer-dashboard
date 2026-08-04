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
      tipoOferta: null,
      contraparteNome: "Ana Silva",
      turnoTrabalhar: "Manhã",
      estudioTrabalhar: "Sports Club",
    });
  });

  it("mapeia tipo_oferta quando presente no payload", () => {
    const map = mapOverviewPrestadorMovimentacoes([
      {
        funcionario_id: "f2",
        dia_iso: "2026-08-11",
        tipo: "venda",
        tipo_oferta: "venda_folga",
        contraparte_nome: "Bruno Costa",
        turno_trabalhar: null,
        estudio_trabalhar: null,
      },
    ]);
    expect(map.get("f2|2026-08-11")).toEqual({
      tipo: "venda",
      tipoOferta: "venda_folga",
      contraparteNome: "Bruno Costa",
      turnoTrabalhar: null,
      estudioTrabalhar: null,
    });
  });

  it("formata detalhe por ocorrência da grade", () => {
    const snap = {
      tipo: "compra" as const,
      tipoOferta: null,
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
