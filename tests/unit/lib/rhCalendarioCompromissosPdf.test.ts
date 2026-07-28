import { describe, expect, it } from "vitest";
import {
  cabecalhoCelulaGradePdf,
  diaSemanaCurtoPdf,
  diaSemanaListaPdf,
  linhaListaCalendarioPdf,
  situacaoListaPdf,
  type RhCalendarioPdfDia,
} from "@/lib/rhCalendarioCompromissosPdf";

const diaBase: RhCalendarioPdfDia = {
  diaIso: "2026-07-15",
  diaNumero: 15,
  diaSemanaCurto: "Qua",
  diaSemanaLista: "QUARTA-FEIRA",
  turnoLinha: "Noite — 18h às 06h",
  reunioes: [],
};

describe("rhCalendarioCompromissosPdf", () => {
  it("resolve dia da semana curto e da lista", () => {
    expect(diaSemanaCurtoPdf("2026-07-15")).toBe("Qua");
    expect(diaSemanaListaPdf("2026-07-15")).toBe("QUARTA-FEIRA");
  });

  it("monta cabeçalho da célula e linha da lista", () => {
    expect(cabecalhoCelulaGradePdf(diaBase)).toBe("15 - Qua");
    expect(linhaListaCalendarioPdf(diaBase)).toBe(
      "15/07/2026 - QUARTA-FEIRA: Noite — 18h às 06h",
    );
  });

  it("usa Folga quando não há turno e concatena reuniões", () => {
    const folga: RhCalendarioPdfDia = {
      ...diaBase,
      turnoLinha: null,
      reunioes: ["Reunião - RH"],
    };
    expect(situacaoListaPdf(folga)).toBe("Folga | Reunião - RH");
    expect(linhaListaCalendarioPdf(folga)).toBe("15/07/2026 - QUARTA-FEIRA: Folga | Reunião - RH");
  });
});
