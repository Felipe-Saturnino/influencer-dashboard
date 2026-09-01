/**
 * Extrai páginas de PDF como PNG (PDFs só-imagem / slides).
 * Requer: npm install --no-save pdf-to-img
 *
 * Uso: node scripts/extract-pdf-pages.mjs <caminho.pdf> <pasta-saida>
 */
import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";

const pdfPath = process.argv[2];
const outDir = process.argv[3];
const scale = Number(process.argv[4] || 2);

if (!pdfPath || !outDir) {
  console.error("Uso: node scripts/extract-pdf-pages.mjs <pdf> <outDir> [scale]");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
console.log(`PDF: ${pdfPath} → ${outDir} (scale ${scale})`);

const doc = await pdf(pdfPath, { scale });
let i = 0;
for await (const img of doc) {
  i += 1;
  const out = path.join(outDir, `page-${String(i).padStart(2, "0")}.png`);
  fs.writeFileSync(out, img);
  console.log("OK", out);
}
console.log("total", i);
