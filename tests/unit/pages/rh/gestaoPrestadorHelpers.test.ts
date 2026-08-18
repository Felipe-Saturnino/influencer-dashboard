import { describe, expect, it } from "vitest";
import { mensagemErroPrestadorSalvar } from "../../../../src/lib/rhPrestadorSalvar";
import { mensagemErroSupabaseRhFuncionarioSalvar, PRESTADOR_LISTA_SELECT } from "../../../../src/pages/rh/GestaoPrestador/gestaoPrestadorHelpers";

describe("mensagemErroPrestadorSalvar", () => {
  it("mapeia conflito e CPF sem texto técnico", () => {
    expect(mensagemErroPrestadorSalvar("conflito")).toContain("outra pessoa");
    expect(mensagemErroPrestadorSalvar("cpf_duplicado")).toContain("prestador");
    expect(mensagemErroPrestadorSalvar("cpf_invalido")).toBe("CPF Inválido");
    expect(mensagemErroPrestadorSalvar("desconhecido")).toContain("entre em contato com o suporte");
  });
});

describe("PRESTADOR_LISTA_SELECT", () => {
  it("não inclui fotos nem skills de dealer", () => {
    expect(PRESTADOR_LISTA_SELECT).not.toContain("staff_dealer_fotos");
    expect(PRESTADOR_LISTA_SELECT).not.toContain("staff_skills");
    expect(PRESTADOR_LISTA_SELECT).toContain("updated_at");
    expect(PRESTADOR_LISTA_SELECT).toContain("cpf");
  });
});

describe("mensagemErroSupabaseRhFuncionarioSalvar", () => {
  it("não devolve message crua do Postgres", () => {
    const msg = mensagemErroSupabaseRhFuncionarioSalvar({
      code: "42501",
      message: "permission denied for table rh_funcionarios",
    });
    expect(msg).not.toContain("permission denied");
    expect(msg).toContain("entre em contato com o suporte");
  });

  it("mapeia duplicidade de CPF para copy de prestador", () => {
    expect(
      mensagemErroSupabaseRhFuncionarioSalvar({
        code: "23505",
        message: "duplicate key value violates unique constraint rh_funcionarios_cpf_unique",
      }),
    ).toBe("Já existe um prestador cadastrado com este CPF.");
  });
});
