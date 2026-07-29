/**
 * Gerador de ficheiro XLSX (OOXML) no browser, sem dependências.
 * Escreve o pacote ZIP com método `store` (sem compressão) — suficiente para
 * planilhas de exportação da plataforma (poucas centenas de linhas por aba).
 */

export type XlsxCelula =
  | string
  | number
  | null
  | undefined
  | { v: string | number | null | undefined; bold?: boolean };

export type XlsxAba = {
  /** Nome visível da aba (Excel limita a 31 caracteres e proíbe `[]:*?/\`). */
  nome: string;
  linhas: XlsxCelula[][];
  /** Largura das colunas em caracteres (índice = coluna). */
  largurasColunas?: number[];
  /** Painéis congelados: quantidade de linhas/colunas fixas no scroll. */
  congelar?: { linhas?: number; colunas?: number };
};

const CRC_TABELA = (() => {
  const tabela = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[i] = c >>> 0;
  }
  return tabela;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = (CRC_TABELA[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Caracteres de controlo (exceto tab, LF e CR) invalidam o XML do Excel. */
function removerControlesXml(valor: string): string {
  let out = "";
  for (const ch of valor) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue;
    out += ch;
  }
  return out;
}

function escaparXml(valor: string): string {
  return removerControlesXml(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Índice 0-based → letra da coluna (0 = A, 26 = AA). */
export function letraColunaXlsx(indice: number): string {
  let n = indice + 1;
  let out = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    out = String.fromCharCode(65 + resto) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Excel: máximo 31 caracteres e sem `[]:*?/\`. */
export function sanitizarNomeAbaXlsx(nome: string): string {
  const limpo = nome.replace(/[[\]:*?/\\]/g, " ").trim();
  return (limpo || "Planilha").slice(0, 31);
}

function normalizarCelula(celula: XlsxCelula): { valor: string | number | null; bold: boolean } {
  if (celula === null || celula === undefined) return { valor: null, bold: false };
  if (typeof celula === "string" || typeof celula === "number") {
    return { valor: celula, bold: false };
  }
  const v = celula.v;
  return { valor: v === undefined ? null : v, bold: celula.bold === true };
}

function xmlAba(aba: XlsxAba): string {
  const partes: string[] = [];
  partes.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  partes.push(
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
  );

  const congelarLinhas = aba.congelar?.linhas ?? 0;
  const congelarColunas = aba.congelar?.colunas ?? 0;
  if (congelarLinhas > 0 || congelarColunas > 0) {
    const topLeft = `${letraColunaXlsx(congelarColunas)}${congelarLinhas + 1}`;
    partes.push(
      `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${congelarColunas}" ySplit="${congelarLinhas}" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`,
    );
  }

  const larguras = aba.largurasColunas ?? [];
  if (larguras.length > 0) {
    const cols = larguras
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join("");
    partes.push(`<cols>${cols}</cols>`);
  }

  partes.push("<sheetData>");
  aba.linhas.forEach((linha, idxLinha) => {
    const r = idxLinha + 1;
    const celulas: string[] = [];
    linha.forEach((bruta, idxCol) => {
      const { valor, bold } = normalizarCelula(bruta);
      if (valor === null || valor === "") return;
      const ref = `${letraColunaXlsx(idxCol)}${r}`;
      const estilo = bold ? ' s="1"' : "";
      if (typeof valor === "number" && Number.isFinite(valor)) {
        celulas.push(`<c r="${ref}"${estilo}><v>${valor}</v></c>`);
        return;
      }
      celulas.push(
        `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(String(valor))}</t></is></c>`,
      );
    });
    if (celulas.length === 0) return;
    partes.push(`<row r="${r}">${celulas.join("")}</row>`);
  });
  partes.push("</sheetData></worksheet>");
  return partes.join("");
}

function xmlContentTypes(qtdAbas: number): string {
  const overrides = Array.from(
    { length: qtdAbas },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
}

function xmlWorkbook(nomesAbas: string[]): string {
  const sheets = nomesAbas
    .map(
      (nome, i) =>
        `<sheet name="${escaparXml(nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets}</sheets></workbook>`;
}

function xmlWorkbookRels(qtdAbas: number): string {
  const abas = Array.from(
    { length: qtdAbas },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas}<Relationship Id="rId${qtdAbas + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

const XML_RELS_RAIZ =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

/** `cellXfs` 0 = normal, 1 = negrito (cabeçalhos e títulos de bloco). */
const XML_STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/** `Uint8Array` com buffer não compartilhado — aceito por `Blob` e `DataView`. */
type BytesXlsx = Uint8Array<ArrayBuffer>;

type ZipEntrada = { nome: string; dados: BytesXlsx };

function dataHoraDos(ref: Date): { hora: number; data: number } {
  const hora =
    (Math.floor(ref.getSeconds() / 2) & 0x1f) |
    ((ref.getMinutes() & 0x3f) << 5) |
    ((ref.getHours() & 0x1f) << 11);
  const data =
    (ref.getDate() & 0x1f) |
    (((ref.getMonth() + 1) & 0x0f) << 5) |
    ((Math.max(0, ref.getFullYear() - 1980) & 0x7f) << 9);
  return { hora, data };
}

function zipStore(entradas: ZipEntrada[], ref: Date): BytesXlsx {
  const encoder = new TextEncoder();
  const { hora, data } = dataHoraDos(ref);
  const blocos: BytesXlsx[] = [];
  const centrais: BytesXlsx[] = [];
  let offset = 0;

  for (const entrada of entradas) {
    const nomeBytes = encoder.encode(entrada.nome);
    const crc = crc32(entrada.dados);
    const tamanho = entrada.dados.length;

    const local = new Uint8Array(30 + nomeBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, hora, true);
    lv.setUint16(12, data, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, tamanho, true);
    lv.setUint32(22, tamanho, true);
    lv.setUint16(26, nomeBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nomeBytes, 30);

    const central = new Uint8Array(46 + nomeBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, hora, true);
    cv.setUint16(14, data, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, tamanho, true);
    cv.setUint32(24, tamanho, true);
    cv.setUint16(28, nomeBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nomeBytes, 46);

    blocos.push(local, entrada.dados);
    centrais.push(central);
    offset += local.length + tamanho;
  }

  const tamanhoCentral = centrais.reduce((acc, c) => acc + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, entradas.length, true);
  fv.setUint16(10, entradas.length, true);
  fv.setUint32(12, tamanhoCentral, true);
  fv.setUint32(16, offset, true);

  const total =
    blocos.reduce((acc, b) => acc + b.length, 0) + tamanhoCentral + fim.length;
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const b of [...blocos, ...centrais, fim]) {
    saida.set(b, pos);
    pos += b.length;
  }
  return saida;
}

/** Bytes do ficheiro `.xlsx` com uma worksheet por item de `abas`. */
export function criarXlsxBytes(abas: XlsxAba[], ref: Date = new Date()): BytesXlsx {
  if (abas.length === 0) throw new Error("XLSX precisa de pelo menos uma aba.");
  const encoder = new TextEncoder();
  const nomes = abas.map((a) => sanitizarNomeAbaXlsx(a.nome));
  const entradas: ZipEntrada[] = [
    { nome: "[Content_Types].xml", dados: encoder.encode(xmlContentTypes(abas.length)) },
    { nome: "_rels/.rels", dados: encoder.encode(XML_RELS_RAIZ) },
    { nome: "xl/workbook.xml", dados: encoder.encode(xmlWorkbook(nomes)) },
    { nome: "xl/_rels/workbook.xml.rels", dados: encoder.encode(xmlWorkbookRels(abas.length)) },
    { nome: "xl/styles.xml", dados: encoder.encode(XML_STYLES) },
    ...abas.map((aba, i) => ({
      nome: `xl/worksheets/sheet${i + 1}.xml`,
      dados: encoder.encode(xmlAba(aba)),
    })),
  ];
  return zipStore(entradas, ref);
}

export function criarXlsxBlob(abas: XlsxAba[], ref: Date = new Date()): Blob {
  const bytes = criarXlsxBytes(abas, ref);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Gera o `.xlsx` e dispara o download no browser. */
export function baixarXlsx(nomeArquivo: string, abas: XlsxAba[]) {
  const blob = criarXlsxBlob(abas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo.toLowerCase().endsWith(".xlsx") ? nomeArquivo : `${nomeArquivo}.xlsx`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
