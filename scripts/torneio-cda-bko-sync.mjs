/**
 * Sync Torneio Live CDA — BKO (PLS Backoffice) → Supabase.
 *
 * Fluxo (igual Grafana / Superset — sob demanda, sem API própria):
 *   1. BKO logado no navegador → extrair JSON (agente CDP ou scripts/torneio-cda-bko-extract-browser.js).
 *   2. Rodar este script com --arquivo=tmp/torneio-cda-bko.json
 *   3. Repetir várias vezes durante as horas do torneio.
 *
 * Modo cookie (fallback): BKO_PLS_COOKIE no .env — busca direto sem arquivo.
 *
 * Uso:
 *   node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026 --arquivo=tmp/torneio.json --dry-run
 *   node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026 --arquivo=tmp/torneio.json
 *   node scripts/torneio-cda-bko-sync.mjs --slug=cda-vip-setembro-2026
 *
 * Env: SUPABASE_URL (ou VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 *      BKO_PLS_BASE_URL (opcional), BKO_PLS_COOKIE (modo cookie)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Mesas Live Cassino CDA no BKO (Spin) — ver /backoffice/api/table/list */
export const CDA_MESAS_BKO = new Set([
  "tableSG6134",
  "tableSG6131",
  "tableSG6132",
  "bacSG6133",
  "roSG6130",
]);

const PAGE_SIZE = 1000;
const ATIVIDADE_LIMITE = 15;
const PTS_RODADA = 500;
const PTS_RODADA_GANHA = 1000;
const PTS_POR_REAL_GANHO = 15;
const PTS_POR_REAL_APOSTADO = 10;

const BKO_BASE_DEFAULT = "https://bo2.sg.onairent.live";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const dryRun = process.argv.includes("--dry-run");
const fetchOnly = process.argv.includes("--fetch-only");
const slugArg = arg("slug");
const arquivoArg = arg("arquivo");

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
  return {
    ...parseEnvFile(resolve(root, ".env.bko-pls")),
    ...parseEnvFile(resolve(root, ".env")),
  };
}

function logBr() {
  const s = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${s} Brasília]`);
}

function cabecalhosSupabase(serviceKey, extras = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extras,
  };
}

function isoFromMs(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return null;
  return new Date(Number(ms)).toISOString();
}

/** Totais da rodada a partir de transactions[].bets[].totals */
export function totaisRodada(game) {
  let amount = 0;
  let payout = 0;
  let net = 0;
  for (const tx of game.transactions ?? []) {
    for (const bet of tx.bets ?? []) {
      amount += Number(bet.totals?.amount ?? 0);
      payout += Number(bet.totals?.payout ?? 0);
      net += Number(bet.totals?.net ?? 0);
    }
  }
  return {
    amount,
    payout,
    net,
    ganhou: net > 0,
  };
}

export function calcularPontosRodada(totais) {
  const netPos = Math.max(0, totais.net);
  const amount = Math.max(0, Number(totais.amount ?? 0));
  return (
    PTS_RODADA +
    (totais.ganhou ? PTS_RODADA_GANHA : 0) +
    Math.floor(netPos * PTS_POR_REAL_GANHO) +
    Math.floor(amount * PTS_POR_REAL_APOSTADO)
  );
}

function gameTypeLabel(gameType) {
  const map = {
    Roulette: "Roleta",
    Blackjack: "Blackjack",
    StandardBaccarat: "Baccarat",
    LotusSpeedBaccarat: "Baccarat",
  };
  return map[gameType] ?? gameType ?? "Live Cassino";
}

/** Lista de jogadores no response de /players/search (formatos legados). */
function listaJogadoresBuscaBko(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.players)) return json.players;
  if (Array.isArray(json?.results)) return json.results;
  if (Array.isArray(json?.content)) return json.content;
  return [];
}

/** Escolhe o jogador cujo User Name CDA (externalName) bate com o cadastro do torneio. */
export function escolherJogadorBuscaBko(json, userName) {
  const want = String(userName ?? "").trim();
  if (!want) return null;
  const lista = listaJogadoresBuscaBko(json);
  const porExternal = lista.find((p) => String(p.externalName ?? "").trim() === want);
  if (porExternal) return porExternal;
  return (
    lista.find((p) => String(p.playerId ?? "").includes(`.CDA-${want}`) || String(p.playerId ?? "").endsWith(`CDA-${want}`)) ??
    null
  );
}

/** Nome exibido na UI: apelido travado no cadastro tem prioridade sobre Screen Name do BKO. */
export function resolverNomeExibicaoTorneio(participante) {
  if (participante?.apelido != null && String(participante.apelido).trim()) {
    return String(participante.apelido).trim();
  }
  if (participante?.nick != null && String(participante.nick).trim()) {
    return String(participante.nick).trim();
  }
  const screen =
    participante?.screenName ??
    participante?.screen_name ??
    participante?.nickName ??
    participante?.nickname ??
    null;
  if (screen != null && String(screen).trim()) return String(screen).trim();
  return String(participante?.userName ?? participante?.user_name ?? "—").trim();
}

/** @deprecated use resolverNomeExibicaoTorneio */
export function resolverScreenNameBko(participante) {
  return resolverNomeExibicaoTorneio(participante);
}

async function fetchPlayerSearchBko(baseUrl, cookie, userName) {
  for (const exactMatch of [true, false]) {
    const qs = new URLSearchParams({
      exactMatch: String(exactMatch),
      pattern: String(userName),
      limit: "10",
    });
    const url = `${baseUrl}/backoffice/api/players/search?${qs}`;
    const res = await fetch(url, {
      headers: { Cookie: cookie, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`BKO search ${userName}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const json = await res.json();
    const player = escolherJogadorBuscaBko(json, userName);
    if (player) {
      return {
        playerId: player.playerId ?? player.id ?? null,
        screenName: player.screenName ?? player.nickName ?? player.nickname ?? null,
        externalName: player.externalName ?? userName,
      };
    }
  }
  return { playerId: null, screenName: null, externalName: userName };
}

