/**
 * Carga Mesas Spin a partir da extração do Daily Commercial Report [BRL] (Superset).
 *
 * Fluxo diário (quando o usuário pedir para atualizar):
 *   1. Abrir o dashboard 15 logado no navegador controlado.
 *   2. Injetar scripts/superset-mesas-spin-extract-browser.js (MODO network, depois
 *      dedicado, depois monthly) e gravar os JSON em tmp/.
 *   3. Rodar este script com --preencher-faltantes (consulta o último dia no
 *      Supabase e só emite/grava os dias seguintes já presentes no extract).
 *
 * Uso:
 *   node scripts/superset-mesas-spin-run.mjs --network=tmp/n.json --dedicado=tmp/d.json --sql
 *   node scripts/superset-mesas-spin-run.mjs --network=… --dedicado=… --monthly=… --escrever-sql
 *   node scripts/superset-mesas-spin-run.mjs --network=… --dedicado=… --preencher-faltantes --gravar
 *   node scripts/superset-mesas-spin-run.mjs --network=… --de=2026-08-04 --ate=2026-08-11 --escrever-sql
 *
 * Env para --gravar / --preencher-faltantes: VITE_SUPABASE_URL (ou SUPABASE_URL)
 * e SUPABASE_SERVICE_ROLE_KEY no .env.
 *
 * Regras: TO/GGR arredondados por mesa (Math.round); daily = soma das mesas;
 * UAP daily = UAP_TOT (não somar uap_por_jogo); monthly = MTD do mês de DE
 * (extract usa dia 1 → ATE exclusivo — ver MONTHLY_TIME_RANGE no browser script).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const GAME_TYPE = {
  Blackjack: { mesa: "Blackjack 1", jogo: "Blackjack" },
  Roulette: { mesa: "Roleta", jogo: "Roleta" },
  LotusSpeedBaccarat: { mesa: "Speed Baccarat", jogo: "Speed Baccarat" },
  CardMatchup: { mesa: "Futebol Brasileiro", jogo: "Futebol Brasileiro" },
};

const DED_TABLE = {
  "Blaze Blackjack 1": { mesa: "Blackjack 1", jogo: "Blackjack" },
  "Blaze Blackjack 2": { mesa: "Blackjack 2", jogo: "Blackjack" },
  "Blaze Roulette": { mesa: "Roleta", jogo: "Roleta" },
  "Blaze Speed Baccarat": { mesa: "Speed Baccarat", jogo: "Speed Baccarat" },
  "Blaze VIP Blackjack 1": { mesa: "Blackjack VIP", jogo: "Blackjack" },
  "Casa de Apostas Blackjack 1": { mesa: "Blackjack 1", jogo: "Blackjack" },
  "Casa de Apostas Blackjack 2": { mesa: "Blackjack 2", jogo: "Blackjack" },
  "Casa de Apostas Roulette": { mesa: "Roleta", jogo: "Roleta" },
  "Casa de Apostas Speed Baccarat": { mesa: "Speed Baccarat", jogo: "Speed Baccarat" },
  "Casa de Apostas VIP Blackjack 1": { mesa: "VIP Blackjack 1", jogo: "Blackjack" },
  "Futebol Brasileiro": { mesa: "Futebol Brasileiro", jogo: "Futebol Brasileiro" },
};

const OPS = {
  esportiva: {
    slug: "esportiva_bet",
    nome: "Esportiva Bet",
    canal: "network",
    mesas: ["Blackjack 1", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
    jogos: ["Blackjack", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
  },
  casa: {
    slug: "casa_apostas",
    nome: "Casa de Apostas",
    canal: "both",
    mesasNetwork: ["Blackjack 1", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
    mesasDedicado: [
      "Blackjack 1",
      "Blackjack 2",
      "Roleta",
      "Speed Baccarat",
      "VIP Blackjack 1",
      "Futebol Brasileiro",
    ],
    jogos: ["Blackjack", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
  },
  blaze: {
    slug: "blaze",
    nome: "Blaze",
    canal: "both",
    mesasNetwork: ["Blackjack 1", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
    mesasDedicado: ["Blackjack 1", "Blackjack 2", "Roleta", "Speed Baccarat", "Blackjack VIP"],
    jogosNetwork: ["Blackjack", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
    jogosDedicado: ["Blackjack", "Speed Baccarat", "Roleta"],
  },
  jonbet: {
    slug: "jonbet",
    nome: "Jon Bet",
    canal: "network",
    mesas: ["Blackjack 1", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
    jogos: ["Blackjack", "Futebol Brasileiro", "Speed Baccarat", "Roleta"],
  },
};

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const flag = (nome) => process.argv.includes(`--${nome}`);

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

function loadEnv() {
  const env = {
    ...parseEnvFile(resolve(root, ".env.gp-kpi")),
    ...parseEnvFile(resolve(root, ".env")),
  };
  return env;
}

function unwrapExtract(json) {
  if (json && json.result && json.result.value) return json.result.value;
  if (json && json.value && (json.value.blaze || json.value.casa || json.value.esportiva)) {
    return json.value;
  }
  return json;
}

function lerJson(caminho) {
  const abs = resolve(root, caminho);
  return unwrapExtract(JSON.parse(readFileSync(abs, "utf8")));
}

function diasDe(metric) {
  return Object.keys(metric?.byDay ?? {}).sort();
}

function valorMetrica(row, valueKey) {
  if (row[valueKey] != null) return row[valueKey];
  const aliases = {
    TO: ["Turnover", "TO"],
    GGR: ["GGR"],
    BET: ["BET", "Bet Count"],
    UAP: ["UAP"],
  };
  for (const k of aliases[valueKey] || []) {
    if (row[k] != null) return row[k];
  }
  const skip = new Set(["f", "at", "game_type", "table_name"]);
  for (const [k, v] of Object.entries(row)) {
    if (!skip.has(k) && typeof v === "number") return v;
  }
  return undefined;
}

function mapaCampo(rows, valueKey) {
  const m = new Map();
  for (const r of rows || []) {
    if (r.f == null) continue;
    m.set(String(r.f), valorMetrica(r, valueKey));
  }
  return m;
}

function uapTotDoDia(block, dia) {
  const rows = block?.UAP_TOT?.byDay?.[dia] ?? [];
  const row = rows.find((r) => r.UAP != null);
  return row ? Number(row.UAP) : 0;
}

function roundMoney(v) {
  if (v == null || v === "") return 0;
  return Math.round(Number(v));
}

function catalogoMesas(opKey, canal) {
  const op = OPS[opKey];
  if (canal === "network") return op.mesas ?? op.mesasNetwork;
  return op.mesasDedicado ?? op.mesas;
}

function catalogoJogos(opKey, canal) {
  const op = OPS[opKey];
  if (canal === "network") return op.jogos ?? op.jogosNetwork ?? op.jogos;
  return op.jogosDedicado ?? op.jogos;
}

function resolverDim(canal, campo) {
  if (canal === "network") {
    const g = GAME_TYPE[campo];
    if (!g) throw new Error(`game_type desconhecido: ${campo}`);
    return g;
  }
  const t = DED_TABLE[campo];
  if (!t) throw new Error(`table_name desconhecida: ${campo}`);
  return t;
}

function temAtividade(block, dia) {
  const to = block?.TO?.byDay?.[dia] ?? [];
  const ggr = block?.GGR?.byDay?.[dia] ?? [];
  const bet = block?.BET?.byDay?.[dia] ?? [];
  return to.length + ggr.length + bet.length > 0;
}

function montarDia(opKey, canal, block, dia) {
  const op = OPS[opKey];
  const mesasCat = catalogoMesas(opKey, canal);
  const jogosCat = catalogoJogos(opKey, canal);
  const toMap = mapaCampo(block.TO?.byDay?.[dia], "TO");
  const ggrMap = mapaCampo(block.GGR?.byDay?.[dia], "GGR");
  const betMap = mapaCampo(block.BET?.byDay?.[dia], "BET");
  const uapMap = mapaCampo(block.UAP?.byDay?.[dia], "UAP");

  const porMesa = new Map();
  for (const campo of new Set([...toMap.keys(), ...ggrMap.keys(), ...betMap.keys()])) {
    const { mesa } = resolverDim(canal, campo);
    const prev = porMesa.get(mesa) ?? { mesa, ggr: 0, turnover: 0, apostas: 0 };
    prev.turnover += roundMoney(toMap.get(campo));
    prev.ggr += roundMoney(ggrMap.get(campo));
    prev.apostas += Number(betMap.get(campo) ?? 0);
    porMesa.set(mesa, prev);
  }

  const mesas = mesasCat.map((mesa) => porMesa.get(mesa) ?? { mesa, ggr: 0, turnover: 0, apostas: 0 });

  const jogos = jogosCat.map((jogo) => {
    let uap = 0;
    for (const [campo, val] of uapMap.entries()) {
      if (resolverDim(canal === "dedicado" ? "network" : canal, campo).jogo === jogo) {
        uap += Number(val ?? 0);
      }
    }
    return { jogo, uap };
  });

  const daily = mesas.reduce(
    (acc, m) => {
      acc.turnover += m.turnover;
      acc.ggr += m.ggr;
      acc.apostas += m.apostas;
      return acc;
    },
    { turnover: 0, ggr: 0, apostas: 0, uap: uapTotDoDia(block, dia) },
  );

  return {
    dia,
    slug: op.slug,
    nome: op.nome,
    daily,
    mesas,
    jogos,
  };
}

function opsDoExtract(raw, canal) {
  const keys = canal === "network" ? ["esportiva", "casa", "blaze", "jonbet"] : ["casa", "blaze"];
  const out = [];
  for (const k of keys) {
    if (raw[k]) out.push(k);
  }
  return out;
}

function diasDoExtract(raw, opKeys) {
  const set = new Set();
  for (const k of opKeys) {
    for (const d of diasDe(raw[k]?.TO)) set.add(d);
    for (const d of diasDe(raw[k]?.GGR)) set.add(d);
    for (const d of diasDe(raw[k]?.BET)) set.add(d);
  }
  return [...set].sort();
}

function filtrarDias(dias, de, ate) {
  return dias.filter((d) => (!de || d >= de) && (!ate || d <= ate));
}

function pad(n, w) {
  return String(n).padStart(w);
}

function sqlValuesDaily(rows) {
  const wTo = Math.max(8, ...rows.map((r) => String(r.daily.turnover).length));
  const wG = Math.max(6, ...rows.map((r) => String(r.daily.ggr).length));
  const wA = Math.max(6, ...rows.map((r) => String(r.daily.apostas).length));
  const wU = Math.max(3, ...rows.map((r) => String(r.daily.uap).length));
  return rows
    .map(
      (r) =>
        `  ('${r.dia}', '${r.slug}', ${pad(r.daily.turnover, wTo)}, ${pad(r.daily.ggr, wG)}, ${pad(r.daily.apostas, wA)}, ${pad(r.daily.uap, wU)})`,
    )
    .join(",\n");
}

function sqlValuesMesas(rows) {
  const flat = rows.flatMap((r) => r.mesas.map((m) => ({ ...r, ...m })));
  const wG = Math.max(6, ...flat.map((r) => String(r.ggr).length));
  const wTo = Math.max(8, ...flat.map((r) => String(r.turnover).length));
  const wA = Math.max(6, ...flat.map((r) => String(r.apostas).length));
  return flat
    .map(
      (r) =>
        `  ('${r.dia}', '${r.nome}', '${r.slug}', '${r.mesa}', ${pad(r.ggr, wG)}, ${pad(r.turnover, wTo)}, ${pad(r.apostas, wA)})`,
    )
    .join(",\n");
}

function sqlValuesUap(rows) {
  const flat = rows.flatMap((r) => r.jogos.map((j) => ({ ...r, ...j })));
  const wU = Math.max(3, ...flat.map((r) => String(r.uap).length));
  return flat
    .map((r) => `  ('${r.dia}', '${r.slug}', '${r.jogo}', ${pad(r.uap, wU)})`)
    .join(",\n");
}

function sqlValuesMonthly(mes, pares) {
  const wU = Math.max(3, ...pares.map((p) => String(p.uap).length));
  return pares.map((p) => `  ('${mes}', '${p.slug}', ${pad(p.uap, wU)})`).join(",\n");
}

function montarSqlCanal({ canal, rows, monthly, de, ate }) {
  const tabelaDaily = canal === "network" ? "relatorio_network_daily_summary" : "relatorio_daily_summary";
  const tabelaMesa = canal === "network" ? "relatorio_network_por_tabela" : "relatorio_por_tabela";
  const tabelaUap = canal === "network" ? "relatorio_network_uap_por_jogo" : "relatorio_uap_por_jogo";
  const tabelaMes = canal === "network" ? "relatorio_network_monthly_summary" : "relatorio_monthly_summary";
  const titulo = canal === "network" ? "Estúdio Network" : "Estúdio Dedicado";
  const slugs = [...new Set(rows.map((r) => r.slug))].join(", ");
  const linhas = [];
  linhas.push(`-- Mesas Spin — ${de} a ${ate}: ${titulo} (${slugs}) — UPSERT via Superset.`);
  linhas.push("-- Daily TO/GGR/apostas = soma das mesas (Math.round por mesa). UAP daily = UAP_TOT.");
  linhas.push("-- UAP por jogo ≠ daily (esperado). Monthly = MTD corrente (não comparar histórico).");
  linhas.push("--");
  linhas.push("-- Correr no SQL Editor do Supabase (postgres).");
  linhas.push("");
  linhas.push("BEGIN;");
  linhas.push("");
  linhas.push(`INSERT INTO public.${tabelaDaily} (data, operadora_slug, turnover, ggr, apostas, uap)`);
  linhas.push("VALUES");
  linhas.push(sqlValuesDaily(rows));
  linhas.push("ON CONFLICT (data, operadora_slug) DO UPDATE SET");
  linhas.push("  turnover   = EXCLUDED.turnover,");
  linhas.push("  ggr        = EXCLUDED.ggr,");
  linhas.push("  apostas    = EXCLUDED.apostas,");
  linhas.push("  uap        = EXCLUDED.uap,");
  linhas.push("  updated_at = now();");
  linhas.push("");
  linhas.push(`INSERT INTO public.${tabelaMesa} (dia, operadora, operadora_slug, mesa, ggr, turnover, apostas)`);
  linhas.push("VALUES");
  linhas.push(sqlValuesMesas(rows));
  linhas.push("ON CONFLICT (dia, operadora_slug, mesa) DO UPDATE SET");
  linhas.push("  operadora  = EXCLUDED.operadora,");
  linhas.push("  ggr        = EXCLUDED.ggr,");
  linhas.push("  turnover   = EXCLUDED.turnover,");
  linhas.push("  apostas    = EXCLUDED.apostas,");
  linhas.push("  updated_at = now();");
  linhas.push("");
  linhas.push(`INSERT INTO public.${tabelaUap} (data, operadora_slug, jogo, uap)`);
  linhas.push("VALUES");
  linhas.push(sqlValuesUap(rows));
  linhas.push("ON CONFLICT (data, jogo, operadora_slug) DO UPDATE SET");
  linhas.push("  uap        = EXCLUDED.uap,");
  linhas.push("  updated_at = now();");
  if (monthly?.length) {
    linhas.push("");
    linhas.push(`INSERT INTO public.${tabelaMes} (mes, operadora_slug, uap)`);
    linhas.push("VALUES");
    linhas.push(sqlValuesMonthly(monthly[0].mes, monthly));
    linhas.push("ON CONFLICT (mes, operadora_slug) DO UPDATE SET");
    linhas.push("  uap        = EXCLUDED.uap,");
    linhas.push("  updated_at = now();");
  }
  linhas.push("");
  linhas.push("COMMIT;");
  linhas.push("");
  return linhas.join("\n");
}

function monthlyDoExtract(raw) {
  if (!raw) return null;
  const mes = raw.mes || `${new Date().toISOString().slice(0, 7)}-01`;
  const map = {
    ded_casa: { canal: "dedicado", slug: "casa_apostas" },
    ded_blaze: { canal: "dedicado", slug: "blaze" },
    net_esportiva: { canal: "network", slug: "esportiva_bet" },
    net_casa: { canal: "network", slug: "casa_apostas" },
    net_blaze: { canal: "network", slug: "blaze" },
    net_jonbet: { canal: "network", slug: "jonbet" },
  };
  const out = { dedicado: [], network: [] };
  for (const [k, meta] of Object.entries(map)) {
    const uap = raw[k]?.uap;
    if (uap == null) continue;
    out[meta.canal].push({ mes, slug: meta.slug, uap: Number(uap) });
  }
  return out;
}

function cabecalhosSupabase(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
}

async function supabaseGet(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function supabaseUpsert(url, key, tabela, onConflict, registros) {
  if (!registros.length) return;
  const res = await fetch(
    `${url}/rest/v1/${tabela}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: cabecalhosSupabase(key),
      body: JSON.stringify(registros),
    },
  );
  if (!res.ok) {
    throw new Error(`Upsert ${tabela}: ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
}

async function ultimoDia(url, key, tabela) {
  const rows = await supabaseGet(url, key, `${tabela}?select=data&order=data.desc&limit=1`);
  return rows[0]?.data ?? null;
}

function registrosDaily(rows) {
  return rows.map((r) => ({
    data: r.dia,
    operadora_slug: r.slug,
    turnover: r.daily.turnover,
    ggr: r.daily.ggr,
    apostas: r.daily.apostas,
    uap: r.daily.uap,
  }));
}

function registrosMesas(rows) {
  return rows.flatMap((r) =>
    r.mesas.map((m) => ({
      dia: r.dia,
      operadora: r.nome,
      operadora_slug: r.slug,
      mesa: m.mesa,
      ggr: m.ggr,
      turnover: m.turnover,
      apostas: m.apostas,
    })),
  );
}

function registrosUap(rows) {
  return rows.flatMap((r) =>
    r.jogos.map((j) => ({
      data: r.dia,
      operadora_slug: r.slug,
      jogo: j.jogo,
      uap: j.uap,
    })),
  );
}

function montarRows(raw, canal, dias) {
  const rows = [];
  for (const opKey of opsDoExtract(raw, canal)) {
    for (const dia of dias) {
      if (!temAtividade(raw[opKey], dia)) continue;
      rows.push(montarDia(opKey, canal, raw[opKey], dia));
    }
  }
  rows.sort((a, b) => a.dia.localeCompare(b.dia) || a.slug.localeCompare(b.slug));
  return rows;
}

function logBr() {
  console.log(`[${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} Brasília]`);
}

async function main() {
  const networkPath = arg("network");
  const dedicadoPath = arg("dedicado");
  const monthlyPath = arg("monthly");
  const de = arg("de");
  const ate = arg("ate");
  const somenteSql = flag("sql");
  const escreverSql = flag("escrever-sql");
  const gravar = flag("gravar");
  const preencherFaltantes = flag("preencher-faltantes");
  const dryRun = flag("dry-run");

  if (!networkPath && !dedicadoPath) {
    console.error("Informe --network= e/ou --dedicado= com o JSON da extração.");
    process.exit(1);
  }

  logBr();
  const env = { ...loadEnv(), ...process.env };
  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  let lastDed = null;
  let lastNet = null;
  if (preencherFaltantes) {
    if (!supabaseUrl || !serviceKey) {
      console.error("--preencher-faltantes exige VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
      process.exit(1);
    }
    lastDed = await ultimoDia(supabaseUrl, serviceKey, "relatorio_daily_summary");
    lastNet = await ultimoDia(supabaseUrl, serviceKey, "relatorio_network_daily_summary");
    console.log(`Último dia Dedicado no Supabase: ${lastDed ?? "(vazio)"}`);
    console.log(`Último dia Network no Supabase: ${lastNet ?? "(vazio)"}`);
  }

  const monthlyRaw = monthlyPath ? monthlyDoExtract(lerJson(monthlyPath)) : null;
  const canais = [];

  if (networkPath) {
    const raw = lerJson(networkPath);
    const opKeys = opsDoExtract(raw, "network");
    let dias = filtrarDias(diasDoExtract(raw, opKeys), de, ate);
    if (preencherFaltantes && lastNet) {
      dias = dias.filter((d) => d > lastNet);
    }
    const rows = montarRows(raw, "network", dias);
    canais.push({
      canal: "network",
      rows,
      dias,
      monthly: monthlyRaw?.network ?? [],
    });
  }

  if (dedicadoPath) {
    const raw = lerJson(dedicadoPath);
    const opKeys = opsDoExtract(raw, "dedicado");
    let dias = filtrarDias(diasDoExtract(raw, opKeys), de, ate);
    if (preencherFaltantes && lastDed) {
      dias = dias.filter((d) => d > lastDed);
    }
    const rows = montarRows(raw, "dedicado", dias);
    canais.push({
      canal: "dedicado",
      rows,
      dias,
      monthly: monthlyRaw?.dedicado ?? [],
    });
  }

  for (const c of canais) {
    const deSql = c.dias[0] ?? de ?? "?";
    const ateSql = c.dias[c.dias.length - 1] ?? ate ?? "?";
    console.log(
      `${c.canal}: ${c.rows.length} linha(s) daily · dias ${c.dias.join(", ") || "(nenhum)"}`,
    );
    for (const r of c.rows) {
      const sumTo = r.mesas.reduce((s, m) => s + m.turnover, 0);
      const sumG = r.mesas.reduce((s, m) => s + m.ggr, 0);
      const sumA = r.mesas.reduce((s, m) => s + m.apostas, 0);
      if (sumTo !== r.daily.turnover || sumG !== r.daily.ggr || sumA !== r.daily.apostas) {
        console.warn(`RECON ${c.canal} ${r.dia} ${r.slug}: daily≠soma mesas`);
      }
    }

    const sql = c.rows.length
      ? montarSqlCanal({
          canal: c.canal,
          rows: c.rows,
          monthly: c.monthly,
          de: deSql,
          ate: ateSql,
        })
      : null;

    if (somenteSql && sql) {
      console.log(sql);
    }

    if (escreverSql && sql) {
      const nome =
        c.canal === "network"
          ? `manual-supabase-mesas-spin-network-${deSql}-a-${ateSql}.sql`
          : `manual-supabase-mesas-spin-${deSql}-a-${ateSql}-dedicado.sql`;
      const dest = resolve(root, "scripts", nome);
      writeFileSync(dest, sql, "utf8");
      console.log(`SQL escrito: scripts/${nome}`);
    }

    if (gravar && c.rows.length) {
      if (!supabaseUrl || !serviceKey) {
        console.error("--gravar exige VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
        process.exit(1);
      }
      if (dryRun) {
        console.log(`dry-run: não gravou ${c.canal}`);
        continue;
      }
      const dailyT = c.canal === "network" ? "relatorio_network_daily_summary" : "relatorio_daily_summary";
      const mesaT = c.canal === "network" ? "relatorio_network_por_tabela" : "relatorio_por_tabela";
      const uapT = c.canal === "network" ? "relatorio_network_uap_por_jogo" : "relatorio_uap_por_jogo";
      const mesT = c.canal === "network" ? "relatorio_network_monthly_summary" : "relatorio_monthly_summary";
      await supabaseUpsert(supabaseUrl, serviceKey, dailyT, "data,operadora_slug", registrosDaily(c.rows));
      await supabaseUpsert(supabaseUrl, serviceKey, mesaT, "dia,operadora_slug,mesa", registrosMesas(c.rows));
      await supabaseUpsert(supabaseUrl, serviceKey, uapT, "data,jogo,operadora_slug", registrosUap(c.rows));
      if (c.monthly.length) {
        await supabaseUpsert(
          supabaseUrl,
          serviceKey,
          mesT,
          "mes,operadora_slug",
          c.monthly.map((m) => ({ mes: m.mes, operadora_slug: m.slug, uap: m.uap })),
        );
      }
      console.log(`Gravado ${c.canal}: ${c.rows.length} daily + mesas + uap_por_jogo${c.monthly.length ? " + monthly MTD" : ""}.`);
    }
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
