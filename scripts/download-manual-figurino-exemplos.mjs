/**
 * Baixa fotos de exemplo (Unsplash / Pexels) para o Manual Figurino e Uniforme.
 * Uso: node scripts/download-manual-figurino-exemplos.mjs
 *
 * Calçado / vestimentas proibidas / segurança = PNGs do Dress Code em fontes/
 * (não regenerados por este script).
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs/manual-imagem/02-figurino-uniforme/media/exemplos");
mkdirSync(out, { recursive: true });

/** Nome → URL — cada arquivo ilustra a ideia PODE/NÃO do slide. */
const SOURCES = {
  "conferencia-ok.jpg":
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
  "figurino-ao-vivo.jpg":
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
  "figurino-padrao.jpg":
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80",
  "figurino-amassado.jpg":
    "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=900&q=80",
  "figurino-alterado.jpg":
    "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=900",
  "cinto-discreto-ok.jpg":
    "https://images.pexels.com/photos/10340815/pexels-photo-10340815.jpeg?auto=compress&cs=tinysrgb&w=900",
  "meia-arrastao-nao.jpg":
    "https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg?auto=compress&cs=tinysrgb&w=900",
};

async function download(name, url) {
  const dest = join(out, name);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`${name}: arquivo muito pequeno (${buf.length} B)`);
  writeFileSync(dest, buf);
  console.log(`OK ${name} (${buf.length} B)`);
}

const onlyMissing = process.argv.includes("--missing");
for (const [name, url] of Object.entries(SOURCES)) {
  const dest = join(out, name);
  if (onlyMissing && existsSync(dest)) {
    console.log(`skip ${name}`);
    continue;
  }
  await download(name, url);
}
console.log("Feito:", out);
