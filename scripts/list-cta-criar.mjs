/**
 * Lista CTAs no padrão CtaCriarButton (ícone Plus 14px + texto children).
 * Uso: node scripts/list-cta-criar.mjs
 */
import fs from "fs";
import path from "path";

const ICON = "Plus (14px)";

const PATH_TO_MENU_LABEL = [
  ["pages/lives/Agenda", "Agenda"],
  ["pages/lives/Scout", "Scout"],
  ["pages/afiliados/Network", "Network"],
  ["pages/aquisicao/BancaJogo", "Banca de Jogo"],
  ["pages/marketing/Campanhas", "Campanhas"],
  ["pages/estudio/Figurinos", "Figurinos"],
  ["pages/rh/GestaoPrestador", "Gestão de Prestadores"],
  ["pages/rh/Organograma", "Organograma"],
  ["pages/rh/Vagas", "Vagas"],
  ["pages/conteudo/PortalRh", "Portal de RH"],
  ["pages/plataforma/GestaoUsuarios", "Gestão de Usuários"],
  ["pages/plataforma/GestaoOperadoras", "Gestão de Operadoras"],
  ["pages/plataforma/GestaoMesas", "Gestão de Mesas"],
  ["pages/plataforma/StatusTecnico", "Status Técnico"],
];

function pageLabel(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  for (const [prefix, label] of PATH_TO_MENU_LABEL) {
    if (rel.includes(prefix)) return label;
  }
  return rel;
}

function findOpeningTagEnd(chunk, tagName) {
  const start = chunk.indexOf(`<${tagName}`);
  if (start < 0) return -1;
  let i = start + tagName.length + 1;
  let depth = 0;
  let inString = null;
  for (; i < chunk.length; i++) {
    const ch = chunk[i];
    const prev = chunk[i - 1];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return i;
  }
  return -1;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const rows = [];
for (const f of walk("src/pages")) {
  const c = fs.readFileSync(f, "utf8");
  if (!c.includes("CtaCriarButton")) continue;
  let searchFrom = 0;
  while (true) {
    const open = c.indexOf("<CtaCriarButton", searchFrom);
    if (open < 0) break;
    const close = c.indexOf("</CtaCriarButton>", open);
    if (close < 0) break;
    const chunk = c.slice(open, close);
    const openEnd = findOpeningTagEnd(chunk, "CtaCriarButton");
    const openTag = openEnd >= 0 ? chunk.slice(0, openEnd + 1) : "";
    const inner = openEnd >= 0 ? chunk.slice(openEnd + 1).trim() : "";
    const text =
      inner.includes("<") ? "" : inner.replace(/\s+/g, " ").trim();
    const loadingLabel =
      openTag.match(/loadingLabel="([^"]+)"/)?.[1] ??
      openTag.match(/loadingLabel=\{"([^"]+)"\}/)?.[1] ??
      null;
    const ariaLabel = openTag.match(/aria-label="([^"]+)"/)?.[1] ?? null;
    rows.push({
      page: pageLabel(f),
      texto: text || "—",
      loadingLabel,
      ariaLabel,
    });
    searchFrom = close + 1;
  }
}

rows.sort((a, b) => a.page.localeCompare(b.page, "pt-BR") || a.texto.localeCompare(b.texto, "pt-BR"));

console.log("| Página | Ícone | Texto do botão | Observação |");
console.log("|--------|-------|----------------|--------------|");
for (const r of rows) {
  const obs = [];
  if (r.loadingLabel) obs.push(`loading: ${r.loadingLabel}`);
  if (r.ariaLabel && r.ariaLabel !== r.texto) obs.push(`aria-label: ${r.ariaLabel}`);
  console.log(
    `| ${r.page} | ${ICON} | ${r.texto} | ${obs.join("; ") || "—"} |`,
  );
}
console.error(`\nTotal: ${rows.length} botão(ões) CtaCriarButton em src/pages`);
