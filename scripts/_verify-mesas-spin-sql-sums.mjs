import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "scripts");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^manual-supabase-mesas-spin-2026.*\.sql$/.test(f))
  .sort();

const issues = [];

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");

  const dailyBlock = text.match(
    /INSERT INTO public\.relatorio_daily_summary[\s\S]*?VALUES([\s\S]*?)ON CONFLICT/,
  );
  if (!dailyBlock) continue;

  const dailyMap = {};
  for (const m of dailyBlock[1].matchAll(
    /\('([0-9-]+)',\s*'([^']+)',\s*([-\d]+),\s*([-\d]+),\s*(\d+)/g,
  )) {
    dailyMap[`${m[1]}|${m[2]}`] = { to: +m[3], ggr: +m[4], ap: +m[5] };
  }

  const sums = {};
  for (const m of text.matchAll(
    /\('([0-9-]+)',\s*'[^']*',\s*'([^']+)',\s*'[^']*',\s*([-\d]+),\s*([-\d]+),\s*(\d+)\)/g,
  )) {
    const key = `${m[1]}|${m[2]}`;
    if (!sums[key]) sums[key] = { ggr: 0, to: 0, ap: 0 };
    sums[key].ggr += +m[3];
    sums[key].to += +m[4];
    sums[key].ap += +m[5];
  }

  for (const [key, d] of Object.entries(dailyMap)) {
    const s = sums[key];
    if (!s) {
      issues.push({ file, key, msg: "sem por_tabela" });
      continue;
    }
    const dg = s.ggr - d.ggr;
    const dt = s.to - d.to;
    const da = s.ap - d.ap;
    if (Math.abs(dg) > 2 || Math.abs(dt) > 2 || Math.abs(da) > 2) {
      issues.push({ file, key, dg, dt, da, daily: d, sum: s });
    }
  }
}

if (issues.length) {
  console.log("DIVERGÊNCIAS (>±2):");
  console.log(JSON.stringify(issues, null, 2));
} else {
  console.log("OK: todos os ficheiros 2026 passaram reconciliação (±2)");
}
console.log("Ficheiros:", files.length, files.join(", "));
