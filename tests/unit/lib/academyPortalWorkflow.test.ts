import { describe, expect, it } from "vitest";
import { podeEditarPostagemAcademyGerenciamento } from "../../../src/lib/academyPortalWorkflow";

describe("academyPortalWorkflow — gerenciamento", () => {
  it("editar respeita permissão sim e próprios", () => {
    expect(podeEditarPostagemAcademyGerenciamento("sim", true, "u1", "u2")).toBe(true);
    expect(podeEditarPostagemAcademyGerenciamento("proprios", true, "u1", "u1")).toBe(true);
    expect(podeEditarPostagemAcademyGerenciamento("proprios", true, "u1", "u2")).toBe(false);
    expect(podeEditarPostagemAcademyGerenciamento("sim", false, "u1", "u1")).toBe(false);
    expect(podeEditarPostagemAcademyGerenciamento("nao", true, "u1", "u1")).toBe(false);
  });
});
