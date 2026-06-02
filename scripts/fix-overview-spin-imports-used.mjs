import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/dashboards/OverviewSpin");
const logic = fs.readFileSync(path.join(dir, "overviewSpinLogic.ts"), "utf8");
const index = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");

const exports = [];
for (const m of logic.matchAll(/^export (?:async )?function (\w+)/gm)) exports.push({ name: m[1], kind: "value" });
for (const m of logic.matchAll(/^export const (\w+)/gm)) exports.push({ name: m[1], kind: "value" });
for (const m of logic.matchAll(/^export type (\w+)/gm)) exports.push({ name: m[1], kind: "type" });
for (const m of logic.matchAll(/^export interface (\w+)/gm)) exports.push({ name: m[1], kind: "type" });

const bodyStart = index.indexOf("export default function OverviewSpin");
const body = index.slice(bodyStart);

const usedValues = [];
const usedTypes = [];
for (const { name, kind } of exports) {
  const re = new RegExp(`\\b${name}\\b`);
  if (!re.test(body)) continue;
  if (kind === "type") usedTypes.push(name);
  else usedValues.push(name);
}

const importBlock = `import {
  ${[...usedValues, ...usedTypes.map((n) => `type ${n}`)].sort().join(",\n  ")},
} from "./overviewSpinLogic";
`;

let out = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");
const marker = '} from "./overviewSpinLogic";';
const end = out.indexOf(marker);
if (end < 0) {
  console.error("block not found");
  process.exit(1);
}
const start = out.lastIndexOf("import {", end);
const endFull = end + marker.length;
out = out.slice(0, start) + importBlock + out.slice(endFull);
fs.writeFileSync(path.join(dir, "index.tsx"), out);
console.log("values", usedValues.length, "types", usedTypes.length);
