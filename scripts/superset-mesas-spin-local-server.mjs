/**
 * Serve oneshot extract + recebe POST do browser (aba Superset logada via CDP fetch).
 * Uso interno: scripts/carga-mesas-spin.mjs --local-serve
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.MESAS_SPIN_LOCAL_PORT || "18765");

const routes = {
  "/oneshot-network.js": "tmp/oneshot-network.js",
  "/oneshot-dedicado.js": "tmp/oneshot-dedicado.js",
  "/oneshot-monthly.js": "tmp/oneshot-monthly.js",
};

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  if (req.method === "GET" && routes[url.pathname]) {
    const p = resolve(root, routes[url.pathname]);
    if (!existsSync(p)) {
      res.writeHead(404);
      res.end("missing " + routes[url.pathname]);
      return;
    }
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end(readFileSync(p, "utf8"));
    return;
  }

  const saveMatch = url.pathname.match(/^\/save\/(network|dedicado|monthly)$/);
  if (req.method === "POST" && saveMatch) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const name = process.env.MESAS_SPIN_OUT_BASENAME || "superset";
      const de = process.env.MESAS_SPIN_DE || "day";
      const mes = process.env.MESAS_SPIN_MES || de.slice(0, 7);
      const file =
        saveMatch[1] === "network"
          ? `tmp/${name}-network-${de}.json`
          : saveMatch[1] === "dedicado"
            ? `tmp/${name}-dedicado-${de}.json`
            : `tmp/${name}-monthly-${mes}.json`;
      writeFileSync(resolve(root, file), body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, file }));
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ ok: true, port, pid: process.pid }));
});
