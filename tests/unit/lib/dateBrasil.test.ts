import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fmtDataBrasilCurta,
  fimDiaBrasilUtcIso,
  hojeIsoBrasil,
  horaAtualBrasil,
  horaBrasilFromInstant,
  inicioDiaBrasilUtcIso,
  isoDateBrasilFromInstant,
  passouHorarioAgendadoBr,
  periodoDiaBrasil,
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

describe("fimDiaBrasilUtcIso / periodoDiaBrasil", () => {
  it("fecha o dia civil SP em 02:59:59 UTC do dia seguinte", () => {
    expect(fimDiaBrasilUtcIso("2026-06-02")).toBe("2026-06-03T02:59:59.999Z");
  });

  it("monta intervalo completo do dia civil BR", () => {
    expect(periodoDiaBrasil("2026-06-02")).toEqual({
      inicio: "2026-06-02T03:00:00.000Z",
      fim: "2026-06-03T02:59:59.999Z",
      fimExclusive: "2026-06-03",
    });
  });
});

describe("horaBrasilFromInstant", () => {
  it("retorna hora civil SP", () => {
    expect(horaBrasilFromInstant("2026-06-02T14:00:00.000Z")).toBe(11);
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
