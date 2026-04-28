import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fmtBRL,
  fmtHorasTotal,
  fmtDia,
  getDatasDoMes,
  getPeriodoComparativoMoM,
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
