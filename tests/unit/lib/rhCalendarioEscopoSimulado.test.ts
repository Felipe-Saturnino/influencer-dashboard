import { describe, expect, it } from "vitest";
import { aplicarEscopoCalendarioSimulado } from "../../../src/lib/rhCalendarioEscopoSimulado";
import type { RhFuncionario } from "../../../src/types/rhFuncionario";
import type { StaffTimeRow } from "../../../src/lib/rhCalendarioStaffFiltroHelpers";

function funcionario(id: string, timeId: string | null): RhFuncionario {
  return { id, nome: id, org_time_id: timeId } as RhFuncionario;
}

const times: StaffTimeRow[] = [
  { id: "t1", nome: "Time A", gerencia_id: "g1", gerencia_nome: "G1" },
  { id: "t2", nome: "Time B", gerencia_id: "g2", gerencia_nome: "G2" },
];

describe("aplicarEscopoCalendarioSimulado", () => {
  it("Ver Sim mantém a lista (escopo de gestão)", () => {
    const staff = [funcionario("a", "t1"), funcionario("b", "t2")];
    const out = aplicarEscopoCalendarioSimulado({
      canView: "sim",
      staff,
      times,
      meuIdSimulado: "a",
    });
    expect(out.staff).toHaveLength(2);
    expect(out.times).toHaveLength(2);
    expect(out.meuId).toBe("a");
  });

  it("Ver Próprios recorta ao funcionário simulado e ao time dele", () => {
    const staff = [funcionario("a", "t1"), funcionario("b", "t2")];
    const out = aplicarEscopoCalendarioSimulado({
      canView: "proprios",
      staff,
      times,
      meuIdSimulado: "b",
    });
    expect(out.staff.map((p) => p.id)).toEqual(["b"]);
    expect(out.times.map((t) => t.id)).toEqual(["t2"]);
    expect(out.meuId).toBe("b");
  });

  it("Ver Próprios sem cadastro RH zera a lista", () => {
    const out = aplicarEscopoCalendarioSimulado({
      canView: "proprios",
      staff: [funcionario("a", "t1")],
      times,
      meuIdSimulado: null,
    });
    expect(out.staff).toEqual([]);
    expect(out.times).toEqual([]);
    expect(out.meuId).toBeNull();
  });

  it("Ver Próprios injeta o cadastro simulado se a RPC não o devolveu", () => {
    const sim = funcionario("h", "t1");
    const out = aplicarEscopoCalendarioSimulado({
      canView: "proprios",
      staff: [funcionario("a", "t2")],
      times,
      meuIdSimulado: "h",
      funcionarioSimulado: sim,
    });
    expect(out.staff).toEqual([sim]);
    expect(out.times.map((t) => t.id)).toEqual(["t1"]);
  });
});
