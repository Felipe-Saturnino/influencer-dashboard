#!/usr/bin/env node
/**
 * Backfill Revenue Sentinel competência por competência (equivalente ao
 * scripts/manual-supabase-backfill-revenue-sentinel-mensal.sql, executável).
 *
 * 1. Limpa só as colunas Spin de jogadores_metricas_diarias (preserva TAP).
 * 2. Chama a Edge sync-revenue-sentinel uma vez por mês, em série, esperando cada uma.
 *
 * Sem `--gravar` faz dry-run (nenhuma escrita; a Edge recebe dry_run=true).
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso: node scripts/backfill-rs-competencias.mjs --gravar [--de 2025-12 --ate 2026-09]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];
const OPERADORA = "casa_apostas";
const CONTA = "influencers";
/** D-1 em São Paulo — nunca o dia corrente incompleto. */
const ONTEM_SP = (() => {
  const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  agora.setDate(agora.getDate() - 1);
  return agora.toISOString().slice(0, 10);
})();

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

/** Competências YYYY-MM de `de` até `ate`, inclusive. */
function competencias(de, ate) {
  const out = [];
  let [y, m] = de.split("-").map(Number);
  const [yFim, mFim] = ate.split("-").map(Number);
  while (y < yFim || (y === yFim && m <= mFim)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function ultimoDia(competencia) {
  const [y, m] = competencia.split("-").map(Number);
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return fim > ONTEM_SP ? ONTEM_SP : fim;
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString("pt-BR");
}

async function limparColunasSpin(base, key, desde) {
  const url =
    `${base}/rest/v1/jogadores_metricas_diarias` +
    `?operadora_slug=eq.${OPERADORA}&cda_conta=eq.${CONTA}&data=gte.${desde}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,count=exact",
    },
    body: JSON.stringify({
      rodadas_spin: 0,
      apostas_spin: 0,
      ggr_spin: null,
      turnover_spin: null,
      jogou_spin: null,
      rodadas_por_jogo: {},
      rodadas_por_mesa: [],
    }),
  });
  if (!res.ok) throw new Error(`limpeza HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const linhas = await res.json().catch(() => []);
  return Array.isArray(linhas) ? linhas.length : 0;
}

async function syncCompetencia(base, key, competencia, gravar) {
  const dataInicio = `${competencia}-01`;
  const dataFim = ultimoDia(competencia);
  const t0 = Date.now();
  const res = await fetch(`${base}/functions/v1/sync-revenue-sentinel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify({
      data_inicio: dataInicio,
      data_fim: dataFim,
      cda_conta: CONTA,
      atualizar_cadastro: false,
      dry_run: !gravar,
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { competencia, dataInicio, dataFim, ms: Date.now() - t0, http: res.status, body };
}

async function main() {
  carregarEnv();
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env.gp-kpi).");
    process.exit(1);
  }
  const gravar = process.argv.includes("--gravar");
  const meses = competencias(arg("de", "2025-12"), arg("ate", ONTEM_SP.slice(0, 7)));

  console.log(`\n## Backfill Revenue Sentinel — ${meses.length} competências${gravar ? "" : " (DRY-RUN)"}`);
  console.log(`${meses[0]} → ${meses.at(-1)} · D-1 = ${ONTEM_SP}\n`);

  if (gravar) {
    const limpas = await limparColunasSpin(base, key, `${meses[0]}-01`);
    console.log(`limpeza das colunas Spin: ${fmt(limpas)} linhas (TAP preservado)\n`);
  } else {
    console.log("limpeza não executada (falta --gravar)\n");
  }

  let totalDias = 0;
  let totalUpsert = 0;
  for (const competencia of meses) {
    const r = await syncCompetencia(base, key, competencia, gravar);
    const b = r.body ?? {};
    if (b.ok === false) {
      console.log(`${competencia}  ERRO: ${b.erro ?? `HTTP ${r.http}`}`);
      continue;
    }
    totalDias += b.dias_spin ?? 0;
    totalUpsert += b.diario_upsert ?? 0;
    console.log(
      `${competencia}  ${r.dataInicio}→${r.dataFim}  jogaram_spin=${fmt(b.jogaram_spin)}  dias=${fmt(b.dias_spin)}  upsert=${fmt(b.diario_upsert)}  missing=${fmt(b.missing)}  (${(r.ms / 1000).toFixed(1)}s)`,
    );
  }

  console.log(
    `\ntotal: dias_spin=${fmt(totalDias)} · diario_upsert=${fmt(totalUpsert)}` +
      `\nConfira com: node scripts/diagnostico-jogadores-aba.mjs\n`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
