import { describe, expect, it } from "vitest";
import { criarXlsxBytes, letraColunaXlsx, sanitizarNomeAbaXlsx } from "@/lib/xlsxWriter";
import { xlsxUnzippedToMatrix } from "@/lib/comercialSpaXlsx";

/** Lê as entradas de um ZIP gravado com método `store` (sem compressão). */
function lerZipStore(bytes: Uint8Array): Record<string, string> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("utf-8");
  const out: Record<string, string> = {};
  let pos = 0;
  while (pos + 30 <= bytes.length && dv.getUint32(pos, true) === 0x04034b50) {
    const metodo = dv.getUint16(pos + 8, true);
    expect(metodo).toBe(0);
    const tamanho = dv.getUint32(pos + 18, true);
    const tamNome = dv.getUint16(pos + 26, true);
    const tamExtra = dv.getUint16(pos + 28, true);
    const nome = decoder.decode(bytes.subarray(pos + 30, pos + 30 + tamNome));
    const inicio = pos + 30 + tamNome + tamExtra;
    out[nome] = decoder.decode(bytes.subarray(inicio, inicio + tamanho));
    pos = inicio + tamanho;
  }
  return out;
}

describe("letraColunaXlsx", () => {
  it("converte índice em letra de coluna", () => {
    expect(letraColunaXlsx(0)).toBe("A");
    expect(letraColunaXlsx(25)).toBe("Z");
    expect(letraColunaXlsx(26)).toBe("AA");
    expect(letraColunaXlsx(34)).toBe("AI");
  });
});

describe("sanitizarNomeAbaXlsx", () => {
  it("remove caracteres proibidos e limita a 31", () => {
    expect(sanitizarNomeAbaXlsx("Consolidado")).toBe("Consolidado");
    expect(sanitizarNomeAbaXlsx("A/B:C*D?E[F]")).toBe("A B C D E F");
    expect(sanitizarNomeAbaXlsx("x".repeat(40))).toHaveLength(31);
  });
});

describe("criarXlsxBytes", () => {
  const bytes = criarXlsxBytes(
    [
      {
        nome: "Consolidado",
        linhas: [[{ v: "Turno da Manhã", bold: true }], ["Estúdio", "1 qua"], ["BLAZE", 3]],
      },
      { nome: "Detalhado", linhas: [["Nome", "Nickname"], ["Ana & Cia", "ana"]] },
    ],
    new Date(2026, 6, 29, 12, 0, 0),
  );
  const arquivos = lerZipStore(bytes);

  it("gera o pacote OOXML mínimo", () => {
    expect(Object.keys(arquivos)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
    ]);
  });

  it("registra as abas no workbook", () => {
    expect(arquivos["xl/workbook.xml"]).toContain('name="Consolidado"');
    expect(arquivos["xl/workbook.xml"]).toContain('name="Detalhado"');
  });

  it("grava texto como inlineStr e número como valor", () => {
    const sheet1 = arquivos["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet1).toContain("<t xml:space=\"preserve\">Turno da Manhã</t>");
    expect(sheet1).toContain('<c r="A1" s="1" t="inlineStr">');
    expect(sheet1).toContain('<c r="B3"><v>3</v></c>');
  });

  it("escapa XML no texto das células", () => {
    expect(arquivos["xl/worksheets/sheet2.xml"]).toContain("Ana &amp; Cia");
  });

  it("é relido pelo parser XLSX da plataforma", () => {
    const encoder = new TextEncoder();
    const partes: Record<string, Uint8Array> = {};
    for (const [nome, conteudo] of Object.entries(arquivos)) {
      partes[nome] = encoder.encode(conteudo);
    }
    const matriz = xlsxUnzippedToMatrix(partes);
    expect(matriz[0]?.[0]).toBe("Turno da Manhã");
    expect(matriz[1]?.slice(0, 2)).toEqual(["Estúdio", "1 qua"]);
    expect(matriz[2]?.slice(0, 2)).toEqual(["BLAZE", "3"]);
  });

  it("termina com o End of Central Directory", () => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(dv.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(dv.getUint16(bytes.length - 22 + 10, true)).toBe(7);
  });
});
