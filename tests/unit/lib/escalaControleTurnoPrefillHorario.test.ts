import { describe, expect, it } from "vitest";
import {
  horarioPrevistoTurnoCt,
  prefillRegistrarHorarioCt,
  resolverHorarioPrevistoPresencaCt,
  type CtEstudioHorarioTurno,
} from "../../../src/lib/escalaControleTurno";

const estudios: CtEstudioHorarioTurno[] = [
  {
    slug: "blaze",
    nome: "Blaze",
    turno_manha_inicio: "07:00:00",
    turno_tarde_inicio: "15:00:00",
    turno_noite_inicio: "23:00:00",
  },
  {
    slug: "cda",
    nome: "CDA",
    turno_manha_inicio: "06:00:00",
    turno_tarde_inicio: "14:00:00",
    turno_noite_inicio: "22:00:00",
  },
];

describe("Registrar Horário — pré-preenchimento", () => {
  it("manhã Blaze: 07:00 → 15:00", () => {
    expect(horarioPrevistoTurnoCt("manha", "07:00:00")).toEqual({
      entrada: "07:00",
      saida: "15:00",
    });
  });

  it("mantém check-in e preenche só a saída em branco", () => {
    const previsto = resolverHorarioPrevistoPresencaCt({
      turno: "manha",
      estudioLabel: "Blaze",
      estudios,
    });
    expect(
      prefillRegistrarHorarioCt({
        entradaAtual: "06:58",
        saidaAtual: "",
        previsto,
      }),
    ).toEqual({ entrada: "06:58", saida: "15:00" });
  });

  it("preenche entrada e saída quando ambos faltam", () => {
    const previsto = resolverHorarioPrevistoPresencaCt({
      turno: "manha",
      estudioLabel: "Blaze",
      estudios,
    });
    expect(
      prefillRegistrarHorarioCt({
        entradaAtual: "",
        saidaAtual: "",
        previsto,
      }),
    ).toEqual({ entrada: "07:00", saida: "15:00" });
  });

  it("Todos Estúdios usa o 1.º estúdio com horário (ordem por nome)", () => {
    const previsto = resolverHorarioPrevistoPresencaCt({
      turno: "manha",
      estudioLabel: "Todos Estúdios",
      estudios,
    });
    // Blaze antes de CDA por nome
    expect(previsto).toEqual({ entrada: "07:00", saida: "15:00" });
  });
});
