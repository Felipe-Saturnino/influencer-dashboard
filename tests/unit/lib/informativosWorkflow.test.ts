import { describe, expect, it } from "vitest";
import {
  acaoEnvioPermitida,
  perfisRequeremFluxoAprovacao,
  podeEditarInformativoGerenciamento,
  podeExcluirInformativoGerenciamento,
  podePublicarDiretoInformativo,
  podeUsuarioAprovarInformativo,
  rolePodeAprovarInformativo,
} from "../../../src/lib/informativosWorkflow";

describe("informativosWorkflow — aprovação", () => {
  it("perfis externos exigem fluxo de aprovação", () => {
    expect(perfisRequeremFluxoAprovacao(["influencer"])).toBe(true);
    expect(perfisRequeremFluxoAprovacao(["gestor", "influencer"])).toBe(true);
  });

  it("perfis internos operacionais permitem publicação direta", () => {
    expect(perfisRequeremFluxoAprovacao(["gestor", "rh"])).toBe(false);
    expect(podePublicarDiretoInformativo(["prestador"])).toBe(true);
  });

  it("ação publicar vs aprovação conforme perfis", () => {
    expect(acaoEnvioPermitida("publicar", ["figurino"])).toBe(true);
    expect(acaoEnvioPermitida("aprovacao", ["figurino"])).toBe(false);
    expect(acaoEnvioPermitida("aprovacao", ["operador"])).toBe(true);
    expect(acaoEnvioPermitida("publicar", ["operador"])).toBe(false);
  });

  it("aprovação admin/executivo/operador — só administrador", () => {
    expect(rolePodeAprovarInformativo("admin", ["executivo"])).toBe(true);
    expect(rolePodeAprovarInformativo("gestor", ["executivo"])).toBe(false);
    expect(rolePodeAprovarInformativo("executivo", ["operador"])).toBe(false);
  });

  it("aprovação agência/influencer/afiliado — admin, executivo ou gestor", () => {
    expect(rolePodeAprovarInformativo("gestor", ["influencer"])).toBe(true);
    expect(rolePodeAprovarInformativo("rh", ["afiliado"])).toBe(false);
    expect(rolePodeAprovarInformativo("admin", ["agencia"])).toBe(true);
  });

  it("mistura restrita — prevalece só admin", () => {
    expect(rolePodeAprovarInformativo("gestor", ["influencer", "operador"])).toBe(false);
    expect(rolePodeAprovarInformativo("admin", ["influencer", "operador"])).toBe(true);
  });

  it("editar e excluir no gerenciamento respeitam sim e próprios", () => {
    expect(podeEditarInformativoGerenciamento("sim", true, "u1", "u2")).toBe(true);
    expect(podeEditarInformativoGerenciamento("proprios", true, "u1", "u1")).toBe(true);
    expect(podeEditarInformativoGerenciamento("proprios", true, "u1", "u2")).toBe(false);
    expect(podeEditarInformativoGerenciamento("sim", false, "u1", "u1")).toBe(false);
    expect(podeExcluirInformativoGerenciamento("proprios", true, "u1", "u2")).toBe(false);
    expect(podeExcluirInformativoGerenciamento("nao", true, "u1", "u1")).toBe(false);
  });

  it("autoaprovação só para administrador", () => {
    const autor = "user-a";
    expect(podeUsuarioAprovarInformativo("admin", autor, autor, ["influencer"])).toBe(true);
    expect(podeUsuarioAprovarInformativo("gestor", "user-b", "user-b", ["influencer"])).toBe(false);
    expect(podeUsuarioAprovarInformativo("gestor", "user-b", "user-c", ["influencer"])).toBe(true);
  });
});
