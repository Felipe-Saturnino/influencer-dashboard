import { describe, expect, it } from "vitest";
import {
  acoesAbaAvaliacoesPerformanceHub,
  avaliacaoPertenceAoEscopoProprios,
  avaliacaoVisivelAbaAvaliacoes,
  avaliacaoVisivelGerenciamentoAnalisar,
  isEscopoPropriosPerformanceHub,
  statusAposConcluirModal,
  statusContaComoRealizadaPerformanceHub,
  statusInicialNovaAvaliacao,
} from "../../../src/lib/academyPerformanceHubWorkflow";
import type { PerformanceHubAvaliacao } from "../../../src/lib/academyPerformanceHubTypes";

function row(partial: Partial<PerformanceHubAvaliacao>): PerformanceHubAvaliacao {
  return {
    id: "1",
    data: "20/08/2026",
    time: "game_presenter",
    avaliadoNome: "Ana",
    avaliadorNome: "Coach",
    status: "rascunho",
    notaTotal: null,
    notaImagem: null,
    notaComunicacao: null,
    notaMesa: null,
    notaProcedimentos: null,
    ...partial,
  };
}

describe("academyPerformanceHubWorkflow — aprovação", () => {
  it("publica como Aguardando e inicia em Rascunho", () => {
    expect(statusInicialNovaAvaliacao("game_presenter")).toBe("rascunho");
    expect(statusInicialNovaAvaliacao("shuffler")).toBe("rascunho");
    expect(statusAposConcluirModal("game_presenter")).toBe("aguardando");
    expect(statusAposConcluirModal("shuffler")).toBe("aguardando");
  });

  it("aba Avaliações só mostra status publicados", () => {
    expect(avaliacaoVisivelAbaAvaliacoes(row({ status: "rascunho" }))).toBe(false);
    expect(avaliacaoVisivelAbaAvaliacoes(row({ status: "aguardando" }))).toBe(true);
    expect(avaliacaoVisivelAbaAvaliacoes(row({ status: "feedback" }))).toBe(true);
    expect(avaliacaoVisivelAbaAvaliacoes(row({ status: "aprovado" }))).toBe(true);
    expect(avaliacaoVisivelAbaAvaliacoes(row({ status: "concluida" }))).toBe(true);
  });

  it("KPI MTD / realizadas só contam Aprovado (e legado concluida)", () => {
    expect(statusContaComoRealizadaPerformanceHub("aguardando")).toBe(false);
    expect(statusContaComoRealizadaPerformanceHub("feedback")).toBe(false);
    expect(statusContaComoRealizadaPerformanceHub("aprovado")).toBe(true);
    expect(statusContaComoRealizadaPerformanceHub("concluida")).toBe(true);
    expect(statusContaComoRealizadaPerformanceHub("rascunho")).toBe(false);
  });

  it("escopo Próprios casa por staff id ou nome", () => {
    expect(isEscopoPropriosPerformanceHub("proprios", false)).toBe(true);
    expect(isEscopoPropriosPerformanceHub("proprios", true)).toBe(false);
    expect(isEscopoPropriosPerformanceHub("sim", false)).toBe(false);
    const escopo = { staffIds: new Set(["abc"]), nomes: ["Gabriel Batista Duarte Da Costa"] };
    expect(
      avaliacaoPertenceAoEscopoProprios({ avaliadoStaffId: "abc", avaliadoNome: "Outro" }, escopo),
    ).toBe(true);
    expect(
      avaliacaoPertenceAoEscopoProprios(
        { avaliadoNome: "gabriel batista duarte da costa" },
        escopo,
      ),
    ).toBe(true);
    expect(avaliacaoPertenceAoEscopoProprios({ avaliadoNome: "Outra Pessoa" }, escopo)).toBe(false);
  });

  it("Gerenciamento lista só rascunhos", () => {
    expect(avaliacaoVisivelGerenciamentoAnalisar(row({ status: "rascunho" }), "game_presenter")).toBe(true);
    expect(avaliacaoVisivelGerenciamentoAnalisar(row({ status: "em_analise" }), "game_presenter")).toBe(false);
    expect(avaliacaoVisivelGerenciamentoAnalisar(row({ status: "pendente" }), "game_presenter")).toBe(false);
    expect(avaliacaoVisivelGerenciamentoAnalisar(row({ status: "aguardando" }), "game_presenter")).toBe(false);
    expect(avaliacaoVisivelGerenciamentoAnalisar(row({ status: "feedback" }), "game_presenter")).toBe(false);
  });

  it("ações Ver=Próprios", () => {
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "proprios", canEditarOk: false, status: "aguardando" }),
    ).toEqual(["analisar"]);
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "proprios", canEditarOk: false, status: "feedback" }),
    ).toEqual(["ver", "historico"]);
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "proprios", canEditarOk: false, status: "aprovado" }),
    ).toEqual(["ver", "historico"]);
  });

  it("ações Editar=Sim", () => {
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "sim", canEditarOk: true, status: "aguardando" }),
    ).toEqual([]);
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "sim", canEditarOk: true, status: "feedback" }),
    ).toEqual(["historico", "ver", "aplicar_feedback"]);
    expect(
      acoesAbaAvaliacoesPerformanceHub({ canView: "sim", canEditarOk: true, status: "aprovado" }),
    ).toEqual(["ver", "historico"]);
  });
});
