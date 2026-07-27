import { describe, expect, it } from "vitest";
import {
  prestadorUsaHorarioComercialSintetico,
  valorCelulaHorarioComercialSintetico,
  mesclarGradeComHorarioComercialSintetico,
} from "../../../src/lib/overviewPrestadorCalendarioHelpers";

describe("valorCelulaHorarioComercialSintetico", () => {
  it("seg–sex útil → Comercial; fim de semana → Folga", () => {
    // 2026-07-06 = segunda
    expect(valorCelulaHorarioComercialSintetico("2026-07-06")).toBe("Comercial");
    // 2026-07-11 = sábado
    expect(valorCelulaHorarioComercialSintetico("2026-07-11")).toBe("Folga");
    // 2026-07-12 = domingo
    expect(valorCelulaHorarioComercialSintetico("2026-07-12")).toBe("Folga");
  });

  it("feriado nacional ou SP capital em dia útil → Folga", () => {
    // 2026-09-07 = Independência (segunda)
    expect(valorCelulaHorarioComercialSintetico("2026-09-07")).toBe("Folga");
    // 2026-01-25 = Aniversário de São Paulo (domingo — Folga de qualquer forma)
    expect(valorCelulaHorarioComercialSintetico("2026-01-25")).toBe("Folga");
    // 2026-11-20 = Consciência Negra (sexta)
    expect(valorCelulaHorarioComercialSintetico("2026-11-20")).toBe("Folga");
  });
});

describe("prestadorUsaHorarioComercialSintetico", () => {
  it("Escritório e Estúdio Comercial/5x2", () => {
    expect(prestadorUsaHorarioComercialSintetico({ area_atuacao: "escritorio", staff_turno: null, escala: "" })).toBe(
      true,
    );
    expect(
      prestadorUsaHorarioComercialSintetico({
        area_atuacao: "estudio",
        staff_turno: "Comercial",
        escala: "4x2",
      }),
    ).toBe(true);
    expect(
      prestadorUsaHorarioComercialSintetico({
        area_atuacao: "estudio",
        staff_turno: "Horário Comercial",
        escala: "5x2",
      }),
    ).toBe(true);
    expect(
      prestadorUsaHorarioComercialSintetico({
        area_atuacao: "estudio",
        staff_turno: "Manhã",
        escala: "4x2",
      }),
    ).toBe(false);
  });
});

describe("mesclarGradeComHorarioComercialSintetico", () => {
  it("gera mês completo para Escritório e Estúdio Comercial e preserva Compra", () => {
    const rows = mesclarGradeComHorarioComercialSintetico(
      [
        {
          funcionario_id: "est-1",
          dia_iso: "2026-07-08",
          valor: "Compra",
          area_key: "service_manager",
        },
        {
          funcionario_id: "op-1",
          dia_iso: "2026-07-06",
          valor: "MRN",
          area_key: "game_presenter",
        },
      ],
      [
        { id: "esc-1", area_atuacao: "escritorio", staff_turno: null, escala: "5x2" },
        { id: "est-1", area_atuacao: "estudio", staff_turno: "Comercial", escala: "5x2" },
        { id: "op-1", area_atuacao: "estudio", staff_turno: "Manhã", escala: "4x2" },
      ],
      ["2026-07-01"],
    );

    const esc = rows.filter((r) => r.funcionario_id === "esc-1");
    expect(esc).toHaveLength(31);
    expect(esc.find((r) => r.dia_iso === "2026-07-06")?.valor).toBe("Comercial");
    expect(esc.find((r) => r.dia_iso === "2026-07-11")?.valor).toBe("Folga");

    const est = rows.filter((r) => r.funcionario_id === "est-1");
    expect(est).toHaveLength(31);
    expect(est.find((r) => r.dia_iso === "2026-07-08")?.valor).toBe("Compra");
    expect(est.find((r) => r.dia_iso === "2026-07-06")?.valor).toBe("Comercial");

    expect(rows.some((r) => r.funcionario_id === "op-1" && r.valor === "MRN")).toBe(true);
  });
});
