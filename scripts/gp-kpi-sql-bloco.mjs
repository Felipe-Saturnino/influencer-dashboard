/**
 * Gera a SQL consolidada de um bloco (para injeção no navegador Grafana).
 * Uso: node scripts/gp-kpi-sql-bloco.mjs --de=2026-07-01 --ate=2026-07-07
 * (ate inclusivo; SQL usa limite exclusivo no dia seguinte)
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function arg(nome) {
  const p = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : null;
}

const de = arg("de");
const ate = arg("ate");
if (!de || !ate) {
  console.error("Use --de=AAAA-MM-DD --ate=AAAA-MM-DD (inclusivo)");
  process.exit(1);
}

const r = spawnSync(
  process.execPath,
  [resolve("scripts/grafana-gp-kpi-run.mjs"), "--sql", `--de=${de}`, `--ate=${ate}`],
  { encoding: "utf8", cwd: resolve(".") },
);
if (r.status !== 0) {
  process.stderr.write(r.stderr || r.stdout || "erro");
  process.exit(r.status || 1);
}
process.stdout.write(r.stdout);
