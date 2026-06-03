import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fmtDataBrasilCurta,
  hojeIsoBrasil,
  horaAtualBrasil,
  inicioDiaBrasilUtcIso,
  isoDateBrasilFromInstant,
  passouHorarioAgendadoBr,
  subDiasIso,
} from "@/lib/dateBrasil";

describe("subDiasIso", () => {
  it("subtrai dias no calendário civil", () => {
    expect(subDiasIso("2026-03-15", 14)).toBe("2026-03-01");
  });
});

describe("inicioDiaBrasilUtcIso", () => {
  it("usa 03:00 UTC para meia-noite em SP", () => {
    expect(inicioDiaBrasilUtcIso("2026-06-02")).toBe("2026-06-02T03:00:00.000Z");
  });
});

describe("isoDateBrasilFromInstant", () => {
  it("retorna null para entrada inválida", () => {
    expect(isoDateBrasilFromInstant(null)).toBeNull();
    expect(isoDateBrasilFromInstant("")).toBeNull();
  });

  it("converte instante UTC para data civil SP", () => {
    // 2026-06-02 02:00 UTC = 2026-06-01 23:00 SP
    expect(isoDateBrasilFromInstant("2026-06-02T02:00:00.000Z")).toBe("2026-06-01");
  });
});

describe("fmtDataBrasilCurta", () => {
  it("formata dia/mês sem deslocar o dia civil", () => {
    const s = fmtDataBrasilCurta("2026-03-15");
    expect(s).toMatch(/15/);
    expect(s).toMatch(/03/);
  });
});

describe("passouHorarioAgendadoBr", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna true quando hora SP >= agendada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T12:00:00.000Z")); // 09h SP
    expect(passouHorarioAgendadoBr(6)).toBe(true);
    expect(passouHorarioAgendadoBr(10)).toBe(false);
  });
});

describe("hojeIsoBrasil / horaAtualBrasil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("respeitam fuso America/Sao_Paulo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T05:30:00.000Z")); // 02:30 SP (mesmo dia)
    expect(hojeIsoBrasil()).toBe("2026-01-15");
    expect(horaAtualBrasil()).toBe(2);
  });
});
