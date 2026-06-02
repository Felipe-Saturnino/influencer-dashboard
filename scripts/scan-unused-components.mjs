/**
 * Varredura heurística: componentes .tsx em src/components sem import em src/pages.
 * Uso: node scripts/scan-unused-components.mjs
 */
import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function readAll(dir) {
  let s = "";
  for (const f of walk(dir)) s += fs.readFileSync(f, "utf8") + "\n";
  return s;
}

const componentFiles = walk("src/components");
const pagesSrc = readAll("src/pages");
const allSrc = readAll("src");

const results = [];

for (const file of componentFiles) {
  const base = path.basename(file, ".tsx");
  if (base === "index") continue;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const importRe = new RegExp(
    String.raw`from\s+['"][^'"]*${escaped}['"]|import\s+\{[^}]*\b${escaped}\b`,
  );
  const usedInPages = importRe.test(pagesSrc) || pagesSrc.includes(`<${base}`);
  const usedInSrc = importRe.test(allSrc) || allSrc.includes(`<${base}`);
  const onlySelf = !usedInSrc || (usedInSrc && !importRe.test(pagesSrc) && !pagesSrc.includes(`<${base}`));
  if (!usedInPages) {
    results.push({
      file: file.replace(/\\/g, "/"),
      usedElsewhereInSrc: usedInSrc && !onlySelf,
      note: usedInSrc ? "só outros componentes/lib, não páginas" : "sem referência em src",
    });
  }
}

results.sort((a, b) => a.file.localeCompare(b.file));
console.log("Componentes sem uso em src/pages (" + results.length + "):\n");
for (const r of results) {
  console.log("- " + r.file + (r.usedElsewhereInSrc ? " (" + r.note + ")" : " (" + r.note + ")"));
}
