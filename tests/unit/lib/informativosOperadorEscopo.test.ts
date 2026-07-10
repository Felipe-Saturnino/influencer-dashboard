import { describe, expect, it } from "vitest";
import {
  INFORMATIVO_OPERADOR_ESCOPO_TODOS,
  perfisIncluemOperador,
  validarOperadorEscopoInformativo,
} from "../../../src/lib/informativosOperadorEscopo";
import { validarPublicarInformativo, validarSalvarInformativo } from "../../../src/lib/informativosWorkflow";

describe("informativosOperadorEscopo", () => {
  it("detecta perfil operador na seleção", () => {
    expect(perfisIncluemOperador(["gestor_operacoes", "operador"])).toBe(true);
    expect(perfisIncluemOperador(["gestor_operacoes"])).toBe(false);
  });

  it("exige escopo quando operador está nos perfis", () => {
    expect(validarOperadorEscopoInformativo(["operador"], null)).toBeTruthy();
    expect(validarOperadorEscopoInformativo(["operador"], INFORMATIVO_OPERADOR_ESCOPO_TODOS)).toBeUndefined();
    expect(validarOperadorEscopoInformativo(["operador"], "blaze")).toBeUndefined();
    expect(validarOperadorEscopoInformativo(["gestor_operacoes"], null)).toBeUndefined();
  });

  it("integra com validação de publicar e rascunho", () => {
    expect(
      validarPublicarInformativo({
        assunto: "A",
        descricao: "<p>x</p>",
        perfis: ["operador"],
        operador_escopo: null,
      }).operador_escopo,
    ).toBeTruthy();
    expect(validarSalvarInformativo({ perfis: ["operador"], operador_escopo: "todos" })).toEqual({});
  });
});
