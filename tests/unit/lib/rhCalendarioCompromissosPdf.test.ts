import { describe, expect, it } from "vitest";
import { labelDiaCalendarioPdf } from "@/lib/rhCalendarioCompromissosPdf";

describe("labelDiaCalendarioPdf", () => {
  it("formata dia ISO em português", () => {
    expect(labelDiaCalendarioPdf("2026-07-15")).toBe("Quarta-feira, 15/07/2026");
  });

  it("devolve o ISO bruto quando inválido", () => {
    expect(labelDiaCalendarioPdf("x")).toBe("x");
  });
});
