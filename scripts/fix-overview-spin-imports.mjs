/**
 * Atualiza import de overviewSpinLogic no index (lista completa de exports).
 */
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/dashboards/OverviewSpin");
const logic = fs.readFileSync(path.join(dir, "overviewSpinLogic.ts"), "utf8");
const names = [];
for (const m of logic.matchAll(/^export (?:async )?function (\w+)/gm)) names.push(m[1]);
for (const m of logic.matchAll(/^export const (\w+)/gm)) names.push(m[1]);
for (const m of logic.matchAll(/^export type (\w+)/gm)) names.push(m[1]);
for (const m of logic.matchAll(/^export interface (\w+)/gm)) names.push(m[1]);
const unique = [...new Set(names)].sort();

const importBlock = `import {
  ${unique.join(",\n  ")},
} from "./overviewSpinLogic";
`;

let index = fs.readFileSync(path.join(dir, "index.tsx"), "utf8");
const start = index.indexOf("import {\n  type DailyRow,");
const end = index.indexOf('} from "./overviewSpinLogic";') + '} from "./overviewSpinLogic";'.length;
if (start < 0 || end < start) {
  console.error("import block not found");
  process.exit(1);
}
index = index.slice(0, start) + importBlock + index.slice(end);
fs.writeFileSync(path.join(dir, "index.tsx"), index);
console.log("Imported", unique.length, "symbols from overviewSpinLogic");
