import { describe, expect, it } from "vitest";
import {
  buildAbaConsolidadoEscalaExcel,
  buildAbaDetalhadoEscalaExcel,
  labelColunaDiaExcel,
  nomeArquivoEscalaExcel,
} from "@/pages/rh/GestaoEscala/gestaoEscalaExcel";

const dias = [
  { dia: 1, dowShort: "qua", iso: "2026-07-01" },
  { dia: 2, dowShort: "qui", iso: "2026-07-02" },
];

describe("labelColunaDiaExcel", () => {
  it("junta dia e dia da semana", () => {
    expect(labelColunaDiaExcel(dias[0]!)).toBe("1 qua");
  });
});

describe("buildAbaConsolidadoEscalaExcel", () => {
  const aba = buildAbaConsolidadoEscalaExcel(dias, [
    {
      titulo: "Turno da Manhã",
      linhas: [
        { label: "BLAZE", counts: [2, 3] },
        { label: "CDA", counts: [1, 0] },
      ],
      total: [3, 3],
    },
    { titulo: "Turno da Tarde", linhas: [], total: [0, 0] },
  ]);

  it("usa o nome de aba Consolidado", () => {
    expect(aba.nome).toBe("Consolidado");
  });

  it("monta título, cabeçalho de estúdio + dias, linhas e total por bloco", () => {
    expect(aba.linhas[0]).toEqual([{ v: "Turno da Manhã", bold: true }]);
    expect(aba.linhas[1]).toEqual([
      { v: "Estúdio", bold: true },
      { v: "1 qua", bold: true },
      { v: "2 qui", bold: true },
    ]);
    expect(aba.linhas[2]).toEqual(["BLAZE", 2, 3]);
    // Zero fica vazio na planilha.
    expect(aba.linhas[3]).toEqual(["CDA", 1, ""]);
    expect(aba.linhas[4]).toEqual([
      { v: "Total", bold: true },
      { v: 3, bold: true },
      { v: 3, bold: true },
    ]);
  });

  it("separa blocos de turno com linha vazia", () => {
    expect(aba.linhas[5]).toEqual([]);
    expect(aba.linhas[6]).toEqual([{ v: "Turno da Tarde", bold: true }]);
  });
});

describe("buildAbaDetalhadoEscalaExcel", () => {
  const aba = buildAbaDetalhadoEscalaExcel(dias, [
    {
      nome: "Ana Souza",
      nickname: "ana",
      turno: "Manhã",
      estudio: "BLAZE",
      valoresPorDia: ["Manhã", ""],
    },
  ]);

  it("usa cabeçalho Nome, Nickname, Turno, Estúdio e dias", () => {
    expect(aba.nome).toBe("Detalhado");
    expect(aba.linhas[0]).toEqual([
      { v: "Nome", bold: true },
      { v: "Nickname", bold: true },
      { v: "Turno", bold: true },
      { v: "Estúdio", bold: true },
      { v: "1 qua", bold: true },
      { v: "2 qui", bold: true },
    ]);
  });

  it("escreve uma linha por prestador", () => {
    expect(aba.linhas[1]).toEqual(["Ana Souza", "ana", "Manhã", "BLAZE", "Manhã", ""]);
  });
});

describe("nomeArquivoEscalaExcel", () => {
  it("gera slug com competência", () => {
    expect(nomeArquivoEscalaExcel("Escala Estúdio", "Game Presenter", 2026, 6)).toBe(
      "escala-estudio-game-presenter-2026-07.xlsx",
    );
  });
});
