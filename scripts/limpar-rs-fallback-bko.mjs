#!/usr/bin/env node
/**
 * Zera as colunas Spin das linhas que vieram do fallback BKO do parser antigo.
 *
 * Assinatura: `rodadas_spin == apostas_spin` com `ggr_spin` nulo ou zero — o
 * `windowTotalsFromBlock(bko)` gravava `bet_count` do backoffice como rodada Spin
 * (ex.: 476 mil rodadas com turnover de R$ 360 em ago/2026).
 *
 * Preserva TAP (visitas, registros, FTD, depósito). Sem `--gravar` só lista.
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso: node scripts/limpar-rs-fallback-bko.mjs [--gravar] [--desde 2025-12-01]
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];
const PAGE = 1000;
const ZERADO = {
  rodadas_spin: 0,
  apostas_spin: 0,
  ggr_spin: null,
  turnover_spin: null,
  jogou_spin: null,
  rodadas_por_jogo: {},
  rodadas_por_mesa: [],
};

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

function num(v) {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

async function main() {
  carregarEnv();
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env.gp-kpi).");
    process.exit(1);
  }
  const desde = arg("desde", "2025-12-01");
  const gravar = process.argv.includes("--gravar");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const linhas = [];
  for (let from = 0; ; from += PAGE) {
    const url =
      `${base}/rest/v1/jogadores_metricas_diarias` +
      `?select=data,ext_customer_id,rodadas_spin,apostas_spin,ggr_spin,turnover_spin` +
      `&operadora_slug=eq.casa_apostas&cda_conta=eq.influencers&data=gte.${desde}&rodadas_spin=gt.0`;
    const res = await fetch(url, { headers: { ...headers, Range: `${from}-${from + PAGE - 1}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const pagina = await res.json();
    linhas.push(...pagina);
    if (pagina.length < PAGE) break;
  }

  const suspeitas = linhas.filter(
    (r) =>
      num(r.rodadas_spin) === num(r.apostas_spin) &&
      (r.ggr_spin == null || num(r.ggr_spin) === 0),
  );
  const rodadasSuspeitas = suspeitas.reduce((s, r) => s + num(r.rodadas_spin), 0);
  const porMes = new Map();
  for (const r of suspeitas) {
    const m = String(r.data).slice(0, 7);
    const x = porMes.get(m) ?? { linhas: 0, rodadas: 0 };
    x.linhas += 1;
    x.rodadas += num(r.rodadas_spin);
    porMes.set(m, x);
  }

  console.log(`\n## Fallback BKO — linhas a zerar${gravar ? "" : " (simulação)"}`);
  console.log(`linhas com rodada no recorte: ${fmt(linhas.length)}\n`);
  for (const [m, x] of [...porMes.entries()].sort()) {
    console.log(`${m}  linhas=${String(x.linhas).padStart(4)}  rodadas=${fmt(x.rodadas)}`);
  }
  console.log(`\ntotal: ${fmt(suspeitas.length)} linhas · ${fmt(rodadasSuspeitas)} rodadas`);

  if (!gravar) {
    console.log("\nNada alterado. Use --gravar para aplicar.\n");
    return;
  }

  let ok = 0;
  for (const r of suspeitas) {
    const url =
      `${base}/rest/v1/jogadores_metricas_diarias` +
      `?operadora_slug=eq.casa_apostas&cda_conta=eq.influencers` +
      `&data=eq.${r.data}&ext_customer_id=eq.${encodeURIComponent(r.ext_customer_id)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(ZERADO),
    });
    if (!res.ok) {
      console.log(`falhou ${r.data} ${r.ext_customer_id}: HTTP ${res.status}`);
      continue;
    }
    ok += 1;
  }
  console.log(`\nzeradas ${fmt(ok)}/${fmt(suspeitas.length)} linhas (TAP preservado)`);
  console.log("Confira com: node scripts/diagnostico-jogadores-aba.mjs\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
