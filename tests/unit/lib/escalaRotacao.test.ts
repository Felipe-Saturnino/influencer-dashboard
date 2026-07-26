import { describe, expect, it } from "vitest";
import {
  gerarGradeRotacao,
  gerarPatternRotacao,
  labelsMesasRotacao,
  ROTACAO_MAX_MESAS_SEGUIDAS,
  type RotacaoGeracaoPessoa,
} from "../../../src/lib/escalaRotacao";

function assertCoberturaTotal(matrix: string[][], mesas: string[], nGps: number) {
  const nSlots = matrix[0]?.length ?? 0;
  for (let s = 0; s < nSlots; s++) {
    const working = matrix.map((row) => row[s]!).filter((v) => v !== "Break");
    expect(new Set(working).size, `slot ${s} mesas únicas`).toBe(mesas.length);
    expect(working).toHaveLength(mesas.length);
    for (const m of mesas) {
      expect(working).toContain(m);
    }
  }
  // Linhas de GP (antes dos SL) respeitam máx. 4 — SL pode ter outro ritmo
  for (let p = 0; p < nGps; p++) {
    let streak = 0;
    for (const v of matrix[p]!) {
      if (v === "Break") streak = 0;
      else {
        streak += 1;
        expect(streak, `GP ${p}: ${streak} mesas seguidas`).toBeLessThanOrEqual(
          ROTACAO_MAX_MESAS_SEGUIDAS,
        );
      }
    }
  }
}

function assertSemMesaConsecutiva(matrix: string[][]) {
  for (let p = 0; p < matrix.length; p++) {
    const row = matrix[p]!;
    for (let s = 1; s < row.length; s++) {
      const a = row[s - 1]!;
      const b = row[s]!;
      if (a === "Break" || b === "Break") continue;
      expect(a === b, `pessoa ${p}: mesa ${a} repetida nos slots ${s - 1}/${s}`).toBe(false);
    }
  }
}

function gpsFake(n: number): RotacaoGeracaoPessoa[] {
  return Array.from({ length: n }, (_, i) => ({
    funcionarioId: `gp-${i}`,
    isShiftLead: false,
  }));
}

function slFake(n: number): RotacaoGeracaoPessoa[] {
  return Array.from({ length: n }, (_, i) => ({
    funcionarioId: `sl-${i}`,
    isShiftLead: true,
  }));
}

describe("labelsMesasRotacao", () => {
  it("mantém ordem, ignora vazio e deduplica", () => {
    expect(
      labelsMesasRotacao([
        { numeroMesa: "6130" },
        { numeroMesa: "  " },
        { numeroMesa: "6131" },
        { numeroMesa: "6130" },
      ]),
    ).toEqual(["6130", "6131"]);
  });
});

describe("gerarGradeRotacao", () => {
  it("Blaze 7 GP × 5 mesas: cobre todas, sem repetir mesa seguida, máx. 4 para GP", () => {
    const mesas = ["6140", "6141", "6142", "6143", "6144"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(7),
      shiftLeads: [],
      nSlots: 16,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 7);
    assertSemMesaConsecutiva(res.matrix);
  });

  it("CDA 7 GP × 6 mesas + 1 SL: cobre todas; SL faz o mínimo de mesas", () => {
    const mesas = ["6130", "6131", "6132", "6133", "6134", "6135"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(7),
      shiftLeads: slFake(1),
      nSlots: 16,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 7);
    assertSemMesaConsecutiva(res.matrix);

    const slRow = res.matrix[7]!;
    const slMesas = slRow.filter((v) => v !== "Break").length;
    const gpMesas = res.matrix.slice(0, 7).map((row) => row.filter((v) => v !== "Break").length);
    const minGp = Math.min(...gpMesas);
    // SL nunca deve fazer mais mesas que o GP que menos trabalhou
    expect(slMesas).toBeLessThanOrEqual(minGp);
  });

  it("5 GP × 5 mesas + 1 SL: SL quase só Break (GPs bastam no ritmo)", () => {
    const mesas = ["A", "B", "C", "D", "E"];
    const res = gerarGradeRotacao({
      mesasLabels: mesas,
      gps: gpsFake(5),
      shiftLeads: slFake(1),
      nSlots: 10,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    assertCoberturaTotal(res.matrix, mesas, 5);
    assertSemMesaConsecutiva(res.matrix);
    // Com 5 GP e 5 mesas, no 5º slot todos os GP precisam Break → SL cobre
    const slMesas = res.matrix[5]!.filter((v) => v !== "Break").length;
    expect(slMesas).toBeGreaterThan(0);
  });

  it("falha se pessoas < mesas", () => {
    const res = gerarGradeRotacao({
      mesasLabels: ["1", "2", "3"],
      gps: gpsFake(2),
      shiftLeads: [],
      nSlots: 4,
    });
    expect(res.ok).toBe(false);
  });
});

describe("gerarPatternRotacao (compat)", () => {
  it("delega para gerarGradeRotacao sem SL", () => {
    const mesas = ["1", "2", "3", "4"];
    const matrix = gerarPatternRotacao(mesas, 5, 8);
    expect(matrix).toHaveLength(5);
    assertCoberturaTotal(matrix, mesas, 5);
    assertSemMesaConsecutiva(matrix);
  });
});
