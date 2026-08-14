import { describe, expect, it } from "vitest";
import {
  getMesesDisponiveis,
  jogoComparativoKeysFromPorTabelaRows,
  momAnteriorComparavel,
  montarKpiAnteriorMoM,
  type DailyRow,
  type PorTabelaRow,
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
    expect(snap?.arpu).toBe(151);
  });

  it("sem daily do mês anterior ainda devolve UAP e ARPU do monthly fechado", () => {
    const snap = montarKpiAnteriorMoM({
      historico: false,
      dailyDataPrevMonth: [],
      monthlyUapArpuPrev: { uap: 213, arpu: 151 },
    });
    expect(snap?.ggr).toBeNull();
    expect(snap?.uap).toBe(213);
    expect(snap?.arpu).toBe(151);
  });
});

describe("momAnteriorComparavel", () => {
  it("esconde comparativo quando o anterior é irrisório (~1%)", () => {
    expect(momAnteriorComparavel(80334, 215)).toBe(false);
    expect(momAnteriorComparavel(1000, 0)).toBe(false);
    expect(momAnteriorComparavel(1000, null)).toBe(false);
  });

  it("mantém comparativo quando o anterior é material", () => {
    expect(momAnteriorComparavel(1000, 50)).toBe(true);
    expect(momAnteriorComparavel(0, 200)).toBe(true);
  });
});

describe("jogoComparativoKeysFromPorTabelaRows", () => {
  it("detecta Futebol Brasileiro a partir da coluna mesa (network Blaze)", () => {
    const row: PorTabelaRow = {
      data_relatorio: "2026-08-05",
      nome_tabela: "Blaze Futebol Brasileiro",
      mesaRaw: "Futebol Brasileiro",
      operadora: "blaze",
      ggr_d1: 130,
      turnover_d1: 476,
      bets_d1: 368,
      ggr_d2: null,
      turnover_d2: null,
      bets_d2: null,
      ggr_mtd: null,
      turnover_mtd: null,
      bets_mtd: null,
    };
    const keys = jogoComparativoKeysFromPorTabelaRows([row], [{ slug: "blaze", nome: "Blaze" }]);
    expect([...keys]).toEqual(["futebol_brasileiro"]);
  });
});
