/**
 * Inventário de CTAs com gradiente canónico.
 * - PÁGINA (migrado): <CtaCriarButton> — rótulo = children (o que aparece na tela).
 * - MODAL (legado): <button> com gradiente, borderRadius ≠ 999, fora de CtaCriarButton.
 *
 * Uso: node scripts/scan-cta-legacy.mjs
 */
import fs from "fs";
import path from "path";

const pagesDir = "src/pages";

/** Caminho da pasta da página → label do menu (menu.ts key). */
const PATH_TO_MENU_LABEL = [
  ["pages/lives/Agenda", "Agenda"],
  ["pages/lives/Scout", "Scout"],
  ["pages/lives/Resultados", "Resultados"],
  ["pages/lives/Feedback", "Feedback"],
  ["pages/lives/Influencers", "Influencers"],
  ["pages/afiliados/Afiliados", "Afiliados"],
  ["pages/afiliados/Network", "Network"],
  ["pages/aquisicao/Financeiro", "Financeiro"],
  ["pages/aquisicao/BancaJogo", "Banca de Jogo"],
  ["pages/marketing/Campanhas", "Campanhas"],
  ["pages/marketing/GestaoLinks", "Gestão de Links"],
  ["pages/estudio/Figurinos", "Figurinos"],
  ["pages/estudio/GestaoDealers", "Gestão de Dealers"],
  ["pages/estudio/CentralNotificacoes", "Central de Notificações"],
  ["pages/estudio/RoteiroMesa", "Roteiro de Mesa"],
  ["pages/estudio/solicitacoes", "Solicitações"],
  ["pages/rh/GestaoPrestador", "Gestão de Prestadores"],
  ["pages/rh/GestaoStaff", "Gestão de Staff"],
  ["pages/rh/Organograma", "Organograma"],
  ["pages/rh/Vagas", "Vagas"],
  ["pages/rh/DadosCadastro", "Dados de Cadastro"],
  ["pages/rh/CentralDenunciasSpin", "Central de Denúncias"],
  ["pages/rh/Calendario", "Calendário"],
  ["pages/escala/MarketplaceTurnos", "Marketplace"],
  ["pages/conteudo/PortalRh", "Portal de RH"],
  ["pages/conteudo/LinksMateriais", "Links e Materiais"],
  ["pages/conteudo/PlaybookInfluencers", "Playbook Influencers"],
  ["pages/plataforma/GestaoUsuarios", "Gestão de Usuários"],
  ["pages/plataforma/GestaoOperadoras", "Gestão de Operadoras"],
  ["pages/plataforma/GestaoMesas", "Gestão de Mesas"],
  ["pages/plataforma/StatusTecnico", "Status Técnico"],
  ["pages/geral/Configuracoes", "Configurações"],
];

function pageLabelFromFile(filePath) {
  const rel = filePath.replace(/\\/g, "/");
  for (const [prefix, label] of PATH_TO_MENU_LABEL) {
    if (rel.includes(prefix)) return label;
  }
  const m = rel.match(/pages\/([^/]+)\/([^/]+)/);
  return m ? `${m[1]} / ${m[2]}` : rel;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function stripJsxText(block) {
  return block
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fecha a tag de abertura sem confundir `=>` com fim da tag. */
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

function extractCtaCriarLabels(content, filePath) {
  const out = [];
  const tag = "CtaCriarButton";
  let searchFrom = 0;
  while (true) {
    const open = content.indexOf(`<${tag}`, searchFrom);
    if (open < 0) break;
    const close = content.indexOf(`</${tag}>`, open);
    if (close < 0) break;
    const chunk = content.slice(open, close);
    const openEnd = findOpeningTagEnd(chunk, tag);
    if (openEnd < 0) {
      searchFrom = open + 1;
      continue;
    }
    const inner = chunk.slice(openEnd + 1).trim();
    if (!inner.includes("<")) {
      const text = inner.replace(/\s+/g, " ").trim();
      if (text && text.length <= 80) {
        const before = content.slice(Math.max(0, open - 1200), open);
        const inModal =
          /function\s+Modal\w*/.test(before) ||
          /<ModalBase/.test(before) ||
          /ModalHeader/.test(before);
        out.push({ text, file: filePath, surface: inModal ? "modal" : "page" });
      }
    }
    searchFrom = close + 1;
  }
  return out;
}

function extractLegacyButtons(content, filePath) {
  const out = [];
  const btnRe = /<button[\s\S]*?<\/button>/gi;
  let m;
  while ((m = btnRe.exec(content))) {
    const block = m[0];
    if (block.includes("CtaCriarButton") || block.includes('data-cta-surface="page"')) continue;
    if (!/color:\s*["']?#fff/.test(block)) continue;
    const hasGrad =
      /getCtaCriarGradient|ctaGradientPortalRh|CTA_GRADIENT|ctaGradientSalvar|ctaGradient\(|ctaGradientStatus/.test(
        block,
      ) || /linear-gradient\(135deg/.test(block);
    if (!hasGrad) continue;
    const br = block.match(/borderRadius:\s*(\d+)/);
    if (br && br[1] === "999") continue;
    const text = stripJsxText(block);
    if (!text || text.length > 100) continue;
    if (/^(void |onClick|Salvando|disabled)/.test(text)) continue;
    const before = content.slice(Math.max(0, m.index - 1200), m.index);
    const inModal =
      /function\s+Modal\w*/.test(before) ||
      /<ModalBase/.test(before) ||
      /ModalHeader/.test(before) ||
      /ModalConfirm/.test(before) ||
      filePath.includes("Modal");
    out.push({ text, file: filePath, surface: inModal ? "modal" : "page" });
  }
  return out;
}

const migrated = [];
const legacyModal = [];
const legacyPage = [];

for (const f of walk(pagesDir)) {
  const c = fs.readFileSync(f, "utf8");
  for (const item of extractCtaCriarLabels(c, f)) {
    const row = { page: pageLabelFromFile(f), ...item };
    if (item.surface === "modal") legacyModal.push(row);
    else migrated.push(row);
  }
  if (!/gradient|getCtaCriarGradient|ctaGradient/.test(c)) continue;
  for (const item of extractLegacyButtons(c, f)) {
    const row = { page: pageLabelFromFile(f), ...item };
    if (item.surface === "modal") legacyModal.push(row);
    else legacyPage.push(row);
  }
}

function printSection(title, rows) {
  console.log(`\n=== ${title} ===`);
  const seen = new Set();
  rows.sort((a, b) => a.page.localeCompare(b.page) || a.text.localeCompare(b.text));
  for (const r of rows) {
    const k = `${r.page}\t${r.text}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(k);
  }
  console.error(`# ${seen.size} entradas`);
}

printSection("PÁGINA (migrado — CtaCriarButton)", migrated);
printSection("PÁGINA (legado — ainda sem CtaCriarButton)", legacyPage);
printSection("MODAL (legado — migração posterior)", legacyModal);
