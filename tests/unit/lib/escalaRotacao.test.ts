import { describe, expect, it } from "vitest";
import {
  gerarPatternRotacao,
  labelsMesasRotacao,
  ROTACAO_MAX_MESAS_SEGUIDAS,
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

function assertSemBreaksSeguidos(matrix: string[][]) {
  for (let p = 0; p < matrix.length; p++) {
    const row = matrix[p]!;
    for (let s = 1; s < row.length; s++) {
      if (row[s] === "Break" && row[s - 1] === "Break") {
        expect.fail(`GP ${p}: Breaks seguidos nos slots ${s - 1} e ${s}`);
      }
    }
  }
}

function assertMaxMesasSeguidas(matrix: string[][], max: number) {
  for (let p = 0; p < matrix.length; p++) {
    let streak = 0;
    for (const v of matrix[p]!) {
      if (v === "Break") {
        streak = 0;
      } else {
        streak += 1;
        expect(streak, `GP ${p}: ${streak} mesas seguidas`).toBeLessThanOrEqual(max);
      }
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
  it("com 7 GPs e 6 mesas: sem duplicar, sem Breaks seguidos, máx. 4 mesas (pode descobrir 1 mesa)", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const matrix = gerarPatternRotacao(mesas, 7, 16);
    expect(matrix).toHaveLength(7);
    expect(matrix[0]).toHaveLength(16);

    assertUmaMesaPorSlot(matrix, mesas);
    assertSemBreaksSeguidos(matrix);
    assertMaxMesasSeguidas(matrix, ROTACAO_MAX_MESAS_SEGUIDAS);

    for (let s = 0; s < 16; s++) {
      const vals = matrix.map((row) => row[s]!);
      const breaks = vals.filter((v) => v === "Break").length;
      const working = vals.filter((v) => v !== "Break");
      // Ritmo 4+1 → ceil(7/5)=2 Breaks; cobertura pediria 1 — usa 2
      expect(breaks).toBe(2);
      expect(new Set(working).size).toBe(5);
    }

    expect(new Set(matrix.flat().filter((v) => v !== "Break"))).toEqual(new Set(mesas));
  });

  it("caso Blaze 7 GPs × 5 mesas: cobertura total, sem duplicar, sem Breaks seguidos, máx. 4 mesas", () => {
    const mesas = ["6140", "6141", "6142", "6143", "6144"];
    const matrix = gerarPatternRotacao(mesas, 7, 16);
    assertUmaMesaPorSlot(matrix, mesas);
    assertSemBreaksSeguidos(matrix);
    assertMaxMesasSeguidas(matrix, ROTACAO_MAX_MESAS_SEGUIDAS);

    for (let s = 0; s < 16; s++) {
      const vals = matrix.map((row) => row[s]!);
      expect(vals.filter((v) => v === "Break")).toHaveLength(2);
      expect(new Set(vals.filter((v) => v !== "Break"))).toEqual(new Set(mesas));
    }
  });

  it("com N === M usa ritmo 4+1 (Breaks sem sequenciar, máx. 4 mesas)", () => {
    const mesas = ["A", "B", "C", "D", "E", "F"];
    const matrix = gerarPatternRotacao(mesas, 6, 12);
    assertUmaMesaPorSlot(matrix, mesas);
    assertSemBreaksSeguidos(matrix);
    assertMaxMesasSeguidas(matrix, ROTACAO_MAX_MESAS_SEGUIDAS);

    for (let s = 0; s < 12; s++) {
      const breaks = matrix.map((row) => row[s]!).filter((v) => v === "Break").length;
      // ceil(6/5)=2
      expect(breaks).toBe(2);
    }
  });

  it("com N < M não duplica, respeita 4+1 e ao longo do turno usa todas as mesas", () => {
    const mesas = ["1", "2", "3", "4", "5", "6"];
    const matrix = gerarPatternRotacao(mesas, 5, 12);
    assertUmaMesaPorSlot(matrix, mesas);
    assertSemBreaksSeguidos(matrix);
    assertMaxMesasSeguidas(matrix, ROTACAO_MAX_MESAS_SEGUIDAS);
    expect(new Set(matrix.flat().filter((v) => v !== "Break"))).toEqual(new Set(mesas));
  });

  it("nunca deixa mesas 6132/6135 de fora no caso CDA 7×6", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const matrix = gerarPatternRotacao(mesas, 7, 16);
    const vistas = new Set(matrix.flat().filter((v) => v !== "Break"));
    expect(vistas.has("6132")).toBe(true);
    expect(vistas.has("6135")).toBe(true);
    assertUmaMesaPorSlot(matrix, mesas);
    assertSemBreaksSeguidos(matrix);
  });
});
