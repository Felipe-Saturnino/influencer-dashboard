/**
 * Converte a 1ª aba de um XLSX (OOXML) em matriz de células (texto).
 * Usado pelo sync Lista SPA/MF quando o gov.br publica .xlsx no lugar de .csv.
 * Espelhado em supabase/functions/sync-comercial-spa-lista/index.ts — manter sincronizado.
 */

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    if (ch < "A" || ch > "Z") break;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
      decodeXmlEntities(t[1]),
    );
    out.push(parts.join(""));
  }
  return out;
}

function parseSheetToMatrix(sheetXml: string, shared: string[]): string[][] {
  const rowMap = new Map<number, Map<number, string>>();
  let maxCol = 0;

  for (const rm of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(rm[1]);
    const cells = new Map<number, string>();
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1] ?? "";
      const inner = cm[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)(\d+)"/);
      if (!ref) continue;
      const col = colLettersToIndex(ref[1]);
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      let raw = vMatch?.[1] ?? "";
      if (/\bt="inlineStr"/.test(attrs)) {
        const texts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
          decodeXmlEntities(t[1]),
        );
        raw = texts.join("");
      } else if (/\bt="s"/.test(attrs)) {
        raw = shared[Number(raw)] ?? "";
      } else {
        raw = decodeXmlEntities(raw);
      }
      cells.set(col, raw);
      if (col > maxCol) maxCol = col;
    }
    rowMap.set(rowNum, cells);
  }

  const maxRow = Math.max(0, ...rowMap.keys());
  const matrix: string[][] = [];
  for (let r = 1; r <= maxRow; r++) {
    const cells = rowMap.get(r);
    const row: string[] = [];
    for (let c = 0; c <= Math.max(maxCol, 6); c++) {
      row.push(cells?.get(c) ?? "");
    }
    matrix.push(row);
  }
  return matrix;
}

/** Serializa matriz no CSV `;` esperado por `parseSpaAutorizacoesCsv`. */
export function matrixToSemicolonCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? "");
          if (/[;"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(";"),
    )
    .join("\n");
}

/**
 * Extrai matriz da 1ª worksheet a partir dos ficheiros ZIP já descompactados.
 * Chaves esperadas: `xl/sharedStrings.xml`, `xl/worksheets/sheet1.xml`
 */
export function xlsxUnzippedToMatrix(files: Record<string, Uint8Array>): string[][] {
  const decoder = new TextDecoder("utf-8");
  const sharedXml = files["xl/sharedStrings.xml"]
    ? decoder.decode(files["xl/sharedStrings.xml"])
    : "";
  const sheetXml = files["xl/worksheets/sheet1.xml"]
    ? decoder.decode(files["xl/worksheets/sheet1.xml"])
    : "";
  if (!sheetXml) {
    throw new Error("XLSX sem worksheet sheet1.xml");
  }
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];
  return parseSheetToMatrix(sheetXml, shared);
}

export {
  extractAutorizacoesCsvUrl,
  extractAutorizacoesPlanilhaUrl,
} from "./comercialSpaListaFonte";
