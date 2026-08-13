import { describe, expect, it } from "vitest";
import {
  agregarResumoPorDia,
  calcularKpisResumo,
  chaveRelatorResumo,
  mediaPonderadaMs,
} from "../../../src/lib/smSinaisHelpers";
import type { SmSinalResumoRow } from "../../../src/lib/smSinaisTypes";

function row(partial: Partial<SmSinalResumoRow>): SmSinalResumoRow {
  return {
    dia_brt: "2026-08-01",
    estudio_slug: "blaze",
    resolver_funcionario_id: "sm-1",
    creator_funcionario_id: "gp-1",
    resolver_id: "tos-1",
    creator_id: "SG1",
    resolver_screen_name: "SM Um",
    creator_screen_name: "GP Um",
    sinais_qtd: 10,
    tma_total_sum_ms: 10_000,
    tma_total_n: 10,
    tma_atend_sum_ms: 2_000,
    tma_atend_n: 10,
    tma_res_sum_ms: 8_000,
    tma_res_n: 10,
    ...partial,
  };
}

describe("calcularKpisResumo", () => {
  it("pondera TMA pela quantidade de amostras, não pela média das médias", () => {
    const k = calcularKpisResumo([
      row({ sinais_qtd: 1, tma_total_sum_ms: 1_000, tma_total_n: 1 }),
      row({ sinais_qtd: 9, tma_total_sum_ms: 90_000, tma_total_n: 9 }),
    ]);
    expect(k.total).toBe(10);
    expect(k.tmaTotalMs).toBe(9_100);
  });

  it("devolve — (null) quando não há amostra de TMA", () => {
    const k = calcularKpisResumo([row({ tma_total_sum_ms: 0, tma_total_n: 0 })]);
    expect(k.tmaTotalMs).toBeNull();
    expect(mediaPonderadaMs(0, 0)).toBeNull();
  });
});

describe("agregarResumoPorDia", () => {
  it("soma sinais do mesmo dia", () => {
    const dias = agregarResumoPorDia([
      row({ dia_brt: "2026-08-01", sinais_qtd: 3 }),
      row({ dia_brt: "2026-08-01", estudio_slug: "cda", sinais_qtd: 2 }),
      row({ dia_brt: "2026-08-02", sinais_qtd: 4 }),
    ]);
    const porDia = Object.fromEntries(dias.map((d) => [d.diaBrt, d.sinais]));
    expect(porDia["2026-08-01"]).toBe(5);
    expect(porDia["2026-08-02"]).toBe(4);
  });
});

describe("chaveRelatorResumo", () => {
  it("usa o id do prestador quando existe", () => {
    expect(chaveRelatorResumo(row({ creator_funcionario_id: "abc" }))).toBe("abc");
  });

  it("cai no nome quando não há id", () => {
    expect(
      chaveRelatorResumo(row({ creator_funcionario_id: null, creator_screen_name: "Ana" })),
    ).toBe("nome:Ana");
  });
});
