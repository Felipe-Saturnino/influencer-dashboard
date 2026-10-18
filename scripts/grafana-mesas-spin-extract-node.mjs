/**
 * Extract Mesas Spin via Grafana /api/ds/query usando cookie Pomerium.
 *
 * Uso:
 *   node scripts/grafana-mesas-spin-extract-node.mjs \
 *     --de=2026-09-18 --ate=2026-09-20 \
 *     --network-out=tmp/grafana-mesas-network-2026-09-20.json \
 *     --dedicado-out=tmp/grafana-mesas-dedicado-2026-09-20.json \
 *     --monthly-out=tmp/grafana-mesas-monthly-2026-09.json
 *
 * Env: GRAFANA_MESAS_COOKIE (ou GRAFANA_GP_KPI_COOKIE como fallback).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { patchGrafanaMesasExtractSource } from "./lib/patchGrafanaMesasExtractSource.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

function parseEnvFile(caminho) {
  try {
    const env = {};
    for (const line of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      env[t.slice(0, i).trim()] = t
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const env = {
  ...parseEnvFile(resolve(root, ".env.gp-kpi")),
  ...parseEnvFile(resolve(root, ".env")),
  ...process.env,
};

const de = arg("de");
const ate = arg("ate");
const networkOut = arg("network-out");
const dedicadoOut = arg("dedicado-out");
const monthlyOut = arg("monthly-out");

if (!de || !ate || !networkOut || !dedicadoOut || !monthlyOut) {
  console.error(
    "Uso: node scripts/grafana-mesas-spin-extract-node.mjs " +
      "--de=YYYY-MM-DD --ate=YYYY-MM-DD " +
      "--network-out=tmp/….json --dedicado-out=tmp/….json " +
      "--monthly-out=tmp/….json",
  );
  process.exit(1);
}

const cookie = (
  env.GRAFANA_MESAS_COOKIE ||
  env.GRAFANA_GP_KPI_COOKIE ||
  ""
).trim();
const baseUrl = (
  env.GRAFANA_MESAS_BASE_URL ||
  env.GRAFANA_GP_KPI_BASE_URL ||
  "https://spingaming2.grafana.proxylive.tech"
).replace(/\/$/, "");

if (!cookie) {
  console.error(
    "Defina GRAFANA_MESAS_COOKIE (ou GRAFANA_GP_KPI_COOKIE) no .env.gp-kpi. " +
      "No Browser do chat, use scripts/grafana-mesas-spin-write-extract-expr.mjs.",
  );
  process.exit(1);
}

const source = patchGrafanaMesasExtractSource({ de, ate });
const expression = source
  .slice(source.indexOf("(async () =>"))
  .trim()
  .replace(/;\s*$/, "");
let extracted;

async function fetchShim(input, init = {}) {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const url = raw.startsWith("http")
    ? raw
    : `${baseUrl}${raw.startsWith("/") ? raw : `/${raw}`}`;
  const headers = {
    ...Object.fromEntries(new Headers(init.headers ?? {}).entries()),
    Cookie: cookie,
    Origin: baseUrl,
    Referer: `${baseUrl}/explore`,
  };
  return fetch(url, { ...init, headers, redirect: "manual" });
}

const previous = globalThis.__mesasGrafana;
try {
  const execute = new Function(
    "fetch",
    "location",
    `return (${expression});\n//# sourceURL=grafana-mesas-spin-extract-browser.js`,
  );
  const summary = await execute(fetchShim, { origin: baseUrl });
  extracted = globalThis.__mesasGrafana;
  if (!summary?.ok || !extracted) {
    throw new Error(`Extract sem payload: ${JSON.stringify(summary)}`);
  }
} finally {
  if (previous === undefined) delete globalThis.__mesasGrafana;
  else globalThis.__mesasGrafana = previous;
}

function save(caminho, value) {
  const abs = resolve(root, caminho);
  writeFileSync(abs, JSON.stringify(value, null, 2), "utf8");
  return abs;
}

const files = {
  network: save(networkOut, extracted.network),
  dedicado: save(dedicadoOut, extracted.dedicado),
  monthly: save(monthlyOut, extracted.monthly),
};

console.log(
  JSON.stringify(
    {
      ok: true,
      de,
      ate,
      elapsedMs: extracted.meta.elapsedMs,
      files,
    },
    null,
    2,
  ),
);
