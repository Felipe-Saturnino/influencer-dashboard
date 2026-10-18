/**
 * Extract Mesas Spin no Node (mesma lógica do dashboard 15), com cookie de sessão.
 *
 * Env: SUPERSET_MESAS_COOKIE (header Cookie completo, DevTools no dashboard 15 logado).
 * Opcional: SUPERSET_MESAS_BASE_URL (default https://superset-sg.proxylive.tech)
 *
 * Uso:
 *   node scripts/superset-mesas-spin-extract-node.mjs network 2026-09-16 2026-09-17
 *   node scripts/superset-mesas-spin-extract-node.mjs network 2026-09-16 2026-09-17 --out=tmp/superset-network-2026-09-16.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { patchMesasExtractSource } from "./lib/patchMesasExtractSource.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(caminho) {
  try {
    const env = {};
    for (const line of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

function loadEnvSync() {
  return { ...parseEnvFile(resolve(root, ".env.gp-kpi")), ...parseEnvFile(resolve(root, ".env")), ...process.env };
}

const modo = process.argv[2];
const DE = process.argv[3];
const ATE = process.argv[4];
const outArg = process.argv.find((a) => a.startsWith("--out="));
const force = process.argv.includes("--force");

if (!["network", "dedicado", "monthly"].includes(modo) || !DE || !ATE) {
  console.error(
    "Uso: node scripts/superset-mesas-spin-extract-node.mjs <network|dedicado|monthly> <DE> <ATE> [--out=tmp/….json] [--force]",
  );
  process.exit(1);
}

const env = loadEnvSync();
const cookie = (env.SUPERSET_MESAS_COOKIE || "").trim();
const host = (env.SUPERSET_MESAS_BASE_URL || "https://superset-sg.proxylive.tech").replace(/\/$/, "");
const supersetBase = `${host}/superset`;

if (!cookie) {
  console.error(
    "Defina SUPERSET_MESAS_COOKIE no .env.gp-kpi (Cookie do request ao dashboard 15 logado). Ver .cursor/rules/mesas-spin-carga.mdc § Comando único.",
  );
  process.exit(1);
}

const body = patchMesasExtractSource({ modo, de: DE, ate: ATE, force });

function fetchShim(input, init = {}) {
  const url =
    typeof input === "string"
      ? input.startsWith("http")
        ? input
        : `${supersetBase}${input.startsWith("/") ? input : `/${input}`}`
      : input.url.startsWith("http")
        ? input.url
        : `${supersetBase}${input.url.startsWith("/") ? input.url : `/${input.url}`}`;
  const headers = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${supersetBase}/dashboard/15/`,
    Cookie: cookie,
    ...(init.headers || {}),
  };
  if (init.method === "POST" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...init, headers });
}

function WebSocketShim(url, protocols) {
  const wsUrl = typeof url === "string" ? url : String(url);
  return new WebSocket(wsUrl, { ...(protocols ? { protocols } : {}), headers: { Cookie: cookie } });
}

const locationShim = { origin: supersetBase };

const runner = new Function(
  "fetch",
  "WebSocket",
  "location",
  `return (async () => { ${body} })();`,
);

const t0 = Date.now();
let out;
try {
  out = await runner(fetchShim, WebSocketShim, locationShim);
} catch (e) {
  console.error("Extract falhou:", e?.message || e);
  process.exit(1);
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const outPath = outArg
  ? resolve(root, outArg.slice("--out=".length))
  : resolve(root, `tmp/superset-${modo}-${DE}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: true, modo, DE, ATE, outPath: outPath.replace(/\\/g, "/"), elapsedSec: elapsed }, null, 2));
