/**
 * Gera a expressão pronta para Runtime.evaluate no Browser do chat.
 *
 * Uso:
 *   node scripts/grafana-mesas-spin-write-extract-expr.mjs \
 *     --de=2026-09-18 --ate=2026-09-20
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { patchGrafanaMesasExtractSource } from "./lib/patchGrafanaMesasExtractSource.mjs";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const de = arg("de");
const ate = arg("ate");
if (!de || !ate) {
  console.error(
    "Uso: node scripts/grafana-mesas-spin-write-extract-expr.mjs " +
      "--de=YYYY-MM-DD --ate=YYYY-MM-DD",
  );
  process.exit(1);
}

mkdirSync(resolve("tmp"), { recursive: true });
const source = patchGrafanaMesasExtractSource({ de, ate });
const dest = resolve("tmp", `grafana-mesas-extract-${de}_${ate}.js`);
writeFileSync(dest, source, "utf8");
const chunks = source.match(/[\s\S]{1,3500}/g) ?? [];
const chunkFiles = chunks.map((chunk, index) => {
  const chunkPath = resolve(
    "tmp",
    `grafana-mesas-extract-${de}_${ate}-chunk-${index + 1}.js`,
  );
  const prefix =
    index === 0
      ? "globalThis.__grafanaMesasParts=[];"
      : "globalThis.__grafanaMesasParts??=[];";
  writeFileSync(
    chunkPath,
    `${prefix}globalThis.__grafanaMesasParts.push(${JSON.stringify(chunk)});`,
    "utf8",
  );
  return chunkPath;
});
const runPath = resolve(
  "tmp",
  `grafana-mesas-extract-${de}_${ate}-run.js`,
);
writeFileSync(
  runPath,
  'eval(globalThis.__grafanaMesasParts.join(""));',
  "utf8",
);

console.log(
  JSON.stringify({
    ok: true,
    de,
    ate,
    dest,
    bytes: Buffer.byteLength(source),
    chunkFiles,
    runPath,
    dumps: {
      network: "JSON.stringify(window.__mesasGrafana.network)",
      dedicado: "JSON.stringify(window.__mesasGrafana.dedicado)",
      monthly: "JSON.stringify(window.__mesasGrafana.monthly)",
    },
  }),
);
