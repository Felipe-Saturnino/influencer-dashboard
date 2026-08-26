import { describe, expect, it } from "vitest";
import {
  dayOffsetUtc2000,
  gerarCelulasSugestaoCustomerService,
  type DiaMesLite,
} from "../../../src/lib/gestaoEscalaSugestaoCustomerService";

function diasMes(isoPrefix: string, n: number): DiaMesLite[] {
  return Array.from({ length: n }, (_, i) => {
    const day = i + 1;
    const dd = String(day).padStart(2, "0");
    return { iso: `${isoPrefix}-${dd}`, isWeekend: false, isFeriadoSP: false };
  });
}

function chave(rowId: string, iso: string): string {
  return `${rowId}|${iso}`;
}

function pred4x2Ngt(off: number, phase: number): "NGT" | "Folga" {
  const m = ((off + phase) % 6 + 6) % 6;
  return m >= 4 ? "Folga" : "NGT";
}

function preencherAgosto4x2(
  out: Record<string, string>,
  rowId: string,
  phase: number,
  diaIni: number,
  diaFim: number,
): void {
  for (let d = diaIni; d <= diaFim; d++) {
    const dd = String(d).padStart(2, "0");
    const iso = `2026-08-${dd}`;
    out[chave(rowId, iso)] = pred4x2Ngt(dayOffsetUtc2000(iso), phase);
  }
}

function predMrn33FaseA(off: number, phase: number): "MRN" | "Folga" {
  const m = ((off + phase) % 6 + 6) % 6;
  return m < 3 ? "MRN" : "Folga";
}

function predMrn33FaseB(off: number, phase: number): "MRN" | "Folga" {
  const m = ((off + phase + 3) % 6 + 6) % 6;
  return m < 3 ? "MRN" : "Folga";
}

