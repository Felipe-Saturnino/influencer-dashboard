import { describe, expect, it } from "vitest";
import {
  getMesesDisponiveis,
  montarKpiAnteriorMoM,
  type DailyRow,
} from "./overviewSpinLogic";

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

describe("montarKpiAnteriorMoM", () => {
  const dailyPrev: DailyRow[] = [
    {
      data: "2026-07-01",
      turnover: 1000,
      ggr: 100,
      bets: 50,
      uap: 10,
      margin_pct: 10,
      bet_size: 20,
      arpu: 10,
    },
  ];

  it("usa UAP do monthly_summary do mês anterior (período completo)", () => {
    const snap = montarKpiAnteriorMoM({
      historico: false,
      dailyDataPrevMonth: dailyPrev,
      monthlyUapArpuPrev: { uap: 213, arpu: 151 },
    });
    expect(snap?.ggr).toBe(100);
    expect(snap?.uap).toBe(213);
    expect(snap?.arpu).toBeCloseTo(100 / 213);
  });

  it("retorna null sem daily do mês anterior", () => {
    expect(
      montarKpiAnteriorMoM({
        historico: false,
        dailyDataPrevMonth: [],
        monthlyUapArpuPrev: { uap: 213, arpu: 151 },
      }),
    ).toBeNull();
  });
});
