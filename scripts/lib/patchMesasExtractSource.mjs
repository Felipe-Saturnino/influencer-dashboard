/**
 * Aplica DE/ATE/MODO/FORCE no script canónico do browser (fonte única).
 * Usado por tmp/make-compact-extract.mjs e superset-mesas-spin-extract-node.mjs.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{ modo: string, de: string, ate: string, force?: boolean, browserWindowKey?: string | null }} opts
 * @returns {string} corpo async (sem IIFE externa)
 */
export function patchMesasExtractSource({ modo, de, ate, force = false, browserWindowKey = null }) {
  let src = readFileSync(resolve(root, "scripts/superset-mesas-spin-extract-browser.js"), "utf8");
  src = src.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "");
  src = src.replace(/const MODO = "[^"]+"/, `const MODO = "${modo}"`);
  src = src.replace(/const DE = "[^"]+"/, `const DE = "${de}"`);
  src = src.replace(/const ATE = "[^"]+"/, `const ATE = "${ate}"`);
  src = src.replace(/const FORCE = (?:true|false)/, `const FORCE = ${force}`);

  if (browserWindowKey) {
    src = src.replace(/\/\*\*[\s\S]*?\*\//g, (m) => (/[^\x00-\x7F]/.test(m) ? "/* */" : m));
    src = src.replace(/\/\/[^\n]*[^\x00-\x7F][^\n]*/g, () => "/* */");
    src = src.replace(
      /return out;/g,
      `window.${browserWindowKey} = out;
  if (out.mes) {
    const keys = Object.keys(out).filter((k) => !["mes", "monthlyTimeRange", "modo", "de", "ate"].includes(k));
    const uaps = {};
    for (const k of keys) uaps[k] = out[k]?.uap ?? null;
    return { ok: true, mes: out.mes, range: out.monthlyTimeRange, keys, uaps };
  }
  return { ok: true, de: out.de, ate: out.ate, keys: Object.keys(out).filter((k) => !["modo", "de", "ate"].includes(k)) };`,
    );
  }

  let body = src.trim();
  if (body.startsWith("(async () => {")) {
    body = body.slice("(async () => {".length);
  }
  if (body.endsWith("})();")) {
    body = body.slice(0, -"})();".length);
  } else if (body.endsWith("})()")) {
    body = body.slice(0, -"})()".length);
  }
  return body.trim();
}

export function browserWindowKeyForModo(modo) {
  if (modo === "network") return "__mesasNet";
  if (modo === "dedicado") return "__mesasDed";
  return "__mesasMon";
}
