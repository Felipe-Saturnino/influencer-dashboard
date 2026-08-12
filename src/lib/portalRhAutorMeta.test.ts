import { describe, expect, it } from "vitest";
import { timeNomeParaFuncionario } from "./portalRhAutorMeta";
import type { RhOrgPrestadorVinculoOpcao, RhOrgTimeOpcao } from "../types/rhOrganograma";

const vinculoTime: RhOrgPrestadorVinculoOpcao = {
  nivel: "time",
  diretoriaId: "dir-1",
  gerenciaId: "ger-1",
  timeId: "time-rh",
  diretoriaNome: "Studio Operations",
  gerenciaNome: "People",
  timeNome: "RH",
  label: "Studio Operations › People › RH",
  setorNome: "RH",
  gestorNome: "",
};

const opcoesTimes: RhOrgTimeOpcao[] = [
  {
    timeId: "time-rh",
    timeNome: "RH",
    gerenciaNome: "People",
    diretoriaNome: "Studio Operations",
    label: "RH",
    gestorNome: "",
  },
];

describe("timeNomeParaFuncionario", () => {
  it("prioriza o nome do time, não a diretoria pai", () => {
    const nome = timeNomeParaFuncionario(
      { org_time_id: "time-rh", org_gerencia_id: null, org_diretoria_id: null, setor: "RH" },
      [vinculoTime],
      opcoesTimes,
    );
    expect(nome).toBe("RH");
  });

  it("usa setor quando não há vínculo no organograma", () => {
    const nome = timeNomeParaFuncionario(
      { org_time_id: null, org_gerencia_id: null, org_diretoria_id: null, setor: "People Ops" },
      [],
      [],
    );
    expect(nome).toBe("People Ops");
  });
});
