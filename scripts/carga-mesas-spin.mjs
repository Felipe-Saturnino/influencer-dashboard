/**
 * Carga Mesas Spin — um comando: Grafana/ClickHouse → JSON → Supabase.
 *
 * Extract: Browser do chat logado (agent /carga-mesas) ou cookie Pomerium.
 * Supabase: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (mesmo .env do runner).
 *
 * Uso:
 *   node scripts/carga-mesas-spin.mjs
 *   node scripts/carga-mesas-spin.mjs --ate=2026-09-16
 *   node scripts/carga-mesas-spin.mjs --de=2026-09-01 --ate=2026-09-06
 *   node scripts/carga-mesas-spin.mjs --so-gravar --network=tmp/….json …
 *
 * Env do modo local: GRAFANA_MESAS_COOKIE ou GRAFANA_GP_KPI_COOKIE.
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
const ateInclusivoArg = arg("ate");
const deArg = arg("de");

const hoje = hojeBrtIso();
const d1 = diaAnterior(hoje);

if (deArg && !ateInclusivoArg) {
  console.error("--de exige --ate (datas inclusivas).");
  process.exit(1);
}
if (ateInclusivoArg && ateInclusivoArg >= hoje) {
  console.error(
    `Não é permitido carregar D-0 ou futuro: --ate=${ateInclusivoArg}; hoje em Brasília=${hoje}.`,
  );
  process.exit(1);
}

let deCarga;
let ateInclusivo;

if (deArg && ateInclusivoArg) {
  deCarga = deArg;
  ateInclusivo = ateInclusivoArg;
} else if (ateInclusivoArg) {
  ateInclusivo = ateInclusivoArg;
  const { ded, net } = await ultimoDiaSupabase(env);
  const proximos = [ded, net].filter(Boolean).map(diaSeguinte).sort();
  deCarga = proximos[0] || ateInclusivo;
} else {
  const { ded, net } = await ultimoDiaSupabase(env);
  ateInclusivo = d1;
  if (ded && net && ded >= d1 && net >= d1) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mensagem: "Dedicado e Network já estão em D-1",
          ded,
          net,
          d1,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }
  const proximos = [ded, net].filter(Boolean).map(diaSeguinte).sort();
  deCarga = proximos[0] || d1;
}

if (deCarga > ateInclusivo) {
  console.error(`Intervalo inválido: de=${deCarga} > ate=${ateInclusivo}`);
  process.exit(1);
}

const mesCarga = ateInclusivo.slice(0, 7);
const netPath =
  arg("network") || `tmp/grafana-mesas-network-${ateInclusivo}.json`;
const dedPath =
  arg("dedicado") || `tmp/grafana-mesas-dedicado-${ateInclusivo}.json`;
const monPath =
  arg("monthly") || `tmp/grafana-mesas-monthly-${mesCarga}.json`;

if (!soGravar) {
  const hasCookie = !!(
    env.GRAFANA_MESAS_COOKIE ||
    env.GRAFANA_GP_KPI_COOKIE ||
    ""
  ).trim();
  if (!hasCookie) {
    console.error(
      "Cookie Grafana ausente. Opções:\n" +
        "  1) /carga-mesas com Grafana logado no Browser do chat (sem copiar cookie)\n" +
        "  2) GRAFANA_MESAS_COOKIE ou GRAFANA_GP_KPI_COOKIE no .env.gp-kpi\n" +
        "  3) JSON do Browser → node scripts/carga-mesas-spin.mjs --so-gravar …",
    );
    process.exit(1);
  }

  run(
    node,
    [
      resolve(root, "scripts/grafana-mesas-spin-extract-node.mjs"),
      `--de=${deCarga}`,
      `--ate=${ateInclusivo}`,
      `--network-out=${netPath}`,
      `--dedicado-out=${dedPath}`,
      `--monthly-out=${monPath}`,
    ],
    `Extract Grafana ${deCarga}…${ateInclusivo} (Network + Dedicado + Monthly)`,
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
    resolve(root, "scripts/mesas-spin-run.mjs"),
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
