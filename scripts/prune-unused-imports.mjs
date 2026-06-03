/**
 * Remove imports não referenciados no corpo do ficheiro (heurística por símbolo).
 * Uso: node scripts/prune-unused-imports.mjs [ficheiro ou pasta...]
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function collectFiles(arg) {
  const abs = path.isAbsolute(arg) ? arg : path.join(ROOT, arg);
  if (!fs.existsSync(abs)) return [];
  const st = fs.statSync(abs);
  if (st.isFile()) return [abs];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") out.push(...collectFiles(p));
    else if (/\.(tsx?|mjs)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function parseImports(source) {
  const imports = [];
  const re = /^import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm;
  let m;
  while ((m = re.exec(source)) !== null) {
    imports.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return imports;
}

function extractBindings(importText) {
  const bindings = [];
  const isTypeOnly = /^import\s+type\s/.test(importText);
  const sideEffect = /^import\s+['"]/.test(importText);
  if (sideEffect) return { sideEffect: true, bindings: [] };

  const defaultM = importText.match(/^import\s+(?!type)(\w+)\s*,/);
  if (defaultM) bindings.push({ name: defaultM[1], isType: false });

  const nsM = importText.match(/^import\s+\*\s+as\s+(\w+)/);
  if (nsM) bindings.push({ name: nsM[1], isType: false, namespace: true });

  const braceM = importText.match(/\{([^}]+)\}/);
  if (braceM) {
    for (const part of braceM[1].split(",")) {
      const chunk = part.trim();
      if (!chunk) continue;
      const typeKw = chunk.startsWith("type ");
      const cleaned = chunk.replace(/^type\s+/, "").trim();
      const alias = cleaned.includes(" as ") ? cleaned.split(/\s+as\s+/)[1].trim() : cleaned;
      bindings.push({ name: alias, isType: typeKw || isTypeOnly });
    }
  }

  return { sideEffect: false, bindings };
}

function isUsed(name, body) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(body);
}

function pruneImportText(importText, body) {
  const { sideEffect, bindings } = extractBindings(importText);
  if (sideEffect) return importText;

  const fromM = importText.match(/from\s+['"]([^'"]+)['"]/);
  if (!fromM) return importText;

  const kept = bindings.filter((b) => b.namespace || isUsed(b.name, body));
  if (kept.length === 0) return null;

  if (kept.length === bindings.length && kept.every((k, i) => k.name === bindings[i].name)) {
    return importText;
  }

  const onlyTypes = kept.every((b) => b.isType);
  const prefix = onlyTypes && !importText.includes("import type {") ? "import type " : "import ";

  const names = kept
    .filter((b) => !b.namespace)
    .map((b) => {
      const orig = bindings.find((x) => x.name === b.name);
      return orig?.isType ? `type ${b.name}` : b.name;
    });

  const ns = kept.find((b) => b.namespace);
  if (ns) {
    return `${prefix}* as ${ns.name} from '${fromM[1]}';`;
  }

  if (names.length === 0) return null;
  return `${prefix}{ ${names.join(", ")} } from '${fromM[1]}';`;
}

function pruneFile(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  const imports = parseImports(source);
  if (imports.length === 0) return false;

  const bodyStart = imports[imports.length - 1].end;
  const body = source.slice(bodyStart);

  const newImportLines = [];
  for (const imp of imports) {
    const pruned = pruneImportText(imp.text, body);
    if (pruned) newImportLines.push(pruned.replace(/from\s+'([^']+)'/, 'from "$1"').replace(/;\s*$/, ""));
  }

  const rest = source.slice(bodyStart).replace(/^\n+/, "");
  const newSource = `${newImportLines.join("\n")}\n\n${rest}`;
  if (newSource === source) return false;
  fs.writeFileSync(filePath, newSource);
  return true;
}

const args =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        "src/pages/aquisicao/BancaJogo",
        "src/pages/aquisicao/Financeiro",
        "src/pages/estudio/Figurinos",
        "src/pages/dashboards/SocialMediaDashboard",
        "scripts/fix-figurinos-modals.mjs",
        "scripts/split-figurinos.mjs",
      ];

let changed = 0;
for (const arg of args) {
  for (const f of collectFiles(arg)) {
    if (pruneFile(f)) {
      changed++;
      console.log("pruned:", path.relative(ROOT, f));
    }
  }
}
console.log(`Done. ${changed} file(s) updated.`);
