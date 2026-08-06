/** Gera SQL + expressão CDP para extrair GP KPI e salva em tmp/. */
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("tmp", { recursive: true });

const de = process.argv.find((a) => a.startsWith("--de="))?.slice(5) ?? "2026-08-04";
const ate = process.argv.find((a) => a.startsWith("--ate="))?.slice(6) ?? "2026-08-05";

const sqlRun = spawnSync(
  process.execPath,
  ["scripts/grafana-gp-kpi-run.mjs", "--sql", `--de=${de}`, `--ate=${ate}`],
  { encoding: "utf8" },
);
if (sqlRun.status !== 0) {
  console.error(sqlRun.stderr || sqlRun.stdout);
  process.exit(sqlRun.status ?? 1);
}
const sql = sqlRun.stdout.trim();
const sqlPath = `tmp/gp-kpi-sql-${de}_${ate}.sql`;
writeFileSync(sqlPath, sql, "utf8");

const deMs = Date.parse(`${de}T00:00:00Z`);
const ateExclusivo = (() => {
  const d = new Date(`${ate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();
const ateMs = Date.parse(`${ateExclusivo}T00:00:00Z`);

const expr = `(async () => {
  const rawSql = ${JSON.stringify(sql)};
  const r = await fetch('/api/ds/query?ds_type=grafana-clickhouse-datasource', {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-Datasource-Uid': 'risk_integrity_ch_live_sg',
      'X-Grafana-Org-Id': '1',
      'X-Plugin-Id': 'grafana-clickhouse-datasource'
    },
    body: JSON.stringify({
      queries: [{
        refId: 'A',
        rawSql,
        format: 1,
        queryType: 'table',
        editorType: 'sql',
        meta: { timezone: 'UTC' },
        datasource: { type: 'grafana-clickhouse-datasource', uid: 'risk_integrity_ch_live_sg' },
        datasourceId: 25,
        intervalMs: 60000,
        maxDataPoints: 50000
      }],
      from: String(${deMs}),
      to: String(${ateMs})
    })
  });
  const text = await r.text();
  if (r.status !== 200) return JSON.stringify({ ok:false, status:r.status, body:text.slice(0,500) });
  let parsed; try { parsed = JSON.parse(text); } catch(e) { return JSON.stringify({ ok:false, parse:String(e) }); }
  const err = parsed?.results?.A?.error;
  if (err) return JSON.stringify({ ok:false, clickhouse: err });
  const frame = parsed?.results?.A?.frames?.[0];
  const n = frame?.data?.values?.[0]?.length ?? 0;
  window.__gpKpiPayload = parsed;
  return JSON.stringify({ ok:true, rows:n, bytes:text.length, de:${JSON.stringify(de)}, ate:${JSON.stringify(ate)} });
})()`;

writeFileSync("tmp/gp-kpi-extract-expr.js", expr, "utf8");
console.log(JSON.stringify({ sqlPath, sqlBytes: sql.length, exprBytes: expr.length, de, ate }));
