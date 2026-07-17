/**
 * Valida orçamentos de chunks após `vite build`.
 * Margens generosas vs baseline jul/2026 — falha só em regressões grosseiras.
 *
 * Uso: node scripts/check-bundle-budgets.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_ASSETS = join(process.cwd(), "dist", "assets");

/** Limites em bytes (uncompressed). */
const BUDGETS = [
  { match: /^vendor-charts-.*\.js$/, maxKb: 480, label: "vendor-charts" },
  { match: /^vendor-jspdf-.*\.js$/, maxKb: 480, label: "vendor-jspdf" },
  { match: /^vendor-react-.*\.js$/, maxKb: 320, label: "vendor-react" },
  { match: /^vendor-supabase-.*\.js$/, maxKb: 220, label: "vendor-supabase" },
  { match: /^index-.*\.js$/, maxKb: 360, label: "index (shell)" },
  { match: /^OverviewSpin-.*\.js$/, maxKb: 120, label: "OverviewSpin" },
  { match: /^ScannerPanel-.*\.js$/, maxKb: 480, label: "ScannerPanel" },
];

function main() {
  let files;
  try {
    files = readdirSync(DIST_ASSETS).filter((f) => f.endsWith(".js"));
  } catch {
    console.error("[bundle-budgets] Pasta dist/assets não encontrada. Rode npm run build antes.");
    process.exit(1);
  }

  const failures = [];
  const ok = [];

  for (const budget of BUDGETS) {
    const hit = files.find((f) => budget.match.test(f));
    if (!hit) {
      ok.push(`${budget.label}: (chunk ausente — ok se página/vendor não entra no build)`);
      continue;
    }
    const bytes = statSync(join(DIST_ASSETS, hit)).size;
    const kb = bytes / 1024;
    const line = `${budget.label}: ${kb.toFixed(1)} KB (limite ${budget.maxKb} KB) → ${hit}`;
    if (kb > budget.maxKb) failures.push(line);
    else ok.push(line);
  }

  console.log("[bundle-budgets] Baseline pós-build:");
  for (const line of ok) console.log(`  ✓ ${line}`);
  if (failures.length) {
    console.error("[bundle-budgets] Orçamento excedido:");
    for (const line of failures) console.error(`  ✗ ${line}`);
    process.exit(1);
  }
  console.log("[bundle-budgets] OK");
}

main();
