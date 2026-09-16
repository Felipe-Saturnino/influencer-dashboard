#!/usr/bin/env node
/**
 * Dry-run GET Data Export: catalog, schema e amostra de
 * operator-player-rounds / operator-player-snapshots.
 * Não grava no banco. IDs longos são redigidos no print.
 *
 * Precisa de RS_API_KEY (dsk_) — a mesma da Edge. Coloque em .env.gp-kpi
 * (ficheiro gitignored) ou publique a Edge com probe_datasets e use o fallback.
 *
 * Uso: node scripts/diagnostico-rs-rounds.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ARQUIVOS_ENV = [".env.gp-kpi", ".env.bko-pls", ".env.local", ".env"];
const DEFAULT_BASE = "https://api.spingaming.com.br/api/v1/data";
const DE = "2026-08-01";
const ATE = "2026-08-07";
const ID_KEY = /^(id|.*_id|external_id|ext_customer_id|crm_id|email|phone|cpf|cnpj|name|username)$/i;
const MESA_KEY = /table|mesa|game|jogo/i;
const DATA_KEY = /date|dia|day|snapshot|played_at|created_at/i;

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

function asRec(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}

function envelopeRows(payload) {
  const rec = asRec(payload);
  if (!rec) return Array.isArray(payload) ? payload : [];
  for (const k of ["rows", "items", "data", "results", "records", "hits"]) {
    if (Array.isArray(rec[k])) return rec[k];
  }
  return [];
}

function redactVal(key, v) {
  if (v == null) return v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (DATA_KEY.test(key) || MESA_KEY.test(key) || /^\d{4}-\d{2}-\d{2}/.test(v)) return v;
    if (ID_KEY.test(key) || /CDA-\d+/i.test(v) || v.length > 24) {
      return v.length <= 4 ? "***" : `…${v.slice(-4)}`;
    }
    return v.length > 48 ? `${v.slice(0, 24)}…` : v;
  }
  if (Array.isArray(v)) return `[array:${v.length}]`;
  if (typeof v === "object") return `{keys:${Object.keys(v).slice(0, 12).join(",")}}`;
  return typeof v;
}

function summarizeSample(payload, http) {
  const rec = asRec(payload);
  const rows = envelopeRows(payload);
  const first = asRec(rows[0]) ?? (rows.length === 0 ? asRec(payload) : null);
  const cols = first ? Object.keys(first) : [];
  const uniques = {};
  for (const col of cols) {
    if (!MESA_KEY.test(col) && !DATA_KEY.test(col)) continue;
    const set = new Set();
    for (const row of rows.slice(0, 200)) {
      const r = asRec(row);
      if (!r || r[col] == null) continue;
      set.add(String(r[col]).slice(0, 80));
      if (set.size >= 12) break;
    }
    if (set.size) uniques[col] = [...set];
  }
  return {
    http,
    envelope_keys: rec ? Object.keys(rec).slice(0, 24) : [],
    n_rows: rows.length,
    total: rec?.total ?? rec?.count ?? rec?.row_count ?? null,
    colunas: cols,
    amostra_redigida: first ? Object.fromEntries(cols.map((k) => [k, redactVal(k, first[k])])) : null,
    valores_mesa_ou_data: uniques,
  };
}

async function rsGet(apiBase, apiKey, path, query = {}) {
  const url = new URL(`${apiBase}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 400) };
  }
  return { status: res.status, payload };
}

function listarCatalogo(payload) {
  if (!payload) return "(vazio)";
  if (Array.isArray(payload)) {
    return payload
      .map((x) => (typeof x === "string" ? x : x?.id ?? x?.slug ?? x?.name ?? JSON.stringify(x).slice(0, 80)))
      .join("\n  ");
  }
  const rec = asRec(payload);
  if (!rec) return String(payload).slice(0, 400);
  const lista = rec.datasets ?? rec.items ?? rec.catalog ?? rec.data;
  if (Array.isArray(lista)) {
    return lista
      .map((x) =>
        typeof x === "string"
          ? x
          : `${x?.id ?? x?.slug ?? x?.name ?? "?"}  ${x?.description ?? ""}`.trim(),
      )
      .join("\n  ");
  }
  return `chaves: ${Object.keys(rec).slice(0, 24).join(", ")}`;
}

function printSchema(titulo, bloco) {
  console.log(`\n### ${titulo}  HTTP ${bloco?.http}`);
  const p = bloco?.payload;
  if (!p) {
    console.log("(sem payload)");
    return;
  }
  const cols = p.columns ?? p.fields ?? p.schema ?? p;
  if (Array.isArray(cols)) {
    for (const c of cols.slice(0, 40)) {
      if (typeof c === "string") console.log(`  - ${c}`);
      else console.log(`  - ${c.name ?? c.column ?? c.field ?? "?"}  ${c.type ?? c.data_type ?? ""}`.trim());
    }
    return;
  }
  if (cols && typeof cols === "object") {
    for (const [k, v] of Object.entries(cols).slice(0, 40)) {
      const tipo = typeof v === "object" && v ? v.type ?? v.data_type ?? JSON.stringify(v).slice(0, 60) : v;
      console.log(`  - ${k}: ${tipo}`);
    }
    return;
  }
  console.log(JSON.stringify(p).slice(0, 800));
}

function printAmostra(titulo, porOp) {
  console.log(`\n### ${titulo}`);
  for (const [op, s] of Object.entries(porOp ?? {})) {
    console.log(
      `\n[${op}] HTTP ${s.http}  linhas=${s.n_rows}  total=${s.total ?? "—"}  envelope=${(s.envelope_keys ?? []).join(",")}`,
    );
    console.log(`colunas: ${(s.colunas ?? []).join(", ") || "(nenhuma)"}`);
    if (s.amostra_redigida) console.log("amostra:", JSON.stringify(s.amostra_redigida));
    for (const [col, vals] of Object.entries(s.valores_mesa_ou_data ?? {})) {
      console.log(`  ${col}: ${vals.join(" | ")}`);
    }
  }
}

async function probeDireto(apiBase, apiKey) {
  const [status, catalog, schemaRounds, schemaSnaps] = await Promise.all([
    rsGet(apiBase, apiKey, "/v1/status"),
    rsGet(apiBase, apiKey, "/v1/catalog"),
    rsGet(apiBase, apiKey, "/v1/schema/operator-player-rounds"),
    rsGet(apiBase, apiKey, "/v1/schema/operator-player-snapshots"),
  ]);
  const rounds = {};
  const snapshots = {};
  for (const op of ["casa_apostas", "Casa de Apostas"]) {
    const q = { start_date: DE, end_date: ATE, operator: op, limit: "25" };
    const r = await rsGet(apiBase, apiKey, "/v1/datasets/operator-player-rounds", q);
    const s = await rsGet(apiBase, apiKey, "/v1/datasets/operator-player-snapshots", q);
    rounds[op] = summarizeSample(r.payload, r.status);
    snapshots[op] = summarizeSample(s.payload, s.status);
  }
  return {
    ok: true,
    probe: "datasets",
    periodo: { de: DE, ate: ATE },
    status: { http: status.status, payload: status.payload },
    catalog: { http: catalog.status, payload: catalog.payload },
    schema_rounds: { http: schemaRounds.status, payload: schemaRounds.payload },
    schema_snapshots: { http: schemaSnaps.status, payload: schemaSnaps.payload },
    rounds,
    snapshots,
  };
}

async function probeViaEdge(supabaseUrl, serviceKey) {
  const res = await fetch(`${supabaseUrl}/functions/v1/sync-revenue-sentinel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      probe_datasets: true,
      dry_run: true,
      data_inicio: DE,
      data_fim: ATE,
    }),
  });
  return res.json();
}

function imprimir(body) {
  console.log(`período ${body.periodo?.de} → ${body.periodo?.ate}`);
  console.log(`\n### GET /v1/status  HTTP ${body.status?.http}`);
  console.log(JSON.stringify(body.status?.payload).slice(0, 400));
  console.log(`\n### GET /v1/catalog  HTTP ${body.catalog?.http}`);
  console.log(" ", listarCatalogo(body.catalog?.payload));
  printSchema("schema operator-player-rounds", body.schema_rounds);
  printSchema("schema operator-player-snapshots", body.schema_snapshots);
  printAmostra("amostra operator-player-rounds (25 linhas, ago/1–7)", body.rounds);
  printAmostra("amostra operator-player-snapshots (25 linhas, ago/1–7)", body.snapshots);
  console.log("");
}

async function main() {
  carregarEnv();
  const apiBase = (process.env.RS_API_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const apiKey = process.env.RS_API_KEY?.trim() ?? "";
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const viaEdge = process.argv.includes("--via-edge");
  const t0 = Date.now();
  let body;
  if (apiKey) {
    console.log("\n## Probe GET operator-player-rounds (direto no RS, nada gravado)");
    body = await probeDireto(apiBase, apiKey);
  } else if (viaEdge && supabaseUrl && serviceKey) {
    console.log("\n## Probe GET operator-player-rounds (via Edge, nada gravado)");
    body = await probeViaEdge(supabaseUrl, serviceKey);
    if (body.probe !== "datasets") {
      console.error(
        `A Edge publicada ainda não tem o probe (versao=${body.versao ?? "?"}). Publique sync-revenue-sentinel e rode com --via-edge.`,
      );
      process.exit(1);
    }
  } else {
    console.error(
      "RS_API_KEY ausente neste ambiente (a dsk_ só está nos secrets da Edge).\n" +
        "Não chamei a Edge antiga: sem o probe ela dispararia o POST /jogadores/spin.\n\n" +
        "Para completar o dry-run, uma destas:\n" +
        "  1. `npx supabase login` e `npx supabase functions deploy sync-revenue-sentinel`, depois `node scripts/diagnostico-rs-rounds.mjs --via-edge`\n" +
        "  2. Colocar RS_API_KEY em .env.gp-kpi (gitignored, não cole no chat) e pedir para rodar de novo.",
    );
    process.exit(1);
  }

  console.log(`(${Date.now() - t0} ms)`);
  if (body.ok === false) {
    console.log("ERRO:", body.erro);
    process.exit(1);
  }
  imprimir(body);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
