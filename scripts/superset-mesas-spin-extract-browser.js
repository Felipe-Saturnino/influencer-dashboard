/**
 * Payload para Runtime.evaluate no Daily Commercial Report [BRL]
 * (dashboard 15, dataset 12, C1-BR / live-sg).
 *
 * Abrir https://superset-sg.proxylive.tech/superset/dashboard/15/ logado,
 * ajustar MODO / DE / ATE abaixo (ou via tmp/make-compact-extract.mjs),
 * injetar o IIFE no CDP (awaitPromise + returnByValue) — preferir oneshot
 * (tmp/make-oneshot-inject.mjs) em vez de dezenas de chunks.
 *
 * MODO:
 *   network  — Sports Club × Esportiva group / Casa / Blaze.br / jonbet.bet.br
 *   dedicado — mesas Casa / Blaze (sem brand)
 *   monthly  — UAP MTD do mês de DE (slice 461): time_range = dia 1 do mês → ATE
 *              (ATE exclusivo). Não usar DE mid-month — evita UAP parcial no monthly_summary.
 *
 * Grupo EsportivaBet (operator_name=EsportivaBet, brand_name vazio):
 *   1 query por métrica com coluna SQL `marca` (multiIf no último segmento de player_id),
 *   depois split client-side nas keys esportiva/bateu/brx/rico/donald/betponto.
 *
 * Performance:
 *   FORCE=false — usa cache do Superset (true só em reload histórico).
 *   CONCURRENCY — pool de queries paralelas (WebSocket async).
 *
 * ATE é exclusivo no time_range do Superset (usar o dia seguinte ao último dia).
 * Ex.: 04–11/08 → DE='2026-08-04', ATE='2026-08-13'
 *      monthly nesse caso → '2026-08-01 : 2026-08-13'
 */
