import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fmtBRL,
  fmtHorasTotal,
  fmtDia,
  getDatasDoMes,
  getIdxMesCarrosselPadrao,
  getPeriodoComparativoMoM,
  getPeriodoHistoricoCompetencias,
  HISTORICO_COMPETENCIAS_MESES,
  isDataNoPeriodoHistoricoCompetencias,
  getStatusROI,
} from "@/lib/dashboardHelpers";

describe("fmtBRL", () => {
  it("formata valor positivo em pt-BR", () => {
    expect(fmtBRL(1234.56)).toMatch(/1\.234,56/);
  });

  it("inclui sinal para negativo", () => {
    expect(fmtBRL(-10)).toMatch(/10/);
    expect(fmtBRL(-10)).toMatch(/^-/);
  });
});

describe("fmtHorasTotal", () => {
  it("preenche horas e minutos com zero à esquerda", () => {
    expect(fmtHorasTotal(1.5)).toBe("01:30");
    expect(fmtHorasTotal(0)).toBe("00:00");
  });
});

describe("fmtDia", () => {
  it("retorna — para string vazia", () => {
    expect(fmtDia("")).toBe("—");
  });

  it("retorna dia/mês a partir de ISO yyyy-mm-dd", () => {
    expect(fmtDia("2026-03-15")).toBe("15/03");
  });
});

describe("getDatasDoMes", () => {
  it("retorna primeiro e último dia do mês civil", () => {
    expect(getDatasDoMes(2026, 1)).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
  });
});

describe("getPeriodoHistoricoCompetencias", () => {
  it("inclui a competência atual e as 12 anteriores para comparação YoY", () => {
    expect(HISTORICO_COMPETENCIAS_MESES).toBe(13);
    expect(getPeriodoHistoricoCompetencias(new Date(2026, 6, 16))).toEqual({
      inicio: "2025-07-01",
      fim: "2026-07-16",
    });
  });

  it("atravessa a virada de ano mantendo 13 competências inclusivas", () => {
    expect(getPeriodoHistoricoCompetencias(new Date(2026, 0, 31))).toEqual({
      inicio: "2025-01-01",
      fim: "2026-01-31",
    });
  });

  it("valida datas ISO dentro dos limites inclusivos da janela", () => {
    const ref = new Date(2026, 6, 16);
    expect(isDataNoPeriodoHistoricoCompetencias("2025-07-01T00:00:00Z", ref)).toBe(true);
    expect(isDataNoPeriodoHistoricoCompetencias("2026-07-16", ref)).toBe(true);
    expect(isDataNoPeriodoHistoricoCompetencias("2025-06-30T23:59:59Z", ref)).toBe(false);
    expect(isDataNoPeriodoHistoricoCompetencias(null, ref)).toBe(false);
  });
});

describe("getIdxMesCarrosselPadrao", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const meses = [
    { ano: 2026, mes: 0, label: "Jan 2026" },
    { ano: 2026, mes: 1, label: "Fev 2026" },
    { ano: 2026, mes: 2, label: "Mar 2026" },
    { ano: 2026, mes: 3, label: "Abr 2026" },
    { ano: 2026, mes: 4, label: "Mai 2026" },
  ];

  it("dia 2+: seleciona o mês civil corrente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15));
    expect(getIdxMesCarrosselPadrao(meses)).toBe(4);
  });

  it("dia 1: seleciona o mês anterior (ETL D-1)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 1));
    expect(getIdxMesCarrosselPadrao(meses)).toBe(3);
  });

  it("1º de janeiro: mês anterior no ano passado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    const mesesComDez = [
      { ano: 2025, mes: 11, label: "Dez 2025" },
      { ano: 2026, mes: 0, label: "Jan 2026" },
    ];
    expect(getIdxMesCarrosselPadrao(mesesComDez)).toBe(0);
  });
});

describe("getPeriodoComparativoMoM", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mês fechado: mês inteiro vs mês civil anterior inteiro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 27));
    const { atual, anterior } = getPeriodoComparativoMoM(2026, 1);
    expect(atual).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
    expect(anterior).toEqual({ inicio: "2026-01-01", fim: "2026-01-31" });
  });

  it("mês civil em curso: MTD alinhado ao mês anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15));
    const { atual, anterior } = getPeriodoComparativoMoM(2026, 3);
    expect(atual).toEqual({ inicio: "2026-04-01", fim: "2026-04-15" });
    expect(anterior).toEqual({ inicio: "2026-03-01", fim: "2026-03-15" });
  });
});

describe("getStatusROI", () => {
  it("investimento zero e GGR+ → Bônus", () => {
    const s = getStatusROI(null, 100, 0);
    expect(s.label).toBe("Bônus");
    expect(s.roiStr).toBe("—");
  });

  it("ROI positivo → Rentável", () => {
    const s = getStatusROI(10, 100, 50);
    expect(s.label).toBe("Rentável");
    expect(s.roiStr).toBe("+10%");
  });
});
