import { describe, expect, it } from "vitest";
import { buildEstudiosSlugsParaOperadoras } from "../../../src/pages/rh/GestaoStaff/gestaoStaffEstudioHelpers";
import {
  dealerNoEscopoEstudio,
  dealerRowPassaFiltroEstudio,
} from "../../../src/pages/estudio/GestaoDealers/gestaoDealersEstudioHelpers";

describe("buildEstudiosSlugsParaOperadoras", () => {
  const junction = [
    { operadora_slug: "blaze", estudio_slug: "blaze_dedicado", tipo: "dedicado" },
    { operadora_slug: "blaze", estudio_slug: "sports_club", tipo: "network" },
    { operadora_slug: "cda", estudio_slug: "cda_dedicado", tipo: "dedicado" },
  ];

  it("retorna dedicado e network da operadora", () => {
    expect(buildEstudiosSlugsParaOperadoras(junction, ["blaze"])).toEqual([
      "blaze_dedicado",
      "sports_club",
    ]);
  });

  it("não inclui estúdios de outras operadoras", () => {
    expect(buildEstudiosSlugsParaOperadoras(junction, ["blaze"])).not.toContain("cda_dedicado");
  });
});

describe("dealerNoEscopoEstudio / dealerRowPassaFiltroEstudio", () => {
  const opMap = { blaze: "blaze_dedicado", cda: "cda_dedicado" };
  const permitidos = ["blaze_dedicado", "sports_club"];

  it("aceita dealer do estúdio network do escopo", () => {
    expect(
      dealerNoEscopoEstudio({ estudio_slug: "sports_club", operadora_slug: "blaze" }, permitidos, opMap),
    ).toBe(true);
  });

  it("rejeita dealer de outro estúdio mesmo com operadora no escopo", () => {
    expect(
      dealerNoEscopoEstudio({ estudio_slug: "cda_dedicado", operadora_slug: "blaze" }, permitidos, opMap),
    ).toBe(false);
  });

  it("em Todos, só passa dealers dos estúdios permitidos", () => {
    expect(
      dealerRowPassaFiltroEstudio(
        { estudio_slug: "cda_dedicado", operadora_slug: "cda" },
        "todos",
        opMap,
        permitidos,
      ),
    ).toBe(false);
    expect(
      dealerRowPassaFiltroEstudio(
        { estudio_slug: "sports_club", operadora_slug: "blaze" },
        "todos",
        opMap,
        permitidos,
      ),
    ).toBe(true);
  });
});
