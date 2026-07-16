import { describe, expect, it } from "vitest";
import { getMesesDisponiveis } from "./overviewSpinLogic";

describe("getMesesDisponiveis do Overview Spin", () => {
  it("limita o carrossel ao mês atual e aos dois anteriores", () => {
    expect(getMesesDisponiveis(new Date(2026, 6, 16))).toEqual([
      { ano: 2026, mes: 4, label: "Maio 2026" },
      { ano: 2026, mes: 5, label: "Junho 2026" },
      { ano: 2026, mes: 6, label: "Julho 2026" },
    ]);
  });

  it("não inclui meses anteriores ao início da operação", () => {
    expect(getMesesDisponiveis(new Date(2026, 0, 15))).toEqual([
      { ano: 2025, mes: 11, label: "Dezembro 2025" },
      { ano: 2026, mes: 0, label: "Janeiro 2026" },
    ]);
  });
});
