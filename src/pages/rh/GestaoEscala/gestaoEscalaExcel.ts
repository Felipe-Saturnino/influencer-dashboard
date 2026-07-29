/**
 * Montagem do XLSX de download da escala (Escala Estúdio / Escala Escritório).
 * Aba 1 «Consolidado»: um bloco por turno (Manhã, Tarde, Noite) com estúdio × dias.
 * Aba 2 «Detalhado»: Nome, Nickname, Turno, Estúdio e o status de cada dia.
 */

import type { XlsxAba, XlsxCelula } from "../../../lib/xlsxWriter";

export type EscalaExcelDia = {
  dia: number;
  dowShort: string;
  iso: string;
};

export type EscalaExcelLinhaConsolidado = {
  label: string;
  counts: number[];
};

export type EscalaExcelBlocoTurno = {
  /** Título do bloco na planilha (ex.: «Turno da Manhã»). */
  titulo: string;
  linhas: EscalaExcelLinhaConsolidado[];
  total: number[];
};

export type EscalaExcelLinhaDetalhe = {
  nome: string;
  nickname: string;
  turno: string;
  estudio: string;
  /** Status por dia, na mesma ordem de `dias` (vazio = sem escala no dia). */
  valoresPorDia: string[];
};

export const ABA_EXCEL_CONSOLIDADO = "Consolidado";
export const ABA_EXCEL_DETALHADO = "Detalhado";

/** Cabeçalho de coluna de dia: «1 qua». */
export function labelColunaDiaExcel(dia: EscalaExcelDia): string {
  const dow = dia.dowShort.trim();
  return dow ? `${dia.dia} ${dow}` : String(dia.dia);
}

function celulaContagem(n: number | undefined): XlsxCelula {
  const valor = n ?? 0;
  return valor === 0 ? "" : valor;
}

export function buildAbaConsolidadoEscalaExcel(
  dias: EscalaExcelDia[],
  blocos: EscalaExcelBlocoTurno[],
): XlsxAba {
  const cabecalhoDias = dias.map((d) => ({ v: labelColunaDiaExcel(d), bold: true }));
  const linhas: XlsxCelula[][] = [];

  blocos.forEach((bloco, idx) => {
    if (idx > 0) linhas.push([]);
    linhas.push([{ v: bloco.titulo, bold: true }]);
    linhas.push([{ v: "Estúdio", bold: true }, ...cabecalhoDias]);
    for (const linha of bloco.linhas) {
      linhas.push([linha.label, ...dias.map((_, i) => celulaContagem(linha.counts[i]))]);
    }
    linhas.push([
      { v: "Total", bold: true },
      ...dias.map((_, i) => ({ v: bloco.total[i] ?? 0, bold: true })),
    ]);
  });

  return {
    nome: ABA_EXCEL_CONSOLIDADO,
    linhas,
    largurasColunas: [24, ...dias.map(() => 7)],
    congelar: { colunas: 1 },
  };
}

export function buildAbaDetalhadoEscalaExcel(
  dias: EscalaExcelDia[],
  linhasDetalhe: EscalaExcelLinhaDetalhe[],
): XlsxAba {
  const linhas: XlsxCelula[][] = [
    [
      { v: "Nome", bold: true },
      { v: "Nickname", bold: true },
      { v: "Turno", bold: true },
      { v: "Estúdio", bold: true },
      ...dias.map((d) => ({ v: labelColunaDiaExcel(d), bold: true })),
    ],
  ];

  for (const row of linhasDetalhe) {
    linhas.push([
      row.nome,
      row.nickname,
      row.turno,
      row.estudio,
      ...dias.map((_, i) => row.valoresPorDia[i] ?? ""),
    ]);
  }

  return {
    nome: ABA_EXCEL_DETALHADO,
    linhas,
    largurasColunas: [30, 20, 12, 24, ...dias.map(() => 10)],
    congelar: { linhas: 1, colunas: 4 },
  };
}

function slugArquivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ex.: `escala-estudio-game-presenter-2026-07.xlsx`. */
export function nomeArquivoEscalaExcel(
  tituloPagina: string,
  labelArea: string,
  ano: number,
  mes0: number,
): string {
  const partes = [slugArquivo(tituloPagina), slugArquivo(labelArea)].filter((p) => p !== "");
  const competencia = `${ano}-${String(mes0 + 1).padStart(2, "0")}`;
  return `${partes.join("-")}-${competencia}.xlsx`;
}
