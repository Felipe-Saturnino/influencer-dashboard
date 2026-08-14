import { describe, expect, it } from "vitest";
import { hojeIsoBrasil } from "../../../src/lib/dateBrasil";
import { capFimAderenciaMesCorrente } from "../../../src/lib/overviewPrestadorCalendarioHelpers";
import {
  calcularMetricasPrestadorPeriodo,
  OVERVIEW_PRESTADOR_METRICAS_ZERO,
  pctPresencaAderencia,
  severidadeAtencaoPrestador,
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
    expect(m.horasEscaladasAderenciaMin).toBeLessThanOrEqual(m.horasEscaladasMin);
    expect(OVERVIEW_PRESTADOR_METRICAS_ZERO.diasEscaladoAderencia).toBe(0);
    expect(OVERVIEW_PRESTADOR_METRICAS_ZERO.horasEscaladasAderenciaMin).toBe(0);
  });

  it("não trata aderência zero como mês publicado (início do mês / só jornadas futuras)", () => {
    const m = {
      ...OVERVIEW_PRESTADOR_METRICAS_ZERO,
      diasEscalado: 12,
      diasEscaladoAderencia: 0,
      diasRealizado: 0,
      horasEscaladasMin: 720,
      horasEscaladasAderenciaMin: 0,
    };
    expect(pctPresencaAderencia(m.diasRealizado, m.diasEscaladoAderencia)).toBeNull();
    expect(severidadeAtencaoPrestador(m)).toBe("ok");
  });

  it("conta horas escaladas no recorte de aderência, não no mês futuro", () => {
    const m = calcularMetricasPrestadorPeriodo({
      funcionarioId: "f1",
      prestador: { id: "f1", escala: "4x2", area_atuacao: "estudio" } as never,
      opTurnos: {
        turno_manha_inicio: "14:00",
        turno_tarde_inicio: "14:00",
        turno_noite_inicio: "22:00",
      },
      gradeRows: [
        { funcionario_id: "f1", dia_iso: "2026-08-10", area_key: "game_presenter", valor: "MRN" },
        { funcionario_id: "f1", dia_iso: "2026-08-20", area_key: "game_presenter", valor: "MRN" },
      ],
      pontoRows: [],
      presencaGestao: new Map(),
      periodoInicio: "2026-08-01",
      periodoFim: "2026-08-31",
      periodoFimAderencia: "2026-08-13",
      mesesRef: [{ ano: 2026, mes: 7 }],
    });
    expect(m.diasEscalado).toBe(2);
    expect(m.diasEscaladoAderencia).toBe(1);
    expect(m.horasEscaladasMin).toBeGreaterThan(0);
    expect(m.horasEscaladasAderenciaMin).toBeGreaterThan(0);
    expect(m.horasEscaladasAderenciaMin).toBeLessThan(m.horasEscaladasMin);
  });
});
