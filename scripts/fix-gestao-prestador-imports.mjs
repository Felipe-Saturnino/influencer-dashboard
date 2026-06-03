import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/rh/GestaoPrestador");
const helpers = fs.readFileSync(path.join(dir, "gestaoPrestadorHelpers.ts"), "utf8");
let index = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");

const exports = [];
for (const m of helpers.matchAll(/^export (?:async )?function (\w+)/gm)) exports.push({ name: m[1], kind: "value" });
for (const m of helpers.matchAll(/^export const (\w+)/gm)) exports.push({ name: m[1], kind: "value" });
for (const m of helpers.matchAll(/^export type (\w+)/gm)) exports.push({ name: m[1], kind: "type" });

const bodyStart = index.indexOf("export default function RhPrestadoresPage");
const body = index.slice(bodyStart);

const usedValues = [];
const usedTypes = [];
for (const { name, kind } of exports) {
  if (!new RegExp(`\\b${name}\\b`).test(body)) continue;
  if (kind === "type") usedTypes.push(name);
  else usedValues.push(name);
}

const importBlock = `import {
  ${[...usedValues, ...usedTypes.map((n) => `type ${n}`)].sort().join(",\n  ")},
} from "./gestaoPrestadorHelpers";
`;

const start = index.indexOf('} from "./gestaoPrestadorHelpers";');
if (start < 0) {
  console.error("helpers import not found");
  process.exit(1);
}
// find matching import {
const importStart = index.lastIndexOf("import {", start);
const end = start + '} from "./gestaoPrestadorHelpers";'.length;
index = index.slice(0, importStart) + importBlock + index.slice(end);
fs.writeFileSync(path.join(dir, "index.tsx"), index);

// trim unused from helpers header - run eslint on helpers separately
console.log("Gestao imports:", usedValues.length, "values", usedTypes.length, "types");
