/**
 * Grava snapshot já calculado do Torneio CDA no Supabase.
 * Uso: node scripts/torneio-cda-gravar-snap.mjs --arquivo=tmp/torneio-cda-snap.json
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "cda-vip-setembro-2026";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

function parseEnvFile(caminho) {
  try {
    const raw = readFileSync(caminho, "utf8");
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
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

function headers(serviceKey, extras = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extras,
  };
}

async function supabaseJson(url, serviceKey, path, options = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: headers(serviceKey, options.headers),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method || "GET"} ${path}: ${res.status} ${text.slice(0, 300)}`);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const arquivo = arg("arquivo") ?? "tmp/torneio-cda-snap.json";
  const env = { ...parseEnvFile(resolve(root, ".env.bko-pls")), ...parseEnvFile(resolve(root, ".env")) };
  for (const [k, v] of Object.entries(env)) if (process.env[k] == null) process.env[k] = v;
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");

  const snap = JSON.parse(readFileSync(resolve(root, arquivo), "utf8"));
  const torneios = await supabaseJson(
    supabaseUrl,
    serviceKey,
    `torneio_cda?slug=eq.${encodeURIComponent(SLUG)}&select=id`,
  );
  if (!torneios?.length) throw new Error(`Torneio não encontrado: ${SLUG}`);
  const torneioId = torneios[0].id;
  const syncEm = snap.sincronizadoEm ?? new Date().toISOString();

  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda_ranking?torneio_id=eq.${torneioId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  await supabaseJson(supabaseUrl, serviceKey, "torneio_cda_ranking", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      (snap.ranking ?? []).map((r) => ({
        torneio_id: torneioId,
        user_name: r.userName,
        apelido: r.apelido,
        posicao: r.posicao,
        rodadas_jogadas: r.rodadasJogadas,
        rodadas_ganhas: r.rodadasGanhas,
        valor_apostado: r.valorApostado,
        pontos: r.pontos,
        sincronizado_em: syncEm,
      })),
    ),
  });

  await supabaseJson(
    supabaseUrl,
    serviceKey,
    "torneio_cda_consolidado?on_conflict=torneio_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([
        {
          torneio_id: torneioId,
          rodadas_jogadas: snap.consolidado.rodadasJogadas,
          rodadas_ganhas: snap.consolidado.rodadasGanhas,
          valor_apostado: snap.consolidado.valorApostado,
          sincronizado_em: syncEm,
        },
      ]),
    },
  );

  if ((snap.atividades ?? []).length) {
    // Unique (torneio_id, game_id): mesma rodada BKO pode ter vários jogadores — 1 atividade por game_id.
    const porGame = new Map();
    for (const a of snap.atividades) {
      if (!a.gameId || porGame.has(a.gameId)) continue;
      porGame.set(a.gameId, a);
    }
    await supabaseJson(
      supabaseUrl,
      serviceKey,
      "torneio_cda_atividade?on_conflict=torneio_id,game_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(
          [...porGame.values()].map((a) => ({
            torneio_id: torneioId,
            user_name: a.userName,
            apelido: a.apelido,
            game_id: a.gameId,
            game_type: a.gameType,
            table_name: a.tableName,
            valor_net: a.valorNet,
            mensagem: a.mensagem,
            ocorrido_em: a.ocorridoEm,
          })),
        ),
      },
    );
  }

  console.log(`Snap gravado — ${snap.ranking?.length ?? 0} jogadores · ${snap.consolidado?.rodadasJogadas ?? 0} rodadas`);
  for (const r of (snap.ranking ?? []).slice(0, 5)) {
    console.log(`${r.posicao}. ${r.apelido} — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rodadas`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
