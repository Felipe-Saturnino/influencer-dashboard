/**
 * Extrai KPIs de Game Presenters do ClickHouse (via Grafana /api/ds/query) e grava em
 * public.gp_kpi_diario, já vinculado à mesa Spin (mesas_spin_cadastro.mesa_identificacao)
 * e ao staff (rh_funcionarios.staff_id_operacional = Work ID do Grafana / ID operacional).
 *
 * O Grafana está atrás do Pomerium. Dois modos de obter os dados:
 *
 *   1. Navegador (preferido) — a sessão é a do usuário logado numa aba controlada pelo
 *      agente; a resposta bruta é salva em arquivo e carregada com --arquivo=.
 *   2. Cookie — sessão capturada no DevTools em GRAFANA_GP_KPI_COOKIE (expira).
 *
 * Uso:
 *   node scripts/grafana-gp-kpi-run.mjs --sql
 *   node scripts/grafana-gp-kpi-run.mjs --arquivo=tmp/gp-kpi.json --dry-run
 *   node scripts/grafana-gp-kpi-run.mjs --arquivo=tmp/gp-kpi.json
 *   node scripts/grafana-gp-kpi-run.mjs --de=2026-07-01 --ate=2026-07-30
 *
 * Env obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Env obrigatória no modo cookie: GRAFANA_GP_KPI_COOKIE
 * Env opcionais: GRAFANA_GP_KPI_BASE_URL, GRAFANA_GP_KPI_DATASOURCE_UID,
 *                GRAFANA_GP_KPI_DATASOURCE_ID, GRAFANA_GP_KPI_AMBIENTE
 */

import { readFileSync } from "node:fs";

const BASE_URL_DEFAULT = "https://spingaming2.grafana.proxylive.tech";
const DATASOURCE_UID_DEFAULT = "risk_integrity_ch_live_sg";
const DATASOURCE_ID_DEFAULT = 25;
const AMBIENTE_DEFAULT = "live-sg";
const LOTE_DIAS_DEFAULT = 7;
const UPSERT_LOTE = 500;

const CHAVE_UPSERT = "dia_brt,ambiente,table_id,game_presenter_id";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

const dryRun = process.argv.includes("--dry-run");
const somenteSql = process.argv.includes("--sql");