function mensagemAtividade(nomeExibicao, game, net) {
  const fmt = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  if (net >= 50) {
    return `${nomeExibicao} ganha ${fmt(net)} na última rodada`;
  }
  return `${nomeExibicao} ganha ${fmt(net)} em ${game.tableName ?? gameTypeLabel(game.gameType)}`;
}

export function processarParticipante(participante, periodo) {
  const inicioMs = new Date(periodo.from).getTime();
  const fimMs = new Date(periodo.to).getTime();
  const nomeExibicao = resolverNomeExibicaoTorneio(participante);

  const jogosCda = (participante.games ?? []).filter((g) => {
    if (!CDA_MESAS_BKO.has(g.tableId)) return false;
    const started = Number(g.startedAt ?? 0);
    if (started && (started < inicioMs || started > fimMs)) return false;
    return true;
  });

  let rodadasJogadas = 0;
  let rodadasGanhas = 0;
  let valorApostado = 0;
  let pontos = 0;
  const vitorias = [];

  for (const g of jogosCda) {
    const t = totaisRodada(g);
    rodadasJogadas += 1;
    valorApostado += t.amount;
    if (t.ganhou) {
      rodadasGanhas += 1;
      vitorias.push({
        userName: participante.userName,
        apelido: nomeExibicao,
        gameId: g.gameId,
        gameType: g.gameType ?? "",
        tableName: g.tableName ?? "",
        valorNet: t.net,
        mensagem: mensagemAtividade(nomeExibicao, g, t.net),
        ocorridoEm: isoFromMs(g.startedAt) ?? new Date().toISOString(),
      });
    }
    pontos += calcularPontosRodada(t);
  }

  return {
    userName: participante.userName,
    apelido: nomeExibicao,
    rodadasJogadas,
    rodadasGanhas,
    valorApostado: Math.round(valorApostado * 100) / 100,
    pontos,
    vitorias,
  };
}

export function montarSnapshot(payload) {
  const periodo = payload.periodo;
  if (!periodo?.from || !periodo?.to) {
    throw new Error("Payload sem periodo.from / periodo.to");
  }

  const linhas = (payload.participantes ?? []).map((p) => processarParticipante(p, periodo));
  linhas.sort((a, b) => b.pontos - a.pontos || b.rodadasGanhas - a.rodadasGanhas);

  const ranking = linhas.map((r, i) => ({
    ...r,
    posicao: i + 1,
  }));

  const consolidado = {
    rodadasJogadas: ranking.reduce((s, r) => s + r.rodadasJogadas, 0),
    rodadasGanhas: ranking.reduce((s, r) => s + r.rodadasGanhas, 0),
    valorApostado: Math.round(ranking.reduce((s, r) => s + r.valorApostado, 0) * 100) / 100,
  };

  const atividades = ranking
    .flatMap((r) => r.vitorias)
    .sort((a, b) => new Date(b.ocorridoEm).getTime() - new Date(a.ocorridoEm).getTime())
    .slice(0, ATIVIDADE_LIMITE);

  return { ranking, consolidado, atividades, sincronizadoEm: new Date().toISOString() };
}

