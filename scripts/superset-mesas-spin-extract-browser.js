/**
 * Payload para Runtime.evaluate no Daily Commercial Report [BRL]
 * (dashboard 15, dataset 12, C1-BR / live-sg).
 *
 * Abrir https://superset-sg.proxylive.tech/superset/dashboard/15/ logado,
 * ajustar MODO / DE / ATE abaixo, injetar o IIFE no CDP (awaitPromise + returnByValue).
 *
 * MODO:
 *   network  — Sports Club × Esportiva / Casa / Blaze.br / jonbet.bet.br
 *   dedicado — mesas Casa / Blaze (sem brand)
 *   monthly  — UAP MTD do mês de DE (slice 461)
 *
 * ATE é exclusivo no time_range do Superset (usar o dia seguinte ao último dia).
 * Ex.: 04–11/08 → DE='2026-08-04', ATE='2026-08-13'
 */
(async () => {
  const MODO = "network"; // "network" | "dedicado" | "monthly"
  const DE = "2026-08-04";
  const ATE = "2026-08-13";

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

  const SCENARIOS = {
    network: [
      { key: "esportiva", op: "EsportivaBet", brand: null, tables: SC },
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
      { key: "net_esportiva", op: "EsportivaBet", brand: null, tables: SC },
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

  function byDayFrom(data, valueKey, dimKey) {
    const byDay = {};
    for (const row of data || []) {
      const day = isoDay(row.at);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({ [valueKey]: row[valueKey], f: row[dimKey] ?? null });
    }
    return byDay;
  }

  async function runQuery(sliceId, sc, columns, valueKey, dimKey) {
    const slice = sliceById[sliceId];
    if (!slice) return { err: `slice ${sliceId} ausente`, byDay: {} };
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
        comparator: TIME_RANGE,
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
      force: true,
      queries: [
        {
          filters,
          extras: { having: "", where: "" },
          applied_time_extras: {},
          columns,
          metrics: fm.metrics,
          orderby: [],
          annotation_layers: [],
          row_limit: 10000,
          series_limit: 0,
          group_others_when_limit_reached: false,
          time_range: TIME_RANGE,
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
      if (!ck) return { err: "timeout", byDay: {}, ok: false };
      const cr = await fetch("/api/v1/chart/data/" + ck, { credentials: "include" });
      const cj = await cr.json();
      res = (cj.result && cj.result[0]) || {};
    }
    return { byDay: byDayFrom(res.data, valueKey, dimKey), ok: true };
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

  const out = { modo: MODO, de: DE, ate: ATE };

  if (MODO === "monthly") {
    const mesUtc = Date.UTC(Number(DE.slice(0, 4)), Number(DE.slice(5, 7)) - 1, 1);
    out.mes = `${DE.slice(0, 7)}-01`;
    for (const sc of SCENARIOS.monthly) {
      const slice = sliceById[SLICES.UAP_TOT];
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
          comparator: TIME_RANGE,
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
        encodeURIComponent(JSON.stringify({ slice_id: SLICES.UAP_TOT })) +
        "&dashboard_id=15";
      const body = {
        datasource: { id: 12, type: "table" },
        force: true,
        queries: [
          {
            filters,
            extras: { having: "", where: "" },
            applied_time_extras: {},
            columns: [monthCol],
            metrics: fm.metrics,
            orderby: [],
            annotation_layers: [],
            row_limit: 10000,
            series_limit: 0,
            group_others_when_limit_reached: false,
            time_range: TIME_RANGE,
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
        if (!ck) {
          out[sc.key] = { err: "timeout", uap: null };
          continue;
        }
        const cr = await fetch("/api/v1/chart/data/" + ck, { credentials: "include" });
        const cj = await cr.json();
        res = (cj.result && cj.result[0]) || {};
      }
      const row = (res.data || []).find((d) => d.at === mesUtc);
      out[sc.key] = { uap: row ? row.UAP : null };
    }
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    return out;
  }

  const dimCol = MODO === "dedicado" ? tableCol : gameCol;
  const dimKey = MODO === "dedicado" ? "table_name" : "game_type";
  const uapDimCol = gameCol;
  const uapDimKey = "game_type";

  for (const sc of SCENARIOS[MODO]) {
    const block = {};
    block.TO = await runQuery(SLICES.TO, sc, [dayCol, dimCol], "TO", dimKey);
    block.GGR = await runQuery(SLICES.GGR, sc, [dayCol, dimCol], "GGR", dimKey);
    block.BET = await runQuery(SLICES.BET, sc, [dayCol, dimCol], "BET", dimKey);
    block.UAP = await runQuery(SLICES.UAP, sc, [dayCol, uapDimCol], "UAP", uapDimKey);
    block.UAP_TOT = await runQuery(SLICES.UAP_TOT, sc, [dayCol], "UAP", "game_type");
    out[sc.key] = block;
  }

  try {
    ws.close();
  } catch {
    /* ignore */
  }
  return out;
})();
