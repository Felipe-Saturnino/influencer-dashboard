/**
 * Gera public/og-share.jpg (1200×630) para preview WhatsApp/Open Graph.
 * Requer sharp instalado localmente (não fica no package.json):
 *   npm i -D sharp && node scripts/build-og-share.mjs && npm uninstall sharp
 */
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "og-share.jpg");
const logoPath = path.join(root, "public", "Logo Spin Gaming White.png");

const W = 1200;
const H = 630;

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a2082"/>
      <stop offset="55%" stop-color="#3b2a9e"/>
      <stop offset="100%" stop-color="#1e36f8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

const logo = await sharp(logoPath).resize({ width: 520, withoutEnlargement: true }).png().toBuffer();
const logoMeta = await sharp(logo).metadata();
const lw = logoMeta.width ?? 520;
const lh = logoMeta.height ?? 160;

const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="120">
  <text x="50%" y="48" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">Data Intelligence</text>
  <text x="50%" y="92" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="500" fill="#c7d2fe">Spin Gaming</text>
</svg>`);

const logoTop = Math.round((H - lh - 110) / 2);
const textTop = logoTop + lh + 28;

await sharp(bg)
  .composite([
    { input: logo, top: logoTop, left: Math.round((W - lw) / 2) },
    { input: textSvg, top: textTop, left: 0 },
  ])
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
const st = await fs.stat(outPath);
console.log(`Wrote ${path.relative(root, outPath)} ${meta.width}x${meta.height} ${Math.round(st.size / 1024)}KB`);
