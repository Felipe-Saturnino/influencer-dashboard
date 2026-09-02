/**
 * Gera SQL do snapshot de teste (últimas 24h) a partir do JSON BKO.
 * Uso: node scripts/torneio-cda-gerar-sql-teste.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { montarSnapshot } from "./torneio-cda-bko-sync.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(readFileSync(resolve(root, "tmp/torneio-cda-bko-teste-24h.json"), "utf8"));
const snap = montarSnapshot(payload);
const slug = "cda-vip-setembro-2026";
const syncEm = snap.sincronizadoEm;

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const parts = payload.participantes.map((p) => ({
  user_name: p.userName,
  apelido: p.screenName || p.apelido || p.userName,
  player_id_bko: p.playerId || null,
}));

const lines = [];
lines.push("-- Torneio CDA — teste últimas 24h (4 User Names)");
lines.push(`-- Período: ${payload.periodo.from} → ${payload.periodo.to}`);
lines.push("BEGIN;");
lines.push("");
lines.push("UPDATE public.torneio_cda SET");
lines.push("  nome = 'Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026 (teste 24h)',");
lines.push(`  periodo_inicio = ${sqlStr(payload.periodo.from)}::timestamptz,`);
lines.push(`  periodo_fim = ${sqlStr(payload.periodo.to)}::timestamptz,`);
lines.push("  ativo = true,");
lines.push("  updated_at = now()");
lines.push(`WHERE slug = ${sqlStr(slug)};`);
lines.push("");
lines.push("DELETE FROM public.torneio_cda_participante");
lines.push(`WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(slug)});`);
lines.push("");
lines.push("INSERT INTO public.torneio_cda_participante (torneio_id, user_name, apelido, player_id_bko)");
lines.push("SELECT t.id, v.user_name, v.apelido, v.player_id_bko");
lines.push("FROM public.torneio_cda t");
lines.push("CROSS JOIN (VALUES");
lines.push(
  parts
    .map(
      (p, i) =>
        `  (${sqlStr(p.user_name)}, ${sqlStr(p.apelido)}, ${sqlStr(p.player_id_bko)})${i < parts.length - 1 ? "," : ""}`,
    )
    .join("\n"),
);
lines.push(") AS v(user_name, apelido, player_id_bko)");
lines.push(`WHERE t.slug = ${sqlStr(slug)};`);
lines.push("");
lines.push(
  `DELETE FROM public.torneio_cda_ranking WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(slug)});`,
);
lines.push(
  `DELETE FROM public.torneio_cda_atividade WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(slug)});`,
);
lines.push("");
lines.push(
  "INSERT INTO public.torneio_cda_ranking (torneio_id, user_name, apelido, posicao, rodadas_jogadas, rodadas_ganhas, valor_apostado, pontos, sincronizado_em)",
);
lines.push(
  `SELECT t.id, v.user_name, v.apelido, v.posicao, v.rodadas_jogadas, v.rodadas_ganhas, v.valor_apostado, v.pontos, ${sqlStr(syncEm)}::timestamptz`,
);
lines.push("FROM public.torneio_cda t");
lines.push("CROSS JOIN (VALUES");
lines.push(
  snap.ranking
    .map(
      (r, i) =>
        `  (${sqlStr(r.userName)}, ${sqlStr(r.apelido)}, ${r.posicao}, ${r.rodadasJogadas}, ${r.rodadasGanhas}, ${r.valorApostado}, ${r.pontos})${i < snap.ranking.length - 1 ? "," : ""}`,
    )
    .join("\n"),
);
lines.push(") AS v(user_name, apelido, posicao, rodadas_jogadas, rodadas_ganhas, valor_apostado, pontos)");
lines.push(`WHERE t.slug = ${sqlStr(slug)};`);
lines.push("");
lines.push(
  "INSERT INTO public.torneio_cda_consolidado (torneio_id, rodadas_jogadas, rodadas_ganhas, valor_apostado, sincronizado_em)",
);
lines.push(
  `SELECT t.id, ${snap.consolidado.rodadasJogadas}, ${snap.consolidado.rodadasGanhas}, ${snap.consolidado.valorApostado}, ${sqlStr(syncEm)}::timestamptz`,
);
lines.push(`FROM public.torneio_cda t WHERE t.slug = ${sqlStr(slug)}`);
lines.push("ON CONFLICT (torneio_id) DO UPDATE SET");
lines.push("  rodadas_jogadas = EXCLUDED.rodadas_jogadas,");
lines.push("  rodadas_ganhas = EXCLUDED.rodadas_ganhas,");
lines.push("  valor_apostado = EXCLUDED.valor_apostado,");
lines.push("  sincronizado_em = EXCLUDED.sincronizado_em;");
lines.push("");

if (snap.atividades.length) {
  lines.push(
    "INSERT INTO public.torneio_cda_atividade (torneio_id, user_name, apelido, game_id, game_type, table_name, valor_net, mensagem, ocorrido_em)",
  );
  lines.push(
    "SELECT t.id, v.user_name, v.apelido, v.game_id, v.game_type, v.table_name, v.valor_net, v.mensagem, v.ocorrido_em::timestamptz",
  );
  lines.push("FROM public.torneio_cda t");
  lines.push("CROSS JOIN (VALUES");
  lines.push(
    snap.atividades
      .map((a, i) => {
        const row = [
          sqlStr(a.userName),
          sqlStr(a.apelido),
          sqlStr(a.gameId),
          sqlStr(a.gameType),
          sqlStr(a.tableName),
          a.valorNet,
          sqlStr(a.mensagem),
          sqlStr(a.ocorridoEm),
        ].join(", ");
        return `  (${row})${i < snap.atividades.length - 1 ? "," : ""}`;
      })
      .join("\n"),
  );
  lines.push(") AS v(user_name, apelido, game_id, game_type, table_name, valor_net, mensagem, ocorrido_em)");
  lines.push(`WHERE t.slug = ${sqlStr(slug)}`);
  lines.push("ON CONFLICT (torneio_id, game_id) DO UPDATE SET");
  lines.push("  apelido = EXCLUDED.apelido,");
  lines.push("  mensagem = EXCLUDED.mensagem,");
  lines.push("  valor_net = EXCLUDED.valor_net,");
  lines.push("  ocorrido_em = EXCLUDED.ocorrido_em;");
}

lines.push("");
lines.push("COMMIT;");

mkdirSync(resolve(root, "tmp"), { recursive: true });
const sqlPath = resolve(root, "tmp/torneio-cda-teste-24h.sql");
writeFileSync(sqlPath, lines.join("\n"), "utf8");
writeFileSync(
  resolve(root, "tmp/torneio-cda-snapshot-teste-24h.json"),
  JSON.stringify(
    {
      periodo: payload.periodo,
      ranking: snap.ranking,
      consolidado: snap.consolidado,
      atividadesCount: snap.atividades.length,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`SQL gerado: tmp/torneio-cda-teste-24h.sql`);
console.log("\n--- Ranking ---");
for (const r of snap.ranking) {
  console.log(
    `${r.posicao}. ${r.apelido} (${r.userName}) — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rodadas · ${r.rodadasGanhas} ganhas · R$ ${r.valorApostado.toLocaleString("pt-BR")}`,
  );
}
console.log("\n--- Consolidado ---");
console.log(snap.consolidado);
