import { describe, expect, it } from "vitest";
import { slugSkinOperadora, temaEscuroObrigatorio } from "./operadoraBrandApply";

describe("slugSkinOperadora", () => {
  it("operador usa a operadora do escopo", () => {
    expect(
      slugSkinOperadora({
        role: "operador",
        operadorasVisiveis: ["blaze"],
      }),
    ).toBe("blaze");
  });

  it("influencer sem skin permanece na identidade Spin", () => {
    expect(
      slugSkinOperadora({
        role: "influencer",
        operadorasVisiveis: ["blaze"],
        brandOperadoraSlug: null,
      }),
    ).toBeNull();
  });

  it("influencer usa a skin só quando a operadora ainda está atribuída", () => {
    expect(
      slugSkinOperadora({
        role: "influencer",
        operadorasVisiveis: ["blaze", "cda"],
        brandOperadoraSlug: "cda",
      }),
    ).toBe("cda");
    expect(
      slugSkinOperadora({
        role: "influencer",
        operadorasVisiveis: ["blaze"],
        brandOperadoraSlug: "cda",
      }),
    ).toBeNull();
  });

  it("trava o modo escuro no operador e no influencer com skin", () => {
    expect(temaEscuroObrigatorio("operador", null)).toBe(true);
    expect(temaEscuroObrigatorio("operador", "blaze")).toBe(true);
    expect(temaEscuroObrigatorio("influencer", "cda")).toBe(true);
    expect(temaEscuroObrigatorio("influencer", null)).toBe(false);
    expect(temaEscuroObrigatorio("afiliado", null)).toBe(false);
  });

  it("afiliado não herda skin de operadora", () => {
    expect(
      slugSkinOperadora({
        role: "afiliado",
        operadorasVisiveis: ["blaze"],
        brandOperadoraSlug: "blaze",
      }),
    ).toBeNull();
  });
});
