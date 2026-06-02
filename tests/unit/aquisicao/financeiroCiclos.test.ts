import { describe, expect, it, vi, afterEach } from "vitest";
import type { CicloPagamento } from "@/types";
import {
  cicloAberto,
  fmtCicloDatas,
  periodoDoMes,
  yyyymmFromDateStr,
} from "@/pages/aquisicao/Financeiro/financeiroCiclos";

describe("periodoDoMes (Financeiro)", () => {
  it("retorna intervalo do mês civil", () => {
    expect(periodoDoMes("2026-04")).toEqual({ inicio: "2026-04-01", fim: "2026-04-30" });
  });
});

describe("yyyymmFromDateStr", () => {
  it("extrai YYYY-MM de data ISO", () => {
    expect(yyyymmFromDateStr("2026-03-15")).toBe("2026-03");
  });
});

describe("fmtCicloDatas", () => {
  it("formata intervalo legível", () => {
    const s = fmtCicloDatas("2026-03-01", "2026-03-07");
    expect(s).toMatch(/01/);
    expect(s).toMatch(/07/);
  });
});

describe("cicloAberto", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("false quando fechado_em preenchido", () => {
    const ciclo = { fechado_em: "2026-01-01", data_fim: "2026-12-31" } as CicloPagamento;
    expect(cicloAberto(ciclo)).toBe(false);
  });

  it("true quando hoje <= data_fim e não fechado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
    const ciclo = { fechado_em: null, data_fim: "2026-03-20" } as CicloPagamento;
    expect(cicloAberto(ciclo)).toBe(true);
  });
});
