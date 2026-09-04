/**
 * Merge delta BKO + cache local → snapshot → Supabase.
 *
 * Cache: tmp/torneio-cda-cache.json
 * Delta: tmp/torneio-cda-delta.json  ({ participantes: [{ userName, games[] }], periodo? })
 *
 *   node scripts/torneio-cda-merge-sync.mjs
 *   node scripts/torneio-cda-merge-sync.mjs --delta=tmp/torneio-cda-delta.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  CDA_MESAS_BKO,
  montarSnapshot,
  resolverNomeExibicaoTorneio,
} from "./torneio-cda-bko-sync.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_PATH = resolve(root, "tmp/torneio-cda-cache.json");
const SNAP_PATH = resolve(root, "tmp/torneio-cda-snap.json");
const PERIODO_INICIO = "2026-09-03T19:54:18.957Z";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

function slimGame(g) {
  return {
    gameId: g.gameId,
    tableId: g.tableId,
    tableName: g.tableName ?? "",
    gameType: g.gameType ?? "",
    startedAt: g.startedAt,
    transactions: (g.transactions ?? []).map((tx) => ({
      bets: (tx.bets ?? []).map((b) => ({
        totals: {
          amount: Number(b.totals?.amount ?? 0),
          payout: Number(b.totals?.payout ?? 0),
          net: Number(b.totals?.net ?? 0),
        },
      })),
    })),
  };
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) {
    return {
      periodoInicio: PERIODO_INICIO,
      atualizadoEm: null,
      participantes: {},
    };
  }
  return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
}

function mergeDelta(cache, delta) {
  const fromMs = Date.parse(cache.periodoInicio || PERIODO_INICIO);
  const toMs = Date.parse(delta.periodo?.to ?? new Date().toISOString());
  let novos = 0;

  for (const p of delta.participantes ?? []) {
    const key = String(p.userName);
    if (!cache.participantes[key]) {
      cache.participantes[key] = {
        userName: key,
        apelido: p.apelido,
        screenName: p.screenName ?? null,
        playerId: p.playerId,
        gamesById: {},
      };
    }
    const slot = cache.participantes[key];
    if (p.apelido) slot.apelido = p.apelido;
    if (p.screenName != null) slot.screenName = p.screenName;
    if (p.playerId) slot.playerId = p.playerId;

    for (const g of p.games ?? []) {
      if (!CDA_MESAS_BKO.has(g.tableId)) continue;
      const started = Number(g.startedAt ?? 0);
      if (started && (started < fromMs || started > toMs)) continue;
      const id = g.gameId;
      if (!id) continue;
      if (!slot.gamesById[id]) {
        slot.gamesById[id] = slimGame(g);
        novos += 1;
      }
    }
  }

  cache.atualizadoEm = new Date().toISOString();
  cache.periodo = { from: cache.periodoInicio || PERIODO_INICIO, to: delta.periodo?.to ?? new Date().toISOString() };
  return { cache, novos };
}

function cacheToPayload(cache) {
  const participantes = Object.values(cache.participantes).map((p) => ({
    userName: p.userName,
    screenName: p.screenName,
    apelido: resolverNomeExibicaoTorneio(p),
    playerId: p.playerId,
    games: Object.values(p.gamesById),
  }));
  return {
    extraidoEm: cache.atualizadoEm ?? new Date().toISOString(),
    periodo: cache.periodo ?? { from: cache.periodoInicio || PERIODO_INICIO, to: new Date().toISOString() },
    participantes,
  };
}

function knownIdsMap(cache) {
  const out = {};
  for (const [k, p] of Object.entries(cache.participantes)) {
    out[k] = Object.keys(p.gamesById ?? {});
  }
  return out;
}

mkdirSync(resolve(root, "tmp"), { recursive: true });
const deltaPath = arg("delta") ?? "tmp/torneio-cda-delta.json";
const cache = loadCache();
const delta = JSON.parse(readFileSync(resolve(root, deltaPath), "utf8"));
const { cache: merged, novos } = mergeDelta(cache, delta);
writeFileSync(CACHE_PATH, JSON.stringify(merged), "utf8");
writeFileSync(resolve(root, "tmp/torneio-cda-known-ids.json"), JSON.stringify(knownIdsMap(merged)), "utf8");

const payload = cacheToPayload(merged);
const snap = montarSnapshot(payload);
writeFileSync(SNAP_PATH, JSON.stringify(snap), "utf8");

console.log(`Cache: +${novos} rodada(s) nova(s) · total ${snap.consolidado.rodadasJogadas}`);
console.log("--- Top 5 ---");
for (const r of snap.ranking.slice(0, 5)) {
  console.log(`${r.posicao}. ${r.apelido} — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rodadas`);
}

const gravar = spawnSync(process.execPath, ["scripts/torneio-cda-gravar-snap.mjs", `--arquivo=${SNAP_PATH}`], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});
if (gravar.status !== 0) process.exit(gravar.status ?? 1);
