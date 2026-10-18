#!/usr/bin/env node
/**
 * Outliers de rodadas Spin por competência (read-only).
 * Usa o bucket mensal gravado (dia 1) e compara com o dry-run do RS para os
 * mesmos jogadores, para separar erro de parser de dado do RS.
 *
 * Uso: node scripts/diagnostico-rs-competencia-outliers.mjs [--mes 2026-08]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];

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

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("pt-BR");
}

function anon(id) {
  const s = String(id ?? "");
  return s.length <= 4 ? "***" : `…${s.slice(-4)}`;
}

async function main() {
  carregarEnv();
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const mes = arg("mes", "2026-08");
  const bucket = `${mes}-01`;

  const res = await fetch(
    `${base}/rest/v1/jogadores_metricas_diarias` +
      `?select=ext_customer_id,rodadas_spin,apostas_spin,ggr_spin,turnover_spin` +
      `&operadora_slug=eq.casa_apostas&cda_conta=eq.influencers&data=eq.${bucket}` +
      `&rodadas_spin=gt.0&order=rodadas_spin.desc&limit=15`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const topo = await res.json();

  console.log(`\n## Outliers de rodadas — bucket ${bucket}\n`);
  console.log("ID Ext   rodadas      apostas      GGR            turnover");
  console.log("-------  -----------  -----------  -------------  -------------");
  for (const r of topo) {
    console.log(
      `${anon(r.ext_customer_id).padEnd(7)}  ${fmt(r.rodadas_spin).padStart(11)}  ${fmt(r.apostas_spin).padStart(11)}  ${fmt(r.ggr_spin).padStart(13)}  ${fmt(r.turnover_spin).padStart(13)}`,
    );
  }

  const ids = topo.slice(0, 5).map((r) => r.ext_customer_id);
  if (!ids.length) {
    console.log("\n(sem linhas no bucket)");
    return;
  }

  console.log(`\n## Dry-run do RS para os 5 maiores — mesma janela e janelas vizinhas\n`);
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const janelas = [
    [`${mes} inteiro`, `${mes}-01`, ultimo],
    [`${mes} 1ª semana`, `${mes}-01`, `${mes}-07`],
    [`${mes} só dia 1`, `${mes}-01`, `${mes}-01`],
  ];
  for (const [rotulo, de, ate] of janelas) {
    const r = await fetch(`${base}/functions/v1/sync-revenue-sentinel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({
        data_inicio: de,
        data_fim: ate,
        cda_conta: "influencers",
        dry_run: true,
        ext_customer_ids: ids,
      }),
    });
    const b = await r.json().catch(() => ({}));
    if (b.ok === false) {
      console.log(`${rotulo.padEnd(18)} ERRO: ${b.erro}`);
      continue;
    }
    console.log(
      `${rotulo.padEnd(18)} jogaram_spin=${b.jogaram_spin ?? 0}  dias_spin=${b.dias_spin ?? 0}  shape=${b.payload_shape ? JSON.stringify({ spin: b.payload_shape.spin_keys, dias: b.payload_shape.n_spin_days }) : "?"}`,
    );
  }
  console.log("");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