function logBr() {
  const s = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[${s} Brasília]`);
}

function ehDataIso(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function diaSeguinte(dataIso) {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function segundosInicioDiaBrt(dataIso) {
  // America/Sao_Paulo está em UTC-3 no período coberto pela operação (sem horário de verão).
  return Math.floor(new Date(`${dataIso}T03:00:00Z`).getTime() / 1000);
}

/** Fatia o período em blocos de N dias: [{ de, ateExclusivo }]. */
function fatiarPeriodo(de, ateInclusivo, loteDias) {
  const blocos = [];
  let cursor = de;
  const limite = diaSeguinte(ateInclusivo);
  while (cursor < limite) {
    let fim = cursor;
    for (let i = 0; i < loteDias && fim < limite; i += 1) fim = diaSeguinte(fim);
    blocos.push({ de: cursor, ateExclusivo: fim });
    cursor = fim;
  }
  return blocos;
}

/**
 * SQL ClickHouse consolidada: um bloco por dia de Brasília × mesa × Game Presenter.
 * Faixas e limiares iguais aos do painel Grafana GP KPI (paridade de números).
 */
function montarSql({ deSegundos, ateSegundos, ambiente }) {
  const amb = ambiente
    .split(",")
    .map((s) => `'${s.trim().replace(/'/g, "")}'`)
    .join(", ");

  return `SELECT
  toString(toDate(base.game_started_at, 'America/Sao_Paulo')) AS dia_brt,
  base.table_id                                               AS table_id,
  base.game_presenter_id                                      AS game_presenter_id,
  uniqExact(base.game_id)                                     AS rodadas,
  sum(ifNull(base.dealing_ms, 0))                             AS dealing_ms_soma,
  countIf(isNotNull(base.dealing_ms))                         AS dealing_amostras,
  sum(ifNull(base.reaction_ms, 0))                            AS reaction_ms_soma,
  countIf(isNotNull(base.reaction_ms))                        AS reaction_amostras,
  sum(base.coop_velocidade)                                   AS coop_velocidade,
  sum(base.coop_roda)                                         AS coop_roda
FROM
(
  SELECT
    gp.game_id           AS game_id,
    gp.game_started_at   AS game_started_at,
    gp.table_id          AS table_id,
    gp.game_presenter_id AS game_presenter_id,
    gp.game_type         AS game_type,

    multiIf(
      gp.game_type IN ('Blackjack', 'BgtvBlackjack', 'SpeedBlackjack')
        AND ifNull(sbj.average_dealing_time < 10000, 0), toFloat64(sbj.average_dealing_time),
      gp.game_type IN ('StandardBaccarat', 'LotusSpeedBaccarat', 'CardMatchup', 'DragonTiger'),
        toFloat64(sbc.initial_dealing_time),
      NULL
    ) AS dealing_ms,

    multiIf(
      gp.game_type IN ('Blackjack', 'BgtvBlackjack', 'SpeedBlackjack')
        AND ifNull(sbj.reaction_time < 10000, 0), toFloat64(sbj.reaction_time),
      gp.game_type = 'ScalableBlackjack'
        AND ifNull(sbs.reaction_time < 10000, 0), toFloat64(sbs.reaction_time),
      gp.game_type IN ('StandardBaccarat', 'LotusSpeedBaccarat', 'CardMatchup', 'DragonTiger'),
        toFloat64(sbc.reaction_time),
      gp.game_type = 'MoneyWheel', toFloat64(smw.reaction_time),
      NULL
    ) AS reaction_ms,

    multiIf(
      gp.game_type IN ('Roulette', 'SpeedRoulette') AND (
        ifNull(srl.requested_ball_revolution = 'Low'    AND srl.performed_ball_revolution BETWEEN 4  AND 9,  0)
        OR ifNull(srl.requested_ball_revolution = 'Medium' AND srl.performed_ball_revolution BETWEEN 10 AND 16, 0)
        OR ifNull(srl.requested_ball_revolution = 'High'   AND srl.performed_ball_revolution BETWEEN 17 AND 23, 0)
      ), 1,
      gp.game_type = 'BonusRoulette' AND (
        ifNull(srb.requested_ball_revolution = 'Low'    AND srb.performed_ball_revolution BETWEEN 6  AND 11, 0)
        OR ifNull(srb.requested_ball_revolution = 'Medium' AND srb.performed_ball_revolution BETWEEN 12 AND 18, 0)
        OR ifNull(srb.requested_ball_revolution = 'High'   AND srb.performed_ball_revolution BETWEEN 19 AND 25, 0)
      ), 1,
      0
    ) AS coop_velocidade,

    if(
      gp.game_type IN ('Roulette', 'SpeedRoulette')
        AND ifNull(srl.performed_wheel_speed BETWEEN 15 AND 20, 0),
      1, 0
    ) AS coop_roda

  FROM game_presenter gp
  LEFT JOIN stats_blackjack          sbj ON gp.game_id = sbj.game_id
  LEFT JOIN stats_blackjack_scalable sbs ON gp.game_id = sbs.game_id
  LEFT JOIN stats_baccarat           sbc ON gp.game_id = sbc.game_id
  LEFT JOIN stats_roulette           srl ON gp.game_id = srl.game_id
  LEFT JOIN stats_roulette_bonus     srb ON gp.game_id = srb.game_id
  LEFT JOIN stats_moneywheel_spin    smw ON gp.game_id = smw.game_id
  WHERE gp.game_started_at >= toDateTime(${deSegundos})
    AND gp.game_started_at <  toDateTime(${ateSegundos})
    AND gp.environment IN (${amb})
    AND lowerUTF8(trim(gp.game_presenter_id)) != 'autowheel'
) AS base
GROUP BY dia_brt, table_id, game_presenter_id
HAVING rodadas > 0
ORDER BY dia_brt, table_id, game_presenter_id`;
}

