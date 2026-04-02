/**
 * Gera INSERT SQL para relatorio_uap_por_jogo a partir de UAP.xlsx.
 *
 * 1) Descompactar o .xlsx (é um ZIP), ex.: copiar UAP.zip e extrair para uma pasta.
 * 2) node scripts/xlsx-uap-to-sql.mjs "C:\pasta_extraida" [saida.sql]
 *
 * Ou no PowerShell a partir do ficheiro:
 *   Copy-Item UAP.xlsx "$env:TEMP\UAP_uj.zip"
 *   Expand-Archive "$env:TEMP\UAP_uj.zip" "$env:TEMP\UAP_uj_x" -Force
 *   node scripts/xlsx-uap-to-sql.mjs "$env:TEMP\UAP_uj_x"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const extractedRoot = process.argv[2];
const outArg = process.argv[3];
const outPath =
  outArg && !outArg.startsWith("-")
    ? path.resolve(outArg)
    : path.join(root, "scripts", "relatorio_uap_por_jogo_seed_from_xlsx.sql");

if (!extractedRoot) {
  console.error("Uso: node scripts/xlsx-uap-to-sql.mjs <pasta_extraida_do_xlsx> [ficheiro.sql]");
  process.exit(1);
}

const sheetPath = path.join(extractedRoot, "xl", "worksheets", "sheet1.xml");
const ssPath = path.join(extractedRoot, "xl", "sharedStrings.xml");

if (!fs.existsSync(sheetPath)) {
  console.error("Não encontrado:", sheetPath);
  process.exit(1);
}

const xml = fs.readFileSync(sheetPath, "utf8");
const ssXml = fs.readFileSync(ssPath, "utf8");
const strings = [];
for (const m of ssXml.matchAll(/<si>[\s\S]*?<\/si>/g)) {
  strings.push(m[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function excelSerialToYmd(n) {
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(Number(n) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

function rowCells(rowXml) {
  const map = {};
  for (const m of rowXml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([^<]*)<\/v>)?/g)) {
    const col = m[1];
    const inner = m[3] || "";
    const v = m[4];
    const isS = inner.includes('t="s"');
    map[col] = { raw: v === undefined ? "" : v, isS };
  }
  return map;
}

function cellStr(cells, col) {
  const c = cells[col];
  if (!c || c.raw === "") return null;
  if (c.isS) return strings[Number(c.raw)] ?? null;
  return c.raw;
}

function cellNum(cells, col) {
  const c = cells[col];
  if (!c || c.raw === "") return null;
  return Number(c.raw);
}

function sqlString(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

const rows = [];
for (const m of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const rNum = Number(m[1]);
  if (rNum < 2) continue;
  const cells = rowCells(m[0]);
  const serial = cellNum(cells, "A");
  const jogo = cellStr(cells, "B", strings);
  const uap = cellNum(cells, "C");
  if (serial == null || jogo == null || uap == null) continue;
  rows.push({
    data: excelSerialToYmd(serial),
    jogo,
    uap: Math.round(uap),
  });
}

rows.sort((a, b) => a.data.localeCompare(b.data) || a.jogo.localeCompare(b.jogo));

const header = `-- Gerado a partir de UAP.xlsx — UPSERT em relatorio_uap_por_jogo
-- Aplicar no Supabase SQL Editor após criar a tabela.

`;

const values = rows
  .map((r) => `  (${sqlString(r.data)}::date, ${sqlString(r.jogo)}, ${r.uap}::bigint)`)
  .join(",\n");

const sql =
  header +
  `INSERT INTO public.relatorio_uap_por_jogo (data, jogo, uap)
VALUES
${values}
ON CONFLICT (data, jogo) DO UPDATE SET
  uap = EXCLUDED.uap,
  updated_at = now();
`;

fs.writeFileSync(outPath, sql, "utf8");
console.log("Escrito:", outPath, "| linhas:", rows.length);
