/**
 * Extrai sinais de Service Manager do ClickHouse (Grafana S&SM Reports / stats_signals)
 * e grava em public.sm_sinais.
 * O trigger trg_sm_sinais_resumo_* atualiza sm_sinais_resumo_diario no mesmo momento
 * (aba Incidentes → Sinais). Não é preciso um segundo comando.
 *
 * Uso:
 *   node scripts/grafana-sm-sinais-run.mjs --arquivo=tmp/sm-sinais.json --dry-run
 *   node scripts/grafana-sm-sinais-run.mjs --arquivo=tmp/sm-sinais.json
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (via .env.gp-kpi / run-sm-sinais-grafana.ps1)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const AMBIENTE_DEFAULT = "live-sg";
const UPSERT_LOTE = 400;
const CHAVE_UPSERT = "ambiente,signal_id";
/** Mesas Brasil no Grafana (variável studio do S&SM Reports). */
const STUDIO_TABLE_REGEX = String.raw`\\D+6\\d*`;

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const dryRun = process.argv.includes("--dry-run");

function logBr() {
  const s = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${s} Brasília]`);
}

/** SQL de um bloco: timer_stopped_at em [deSegundos, ateSegundos) UTC epoch. */
export function montarSqlSmSinais({ deSegundos, ateSegundos, ambiente }) {
  const amb = String(ambiente)
    .split(",")
    .map((s) => `'${s.trim().replace(/'/g, "")}'`)
    .join(", ");

  return `SELECT
  signal_id,
  issued_at,
  taken_at,
  timer_stopped_at,
  table_id,
  game_type,
  signal_type,
  resolution_conclusion,
  signal_creator_id,
  signal_creator_screen_name,
  signal_creator_type,
  signal_resolver_id,
  signal_resolver_screen_name
FROM stats_signals
WHERE timer_stopped_at >= toDateTime64(${deSegundos}, 3)
  AND timer_stopped_at <  toDateTime64(${ateSegundos}, 3)
  AND environment IN (${amb})
  AND upperUTF8(signal_resolver_screen_name) LIKE '%SERVICE MANAGER%'
  AND match(table_id, '${STUDIO_TABLE_REGEX}')
ORDER BY timer_stopped_at, signal_id`;
}

function frameParaLinhas(frame) {
  if (!frame) return [];
  const campos = frame.schema?.fields ?? [];
  const colunas = frame.data?.values ?? [];
  const total = colunas[0]?.length ?? 0;
  const linhas = [];
  for (let i = 0; i < total; i += 1) {
    const linha = {};
    campos.forEach((campo, c) => {
      linha[campo.name] = colunas[c]?.[i] ?? null;
    });
    linhas.push(linha);
  }
  return linhas;
}

function lerArquivoLinhas(caminho) {
  let bruto = JSON.parse(readFileSync(caminho, "utf8"));
  if (bruto?.result?.type === "string" && typeof bruto.result.value === "string") {
    bruto = JSON.parse(bruto.result.value);
  }
  const blocos = Array.isArray(bruto) ? bruto : [bruto];
  const linhas = [];

  for (const bloco of blocos) {
    if (bloco == null) continue;

    if (bloco?.ok === true && Array.isArray(bloco.linhas)) {
      linhas.push(...bloco.linhas);
      continue;
    }

    const resultados = bloco?.results ? Object.values(bloco.results) : null;
    if (resultados) {
      for (const resultado of resultados) {
        if (resultado?.error) throw new Error(`ClickHouse: ${resultado.error}`);
        for (const frame of resultado?.frames ?? []) linhas.push(...frameParaLinhas(frame));
      }
      continue;
    }

    if (Array.isArray(bloco?.frames)) {
      for (const frame of bloco.frames) linhas.push(...frameParaLinhas(frame));
      continue;
    }

    if (bloco?.schema && bloco?.data) {
      linhas.push(...frameParaLinhas(bloco));
      continue;
    }

    if (bloco?.signal_id != null) {
      linhas.push(bloco);
      continue;
    }

    throw new Error(
      "Formato não reconhecido em --arquivo: esperado resposta Grafana, frames ou linhas com signal_id.",
    );
  }

  return linhas;
}

function cabecalhosSupabase(serviceKey, extras = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extras,
  };
}

