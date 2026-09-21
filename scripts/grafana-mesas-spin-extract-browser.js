/**
 * Extract canônico de Mesas Spin via Grafana → ClickHouse.
 *
 * Executar numa página do Grafana autenticada pelo Pomerium. O script faz uma
 * única chamada a /api/ds/query com todas as consultas e deixa o resultado em:
 *   window.__mesasGrafana.network
 *   window.__mesasGrafana.dedicado
 *   window.__mesasGrafana.monthly
 *
 * DE e ATE são inclusivos. A moeda comercial vem de amount/payout (BRL) na
 * filtered_player_bets_view. As tabelas live_dwh_agg guardam dinheiro em EUR e
 * são usadas aqui somente para UAP.
 */
(async () => {
  const DE = "2026-09-16";
  const ATE = "2026-09-17";
  const DATASOURCE_UID = "risk_integrity_ch_live_sg";
  const DATASOURCE_ID = 25;
  const ENVIRONMENT = "live-sg";

  const SC = [
    "Sports Club Blackjack",
    "Sports Club Futebol Brasileiro",
    "Sports Club Roulette",
    "Sports Club Speed Baccarat",
  ];
  const CASA = [
    "Casa de Apostas Blackjack 1",
    "Casa de Apostas Blackjack 2",
    "Casa de Apostas Roulette",
    "Casa de Apostas Speed Baccarat",
    "Casa de Apostas VIP Blackjack 1",
    "Futebol Brasileiro",
  ];
  const BLAZE = [
    "Blaze Blackjack 1",
    "Blaze Blackjack 2",
    "Blaze Roulette",
    "Blaze Speed Baccarat",
    "Blaze VIP Blackjack 1",
  ];

  const NETWORK_KEYS = {
    esportiva_bet: "esportiva",
    bateu_bet: "bateu",
    brx_bet: "brx",
    rico_bet: "rico",
    donald_bet: "donald",
    betponto_bet: "betponto",
    casa_apostas: "casa",
    blaze: "blaze",
    jonbet: "jonbet",
  };
  const DEDICADO_KEYS = { casa_apostas: "casa", blaze: "blaze" };

  function isoValida(v) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
  }

  function diaSeguinte(v) {
    const d = new Date(`${v}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function mesesDoIntervalo(de, ate) {
    const out = [];
    let atual = `${de.slice(0, 7)}-01`;
    const fim = `${ate.slice(0, 7)}-01`;
    while (atual <= fim) {
      out.push(atual);
      const d = new Date(`${atual}T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + 1);
      atual = d.toISOString().slice(0, 10);
    }
    return out;
  }

  function sqlLista(values) {
    return `(${values.map((v) => `'${v.replace(/'/g, "''")}'`).join(",")})`;
  }

  if (!isoValida(DE) || !isoValida(ATE) || DE > ATE) {
    throw new Error(`Intervalo inválido: ${DE}…${ATE}`);
  }

  const ateExclusivo = diaSeguinte(ATE);
  const meses = mesesDoIntervalo(DE, ATE);
  const mesInicial = meses[0];
  const scIn = sqlLista(SC);
  const casaIn = sqlLista(CASA);
  const blazeIn = sqlLista(BLAZE);
  const playerLast =
    "arrayElement(splitByChar('.', assumeNotNull(toString(player_id))), -1)";
  const marcaSql =
    `multiIf(` +
    `match(${playerLast}, '^bateubetbr_'), 'bateu_bet', ` +
    `match(${playerLast}, '^brxbetbr_'), 'brx_bet', ` +
    `match(${playerLast}, '^ricobetbr_'), 'rico_bet', ` +
    `match(${playerLast}, '^donaldbetbr_'), 'donald_bet', ` +
    `match(${playerLast}, '^betpontobetbetbr_'), 'betponto_bet', ` +
    `'esportiva_bet')`;
  const slugNetworkSql =
    `multiIf(` +
    `operator_name = 'EsportivaBet', ${marcaSql}, ` +
    `operator_name = 'Casa De Apostas', 'casa_apostas', ` +
    `operator_name = 'Blaze' AND brand_name = 'Blaze.br', 'blaze', ` +
    `operator_name = 'Blaze' AND brand_name = 'jonbet.bet.br', 'jonbet', ` +
    `'ignorar')`;
  const slugOthersSql =
    `multiIf(` +
    `operator_name = 'Casa De Apostas', 'casa_apostas', ` +
    `brand_name = 'Blaze.br', 'blaze', 'jonbet')`;
  const slugDedicadoSql =
    "multiIf(operator_name = 'Casa De Apostas', 'casa_apostas', 'blaze')";
  const periodoBets =
    `at >= toDateTime('${DE} 00:00:00') AND ` +
    `at < toDateTime('${ateExclusivo} 00:00:00')`;
  const periodoUap =
    `at >= toDate('${DE}') AND at <= toDate('${ATE}')`;
  const periodoMes =
    `at >= toDate('${mesInicial}') AND at <= toDate('${ATE}')`;

  const queries = [
    {
      refId: "NB",
      rawSql: `SELECT
  toString(toDate(at)) AS dia,
  ${slugNetworkSql} AS slug,
  game_type,
  count(bet_id) AS apostas,
  sum(amount) AS turnover,
  sum(amount) - sum(payout) AS ggr
FROM live_dwh.filtered_player_bets_view
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoBets}
  AND currency = 'BRL'
  AND table_name IN ${scIn}
  AND (
    operator_name = 'EsportivaBet'
    OR operator_name = 'Casa De Apostas'
    OR (operator_name = 'Blaze' AND brand_name IN ('Blaze.br', 'jonbet.bet.br'))
  )
GROUP BY dia, slug, game_type
ORDER BY dia, slug, game_type`,
    },
    {
      refId: "DB",
      rawSql: `SELECT
  toString(toDate(at)) AS dia,
  ${slugDedicadoSql} AS slug,
  table_name,
  count(bet_id) AS apostas,
  sum(amount) AS turnover,
  sum(amount) - sum(payout) AS ggr
FROM live_dwh.filtered_player_bets_view
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoBets}
  AND currency = 'BRL'
  AND (
    (operator_name = 'Casa De Apostas' AND table_name IN ${casaIn})
    OR (operator_name = 'Blaze' AND table_name IN ${blazeIn})
  )
GROUP BY dia, slug, table_name
ORDER BY dia, slug, table_name`,
    },
    {
      refId: "EUT",
      rawSql: `SELECT
  toString(at) AS dia,
  ${marcaSql} AS slug,
  uniqExact(player_id) AS uap
FROM live_dwh_agg.agg_player_bets
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND operator_name = 'EsportivaBet'
  AND table_name IN ${scIn}
GROUP BY dia, slug
ORDER BY dia, slug`,
    },
    {
      refId: "EUJ",
      rawSql: `SELECT
  toString(at) AS dia,
  ${marcaSql} AS slug,
  game_type,
  uniqExact(player_id) AS uap
FROM live_dwh_agg.agg_player_bets
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND operator_name = 'EsportivaBet'
  AND table_name IN ${scIn}
GROUP BY dia, slug, game_type
ORDER BY dia, slug, game_type`,
    },
    {
      refId: "OUT",
      rawSql: `SELECT
  toString(at) AS dia,
  ${slugOthersSql} AS slug,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND table_name IN ${scIn}
  AND (
    operator_name = 'Casa De Apostas'
    OR (operator_name = 'Blaze' AND brand_name IN ('Blaze.br', 'jonbet.bet.br'))
  )
GROUP BY dia, slug
ORDER BY dia, slug`,
    },
    {
      refId: "OUJ",
      rawSql: `SELECT
  toString(at) AS dia,
  ${slugOthersSql} AS slug,
  game_type,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND table_name IN ${scIn}
  AND (
    operator_name = 'Casa De Apostas'
    OR (operator_name = 'Blaze' AND brand_name IN ('Blaze.br', 'jonbet.bet.br'))
  )
GROUP BY dia, slug, game_type
ORDER BY dia, slug, game_type`,
    },
    {
      refId: "DUT",
      rawSql: `SELECT
  toString(at) AS dia,
  ${slugDedicadoSql} AS slug,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND (
    (operator_name = 'Casa De Apostas' AND table_name IN ${casaIn})
    OR (operator_name = 'Blaze' AND table_name IN ${blazeIn})
  )
GROUP BY dia, slug
ORDER BY dia, slug`,
    },
    {
      refId: "DUJ",
      rawSql: `SELECT
  toString(at) AS dia,
  ${slugDedicadoSql} AS slug,
  game_type,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoUap}
  AND (
    (operator_name = 'Casa De Apostas' AND table_name IN ${casaIn})
    OR (operator_name = 'Blaze' AND table_name IN ${blazeIn})
  )
GROUP BY dia, slug, game_type
ORDER BY dia, slug, game_type`,
    },
    {
      refId: "EM",
      rawSql: `SELECT
  toString(toStartOfMonth(at)) AS mes,
  ${marcaSql} AS slug,
  uniqExact(player_id) AS uap
FROM live_dwh_agg.agg_player_bets
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoMes}
  AND operator_name = 'EsportivaBet'
  AND table_name IN ${scIn}
GROUP BY mes, slug
ORDER BY mes, slug`,
    },
    {
      refId: "OM",
      rawSql: `SELECT
  toString(toStartOfMonth(at)) AS mes,
  ${slugOthersSql} AS slug,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoMes}
  AND table_name IN ${scIn}
  AND (
    operator_name = 'Casa De Apostas'
    OR (operator_name = 'Blaze' AND brand_name IN ('Blaze.br', 'jonbet.bet.br'))
  )
GROUP BY mes, slug
ORDER BY mes, slug`,
    },
    {
      refId: "DM",
      rawSql: `SELECT
  toString(toStartOfMonth(at)) AS mes,
  ${slugDedicadoSql} AS slug,
  uniqExactMerge(uap) AS uap
FROM live_dwh_agg.agg_reporting_uap
WHERE environment = '${ENVIRONMENT}'
  AND ${periodoMes}
  AND (
    (operator_name = 'Casa De Apostas' AND table_name IN ${casaIn})
    OR (operator_name = 'Blaze' AND table_name IN ${blazeIn})
  )
GROUP BY mes, slug
ORDER BY mes, slug`,
    },
  ].map((q) => ({
    ...q,
    format: 1,
    queryType: "table",
    editorType: "sql",
    datasource: { type: "grafana-clickhouse-datasource", uid: DATASOURCE_UID },
    datasourceId: DATASOURCE_ID,
    intervalMs: 60000,
    maxDataPoints: 50000,
  }));

  const started = Date.now();
  const response = await fetch(
    "/api/ds/query?ds_type=grafana-clickhouse-datasource",
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "X-Datasource-Uid": DATASOURCE_UID,
        "X-Grafana-Org-Id": "1",
        "X-Plugin-Id": "grafana-clickhouse-datasource",
      },
      body: JSON.stringify({
        queries,
        from: String(Date.parse(`${DE}T00:00:00Z`)),
        to: String(Date.parse(`${ateExclusivo}T00:00:00Z`)),
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Grafana HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`,
    );
  }

  function rows(refId) {
    const result = payload?.results?.[refId];
    if (result?.error) throw new Error(`${refId}: ${result.error}`);
    const frame = result?.frames?.[0];
    if (!frame) return [];
    const fields = frame.schema?.fields?.map((f) => f.name) ?? [];
    const values = frame.data?.values ?? [];
    const total = values[0]?.length ?? 0;
    return Array.from({ length: total }, (_, rowIndex) =>
      Object.fromEntries(
        fields.map((field, columnIndex) => [
          field,
          values[columnIndex]?.[rowIndex] ?? null,
        ]),
      ),
    );
  }

  function emptyMetric() {
    return { byDay: {}, ok: true };
  }

  function emptyBlock() {
    return {
      TO: emptyMetric(),
      GGR: emptyMetric(),
      BET: emptyMetric(),
      UAP: emptyMetric(),
      UAP_TOT: emptyMetric(),
    };
  }

  function makeExtract(modo, keys) {
    const out = { modo, de: DE, ate: ateExclusivo };
    for (const key of Object.values(keys)) out[key] = emptyBlock();
    return out;
  }

  function add(block, metric, dia, valueKey, value, f = null) {
    if (!block?.[metric]) return;
    if (!block[metric].byDay[dia]) block[metric].byDay[dia] = [];
    block[metric].byDay[dia].push({
      [valueKey]: Number(value ?? 0),
      f,
    });
  }

  const network = makeExtract("network", NETWORK_KEYS);
  const dedicado = makeExtract("dedicado", DEDICADO_KEYS);

  for (const row of rows("NB")) {
    const key = NETWORK_KEYS[row.slug];
    const block = network[key];
    if (!block) continue;
    add(block, "TO", row.dia, "TO", row.turnover, row.game_type);
    add(block, "GGR", row.dia, "GGR", row.ggr, row.game_type);
    add(block, "BET", row.dia, "BET", row.apostas, row.game_type);
  }

  for (const row of rows("DB")) {
    const key = DEDICADO_KEYS[row.slug];
    const block = dedicado[key];
    if (!block) continue;
    add(block, "TO", row.dia, "TO", row.turnover, row.table_name);
    add(block, "GGR", row.dia, "GGR", row.ggr, row.table_name);
    add(block, "BET", row.dia, "BET", row.apostas, row.table_name);
  }

  for (const row of [...rows("EUT"), ...rows("OUT")]) {
    const block = network[NETWORK_KEYS[row.slug]];
    add(block, "UAP_TOT", row.dia, "UAP", row.uap);
  }
  for (const row of [...rows("EUJ"), ...rows("OUJ")]) {
    const block = network[NETWORK_KEYS[row.slug]];
    add(block, "UAP", row.dia, "UAP", row.uap, row.game_type);
  }
  for (const row of rows("DUT")) {
    const block = dedicado[DEDICADO_KEYS[row.slug]];
    add(block, "UAP_TOT", row.dia, "UAP", row.uap);
  }
  for (const row of rows("DUJ")) {
    const block = dedicado[DEDICADO_KEYS[row.slug]];
    add(block, "UAP", row.dia, "UAP", row.uap, row.game_type);
  }

  const monthRows = meses.map((mes) => {
    const month = { mes };
    for (const [slug, key] of Object.entries(NETWORK_KEYS)) {
      month[`net_${key}`] = {
        uap: Number(
          [...rows("EM"), ...rows("OM")].find(
            (row) => row.mes === mes && row.slug === slug,
          )?.uap ?? 0,
        ),
      };
    }
    for (const [slug, key] of Object.entries(DEDICADO_KEYS)) {
      month[`ded_${key}`] = {
        uap: Number(
          rows("DM").find((row) => row.mes === mes && row.slug === slug)?.uap ??
            0,
        ),
      };
    }
    return month;
  });
  const monthly = {
    modo: "monthly",
    de: mesInicial,
    ate: ateExclusivo,
    months: monthRows,
    ...monthRows.at(-1),
  };

  const result = {
    network,
    dedicado,
    monthly,
    meta: {
      fonte: "grafana-clickhouse",
      datasource: DATASOURCE_UID,
      de: DE,
      ate: ATE,
      elapsedMs: Date.now() - started,
      queryCount: queries.length,
    },
  };
  globalThis.__mesasGrafana = result;
  return {
    ok: true,
    ...result.meta,
    rows: Object.fromEntries(
      Object.keys(payload.results ?? {}).map((refId) => [
        refId,
        rows(refId).length,
      ]),
    ),
  };
})();
