/**
 * Smoke test local do parser SPA (Node/tsx).
 * Uso: npx tsx scripts/test-spa-csv-parser.ts [caminho.csv]
 */
import { readFileSync } from "node:fs";
import { parseSpaAutorizacoesCsv } from "../src/lib/comercialSpaCsvParser.ts";

const path =
  process.argv[2] ??
  "C:/Users/FelipeSaturnino/Downloads/planilha-de-autorizacoes-13-05-2026.csv";

const text = readFileSync(path, "utf8");
const blocos = parseSpaAutorizacoesCsv(text);
const marcas = blocos.reduce((s, b) => s + b.marcas.length, 0);

console.log("Arquivo:", path);
console.log("Blocos (empresas):", blocos.length);
console.log("Marcas:", marcas);

const apostar = blocos.find((b) => b.marcas.some((m) => m.nome === "APOSTAR"));
console.log("APOSTAR:", apostar?.marcas.find((m) => m.nome === "APOSTAR"));

const esportes = blocos.find((b) => b.cnpj === "56.075.466/0001-00");
console.log(
  "ESPORTES DA SORTE — portaria:",
  esportes?.portaria?.replace(/\s+/g, " ").slice(0, 60),
  "| marcas:",
  esportes?.marcas.length,
);

const hilgard = blocos.flatMap((b) => b.marcas).filter((m) => m.nome.includes("HILGARDO"));
console.log("HILGARDO (domínio a definir):", hilgard);