describe("gerarCelulasSugestaoCustomerService — 3x3 Manhã pareamento A/B", () => {
  const dias = diasMes("2026-09", 6);

  it("dois GP 3x3 MRN sem mês anterior alternam variante A e B com a mesma fase", () => {
    const gpA = {
      id: "gp-mrn-a",
      escalaCadastro: "3x3",
      siglaTurnoStaff: "MRN",
      turnoStaffNome: "Manhã",
      liveNoEstudioIso: null,
    };
    const gpB = {
      id: "gp-mrn-b",
      escalaCadastro: "3x3",
      siglaTurnoStaff: "MRN",
      turnoStaffNome: "Manhã",
      liveNoEstudioIso: null,
    };

    const out = gerarCelulasSugestaoCustomerService([gpA, gpB], dias);
    const iso = "2026-09-01";
    const off = dayOffsetUtc2000(iso);
    const valA = out[chave(gpA.id, iso)];

    let phaseEncontrada = -1;
    for (let p = 0; p < 6; p++) {
      if (predMrn33FaseA(off, p) === valA) {
        phaseEncontrada = p;
        break;
      }
    }
    expect(phaseEncontrada).toBeGreaterThanOrEqual(0);
    expect(out[chave(gpB.id, iso)]).toBe(predMrn33FaseB(off, phaseEncontrada));
  });

  it("cobertura diária: A e B juntos não folgam no mesmo dia (primeira semana)", () => {
    const gpA = {
      id: "gp-mrn-a",
      escalaCadastro: "3x3",
      siglaTurnoStaff: "MRN",
      turnoStaffNome: "Manhã",
      liveNoEstudioIso: null,
    };
    const gpB = {
      id: "gp-mrn-b",
      escalaCadastro: "3x3",
      siglaTurnoStaff: "MRN",
      turnoStaffNome: "Manhã",
      liveNoEstudioIso: null,
    };

    const out = gerarCelulasSugestaoCustomerService([gpA, gpB], dias);

    for (const dia of dias) {
      const a = out[chave(gpA.id, dia.iso)];
      const b = out[chave(gpB.id, dia.iso)];
      expect(a === "Folga" && b === "Folga").toBe(false);
      expect([a, b].filter((v) => v === "MRN").length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("gerarCelulasSugestaoCustomerService — continuidade 4x2", () => {
  const rowId = "gp-continuidade";
  const linha = {
    id: rowId,
    escalaCadastro: "4x2",
    siglaTurnoStaff: "NGT",
    turnoStaffNome: "Noite",
    liveNoEstudioIso: null,
  };

  it("ignora Compra, Venda e Troca ao inferir fase e mantém 4x2 de agosto para setembro", () => {
    const phase = 2;
    const agosto: Record<string, string> = {};
    preencherAgosto4x2(agosto, rowId, phase, 22, 31);
    agosto[chave(rowId, "2026-08-29")] = "Venda";

    const setembro = diasMes("2026-09", 6);
    const out = gerarCelulasSugestaoCustomerService([linha], setembro, {
      celulasMesAnterior: agosto,
    });

    for (let d = 1; d <= 6; d++) {
      const dd = String(d).padStart(2, "0");
      const iso = `2026-09-${dd}`;
      expect(out[chave(rowId, iso)]).toBe(pred4x2Ngt(dayOffsetUtc2000(iso), phase));
    }
  });

  it("continua o ciclo mesmo quando o último dia do mês anterior é Venda (fora da escala)", () => {
    const phase = 1;
    const agosto: Record<string, string> = {};
    preencherAgosto4x2(agosto, rowId, phase, 28, 31);
    agosto[chave(rowId, "2026-08-31")] = "Venda";

    const setembro = diasMes("2026-09", 3);
    const out = gerarCelulasSugestaoCustomerService([linha], setembro, {
      celulasMesAnterior: agosto,
    });

    /** Último dia operacional = 30/08 — setembro segue a mesma fase φ. */
    expect(out[chave(rowId, "2026-09-01")]).toBe(pred4x2Ngt(dayOffsetUtc2000("2026-09-01"), phase));
    expect(out[chave(rowId, "2026-09-02")]).toBe(pred4x2Ngt(dayOffsetUtc2000("2026-09-02"), phase));
  });

  it("mantém fase individual mesmo se a ordem da lista mudar entre meses", () => {
    const outroId = "gp-outro";
    const linhaOutra = {
      id: outroId,
      escalaCadastro: "4x2",
      siglaTurnoStaff: "NGT",
      turnoStaffNome: "Noite",
      liveNoEstudioIso: null,
    };

    const agosto: Record<string, string> = {
      [chave(rowId, "2026-08-30")]: "NGT",
      [chave(rowId, "2026-08-31")]: "NGT",
      [chave(outroId, "2026-08-30")]: "Folga",
      [chave(outroId, "2026-08-31")]: "Folga",
    };

    const setembro = diasMes("2026-09", 2);

    const ordemA = gerarCelulasSugestaoCustomerService([linha, linhaOutra], setembro, {
      celulasMesAnterior: agosto,
    });
    const ordemB = gerarCelulasSugestaoCustomerService([linhaOutra, linha], setembro, {
      celulasMesAnterior: agosto,
    });

    expect(ordemA[chave(rowId, "2026-09-01")]).toBe(ordemB[chave(rowId, "2026-09-01")]);
    expect(ordemA[chave(outroId, "2026-09-01")]).toBe(ordemB[chave(outroId, "2026-09-01")]);
  });

  it("ignora Compra - Turno e Troca na continuidade", () => {
    const phase = 4;
    const agosto: Record<string, string> = {};
    preencherAgosto4x2(agosto, rowId, phase, 25, 31);
    agosto[chave(rowId, "2026-08-28")] = "Compra - Noite";
    agosto[chave(rowId, "2026-08-29")] = "Troca";

    const setembro = diasMes("2026-09", 4);
    const out = gerarCelulasSugestaoCustomerService([linha], setembro, {
      celulasMesAnterior: agosto,
    });

    for (let d = 1; d <= 4; d++) {
      const dd = String(d).padStart(2, "0");
      expect(out[chave(rowId, `2026-09-${dd}`)]).toBe(pred4x2Ngt(dayOffsetUtc2000(`2026-09-${dd}`), phase));
    }
  });
});
