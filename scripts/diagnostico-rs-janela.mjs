#!/usr/bin/env node
/**
 * O Revenue Sentinel respeita `de`/`ate`? Dry-run comparando janelas nos MESMOS IDs.
 *
 * Chama a Edge sync-revenue-sentinel com dry_run=true (não grava nada, não escreve sync_logs)
 * para um punhado de jogadores que já têm rodadas, primeiro na janela completa e depois
 * mês a mês. Se os totais mensais forem iguais ao total da janela completa, a API ignora
 * o período e a quebra por competência é impossível.
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Uso: node scripts/diagnostico-rs-janela.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];
const AMOSTRA = 40;

const JANELAS = [
  ["janela completa", "2025-12-01", "2026-09-15"],
  ["2025-12", "2025-12-01", "2025-12-31"],
  ["2026-05", "2026-05-01", "2026-05-31"],
  ["2026-08", "2026-08-01", "2026-08-31"],
  ["2026-09 (até D-1)", "2026-09-01", "2026-09-15"],
];

function carregarEnv() {
  for (const arquivo of ARQUIVOS_ENV) {
    const caminho = resolve(process.cwd(), arquivo);
    if (!existsSync(caminho)) continue;
    for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linha);
      if (!m) continue;
      const valor = m[2].trim().replace(/^["']|["']$/g, "");
      if (valor && !process.env[m[1]]) process.env[m[1]] = valor;
    }
  }
}

async function main() {
  carregarEnv();
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env.gp-kpi).");
    process.exit(1);
  }

  const resIds = await fetch(
    `${base}/rest/v1/jogadores?select=ext_customer_id,rodadas_spin&operadora_slug=eq.casa_apostas&cda_conta=eq.influencers&jogou_spin=is.true&order=rodadas_spin.desc&limit=${AMOSTRA}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const amostra = await resIds.json();
  const ids = amostra.map((r) => r.ext_customer_id);
  const rodadasConhecidas = amostra.reduce((s, r) => s + Number(r.rodadas_spin ?? 0), 0);
  console.log(`\n## Teste de janela do Revenue Sentinel — ${ids.length} IDs (dry-run, nada é gravado)`);
  console.log(`rodadas destes IDs hoje no banco (lifetime): ${rodadasConhecidas.toLocaleString("pt-BR")}\n`);

  for (const [rotulo, de, ate] of JANELAS) {
    const t0 = Date.now();
    const res = await fetch(`${base}/functions/v1/sync-revenue-sentinel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({
        data_inicio: de,
        data_fim: ate,
        dry_run: true,
        cda_conta: "influencers",
        ext_customer_ids: ids,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.ok === false) {
      console.log(`${rotulo.padEnd(20)} ERRO: ${body.erro}`);
      continue;
    }
    const dias = body.dias_spin ?? 0;
    console.log(
      `${rotulo.padEnd(20)} versao=${body.versao ?? "?"} jogaram_spin=${body.jogaram_spin ?? 0} dias_spin=${dias} missing=${body.missing ?? 0} (${Date.now() - t0}ms)`,
    );
    if (process.argv.includes("--shape") && body.payload_shape) {
      console.log(`   payload_shape: ${JSON.stringify(body.payload_shape)}`);
    }
  }
  console.log(
    "\nSe todas as janelas devolverem os mesmos jogaram_spin, a API ignora de/ate e só existe lifetime.\n",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
