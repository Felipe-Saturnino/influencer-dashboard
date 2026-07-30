import { describe, expect, it } from "vitest";
import {
  celulaConsolidadoContaComoSigla,
  contarCelulasComSigla,
  contarCelulasComSiglaPorEstudio,
  opcoesSelectCelulaGerar,
  type DiaMes,
  type LinhaColaborador,
  type RpcPrestadorEscala,
} from "../../../src/pages/rh/GestaoEscala/gestaoEscalaHelpers";
import { opcoesSelectCelulaAlterarEscala } from "../../../src/lib/gestaoEscalaTurnoMes";

describe("opções manuais da Escala Estúdio", () => {
  it("não oferece Compra nem Venda ao construir nova escala", () => {
    const opcoes = opcoesSelectCelulaGerar(
      { siglaTurnoStaff: "MRN", turnoStaffNome: "Manhã" },
      "estudio",
      "game_presenter",
    );
    expect(opcoes.map((o) => o.value)).not.toContain("Compra");
    expect(opcoes.map((o) => o.value)).not.toContain("Venda");
  });

  it("não oferece Compra nem Venda no modal Alterar Escala", () => {
    const opcoes = opcoesSelectCelulaAlterarEscala("estudio", "game_presenter");
    expect(opcoes.map((o) => o.value)).not.toContain("Compra");
    expect(opcoes.map((o) => o.value)).not.toContain("Venda");
  });
});

describe("celulaConsolidadoContaComoSigla", () => {
  it("conta sigla original e Compra - Turno no mesmo turno", () => {
    expect(celulaConsolidadoContaComoSigla("MRN", "MRN")).toBe(true);
    expect(celulaConsolidadoContaComoSigla("Compra - Manhã", "MRN")).toBe(true);
    expect(celulaConsolidadoContaComoSigla("Compra - Tarde", "AFT")).toBe(true);
    expect(celulaConsolidadoContaComoSigla("Compra - Noite", "NGT")).toBe(true);
    expect(celulaConsolidadoContaComoSigla("Compra - Comercial", "Comercial")).toBe(true);
  });

  it("não mistura turnos nem trata Venda como escalado", () => {
    expect(celulaConsolidadoContaComoSigla("Compra - Tarde", "MRN")).toBe(false);
    expect(celulaConsolidadoContaComoSigla("Venda", "MRN")).toBe(false);
    expect(celulaConsolidadoContaComoSigla("Venda", "Folga")).toBe(true);
    expect(celulaConsolidadoContaComoSigla("Folga", "Folga")).toBe(true);
  });
});

describe("contarCelulasComSigla", () => {
  const dias: DiaMes[] = [
    {
      dia: 1,
      dowShort: "seg",
      isWeekend: false,
      isFeriadoSP: false,
      feriadoNome: null,
      iso: "2026-08-01",
    },
  ];
  const linhas = [{ id: "a" }, { id: "b" }] as LinhaColaborador[];

  it("soma Compra - Turno no consolidado do turno", () => {
    const celulas = {
      "a|2026-08-01": "MRN",
      "b|2026-08-01": "Compra - Manhã",
    };
    expect(contarCelulasComSigla(linhas, dias, celulas, "MRN")).toEqual([2]);
  });
});

describe("contarCelulasComSiglaPorEstudio", () => {
  const dias: DiaMes[] = [
    {
      dia: 1,
      dowShort: "seg",
      isWeekend: false,
      isFeriadoSP: false,
      feriadoNome: null,
      iso: "2026-08-01",
    },
  ];

  it("inclui Compra - Turno no bucket do estúdio do comprador", () => {
    const prestadores = [
      {
        id: "p1",
        staff_estudio_slug: "blaze",
        staff_estudio_slugs: ["blaze"],
        staff_operadora_slug: "blaze",
      },
    ] as RpcPrestadorEscala[];
    const rows = contarCelulasComSiglaPorEstudio(
      prestadores,
      dias,
      { "p1|2026-08-01": "Compra - Noite" },
      "NGT",
      {},
      { blaze: "Blaze" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("blaze");
    expect(rows[0]!.counts).toEqual([1]);
  });
});
