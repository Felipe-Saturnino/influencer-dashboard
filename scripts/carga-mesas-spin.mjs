/**
 * Carga Mesas Spin — um comando: Superset (cookie) → JSON → Supabase (--gravar).
 *
 * Extract: Browser do chat logado (agent /carga-mesas) ou SUPERSET_MESAS_COOKIE / --cdp.
 * Supabase: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (mesmo .env do runner).
 *
 * Uso:
 *   node scripts/carga-mesas-spin.mjs
 *   node scripts/carga-mesas-spin.mjs --ate=2026-09-16
 *   node scripts/carga-mesas-spin.mjs --de=2026-09-01 --ate=2026-09-06 --force
 *   node scripts/carga-mesas-spin.mjs --so-gravar --network=tmp/….json …
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const flag = (nome) => process.argv.includes(`--${nome}`);

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

function loadEnv() {
  return { ...parseEnvFile(resolve(root, ".env.gp-kpi")), ...parseEnvFile(resolve(root, ".env")), ...process.env };
}

function hojeBrtIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function diaSeguinte(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function diaAnterior(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function ultimoDiaSupabase(env) {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ded: null, net: null };
  async function last(tabela) {
    const res = await fetch(`${url}/rest/v1/${tabela}?select=data&order=data.desc&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    return json[0]?.data ?? null;
  }
  const [ded, net] = await Promise.all([last("relatorio_daily_summary"), last("relatorio_network_daily_summary")]);
  return { ded, net };
}

function run(cmd, args, label) {
  console.log(`\n→ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    console.error(`Falhou: ${label}`);
    process.exit(r.status || 1);
  }
}

const env = loadEnv();
const soGravar = flag("so-gravar");
const forceExtract = flag("force");
const viaCdp = flag("cdp");
const cdpUrl = arg("cdp-url") || "http://127.0.0.1:9222";
const ateInclusivoArg = arg("ate");
const deArg = arg("de");

const hoje = hojeBrtIso();
const d1 = diaAnterior(hoje);

let deCarga;
let ateInclusivo;

if (deArg && ateInclusivoArg) {
  deCarga = deArg;
  ateInclusivo = ateInclusivoArg;
} else if (ateInclusivoArg) {
  ateInclusivo = ateInclusivoArg;
  const { ded, net } = await ultimoDiaSupabase(env);
  const last = [ded, net].filter(Boolean).sort().pop() || null;
  deCarga = last ? diaSeguinte(last) : ateInclusivo;
} else {
  const { ded, net } = await ultimoDiaSupabase(env);
  const last = [ded, net].filter(Boolean).sort().pop() || null;
  ateInclusivo = d1;
  if (last && last >= d1) {
    console.log(JSON.stringify({ ok: true, mensagem: "Supabase já está em D-1", last, d1 }, null, 2));
    process.exit(0);
  }
  deCarga = last ? diaSeguinte(last) : d1;
}

if (deCarga > ateInclusivo) {
  console.error(`Intervalo inválido: de=${deCarga} > ate=${ateInclusivo}`);
  process.exit(1);
}

const ateExclusivo = diaSeguinte(ateInclusivo);
const mesDe = `${deCarga.slice(0, 7)}-01`;

const netPath = arg("network") || `tmp/superset-network-${ateInclusivo}.json`;
const dedPath = arg("dedicado") || `tmp/superset-dedicado-${ateInclusivo}.json`;
const monPath = arg("monthly") || `tmp/superset-monthly-${deCarga.slice(0, 7)}.json`;

const extractArgs = forceExtract ? ["--force"] : [];

if (!soGravar) {
  const hasCookie = !!(env.SUPERSET_MESAS_COOKIE || "").trim();
  if (!hasCookie && !viaCdp) {
    console.error(
      "SUPERSET_MESAS_COOKIE ausente. Opções:\n" +
        "  1) /carga-mesas com dashboard 15 logado no Browser do chat (agent — sem cookie)\n" +
        "  2) Cookie em .env.gp-kpi → node scripts/carga-mesas-spin.mjs\n" +
        "  3) Chrome --remote-debugging-port=9222 + dashboard 15 logado → node scripts/carga-mesas-spin.mjs --cdp\n" +
        "  4) Console oneshot → node scripts/carga-mesas-spin.mjs --so-gravar …",
    );
    process.exit(1);
  }

  const extractScript = viaCdp
    ? "scripts/superset-mesas-spin-extract-cdp.mjs"
    : "scripts/superset-mesas-spin-extract-node.mjs";
  const cdpExtra = viaCdp ? [`--cdp=${cdpUrl}`] : [];

  run(
    node,
    [
      resolve(root, extractScript),
      "network",
      deCarga,
      ateExclusivo,
      `--out=${netPath}`,
      ...cdpExtra,
      ...extractArgs,
    ],
    `Extract Network ${deCarga} → ${ateExclusivo} (exclusivo)`,
  );
  run(
    node,
    [
      resolve(root, extractScript),
      "dedicado",
      deCarga,
      ateExclusivo,
      `--out=${dedPath}`,
      ...cdpExtra,
      ...extractArgs,
    ],
    `Extract Dedicado ${deCarga} → ${ateExclusivo}`,
  );
  run(
    node,
    [
      resolve(root, extractScript),
      "monthly",
      mesDe,
      ateExclusivo,
      `--out=${monPath}`,
      ...cdpExtra,
      ...extractArgs,
    ],
    `Extract Monthly ${mesDe} → ${ateExclusivo}`,
  );
}

for (const p of [netPath, dedPath, monPath]) {
  if (!existsSync(resolve(root, p))) {
    console.error(`Arquivo ausente: ${p}`);
    process.exit(1);
  }
}

run(
  node,
  [
    resolve(root, "scripts/superset-mesas-spin-run.mjs"),
    `--network=${netPath}`,
    `--dedicado=${dedPath}`,
    `--monthly=${monPath}`,
    `--de=${deCarga}`,
    `--ate=${ateInclusivo}`,
    "--preencher-faltantes",
    "--escrever-sql",
    "--gravar",
  ],
  `Gravar Supabase ${deCarga}…${ateInclusivo}`,
);

const { ded, net } = await ultimoDiaSupabase(env);
console.log("\nValidação:");
console.log("  Último dia Dedicado:", ded);
console.log("  Último dia Network:", net);
