import { describe, expect, it } from "vitest";
import {
  fechamentoAindaFechadoNoDia,
  fechamentoVisivelNoDia,
  formatDataHoraCt,
} from "../../../src/lib/escalaControleTurno";

describe("fechamentoVisivelNoDia", () => {
  it("mostra fechamento aberto em todos os dias após o registro", () => {
    const row = { data_registro: "2026-09-04", data_reabertura: null, nao_reaberta: true };
    expect(fechamentoVisivelNoDia(row, "2026-09-04")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-05")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-08")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-03")).toBe(false);
  });

  it("mostra nos dias do intervalo até a data de reabertura (inclusive)", () => {
    const row = {
      data_registro: "2026-09-04",
      data_reabertura: "2026-09-08",
      nao_reaberta: false,
    };
    expect(fechamentoVisivelNoDia(row, "2026-09-04")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-05")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-08")).toBe(true);
    expect(fechamentoVisivelNoDia(row, "2026-09-09")).toBe(false);
    expect(fechamentoVisivelNoDia(row, "2026-09-03")).toBe(false);
  });
});

describe("fechamentoAindaFechadoNoDia", () => {
  it("considera fechada nos dias anteriores à reabertura", () => {
    const row = {
      data_reabertura: "2026-09-08",
      nao_reaberta: false,
    };
    expect(fechamentoAindaFechadoNoDia(row, "2026-09-04")).toBe(true);
    expect(fechamentoAindaFechadoNoDia(row, "2026-09-07")).toBe(true);
    expect(fechamentoAindaFechadoNoDia(row, "2026-09-08")).toBe(false);
  });

  it("permanece fechada enquanto nao_reaberta", () => {
    expect(
      fechamentoAindaFechadoNoDia({ data_reabertura: null, nao_reaberta: true }, "2026-09-08"),
    ).toBe(true);
  });
});

describe("formatDataHoraCt", () => {
  it("formata data e hora em pt-BR", () => {
    expect(formatDataHoraCt("2026-09-04", "14:30")).toBe("04/09/2026 14:30");
  });

  it("devolve travessão sem data ou hora", () => {
    expect(formatDataHoraCt(null, "14:30")).toBe("—");
    expect(formatDataHoraCt("2026-09-04", null)).toBe("—");
  });
});
