import { describe, expect, it } from "vitest";
import {
  gerarPatternRotacao,
  labelsMesasRotacao,
} from "../../../src/lib/escalaRotacao";

function assertUmaMesaPorSlot(matrix: string[][], mesas: string[]) {
  const nSlots = matrix[0]?.length ?? 0;
  for (let s = 0; s < nSlots; s++) {
    const usados = new Set<string>();
    for (const row of matrix) {
      const v = row[s]!;
      if (v === "Break") continue;
      expect(mesas).toContain(v);
      expect(usados.has(v), `mesa ${v} duplicada no slot ${s}`).toBe(false);
      usados.add(v);
    }
  }
}

describe("labelsMesasRotacao", () => {
  it("mantém ordem, ignora vazio e deduplica", () => {
    expect(
      labelsMesasRotacao([
        { numeroMesa: "6130" },
        { numeroMesa: "  " },
        { numeroMesa: "6131" },
        { numeroMesa: "6130" },
        { numeroMesa: "6132" },
      ]),
    ).toEqual(["6130", "6131", "6132"]);
  });
});

describe("gerarPatternRotacao", () => {
  it("com 7 GPs e 6 mesas cobre todas as mesas e 1 Break por slot sem duplicar", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const matrix = gerarPatternRotacao(mesas, 7, 16);
    expect(matrix).toHaveLength(7);
    expect(matrix[0]).toHaveLength(16);

    assertUmaMesaPorSlot(matrix, mesas);

    for (let s = 0; s < 16; s++) {
      const vals = matrix.map((row) => row[s]!);
      const breaks = vals.filter((v) => v === "Break").length;
      const working = vals.filter((v) => v !== "Break");
      expect(breaks).toBe(1);
      expect(new Set(working).size).toBe(6);
      expect(new Set(working)).toEqual(new Set(mesas));
    }

    // Todas as mesas aparecem na grade
    const todas = new Set(matrix.flat().filter((v) => v !== "Break"));
    expect(todas).toEqual(new Set(mesas));
  });

  it("com N === M não força Break e cobre todas as mesas em cada slot", () => {
    const mesas = ["A", "B", "C", "D", "E", "F"];
    const matrix = gerarPatternRotacao(mesas, 6, 8);
    assertUmaMesaPorSlot(matrix, mesas);
    for (let s = 0; s < 8; s++) {
      const working = matrix.map((row) => row[s]!).filter((v) => v !== "Break");
      expect(working).toHaveLength(6);
      expect(new Set(working)).toEqual(new Set(mesas));
    }
  });

  it("com N < M não duplica e ao longo do turno usa todas as mesas", () => {
    const mesas = ["1", "2", "3", "4", "5", "6"];
    const matrix = gerarPatternRotacao(mesas, 5, 12);
    assertUmaMesaPorSlot(matrix, mesas);
    for (let s = 0; s < 12; s++) {
      const working = matrix.map((row) => row[s]!).filter((v) => v !== "Break");
      expect(working).toHaveLength(5);
      expect(new Set(working).size).toBe(5);
    }
    expect(new Set(matrix.flat().filter((v) => v !== "Break"))).toEqual(new Set(mesas));
  });

  it("reproduz o bug legado: 7×6 não pode deixar mesas fora nem duplicar (caso CDA)", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const matrix = gerarPatternRotacao(mesas, 7, 16);
    const vistas = new Set(matrix.flat().filter((v) => v !== "Break"));
    expect(vistas.has("6132")).toBe(true);
    expect(vistas.has("6135")).toBe(true);
    assertUmaMesaPorSlot(matrix, mesas);
  });
});
