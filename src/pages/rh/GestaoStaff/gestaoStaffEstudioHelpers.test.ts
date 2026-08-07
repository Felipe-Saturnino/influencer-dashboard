import { describe, expect, it } from "vitest";
import { buildEstudiosSlugsParaOperadoras } from "./gestaoStaffEstudioHelpers";

describe("buildEstudiosSlugsParaOperadoras", () => {
  const junction = [
    { operadora_slug: "blaze", estudio_slug: "blaze" },
    { operadora_slug: "blaze", estudio_slug: "sports_club" },
    { operadora_slug: "esportiva_bet", estudio_slug: "sports_club" },
    { operadora_slug: "casa_apostas", estudio_slug: "casa_apostas" },
  ];

  it("operador Blaze vê estúdio dedicado e network (Sports Club)", () => {
    expect(buildEstudiosSlugsParaOperadoras(junction, ["blaze"])).toEqual(["blaze", "sports_club"]);
  });

  it("operador só com Casa vê o estúdio dedicado", () => {
    expect(buildEstudiosSlugsParaOperadoras(junction, ["casa_apostas"])).toEqual(["casa_apostas"]);
  });

  it("escopo vazio não libera estúdios", () => {
    expect(buildEstudiosSlugsParaOperadoras(junction, [])).toEqual([]);
  });
});