async function fetchAllRest(supabaseUrl, serviceKey, path) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const to = from + page - 1;
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        ...cabecalhosSupabase(serviceKey),
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      },
    });
    if (!res.ok) {
      throw new Error(`Erro ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < page) break;
  }
  return out;
}

async function carregarMesas(supabaseUrl, serviceKey) {
  const rows = await fetchAllRest(
    supabaseUrl,
    serviceKey,
    "mesas_spin_cadastro?select=id,mesa_identificacao,estudio_slug&order=mesa_identificacao",
  );
  const mapa = new Map();
  for (const mesa of rows) {
    const chave = String(mesa.mesa_identificacao ?? "").trim().toLowerCase();
    if (chave) mapa.set(chave, mesa);
  }
  return mapa;
}

async function carregarStaffPorIdTos(supabaseUrl, serviceKey) {
  const rows = await fetchAllRest(
    supabaseUrl,
    serviceKey,
    "rh_funcionarios?select=id,nome,staff_id_tos&staff_id_tos=not.is.null&order=nome",
  );
  const mapa = new Map();
  const duplicados = new Set();
  for (const row of rows) {
    const chave = String(row.staff_id_tos ?? "").trim().toLowerCase();
    if (!chave) continue;
    if (mapa.has(chave)) {
      duplicados.add(chave);
      continue;
    }
    mapa.set(chave, row);
  }
  return { mapa, duplicados };
}

async function carregarStaffPorIdOperacional(supabaseUrl, serviceKey) {
  const rows = await fetchAllRest(
    supabaseUrl,
    serviceKey,
    "rh_funcionarios?select=id,nome,staff_id_operacional&staff_id_operacional=not.is.null&order=nome",
  );
  const mapa = new Map();
  for (const row of rows) {
    const chave = String(row.staff_id_operacional ?? "").trim().toLowerCase();
    if (chave && !mapa.has(chave)) mapa.set(chave, row);
  }
  return mapa;
}

function parseUtcDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // Grafana/ClickHouse DateTime64 costuma vir em ms; se for segundos (< 1e12), escala.
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBrtWall(date) {
  if (!date) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const g = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  // en-CA dá YYYY-MM-DD; hora pode vir como 24:xx em edge cases — normalizar
  let hour = g("hour");
  if (hour === "24") hour = "00";
  return `${g("year")}-${g("month")}-${g("day")}T${hour}:${g("minute")}:${g("second")}`;
}

function diaBrtFromWall(wall) {
  return wall ? wall.slice(0, 10) : null;
}

function montarRegistro(linha, ambiente, mesasPorId, staffPorTos, staffPorIdOp) {
  const signalId = String(linha.signal_id ?? "").trim();
  const tableId = String(linha.table_id ?? "").trim();
  const resolverId = String(linha.signal_resolver_id ?? "").trim();
  const creatorId = String(linha.signal_creator_id ?? "").trim();

  const issued = parseUtcDate(linha.issued_at);
  const taken = parseUtcDate(linha.taken_at);
  const stopped = parseUtcDate(linha.timer_stopped_at);
  if (!signalId || !issued || !stopped || !resolverId || !tableId) return null;

  const issuedBrt = formatBrtWall(issued);
  const takenBrt = formatBrtWall(taken);
  const stoppedBrt = formatBrtWall(stopped);
  const diaBrt = diaBrtFromWall(issuedBrt);
  if (!issuedBrt || !stoppedBrt || !diaBrt) return null;

  const mesa = mesasPorId.get(tableId.toLowerCase()) ?? null;
  const resolverStaff = staffPorTos.get(resolverId.toLowerCase()) ?? null;
  let creatorStaff = null;
  if (/^sg\d+/i.test(creatorId)) {
    creatorStaff = staffPorIdOp.get(creatorId.toLowerCase()) ?? null;
  }

  return {
    signal_id: signalId,
    ambiente,
    issued_at: issued.toISOString(),
    taken_at: taken ? taken.toISOString() : null,
    timer_stopped_at: stopped.toISOString(),
    issued_at_brt: issuedBrt,
    taken_at_brt: takenBrt,
    timer_stopped_at_brt: stoppedBrt,
    dia_brt: diaBrt,
    table_id: tableId,
    game_type: linha.game_type != null ? String(linha.game_type) : null,
    signal_type: String(linha.signal_type ?? "").trim() || "unknown",
    resolution_conclusion:
      linha.resolution_conclusion != null && String(linha.resolution_conclusion).trim() !== ""
        ? String(linha.resolution_conclusion)
        : null,
    creator_id: creatorId || null,
    creator_screen_name:
      linha.signal_creator_screen_name != null ? String(linha.signal_creator_screen_name) : null,
    creator_type: linha.signal_creator_type != null ? String(linha.signal_creator_type) : null,
    creator_funcionario_id: creatorStaff?.id ?? null,
    resolver_id: resolverId,
    resolver_screen_name:
      linha.signal_resolver_screen_name != null ? String(linha.signal_resolver_screen_name) : null,
    resolver_funcionario_id: resolverStaff?.id ?? null,
    mesa_id: mesa?.id ?? null,
    estudio_slug: mesa?.estudio_slug ?? null,
    sincronizado_em: new Date().toISOString(),
  };
}

async function gravarLote(supabaseUrl, serviceKey, registros) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/sm_sinais?on_conflict=${encodeURIComponent(CHAVE_UPSERT)}`,
    {
      method: "POST",
      headers: cabecalhosSupabase(serviceKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(registros),
    },
  );
  if (!res.ok) {
    throw new Error(`Erro upsert sm_sinais: ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
}

async function main() {
  const ambiente = process.env.GRAFANA_GP_KPI_AMBIENTE?.trim() || AMBIENTE_DEFAULT;
  const arquivo = arg("arquivo");

  if (!arquivo) {
    console.error("Use --arquivo=tmp/sm-sinais-….json (extract pelo navegador Grafana).");
    process.exit(1);
  }

  logBr();
  console.log(dryRun ? "Modo: dry-run (não grava)" : "Modo: produção");
  console.log(`Origem: arquivo ${arquivo} (ambiente ${ambiente})`);

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const mesasPorId = await carregarMesas(supabaseUrl, serviceKey);
  console.log(`Mesas no cadastro Spin: ${mesasPorId.size}`);

  const { mapa: staffPorTos, duplicados: tosDuplicados } = await carregarStaffPorIdTos(
    supabaseUrl,
    serviceKey,
  );
  console.log(`Staff com ID TOS: ${staffPorTos.size}`);
  if (tosDuplicados.size > 0) {
    console.log(`Aviso — ID TOS duplicado (${tosDuplicados.size}): ${[...tosDuplicados].join(", ")}`);
  }

  const staffPorIdOp = await carregarStaffPorIdOperacional(supabaseUrl, serviceKey);
  console.log(`Staff com ID operacional: ${staffPorIdOp.size}`);

  const linhas = lerArquivoLinhas(arquivo);
  console.log(`Linhas no arquivo: ${linhas.length}`);

  const porSignal = new Map();
  let invalidas = 0;
  for (const l of linhas) {
    const reg = montarRegistro(l, ambiente, mesasPorId, staffPorTos, staffPorIdOp);
    if (!reg) {
      invalidas += 1;
      continue;
    }
    porSignal.set(`${reg.ambiente}|${reg.signal_id}`, reg);
  }
  const registros = [...porSignal.values()];
  console.log(`Registros válidos (dedupe): ${registros.length}${invalidas ? ` (inválidas: ${invalidas})` : ""}`);

  const semMesa = new Set();
  const semTos = new Set();
  const semCreatorOp = new Set();
  for (const r of registros) {
    if (!r.mesa_id) semMesa.add(r.table_id);
    if (!r.resolver_funcionario_id) semTos.add(`${r.resolver_id} | ${r.resolver_screen_name ?? ""}`);
    if (r.creator_id && /^sg\d+/i.test(r.creator_id) && !r.creator_funcionario_id) {
      semCreatorOp.add(r.creator_id);
    }
  }

  if (dryRun || registros.length === 0) {
    console.log("Gravadas: 0 (dry-run ou vazio)");
  } else {
    let gravadas = 0;
    for (let i = 0; i < registros.length; i += UPSERT_LOTE) {
      const fatia = registros.slice(i, i + UPSERT_LOTE);
      await gravarLote(supabaseUrl, serviceKey, fatia);
      gravadas += fatia.length;
      console.log(`Upsert ${gravadas}/${registros.length}`);
    }
    console.log(`Gravadas: ${gravadas}`);
  }

  if (semMesa.size > 0) {
    console.log(`Mesas sem cadastro Spin (${semMesa.size}): ${[...semMesa].sort().join(", ")}`);
  }
  if (semTos.size > 0) {
    console.log(`Resolvers sem ID TOS no staff (${semTos.size}):`);
    for (const s of [...semTos].sort()) console.log(`  - ${s}`);
    console.log("Preencher ID TOS em Gestão de Staff → Service Manager.");
  }
  if (semCreatorOp.size > 0) {
    console.log(
      `Creators SG… sem ID operacional (${semCreatorOp.size}): ${[...semCreatorOp].sort().join(", ")}`,
    );
  }
}

const esteArquivo = fileURLToPath(import.meta.url);
const invocadoDireto = process.argv[1] != null && resolve(process.argv[1]) === esteArquivo;
if (invocadoDireto) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
