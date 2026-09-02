/**
 * Aplica teste 24h no Supabase: atualiza torneio, participantes e snapshot.
 * Uso (env já carregado):
 *   node scripts/torneio-cda-aplicar-teste-24h.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { montarSnapshot } from "./torneio-cda-bko-sync.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "cda-vip-setembro-2026";

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
  const fileEnv = {
    ...parseEnvFile(resolve(root, ".env")),
    ...parseEnvFile(resolve(root, ".env.bko-pls")),
  };
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] == null) process.env[k] = v;
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Defina SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  }

  const payload = JSON.parse(readFileSync(resolve(root, "tmp/torneio-cda-bko-teste-24h.json"), "utf8"));
  const snap = montarSnapshot(payload);

  const torneios = await supabaseJson(
    supabaseUrl,
    serviceKey,
    `torneio_cda?slug=eq.${encodeURIComponent(SLUG)}&select=id,slug,ativo`,
  );
  if (!torneios?.length) throw new Error(`Torneio não encontrado: ${SLUG}`);
  const torneioId = torneios[0].id;

  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda?id=eq.${torneioId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      nome: "Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026 (teste 24h)",
      periodo_inicio: payload.periodo.from,
      periodo_fim: payload.periodo.to,
      ativo: true,
      updated_at: new Date().toISOString(),
    }),
  });
  console.log("torneio_cda atualizado (ativo=true, período 24h)");

  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda_participante?torneio_id=eq.${torneioId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  const participantes = payload.participantes.map((p) => ({
    torneio_id: torneioId,
    user_name: p.userName,
    apelido: p.screenName || p.apelido || p.userName,
    player_id_bko: p.playerId ?? null,
  }));

  await supabaseJson(supabaseUrl, serviceKey, "torneio_cda_participante", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(participantes),
  });
  console.log(`${participantes.length} participante(s) gravados`);

  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda_ranking?torneio_id=eq.${torneioId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda_atividade?torneio_id=eq.${torneioId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  const syncEm = snap.sincronizadoEm;
  await supabaseJson(supabaseUrl, serviceKey, "torneio_cda_ranking", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      snap.ranking.map((r) => ({
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

  if (snap.atividades.length) {
    await supabaseJson(
      supabaseUrl,
      serviceKey,
      "torneio_cda_atividade?on_conflict=torneio_id,game_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(
          snap.atividades.map((a) => ({
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

  console.log("\n--- Ranking gravado ---");
  for (const r of snap.ranking) {
    console.log(
      `${r.posicao}. ${r.apelido} — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rodadas`,
    );
  }
  console.log(
    `\nConsolidado: ${snap.consolidado.rodadasJogadas} rodadas · ${snap.consolidado.rodadasGanhas} ganhas · R$ ${snap.consolidado.valorApostado.toLocaleString("pt-BR")}`,
  );
  console.log(`Atividades: ${snap.atividades.length}`);
  console.log("\nSupabase atualizado. Abra /TorneioCDA");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
