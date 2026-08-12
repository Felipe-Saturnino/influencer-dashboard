import { describe, expect, it } from "vitest";
import {
  situacaoGestaoEscalaParaDia,
  situacaoOverviewContaComoEscalado,
} from "../../../src/lib/overviewPrestadorCalendarioHelpers";

describe("situacaoGestaoEscalaParaDia + Overview jornada", () => {
  it("mapeia célula Atestado para situação Atestado", () => {
    expect(situacaoGestaoEscalaParaDia("Atestado")).toBe("Atestado");
  });

  it("conta Atestado como jornada escalada no Overview (não perde dias após sync)", () => {
    expect(situacaoOverviewContaComoEscalado("Atestado")).toBe(true);
    expect(situacaoOverviewContaComoEscalado("Escalado")).toBe(true);
    expect(situacaoOverviewContaComoEscalado("Folga")).toBe(false);
    expect(situacaoOverviewContaComoEscalado("Venda")).toBe(false);
  });
});
