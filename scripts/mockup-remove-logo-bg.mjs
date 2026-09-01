import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const input =
  process.argv[2] ||
  path.join(
    root,
    "..",
    ".cursor",
    "projects",
    "c-Users-FelipeSaturnino-Documents-GitHub-influencer-dashboard",
    "assets",
    "c__Users_FelipeSaturnino_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-995b40e8-3a33-4ab3-849a-e72e3d3504c3.png",
  );
const output = path.join(root, "docs", "mockups", process.argv[3] || "logo-casa-apostas.png");

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const threshold = 42;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r <= threshold && g <= threshold && b <= threshold) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`OK ${output} ${meta.width}x${meta.height}`);
