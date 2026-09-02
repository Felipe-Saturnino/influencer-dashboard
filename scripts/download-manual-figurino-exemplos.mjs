/**
 * Baixa fotos de exemplo (Unsplash / Pexels) para o Manual Figurino e Uniforme.
 * Uso: node scripts/download-manual-figurino-exemplos.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs/manual-imagem/02-figurino-uniforme/media/exemplos");
mkdirSync(out, { recursive: true });

/** Nome do arquivo → URL CDN (w≈900, qualidade 80). */
const SOURCES = {
  "conferencia-checklist.jpg":
    "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80",
  "vestuario-nao.jpg":
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
  "figurino-padrao.jpg":
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80",
  "figurino-fora-padrao.jpg":
    "https://images.pexels.com/photos/6311473/pexels-photo-6311473.jpeg?auto=compress&cs=tinysrgb&w=900",
  "zelo-tecido.jpg":
    "https://images.pexels.com/photos/6043714/pexels-photo-6043714.jpeg?auto=compress&cs=tinysrgb&w=900",
  "calca-caimento.jpg":
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
  "colete-kit.jpg":
    "https://images.pexels.com/photos/15536109/pexels-photo-15536109.jpeg?auto=compress&cs=tinysrgb&w=900",
  "calcado-gp-ok.jpg":
    "https://images.unsplash.com/photo-1576133384936-ea17c54e9fd4?auto=format&fit=crop&w=900&q=80",
  "calcado-shuffler-ok.jpg":
    "https://images.unsplash.com/photo-1574723475640-e514767d4181?auto=format&fit=crop&w=900&q=80",
  "calcado-nao.jpg":
    "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=900",
  "figurino-ao-vivo.jpg":
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
  "seguranca-camisa.jpg":
    "https://images.pexels.com/photos/4063856/pexels-photo-4063856.jpeg?auto=compress&cs=tinysrgb&w=900",
  "caimento-masculino.jpg":
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80",
  "caimento-feminino.jpg":
    "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=900",
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
