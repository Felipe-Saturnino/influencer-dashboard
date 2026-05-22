import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walk(p, acc);
    else if (p.includes(`${path.sep}pages${path.sep}`) && p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const reGrad = /linear-gradient\s*\(\s*135deg/i;
const reBtn = /<button[\s\S]{0,3000}?<\/button>/gi;

const seen = new Set();
for (const f of walk("src/pages")) {
  const c = fs.readFileSync(f, "utf8");
  if (!reGrad.test(c)) continue;
  let m;
  reBtn.lastIndex = 0;
  while ((m = reBtn.exec(c)) !== null) {
    const b = m[0];
    if (!reGrad.test(b)) continue;
    if (!/color:\s*["']#fff/i.test(b)) continue;
    if (b.includes("CtaCriarButton")) continue;
    const texts = [...b.matchAll(/>([^<]+)</g)]
      .map((x) => x[1].replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0 && !t.startsWith("{"));
    if (!texts.length) continue;
    const label = texts.join(" ").slice(0, 100);
    if (/^(Ver|Cancelar|Fechar|Limpar)/i.test(label)) continue;
    const br = b.match(/borderRadius:\s*([^,}\s]+)/);
    const radius = br ? br[1] : "?";
    if (radius === "999" || radius === '"999"' || radius === "'999'") continue;
    const page = f
      .replace(/.*pages[\\/]/, "")
      .replace(/index\.tsx$/, "")
      .replace(/[\\/]/g, " / ")
      .trim()
      .replace(/ \/ $/, "");
    const key = `${page}\t${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`${page}\t${label}`);
  }
}