async function carregarTorneio(supabaseUrl, serviceKey, slug) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/torneio_cda?slug=eq.${encodeURIComponent(slug)}&select=id,slug,nome,periodo_inicio,periodo_fim,ativo`,
    { headers: cabecalhosSupabase(serviceKey) },
  );
  if (!res.ok) throw new Error(`torneio_cda: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`Torneio não encontrado: slug=${slug}`);
  return rows[0];
}

async function carregarParticipantes(supabaseUrl, serviceKey, torneioId) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/torneio_cda_participante?torneio_id=eq.${torneioId}&select=user_name,apelido,player_id_bko`,
    { headers: cabecalhosSupabase(serviceKey) },
  );
  if (!res.ok) throw new Error(`torneio_cda_participante: ${res.status}`);
  return res.json();
}

async function fetchGamesBko(baseUrl, cookie, playerId, periodo) {
  const jogos = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const qs = new URLSearchParams({
      offset: String(offset),
      limit: String(PAGE_SIZE),
      from: periodo.from,
      to: periodo.to,
    });
    const url = `${baseUrl}/backoffice/api/players/search/player/games/${encodeURIComponent(playerId)}?${qs}`;
    const res = await fetch(url, {
      headers: { Cookie: cookie, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`BKO ${playerId}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const json = await res.json();
    total = Number(json.count ?? 0);
    const batch = json.games ?? [];
    jogos.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return jogos;
}

async function extrairBko(baseUrl, cookie, torneio, participantes) {
  const periodo = {
    from: new Date(torneio.periodo_inicio).toISOString(),
    to: new Date(torneio.periodo_fim).toISOString(),
  };

  const payload = {
    extraidoEm: new Date().toISOString(),
    periodo,
    participantes: [],
  };

  for (const p of participantes) {
    const meta = await fetchPlayerSearchBko(baseUrl, cookie, p.user_name);
    const playerId =
      meta.playerId ??
      p.player_id_bko ??
      `casadeapostas.if_dgc.L011_358_56.CDA-${p.user_name}`;
    const nomeExibicao = resolverNomeExibicaoTorneio({
      userName: p.user_name,
      apelido: p.apelido,
      screenName: meta.screenName,
    });
    console.log(`  BKO → ${nomeExibicao} [${meta.screenName ?? "—"}] (${p.user_name})…`);
    const games = await fetchGamesBko(baseUrl, cookie, playerId, periodo);
    console.log(`    ${games.length} rodada(s) no período`);
    payload.participantes.push({
      userName: p.user_name,
      screenName: meta.screenName,
      apelido: p.apelido || nomeExibicao,
      playerId,
      games,
    });
  }

  return payload;
}

function lerArquivoPayload(caminho) {
  const abs = resolve(root, caminho);
  return JSON.parse(readFileSync(abs, "utf8"));
}

