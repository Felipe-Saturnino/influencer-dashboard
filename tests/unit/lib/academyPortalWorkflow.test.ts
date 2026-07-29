import { describe, expect, it } from "vitest";
import {
  podeAprovarPostagemAcademyGerenciamento,
  podeArquivarPostagemAcademyGerenciamento,
  podeEditarPostagemAcademyGerenciamento,
  proximaVersaoMajorManual,
  statusEnvioPostagemAcademy,
  tiposPostagemAcademyPermitidos,
} from "../../../src/lib/academyPortalWorkflow";

describe("academyPortalWorkflow — gerenciamento", () => {
  it("editar respeita permissão sim e próprios", () => {
    expect(podeEditarPostagemAcademyGerenciamento("sim", true, "u1", "u2")).toBe(true);
    expect(podeEditarPostagemAcademyGerenciamento("proprios", true, "u1", "u1")).toBe(true);
    expect(podeEditarPostagemAcademyGerenciamento("proprios", true, "u1", "u2")).toBe(false);
    expect(podeEditarPostagemAcademyGerenciamento("sim", false, "u1", "u1")).toBe(false);
    expect(podeEditarPostagemAcademyGerenciamento("nao", true, "u1", "u1")).toBe(false);
  });

  it("arquivar segue a mesma regra de autor que editar", () => {
    expect(podeArquivarPostagemAcademyGerenciamento("proprios", true, "u1", "u1")).toBe(true);
    expect(podeArquivarPostagemAcademyGerenciamento("proprios", true, "u1", "u2")).toBe(false);
    expect(podeArquivarPostagemAcademyGerenciamento("sim", true, "u1", "u2")).toBe(true);
  });

  it("aprovar só com Editar = Sim", () => {
    expect(podeAprovarPostagemAcademyGerenciamento("sim")).toBe(true);
    expect(podeAprovarPostagemAcademyGerenciamento("proprios")).toBe(false);
    expect(podeAprovarPostagemAcademyGerenciamento("nao")).toBe(false);
  });

  it("próprios só criam Comunicados e Dicas; envio vai para aprovação", () => {
    expect(tiposPostagemAcademyPermitidos("proprios")).toEqual(["comunicado", "dica"]);
    expect(tiposPostagemAcademyPermitidos("sim")).toEqual(["comunicado", "dica", "manual"]);
    expect(statusEnvioPostagemAcademy("proprios")).toBe("aprovacao");
    expect(statusEnvioPostagemAcademy("sim")).toBe("publicado");
  });

  it("próxima versão major de Manual ao editar", () => {
    expect(proximaVersaoMajorManual("1.0")).toBe("2.0");
    expect(proximaVersaoMajorManual("1,0")).toBe("2.0");
    expect(proximaVersaoMajorManual("2.5")).toBe("3.0");
    expect(proximaVersaoMajorManual("v3")).toBe("4.0");
    expect(proximaVersaoMajorManual("")).toBe("1.0");
    expect(proximaVersaoMajorManual(null)).toBe("1.0");
  });
});
