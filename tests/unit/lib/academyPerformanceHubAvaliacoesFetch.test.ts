import { describe, expect, it } from "vitest";
import {
  dataAvaliacaoHojeBr,
  dataAvaliacaoHojeIso,
  periodoHistoricoPerformanceHub,
} from "../../../src/lib/academyPerformanceHubAvaliacoesFetch";
import { fmtDate } from "../../../src/lib/dashboardHelpers";

describe("dataAvaliacaoHoje — calendário local", () => {
  it("grava YYYY-MM-DD / dd/mm/aaaa pelo calendário local do ref (não UTC)", () => {
    const ref = new Date(2026, 8, 14, 22, 30, 0);
    expect(dataAvaliacaoHojeIso(ref)).toBe(fmtDate(ref));
    expect(dataAvaliacaoHojeIso(ref)).toBe("2026-09-14");
    expect(dataAvaliacaoHojeBr(ref)).toBe("14/09/2026");
  });
});

describe("periodoHistoricoPerformanceHub", () => {
  it("mantém início das 13 competências e fim no último dia do mês", () => {
    const ref = new Date(2026, 8, 14);
    const { inicio, fim } = periodoHistoricoPerformanceHub(ref);
    expect(inicio).toBe(fmtDate(new Date(2025, 8, 1)));
    expect(fim).toBe("2026-09-30");
  });
});
