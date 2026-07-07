import fs from "node:fs";

const menu = fs.readFileSync("src/constants/menu.ts", "utf8");
const conheca = fs.readFileSync("src/pages/geral/Ajuda/conteudo/conheca.ts", "utf8");
const trouble = fs.readFileSync("src/pages/geral/Ajuda/conteudo/troubleshooting.ts", "utf8");

const keys = [...menu.matchAll(/key: "([a-z_0-9]+)"/g)].map((m) => m[1]);
const conhecaKeys = new Set([...conheca.matchAll(/^ {2}([a-z_0-9]+): \{/gm)].map((m) => m[1]));
const troubleKeys = new Set([...trouble.matchAll(/^ {2}([a-z_0-9]+): \{/gm)].map((m) => m[1]));

console.log("Missing conheca:", keys.filter((k) => !conhecaKeys.has(k)).join(", ") || "none");
console.log("Missing trouble:", keys.filter((k) => !troubleKeys.has(k)).join(", ") || "none");
