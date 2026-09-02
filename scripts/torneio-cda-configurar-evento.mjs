/**
 * Configura torneio CDA para o dia do evento (participantes + período).
 * NÃO busca jogos — só cadastro. Sync de resultados: scripts/torneio-cda-bko-sync.mjs no dia.
 *
 *   node scripts/torneio-cda-configurar-evento.mjs
 *
 * Env: SUPABASE_URL / VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.bko-pls)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "cda-vip-setembro-2026";

/** 03/09/2026 America/Sao_Paulo (00:00 → 23:59:59.999) em UTC */
const PERIODO = {
  inicio: "2026-09-03T03:00:00.000Z",
  fim: "2026-09-04T02:59:59.999Z",
};

/** Nomes travados para a UI (não usar Screen Name do BKO). */
const PARTICIPANTES = [
  { user_name: "2205336", apelido: "Alessandro Tomazelli", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2205336" },
  { user_name: "2204772", apelido: "Eliane Luiza", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204772" },
  { user_name: "2204766", apelido: "Fernando Luis", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204766" },
  { user_name: "2204764", apelido: "Flavio Luis", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204764" },
  { user_name: "2204743", apelido: "Humberto dos Anjos", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204743" },
  { user_name: "2204823", apelido: "Pedro Alexandre", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204823" },
  { user_name: "2204769", apelido: "Flavio Hirata", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204769" },
  { user_name: "2204759", apelido: "Rodrigo Junqueira", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204759" },
  { user_name: "2207973", apelido: "Renato Silva", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2207973" },
  { user_name: "2204755", apelido: "Luiz Viveiros", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2204755" },
  { user_name: "2208185", apelido: "Miqueas Marcelo", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2208185" },
  { user_name: "548736", apelido: "Rodrigo Simonini", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-548736" },
  { user_name: "2208087", apelido: "Bruno Yela", player_id_bko: "casadeapostas.if_dgc.L011_358_56.CDA-2208087" },
];

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

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function gerarSql() {
  const lines = [];
  lines.push("-- Torneio CDA — configuração evento 03/09/2026 (sem resultados)");
  lines.push("BEGIN;");
  lines.push("");
  lines.push("UPDATE public.torneio_cda SET");
  lines.push("  nome = 'Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026',");
  lines.push(`  periodo_inicio = ${sqlStr(PERIODO.inicio)}::timestamptz,`);
  lines.push(`  periodo_fim = ${sqlStr(PERIODO.fim)}::timestamptz,`);
  lines.push("  ativo = false,");
  lines.push("  updated_at = now()");
  lines.push(`WHERE slug = ${sqlStr(SLUG)};`);
  lines.push("");
  lines.push("DELETE FROM public.torneio_cda_atividade");
  lines.push(`WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(SLUG)});`);
  lines.push("DELETE FROM public.torneio_cda_ranking");
  lines.push(`WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(SLUG)});`);
  lines.push("DELETE FROM public.torneio_cda_consolidado");
  lines.push(`WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(SLUG)});`);
  lines.push("DELETE FROM public.torneio_cda_participante");
  lines.push(`WHERE torneio_id = (SELECT id FROM public.torneio_cda WHERE slug = ${sqlStr(SLUG)});`);
  lines.push("");
  lines.push("INSERT INTO public.torneio_cda_participante (torneio_id, user_name, apelido, player_id_bko)");
  lines.push("SELECT t.id, v.user_name, v.apelido, v.player_id_bko");
  lines.push("FROM public.torneio_cda t");
  lines.push("CROSS JOIN (VALUES");
  lines.push(
    PARTICIPANTES.map(
      (p, i) =>
        `  (${sqlStr(p.user_name)}, ${sqlStr(p.apelido)}, ${sqlStr(p.player_id_bko)})${i < PARTICIPANTES.length - 1 ? "," : ""}`,
    ).join("\n"),
  );
  lines.push(") AS v(user_name, apelido, player_id_bko)");
  lines.push(`WHERE t.slug = ${sqlStr(SLUG)};`);
  lines.push("");
  lines.push("COMMIT;");
  return lines.join("\n");
}

async function aplicarSupabase(supabaseUrl, serviceKey) {
  const torneios = await supabaseJson(
    supabaseUrl,
    serviceKey,
    `torneio_cda?slug=eq.${encodeURIComponent(SLUG)}&select=id,slug`,
  );
  if (!torneios?.length) throw new Error(`Torneio não encontrado: ${SLUG}`);
  const torneioId = torneios[0].id;

  await supabaseJson(supabaseUrl, serviceKey, `torneio_cda?id=eq.${torneioId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      nome: "Torneio VIP Casa de Apostas e Spin Gaming — Setembro 2026",
      periodo_inicio: PERIODO.inicio,
      periodo_fim: PERIODO.fim,
      ativo: false,
      updated_at: new Date().toISOString(),
    }),
  });

  for (const tabela of ["torneio_cda_atividade", "torneio_cda_ranking", "torneio_cda_consolidado", "torneio_cda_participante"]) {
    await supabaseJson(supabaseUrl, serviceKey, `${tabela}?torneio_id=eq.${torneioId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }

  await supabaseJson(supabaseUrl, serviceKey, "torneio_cda_participante", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      PARTICIPANTES.map((p) => ({
        torneio_id: torneioId,
        user_name: p.user_name,
        apelido: p.apelido,
        player_id_bko: p.player_id_bko,
      })),
    ),
  });

  console.log(`Supabase OK — ${PARTICIPANTES.length} participantes · período 03/09/2026 · ativo=false`);
}

async function main() {
  const fileEnv = {
    ...parseEnvFile(resolve(root, ".env")),
    ...parseEnvFile(resolve(root, ".env.bko-pls")),
  };
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] == null) process.env[k] = v;
  }

  mkdirSync(resolve(root, "tmp"), { recursive: true });
  const sqlPath = resolve(root, "tmp/torneio-cda-configurar-evento-2026-09-03.sql");
  writeFileSync(sqlPath, gerarSql(), "utf8");
  console.log(`SQL: tmp/torneio-cda-configurar-evento-2026-09-03.sql`);

  console.log("\nParticipantes:");
  for (const p of PARTICIPANTES) {
    console.log(`  ${p.user_name} → ${p.apelido}`);
  }
  console.log(`\nPeríodo UTC: ${PERIODO.inicio} → ${PERIODO.fim}`);
  console.log("(equivale a 03/09/2026 00:00–23:59:59 America/Sao_Paulo)");

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.log("\nSem service role — rode o SQL no Editor. Para aplicar via API, defina SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  await aplicarSupabase(supabaseUrl, serviceKey);
  console.log("\nNo dia do torneio:");
  console.log("  1. UPDATE torneio_cda SET ativo = true WHERE slug = 'cda-vip-setembro-2026';");
  console.log("  2. node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026  (várias vezes)");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
