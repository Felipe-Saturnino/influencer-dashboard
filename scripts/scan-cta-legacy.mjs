import fs from "fs";
import path from "path";

const pagesDir = "src/pages";

function pageLabelFromFile(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  const m = rel.match(/pages\/([^/]+)\/(.+?)(?:\/index)?\.tsx$/);
  if (!m) return rel;
  const [, section, rest] = m;
  const name = rest.split("/").pop();
  const menu = fs.readFileSync("src/constants/menu.ts", "utf8");
  const keys = [];
  const re = /\{\s*key:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;
  let mm;
  while ((mm = re.exec(menu))) keys.push({ key: mm[1], label: mm[2] });
  const slug = name.replace(/([A-Z])/g, (x) => x.toLowerCase());
  const hit = keys.find((k) => rel.includes(k.key.replace(/_/g, "")) || rel.toLowerCase().includes(k.key));
  return hit?.label ?? `${section} / ${name}`;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function extractLegacyButtons(content, filePath) {
  const out = [];
  const btnRe = /<button[\s\S]*?<\/button>/gi;
  let m;
  while ((m = btnRe.exec(content))) {
    const block = m[0];
    if (block.includes("CtaCriarButton")) continue;
    if (!/color:\s*["']?#fff/.test(block)) continue;
    const hasGrad =
      /getCtaCriarGradient|ctaGradientPortalRh|CTA_GRADIENT|ctaGradient\(|ctaGradientStatus/.test(
        block,
      ) || /linear-gradient\(135deg/.test(block);
    if (!hasGrad) continue;
    const br = block.match(/borderRadius:\s*(\d+)/);
    if (br && br[1] === "999") continue;
    const text = block
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text.length > 100) continue;
    out.push({ text, file: filePath });
  }
  return out;
}

const rows = [];
for (const f of walk(pagesDir)) {
  const c = fs.readFileSync(f, "utf8");
  if (!/color:\s*["']?#fff/.test(c)) continue;
  if (!/gradient|getCtaCriarGradient|ctaGradient/.test(c)) continue;
  for (const item of extractLegacyButtons(c, f)) {
    rows.push({ page: pageLabelFromFile(f), ...item });
  }
}

rows.sort((a, b) => a.page.localeCompare(b.page) || a.text.localeCompare(b.text));
const seen = new Set();
for (const r of rows) {
  const k = `${r.page}\t${r.text}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(k);
}
console.error(`# ${seen.size} entradas`);
