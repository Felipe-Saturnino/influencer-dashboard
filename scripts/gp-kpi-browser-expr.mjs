/**
 * Imprime a expression Runtime.evaluate para extrair um bloco no Grafana (aba logada).
 * Uso: node scripts/gp-kpi-browser-expr.mjs --idx=0
 */
import { readFileSync } from "node:fs";

function arg(nome) {
  const p = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : null;
}

const idx = Number(arg("idx") ?? "0");
const batches = JSON.parse(readFileSync("tmp/gp-kpi-batches-full.json", "utf8"));
const b = batches[idx];
if (!b) {
  console.error(`Bloco ${idx} inexistente (0..${batches.length - 1})`);
  process.exit(1);
}

const expr = `(async () => {
  const rawSql = ${JSON.stringify(b.sql)};
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
      from: String(${b.deMs}),
      to: String(${b.ateMs})
    })
  });
  const text = await r.text();
  if (r.status !== 200) {
    return JSON.stringify({ ok: false, status: r.status, body: text.slice(0, 800) });
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) {
    return JSON.stringify({ ok: false, status: r.status, parseError: String(e), body: text.slice(0, 800) });
  }
  const err = parsed?.results?.A?.error;
  if (err) return JSON.stringify({ ok: false, clickhouse: err });
  const frame = parsed?.results?.A?.frames?.[0];
  const n = frame?.data?.values?.[0]?.length ?? 0;
  return JSON.stringify({ ok: true, de: ${JSON.stringify(b.de)}, ate: ${JSON.stringify(b.ate)}, rows: n, payload: parsed });
})()`;

process.stdout.write(expr);
