import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "src/pages/geral/Ajuda");
const lines = fs.readFileSync(path.join(dir, "index.tsx"), "utf8").split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

const conteudoDir = path.join(dir, "conteudo");
fs.mkdirSync(conteudoDir, { recursive: true });

fs.writeFileSync(
  path.join(conteudoDir, "conheca.ts"),
  slice(27, 945) + "\n",
);
fs.writeFileSync(
  path.join(conteudoDir, "troubleshooting.ts"),
  slice(947, 1889) + "\n",
);

const header = slice(1, 19);
const footer = slice(1891, lines.length)
  .replace("CONTEUDO_CONHECA", "CONTEUDO_CONHECA")
  .replace(/CONTEUDO_CONHECA\[/, "CONTEUDO_CONHECA[");

const indexNew = `${header}
import { CONTEUDO_CONHECA } from "./conteudo/conheca";
import { CONTEUDO_TROUBLE } from "./conteudo/troubleshooting";

${slice(20, 26)}

${footer}`;

fs.writeFileSync(path.join(dir, "index.tsx"), indexNew);
console.log("Ajuda split done");
