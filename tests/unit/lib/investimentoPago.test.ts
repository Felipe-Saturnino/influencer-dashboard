import { describe, expect, it } from "vitest";
import { fimPeriodoInvestimentoRelatorioDiretoria } from "../../../src/lib/investimentoPago";

describe("fimPeriodoInvestimentoRelatorioDiretoria", () => {
  it("no mês civil atual usa hoje — mesma janela do Overview Streamers", () => {
    expect(fimPeriodoInvestimentoRelatorioDiretoria("2026-08-18", "2026-08-01", "2026-08-17")).toBe(
      "2026-08-18",
    );
  });

  it("no dia 1 usa ontem (mês anterior fechado)", () => {
    expect(fimPeriodoInvestimentoRelatorioDiretoria("2026-09-01", "2026-08-01", "2026-08-31")).toBe(
      "2026-08-31",
    );
  });
});
