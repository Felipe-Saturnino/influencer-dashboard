/**
 * Parser da planilha oficial SPA/MF (CSV `;`, RFC 4180).
 * Espelhado em supabase/functions/sync-comercial-spa-lista/index.ts — manter sincronizado.
 */

export interface ParsedMarca {
  nome: string;
  dominio: string | null;
}

export interface ParsedEmpresaBloco {
  cnpj: string;
  razao_social: string;
  portaria: string | null;
  portaria_retificacoes: string[];
  requerimento_numero: string | null;
  requerimento_ano: string | null;
  marcas: ParsedMarca[];
}

export function parseCsvSemicolon(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += c;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

export function normalizeCnpj(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function col(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

function normalizeNomeMarca(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function normalizeDominio(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (!v || v === "a definir" || v === "a definir." || v === "-") return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

function splitRequerimento(raw: string): { numero: string | null; ano: string | null } {
  const v = raw.trim();
  if (!v) return { numero: null, ano: null };
  const parts = v.split("/").map((p) => p.trim());
  if (parts.length >= 2) {
    return { numero: parts[0] || null, ano: parts[1] || null };
  }
  return { numero: v, ano: null };
}

function isPortariaPrincipal(col1: string): boolean {
  return /^SPA\/MF/i.test(col1.trim());
}

function isLinhaRetificacao(col1: string): boolean {
  const t = col1.trim();
  if (!t) return false;
  if (isPortariaPrincipal(t)) return false;
  return (
    /^\(/.test(t) ||
    /retificad/i.test(t) ||
    /alterad/i.test(t) ||
    /portaria spa/i.test(t)
  );
}

function extractMarca(row: string[]): ParsedMarca | null {
  const nomeRaw = col(row, 4);
  const dominioRaw = col(row, 5);
  const nome = normalizeNomeMarca(nomeRaw);
  const dominio = normalizeDominio(dominioRaw);
  if (!nome && !dominio) return null;
  if (!nome) return null;
  return { nome, dominio };
}

function findHeaderIndex(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const joined = rows[i].join(";").toUpperCase();
    if (joined.includes("CNPJ") && joined.includes("MARCAS")) return i;
  }
  return 1;
}

export function parseSpaAutorizacoesCsv(text: string): ParsedEmpresaBloco[] {
  const rows = parseCsvSemicolon(text.replace(/^\uFEFF/, ""));
  return parseSpaAutorizacoesMatrix(rows);
}

/** Aceita matriz já montada (ex.: 1ª aba de XLSX convertida). */
export function parseSpaAutorizacoesMatrix(rows: string[][]): ParsedEmpresaBloco[] {
  const headerIdx = findHeaderIndex(rows);
  const dataRows = rows.slice(headerIdx + 1);

  const blocos: ParsedEmpresaBloco[] = [];
  let current: ParsedEmpresaBloco | null = null;

  for (const row of dataRows) {
    const cnpjRaw = col(row, 3);
    const cnpj = cnpjRaw ? normalizeCnpj(cnpjRaw) : null;

    if (cnpj) {
      if (current) blocos.push(current);
      const req = splitRequerimento(col(row, 6));
      const portariaCol = col(row, 1);
      current = {
        cnpj,
        razao_social: col(row, 2),
        portaria: portariaCol || null,
        portaria_retificacoes: [],
        requerimento_numero: req.numero,
        requerimento_ano: req.ano,
        marcas: [],
      };
      const marca = extractMarca(row);
      if (marca) current.marcas.push(marca);
      continue;
    }

    if (!current) continue;

    const col1 = col(row, 1);
    if (isLinhaRetificacao(col1)) {
      current.portaria_retificacoes.push(col1);
    }

    const marca = extractMarca(row);
    if (marca) current.marcas.push(marca);
  }

  if (current) blocos.push(current);

  return blocos.filter((b) => b.cnpj && b.razao_social);
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