(async () => {
  const MODO = "network"; // "network" | "dedicado" | "monthly"
  const DE = "2026-08-28";
  const ATE = "2026-08-31";
  /** false = cache Superset (carga diária). true = bypass (reload histórico). */
  const FORCE = false;
  /** Máx. de chart/data em voo (async jobs via WS). */
  const CONCURRENCY = 4;

  const SC = [
    "Sports Club Blackjack",
    "Sports Club Futebol Brasileiro",
    "Sports Club Roulette",
    "Sports Club Speed Baccarat",
  ];
  const BLAZE = [
    "Blaze Blackjack 1",
    "Blaze Blackjack 2",
    "Blaze Roulette",
    "Blaze Speed Baccarat",
    "Blaze VIP Blackjack 1",
  ];
  const CASA = [
    "Casa de Apostas Blackjack 1",
    "Casa de Apostas Blackjack 2",
    "Casa de Apostas Roulette",
    "Casa de Apostas Speed Baccarat",
    "Casa de Apostas VIP Blackjack 1",
    "Futebol Brasileiro",
  ];

  const SLICES = { TO: 450, GGR: 421, BET: 451, UAP: 449, UAP_TOT: 461 };
  const TIME_RANGE = `${DE} : ${ATE}`;
  /** MTD do mês de DE: sempre do dia 1 até ATE (exclusivo). */
  const MONTHLY_TIME_RANGE = `${DE.slice(0, 7)}-01 : ${ATE}`;

  const PLAYER_LAST_SEG =
    "arrayElement(splitByChar('.', assumeNotNull(toString(player_id))), -1)";
  /** Dimensão de marca — uma query cobre as 6 keys do grupo EsportivaBet. */
  const BRAND_SQL = `multiIf(match(${PLAYER_LAST_SEG}, '^bateubetbr_'), 'bateu', match(${PLAYER_LAST_SEG}, '^brxbetbr_'), 'brx', match(${PLAYER_LAST_SEG}, '^ricobetbr_'), 'rico', match(${PLAYER_LAST_SEG}, '^donaldbetbr_'), 'donald', match(${PLAYER_LAST_SEG}, '^betpontobetbetbr_'), 'betponto', 'esportiva')`;
  const ESPORTIVA_KEYS = ["esportiva", "bateu", "brx", "rico", "donald", "betponto"];

  const SCENARIOS = {
    network: [
      { key: "esportiva_group", op: "EsportivaBet", brand: null, tables: SC, splitMarca: true },
      { key: "casa", op: "Casa De Apostas", brand: null, tables: SC },
      { key: "blaze", op: "Blaze", brand: "Blaze.br", tables: SC },
      { key: "jonbet", op: "Blaze", brand: "jonbet.bet.br", tables: SC },
    ],
    dedicado: [
      { key: "casa", op: "Casa De Apostas", brand: null, tables: CASA },
      { key: "blaze", op: "Blaze", brand: null, tables: BLAZE },
    ],
    monthly: [
      { key: "ded_casa", op: "Casa De Apostas", brand: null, tables: CASA },
      { key: "ded_blaze", op: "Blaze", brand: null, tables: BLAZE },
      { key: "net_esportiva_group", op: "EsportivaBet", brand: null, tables: SC, splitMarca: true },
      { key: "net_casa", op: "Casa De Apostas", brand: null, tables: SC },
      { key: "net_blaze", op: "Blaze", brand: "Blaze.br", tables: SC },
      { key: "net_jonbet", op: "Blaze", brand: "jonbet.bet.br", tables: SC },
    ],
  };

  const chartsR = await fetch("/api/v1/dashboard/15/charts", { credentials: "include" });
  const all = (await chartsR.json()).result || [];
  const sliceById = Object.fromEntries(all.map((c) => [c.id, c]));

  const pending = new Map();
  const ws = new WebSocket("wss://superset-sg.proxylive.tech/ws");
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ws timeout")), 15000);
    ws.onopen = () => {
      clearTimeout(t);
      resolve();
    };
    ws.onerror = () => {
      clearTimeout(t);
      reject(new Error("ws error"));
    };
  });
  ws.onmessage = (ev) => {
    try {
      const m = JSON.parse(String(ev.data));
      const w = pending.get(m.job_id);
      if (w && m.status === "done" && m.result_url) w(m.result_url.split("/").pop());
    } catch {
      /* ignore */
    }
  };

  const isoDay = (ms) => new Date(Number(ms)).toISOString().slice(0, 10);

  async function mapPool(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const idx = next++;
        results[idx] = await fn(items[idx], idx);
      }
    }
    const n = Math.min(limit, Math.max(1, items.length));
    await Promise.all(Array.from({ length: n }, () => worker()));
    return results;
  }

  function metricValue(row, valueKey) {
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
    const skip = new Set(["f", "at", "game_type", "table_name", "marca"]);
    for (const [k, v] of Object.entries(row)) {
      if (!skip.has(k) && typeof v === "number") return v;
    }
    return undefined;
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

  function byDayFrom(data, valueKey, dimKey) {
    const byDay = {};
    for (const row of data || []) {
      const day = isoDay(row.at);
      if (day < DE || day >= ATE) continue;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({ [valueKey]: metricValue(row, valueKey), f: row[dimKey] ?? null });
    }
    return byDay;
  }

  /** Split rows com coluna `marca` → map key → byDay. */
  function byDayFromMarca(data, valueKey, fieldKey) {
    const byMarca = Object.fromEntries(ESPORTIVA_KEYS.map((k) => [k, {}]));
    for (const row of data || []) {
      const day = isoDay(row.at);
      if (day < DE || day >= ATE) continue;
      const marca = ESPORTIVA_KEYS.includes(row.marca) ? row.marca : "esportiva";
      if (!byMarca[marca][day]) byMarca[marca][day] = [];
      byMarca[marca][day].push({
        [valueKey]: metricValue(row, valueKey),
        f: fieldKey ? (row[fieldKey] ?? null) : null,
      });
    }
    return byMarca;
  }

  async function fetchChartData({ sliceId, sc, columns, timeRange, whereSql }) {
    const slice = sliceById[sliceId];
    if (!slice) return { err: `slice ${sliceId} ausente`, data: [] };
    const filters = [
      { col: "operator_name", op: "IN", val: [sc.op] },
      { col: "table_name", op: "IN", val: sc.tables },
    ];
    if (sc.brand) filters.push({ col: "brand_name", op: "IN", val: [sc.brand] });
    const fm = { ...slice.form_data, dashboardId: 15, extra_form_data: { filters } };
    const adhoc = [
      {
        clause: "WHERE",
        subject: "at",
        operator: "TEMPORAL_RANGE",
        operatorId: "TEMPORAL_RANGE",
        comparator: timeRange,
        expressionType: "SIMPLE",
        isExtra: true,
      },
      {
        clause: "WHERE",
        subject: "operator_name",
        operator: "IN",
        operatorId: "IN",
        comparator: [sc.op],
        expressionType: "SIMPLE",
        isExtra: true,
      },
      {
        clause: "WHERE",
        subject: "table_name",
        operator: "IN",
        operatorId: "IN",
        comparator: sc.tables,
        expressionType: "SIMPLE",
        isExtra: true,
      },
    ];
    if (sc.brand) {
      adhoc.push({
        clause: "WHERE",
        subject: "brand_name",
        operator: "IN",
        operatorId: "IN",
        comparator: [sc.brand],
        expressionType: "SIMPLE",
        isExtra: true,
      });
    }
    fm.adhoc_filters = adhoc;
    const url =
      "/api/v1/chart/data?form_data=" +
      encodeURIComponent(JSON.stringify({ slice_id: sliceId })) +
      "&dashboard_id=15";
    const body = {
      datasource: { id: 12, type: "table" },
      force: FORCE,
      queries: [
        {
          filters,
          extras: { having: "", where: whereSql || "" },
          applied_time_extras: {},
          columns,
          metrics: fm.metrics,
          orderby: [],
          annotation_layers: [],
          row_limit: 10000,
          series_limit: 0,
          group_others_when_limit_reached: false,
          time_range: timeRange,
        },
      ],
      form_data: fm,
      result_format: "json",
      result_type: "full",
    };
    const r = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        Referer: location.origin + "/superset/dashboard/15/",
      },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    let res = null;
    if (r.status === 200 && j.result) res = j.result[0];
    else {
      const ck = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(null), 90000);
        pending.set(j.job_id, (cacheKey) => {
          clearTimeout(t);
          resolve(cacheKey);
        });
      });
      if (!ck) return { err: "timeout", data: null, ok: false };
      const cr = await fetch("/api/v1/chart/data/" + ck, { credentials: "include" });
      const cj = await cr.json();
      res = (cj.result && cj.result[0]) || {};
    }
    return { data: res.data || [], ok: true };
  }

  async function runQuery(sliceId, sc, columns, valueKey, dimKey, timeRange) {
    const tr = timeRange || TIME_RANGE;
    const got = await fetchChartData({ sliceId, sc, columns, timeRange: tr });
    if (!got.ok) return { err: got.err || "timeout", byDay: {}, ok: false };
    if (sc.splitMarca) {
      return { byMarca: byDayFromMarca(got.data, valueKey, dimKey), ok: true, splitMarca: true };
    }
    return { byDay: byDayFrom(got.data, valueKey, dimKey), ok: true };
  }

  const dayCol = {
    expressionType: "SQL",
    label: "at",
    sqlExpression: "toStartOfDay(toDateTime(`at`))",
  };
  const monthCol = {
    expressionType: "SQL",
    label: "at",
    sqlExpression: "toStartOfMonth(toDateTime(`at`))",
  };
  const gameCol = { expressionType: "SQL", label: "game_type", sqlExpression: "`game_type`" };
  const tableCol = { expressionType: "SQL", label: "table_name", sqlExpression: "`table_name`" };
  const marcaCol = { expressionType: "SQL", label: "marca", sqlExpression: BRAND_SQL };

  const out = { modo: MODO, de: DE, ate: ATE };

  if (MODO === "monthly") {
    const mesUtc = Date.UTC(Number(DE.slice(0, 4)), Number(DE.slice(5, 7)) - 1, 1);
    out.mes = `${DE.slice(0, 7)}-01`;
    out.monthlyTimeRange = MONTHLY_TIME_RANGE;
    for (const k of ESPORTIVA_KEYS) out[`net_${k}`] = { uap: 0 };

    await mapPool(SCENARIOS.monthly, CONCURRENCY, async (sc) => {
      const cols = sc.splitMarca ? [monthCol, marcaCol] : [monthCol];
      const got = await fetchChartData({
        sliceId: SLICES.UAP_TOT,
        sc,
        columns: cols,
        timeRange: MONTHLY_TIME_RANGE,
      });
      if (!got.ok) {
        if (sc.splitMarca) {
          for (const k of ESPORTIVA_KEYS) out[`net_${k}`] = { err: got.err || "timeout", uap: null };
        } else {
          out[sc.key] = { err: got.err || "timeout", uap: null };
        }
        return;
      }
      if (sc.splitMarca) {
        for (const row of got.data || []) {
          if (row.at !== mesUtc) continue;
          const marca = ESPORTIVA_KEYS.includes(row.marca) ? row.marca : "esportiva";
          out[`net_${marca}`] = { uap: row.UAP != null ? row.UAP : 0 };
        }
        return;
      }
      const row = (got.data || []).find((d) => d.at === mesUtc);
      out[sc.key] = { uap: row ? row.UAP : null };
    });

    try {
      ws.close();
    } catch {
      /* ignore */
    }
    return out;
  }

  const dimCol = MODO === "dedicado" ? tableCol : gameCol;
  const dimKey = MODO === "dedicado" ? "table_name" : "game_type";

  if (MODO === "network") {
    for (const k of ESPORTIVA_KEYS) out[k] = emptyBlock();
  }

  const scenarios = SCENARIOS[MODO];
  const jobs = [];
  for (const sc of scenarios) {
    if (sc.splitMarca) {
      jobs.push({ sc, sliceId: SLICES.TO, cols: [dayCol, marcaCol, dimCol], valueKey: "TO", fieldKey: dimKey, metric: "TO" });
      jobs.push({ sc, sliceId: SLICES.GGR, cols: [dayCol, marcaCol, dimCol], valueKey: "GGR", fieldKey: dimKey, metric: "GGR" });
      jobs.push({ sc, sliceId: SLICES.BET, cols: [dayCol, marcaCol, dimCol], valueKey: "BET", fieldKey: dimKey, metric: "BET" });
      jobs.push({ sc, sliceId: SLICES.UAP, cols: [dayCol, marcaCol, gameCol], valueKey: "UAP", fieldKey: "game_type", metric: "UAP" });
      jobs.push({ sc, sliceId: SLICES.UAP_TOT, cols: [dayCol, marcaCol], valueKey: "UAP", fieldKey: null, metric: "UAP_TOT" });
    } else {
      jobs.push({ sc, sliceId: SLICES.TO, cols: [dayCol, dimCol], valueKey: "TO", fieldKey: dimKey, metric: "TO" });
      jobs.push({ sc, sliceId: SLICES.GGR, cols: [dayCol, dimCol], valueKey: "GGR", fieldKey: dimKey, metric: "GGR" });
      jobs.push({ sc, sliceId: SLICES.BET, cols: [dayCol, dimCol], valueKey: "BET", fieldKey: dimKey, metric: "BET" });
      jobs.push({ sc, sliceId: SLICES.UAP, cols: [dayCol, gameCol], valueKey: "UAP", fieldKey: "game_type", metric: "UAP" });
      jobs.push({ sc, sliceId: SLICES.UAP_TOT, cols: [dayCol], valueKey: "UAP", fieldKey: "game_type", metric: "UAP_TOT" });
    }
  }

  const results = await mapPool(jobs, CONCURRENCY, async (job) => {
    const r = await runQuery(job.sliceId, job.sc, job.cols, job.valueKey, job.fieldKey);
    return { job, r };
  });

  for (const { job, r } of results) {
    if (job.sc.splitMarca) {
      const byMarca = r.byMarca || {};
      for (const k of ESPORTIVA_KEYS) {
        if (!out[k]) out[k] = emptyBlock();
        out[k][job.metric] = { byDay: byMarca[k] || {}, ok: !!r.ok, ...(r.err ? { err: r.err } : {}) };
      }
      continue;
    }
    if (!out[job.sc.key]) out[job.sc.key] = emptyBlock();
    out[job.sc.key][job.metric] = {
      byDay: r.byDay || {},
      ok: !!r.ok,
      ...(r.err ? { err: r.err } : {}),
    };
  }

  try {
    ws.close();
  } catch {
    /* ignore */
  }
  return out;
})();
