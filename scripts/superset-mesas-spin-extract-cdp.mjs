/**
 * Extract via Chrome DevTools Protocol (aba Superset já logada).
 *
 * 1. Abra o Chrome com depuração remota (atalho ou):
 *    "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
 * 2. Login no dashboard 15 numa aba.
 *
 * Uso:
 *   node scripts/superset-mesas-spin-extract-cdp.mjs network 2026-09-16 2026-09-17 --out=tmp/….json
 *   node scripts/superset-mesas-spin-extract-cdp.mjs network 2026-09-16 2026-09-17 --cdp=http://127.0.0.1:9222
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { browserWindowKeyForModo, patchMesasExtractSource } from "./lib/patchMesasExtractSource.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

const modo = process.argv[2];
const DE = process.argv[3];
const ATE = process.argv[4];
const outArg = process.argv.find((a) => a.startsWith("--out="));
const cdpBase = (process.argv.find((a) => a.startsWith("--cdp=")) || "--cdp=http://127.0.0.1:9222").slice(
  "--cdp=".length,
);
const force = process.argv.includes("--force");

if (!["network", "dedicado", "monthly"].includes(modo) || !DE || !ATE) {
  console.error(
    "Uso: node scripts/superset-mesas-spin-extract-cdp.mjs <network|dedicado|monthly> <DE> <ATE> [--out=…] [--cdp=URL]",
  );
  process.exit(1);
}

spawnSync(
  node,
  [resolve(root, "tmp/make-compact-extract.mjs"), modo, DE, ATE, ...(force ? ["--force"] : [])],
  { cwd: root, stdio: "inherit" },
);

const compactPath = resolve(root, `tmp/cdp-compact-${modo}.json`);
const { expression } = JSON.parse(readFileSync(compactPath, "utf8"));
const winKey = browserWindowKeyForModo(modo);

async function cdpEval(wsUrl, method, params) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  return new Promise((resolvePromise, reject) => {
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message || JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    ws.addEventListener("open", () => {
      const myId = ++id;
      pending.set(myId, { resolve: resolvePromise, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
    ws.addEventListener("error", () => reject(new Error("WebSocket CDP falhou")));
    setTimeout(() => reject(new Error("CDP timeout")), 300000);
  }).finally(() => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });
}

async function pickSupersetTarget() {
  const res = await fetch(`${cdpBase.replace(/\/$/, "")}/json/list`);
  const tabs = await res.json();
  const hit =
    tabs.find((t) => t.type === "page" && /superset-sg\.proxylive\.tech.*dashboard\/15/.test(t.url)) ||
    tabs.find((t) => t.type === "page" && /superset-sg\.proxylive\.tech/.test(t.url));
  if (!hit?.webSocketDebuggerUrl) {
    throw new Error(
      "Nenhuma aba Superset dashboard 15 no Chrome CDP. Abra o dashboard logado na janela com --remote-debugging-port=9222.",
    );
  }
  return hit.webSocketDebuggerUrl;
}

const wsUrl = await pickSupersetTarget();
console.log("CDP tab:", wsUrl.split("/").slice(-1)[0]);

const evalResult = await cdpEval(wsUrl, "Runtime.evaluate", {
  expression,
  awaitPromise: true,
  returnByValue: true,
});

if (evalResult.exceptionDetails) {
  console.error("Runtime.evaluate exception:", evalResult.exceptionDetails);
  process.exit(1);
}
const summary = evalResult.result?.value;
console.log("Resumo extract:", JSON.stringify(summary));

const dump = await cdpEval(wsUrl, "Runtime.evaluate", {
  expression: `JSON.stringify(window.${winKey})`,
  returnByValue: true,
});
const jsonStr = dump.result?.value;
if (!jsonStr) {
  console.error(`window.${winKey} vazio após extract`);
  process.exit(1);
}

const out = JSON.parse(jsonStr);
const outPath = outArg
  ? resolve(root, outArg.slice("--out=".length))
  : resolve(root, `tmp/superset-${modo}-${DE}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: true, outPath: outPath.replace(/\\/g, "/") }, null, 2));
