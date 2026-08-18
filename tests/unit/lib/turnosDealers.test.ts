import { describe, expect, it } from "vitest";
import {
  pickStaffEstudioSlugParaTurnos,
  pickTurnosEstudioComHorario,
  resolveTurnosHorarioPrestador,
  staffEstudioCadastroAtendeTodos,
  type TurnosDealersPick,
} from "@/lib/turnosDealers";

const horariosA: TurnosDealersPick = {
  turno_manha_inicio: "07:00:00",
  turno_tarde_inicio: "15:00:00",
  turno_noite_inicio: "23:00:00",
};

const horariosB: TurnosDealersPick = {
  turno_manha_inicio: "08:00:00",
  turno_tarde_inicio: null,
  turno_noite_inicio: null,
};

const vazio: TurnosDealersPick = {
  turno_manha_inicio: null,
  turno_tarde_inicio: null,
  turno_noite_inicio: null,
};

describe("staffEstudioCadastroAtendeTodos / pickStaffEstudioSlugParaTurnos", () => {
  it("reconhece Todos Estúdios e não devolve slug específico", () => {
    const p = { staff_estudio_slugs: ["todos"], staff_estudio_slug: null };
    expect(staffEstudioCadastroAtendeTodos(p)).toBe(true);
    expect(pickStaffEstudioSlugParaTurnos(p)).toBeNull();
  });

  it("devolve o slug específico quando não é todos", () => {
    const p = { staff_estudio_slugs: ["sports_club"], staff_estudio_slug: null };
    expect(staffEstudioCadastroAtendeTodos(p)).toBe(false);
    expect(pickStaffEstudioSlugParaTurnos(p)).toBe("sports_club");
  });
});

describe("pickTurnosEstudioComHorario", () => {
  it("escolhe o primeiro slug com horário preenchido", () => {
    const map = new Map<string, TurnosDealersPick>([
      ["zeta", vazio],
      ["alpha", horariosA],
      ["beta", horariosB],
    ]);
    expect(pickTurnosEstudioComHorario(map)).toEqual(horariosA);
  });

  it("devolve null quando nenhum estúdio tem horário", () => {
    expect(pickTurnosEstudioComHorario(new Map([["alpha", vazio]]))).toBeNull();
  });
});

describe("resolveTurnosHorarioPrestador", () => {
  it("Shuffler em Todos Estúdios usa o primeiro estúdio com horário", () => {
    const mapEst = new Map<string, TurnosDealersPick>([
      ["blaze_studio", horariosA],
      ["sports_club", horariosB],
    ]);
    const got = resolveTurnosHorarioPrestador(
      { staff_operadora_slug: null, staff_estudio_slugs: ["todos"] },
      new Map(),
      mapEst,
    );
    expect(got).toEqual(horariosA);
  });

  it("estúdio específico prevalece sobre o fallback Todos", () => {
    const mapEst = new Map<string, TurnosDealersPick>([
      ["alpha", horariosA],
      ["sports_club", horariosB],
    ]);
    const got = resolveTurnosHorarioPrestador(
      { staff_operadora_slug: null, staff_estudio_slugs: ["sports_club"] },
      new Map(),
      mapEst,
    );
    expect(got).toEqual(horariosB);
  });
});
