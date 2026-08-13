import { describe, expect, it } from "vitest";
import { hojeIsoBrasil } from "../../../src/lib/dateBrasil";
import { capFimAderenciaMesCorrente } from "../../../src/lib/overviewPrestadorCalendarioHelpers";
import {
  calcularMetricasPrestadorPeriodo,
  OVERVIEW_PRESTADOR_METRICAS_ZERO,
} from "../../../src/lib/overviewPrestadorMetrics";

describe("capFimAderenciaMesCorrente", () => {
  it("fecha em hoje no mês corrente e preserva competências fechadas", () => {
    const hoje = hojeIsoBrasil();
    expect(capFimAderenciaMesCorrente("2099-12-31", false)).toBe(hoje);
    expect(capFimAderenciaMesCorrente("2020-01-31", false)).toBe("2020-01-31");
    expect(capFimAderenciaMesCorrente("2099-12-31", true)).toBe("2099-12-31");
  });
});

describe("calcularMetricasPrestadorPeriodo — aderência até hoje", () => {
  it("não conta dias futuros como realizado nem no denominador de presença", () => {
    const m = calcularMetricasPrestadorPeriodo({
      funcionarioId: "f1",
      prestador: undefined,
      opTurnos: null,
      gradeRows: [
        { funcionario_id: "f1", dia_iso: "2026-08-10", area_key: "game_presenter", valor: "Escalado" },
        { funcionario_id: "f1", dia_iso: "2026-08-20", area_key: "game_presenter", valor: "Escalado" },
      ],
      pontoRows: [{ dia_sp: "2026-08-10", check_in_at: "2026-08-10T12:00:00Z", check_out_at: "2026-08-10T20:00:00Z" }],
      presencaGestao: new Map(),
      periodoInicio: "2026-08-01",
      periodoFim: "2026-08-31",
      periodoFimAderencia: "2026-08-13",
      mesesRef: [{ ano: 2026, mes: 7 }],
    });
    expect(m.diasEscalado).toBe(2);
    expect(m.diasEscaladoAderencia).toBe(1);
    expect(m.diasRealizado).toBe(1);
    expect(OVERVIEW_PRESTADOR_METRICAS_ZERO.diasEscaladoAderencia).toBe(0);
  });
});