async function consultarGrafana({ baseUrl, cookie, dsUid, dsId, sql, deSegundos, ateSegundos }) {
  const url = `${baseUrl}/api/ds/query?ds_type=grafana-clickhouse-datasource`;
  const res = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: baseUrl,
      Referer: `${baseUrl}/`,
      "X-Datasource-Uid": dsUid,
      "X-Grafana-Org-Id": "1",
      "X-Plugin-Id": "grafana-clickhouse-datasource",
    },
    body: JSON.stringify({
      queries: [
        {
          refId: "A",
          rawSql: sql,
          format: 1,
          queryType: "table",
          editorType: "sql",
          meta: { timezone: "UTC" },
          datasource: { type: "grafana-clickhouse-datasource", uid: dsUid },
          datasourceId: dsId,
          intervalMs: 60000,
          maxDataPoints: 10000,
        },
      ],
      from: String(deSegundos * 1000),
      to: String(ateSegundos * 1000),
    }),
  });

  if (res.status === 302 || res.status === 401 || res.status === 403) {
    throw new Error(
      `Grafana HTTP ${res.status} — sessão Pomerium expirada ou ausente. Renovar GRAFANA_GP_KPI_COOKIE (ver docs/SETUP-GP-KPI-GRAFANA.md).`,
    );
  }
  if (!res.ok) {
    throw new Error(`Grafana HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const payload = await res.json();
  const resultado = payload?.results?.A;
  if (!resultado) throw new Error("Resposta do Grafana sem o resultado A.");
  if (resultado.error) throw new Error(`ClickHouse: ${resultado.error}`);

  return frameParaLinhas(resultado.frames?.[0]);
}

/** Converte o frame colunar do Grafana em array de objetos por nome de campo. */
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

/**
 * Lê linhas de um arquivo salvo pelo navegador. Aceita a resposta bruta do Grafana
 * (um objeto ou uma lista de blocos), uma lista de frames ou linhas já normalizadas.
 */
function lerArquivoLinhas(caminho) {
  let bruto = JSON.parse(readFileSync(caminho, "utf8"));
  // O navegador controlado pelo Cursor salva respostas grandes do Runtime.evaluate
  // neste envelope; o value contém a resposta JSON original do Grafana.
  if (bruto?.result?.type === "string" && typeof bruto.result.value === "string") {
    bruto = JSON.parse(bruto.result.value);
  }
  const blocos = Array.isArray(bruto) ? bruto : [bruto];
  const linhas = [];

  for (const bloco of blocos) {
    if (bloco == null) continue;

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

    if (bloco?.table_id != null) {
      linhas.push(bloco);
      continue;
    }

    throw new Error(
      "Formato não reconhecido em --arquivo: esperado resposta do Grafana, frames ou linhas com table_id.",
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

async function carregarMesas(supabaseUrl, serviceKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/mesas_spin_cadastro?select=id,mesa_identificacao,nome_mesa,tipo_jogo,estudio_slug,operadora_slug&order=mesa_identificacao`,
    { headers: cabecalhosSupabase(serviceKey) },
  );
  if (!res.ok) {
    throw new Error(`Erro mesas_spin_cadastro: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const mapa = new Map();
  for (const mesa of await res.json()) {
    const chave = String(mesa.mesa_identificacao ?? "").trim().toLowerCase();
    if (chave) mapa.set(chave, mesa);
  }
  return mapa;
}

/**
 * Work ID (Grafana) = ID operacional em Gestão de Staff (rh_funcionarios.staff_id_operacional).
 * Em caso de duplicata no cadastro, mantém o primeiro e lista o código no aviso.
 */
async function carregarStaffPorIdOperacional(supabaseUrl, serviceKey) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rh_funcionarios?select=id,nome,staff_id_operacional&staff_id_operacional=not.is.null&order=nome`,
    { headers: cabecalhosSupabase(serviceKey) },
  );
  if (!res.ok) {
    throw new Error(`Erro rh_funcionarios: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const mapa = new Map();
  const duplicados = new Set();
  for (const row of await res.json()) {
    const chave = String(row.staff_id_operacional ?? "").trim().toLowerCase();
    if (!chave) continue;
    if (mapa.has(chave)) {
      duplicados.add(chave);
      continue;
    }
    mapa.set(chave, row);
  }
  return { mapa, duplicados };
}

function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function montarRegistro(linha, ambiente, mesasPorId, staffPorIdOp) {
  const tableId = String(linha.table_id ?? "").trim();
  const gpId = String(linha.game_presenter_id ?? "").trim();
  const mesa = mesasPorId.get(tableId.toLowerCase()) ?? null;
  const staff = staffPorIdOp.get(gpId.toLowerCase()) ?? null;
  return {
    dia_brt: linha.dia_brt,
    ambiente,
    table_id: tableId,
    game_presenter_id: gpId,
    mesa_id: mesa?.id ?? null,
    funcionario_id: staff?.id ?? null,
    estudio_slug: mesa?.estudio_slug ?? null,
    operadora_slug: mesa?.operadora_slug ?? null,
    rodadas: numero(linha.rodadas),
    dealing_ms_soma: numero(linha.dealing_ms_soma),
    dealing_amostras: numero(linha.dealing_amostras),
    reaction_ms_soma: numero(linha.reaction_ms_soma),
    reaction_amostras: numero(linha.reaction_amostras),
    coop_velocidade: numero(linha.coop_velocidade),
    coop_roda: numero(linha.coop_roda),
    sincronizado_em: new Date().toISOString(),
  };
}

async function gravarLote(supabaseUrl, serviceKey, registros) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/gp_kpi_diario?on_conflict=${encodeURIComponent(CHAVE_UPSERT)}`,
    {
      method: "POST",
      headers: cabecalhosSupabase(serviceKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(registros),
    },
  );
  if (!res.ok) {
    throw new Error(`Erro upsert gp_kpi_diario: ${res.status} ${(await res.text()).slice(0, 500)}`);
  }
}

async function main() {
  const baseUrl = (process.env.GRAFANA_GP_KPI_BASE_URL?.trim() || BASE_URL_DEFAULT).replace(/\/$/, "");
  const dsUid = process.env.GRAFANA_GP_KPI_DATASOURCE_UID?.trim() || DATASOURCE_UID_DEFAULT;
  const dsId = Number(process.env.GRAFANA_GP_KPI_DATASOURCE_ID ?? DATASOURCE_ID_DEFAULT);
  const ambiente = process.env.GRAFANA_GP_KPI_AMBIENTE?.trim() || AMBIENTE_DEFAULT;

  const arquivo = arg("arquivo");
  const hoje = new Date().toISOString().slice(0, 10);
  const de = arg("de") ?? hoje;
  const ate = arg("ate") ?? de;
  const loteDias = Math.max(1, Number(arg("lote") ?? LOTE_DIAS_DEFAULT));

  if (!arquivo && (!ehDataIso(de) || !ehDataIso(ate))) {
    console.error("Datas inválidas. Use --de=AAAA-MM-DD --ate=AAAA-MM-DD.");
    process.exit(1);
  }
  if (!arquivo && ate < de) {
    console.error("A data final não pode ser anterior à inicial.");
    process.exit(1);
  }

  if (somenteSql) {
    console.log(
      montarSql({
        deSegundos: segundosInicioDiaBrt(de),
        ateSegundos: segundosInicioDiaBrt(diaSeguinte(ate)),
        ambiente,
      }),
    );
    return;
  }

  logBr();
  console.log(dryRun ? "Modo: dry-run (não grava)" : "Modo: produção");
  console.log(
    arquivo
      ? `Origem: arquivo ${arquivo} (ambiente ${ambiente})`
      : `Período: ${de} a ${ate} (ambiente ${ambiente}, blocos de ${loteDias} dia(s))`,
  );

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cookie = process.env.GRAFANA_GP_KPI_COOKIE?.trim();

  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!arquivo && !cookie) {
    console.error(
      "Sem --arquivo=, é preciso GRAFANA_GP_KPI_COOKIE (sessão logada no Grafana). Ver docs/SETUP-GP-KPI-GRAFANA.md",
    );
    process.exit(1);
  }

  const mesasPorId = await carregarMesas(supabaseUrl, serviceKey);
  console.log(`Mesas no cadastro Spin: ${mesasPorId.size}`);

  const { mapa: staffPorIdOp, duplicados: idOpDuplicados } =
    await carregarStaffPorIdOperacional(supabaseUrl, serviceKey);
  console.log(`Staff com ID operacional: ${staffPorIdOp.size}`);
  if (idOpDuplicados.size > 0) {
    console.log(
      `Aviso — ID operacional duplicado no cadastro (${idOpDuplicados.size}): ${[...idOpDuplicados].sort().join(", ")}`,
    );
  }

  const semCadastro = new Set();
  const gpSemStaff = new Set();
  let totalLinhas = 0;
  let totalGravadas = 0;

  async function processar(linhas, rotulo) {
    const registros = linhas
      .filter((l) => String(l.game_presenter_id ?? "").trim().toLowerCase() !== "autowheel")
      .map((l) => montarRegistro(l, ambiente, mesasPorId, staffPorIdOp));
    for (const r of registros) {
      if (!r.mesa_id) semCadastro.add(r.table_id);
      if (!r.funcionario_id && r.game_presenter_id) gpSemStaff.add(r.game_presenter_id);
    }
    totalLinhas += registros.length;
    console.log(`${rotulo}: ${registros.length} linha(s)`);

    if (dryRun || registros.length === 0) return;

    for (let i = 0; i < registros.length; i += UPSERT_LOTE) {
      const fatia = registros.slice(i, i + UPSERT_LOTE);
      await gravarLote(supabaseUrl, serviceKey, fatia);
      totalGravadas += fatia.length;
    }
  }

  if (arquivo) {
    await processar(lerArquivoLinhas(arquivo), "Arquivo");
  } else {
    for (const bloco of fatiarPeriodo(de, ate, loteDias)) {
      const linhas = await consultarGrafana({
        baseUrl,
        cookie,
        dsUid,
        dsId,
        sql: montarSql({
          deSegundos: segundosInicioDiaBrt(bloco.de),
          ateSegundos: segundosInicioDiaBrt(bloco.ateExclusivo),
          ambiente,
        }),
        deSegundos: segundosInicioDiaBrt(bloco.de),
        ateSegundos: segundosInicioDiaBrt(bloco.ateExclusivo),
      });
      await processar(linhas, `Bloco ${bloco.de} → ${bloco.ateExclusivo} (exclusivo)`);
    }
  }

  console.log(`Linhas do ClickHouse: ${totalLinhas}`);
  console.log(dryRun ? "Gravadas: 0 (dry-run)" : `Gravadas: ${totalGravadas}`);

  if (semCadastro.size > 0) {
    console.log(
      `Mesas sem cadastro Spin (${semCadastro.size}): ${[...semCadastro].sort().join(", ")}`,
    );
    console.log("Cadastrar em Plataforma → Gestão de Estúdios → Mesas para atribuir estúdio.");
  }
  if (gpSemStaff.size > 0) {
    console.log(
      `Work IDs sem ID operacional no staff (${gpSemStaff.size}): ${[...gpSemStaff].sort().join(", ")}`,
    );
    console.log(
      "Preencher o campo ID operacional em RH → Gestão de Staff com o mesmo código do Grafana.",
    );
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
