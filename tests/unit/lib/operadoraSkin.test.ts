import { describe, expect, it } from "vitest";
import { slugSkinOperadora } from "../../../src/lib/operadoraBrandApply";

describe("slugSkinOperadora", () => {
  it("uses the operadora scope for an influencer", () => {
    expect(slugSkinOperadora("influencer", ["casa_apostas"])).toBe("casa_apostas");
  });

  it("uses the operadora scope for an afiliado", () => {
    expect(slugSkinOperadora("afiliado", ["blaze"])).toBe("blaze");
  });

  it("keeps the operator skin", () => {
    expect(slugSkinOperadora("operador", ["casa_apostas"])).toBe("casa_apostas");
  });

  it("leaves other roles on the Spin palette", () => {
    expect(slugSkinOperadora("admin", ["casa_apostas"])).toBeNull();
    expect(slugSkinOperadora("influencer", [])).toBeNull();
    expect(slugSkinOperadora("influencer", undefined)).toBeNull();
  });
});