async function supabaseDelete(supabaseUrl, serviceKey, tabela, query) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${tabela}?${query}`, {
    method: "DELETE",
    headers: cabecalhosSupabase(serviceKey, { Prefer: "return=minimal" }),
  });
  if (!res.ok) throw new Error(`DELETE ${tabela}: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function supabaseInsert(supabaseUrl, serviceKey, tabela, rows) {
  if (!rows.length) return;
  const res = await fetch(`${supabaseUrl}/rest/v1/${tabela}`, {
    method: "POST",
    headers: cabecalhosSupabase(serviceKey, { Prefer: "return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${tabela}: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function supabaseUpsert(supabaseUrl, serviceKey, tabela, rows, onConflict) {
  if (!rows.length) return;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${tabela}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: cabecalhosSupabase(serviceKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) throw new Error(`UPSERT ${tabela}: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function gravarSnapshot(supabaseUrl, serviceKey, torneioId, snapshot) {
  const syncEm = snapshot.sincronizadoEm;

  await supabaseDelete(
    supabaseUrl,
    serviceKey,
    "torneio_cda_ranking",
    `torneio_id=eq.${torneioId}`,
  );

  const rankingRows = snapshot.ranking.map((r) => ({
    torneio_id: torneioId,
    user_name: r.userName,
    apelido: r.apelido,
    posicao: r.posicao,
    rodadas_jogadas: r.rodadasJogadas,
    rodadas_ganhas: r.rodadasGanhas,
    valor_apostado: r.valorApostado,
    pontos: r.pontos,
    sincronizado_em: syncEm,
  }));

  await supabaseInsert(supabaseUrl, serviceKey, "torneio_cda_ranking", rankingRows);

  await supabaseUpsert(
    supabaseUrl,
    serviceKey,
    "torneio_cda_consolidado",
    [
      {
        torneio_id: torneioId,
        rodadas_jogadas: snapshot.consolidado.rodadasJogadas,
        rodadas_ganhas: snapshot.consolidado.rodadasGanhas,
        valor_apostado: snapshot.consolidado.valorApostado,
        sincronizado_em: syncEm,
      },
    ],
    "torneio_id",
  );

  if (snapshot.atividades.length) {
    await supabaseUpsert(
      supabaseUrl,
      serviceKey,
      "torneio_cda_atividade",
      snapshot.atividades.map((a) => ({
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
      "torneio_id,game_id",
    );
  }
}

async function main() {
  if (!slugArg) {
    console.error("Informe --slug= (ex.: cda-vip-setembro-2026)");
    process.exit(1);
  }

  const env = loadEnv();
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] == null) process.env[k] = v;
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const bkoBase = (process.env.BKO_PLS_BASE_URL ?? BKO_BASE_DEFAULT).replace(/\/$/, "");
  const bkoCookie = process.env.BKO_PLS_COOKIE?.trim() ?? "";

  logBr();
  console.log(dryRun ? "Modo: dry-run" : "Modo: gravação Supabase");
  console.log(`Torneio: ${slugArg}`);

  let payload;

  if (arquivoArg) {
    console.log(`Origem: arquivo ${arquivoArg}`);
    payload = lerArquivoPayload(arquivoArg);
  } else {
    if (!bkoCookie) {
      console.error(
        "Sem --arquivo=, defina BKO_PLS_COOKIE ou extraia via scripts/torneio-cda-bko-extract-browser.js",
      );
      process.exit(1);
    }
    if (!supabaseUrl || !serviceKey) {
      console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para ler período/participantes.");
      process.exit(1);
    }
    const torneio = await carregarTorneio(supabaseUrl, serviceKey, slugArg);
    const participantes = await carregarParticipantes(supabaseUrl, serviceKey, torneio.id);
    console.log(`Extrair BKO (${participantes.length} participante(s))…`);
    payload = await extrairBko(bkoBase, bkoCookie, torneio, participantes);
    const outPath = arg("saida") ?? `tmp/torneio-cda-bko-${Date.now()}.json`;
    const absOut = resolve(root, outPath);
    mkdirSync(dirname(absOut), { recursive: true });
    writeFileSync(absOut, JSON.stringify(payload, null, 2), "utf8");
    console.log(`JSON salvo: ${outPath}`);
    if (fetchOnly) {
      console.log("--fetch-only: encerrando sem gravar.");
      return;
    }
  }

  const snapshot = montarSnapshot(payload);

  console.log("\n--- Ranking ---");
  for (const r of snapshot.ranking) {
    console.log(
      `${r.posicao}. ${r.apelido} — ${r.pontos.toLocaleString("pt-BR")} pts · ${r.rodadasJogadas} rodadas · R$ ${r.valorApostado.toLocaleString("pt-BR")}`,
    );
  }
  console.log("\n--- Consolidado ---");
  console.log(
    `Rodadas: ${snapshot.consolidado.rodadasJogadas} · Ganhas: ${snapshot.consolidado.rodadasGanhas} · Apostado: R$ ${snapshot.consolidado.valorApostado.toLocaleString("pt-BR")}`,
  );
  console.log(`Atividades: ${snapshot.atividades.length} vitória(s) recente(s)`);

  if (dryRun) {
    console.log("\nDry-run — nada gravado.");
    return;
  }

  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const torneio = await carregarTorneio(supabaseUrl, serviceKey, slugArg);
  await gravarSnapshot(supabaseUrl, serviceKey, torneio.id, snapshot);
  console.log("\nSupabase atualizado.");
}

const isMain =
  process.argv[1] != null &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
