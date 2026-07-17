import { describe, expect, it } from "vitest";
import { resolverAcoesPresencaLinha } from "@/lib/rhCalendarioPresencaGestao";

const base = {
  situacao: "Folga",
  diaIso: "2026-07-18",
  entEsc: "—",
  saiEsc: "—",
  statusBase: "Folga",
};

describe("resolverAcoesPresencaLinha em Folga", () => {
  it("permite aprovar quando houve Check-in e Check-out", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
      }).acaoPrimaria,
    ).toBe("aprovar");
  });

  it("mantém sem aprovação quando o ponto está incompleto", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: false,
      }).acaoPrimaria,
    ).toBeNull();
  });

  it("não oferece nova aprovação depois de aprovado", () => {
    expect(
      resolverAcoesPresencaLinha({
        ...base,
        temCheckIn: true,
        temCheckOut: true,
        gestao: {
          statusGestao: "aprovado",
          historico: [],
        },
      }).acaoPrimaria,
    ).toBeNull();
  });
});
