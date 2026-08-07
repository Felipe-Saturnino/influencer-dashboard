/**
 * Gera tmp/sm-sinais-extract-expr.js para Runtime.evaluate no Grafana.
 * Uso: node scripts/sm-sinais-write-extract-expr.mjs --de=2026-07-01 --ate=2026-07-07
 * --ate é inclusivo (dia BR); o SQL usa [início BR de --de, início BR do dia seguinte a --ate).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { montarSqlSmSinais } from "./grafana-sm-sinais-run.mjs";

function arg(nome) {
  const item = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return item ? item.slice(nome.length + 3).trim() : null;
}

function diaSeguinte(dataIso) {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function segundosInicioDiaBrt(dataIso) {
  return Math.floor(new Date(`${dataIso}T03:00:00Z`).getTime() / 1000);
}

const de = arg("de");
const ate = arg("ate") ?? de;
if (!de || !/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
  console.error("Use --de=AAAA-MM-DD --ate=AAAA-MM-DD");
  process.exit(1);
}

const deSeg = segundosInicioDiaBrt(de);
const ateSeg = segundosInicioDiaBrt(diaSeguinte(ate));
const rawSql = montarSqlSmSinais({
  deSegundos: deSeg,
  ateSegundos: ateSeg,
  ambiente: "live-sg",
});

const expr = `(async () => {
  const rawSql = ${JSON.stringify(rawSql)};
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
        maxDataPoints: 100000
      }],
      from: String(${deSeg * 1000}),
      to: String(${ateSeg * 1000})
    })
  });
  const text = await r.text();
  if (r.status !== 200) return JSON.stringify({ ok:false, status:r.status, body:text.slice(0,500) });
  let parsed; try { parsed = JSON.parse(text); } catch(e) { return JSON.stringify({ ok:false, parse:String(e) }); }
  const err = parsed?.results?.A?.error;
  if (err) return JSON.stringify({ ok:false, clickhouse: err });
  const frame = parsed?.results?.A?.frames?.[0];
  const n = frame?.data?.values?.[0]?.length ?? 0;
  window.__smSinaisPayload = parsed;
  return JSON.stringify({ ok:true, rows:n, bytes:text.length, de:${JSON.stringify(de)}, ate:${JSON.stringify(ate)} });
})()`;

mkdirSync("tmp", { recursive: true });
writeFileSync("tmp/sm-sinais-extract-expr.js", expr, "utf8");
console.log(`OK tmp/sm-sinais-extract-expr.js (${de} → ${ate}, ${deSeg}..${ateSeg})`);
