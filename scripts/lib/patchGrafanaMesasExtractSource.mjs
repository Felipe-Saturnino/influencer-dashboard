import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(
  scriptsDir,
  "grafana-mesas-spin-extract-browser.js",
);

export function patchGrafanaMesasExtractSource({ de, ate }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
    throw new Error("Datas inválidas; use YYYY-MM-DD.");
  }
  if (de > ate) throw new Error(`Intervalo inválido: ${de} > ${ate}`);

  return readFileSync(sourcePath, "utf8")
    .replace(
      /const DE = "\d{4}-\d{2}-\d{2}";/,
      `const DE = ${JSON.stringify(de)};`,
    )
    .replace(
      /const ATE = "\d{4}-\d{2}-\d{2}";/,
      `const ATE = ${JSON.stringify(ate)};`,
    );
}
