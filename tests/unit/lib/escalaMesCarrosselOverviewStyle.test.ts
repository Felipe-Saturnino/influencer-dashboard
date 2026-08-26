import { describe, expect, it } from "vitest";
import {
  getMesesDisponiveisEscalaCarrossel,
  getMesesDisponiveisEscalaCarrosselComMesSeguinte,
} from "../../../src/lib/escalaMesCarrosselOverviewStyle";

describe("getMesesDisponiveisEscalaCarrosselComMesSeguinte", () => {
  it("inclui o mês civil seguinte ao corrente", () => {
    const hoje = new Date(2026, 7, 26);
    const base = getMesesDisponiveisEscalaCarrossel(hoje);
    const comSeguinte = getMesesDisponiveisEscalaCarrosselComMesSeguinte(hoje);

    expect(base.some((m) => m.ano === 2026 && m.mes === 7)).toBe(true);
    expect(base.some((m) => m.ano === 2026 && m.mes === 8)).toBe(false);

    expect(comSeguinte.length).toBe(base.length + 1);
    expect(comSeguinte.some((m) => m.ano === 2026 && m.mes === 8)).toBe(true);
    expect(comSeguinte[comSeguinte.length - 1]).toEqual({
      ano: 2026,
      mes: 8,
      label: "Setembro 2026",
    });
  });

  it("não duplica mês se o carrossel base já o inclui", () => {
    const hoje = new Date(2026, 8, 10);
    const base = getMesesDisponiveisEscalaCarrossel(hoje);
    const comSeguinte = getMesesDisponiveisEscalaCarrosselComMesSeguinte(hoje);

    expect(base.some((m) => m.ano === 2026 && m.mes === 8)).toBe(true);
    expect(comSeguinte.length).toBe(base.length + 1);
    expect(comSeguinte.some((m) => m.ano === 2026 && m.mes === 9)).toBe(true);
  });
});
