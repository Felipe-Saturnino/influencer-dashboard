import { describe, expect, it } from "vitest";
import {
  acaoEnvioPermitida,
  aprovadoresPermitidosInformativo,
  perfisRequeremFluxoAprovacao,
  podeEditarInformativoGerenciamento,
  podeExcluirInformativoGerenciamento,
  podePublicarDiretoInformativo,
  podeUsuarioAprovarInformativo,
  rolePodeAprovarInformativo,
} from "../../../src/lib/informativosWorkflow";

describe("informativosWorkflow — aprovação", () => {
  it("destinos de aquisição / investidor / gestores exigem fluxo de aprovação", () => {
    expect(perfisRequeremFluxoAprovacao(["influencer"])).toBe(true);
    expect(perfisRequeremFluxoAprovacao(["investidor"])).toBe(true);
    expect(perfisRequeremFluxoAprovacao(["gestor_operacoes"])).toBe(true);
    expect(perfisRequeremFluxoAprovacao(["gestor_operacoes", "rh"])).toBe(true);
  });

  it("perfis internos operacionais (sem gestores) permitem publicação direta", () => {
    expect(perfisRequeremFluxoAprovacao(["rh", "figurino"])).toBe(false);
    expect(podePublicarDiretoInformativo(["prestador"])).toBe(true);
  });

  it("ação publicar vs aprovação conforme perfis", () => {
    expect(acaoEnvioPermitida("publicar", ["figurino"])).toBe(true);
    expect(acaoEnvioPermitida("aprovacao", ["figurino"])).toBe(false);
    expect(acaoEnvioPermitida("aprovacao", ["operador"])).toBe(true);
    expect(acaoEnvioPermitida("publicar", ["operador"])).toBe(false);
    expect(acaoEnvioPermitida("aprovacao", ["gestor_rh"])).toBe(true);
  });

  it("Investidor / Operador — Admin ou Executivo", () => {
    expect(aprovadoresPermitidosInformativo(["operador"])).toEqual(["admin", "executivo"]);
    expect(rolePodeAprovarInformativo("admin", ["investidor"])).toBe(true);
    expect(rolePodeAprovarInformativo("executivo", ["operador"])).toBe(true);
    expect(rolePodeAprovarInformativo("gestor_aquisicao", ["operador"])).toBe(false);
    expect(rolePodeAprovarInformativo("gestor_rh", ["investidor"])).toBe(false);
  });

  it("Agência / Influenciador / Afiliado — Admin, Executivo ou Gestor de Aquisição", () => {
    expect(rolePodeAprovarInformativo("gestor_aquisicao", ["influencer"])).toBe(true);
    expect(rolePodeAprovarInformativo("gestor_operacoes", ["influencer"])).toBe(false);
    expect(rolePodeAprovarInformativo("gestor_rh", ["afiliado"])).toBe(false);
    expect(rolePodeAprovarInformativo("admin", ["agencia"])).toBe(true);
    expect(rolePodeAprovarInformativo("executivo", ["agencia"])).toBe(true);
  });

  it("Gestores de departamento — Admin, Executivo ou Gestor de RH", () => {
    expect(rolePodeAprovarInformativo("gestor_rh", ["gestor_marketing"])).toBe(true);
    expect(rolePodeAprovarInformativo("gestor_aquisicao", ["gestor_operacoes"])).toBe(false);
    expect(rolePodeAprovarInformativo("admin", ["gestor_academy"])).toBe(true);
    expect(rolePodeAprovarInformativo("executivo", ["gestor_rh"])).toBe(true);
  });

  it("mistura de grupos — interseção (mais restritivo)", () => {
    expect(aprovadoresPermitidosInformativo(["influencer", "operador"])).toEqual(["admin", "executivo"]);
    expect(rolePodeAprovarInformativo("gestor_aquisicao", ["influencer", "operador"])).toBe(false);
    expect(rolePodeAprovarInformativo("admin", ["influencer", "operador"])).toBe(true);
    expect(aprovadoresPermitidosInformativo(["influencer", "gestor_marketing"])).toEqual([
      "admin",
      "executivo",
    ]);
    expect(rolePodeAprovarInformativo("gestor_aquisicao", ["influencer", "gestor_marketing"])).toBe(false);
    expect(rolePodeAprovarInformativo("gestor_rh", ["influencer", "gestor_marketing"])).toBe(false);
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
    expect(podeUsuarioAprovarInformativo("gestor_aquisicao", "user-b", "user-b", ["influencer"])).toBe(false);
    expect(podeUsuarioAprovarInformativo("gestor_aquisicao", "user-b", "user-c", ["influencer"])).toBe(true);
    expect(podeUsuarioAprovarInformativo("executivo", autor, autor, ["operador"])).toBe(false);
  });
});
